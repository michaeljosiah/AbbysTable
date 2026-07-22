/**
 * Registration, sign-in, and calling Aonik as the signed-in customer.
 *
 * The one module that handles credentials, and it never lets them travel: a
 * password arrives from a server action, is exchanged for a token, and is gone.
 * Nothing here is logged, and the token lands in an httpOnly cookie rather than
 * a page prop.
 *
 * The endpoints live OUTSIDE `/commerce/` — `/v1/registrations/individual` and
 * `/auth/token` are platform surfaces, not commerce ones — which is why
 * `AONIK_API_URL` must be the API root and not a `/commerce` prefix.
 *
 * SERVER-ONLY.
 */

import { AonikError } from '@/lib/aonik/errors';
import { aonikFetch, type AonikFetchOptions } from '@/lib/aonik/http';
import { readAonikConfig } from '@/lib/aonik/dataMode';

import {
  clearSession,
  isExpired,
  readSession,
  sessionFromToken,
  writeSession,
  type CustomerSession,
} from './session';

/* ---- Wire contracts, transcribed from Aonik.Platform ---------------------- */

/** `IndividualRegistrationRequest`. Tenant goes in the body — see the spec's correction 2. */
interface RegistrationRequestDto {
  tenantId: string;
  registrationCountry?: string;
  title?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

/** `IndividualRegistrationResponse` — note it carries NO tokens. */
interface RegistrationResponseDto {
  userId: string;
  partyId: string;
  onboarding: unknown;
}

/** `TokenRequestDto`. `clientId` is NOT optional on the wire. */
interface TokenRequestDto {
  grantType: string;
  clientId: string;
  username?: string;
  password?: string;
  scope?: string;
  refreshToken?: string;
}

interface TokenResponseDto {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string;
  idToken: string | null;
}

/* ---- Configuration -------------------------------------------------------- */

/**
 * Raised when accounts cannot work in this deployment at all — no Aonik, or no
 * OAuth client configured for the token exchange.
 *
 * Distinct from a credential failure so the forms can render "accounts are not
 * available yet" instead of blaming the customer's password for a
 * configuration gap.
 */
export class AccountsUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'AccountsUnavailableError';
  }
}

interface AuthConfig {
  baseUrl: string;
  tenantId: string;
  clientId: string;
}

function authConfig(): AuthConfig {
  const connection = readAonikConfig();
  if (!connection) {
    throw new AccountsUnavailableError(
      'Accounts need a configured Aonik (AONIK_API_URL and AONIK_TENANT_ID). This build is ' +
        'running on demo data, where there is no identity provider to register against.',
    );
  }

  // The OAuth client the deployment's Keycloak issues storefront tokens for.
  // `/auth/token` rejects a request without one, so a missing value is a
  // configuration fault, not a sign-in failure.
  const clientId = process.env.AONIK_AUTH_CLIENT_ID?.trim();
  if (!clientId) {
    throw new AccountsUnavailableError(
      'Accounts need AONIK_AUTH_CLIENT_ID — the OAuth client this storefront authenticates ' +
        'against. Aonik rejects a token request without one.',
    );
  }

  return { baseUrl: connection.baseUrl, tenantId: connection.tenantId, clientId };
}

/** True when this deployment could serve accounts at all. Never throws. */
export function accountsAvailable(): boolean {
  try {
    authConfig();
    return true;
  } catch {
    return false;
  }
}

type AuthFetchOptions = Omit<AonikFetchOptions, 'baseUrl' | 'tenantId' | 'policy'>;

function authFetch<T>(path: string, config: AuthConfig, options: AuthFetchOptions): Promise<T> {
  return aonikFetch<T>(path, {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    // Identity traffic is never cached, on any verb.
    policy: 'volatile',
    ...options,
  });
}

/* ---- Credential failures --------------------------------------------------- */

/**
 * A sign-in or registration the customer can fix — wrong password, email
 * already registered.
 *
 * The message is Aonik's own. Neither endpoint uses the standard `{error, code}`
 * envelope (both write `{ error }` with no code), so there is nothing to branch
 * on beyond the status, and inventing more specific copy than the API gave us
 * would mean guessing at why.
 */
export class CredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CredentialError';
  }
}

/* ---- Token exchange -------------------------------------------------------- */

async function exchange(config: AuthConfig, body: TokenRequestDto): Promise<TokenResponseDto> {
  try {
    return await authFetch<TokenResponseDto>('/auth/token', config, {
      method: 'POST',
      body,
    });
  } catch (error) {
    if (error instanceof AonikError && error.status === 400) {
      // 400 covers both "wrong password" and "this realm has the password grant
      // switched off". Only the operator can tell them apart, and Aonik hands
      // us one message for both, so it is passed through verbatim rather than
      // dressed up as one or the other.
      throw new CredentialError(error.message);
    }
    throw error;
  }
}

export interface SignInResult {
  session: CustomerSession;
}

/** Password grant. The password exists only for the duration of this call. */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  const config = authConfig();

  const token = await exchange(config, {
    grantType: 'password',
    clientId: config.clientId,
    username: email,
    password,
  });

  const session = sessionFromToken(token, email);
  await writeSession(session);
  return { session };
}

/**
 * Registers, then immediately signs in.
 *
 * The two calls are separate because Aonik's registration response carries no
 * tokens — it returns `{ userId, partyId, onboarding }`. A customer who
 * registered successfully but whose token exchange failed is REGISTERED: the
 * account exists and re-registering would 409. So the exchange failure is
 * re-thrown as itself, and the caller sends them to sign in rather than
 * offering the registration form again.
 */
export async function register(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<SignInResult> {
  const config = authConfig();

  const body: RegistrationRequestDto = {
    // Body AND header: the endpoint prefers the body and only falls back to
    // header resolution when the deployment is configured for it.
    tenantId: config.tenantId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    password: input.password,
  };

  try {
    await authFetch<RegistrationResponseDto>('/v1/registrations/individual', config, {
      method: 'POST',
      body,
    });
  } catch (error) {
    // 409 is a duplicate registration. It is NOT box drift — that additionally
    // requires the drift code — but nothing else may read 409 as drift either.
    if (error instanceof AonikError && (error.status === 409 || error.status === 400)) {
      throw new CredentialError(error.message);
    }
    throw error;
  }

  try {
    return await signIn(input.email, input.password);
  } catch (error) {
    // The account now EXISTS. Re-submitting this form would 409, and telling
    // someone their details were wrong would be a lie — they were right enough
    // to create an account. Send them to sign in instead.
    throw new RegisteredButNotSignedInError(
      error instanceof Error ? error.message : undefined,
    );
  }
}

/**
 * Registration succeeded; the immediate sign-in did not.
 *
 * Its own type because the recovery differs from every other auth failure: the
 * customer must NOT retry registration, they must sign in.
 */
export class RegisteredButNotSignedInError extends Error {
  constructor(readonly cause?: string) {
    super(
      'Your account was created, but we could not sign you in automatically. ' +
        'Please sign in with the details you just chose.',
    );
    this.name = 'RegisteredButNotSignedInError';
  }
}

/* ---- Calling Aonik as the customer ---------------------------------------- */

/** Raised when there is no usable session. Callers redirect to sign-in. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has ended. Please sign in again.');
    this.name = 'SessionExpiredError';
  }
}

/**
 * Returns a live session, refreshing it if the access token has expired.
 *
 * Clears the cookie and throws `SessionExpiredError` when there is nothing
 * usable left, so an expired session becomes the signed-out state rather than
 * a 401 the customer sees raw.
 */
async function liveSession(): Promise<CustomerSession> {
  const session = await readSession();
  if (!session) throw new SessionExpiredError();
  if (!isExpired(session)) return session;

  if (!session.refreshToken) {
    await clearSession();
    throw new SessionExpiredError();
  }

  try {
    const config = authConfig();
    const token = await exchange(config, {
      grantType: 'refresh_token',
      clientId: config.clientId,
      refreshToken: session.refreshToken,
    });
    const refreshed = sessionFromToken(token, session.email);
    await writeSession(refreshed);
    return refreshed;
  } catch {
    // A refresh token that no longer works is indistinguishable from no
    // session at all, and both mean "sign in again".
    await clearSession();
    throw new SessionExpiredError();
  }
}

/**
 * One Aonik call as the signed-in customer.
 *
 * A 401 or 403 that survives refresh means the session is genuinely finished:
 * the cookie is dropped so the next render is honestly signed-out instead of
 * showing an account menu that no longer works.
 */
export async function aonikAuthedFetch<T>(
  path: string,
  options: Omit<AonikFetchOptions, 'baseUrl' | 'tenantId' | 'policy' | 'accessToken'> = {},
): Promise<T> {
  const config = authConfig();
  const session = await liveSession();

  try {
    return await authFetch<T>(path, config, { ...options, accessToken: session.accessToken });
  } catch (error) {
    if (error instanceof AonikError && error.isUnauthenticated) {
      await clearSession();
      throw new SessionExpiredError();
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  // Only the session goes. The cart cookie survives deliberately: an adopted
  // cart is party-bound, so signing out simply ends access to it until the next
  // sign-in — deleting the cookie would not delete the cart, only the way back.
  await clearSession();
}

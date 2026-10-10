/**
 * Sign-in, and calling Aonik as the signed-in customer.
 *
 * The one module that handles credentials, and it never lets them travel: a
 * password arrives from a server action, is exchanged for a token, and is gone.
 * Nothing here is logged, and the token lands in an httpOnly cookie rather than
 * a page prop.
 *
 * There is no registration here: accounts are created during checkout (the
 * design's decision), by Aonik's own account-setup link.
 *
 * The endpoints live OUTSIDE `/commerce/` — `/auth/token` and `/identity/*` are
 * platform surfaces, not commerce ones — which is why `AONIK_API_URL` must be
 * the API root and not a `/commerce` prefix.
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

/**
 * An anonymous call to Aonik's identity surface (`/identity/*`): the password
 * reset and the account-setup link. Needs the connection but NOT the OAuth
 * client, so it works on a deployment where the password grant is not set up.
 * Throws `AccountsUnavailableError` on demo data, where there is no identity
 * provider to ask.
 */
export function identityFetch<T>(path: string, options: AuthFetchOptions = {}): Promise<T> {
  const connection = readAonikConfig();
  if (!connection) {
    throw new AccountsUnavailableError('Accounts need a configured Aonik (AONIK_API_URL and AONIK_TENANT_ID).');
  }
  return authFetch<T>(path, { ...connection, clientId: '' }, options);
}

/** The tenant identity bodies name (`tenantId` goes in the body AND the header). */
export function identityTenantId(): string | null {
  return readAonikConfig()?.tenantId ?? null;
}

/* ---- Credential failures --------------------------------------------------- */

/**
 * A sign-in the customer can fix — a wrong email or password.
 *
 * Carries Aonik's own text for the log, never for the page: `/auth/token` hands
 * back one message for a wrong password, an unknown email and a realm with the
 * password grant switched off, and the form says one neutral thing for all of
 * them (it must not confirm which emails have accounts).
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
 * The signed-in customer's session, refreshed if its access token has expired
 * — or null when there is none to be had. Never throws: for a caller to whom a
 * session is optional (a cart that a guest token may authorize instead).
 */
export async function currentSession(): Promise<CustomerSession | null> {
  try {
    return await liveSession();
  } catch {
    return null;
  }
}

/**
 * Whether the session cookie holds an expired access token that a refresh
 * could renew. A Server Component render cannot write the renewed cookie —
 * refreshing there would spend the refresh token (the provider may rotate it)
 * and then lose the new one — so a page that reads the signed-in customer's
 * data asks this first and lets a route handler renew it.
 */
export async function sessionNeedsRefresh(): Promise<boolean> {
  const session = await readSession();
  return Boolean(session && session.refreshToken && isExpired(session));
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

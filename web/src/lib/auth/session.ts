/**
 * The customer session — `{ accessToken, expiresAt, refreshToken?, email? }`.
 *
 * Sibling to the cart cookie: one holds who you are, the other holds the box
 * you are building. Both are httpOnly and both are readable only by the server,
 * for the same reason — an access token in client JavaScript is an access token
 * one XSS away from being someone else's.
 *
 * The token is never exposed to a page prop, a client component, or a URL. Code
 * that needs to call Aonik as the customer asks this module for it and makes
 * the call server-side.
 *
 * SERVER-ONLY.
 */

import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'abbys-table:session';

export interface CustomerSession {
  accessToken: string;
  /** Epoch milliseconds. Absolute, so a stale cookie cannot look fresh. */
  expiresAt: number;
  /** Present only when the grant issued one; enables silent refresh. */
  refreshToken?: string;
  /**
   * Display only — for the header's account menu, so it need not decode a JWT
   * or make a round trip just to greet someone.
   */
  email?: string;
}

/**
 * Treat a token as expired this long before it really is.
 *
 * A token that passes the check and then expires mid-flight produces a 401 the
 * customer sees as a random sign-out. Thirty seconds is comfortably longer than
 * a storefront request and short enough not to waste a usable token.
 */
const EXPIRY_SKEW_MS = 30_000;

export function isExpired(session: CustomerSession, now = Date.now()): boolean {
  return session.expiresAt - EXPIRY_SKEW_MS <= now;
}

/**
 * Builds a session from a token response.
 *
 * `expiresIn` is seconds-from-now, so it is resolved to an absolute instant at
 * the moment of the exchange — a relative value stored in a cookie would stay
 * "3600 seconds from now" forever.
 */
export function sessionFromToken(
  // `refreshToken` arrives as `null` on the wire and becomes `undefined` here,
  // the same absent-is-undefined convention the Aonik mappers use.
  token: { accessToken: string; refreshToken?: string | null; expiresIn: number },
  email?: string,
  now = Date.now(),
): CustomerSession {
  return {
    accessToken: token.accessToken,
    // A missing or nonsensical expiry is treated as a short one rather than a
    // long one: erring towards a refresh is cheap, erring towards a dead token
    // means failed calls.
    expiresAt: now + (Number.isFinite(token.expiresIn) && token.expiresIn > 0
      ? token.expiresIn * 1000
      : 60_000),
    refreshToken: token.refreshToken ?? undefined,
    email,
  };
}

export async function readSession(): Promise<CustomerSession | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const session = parsed as Partial<CustomerSession>;
    if (typeof session.accessToken !== 'string' || !session.accessToken) return null;
    if (typeof session.expiresAt !== 'number') return null;

    return {
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      refreshToken: typeof session.refreshToken === 'string' ? session.refreshToken : undefined,
      email: typeof session.email === 'string' ? session.email : undefined,
    };
  } catch {
    return null;
  }
}

export async function writeSession(session: CustomerSession): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    // Secure is skipped on http://localhost only — a Secure cookie is never
    // stored there and dev would silently fail to stay signed in.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // The cookie outlives the access token on purpose: a refresh token is only
    // useful if we still hold it after the access token dies.
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** What a page may know about the session. Deliberately carries no token. */
export interface SessionView {
  isSignedIn: boolean;
  email?: string;
}

/**
 * The session as a Client Component may see it.
 *
 * Separate from `readSession` so that passing session state into the tree is
 * the easy thing and leaking the token is the hard thing — the header takes a
 * `SessionView` and there is no token on it to spill.
 */
export async function readSessionView(): Promise<SessionView> {
  const session = await readSession();
  if (!session || isExpired(session)) return { isSignedIn: false };
  return { isSignedIn: true, email: session.email };
}

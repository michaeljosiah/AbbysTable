/**
 * The emailed secure link: account set-up after a paid checkout (and, later,
 * an email change). Aonik issues an opaque token in the link's URL FRAGMENT
 * (`{storefrontOrigin}{setupPath}#token=…`, valid ten minutes) so it never
 * reaches a server log or a Referer.
 *
 * Two anonymous calls, both neutral by design:
 * - `resolve` only reports whether the link is usable (200 `ready`, or 410 for
 *   every invalid, expired, used, superseded or other-tenant link). It does not
 *   consume the link or create anything, and is rate limited.
 * - `resend` takes the ORIGINAL token and always answers an empty 202; an
 *   eligible expired link rotates to a fresh one, a used link cannot reopen.
 *
 * The token is a bearer capability: it is only ever sent to Aonik, never
 * logged, and never put in a URL by this site.
 *
 * SERVER-ONLY.
 */

import { AonikError } from '@/lib/aonik/errors';
import { AttemptLimiter } from '@/lib/request/rateLimit';

import { AccountsUnavailableError, identityFetch } from './server';

export const ACCESS_RESOLVE_PATH = '/identity/account-access/resolve';
export const ACCESS_RESEND_PATH = '/identity/account-access/resend';

/** The storefront's own per-address limits (Aonik sees only this server's address). */
export const checkByAddress = new AttemptLimiter(30, 10 * 60_000);
export const resendByAddress = new AttemptLimiter(5, 15 * 60_000);

/** Aonik's tokens are short; anything past this is not one and is not sent. */
export const MAX_ACCESS_TOKEN_LENGTH = 2048;

export type AccessLinkOutcome =
  /** The link can still be used. */
  | 'ready'
  /** Invalid, expired or already used: one answer for all of them. */
  | 'gone'
  /** No identity provider to ask (demo data). */
  | 'unavailable'
  /** Aonik is rate limiting, or could not be reached: the link was not judged. */
  | 'failed';

/** A token worth sending: a non-empty string of printable characters, bounded. */
export function usableAccessToken(token: unknown): token is string {
  return (
    typeof token === 'string' &&
    token.length > 0 &&
    token.length <= MAX_ACCESS_TOKEN_LENGTH &&
    !/[\s\p{Cc}]/u.test(token)
  );
}

export async function resolveAccessLink(token: unknown, forwardedFor?: string): Promise<AccessLinkOutcome> {
  if (!usableAccessToken(token)) return 'gone';
  try {
    const answer = await identityFetch<{ status?: unknown }>(ACCESS_RESOLVE_PATH, {
      method: 'POST',
      body: { token },
      forwardedFor,
    });
    return answer?.status === 'ready' ? 'ready' : 'gone';
  } catch (error) {
    if (error instanceof AccountsUnavailableError) return 'unavailable';
    if (error instanceof AonikError && error.status === 410) return 'gone';
    console.error('[auth] an account link could not be checked', error instanceof AonikError ? error.status : error);
    return 'failed';
  }
}

/**
 * Asks for a new link. `requested` means only that Aonik took the request: it
 * does not say an email was sent, and the page must not claim one was.
 */
export async function resendAccessLink(
  token: unknown,
  forwardedFor?: string,
): Promise<'requested' | 'unavailable' | 'failed'> {
  // An unusable token is not sent. The page answers the same either way: it
  // must never confirm that a link, an address or an account exists.
  if (!usableAccessToken(token)) return 'requested';
  try {
    await identityFetch<void>(ACCESS_RESEND_PATH, {
      method: 'POST',
      body: { token },
      ignoreBody: true,
      forwardedFor,
    });
    return 'requested';
  } catch (error) {
    if (error instanceof AccountsUnavailableError) return 'unavailable';
    // Throttled resends are neutral on Aonik's side too.
    if (error instanceof AonikError && error.status === 429) return 'requested';
    console.error('[auth] a new account link could not be requested', error instanceof AonikError ? error.status : error);
    return 'failed';
  }
}

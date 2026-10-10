/**
 * A per-address limit on the three public sign-up actions (newsletter,
 * notify-me, Private Table waitlist).
 *
 * Each is a public POST that puts an email address on a list with a consent
 * record, and Aonik neither rate-limits its sign-up endpoints nor confirms an
 * address before recording it. Without a limit a script could sign up any
 * number of other people's addresses from one place. This is the storefront's
 * share of that protection (`@/lib/request/rateLimit`), keyed by the client
 * address the platform reports (`@/lib/request/clientAddress`). Confirming the
 * address (double opt-in) is the real answer and belongs to Aonik.
 *
 * Only attempts that would reach Aonik count — a typo the action refuses
 * costs nothing. With no client address to key on there is no limit, rather
 * than one shared bucket that would block everyone.
 *
 * SERVER-ONLY.
 */

import { clientAddress } from '@/lib/request/clientAddress';
import { addressKey, AttemptLimiter } from '@/lib/request/rateLimit';

/** Sign-ups to one list from one address… */
export const SIGNUP_ATTEMPTS = 5;
/** …within this window. */
export const SIGNUP_WINDOW_MS = 10 * 60 * 1000;

const limiter = new AttemptLimiter(SIGNUP_ATTEMPTS, SIGNUP_WINDOW_MS);

/** Forgets every attempt (tests, and nothing else). */
export function clearSignupAttempts(): void {
  limiter.clear();
}

/**
 * Records an attempt to join `list` and answers whether it may go ahead:
 * false once this address has made `SIGNUP_ATTEMPTS` within the window.
 */
export async function admitSignup(list: string, now = Date.now()): Promise<boolean> {
  const address = await clientAddress();
  if (!address) return true;
  return limiter.admit(`${list}|${addressKey(address)}`, now);
}

/**
 * A per-address limit on the three public sign-up actions (newsletter,
 * notify-me, Private Table waitlist).
 *
 * Each is a public POST that puts an email address on a list with a consent
 * record, and Aonik neither rate-limits its sign-up endpoints nor confirms an
 * address before recording it. Without a limit a script could sign up any
 * number of other people's addresses from one place. This is the storefront's
 * share of that protection: best-effort and per server process (a deployment
 * with several instances multiplies it), keyed by the client address the
 * platform puts in `X-Forwarded-For`. Confirming the address (double opt-in)
 * is the real answer and belongs to Aonik.
 *
 * Only attempts that would reach Aonik count — a typo the action refuses
 * costs nothing. With no client address to key on (local development) there
 * is no limit, rather than one shared bucket that would block everyone.
 *
 * SERVER-ONLY.
 */

import { clientAddress } from '@/lib/request/clientAddress';

/** Sign-ups to one list from one address… */
export const SIGNUP_ATTEMPTS = 5;
/** …within this window. */
export const SIGNUP_WINDOW_MS = 10 * 60 * 1000;
/** Bounds the memory a flood of distinct addresses can take. */
const MAX_TRACKED = 10_000;

const attempts = new Map<string, number[]>();

/** Forgets every attempt (tests, and nothing else). */
export function clearSignupAttempts(): void {
  attempts.clear();
}

/**
 * Records an attempt to join `list` and answers whether it may go ahead:
 * false once this address has made `SIGNUP_ATTEMPTS` within the window.
 */
export async function admitSignup(list: string, now = Date.now()): Promise<boolean> {
  const address = await clientAddress();
  if (!address) return true;

  const key = `${list}|${address}`;
  const recent = (attempts.get(key) ?? []).filter((at) => now - at < SIGNUP_WINDOW_MS);
  if (recent.length >= SIGNUP_ATTEMPTS) {
    attempts.set(key, recent);
    return false;
  }
  recent.push(now);
  // Oldest first: a Map iterates in insertion order, so re-insert to refresh.
  attempts.delete(key);
  attempts.set(key, recent);
  if (attempts.size > MAX_TRACKED) {
    const oldest = attempts.keys().next().value;
    if (oldest !== undefined) attempts.delete(oldest);
  }
  return true;
}

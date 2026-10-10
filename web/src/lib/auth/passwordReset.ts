/**
 * Asking Aonik to send a password reset.
 *
 * `POST /identity/password/forgot` always answers 2xx, whether or not the email
 * has an account — so a person cannot probe which addresses are registered, and
 * neither can this page. The reset itself happens on the identity provider's
 * own hosted page, reached from the email; the new password never passes
 * through this site.
 *
 * SERVER-ONLY.
 */

import { AonikError } from '@/lib/aonik/errors';

import { AccountsUnavailableError, identityFetch, identityTenantId } from './server';

import { AttemptLimiter, addressKey } from '@/lib/request/rateLimit';

export const FORGOT_PASSWORD_PATH = '/identity/password/forgot';

/**
 * The storefront's own limits. Aonik limits per address but sees only this
 * server's (see `@/lib/request/clientAddress`), so one script could use up the
 * whole site's allowance, or send a reset email to one victim over and over.
 * Per address, and per email so one inbox is not flooded from many addresses.
 */
export const resetByAddress = new AttemptLimiter(8, 15 * 60_000);
/** Log in attempts per address (guessing passwords through this server). */
export const loginByAddress = new AttemptLimiter(20, 10 * 60_000);
export const resetByEmail = new AttemptLimiter(3, 60 * 60_000);

/** Records a reset request and answers whether it may go ahead. No address: no per-address limit. */
export function admitPasswordReset(email: string, address: string | null, now = Date.now()): boolean {
  if (address && !resetByAddress.admit(addressKey(address), now)) return false;
  return resetByEmail.admit(email.toLowerCase(), now);
}

export type PasswordResetOutcome =
  /** Aonik took the request. Says nothing about whether an account exists. */
  | { status: 'requested' }
  /** No identity provider to ask (demo data, or no Aonik): nothing was sent. */
  | { status: 'unavailable' }
  /** Aonik is rate limiting this person or address. */
  | { status: 'rate-limited' }
  /** Aonik could not be reached or answered an error. */
  | { status: 'failed' };

export async function requestPasswordReset(
  email: string,
  forwardedFor?: string,
): Promise<PasswordResetOutcome> {
  const tenantId = identityTenantId();
  if (!tenantId) return { status: 'unavailable' };

  try {
    await identityFetch<void>(FORGOT_PASSWORD_PATH, {
      method: 'POST',
      body: { email, tenantId },
      // The reply is empty or a fixed acknowledgement; only the 2xx counts.
      ignoreBody: true,
      forwardedFor,
    });
    return { status: 'requested' };
  } catch (error) {
    if (error instanceof AccountsUnavailableError) return { status: 'unavailable' };
    if (error instanceof AonikError && error.status === 429) return { status: 'rate-limited' };
    console.error('[auth] password reset request failed', error instanceof AonikError ? error.status : error);
    return { status: 'failed' };
  }
}

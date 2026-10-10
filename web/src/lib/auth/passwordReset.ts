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

export const FORGOT_PASSWORD_PATH = '/identity/password/forgot';

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

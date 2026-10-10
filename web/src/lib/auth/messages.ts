/**
 * What the log in and password reset forms say, and the one rule that picks the
 * email message. Its own module because `actions.ts` is a `'use server'` file
 * and can export only async functions.
 */

import { isEmailAddress } from '@/lib/email';

/** The design's three field messages (Log in v2). */
export const LOGIN_MESSAGES = {
  emailMissing: 'Enter your email address.',
  emailInvalid: 'Enter an email address in the format name@example.com.',
  passwordMissing: 'Enter your password.',
} as const;

/**
 * One line for every sign-in the identity provider refused. `/auth/token`
 * answers the same 400 for a wrong password, an unknown email and a realm with
 * the password grant off, and a form that told them apart would tell a stranger
 * which emails have accounts.
 */
export const SIGN_IN_REFUSED = 'That email address and password don’t match. Check them and try again.';

/** The email field's message, or undefined when it is fine. */
export function emailProblem(email: string): string | undefined {
  if (!email) return LOGIN_MESSAGES.emailMissing;
  return isEmailAddress(email) ? undefined : LOGIN_MESSAGES.emailInvalid;
}

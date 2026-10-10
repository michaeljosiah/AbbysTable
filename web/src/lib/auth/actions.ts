'use server';

/**
 * The auth forms' server actions.
 *
 * Being server actions is the whole point: the password is posted same-origin
 * to this server, exchanged for a token here, and never exists in the browser's
 * world beyond the input element the customer typed it into. No token, no
 * password, and no Aonik call ever happens in client JavaScript.
 *
 * Every action returns a plain `AuthActionState` rather than throwing, because
 * a thrown error in a server action reaches the client as an opaque digest —
 * useless to the customer and to us. Outcomes are values.
 */

import { redirect } from 'next/navigation';

import { adoptBoxCart } from '@/lib/cart/server';
import { clientAddress } from '@/lib/request/clientAddress';

import { LOGIN_MESSAGES, SIGN_IN_REFUSED, emailProblem } from './messages';
import { requestPasswordReset } from './passwordReset';
import { safePostAuthPath } from './redirect';

import { AccountsUnavailableError, CredentialError, signIn, signOut } from './server';

export interface AuthActionState {
  status: 'idle' | 'error' | 'unavailable' | 'sent';
  /** Shown inline above the button (a failure that is no field's). */
  message?: string;
  /** Field-level errors for the form to attach to inputs. */
  fieldErrors?: { email?: string; password?: string };
  /** The address a reset was requested for (the confirmation names it). */
  email?: string;
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Turns a failure into state the form can render.
 *
 * `AccountsUnavailableError` is deliberately NOT a form error: nothing the
 * customer types will fix a missing OAuth client, so it surfaces as the
 * "accounts unavailable" notice the page shows.
 */
function toState(error: unknown): AuthActionState {
  if (error instanceof AccountsUnavailableError) {
    return { status: 'unavailable', message: error.message };
  }

  if (error instanceof CredentialError) {
    return { status: 'error', message: SIGN_IN_REFUSED };
  }

  // Never surface an unknown failure's text: it can carry internals.
  console.error('[auth] unexpected failure', error);
  return {
    status: 'error',
    message: 'Something went wrong on our side. Please try again in a moment.',
  };
}

/**
 * Adoption runs after every successful sign-in, and its failure is never the
 * customer's problem — see `adoptBoxCart`, which already swallows outcomes.
 * This exists so the ordering is stated once: session first, then adopt, then
 * redirect. Adopting before the session exists would have no bearer to use.
 */
async function completeSignIn(redirectTo: string): Promise<never> {
  await adoptBoxCart();
  // `redirect` throws by design; it must sit outside any try/catch that would
  // swallow it, which is why it is here and not inside the action's try block.
  redirect(redirectTo);
}

export async function loginAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  const email = text(form, 'email');
  const password = String(form.get('password') ?? '');
  const next = safePostAuthPath(text(form, 'next'));

  const fieldErrors: NonNullable<AuthActionState['fieldErrors']> = {};
  const emailError = emailProblem(email);
  if (emailError) fieldErrors.email = emailError;
  if (!password) fieldErrors.password = LOGIN_MESSAGES.passwordMissing;
  if (Object.keys(fieldErrors).length > 0) return { status: 'error', fieldErrors };

  try {
    await signIn(email, password);
  } catch (error) {
    return toState(error);
  }

  // Returned rather than awaited: its `never` result is what tells TypeScript
  // this branch does not fall through to a state object.
  return completeSignIn(next);
}

/**
 * "Forgot your password?" — asks Aonik to email a reset link.
 *
 * Answers `sent` for every address once Aonik has taken the request: it says
 * nothing about whether an account exists, and neither may this form.
 */
export async function requestPasswordResetAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  const email = text(form, 'email');
  const emailError = emailProblem(email);
  if (emailError) return { status: 'error', fieldErrors: { email: emailError }, email };

  const outcome = await requestPasswordReset(email, (await clientAddress()) ?? undefined);
  switch (outcome.status) {
    case 'requested':
      return { status: 'sent', email };
    case 'unavailable':
      return { status: 'unavailable', email };
    case 'rate-limited':
      return {
        status: 'error',
        email,
        message: 'Too many requests. Please wait a few minutes and try again.',
      };
    default:
      return {
        status: 'error',
        email,
        message: 'We couldn’t send that just now. Please try again in a moment.',
      };
  }
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect('/');
}

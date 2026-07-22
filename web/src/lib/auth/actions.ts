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

import { safePostAuthPath } from './redirect';

import {
  AccountsUnavailableError,
  CredentialError,
  RegisteredButNotSignedInError,
  register,
  signIn,
  signOut,
} from './server';

export interface AuthActionState {
  /**
   * `registered` is success-with-a-detour: the account exists but the automatic
   * sign-in did not happen, so the form must point at /login rather than
   * inviting a retry that would now collide with the account just created.
   */
  status: 'idle' | 'error' | 'unavailable' | 'registered';
  /** Shown inline. Aonik's own wording where it gave us one. */
  message?: string;
  /** Field-level errors for the form to attach to inputs. */
  fieldErrors?: { email?: string; password?: string; firstName?: string; lastName?: string };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Turns a failure into state the form can render.
 *
 * `AccountsUnavailableError` is deliberately NOT a form error: nothing the
 * customer types will fix a missing OAuth client, so it surfaces as the
 * "accounts unavailable" notice the pages already show — which, once this
 * shipped, became a truthful statement about the deployment rather than a
 * placeholder.
 */
function toState(error: unknown): AuthActionState {
  if (error instanceof AccountsUnavailableError) {
    return { status: 'unavailable', message: error.message };
  }

  if (error instanceof RegisteredButNotSignedInError) {
    return { status: 'registered', message: error.message };
  }

  if (error instanceof CredentialError) {
    return { status: 'error', message: error.message };
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

  const fieldErrors: AuthActionState['fieldErrors'] = {};
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = 'Enter a valid email address.';
  if (!password) fieldErrors.password = 'Enter your password.';
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

export async function registerAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  const firstName = text(form, 'firstName');
  const lastName = text(form, 'lastName');
  const email = text(form, 'email');
  const password = String(form.get('password') ?? '');
  const next = safePostAuthPath(text(form, 'next'));

  const fieldErrors: AuthActionState['fieldErrors'] = {};
  if (!firstName) fieldErrors.firstName = 'Enter your first name.';
  if (!lastName) fieldErrors.lastName = 'Enter your last name.';
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = 'Enter a valid email address.';
  if (password.length < 8) fieldErrors.password = 'Use at least 8 characters.';
  if (Object.keys(fieldErrors).length > 0) return { status: 'error', fieldErrors };

  try {
    await register({ firstName, lastName, email, password });
  } catch (error) {
    return toState(error);
  }

  // Returned rather than awaited: its `never` result is what tells TypeScript
  // this branch does not fall through to a state object.
  return completeSignIn(next);
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect('/');
}

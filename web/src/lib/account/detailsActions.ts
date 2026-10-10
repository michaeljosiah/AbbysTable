'use server';

/**
 * The details page's server actions: save the name and phone, and send the
 * password-reset link. Outcomes are values (a thrown error in a server action
 * reaches the client as an opaque digest).
 */

import { revalidatePath } from 'next/cache';

import { AonikError } from '@/lib/aonik/errors';
import {
  admitPasswordReset,
  requestPasswordReset,
} from '@/lib/auth/passwordReset';
import { aonikAuthedFetch, SessionExpiredError } from '@/lib/auth/server';
import { clientAddress } from '@/lib/request/clientAddress';

import {
  DETAILS_MESSAGES,
  detailsFormErrors,
  trimmedDetails,
  type DetailsFormErrors,
  type DetailsFormValues,
} from './detailsForm';
import { phoneForInput, toE164 } from './phone';
import { getMyProfile, updateMyProfile } from './profile';

export type SaveDetailsResult =
  | { status: 'saved'; values: DetailsFormValues; said: string }
  | { status: 'invalid'; errors: DetailsFormErrors }
  | { status: 'failed'; message: string }
  | { status: 'ended' };

export async function saveDetailsAction(
  input: DetailsFormValues,
): Promise<SaveDetailsResult> {
  const values = trimmedDetails(input);
  // A phone left empty is judged against what is stored, below.
  const early = detailsFormErrors(values);
  if (Object.keys(early).length > 0)
    return { status: 'invalid', errors: early };

  try {
    // Read first: the write sends back what the form does not ask for (title,
    // country), and a stored phone cannot be cleared here.
    const current = await getMyProfile();
    if (!values.phone && current.phone)
      return {
        status: 'invalid',
        errors: { phone: DETAILS_MESSAGES.phoneKept },
      };
    const saved = await updateMyProfile(current, {
      firstName: values.firstName.slice(0, 128),
      lastName: values.lastName.slice(0, 128),
      phone: toE164(values.phone),
    });
    // The greeting in the account frame reads the name.
    revalidatePath('/account', 'layout');
    // What Aonik now holds, not what was typed: the form shows the truth.
    return {
      status: 'saved',
      values: {
        firstName: saved.firstName ?? '',
        lastName: saved.lastName ?? '',
        phone: phoneForInput(saved.phone),
      },
      said: DETAILS_MESSAGES.saved,
    };
  } catch (error) {
    if (error instanceof SessionExpiredError) return { status: 'ended' };
    if (
      error instanceof AonikError &&
      (error.status === 400 || error.status === 403 || error.status === 422)
    ) {
      return { status: 'failed', message: DETAILS_MESSAGES.refused };
    }
    console.error(
      '[account] details could not be saved',
      error instanceof AonikError ? error.status : error,
    );
    return { status: 'failed', message: DETAILS_MESSAGES.unavailable };
  }
}

export type SendResetResult =
  | { status: 'sent'; email: string }
  | { status: 'failed'; message: string }
  | { status: 'ended' };

/**
 * "Send reset link": the same Aonik call as Forgot password, for the address
 * Aonik holds for THIS session (never one typed or posted), under the same
 * per-address and per-email limits.
 */
export async function sendPasswordResetLinkAction(): Promise<SendResetResult> {
  let email: string;
  try {
    email = (await getMyProfile()).email;
  } catch (error) {
    if (error instanceof SessionExpiredError) return { status: 'ended' };
    return { status: 'failed', message: DETAILS_MESSAGES.resetFailed };
  }

  const address = await clientAddress();
  if (!admitPasswordReset(email, address))
    return { status: 'failed', message: DETAILS_MESSAGES.resetLimited };

  const outcome = await requestPasswordReset(email, address ?? undefined);
  switch (outcome.status) {
    case 'requested':
      return { status: 'sent', email };
    case 'unavailable':
      return { status: 'failed', message: DETAILS_MESSAGES.resetUnavailable };
    case 'rate-limited':
      return { status: 'failed', message: DETAILS_MESSAGES.resetLimited };
    default:
      return { status: 'failed', message: DETAILS_MESSAGES.resetFailed };
  }
}

/** Email changes are issued by the identity service, never a direct profile write. */
export async function requestEmailChangeAction(
  email: string,
): Promise<{ status: 'requested' | 'failed' | 'ended'; message: string }> {
  const value = typeof email === 'string' ? email.trim() : '';
  if (!value || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return { status: 'failed', message: 'Enter a valid email address.' };
  const address = await clientAddress();
  if (!admitPasswordReset(value, address))
    return {
      status: 'failed',
      message: 'Please wait before requesting another email change.',
    };
  try {
    await aonikAuthedFetch('/profiles/customers/me/email', {
      method: 'PUT',
      body: { newEmail: value },
      ignoreBody: true,
    });
    return {
      status: 'requested',
      message:
        'If this change is eligible, we’ll email a link to confirm your new address. You may need to sign in again first.',
    };
  } catch (error) {
    if (error instanceof SessionExpiredError)
      return { status: 'ended', message: '' };
    return {
      status: 'failed',
      message: 'We couldn’t request that email change. Please try again later.',
    };
  }
}

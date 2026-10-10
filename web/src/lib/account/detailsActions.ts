'use server';

/**
 * The details page's server actions: save the name and phone, and send the
 * password-reset link. Outcomes are values (a thrown error in a server action
 * reaches the client as an opaque digest).
 */

import { revalidatePath } from 'next/cache';

import { AonikError } from '@/lib/aonik/errors';
import { admitPasswordReset, requestPasswordReset } from '@/lib/auth/passwordReset';
import { SessionExpiredError } from '@/lib/auth/server';
import { clientAddress } from '@/lib/request/clientAddress';

import {
  DETAILS_MESSAGES,
  detailsFormErrors,
  trimmedDetails,
  type DetailsFormErrors,
  type DetailsFormValues,
} from './detailsForm';
import { toE164 } from './phone';
import { getMyProfile, updateMyProfile } from './profile';

export type SaveDetailsResult =
  | { status: 'saved'; values: DetailsFormValues; said: string }
  | { status: 'invalid'; errors: DetailsFormErrors }
  | { status: 'failed'; message: string }
  | { status: 'ended' };

export async function saveDetailsAction(input: DetailsFormValues): Promise<SaveDetailsResult> {
  const values = trimmedDetails(input);
  const errors = detailsFormErrors(values);
  if (Object.keys(errors).length > 0) return { status: 'invalid', errors };

  try {
    // Read first: the write replaces the profile's editable fields, so what the
    // form does not ask for (title, country) is sent back as it is.
    const current = await getMyProfile();
    await updateMyProfile(current, {
      firstName: values.firstName.slice(0, 128),
      lastName: values.lastName.slice(0, 128),
      phone: toE164(values.phone),
    });
    // The greeting in the account frame reads the name.
    revalidatePath('/account', 'layout');
    return { status: 'saved', values, said: DETAILS_MESSAGES.saved };
  } catch (error) {
    if (error instanceof SessionExpiredError) return { status: 'ended' };
    if (error instanceof AonikError && (error.status === 400 || error.status === 422)) {
      return { status: 'failed', message: DETAILS_MESSAGES.refused };
    }
    console.error('[account] details could not be saved', error instanceof AonikError ? error.status : error);
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
  if (!admitPasswordReset(email, address)) return { status: 'failed', message: DETAILS_MESSAGES.resetLimited };

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

/**
 * The details form's rules — React-free; the browser and the server action run
 * the same ones. Messages are the design's (My Account, Details & preferences).
 * The email is shown, never edited here: see `DETAILS_COPY.emailNote`.
 */

import { toE164 } from './phone';

export interface DetailsFormValues {
  firstName: string;
  lastName: string;
  phone: string;
}

export type DetailsFormErrors = Partial<Record<'firstName' | 'phone', string>>;

export const DETAILS_MESSAGES = {
  firstName: 'Enter your first name.',
  phone: 'Enter a phone number, like 07700 900123.',
  saved: 'Your details have been saved.',
  refused: 'We couldn’t save your details. Please check them and try again.',
  unavailable: 'We couldn’t save your details just now. Please try again in a moment.',
  resetSent: (email: string) => `Link sent to ${email}. It can take a few minutes, so check your junk folder too.`,
  resetFailed: 'We couldn’t send that just now. Please try again in a moment.',
  resetLimited: 'Too many requests. Please wait a few minutes and try again.',
  resetUnavailable: 'Password reset isn’t available yet.',
} as const;

export const DETAILS_COPY = {
  emailNote: 'To change your email address, contact us.',
  phoneHint: 'Used only for delivery updates.',
  passwordLead: 'We’ll email you a secure link to set a new password.',
  emailsLead: 'Order and delivery emails are always sent.',
} as const;

export function trimmedDetails(values: Partial<DetailsFormValues>): DetailsFormValues {
  const text = (value: string | undefined) => (value ?? '').trim();
  return { firstName: text(values.firstName), lastName: text(values.lastName), phone: text(values.phone) };
}

/** The field errors, empty when fine. A phone is optional, but when given it must be one. */
export function detailsFormErrors(values: DetailsFormValues): DetailsFormErrors {
  const errors: DetailsFormErrors = {};
  if (!values.firstName) errors.firstName = DETAILS_MESSAGES.firstName;
  if (values.phone && !toE164(values.phone)) errors.phone = DETAILS_MESSAGES.phone;
  return errors;
}

'use server';

/**
 * The Contact form's server action.
 *
 * A public POST endpoint, so it re-runs the form's own rules on what actually
 * arrived — fields AND images — before anything is sent anywhere. It answers
 * `sent` only after the enquiry endpoint has accepted the enquiry; every other
 * path is `invalid`, `unavailable` or `error`, and the form shows success for
 * `sent` alone (contract in `./enquiry`).
 *
 * While Aonik has no enquiry endpoint (michaeljosiah/aonik#356) the page does
 * not render the form, and this action — reachable by anyone who posts to it —
 * answers `unavailable` without sending.
 */

import {
  EnquiriesUnavailableError,
  enquiriesAvailable,
  submitEnquiry,
} from '@/lib/aonik/enquiries';

import {
  draftFromForm,
  ENQUIRY_FORM_FIELDS,
  firstInvalidField,
  imagesProblem,
  toEnquiry,
  type EnquiryState,
} from './enquiry';

/** A real attachment: the browser posts an empty, nameless part for "no file". */
function attachedImages(form: FormData): File[] {
  return form
    .getAll(ENQUIRY_FORM_FIELDS.images)
    .filter((value): value is File => typeof value !== 'string' && value.size > 0);
}

export async function sendEnquiryAction(
  _previous: EnquiryState,
  form: FormData,
): Promise<EnquiryState> {
  const draft = draftFromForm(form);
  const images = attachedImages(form);
  const result = toEnquiry(draft);
  const imageError = imagesProblem(images) ?? undefined;

  if ('errors' in result || imageError) {
    const errors = 'errors' in result ? result.errors : {};
    return {
      status: 'invalid',
      errors: firstInvalidField(errors) ? errors : undefined,
      imageError,
    };
  }

  if (!(await enquiriesAvailable())) return { status: 'unavailable' };

  try {
    await submitEnquiry(result.enquiry, images);
    return { status: 'sent', email: result.enquiry.email };
  } catch (error) {
    if (error instanceof EnquiriesUnavailableError) return { status: 'unavailable' };
    // Never surface the failure's own text: it can carry internals. The form
    // says it was not sent and keeps everything typed.
    console.error('[contact] enquiry not sent', error);
    return { status: 'error' };
  }
}

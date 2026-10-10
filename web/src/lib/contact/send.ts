/**
 * What sending an enquiry does with a posted form — shared by the Contact
 * form's two doors, so both answer alike:
 *
 *  - `/api/enquiries` (`app/api/enquiries/route.ts`), which the form posts to
 *    whenever JavaScript runs — the only door that can carry the photos: a
 *    server action takes 1MB, and three photos can be 30;
 *  - the server action (`./actions`), for a post made without JavaScript,
 *    which carries no photos (the file input has no name; JavaScript keeps the
 *    attached list).
 *
 * A public POST either way, so it re-runs the form's own rules on what
 * actually arrived — fields AND images — before anything is sent anywhere. It
 * answers `sent` only after Aonik's 202 (michaeljosiah/aonik#356); every other
 * path is `invalid`, `unavailable` or `error`, and the form shows success for
 * `sent` alone (contract in `./enquiry`).
 *
 * Aonik's refusals, in our words: a 422 naming fields or images is `invalid`
 * with the form's own messages (`enquiryRefusal`); a 413 is `invalid` on the
 * images; a 409 (the submission reference already used for other details) is
 * `error` with `newSubmission`; a 429 is `error`, `limited`; anything else —
 * a 503 included — is `error`, and the form keeps the reference, so trying
 * again replays the receipt if Aonik did save it. A 503 is nearly always
 * passing (its image slots are full, the virus scanner or storage is down, or
 * the commit's outcome is unknown; it sends `Retry-After: 60`), so it is never
 * "can't be sent from this page". In demo mode it answers `unavailable`
 * without sending.
 *
 * Aonik limits enquiries per address, but sees only the storefront's (see
 * `@/lib/request/clientAddress`), so one script could use up the whole site's
 * allowance — and send an acknowledgement to any address it liked with each
 * post. `admitEnquiry` is the per-customer limit.
 *
 * SERVER-ONLY.
 */

import {
  EnquiriesUnavailableError,
  enquiriesAvailable,
  submitEnquiry,
} from '@/lib/aonik/enquiries';
import { AonikError } from '@/lib/aonik/errors';

import {
  draftFromForm,
  ENQUIRY_FORM_FIELDS,
  enquiryRefusal,
  firstInvalidField,
  IMAGE_MESSAGES,
  imagesProblem,
  toEnquiry,
  type EnquiryState,
} from './enquiry';
import { isSubmissionId, newSubmissionId } from './submission';

import { clientAddress } from '@/lib/request/clientAddress';
import { AttemptLimiter } from '@/lib/request/rateLimit';

/** Enquiries sent from one address… (a retry counts: a customer makes a few at most) */
export const ENQUIRY_ATTEMPTS = 8;
/** …within this window. */
export const ENQUIRY_WINDOW_MS = 10 * 60 * 1000;

const limiter = new AttemptLimiter(ENQUIRY_ATTEMPTS, ENQUIRY_WINDOW_MS);

/** Forgets every attempt (tests, and nothing else). */
export function clearEnquiryAttempts(): void {
  limiter.clear();
}

/** The answer once an address has sent `ENQUIRY_ATTEMPTS` within the window. */
export const ENQUIRY_LIMITED: EnquiryState = { status: 'error', limited: true };

/**
 * Records an attempt to send and answers whether it may go ahead. No address
 * to key on (local development): no limit.
 */
export async function admitEnquiry(now = Date.now()): Promise<boolean> {
  const address = await clientAddress();
  return address ? limiter.admit(address, now) : true;
}

/**
 * The attachments posted. A plain browser post sends an empty, NAMELESS part
 * for "no file", which is not one; an empty file WITH a name is, and the rules
 * refuse it rather than the action dropping it and answering "sent".
 */
function attachedImages(form: FormData): File[] {
  return form
    .getAll(ENQUIRY_FORM_FIELDS.images)
    .filter((value): value is File => typeof value !== 'string' && (value.size > 0 || value.name !== ''));
}

/**
 * `admitted`: the caller has already counted this attempt (`/api/enquiries`
 * does, before it reads the body); otherwise a valid post is counted here.
 */
export async function sendEnquiryForm(
  form: FormData,
  { admitted = false }: { admitted?: boolean } = {},
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
  if (!admitted && !(await admitEnquiry())) return ENQUIRY_LIMITED;

  // The form's reference for this content; a post without one (no
  // JavaScript) gets its own, which only means no retry can reuse it.
  const posted = form.get(ENQUIRY_FORM_FIELDS.submissionId);
  const submissionId = isSubmissionId(posted) ? posted : newSubmissionId();

  try {
    await submitEnquiry(result.enquiry, images, submissionId);
    return { status: 'sent', email: result.enquiry.email };
  } catch (error) {
    if (error instanceof EnquiriesUnavailableError) return { status: 'unavailable' };
    if (error instanceof AonikError) {
      if (error.status === 422) {
        const refusal = enquiryRefusal(error.fieldErrors, error.body);
        if (refusal) {
          console.warn('[contact] Aonik refused the enquiry', Object.keys(error.fieldErrors ?? {}));
          return {
            status: 'invalid',
            errors: firstInvalidField(refusal.errors) ? refusal.errors : undefined,
            imageError: refusal.imageError,
          };
        }
      }
      if (error.status === 413) return { status: 'invalid', imageError: IMAGE_MESSAGES.together };
      if (error.status === 409) {
        console.error('[contact] submission reference refused as already used', error);
        return { status: 'error', newSubmission: true };
      }
      if (error.status === 429) {
        console.warn('[contact] Aonik limited enquiries from this address');
        return ENQUIRY_LIMITED;
      }
    }
    // Never surface the failure's own text: it can carry internals. The form
    // says it was not sent and keeps everything typed.
    console.error('[contact] enquiry not sent', error);
    return { status: 'error' };
  }
}

'use server';

/**
 * The Contact form's server action — the door a post made WITHOUT JavaScript
 * comes through (text only; with JavaScript the form posts to
 * `/api/enquiries`, which can carry photos). The rules are `./send`.
 */

import type { EnquiryState } from './enquiry';
import { sendEnquiryForm } from './send';

export async function sendEnquiryAction(
  _previous: EnquiryState,
  form: FormData,
): Promise<EnquiryState> {
  return sendEnquiryForm(form);
}

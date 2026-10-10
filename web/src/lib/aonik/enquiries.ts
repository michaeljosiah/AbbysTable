/**
 * Customer enquiries — the Contact form's submission to Aonik (contract §3e;
 * michaeljosiah/aonik#356, `POST /v1/contact-enquiries`).
 *
 * Multipart, in Aonik's field names: `submission_id` (a UUID kept across
 * unchanged retries, `@/lib/contact/submission`), `name`, `email`, `topic`
 * (the six ids), `order_number` (only for an existing order), `message` and up
 * to three `images`. Aonik answers 202 once the enquiry and its two emails
 * (the staff notification, routed by topic, and the customer's
 * acknowledgement with a receipt reference) are SAVED — a receipt, not a
 * promise that email has arrived, and the page words its thanks that way.
 *
 * Images are checked by Aonik for real: content sniffed and matched to the
 * name, virus-scanned, re-encoded without metadata (EXIF/GPS stripped), stored
 * privately. Its refusals — 422 `contact.validation_failed` with `fieldErrors`
 * and `imageProblems`, 409 `contact.submission_conflict`, 413, 429 and 503
 * `contact.unavailable` (routing not configured, or a dependency down) — are
 * mapped by `@/lib/contact/send`.
 *
 * Demo mode never sends: there is nowhere to send to, and a production
 * deployment with no Aonik configured also runs on demo data, so a demo
 * "sent" would reach real customers — the same reason demo mode never offers
 * ordering and has no accounts.
 *
 * SERVER-ONLY.
 */

import { uploadName, type Enquiry } from '@/lib/contact/enquiry';
import { clientAddress } from '@/lib/request/clientAddress';

import { readAonikConfig, resolveDataMode, type AonikConfig } from './dataMode';
import { aonikFetch } from './http';

/** Aonik's enquiry endpoint. */
export const ENQUIRY_PATH = '/v1/contact-enquiries';

/**
 * How long a send may take, images and scanning included — Aonik allows each
 * of three images up to 30 seconds. A send cut off here is `error`, and trying
 * again under the same reference replays it if it was saved after all.
 */
export const ENQUIRY_TIMEOUT_MS = 120_000;

/** Raised when this deployment cannot send an enquiry at all. */
export class EnquiriesUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'EnquiriesUnavailableError';
  }
}

/**
 * Whether an enquiry sent from this deployment would reach Aonik: the data is
 * live and Aonik is configured. Whether the TENANT takes enquiries (routing
 * set up) only Aonik knows; it answers 503 `contact.unavailable` when not —
 * the same answer as a passing outage, so the form says "please try again"
 * (`@/lib/contact/send`); routing must be configured before go-live. Never
 * throws.
 */
export async function enquiriesAvailable(): Promise<boolean> {
  try {
    const { mode } = await resolveDataMode();
    return mode === 'live' && readAonikConfig() !== null;
  } catch {
    return false;
  }
}

/**
 * The multipart body, in Aonik's field names. The order number goes only when
 * there is one, and images under one repeated key, each named to match its
 * type (`uploadName`).
 */
export function toEnquiryForm(enquiry: Enquiry, images: readonly File[], submissionId: string): FormData {
  const form = new FormData();
  form.append('submission_id', submissionId);
  form.append('name', enquiry.name);
  form.append('email', enquiry.email);
  form.append('topic', enquiry.topic);
  if (enquiry.orderNumber) form.append('order_number', enquiry.orderNumber);
  form.append('message', enquiry.message);
  for (const image of images) form.append('images', image, uploadName(image.name, image.type));
  return form;
}

/**
 * Sends one enquiry. Resolves only when Aonik answered 2xx — that answer is
 * the acceptance the page's "sent" rests on; anything else throws
 * (`AonikError`, or the network's own error). Never cached, and never retried
 * here: a retry is the customer's, under the same reference, so it cannot
 * send the message twice.
 */
export async function postEnquiry(
  config: AonikConfig,
  enquiry: Enquiry,
  images: readonly File[],
  submissionId: string,
  forwardedFor?: string,
): Promise<void> {
  await aonikFetch<void>(ENQUIRY_PATH, {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    policy: 'volatile',
    method: 'POST',
    body: toEnquiryForm(enquiry, images, submissionId),
    // The 202 is the acceptance; its receipt body is not needed here.
    ignoreBody: true,
    signal: AbortSignal.timeout(ENQUIRY_TIMEOUT_MS),
    // Aonik limits enquiries per tenant and address (10 a minute by default).
    // From here every enquiry comes from this server, so without the
    // customer's address — and Aonik trusting this server to give it — the
    // whole site shares one allowance.
    forwardedFor,
  });
}

/** Sends an enquiry from this deployment, or throws `EnquiriesUnavailableError`. */
export async function submitEnquiry(
  enquiry: Enquiry,
  images: readonly File[],
  submissionId: string,
): Promise<void> {
  if (!(await enquiriesAvailable())) {
    throw new EnquiriesUnavailableError('Enquiries need live data and a configured Aonik.');
  }
  const config = readAonikConfig();
  if (!config) throw new EnquiriesUnavailableError('Aonik is not configured.');
  await postEnquiry(config, enquiry, images, submissionId, (await clientAddress()) ?? undefined);
}

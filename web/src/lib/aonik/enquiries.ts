/**
 * Customer enquiries — the Contact form's submission to Aonik (contract §3e).
 *
 * THE ENDPOINT DOES NOT EXIST YET (michaeljosiah/aonik#356). Until it does,
 * `ENQUIRY_PATH` is `null`, `enquiriesAvailable()` is false and the Contact
 * page holds its form back — the newsletter's precedent (#6): a form that
 * says "your message has been sent" while sending nothing is a live-looking
 * control that does nothing, and here a customer would be waiting two working
 * days for a reply that can never come.
 *
 * Demo mode never sends either. There is nowhere to send to, and a
 * production deployment with no Aonik configured also runs on demo data, so a
 * demo "sent" would reach real customers — the same reason demo mode never
 * offers ordering and has no accounts.
 *
 * When aonik#356 ships:
 *  1. set `ENQUIRY_PATH` to its path;
 *  2. reconcile `toEnquiryForm` with its real field names — the ones here are
 *     the contract's list (`name`, `email`, `topic`, `order_number?`,
 *     `message`, `images[]`), NOT a shipped DTO;
 *  3. confirm it does what the page promises and the contract requires: an
 *     acknowledgement email ("We've sent a copy to …"), routing by subject,
 *     spam protection with no visible puzzle, and server-side type, size,
 *     count and content checks, virus scanning and EXIF stripping on images.
 *
 * SERVER-ONLY.
 */

import type { Enquiry } from '@/lib/contact/enquiry';

import { readAonikConfig, resolveDataMode, type AonikConfig } from './dataMode';
import { aonikFetch } from './http';

/**
 * The Aonik path that accepts an enquiry, or `null` while there is none
 * (aonik#356). The ONE switch: set it and the form appears in live mode.
 */
export const ENQUIRY_PATH: string | null = null;

/** Raised when this deployment cannot send an enquiry at all. */
export class EnquiriesUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'EnquiriesUnavailableError';
  }
}

/**
 * Whether an enquiry sent from this deployment would really reach Abby's
 * Table: an endpoint exists, the data is live, and Aonik is configured. Never
 * throws.
 */
export async function enquiriesAvailable(): Promise<boolean> {
  if (ENQUIRY_PATH === null) return false;
  try {
    const { mode } = await resolveDataMode();
    return mode === 'live' && readAonikConfig() !== null;
  } catch {
    return false;
  }
}

/**
 * The multipart body, in the contract's field names (§3e). The order number
 * is sent only when there is one, and images under one repeated key.
 */
export function toEnquiryForm(enquiry: Enquiry, images: readonly File[]): FormData {
  const form = new FormData();
  form.append('name', enquiry.name);
  form.append('email', enquiry.email);
  form.append('topic', enquiry.topic);
  if (enquiry.orderNumber) form.append('order_number', enquiry.orderNumber);
  form.append('message', enquiry.message);
  for (const image of images) form.append('images', image, image.name);
  return form;
}

/**
 * Sends one enquiry to `path`. Resolves only when Aonik answered 2xx — that
 * answer is the acceptance the page's "sent" rests on; anything else throws
 * (`AonikError`, or the network's own error). Never cached, never retried:
 * a retry could send the message twice.
 */
export async function postEnquiry(
  path: string,
  config: AonikConfig,
  enquiry: Enquiry,
  images: readonly File[],
): Promise<void> {
  await aonikFetch<unknown>(path, {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    policy: 'volatile',
    method: 'POST',
    body: toEnquiryForm(enquiry, images),
  });
}

/** Sends an enquiry from this deployment, or throws `EnquiriesUnavailableError`. */
export async function submitEnquiry(enquiry: Enquiry, images: readonly File[]): Promise<void> {
  if (!(await enquiriesAvailable()) || ENQUIRY_PATH === null) {
    throw new EnquiriesUnavailableError(
      'Enquiries need the Aonik enquiry endpoint (michaeljosiah/aonik#356) and live data.',
    );
  }
  const config = readAonikConfig();
  if (!config) throw new EnquiriesUnavailableError('Aonik is not configured.');
  await postEnquiry(ENQUIRY_PATH, config, enquiry, images);
}

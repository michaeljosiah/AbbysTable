'use server';

/**
 * The Delivery & FAQs checker's server actions (#23).
 *
 * Server actions so the question goes to OUR server with the postcode in a
 * POST body — never a query string (contract §3b) — and the coverage lookup,
 * whichever data mode serves it, stays server-side. Each is a public endpoint,
 * so each validates what it is given and never trusts the browser's own
 * check. Outcomes are VALUES, never thrown: a thrown error reaches the client
 * as an opaque digest (the auth actions' rule).
 *
 * "Serves" and "not served" come only from a coverage answer. Everything else
 * — no lookup, a lookup that failed, a delivery-window read that failed — is
 * "unavailable" (could not check) or a missing date line, never a guess.
 */

import { getAonikClient, type AonikClient } from '@/lib/aonik/client';
import type { NotifyMeState } from '@/lib/aonik/notifyMe';

import { upcomingDeliveryDate } from './checker';
import { normalisePostcode, readPostcodeEntry } from './postcode';

export type PostcodeCheck =
  | { status: 'serves'; postcode: string; earliestDeliveryDate: string | null }
  | { status: 'not-served'; postcode: string }
  /** Not a postcode — the browser checks first, so normally unreachable. */
  | { status: 'invalid' }
  /** Could not check: a technical failure, answered with a retry. */
  | { status: 'unavailable' };

/** Longer than any postcode with generous spacing; anything past it is not one. */
const MAX_ENTRY = 32;

const log = (message: string, error?: unknown) => {
  console.error(`[delivery] ${message}`, error ?? '');
};

/** The tenant-wide earliest delivery, when the lookup named none. Optional. */
async function earliestFromWindow(client: AonikClient): Promise<string | null> {
  try {
    return (await client.getDeliveryWindow())?.earliestDeliveryDate ?? null;
  } catch (error) {
    log('delivery window unavailable; the result shows no date', error);
    return null;
  }
}

export async function checkPostcode(raw: unknown): Promise<PostcodeCheck> {
  // Too long is refused, never truncated: a cut entry is not what was asked.
  if (typeof raw !== 'string' || raw.length > MAX_ENTRY) return { status: 'invalid' };
  const entry = readPostcodeEntry(raw);
  if (!entry.ok) return { status: 'invalid' };

  try {
    const client = await getAonikClient();
    if (!client.coverage) return { status: 'unavailable' };

    const answer = await client.coverage.check(entry.postcode);
    const postcode = normalisePostcode(answer.postcode) ?? entry.postcode;
    if (answer.status === 'not-served') return { status: 'not-served', postcode };
    if (answer.status !== 'serves') throw new Error('Unrecognised coverage answer');

    const earliest = answer.earliestDeliveryDate ?? (await earliestFromWindow(client));
    return { status: 'serves', postcode, earliestDeliveryDate: upcomingDeliveryDate(earliest) };
  } catch (error) {
    log('coverage lookup failed; answering "could not check"', error);
    return { status: 'unavailable' };
  }
}

const inRange = (value: unknown, limit: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

/**
 * The postcode at the customer's location, for "Use my current location".
 * Null when there is none to give — no lookup, no postcode there, or a
 * failure — and the page then says it could not use the location. The
 * coordinates are used for this one lookup and kept nowhere.
 */
export async function locatePostcode(latitude: unknown, longitude: unknown): Promise<string | null> {
  if (!inRange(latitude, 90) || !inRange(longitude, 180)) return null;
  try {
    const client = await getAonikClient();
    const postcode = await client.coverage?.postcodeAt?.(latitude, longitude);
    return postcode ? normalisePostcode(postcode) : null;
  } catch (error) {
    log('location lookup failed', error);
    return null;
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const field = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

/**
 * Joins the notify-me list (contract §3c): the email AND the checked
 * postcode. Separate from the newsletter, always. Answers "joined" only once
 * the list has stored it; the page offers the form only where a list exists
 * (`AonikClient.notifyList`), so the no-list branch is a guard, not a path.
 */
export async function joinNotifyList(
  _previous: NotifyMeState,
  form: FormData,
): Promise<NotifyMeState> {
  const email = field(form, 'email');
  const entry = field(form, 'postcode');
  const postcode = entry.length > MAX_ENTRY ? null : normalisePostcode(entry);
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { status: 'error', message: 'Please enter a valid email address.' };
  }
  if (!postcode) return { status: 'error', message: 'Please check your postcode again first.' };

  try {
    const client = await getAonikClient();
    if (!client.notifyList) throw new Error('No notify-me list (michaeljosiah/aonik#357)');
    await client.notifyList.join({ email, postcode });
    return { status: 'joined' };
  } catch (error) {
    log('notify-me request not stored', error);
    return { status: 'error', message: 'We couldn’t save your email just now. Please try again.' };
  }
}

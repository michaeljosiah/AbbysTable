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
import { readConsentVersion } from '@/lib/aonik/signupLists';
import { isEmailAddress } from '@/lib/email';
import { CONSENT_VERSION_FIELD, SIGNUP_FORM_CHANGED, SIGNUP_TOO_MANY } from '@/lib/signup/consent';
import { admitSignup } from '@/lib/signup/rateLimit';
import { isSignupRefused } from '@/lib/signup/server';

import { upcomingDeliveryDate } from './checker';
import { normalisePostcode, readPostcodeEntry } from './postcode';

export type PostcodeCheck =
  | { status: 'serves'; postcode: string; earliestDeliveryDate: string | null }
  | { status: 'not-served'; postcode: string }
  /**
   * Not a postcode: malformed (the browser checks that first), or well formed
   * but nonexistent — which only the lookup can tell.
   */
  | { status: 'invalid' }
  /** Could not check: a technical failure, answered with a retry. */
  | { status: 'unavailable' };

/** Longer than any postcode with generous spacing; anything past it is not one. */
const MAX_ENTRY = 32;

const log = (message: string, error?: unknown) => {
  console.error(`[delivery] ${message}`, error ?? '');
};

/** How long a served answer waits for the optional date line. */
const WINDOW_WAIT_MS = 1500;

/**
 * The tenant-wide earliest delivery, when the lookup named none. Optional, so
 * a slow read is cut off rather than holding up "we deliver".
 */
async function earliestFromWindow(client: AonikClient): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      log('delivery window too slow; the result shows no date');
      resolve(null);
    }, WINDOW_WAIT_MS);
  });
  const read = client.getDeliveryWindow().then(
    (window) => window?.earliestDeliveryDate ?? null,
    (error: unknown) => {
      log('delivery window unavailable; the result shows no date', error);
      return null;
    },
  );
  try {
    return await Promise.race([read, late]);
  } finally {
    clearTimeout(timer);
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
    // Well formed, but the lookup found no such postcode: said as any invalid one.
    if (answer.status === 'invalid') return { status: 'invalid' };
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

const field = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

/**
 * Joins the notify-me list (contract §3c): the email AND the checked
 * postcode, with the consent version the form showed, to Aonik's
 * `delivery-availability` sign-up list (aonik#357). Separate from the
 * newsletter, always. Answers "joined" only after Aonik's 202; the page offers
 * the form only where the list is published, so the no-list branch is a
 * guard, not a path. A 422 is the list changing under the page (the fields
 * were checked here first) and asks for a reload, never a retry.
 */
export async function joinNotifyList(
  _previous: NotifyMeState,
  form: FormData,
): Promise<NotifyMeState> {
  const email = field(form, 'email');
  const entry = field(form, 'postcode');
  const postcode = entry.length > MAX_ENTRY ? null : normalisePostcode(entry);
  if (!isEmailAddress(email)) {
    return { status: 'error', message: 'Please enter a valid email address.' };
  }
  if (!postcode) return { status: 'error', message: 'Please check your postcode again first.' };
  const consentVersion = readConsentVersion(form.get(CONSENT_VERSION_FIELD));
  if (!consentVersion) return { status: 'error', message: SIGNUP_FORM_CHANGED };
  if (!(await admitSignup('delivery-availability'))) return { status: 'error', message: SIGNUP_TOO_MANY };

  try {
    const client = await getAonikClient();
    if (!client.signupLists) throw new Error('No sign-up lists in this data mode (michaeljosiah/aonik#357)');
    await client.signupLists.join('delivery-availability', { email, consentVersion, postcode });
    return { status: 'joined' };
  } catch (error) {
    if (isSignupRefused(error)) {
      console.warn('[delivery] notify-me request refused: the list changed since the page was rendered');
      return { status: 'error', message: SIGNUP_FORM_CHANGED };
    }
    log('notify-me request not stored', error);
    return { status: 'error', message: 'We couldn’t save your email just now. Please try again.' };
  }
}

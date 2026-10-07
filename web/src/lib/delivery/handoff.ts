/**
 * The checked postcode, handed from Delivery & FAQs to the box builder —
 * React-free (tests/delivery-faqs.test.tsx).
 *
 * The prototype carried it in the query string; production carries it in the
 * session instead (frontend-backend-contract §3b), for the reason the gift
 * message travels the same way (design/CLAUDE.md, "The personal message
 * carries from Gifting"): a query string lands in browser history, server
 * logs and any link the customer copies, and a postcode is part of an
 * address.
 *
 * sessionStorage, one tab's session — key `at-checked-postcode-v1`, holding
 * the last postcode this tab's checker confirmed we deliver to:
 *   - written when the coverage lookup answers "serves", and again when the
 *     customer follows that panel's BUILD A BOX;
 *   - removed when a later check answers "not served": the customer's last
 *     answer was a refusal, so the box builder is not handed an earlier
 *     postcode they may have checked for someone else.
 * It is a CONVENIENCE, not a record of the order (design/CLAUDE.md,
 * "Server-side basket"): the box builder must still check coverage itself
 * and never treat the stored answer as current. If storage is unavailable
 * nothing is carried and the customer types it again — the right failure.
 *
 * Choose Box v2 (#28) reads it: on mount, `readCheckedPostcode(sessionStorage)`
 * — only into an EMPTY delivery-checker field, never over something typed —
 * then runs its own coverage check on it.
 */

import { normalisePostcode } from './postcode';

export const CHECKED_POSTCODE_KEY = 'at-checked-postcode-v1';

/** A checked postcode older than this is not carried. */
export const CHECKED_POSTCODE_TTL_MS = 24 * 60 * 60 * 1000;

export interface CheckedPostcodeRecord {
  v: 1;
  /** Written at, epoch ms. */
  t: number;
  /** Normalised ("DA1 2AB"). */
  postcode: string;
}

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>;

/** The stored postcode, or null when the record is absent, stale or not ours. */
export function parseCheckedPostcode(raw: string | null, now: number): string | null {
  if (!raw) return null;
  let record: unknown;
  try {
    record = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!record || typeof record !== 'object') return null;
  const { v, t, postcode } = record as Partial<CheckedPostcodeRecord>;
  if (v !== 1 || typeof t !== 'number' || typeof postcode !== 'string') return null;
  // From the future (a clock change) or past its life: not carried.
  if (t > now || now - t > CHECKED_POSTCODE_TTL_MS) return null;
  // Only a postcode exactly as we write one — never whatever else is there.
  return normalisePostcode(postcode) === postcode ? postcode : null;
}

/** Reads the hand-off. Never throws: unreadable storage is no postcode. */
export function readCheckedPostcode(
  storage: ReadableStorage | null | undefined,
  now = Date.now(),
): string | null {
  try {
    return storage ? parseCheckedPostcode(storage.getItem(CHECKED_POSTCODE_KEY), now) : null;
  } catch {
    return null;
  }
}

/** Writes the hand-off. Never throws; false when it could not be stored. */
export function writeCheckedPostcode(
  storage: WritableStorage | null | undefined,
  postcode: string,
  now = Date.now(),
): boolean {
  const normalised = normalisePostcode(postcode);
  if (!storage || !normalised) return false;
  const record: CheckedPostcodeRecord = { v: 1, t: now, postcode: normalised };
  try {
    storage.setItem(CHECKED_POSTCODE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** Removes the hand-off. Never throws. */
export function clearCheckedPostcode(storage: WritableStorage | null | undefined): void {
  try {
    storage?.removeItem(CHECKED_POSTCODE_KEY);
  } catch {
    // Unavailable storage holds nothing to clear.
  }
}

/** This tab's sessionStorage, or null where reading the accessor throws. */
export function sessionStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

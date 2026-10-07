/**
 * UK postcode validation and normalisation for the Delivery & FAQs checker —
 * deliberately free of React and the DOM (tests/delivery-faqs.test.tsx).
 *
 * Shared by the browser (the correction shown beside the field, before any
 * request) and the server action (which must validate again: it is a public
 * endpoint). Choose Box's own checker (#28) should use it too, so the two
 * pages can never disagree about what a postcode is.
 *
 * A FORMAT check only. It cannot tell a real postcode from a well-formed
 * invented one — that is the coverage lookup's job (frontend-backend-contract
 * §3b), which is also why "we couldn't check" exists as its own outcome.
 */

/**
 * Deliberately permissive (design/CLAUDE.md, "Postcode validation is
 * deliberately permissive"): real UK grammar has enough exceptions that a
 * strict pattern turns away valid addresses, which is the worse failure.
 * `GIR 0AA` (Girobank, Bootle) is a live postcode the standard pattern cannot
 * express, so it is matched explicitly — do not "tidy" it out.
 */
const POSTCODE_PATTERN = /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2})$/;

/**
 * The correction shown beside the field — never a result panel: an empty or
 * malformed entry is something to fix in place, not an outcome to announce.
 * Verbatim from design/Abby's Table - Delivery and FAQs.dc.html (`MSG`).
 */
export const POSTCODE_MESSAGES = {
  empty: 'Enter your postcode to check delivery.',
  invalid: 'Please enter a valid UK postcode.',
  /** Location refused, unavailable, timed out, or not placeable at a postcode. */
  location: 'We couldn’t access your location. Enter your postcode instead.',
} as const;

export type PostcodeMessage = keyof typeof POSTCODE_MESSAGES;

/**
 * The postcode as we echo it back: upper case, one space before the inward
 * code ("da12ab" -> "DA1 2AB"). Case and spacing are formatting we can fix,
 * so neither is ever an error. Anything else that is not a letter or digit is
 * not ours to guess at, so "DA1-2AB" stays invalid. Null when it is not a
 * postcode.
 */
export function normalisePostcode(raw: string | null | undefined): string | null {
  const compact = String(raw ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();
  if (compact.length < 5 || compact.length > 7) return null;
  const spaced = `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  return POSTCODE_PATTERN.test(spaced) ? spaced : null;
}

export type PostcodeEntry =
  | { ok: true; postcode: string }
  | { ok: false; reason: Extract<PostcodeMessage, 'empty' | 'invalid'> };

/** What the field holds: nothing, not a postcode, or a normalised postcode. */
export function readPostcodeEntry(raw: string | null | undefined): PostcodeEntry {
  if (!String(raw ?? '').trim()) return { ok: false, reason: 'empty' };
  const postcode = normalisePostcode(raw);
  return postcode ? { ok: true, postcode } : { ok: false, reason: 'invalid' };
}

/** The postcode AREA — its leading letters ("DA1 2AB" -> "DA", "W1A 1AA" -> "W"). */
export function postcodeArea(postcode: string): string {
  return /^[A-Z]{1,2}/.exec(postcode.toUpperCase())?.[0] ?? '';
}

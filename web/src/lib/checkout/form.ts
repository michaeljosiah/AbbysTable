/**
 * Checkout's form rules, React-free (`tests/checkout.test.tsx`): the fields,
 * their validation and copy (design: Checkout v2, verbatim), what blocks
 * payment — ONE function, `checkoutBlockers`, read by the rail, the sheet and
 * CONTINUE alike (the prototype's `ckBadOf`) — and how the form maps to the
 * draft Aonik stores on the cart (aonik#347).
 *
 * Nothing here decides whether we deliver: eligibility is the coverage
 * lookup's answer, passed in. A postcode the lookup has not judged blocks
 * payment as surely as one it refused.
 */

import type { CheckoutContactDto, CheckoutDraftDto, DeliveryAddressDto } from '@/lib/aonik/dto';
import { normalisePostcode } from '@/lib/delivery/postcode';

export type DetailField =
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'line1'
  | 'line2'
  | 'city'
  | 'postcode'
  | 'phone'
  | 'notes';

export type CheckoutDetails = Record<DetailField, string>;

export const DETAIL_FIELDS: readonly DetailField[] = [
  'email',
  'firstName',
  'lastName',
  'line1',
  'line2',
  'city',
  'postcode',
  'phone',
  'notes',
];

export const EMPTY_DETAILS: CheckoutDetails = {
  email: '',
  firstName: '',
  lastName: '',
  line1: '',
  line2: '',
  city: '',
  postcode: '',
  phone: '',
  notes: '',
};

/** Each field's element id: what an error describes and what a blocker focuses. */
export const FIELD_IDS: Record<DetailField, string> = {
  email: 'ck-email',
  firstName: 'ck-first',
  lastName: 'ck-last',
  line1: 'ck-line1',
  line2: 'ck-line2',
  city: 'ck-town',
  postcode: 'ck-postcode',
  phone: 'ck-phone',
  notes: 'ck-notes',
};

/**
 * Typed-length limits: Aonik's storage bounds (order-delivery-details), except
 * the notes, which the design caps at 250 with a counter (Aonik allows 1,000).
 */
export const FIELD_LIMITS: Record<DetailField, number> = {
  email: 254,
  firstName: 100,
  lastName: 100,
  line1: 200,
  line2: 200,
  city: 100,
  // "SW1A 1AA" is 8; room for a stray space while typing.
  postcode: 10,
  phone: 32,
  notes: 250,
};

/** The design's patterns. Deliberately permissive: a valid address turned away is the worse failure. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const POSTCODE = /^(GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i;
/** Human phone formatting: digits, spaces, +, brackets, dots and dashes. */
const PHONE_CHARACTERS = /^[\d\s+().-]*$/;

/** Aonik accepts 6–17 digits; the design asks for at least 10. */
export const PHONE_MIN_DIGITS = 10;
export const PHONE_MAX_DIGITS = 17;

export const FIELD_MESSAGES = {
  emailEmpty: 'Enter your email address',
  emailBad: 'Enter an email address like name@example.com',
  firstName: 'Enter your first name',
  lastName: 'Enter your last name',
  line1: 'Enter the first line of your address',
  city: 'Enter your town or city',
  postcodeEmpty: 'Enter your postcode',
  postcodeBad: 'Enter a full UK postcode, like SE1 7PB',
  /** Well formed, but the lookup found no such postcode (SHOPPING-STATE §15). */
  postcodeUnknown: 'Check your postcode and try again.',
  phoneEmpty: 'Enter a phone number',
  phoneShort: 'Enter a phone number with at least 10 digits',
  // Not designed: past Aonik's 17 digits, or characters no phone number has.
  phoneLong: 'Enter a phone number with no more than 17 digits',
  phoneCharacters: 'Enter a phone number using numbers only',
} as const;

/** A field's own error — its format, nothing it depends on — or null. */
export function fieldError(field: DetailField, raw: string): string | null {
  const value = raw.trim();
  switch (field) {
    case 'email':
      if (!value) return FIELD_MESSAGES.emailEmpty;
      return EMAIL.test(value) && value.length <= FIELD_LIMITS.email ? null : FIELD_MESSAGES.emailBad;
    case 'firstName':
      return value ? null : FIELD_MESSAGES.firstName;
    case 'lastName':
      return value ? null : FIELD_MESSAGES.lastName;
    case 'line1':
      return value ? null : FIELD_MESSAGES.line1;
    case 'city':
      return value ? null : FIELD_MESSAGES.city;
    case 'postcode':
      if (!value) return FIELD_MESSAGES.postcodeEmpty;
      return POSTCODE.test(value) ? null : FIELD_MESSAGES.postcodeBad;
    case 'phone': {
      if (!value) return FIELD_MESSAGES.phoneEmpty;
      if (!PHONE_CHARACTERS.test(value)) return FIELD_MESSAGES.phoneCharacters;
      const digits = value.replace(/\D/g, '').length;
      if (digits < PHONE_MIN_DIGITS) return FIELD_MESSAGES.phoneShort;
      return digits > PHONE_MAX_DIGITS ? FIELD_MESSAGES.phoneLong : null;
    }
    // Optional, and bounded by the field itself.
    case 'line2':
    case 'notes':
      return null;
  }
}

/**
 * The postcode as typed: upper case at once, and the space put in only when
 * the inward code is complete — so the caret is never moved mid-word. Case
 * and spacing are formatting we fix, never an error.
 */
export function formatPostcodeInput(raw: string): string {
  const upper = raw.toUpperCase().replace(/\s{2,}/g, ' ').replace(/^\s+/, '');
  return normalisePostcode(upper) ?? upper;
}

/** .NET's `char.IsControl`: C0, DEL and C1. */
const isControl = (code: number) => code <= 0x1f || (code >= 0x7f && code <= 0x9f);

/**
 * A field as typed or pasted, minus what Aonik would refuse the whole save
 * for: a control character becomes a space (a pasted tab, a stray escape).
 * Line breaks stay in the delivery notes, the one field that allows them.
 */
export function cleanInput(field: DetailField, raw: string): string {
  let out = '';
  for (const char of raw) {
    const keep = !isControl(char.charCodeAt(0)) || (field === 'notes' && (char === '\n' || char === '\r'));
    out += keep ? char : ' ';
  }
  return out;
}

/* ---- Eligibility ------------------------------------------------------------ */

/**
 * What the coverage lookup said about a postcode. `invalid` is a postcode the
 * lookup found does not exist; `unavailable` is "could not check", answered
 * with a retry and never treated as a refusal.
 */
export type CoverageState =
  | { status: 'idle' }
  | { status: 'checking' | 'serves' | 'not-served' | 'invalid' | 'unavailable'; postcode: string };

/** The coverage answer for the postcode in the field now, or idle: an answer about another postcode is none. */
export function coverageFor(details: CheckoutDetails, coverage: CoverageState): CoverageState {
  if (coverage.status === 'idle') return coverage;
  const postcode = normalisePostcode(details.postcode);
  return postcode && postcode === coverage.postcode ? coverage : { status: 'idle' };
}

/**
 * The postcode field's error: its format, then whether such a postcode
 * exists. A REFUSAL is not stated here — the eligibility line says it, and
 * the field takes only the error border (design: "two ways to say the same
 * thing is a bug").
 */
export function postcodeError(details: CheckoutDetails, coverage: CoverageState): string | null {
  return (
    fieldError('postcode', details.postcode) ??
    (coverageFor(details, coverage).status === 'invalid' ? FIELD_MESSAGES.postcodeUnknown : null)
  );
}

/* ---- What blocks payment ------------------------------------------------------ */

export type Blocker =
  | { kind: 'field'; field: DetailField }
  /** A well-formed postcode the lookup has not confirmed we serve. */
  | { kind: 'eligibility' }
  /** No delivery date chosen. */
  | { kind: 'date' }
  /** The date's reservation has ended: it must be chosen again. */
  | { kind: 'hold' }
  /** Aonik cannot confirm any delivery availability (SHOPPING-STATE §22). */
  | { kind: 'availability' }
  /** The saved code no longer applies: checkout would refuse it. */
  | { kind: 'code' };

export type HoldState = 'none' | 'held' | 'ended';

export interface CheckoutGate {
  details: CheckoutDetails;
  coverage: CoverageState;
  /** The chosen date, or null. */
  date: string | null;
  hold: HoldState;
  /** Whether Aonik could say what is available (a suggestion or a calendar). */
  availabilityKnown: boolean;
  /** A saved code Aonik says no longer applies. */
  codeRefused: boolean;
}

/**
 * Everything standing between the customer and payment, in PAGE order — the
 * first is where CONTINUE takes them. One function, so the rail, the sheet,
 * the bar and the button can never disagree.
 */
export function checkoutBlockers(gate: CheckoutGate): Blocker[] {
  const blockers: Blocker[] = [];
  const field = (name: DetailField) => {
    if (fieldError(name, gate.details[name])) blockers.push({ kind: 'field', field: name });
  };
  field('email');
  field('firstName');
  field('lastName');
  field('line1');
  field('city');
  if (postcodeError(gate.details, gate.coverage)) {
    blockers.push({ kind: 'field', field: 'postcode' });
  } else if (coverageFor(gate.details, gate.coverage).status !== 'serves') {
    blockers.push({ kind: 'eligibility' });
  }
  field('phone');
  if (!gate.date) blockers.push({ kind: gate.availabilityKnown ? 'date' : 'availability' });
  else if (gate.hold === 'ended') blockers.push({ kind: 'hold' });
  if (gate.codeRefused) blockers.push({ kind: 'code' });
  return blockers;
}

/**
 * The line beside the CTA once CONTINUE has been tried (design copy): the date
 * on its own is named, anything else is counted.
 */
export function needText(blockers: Blocker[]): string | null {
  if (blockers.length === 0) return null;
  if (blockers.length === 1 && blockers[0].kind === 'date') return 'Choose a delivery date to continue.';
  if (blockers.length === 1 && blockers[0].kind === 'hold') return 'Choose a new delivery date to continue.';
  return blockers.length === 1 ? 'Complete 1 detail to continue.' : `Complete ${blockers.length} details to continue.`;
}

/** Where a blocker sends focus: the field, or the control that resolves it. */
export function blockerTarget(blocker: Blocker, options: { hasSuggestion: boolean }): string {
  switch (blocker.kind) {
    case 'field':
      return FIELD_IDS[blocker.field];
    case 'eligibility':
      return FIELD_IDS.postcode;
    case 'date':
      return options.hasSuggestion ? 'ck-use-date' : 'ck-another';
    case 'hold':
      return 'ck-hold-new';
    case 'availability':
      return 'ck-dates-retry';
    case 'code':
      return 'ck-code-remove';
  }
}

/* ---- The draft -------------------------------------------------------------- */

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/** The form as the saved draft describes it; nothing saved is an empty form. */
export function detailsFromDraft(draft: CheckoutDraftDto | null | undefined): CheckoutDetails {
  return {
    email: text(draft?.purchaser?.email),
    firstName: draft?.gift?.giftIntent && draft.recipient ? text(draft.recipient.name).split(' ')[0] : text(draft?.purchaser?.firstName),
    lastName: draft?.gift?.giftIntent && draft.recipient ? text(draft.recipient.name).split(' ').slice(1).join(' ') : text(draft?.purchaser?.lastName),
    line1: text(draft?.address?.line1),
    line2: text(draft?.address?.line2),
    city: text(draft?.address?.city),
    postcode: text(draft?.address?.postcode),
    phone: draft?.gift?.giftIntent ? text(draft.recipient?.phone) : text(draft?.purchaser?.phone),
    notes: text(draft?.notes),
  };
}

export interface DraftSections {
  purchaser: CheckoutContactDto | null;
  address: DeliveryAddressDto | null;
  notes: string | null;
}

/**
 * The sections of the draft this form owns. Incomplete is fine — Aonik keeps
 * what is typed and checkout validates completeness — but an untouched
 * section is null, not a section of blanks. Delivery is UK-only (`GB`, no
 * country field); the postcode goes normalised when it is one.
 */
export function draftSections(details: CheckoutDetails): DraftSections {
  const trimmed = Object.fromEntries(
    DETAIL_FIELDS.map((field) => [field, details[field].trim()]),
  ) as CheckoutDetails;
  const purchaser =
    trimmed.email || trimmed.firstName || trimmed.lastName || trimmed.phone
      ? { email: trimmed.email, firstName: trimmed.firstName, lastName: trimmed.lastName, phone: trimmed.phone }
      : null;
  const address =
    trimmed.line1 || trimmed.line2 || trimmed.city || trimmed.postcode
      ? {
          line1: trimmed.line1,
          line2: trimmed.line2 || null,
          city: trimmed.city,
          region: null,
          postcode: normalisePostcode(trimmed.postcode) ?? trimmed.postcode,
          countryCode: 'GB',
        }
      : null;
  return { purchaser, address, notes: trimmed.notes || null };
}

/**
 * Another tab saved the draft first (409): keep this tab's edit only where the
 * server still holds what this tab last saw, and take the other tab's value
 * wherever it moved — never a silent overwrite, never a replay.
 */
export function mergeDetails(base: CheckoutDetails, local: CheckoutDetails, server: CheckoutDetails): CheckoutDetails {
  return Object.fromEntries(
    DETAIL_FIELDS.map((field) => [field, server[field] === base[field] ? local[field] : server[field]]),
  ) as CheckoutDetails;
}

/** Whether two forms say the same thing, compared as they would be saved. */
export function sameDetails(left: CheckoutDetails, right: CheckoutDetails): boolean {
  return JSON.stringify(draftSections(left)) === JSON.stringify(draftSections(right));
}

/**
 * The Private Table waitlist form's rules — fields, caps, validation and the
 * action's outcome contract — free of React and the DOM, so the browser and
 * the server action run the SAME checks and both are unit-tested
 * (tests/private-table.test.tsx).
 *
 * Sources: design/Abby's Table - Private Table v2.dc.html (fields, copy and
 * messages, verbatim), behaviour guide §8 (a WAITLIST, not a booking). The
 * browser's checks are a courtesy; the server action checks everything again,
 * and the waitlist endpoint (michaeljosiah/aonik#357) must too.
 */

import { isWaitlistService, type WaitlistServiceId } from '@/lib/content/privateTable';
import { isEmailAddress, MAX_EMAIL_LENGTH } from '@/lib/email';

import { MAX_COUNTRY_TEXT, resolveCountry } from './country';

/* ---- The fields --------------------------------------------------------------------- */

/** What the customer has entered, as entered. */
export interface WaitlistDraft {
  name: string;
  email: string;
  phone: string;
  /** The country or region as typed or picked — resolved against the fixed list. */
  country: string;
  /** A `WAITLIST_SERVICES` id, or empty. */
  service: string;
}

export const EMPTY_WAITLIST: WaitlistDraft = {
  name: '',
  email: '',
  phone: '',
  country: '',
  service: '',
};

/** In FIELD ORDER — the order focus takes when a submit fails. */
export const WAITLIST_FIELDS = ['name', 'email', 'phone', 'country', 'service'] as const;

export type WaitlistField = (typeof WAITLIST_FIELDS)[number];

export type WaitlistErrors = Partial<Record<WaitlistField, string>>;

/**
 * The longest each field may be — the input's `maxLength` and the action's
 * own check, so a crafted post cannot hand the server an unbounded string.
 * Characters (code points), which a UTF-16 `maxLength` can never exceed.
 */
export const WAITLIST_LIMITS = {
  name: 200,
  email: MAX_EMAIL_LENGTH,
  /** Room for "+44 (0) 7700 900000 ext 1234"; no real number is longer. */
  phone: 32,
  country: MAX_COUNTRY_TEXT,
} as const;

/** A telephone number holds at least this many digits… */
const PHONE_MIN_DIGITS = 6;
/** …and no more than this: E.164's 15, plus a written trunk "(0)" and slack. */
const PHONE_MAX_DIGITS = 17;

/**
 * The design's messages, verbatim — and, marked, the ones it has no message
 * for: an over-long name (only a crafted post gets past the field's
 * `maxLength`), a telephone number that is not one, and a country typed but
 * not on the list (the design accepts any text; this list is fixed).
 */
export const WAITLIST_MESSAGES = {
  name: 'Enter your name so we know who we’re replying to.',
  emailMissing: 'Enter your email address so we can reply.',
  emailInvalid: 'That email address does not look right — check for a typo.',
  country: 'Tell us where you are, so we know which service can reach you.',
  service: 'Choose which service you’re interested in, or “Not sure yet”.',
  /** Not in the design. */
  nameLong: `Please shorten your name to ${WAITLIST_LIMITS.name} characters or fewer.`,
  /** Not in the design: the field is optional, but what is given must be a number. */
  phoneInvalid: 'Enter a telephone number, or leave this blank.',
  /** Not in the design: typed, but not a country or region on our list. */
  countryUnknown: 'Choose your country or region from the list.',
} as const;

/** The design's note while a query matches nothing — shown under the field, not an error. */
export const COUNTRY_NO_MATCHES = 'No matches for that. Type the country name in full and we’ll pick it up.';

/**
 * Characters, not UTF-16 units — counted only as far as `stopAt`, so a huge
 * string costs no more than a short one.
 */
function charactersUpTo(text: string, stopAt: number): number {
  const codePoints = text[Symbol.iterator]();
  let count = 0;
  while (count < stopAt && !codePoints.next().done) count += 1;
  return count;
}

/**
 * Permissive, as the design's own pattern is (`…@….xx`): stricter checks
 * reject real addresses. Linear in the input (`isEmailAddress`), with at least
 * two characters after the last dot, as the design asks.
 */
function isWaitlistEmail(email: string): boolean {
  return isEmailAddress(email) && email.length - email.lastIndexOf('.') - 1 >= 2;
}

const PHONE_CHARACTERS = /^\+?[0-9 ().-]+$/;

/**
 * A telephone number as people write them: digits with spaces, brackets,
 * dots or dashes, and an optional leading "+". Six to seventeen digits.
 * Checked only when given — the field is optional.
 */
export function isTelephoneNumber(phone: string): boolean {
  if (phone.length > WAITLIST_LIMITS.phone || !PHONE_CHARACTERS.test(phone)) return false;
  let digits = 0;
  for (const character of phone) if (character >= '0' && character <= '9') digits += 1;
  return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

/** Every problem with the draft, keyed by field. Empty when it can be sent. */
export function validateWaitlist(draft: WaitlistDraft): WaitlistErrors {
  const errors: WaitlistErrors = {};
  const name = draft.name.trim();
  const email = draft.email.trim();
  const phone = draft.phone.trim();
  const country = draft.country.trim();

  if (!name) errors.name = WAITLIST_MESSAGES.name;
  else if (charactersUpTo(name, WAITLIST_LIMITS.name + 1) > WAITLIST_LIMITS.name) {
    errors.name = WAITLIST_MESSAGES.nameLong;
  }
  if (!email) errors.email = WAITLIST_MESSAGES.emailMissing;
  else if (!isWaitlistEmail(email)) errors.email = WAITLIST_MESSAGES.emailInvalid;
  if (phone && !isTelephoneNumber(phone)) errors.phone = WAITLIST_MESSAGES.phoneInvalid;
  if (!country) errors.country = WAITLIST_MESSAGES.country;
  else if (!resolveCountry(country)) errors.country = WAITLIST_MESSAGES.countryUnknown;
  if (!isWaitlistService(draft.service)) errors.service = WAITLIST_MESSAGES.service;

  return errors;
}

/** The field focus moves to after a failed submit, or null when none failed. */
export function firstInvalidField(errors: WaitlistErrors): WaitlistField | null {
  return WAITLIST_FIELDS.find((field) => errors[field]) ?? null;
}

/**
 * A waitlist entry ready to store: trimmed, the country as its code on the
 * fixed list, the service as its id, the telephone number only when given.
 */
export interface WaitlistEntry {
  name: string;
  email: string;
  phone: string | null;
  /** ISO 3166-1 alpha-2 (`@/lib/content/countries`). */
  country: string;
  service: WaitlistServiceId;
}

/** The draft as it is stored, or the errors that stop it. */
export function toWaitlistEntry(
  draft: WaitlistDraft,
): { entry: WaitlistEntry } | { errors: WaitlistErrors } {
  const errors = validateWaitlist(draft);
  const country = resolveCountry(draft.country.trim());
  if (firstInvalidField(errors) || !country || !isWaitlistService(draft.service)) return { errors };
  return {
    entry: {
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim() || null,
      country: country.code,
      service: draft.service,
    },
  };
}

/* ---- The action's outcome ------------------------------------------------------------ */

/**
 * What the join action reports. It RETURNS its outcome rather than throwing
 * (a thrown error reaches the browser as an opaque digest), and the form says
 * "you're on the waitlist" ONLY for `status: 'joined'` — which the action
 * returns only once the waitlist has stored the entry (a 2xx). An action that
 * swallows a failure cannot type-check its way into a false confirmation.
 *
 * - `invalid`     the fields failed the shared rules (`errors`)
 * - `joined`      stored
 * - `error`       the waitlist failed; everything entered stays in the form
 * - `unavailable` this deployment cannot store an entry at all (aonik#357)
 */
export interface WaitlistState {
  status: 'idle' | 'invalid' | 'joined' | 'error' | 'unavailable';
  errors?: WaitlistErrors;
  /**
   * What was posted, on every answer but `joined` — so a submit made without
   * JavaScript (a full page round trip) comes back with its fields filled,
   * as the failure line promises. Clipped to the field caps.
   */
  values?: WaitlistDraft;
}

/** The posted draft as it may be handed back: each field clipped to its cap. */
export function returnedDraft(draft: WaitlistDraft): WaitlistDraft {
  return {
    name: draft.name.slice(0, WAITLIST_LIMITS.name),
    email: draft.email.slice(0, WAITLIST_LIMITS.email),
    phone: draft.phone.slice(0, WAITLIST_LIMITS.phone),
    country: draft.country.slice(0, WAITLIST_LIMITS.country),
    service: isWaitlistService(draft.service) ? draft.service : '',
  };
}

export type WaitlistAction = (previous: WaitlistState, formData: FormData) => Promise<WaitlistState>;

/** The form's field names, shared by the form and the action. */
export const WAITLIST_FORM_FIELDS = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  country: 'country',
  service: 'service',
} as const;

/** Reads a posted form back into a draft. Missing or non-text values are empty. */
export function draftFromForm(form: FormData): WaitlistDraft {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === 'string' ? value : '';
  };
  return {
    name: text(WAITLIST_FORM_FIELDS.name),
    email: text(WAITLIST_FORM_FIELDS.email),
    phone: text(WAITLIST_FORM_FIELDS.phone),
    country: text(WAITLIST_FORM_FIELDS.country),
    service: text(WAITLIST_FORM_FIELDS.service),
  };
}

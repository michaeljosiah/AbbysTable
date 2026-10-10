/**
 * Aonik's sign-up lists (michaeljosiah/aonik#357): the footer newsletter, the
 * Delivery & FAQs notify-me and the Private Table waitlist.
 *
 * Three SEPARATE lists, by design and by consent: each form's wording promises
 * one use of the details ("kitchen notes and offers", "only to tell you when we
 * reach your area", "only to contact you about Private Table"), so an entry is
 * never copied from one list to another (contract §3c).
 *
 * The tenant publishes each list with its consent WORDING and a VERSION
 * (`SignupLists.Configuration`). A form shows only a published list, shows its
 * wording exactly, and posts back the version it showed — Aonik records that
 * version as the consent given, and refuses (422) a version that has since
 * changed, so nobody is ever signed up to wording they never saw. A list the
 * tenant has not published offers no form at all (#6's rule: never a control
 * that cannot work).
 *
 * Demo mode has none (`AonikClient.signupLists` is null): it serves fixture
 * reads but never pretends a write succeeded, and a production deployment with
 * no Aonik configured runs on demo data.
 *
 * SERVER-ONLY.
 */

import type { AonikConfig } from './dataMode';
import { aonikFetch } from './http';

export const SIGNUP_LIST_TYPES = ['newsletter', 'delivery-availability', 'private-table'] as const;

export type SignupListType = (typeof SIGNUP_LIST_TYPES)[number];

export interface SignupListService {
  id: string;
  label: string;
}

/** One list as the tenant published it. */
export interface SignupList {
  listType: SignupListType;
  /** Posted back with the sign-up; Aonik refuses one that has changed. */
  consentVersion: string;
  /** The wording the form shows — exactly, since it is what is recorded. */
  consentText: string;
  /** Private Table's service choices; null on the other lists. */
  services: SignupListService[] | null;
}

/** Aonik's caps on a published definition: the version is up to 32 characters. */
export const MAX_CONSENT_VERSION = 32;
const MAX_CONSENT_TEXT = 1000;

export interface SignupLists {
  /** Every list the tenant has published, read fresh (Aonik answers no-store). */
  published(): Promise<SignupList[]>;
  /**
   * Stores one sign-up. Resolves on Aonik's 202 — a new entry and an email
   * already on the list look the same, so a repeat is never an error. Throws
   * otherwise: an `AonikError` (422 when the list was unpublished or its
   * consent version moved on), or the network's own error.
   */
  join(listType: SignupListType, body: Record<string, string>): Promise<void>;
}

export const SIGNUP_LISTS_PATH = '/v1/signup-lists';

/** Aonik's own bound on a published value: non-blank, trimmed, within `max`. */
const isString = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max && value === value.trim();

/**
 * The published lists out of Aonik's `{ lists: [...] }`, keeping only entries
 * that are whole: a known list type, a version, wording, and — for Private
 * Table — well-formed services. Anything else is dropped rather than shown
 * half-formed: a form with no consent wording must not render.
 */
export function readPublishedLists(body: unknown): SignupList[] {
  const lists = (body as { lists?: unknown } | null)?.lists;
  if (!Array.isArray(lists)) return [];

  const seen = new Set<SignupListType>();
  const published: SignupList[] = [];
  for (const raw of lists) {
    const entry = raw as Record<string, unknown> | null;
    const listType = entry?.listType;
    if (!SIGNUP_LIST_TYPES.includes(listType as SignupListType)) continue;
    if (seen.has(listType as SignupListType)) continue;
    if (readConsentVersion(entry?.consentVersion) === null) continue;
    if (!isString(entry?.consentText, MAX_CONSENT_TEXT)) continue;

    let services: SignupListService[] | null = null;
    if (Array.isArray(entry?.services)) {
      services = (entry.services as unknown[]).flatMap((service) => {
        const value = service as Record<string, unknown> | null;
        return isString(value?.id, 64) && isString(value?.label, 100)
          ? [{ id: value.id, label: value.label }]
          : [];
      });
    }

    seen.add(listType as SignupListType);
    published.push({
      listType: listType as SignupListType,
      consentVersion: entry.consentVersion as string,
      consentText: entry.consentText as string,
      services,
    });
  }
  return published;
}

/** The published list of one type, or null. */
export function publishedList(lists: SignupList[], listType: SignupListType): SignupList | null {
  return lists.find((list) => list.listType === listType) ?? null;
}

/**
 * A consent version as a form posted it back: the shape Aonik publishes (1–32
 * characters, trimmed, no control characters), or null. Aonik is the one that
 * checks it is CURRENT; this only refuses what could never be.
 */
export function readConsentVersion(value: unknown): string | null {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_CONSENT_VERSION &&
    value === value.trim() &&
    !/\p{Cc}/u.test(value)
    ? value
    : null;
}

export class HttpSignupLists implements SignupLists {
  constructor(private readonly config: AonikConfig) {}

  async published(): Promise<SignupList[]> {
    const body = await aonikFetch<unknown>(SIGNUP_LISTS_PATH, {
      baseUrl: this.config.baseUrl,
      tenantId: this.config.tenantId,
      // Aonik answers no-store: a list unpublished a moment ago must not keep
      // offering a form from a cache.
      policy: 'volatile',
    });
    return readPublishedLists(body);
  }

  async join(listType: SignupListType, body: Record<string, string>): Promise<void> {
    await aonikFetch<void>(`${SIGNUP_LISTS_PATH}/${listType}`, {
      baseUrl: this.config.baseUrl,
      tenantId: this.config.tenantId,
      policy: 'volatile',
      method: 'POST',
      body,
      // The empty 202 is the whole answer. Never retried: Aonik de-duplicates
      // by email, but there is nothing a retry could add.
      ignoreBody: true,
    });
  }
}

/**
 * The tenant's published business profile (michaeljosiah/aonik#358,
 * `GET /v1/business-profile`): the contact routes, the legal facts and the
 * opening hours the Contact page, the legal pages and "Open now" show.
 *
 * Published facts only: Aonik publishes nothing until an administrator opts in
 * (404 until then), copies nothing from the tenant's administrative details,
 * and leaves every fact the tenant has not authored `null`. So does this — a
 * value that does not read cleanly is left out (and logged), never guessed:
 * a wrong telephone number or "Open now" is worse than "to be confirmed".
 *
 * Mapping into the storefront's own shapes:
 *  - phone and WhatsApp are free text in Aonik; a number written as people
 *    write them ("01632 960000", "+44 1632 960000", "+44 (0)1632 960000")
 *    becomes E.164 for the link and keeps its authored form for display. The
 *    phone must be a UK number — the page says "UK number" under it;
 *  - opening hours are ISO weekdays (Monday 1) with periods; ours are one
 *    window a day, Sunday first. Touching periods join; a day with a break
 *    between two periods cannot be shown in the design's table, so such hours
 *    are not shown (logged) rather than shown wrong. The timezone must be
 *    Europe/London — the indicator reads London's clock. Bank holidays and
 *    exceptional closures are both whole London days that close the line;
 *    only the first are bank holidays ("Closed on bank holidays"), so an
 *    exceptional closure becomes a closure from that day's start to the next.
 *
 * A fact the tenant PUBLISHED that does not read cleanly is `rejected`: the
 * pages show it "to be confirmed", never the configuration's value in its
 * place — that could be an old number, or hours that are no longer kept.
 *
 * Read without Next's data cache (it keeps a 200 and never lets a later 404
 * replace it, so a withdrawn profile would stay up), reused in this process
 * for a minute: a withdrawal shows within a minute, an unpublished tenant
 * costs one request a minute, and while Aonik cannot answer the last good
 * profile stands in for up to 15 minutes — a 404 is believed at once.
 */

import { AonikError } from './errors';
import type { ClockTime, Closure, DayHours, OpeningHours, WeeklyHours } from '@/lib/contact/hours';
import { UK_TIME_ZONE, hoursProblems, minutesOf, wholeDayClosure } from '@/lib/contact/hours';
import type { SupportContact } from '@/lib/content/contact';

import type { AonikConfig } from './dataMode';
import { aonikFetch } from './http';

export const BUSINESS_PROFILE_PATH = '/v1/business-profile';

/** How long a page waits for it before falling back to configuration. */
export const BUSINESS_PROFILE_TIMEOUT_MS = 1500;

/** How long one read is reused in this process. */
export const BUSINESS_PROFILE_MEMO_MS = 60_000;

/** How long the last good profile may stand in while Aonik cannot answer. */
export const BUSINESS_PROFILE_STALE_MS = 15 * 60_000;

/** The facts the pages show, by name. */
export type ProfileFact =
  | 'email'
  | 'phone'
  | 'whatsApp'
  | 'companyName'
  | 'companyNumber'
  | 'registeredOffice'
  | 'openingHours';

export interface BusinessProfile {
  contact: {
    email: string | null;
    phone: SupportContact['phone'] | null;
    /** E.164. */
    whatsApp: string | null;
  };
  legal: {
    companyName: string | null;
    companyNumber: string | null;
    /** One line per entry. */
    registeredOffice: string[] | null;
  };
  /** Null: unknown or unconfigured — no table, no "Open now". */
  openingHours: OpeningHours | null;
  /**
   * Facts the tenant published that did not read cleanly (each logged). Null
   * above, and shown "to be confirmed" — never replaced by configuration.
   */
  rejected: ReadonlySet<ProfileFact>;
}

type Log = (message: string) => void;

/** Records a published fact that did not read cleanly; always null. */
type Reject = (fact: ProfileFact, message: string) => null;

/** Unpublished: null or a blank string. */
const unset = (value: unknown) => value === null || value === undefined || (typeof value === 'string' && !value.trim());

/** Published text, trimmed — or rejected when it is not a string, too long or carries control characters. */
function readText(value: unknown, max: number, fact: ProfileFact, reject: Reject): string | null {
  if (unset(value)) return null;
  // Trimmed first, so a trailing newline from a text box is not a fault; no
  // control or invisible formatting character (a right-to-left override) after.
  const text = typeof value === 'string' ? value.trim() : null;
  if (text === null || text.length > max || /[\p{Cc}\p{Cf}]/u.test(text)) {
    return reject(fact, `${fact} does not read cleanly`);
  }
  return text;
}

/**
 * A telephone number as E.164, or null. Accepts the ways people write a UK
 * number (a leading 0, 44, +44 or 00 44; spaces, brackets, dots, dashes, a
 * "(0)", or the trunk 0 kept after the country code) and any number already in
 * international form. A UK number must have the 9 or 10 digits UK numbers have.
 */
export function toE164(raw: string): string | null {
  const compact = raw.replace(/\(0\)/g, '').replace(/[\s().-]/g, '');
  let e164: string;
  if (compact.startsWith('+')) e164 = compact;
  else if (compact.startsWith('00')) e164 = `+${compact.slice(2)}`;
  else if (compact.startsWith('44')) e164 = `+${compact}`;
  else if (compact.startsWith('0')) e164 = `+44${compact.slice(1)}`;
  else return null;
  // "+44 020 …": the trunk 0 is not dialled after the country code.
  if (e164.startsWith('+440')) e164 = `+44${e164.slice(4)}`;
  if (e164.startsWith('+44')) return /^\+44[1-9]\d{8,9}$/.test(e164) ? e164 : null;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

function readPhone(
  value: unknown,
  fact: 'phone' | 'whatsApp',
  reject: Reject,
  { ukOnly }: { ukOnly: boolean },
): SupportContact['phone'] | null {
  const display = readText(value, 40, fact, reject);
  if (!display) return null;
  const e164 = toE164(display);
  if (!e164) return reject(fact, `${fact} "${display}" is not a telephone number we can link`);
  if (ukOnly && !e164.startsWith('+44')) return reject(fact, `${fact} "${display}" is not a UK number, and the page says it is one`);
  return { display, e164 };
}

/**
 * An address a mailto: link can carry as it is: letters, digits and . _ + ' -
 * before one "@", a dotted domain after it — no "?", "#", "&" or "%" that
 * would add headers to the link, no scheme.
 */
const EMAIL =
  /^[A-Za-z0-9_+'-]+(?:\.[A-Za-z0-9_+'-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

function readEmail(value: unknown, reject: Reject): string | null {
  const email = readText(value, 254, 'email', reject);
  if (!email) return null;
  return EMAIL.test(email) ? email : reject('email', `email "${email}" is not an address we can link`);
}

/**
 * "HH:mm:ss" (or "HH:mm", with any fraction of a second) as our "HH:MM", or
 * null when it is not a whole minute. The last moment of the day, the only
 * way Aonik can say "until midnight" (it never sends a 00:00 close), is 23:59.
 */
function clock(value: unknown): ClockTime | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/.exec(value);
  if (!match) return null;
  const endOfDay = match[1] === '23' && match[2] === '59' && match[3] === '59';
  if (!endOfDay && ((match[3] !== undefined && match[3] !== '00') || /[1-9]/.test(match[4] ?? ''))) return null;
  const time = `${match[1]}:${match[2]}`;
  return Number.isNaN(minutesOf(time)) ? null : time;
}

function readHours(value: unknown, reject: Reject): OpeningHours | null {
  if (value === null || value === undefined) return null;
  const not = (why: string) => reject('openingHours', `opening hours ${why}, so they are not shown`);
  const hours = value as {
    timezone?: unknown;
    weeklyHours?: unknown;
    bankHolidays?: unknown;
    exceptionalClosures?: unknown;
  };
  if (hours.timezone !== UK_TIME_ZONE) return not(`are in "${String(hours.timezone)}" — the page reads London's clock`);
  if (
    !Array.isArray(hours.weeklyHours) ||
    !Array.isArray(hours.bankHolidays) ||
    !Array.isArray(hours.exceptionalClosures)
  ) {
    return not('are incomplete');
  }

  // ISO weekday (Monday 1 … Sunday 7) → ours (Sunday 0 … Saturday 6).
  const periods: DayHours[][] = [[], [], [], [], [], [], []];
  for (const raw of hours.weeklyHours as unknown[]) {
    const period = (raw ?? {}) as { dayOfWeek?: unknown; opensAt?: unknown; closesAt?: unknown };
    const opens = clock(period.opensAt);
    const closes = clock(period.closesAt);
    const iso = period.dayOfWeek;
    if (typeof iso !== 'number' || !Number.isInteger(iso) || iso < 1 || iso > 7 || !opens || !closes) {
      return not('have a period that does not read cleanly');
    }
    periods[iso % 7].push({ opens, closes });
  }

  // Touching periods (09:00–12:00, 12:00–17:00) are one window; a break
  // between two is a day the table cannot show.
  const weekly: Array<DayHours | null> = [];
  for (const day of periods) {
    day.sort((a, b) => minutesOf(a.opens) - minutesOf(b.opens));
    let window: DayHours | null = null;
    for (const period of day) {
      if (!window) window = { ...period };
      else if (period.opens === window.closes) window = { opens: window.opens, closes: period.closes };
      else return not('have a break inside a day, which the hours table cannot show');
    }
    weekly.push(window);
  }

  const bankHolidays = hours.bankHolidays as unknown[];
  const closureDates = hours.exceptionalClosures as unknown[];
  if (![...bankHolidays, ...closureDates].every((date) => typeof date === 'string')) {
    return not('have a closure date that does not read cleanly');
  }
  // An exceptional closure is a whole London day, as an absolute closure: it
  // is not a bank holiday, so it must not make the page say it is.
  const closures = (closureDates as string[]).map(wholeDayClosure);
  if (closures.some((closure) => closure === null)) return not('have an exceptional closure that is not a real date');

  const table: OpeningHours = {
    weekly: weekly as unknown as WeeklyHours,
    bankHolidays: [...new Set(bankHolidays as string[])].sort(),
    closures: closures as Closure[],
  };
  const problems = hoursProblems(table);
  return problems.length > 0 ? not(`do not check out (${problems.join('; ')})`) : table;
}

/**
 * The registered office, one line per entry: Aonik keeps it as one string,
 * written on several lines or with commas between them. A house number on its
 * own ("1, High Street") stays with the street.
 */
function readOffice(value: unknown, reject: Reject): string[] | null {
  if (unset(value)) return null;
  // Line breaks are the one control character an address may carry.
  if (typeof value !== 'string' || value.trim().length > 400 || /[^\P{Cc}\r\n]|\p{Cf}/u.test(value.trim())) {
    return reject('registeredOffice', 'the registered office does not read cleanly');
  }
  const parts = (/[\r\n]/.test(value) ? value.split(/\r?\n|\r/) : value.split(','))
    .map((line) => line.trim())
    .filter(Boolean);
  const lines: string[] = [];
  for (const part of parts) {
    const previous = lines[lines.length - 1];
    if (previous !== undefined && /^\d+[A-Za-z]?(?:[-–]\d+[A-Za-z]?)?$/.test(previous)) {
      lines[lines.length - 1] = `${previous}, ${part}`;
    } else {
      lines.push(part);
    }
  }
  return lines.length > 0 ? lines : null;
}

/** Aonik's profile as ours. Null when there is no profile to read. */
export function readBusinessProfile(body: unknown, log: Log = () => undefined): BusinessProfile | null {
  if (typeof body !== 'object' || body === null) return null;
  const rejected = new Set<ProfileFact>();
  const reject: Reject = (fact, message) => {
    rejected.add(fact);
    log(message);
    return null;
  };
  const profile = body as { contact?: unknown; legal?: unknown; openingHours?: unknown };
  const contact = (profile.contact ?? {}) as { email?: unknown; phone?: unknown; whatsApp?: unknown };
  const legal = (profile.legal ?? {}) as { companyName?: unknown; companyNumber?: unknown; registeredOffice?: unknown };
  return {
    contact: {
      email: readEmail(contact.email, reject),
      phone: readPhone(contact.phone, 'phone', reject, { ukOnly: true }),
      whatsApp: readPhone(contact.whatsApp, 'whatsApp', reject, { ukOnly: false })?.e164 ?? null,
    },
    legal: {
      companyName: readText(legal.companyName, 200, 'companyName', reject),
      companyNumber: readText(legal.companyNumber, 20, 'companyNumber', reject),
      registeredOffice: readOffice(legal.registeredOffice, reject),
    },
    openingHours: readHours(profile.openingHours, reject),
    rejected,
  };
}

/* ---- Reading it from Aonik ------------------------------------------------------- */

interface ProfileMemo {
  key: string;
  /** When the last good answer (a profile, or a 404) was read; null for none yet. */
  readAt: number | null;
  profile: BusinessProfile | null;
  /** After a failed read, no request before this: pages fall back at once instead of each waiting. */
  retryAt: number | null;
}

let memo: ProfileMemo | null = null;
/** The read under way, shared: many renders at once make one request. */
let pending: { key: string; read: Promise<BusinessProfile | null> } | null = null;

/** After a failed read, how long before asking again. */
export const BUSINESS_PROFILE_RETRY_MS = 30_000;

/** Forgets the reused read (tests, and nothing else). */
export function clearBusinessProfileMemo(): void {
  memo = null;
  pending = null;
}

/** Aonik's profile always names the business: anything else (a gateway's error JSON) is no answer. */
const isProfileBody = (body: unknown): boolean =>
  typeof body === 'object' &&
  body !== null &&
  !Array.isArray(body) &&
  typeof (body as { displayName?: unknown }).displayName === 'string';

/** The last good read while it is recent enough to stand in, or the failure. */
function standIn(current: ProfileMemo | null, now: number, error: unknown): BusinessProfile | null {
  if (current?.readAt != null && now - current.readAt < BUSINESS_PROFILE_STALE_MS) return current.profile;
  throw error instanceof Error ? error : new Error('The business profile could not be read');
}

/**
 * The tenant's published profile, or null while it publishes none (404).
 * Throws when Aonik cannot answer and there is no recent good read to stand
 * in — the caller falls back to configuration.
 */
export async function fetchBusinessProfile(config: AonikConfig, now = Date.now()): Promise<BusinessProfile | null> {
  const key = `${config.baseUrl}|${config.tenantId}`;
  const current = memo?.key === key ? memo : null;
  if (current?.readAt != null && now - current.readAt < BUSINESS_PROFILE_MEMO_MS) return current.profile;
  if (current?.retryAt != null && now < current.retryAt) {
    return standIn(current, now, new Error('The business profile could not be read recently; not asking again yet'));
  }
  if (pending?.key === key) return pending.read;

  const read = (async () => {
    try {
      const body = await aonikFetch<unknown>(BUSINESS_PROFILE_PATH, {
        baseUrl: config.baseUrl,
        tenantId: config.tenantId,
        // Never Next's data cache: it would keep a 200 past a withdrawal.
        policy: 'volatile',
        signal: AbortSignal.timeout(BUSINESS_PROFILE_TIMEOUT_MS),
      });
      if (!isProfileBody(body)) throw new Error('Aonik answered with something that is not a business profile');
      const profile = readBusinessProfile(body, (message) => console.warn(`[aonik] business profile: ${message}`));
      memo = { key, readAt: now, profile, retryAt: null };
      return profile;
    } catch (error) {
      // Not published (or withdrawn): believed at once.
      if (error instanceof AonikError && error.isNotFound) {
        memo = { key, readAt: now, profile: null, retryAt: null };
        return null;
      }
      memo = { key, readAt: current?.readAt ?? null, profile: current?.profile ?? null, retryAt: now + BUSINESS_PROFILE_RETRY_MS };
      console.warn('[aonik] business profile unavailable; the last good read stands in while it is recent', error);
      return standIn(memo, now, error);
    }
  })();
  pending = { key, read };
  try {
    return await read;
  } finally {
    if (pending?.read === read) pending = null;
  }
}

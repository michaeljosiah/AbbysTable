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
 *  - phone and WhatsApp are free text in Aonik; a UK number written either
 *    way ("020 3875 1234", "+44 20 3875 1234") becomes E.164 for the link and
 *    keeps its authored form for display;
 *  - opening hours are ISO weekdays (Monday 1) with periods; ours are one
 *    window a day, Sunday first. Touching periods join; a day with a break
 *    between two periods cannot be shown in the design's table, so such hours
 *    are not shown (logged) rather than shown wrong. The timezone must be
 *    Europe/London — the indicator reads London's clock. Bank holidays and
 *    exceptional closures are both whole London days that close the line;
 *    only the first are bank holidays ("Closed on bank holidays"), so an
 *    exceptional closure becomes a closure from that day's start to the next.
 *
 * Aonik caches it publicly for five minutes; so do we (`catalog`).
 */

import type { ClockTime, Closure, DayHours, OpeningHours, WeeklyHours } from '@/lib/contact/hours';
import { UK_TIME_ZONE, hoursProblems, minutesOf, wholeDayClosure } from '@/lib/contact/hours';
import type { SupportContact } from '@/lib/content/contact';

export const BUSINESS_PROFILE_PATH = '/v1/business-profile';

/** How long a page waits for it before falling back to configuration. */
export const BUSINESS_PROFILE_TIMEOUT_MS = 3000;

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
}

type Log = (message: string) => void;

const text = (value: unknown, max = 320): string | null =>
  typeof value === 'string' && value.trim() && value.length <= max && !/\p{Cc}/u.test(value) ? value.trim() : null;

/**
 * A telephone number as E.164, or null. Accepts the ways people write a UK
 * number (a leading 0, 44 or +44; spaces, brackets, dots, dashes, a "(0)")
 * and any number already in international form.
 */
export function toE164(raw: string): string | null {
  const compact = raw.replace(/\(0\)/g, '').replace(/[\s().-]/g, '');
  let e164: string;
  if (compact.startsWith('+')) e164 = compact;
  else if (compact.startsWith('00')) e164 = `+${compact.slice(2)}`;
  else if (compact.startsWith('44')) e164 = `+${compact}`;
  else if (compact.startsWith('0')) e164 = `+44${compact.slice(1)}`;
  else return null;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

function readPhone(value: unknown, log: Log, label: string): SupportContact['phone'] | null {
  const display = text(value, 40);
  if (!display) return null;
  const e164 = toE164(display);
  if (!e164) log(`${label} "${display}" is not a telephone number we can link`);
  return e164 ? { display, e164 } : null;
}

function readEmail(value: unknown, log: Log): string | null {
  const email = text(value, 254);
  if (!email) return null;
  // One "@", something either side, a dot in the domain: a shape check only.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.indexOf('@') !== email.lastIndexOf('@')) {
    log(`email "${email}" is not an address we can link`);
    return null;
  }
  return email;
}

/** "HH:mm:ss" (or "HH:mm") as our "HH:MM", or null when it is not a whole minute. */
function clock(value: unknown): ClockTime | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.0+)?)?$/.exec(value);
  if (!match || (match[3] !== undefined && match[3] !== '00')) return null;
  const time = `${match[1]}:${match[2]}`;
  return Number.isNaN(minutesOf(time)) ? null : time;
}

function readHours(value: unknown, log: Log): OpeningHours | null {
  if (value === null || value === undefined) return null;
  const hours = value as {
    timezone?: unknown;
    weeklyHours?: unknown;
    bankHolidays?: unknown;
    exceptionalClosures?: unknown;
  };
  if (hours.timezone !== UK_TIME_ZONE) {
    log(`opening hours in "${String(hours.timezone)}" — the page reads London's clock, so they are not shown`);
    return null;
  }
  if (
    !Array.isArray(hours.weeklyHours) ||
    !Array.isArray(hours.bankHolidays) ||
    !Array.isArray(hours.exceptionalClosures)
  ) {
    log('opening hours are incomplete, so they are not shown');
    return null;
  }

  // ISO weekday (Monday 1 … Sunday 7) → ours (Sunday 0 … Saturday 6).
  const periods: DayHours[][] = [[], [], [], [], [], [], []];
  for (const raw of hours.weeklyHours as unknown[]) {
    const period = (raw ?? {}) as { dayOfWeek?: unknown; opensAt?: unknown; closesAt?: unknown };
    const opens = clock(period.opensAt);
    const closes = clock(period.closesAt);
    const iso = period.dayOfWeek;
    if (typeof iso !== 'number' || !Number.isInteger(iso) || iso < 1 || iso > 7 || !opens || !closes) {
      log('an opening period does not read cleanly, so the hours are not shown');
      return null;
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
      else {
        log('a day has a break between its opening periods, which the hours table cannot show — not shown');
        return null;
      }
    }
    weekly.push(window);
  }

  const bankHolidays = hours.bankHolidays as unknown[];
  const closureDates = hours.exceptionalClosures as unknown[];
  if (![...bankHolidays, ...closureDates].every((date) => typeof date === 'string')) {
    log('a closure date does not read cleanly, so the hours are not shown');
    return null;
  }
  // An exceptional closure is a whole London day, as an absolute closure: it
  // is not a bank holiday, so it must not make the page say it is.
  const closures = (closureDates as string[]).map(wholeDayClosure);
  if (closures.some((closure) => closure === null)) {
    log('an exceptional closure is not a real date, so the hours are not shown');
    return null;
  }

  const table: OpeningHours = {
    weekly: weekly as unknown as WeeklyHours,
    bankHolidays: [...new Set(bankHolidays as string[])].sort(),
    closures: closures as Closure[],
  };
  const problems = hoursProblems(table);
  if (problems.length > 0) {
    log(`opening hours do not check out (${problems.join('; ')}), so they are not shown`);
    return null;
  }
  return table;
}

/**
 * The registered office, one line per entry: Aonik keeps it as one string,
 * written on several lines or with commas between them.
 */
function readOffice(value: unknown): string[] | null {
  // Line breaks are the one control character an address may carry.
  if (typeof value !== 'string' || value.length > 400 || /[^\P{Cc}\r\n]/u.test(value)) return null;
  const lines = (/[\r\n]/.test(value) ? value.split(/\r?\n|\r/) : value.split(','))
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

/** Aonik's profile as ours. Null when there is no profile to read. */
export function readBusinessProfile(body: unknown, log: Log = () => undefined): BusinessProfile | null {
  if (typeof body !== 'object' || body === null) return null;
  const profile = body as { contact?: unknown; legal?: unknown; openingHours?: unknown };
  const contact = (profile.contact ?? {}) as { email?: unknown; phone?: unknown; whatsApp?: unknown };
  const legal = (profile.legal ?? {}) as { companyName?: unknown; companyNumber?: unknown; registeredOffice?: unknown };
  const whatsApp = readPhone(contact.whatsApp, log, 'WhatsApp number');
  return {
    contact: {
      email: readEmail(contact.email, log),
      phone: readPhone(contact.phone, log, 'telephone number'),
      whatsApp: whatsApp?.e164 ?? null,
    },
    legal: {
      companyName: text(legal.companyName, 200),
      companyNumber: text(legal.companyNumber, 20),
      registeredOffice: readOffice(legal.registeredOffice),
    },
    openingHours: readHours(profile.openingHours, log),
  };
}

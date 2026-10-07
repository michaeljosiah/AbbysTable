/**
 * Opening hours and the Contact page's "Open now / Closed" indicator — the
 * rules, deliberately free of React and the DOM so they are unit-tested on
 * their own (tests/contact.test.tsx).
 *
 * Contract §3f: the indicator is COMPUTED, so the hours are data, not copy —
 * one hours table in local UK time (Europe/London, so BST is handled), a
 * bank-holiday list, and a way to record exceptional closures, because an
 * indicator that says "Open now" during an unplanned closure is worse than
 * none. Production values are to come from Aonik (michaeljosiah/aonik#358,
 * not built yet) in this shape; until then `OPENING_HOURS` in
 * `@/lib/content/contact` is that configuration — and it is `null`, because
 * the design's hours (Mon–Fri 9–5, Sat 10–2, Sun closed) are unverified
 * placeholders. With no hours there is no status: never a guessed one.
 *
 * Every calculation reads the wall clock in Europe/London, never the
 * machine's zone: a server in UTC and a customer abroad must both see the
 * line's own state. The date that decides a bank holiday is the LONDON date —
 * 00:30 BST on a bank holiday is still 23:30 UTC the evening before.
 */

export const UK_TIME_ZONE = 'Europe/London';

/** "HH:MM", 24-hour, local UK time: "09:00", "17:30". */
export type ClockTime = string;

/** One day's window. `closes` is exclusive: open at 09:00, closed at 17:00. */
export interface DayHours {
  opens: ClockTime;
  closes: ClockTime;
}

/**
 * The week, indexed like `Date.getDay()`: 0 = Sunday … 6 = Saturday. `null`
 * is closed all day. Windows never cross midnight.
 */
export type WeeklyHours = readonly [
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
];

/**
 * An exceptional closure — a staff day, an unplanned afternoon. Absolute
 * instants (ISO 8601 with a zone or `Z`), so the record means the same thing
 * on every machine; `until` is exclusive.
 */
export interface Closure {
  from: string;
  until: string;
}

export interface OpeningHours {
  weekly: WeeklyHours;
  /** Local UK dates (`YYYY-MM-DD`) on which the line is closed all day. */
  bankHolidays: readonly string[];
  closures: readonly Closure[];
}

/* ---- The London wall clock ---------------------------------------------------- */

export interface UkClock {
  /** The local calendar date, `YYYY-MM-DD`. */
  date: string;
  /** 0 = Sunday … 6 = Saturday, as `Date.getDay()`. */
  weekday: number;
  /** Minutes since local midnight. */
  minutes: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

let ukFormatter: Intl.DateTimeFormat | null = null;

function formatter(): Intl.DateTimeFormat {
  ukFormatter ??= new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return ukFormatter;
}

/** What a clock on the kitchen wall says at `instant`. */
export function ukClock(instant: Date): UkClock {
  const parts: Record<string, string> = {};
  for (const part of formatter().formatToParts(instant)) parts[part.type] = part.value;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/* ---- Open or closed --------------------------------------------------------------- */

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes since midnight for "HH:MM", or NaN when it is not one. */
export function minutesOf(time: ClockTime): number {
  const match = CLOCK_PATTERN.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
}

function inClosure(closure: Closure, instant: Date): boolean {
  const from = Date.parse(closure.from);
  const until = Date.parse(closure.until);
  const at = instant.getTime();
  return Number.isFinite(from) && Number.isFinite(until) && at >= from && at < until;
}

/** Whether the line is open at `instant`. */
export function isOpenAt(hours: OpeningHours, instant: Date): boolean {
  if (hours.closures.some((closure) => inClosure(closure, instant))) return false;
  const clock = ukClock(instant);
  if (hours.bankHolidays.includes(clock.date)) return false;
  const day = hours.weekly[clock.weekday];
  if (!day) return false;
  const opens = minutesOf(day.opens);
  const closes = minutesOf(day.closes);
  // A malformed window is closed, never open: a wrong "Open now" is the
  // failure the contract warns about.
  if (!(opens < closes)) return false;
  return clock.minutes >= opens && clock.minutes < closes;
}

export type OpenStatus = 'open' | 'closed';

/** The indicator's state — `null` (show nothing) while no hours are configured. */
export function openStatus(hours: OpeningHours | null, instant: Date): OpenStatus | null {
  if (!hours) return null;
  return isOpenAt(hours, instant) ? 'open' : 'closed';
}

/** The words carry the state; colour is never the only signal. */
export const OPEN_STATUS_LABELS: Record<OpenStatus, string> = {
  open: 'Open now',
  closed: 'Closed',
};

/**
 * Milliseconds to the next whole minute, so a page left open re-checks as the
 * minute turns rather than up to a minute late. At least 1ms.
 */
export function msUntilNextMinute(instant: Date): number {
  const ms = instant.getTime();
  return Math.max(1, 60_000 - (((ms % 60_000) + 60_000) % 60_000));
}

/* ---- The hours table, as the page prints it ----------------------------------------- */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The page lists the week from Monday. */
const WEEK_FROM_MONDAY = [1, 2, 3, 4, 5, 6, 0];

/** "09:00" → "9am", "17:30" → "5:30pm", "12:00" → "12pm". */
export function formatClock(time: ClockTime): string {
  const minutes = minutesOf(time);
  if (Number.isNaN(minutes)) return time;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 < 12 ? 'am' : 'pm';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute === 0 ? `${hour12}${suffix}` : `${hour12}:${String(minute).padStart(2, '0')}${suffix}`;
}

export interface HoursRow {
  /** "Mon–Fri", "Saturday". */
  days: string;
  /** "9am – 5pm", or null for closed. */
  hours: string | null;
}

/**
 * The design's table — "Mon–Fri 9am – 5pm / Saturday 10am – 2pm / Sunday
 * Closed" — DERIVED from the same table the indicator reads, so the two can
 * never disagree. Runs of consecutive days (from Monday) with the same window
 * share a row: one day is named in full, a run by its ends.
 */
export function hoursRows(weekly: WeeklyHours): HoursRow[] {
  const rows: Array<{ first: number; last: number; window: DayHours | null }> = [];
  for (const day of WEEK_FROM_MONDAY) {
    const window = weekly[day];
    const previous = rows[rows.length - 1];
    const same =
      previous &&
      (previous.window === null
        ? window === null
        : window !== null &&
          window.opens === previous.window.opens &&
          window.closes === previous.window.closes);
    if (same) previous.last = day;
    else rows.push({ first: day, last: day, window });
  }
  return rows.map(({ first, last, window }) => ({
    days: first === last ? DAY_NAMES[first] : `${DAY_SHORT[first]}–${DAY_SHORT[last]}`,
    hours: window ? `${formatClock(window.opens)} – ${formatClock(window.closes)}` : null,
  }));
}

/** An ISO 8601 date-time ending in `Z` or a numeric offset — an absolute instant. */
const ZONED_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/** `YYYY-MM-DD` naming a day that exists — `2026-02-30` would match no London date. */
function isCalendarDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

/**
 * What is wrong with a configured table — empty when nothing is. The test
 * suite runs it over `OPENING_HOURS`, so a typo fails the build instead of
 * quietly closing (or opening) the line.
 */
export function hoursProblems(hours: OpeningHours): string[] {
  const problems: string[] = [];
  if (hours.weekly.length !== 7) problems.push('weekly must list seven days, Sunday first');
  hours.weekly.forEach((window, day) => {
    if (!window) return;
    const opens = minutesOf(window.opens);
    const closes = minutesOf(window.closes);
    if (Number.isNaN(opens) || Number.isNaN(closes)) {
      problems.push(`${DAY_NAMES[day]}: times must be "HH:MM", 24-hour`);
    } else if (!(opens < closes)) {
      problems.push(`${DAY_NAMES[day]}: opens must be before closes (no window crosses midnight)`);
    }
  });
  for (const date of hours.bankHolidays) {
    if (!isCalendarDate(date)) problems.push(`bank holiday "${date}" must be a real YYYY-MM-DD date`);
  }
  for (const closure of hours.closures) {
    // A timestamp without a zone would be read in each visitor's own zone.
    const zoned = ZONED_INSTANT.test(closure.from) && ZONED_INSTANT.test(closure.until);
    const from = Date.parse(closure.from);
    const until = Date.parse(closure.until);
    if (!zoned || !Number.isFinite(from) || !Number.isFinite(until) || !(from < until)) {
      problems.push(`closure ${closure.from} – ${closure.until} must be two zoned instants, in order`);
    }
  }
  return problems;
}

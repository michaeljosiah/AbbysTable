/**
 * Checkout's delivery calendar, React-free (`tests/checkout.test.tsx`).
 *
 * Every date here is a CALENDAR DATE (`YYYY-MM-DD`), never an instant: it is
 * read from its own digits and stepped in UTC, so no viewer's timezone can
 * move a delivery onto another day (`formatDeliveryDate`'s rule). Availability
 * is Aonik's (aonik#346) — `available`, `fully_booked`, `no_delivery` or
 * `unknown` — and only an available day can be chosen; an unknown one is
 * shown and refused as no delivery.
 */

import { formatDeliveryDateLong } from '@/lib/format';

export type DayStatus = 'available' | 'fully_booked' | 'no_delivery' | 'unknown';

export interface DayAvailability {
  date: string;
  status: DayStatus;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pad = (value: number) => String(value).padStart(2, '0');

function toUtc(date: string): Date | null {
  const match = ISO_DATE.exec(date);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCMonth() === month - 1 && value.getUTCDate() === day ? value : null;
}

const fromUtc = (value: Date) =>
  `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;

/** A real calendar date, or false: "2026-02-30" is not one. */
export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && toUtc(value) !== null;
}

/** `date` moved by `days` (negative goes back). */
export function addDays(date: string, days: number): string {
  const value = toUtc(date);
  if (!value) throw new Error(`Not a date: ${date}`);
  value.setUTCDate(value.getUTCDate() + days);
  return fromUtc(value);
}

/** The month a date falls in, `YYYY-MM`. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** `month` moved by `months`. */
export function addMonths(month: string, months: number): string {
  const match = ISO_MONTH.exec(month);
  if (!match) throw new Error(`Not a month: ${month}`);
  const index = Number(match[1]) * 12 + Number(match[2]) - 1 + months;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** "2026-10" -> "October 2026". */
export function monthTitle(month: string): string {
  const match = ISO_MONTH.exec(month);
  if (!match) return month;
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

/** The first day of `month` and how many days it has: one dates read. */
export function monthRange(month: string): { fromDate: string; days: number } {
  const fromDate = `${month}-01`;
  const next = toUtc(`${addMonths(month, 1)}-01`)!;
  const first = toUtc(fromDate)!;
  return { fromDate, days: Math.round((next.getTime() - first.getTime()) / 86_400_000) };
}

/** Monday 0 … Sunday 6, as the calendar's columns run (M T W T F S S). */
function mondayIndex(date: string): number {
  return (toUtc(date)!.getUTCDay() + 6) % 7;
}

export interface CalendarCell {
  date: string;
  /** Day of the month, as printed. */
  day: number;
  status: DayStatus;
}

/**
 * The month as Monday-first weeks. Days outside the month are `null` — empty
 * cells, never another month's dates. A day the availability does not mention
 * is `no_delivery`: nothing is offered that Aonik did not offer.
 */
export function monthWeeks(month: string, statusOf: (date: string) => DayStatus | undefined): (CalendarCell | null)[][] {
  const { fromDate, days } = monthRange(month);
  const cells: (CalendarCell | null)[] = Array.from({ length: mondayIndex(fromDate) }, () => null);
  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(fromDate, offset);
    cells.push({ date, day: offset + 1, status: statusOf(date) ?? 'no_delivery' });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (CalendarCell | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

const STATUS_WORDS: Record<DayStatus, string> = {
  available: 'available',
  fully_booked: 'fully booked',
  no_delivery: 'no delivery',
  // Not designed: a day whose capacity Aonik cannot confirm is offered as none.
  unknown: 'no delivery',
};

/** A day button's name: "Thursday 6 August, available" / ", selected" / ", fully booked". */
export function dayLabel(date: string, status: DayStatus, selected: boolean): string {
  const long = formatDeliveryDateLong(date) ?? date;
  return `${long}, ${selected ? 'selected' : STATUS_WORDS[status]}`;
}

/** Aonik's status word as ours; anything unrecognised is unknown, so never bookable. */
export function readDayStatus(value: unknown): DayStatus {
  return value === 'available' || value === 'fully_booked' || value === 'no_delivery' ? value : 'unknown';
}

/**
 * The nearest choosable day from `from` in `direction`, within `[min, max]`,
 * crossing months: the arrow keys skip what cannot be chosen. `from` itself is
 * not a candidate. Null when there is none in range.
 */
export function stepAvailable(
  from: string,
  direction: 1 | -1,
  isAvailable: (date: string) => boolean,
  range: { min: string; max: string },
): string | null {
  let date = from;
  for (;;) {
    date = addDays(date, direction);
    if (date < range.min || date > range.max) return null;
    if (isAvailable(date)) return date;
  }
}

/** The first (`edge` start) or last (end) choosable day of `month`, or null. */
export function edgeAvailable(month: string, edge: 'start' | 'end', isAvailable: (date: string) => boolean): string | null {
  const { fromDate, days } = monthRange(month);
  for (let index = 0; index < days; index += 1) {
    const date = addDays(fromDate, edge === 'start' ? index : days - 1 - index);
    if (isAvailable(date)) return date;
  }
  return null;
}

/**
 * The demo calendar — PLACEHOLDER availability mirroring the design's holding
 * data, for review without Aonik: nothing within a week of `today`, no
 * delivery on Sundays and Mondays, and a fully booked run every ninth day so
 * all three states show. Never used with live data.
 */
export function demoDayStatus(date: string, today: string): DayStatus {
  if (date < addDays(today, 7)) return 'no_delivery';
  const weekday = mondayIndex(date);
  if (weekday === 0 || weekday === 6) return 'no_delivery';
  const ordinal = Math.round(toUtc(date)!.getTime() / 86_400_000);
  return ordinal % 9 === 0 ? 'fully_booked' : 'available';
}

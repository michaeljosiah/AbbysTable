/**
 * Presentation helpers. Formatting happens at the edge; domain data stays in
 * minor units and ISO dates.
 */

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats pence as sterling, dropping the decimals on whole pounds:
 * 15000 -> "£150", 450 -> "£4.50" (never the lone-digit "£4.5").
 */
export function formatPrice(pence: number): string {
  const pounds = pence / 100;
  return pence % 100 === 0 ? GBP.format(pounds) : GBP_EXACT.format(pounds);
}

const GBP_EXACT = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Always two decimals — the checkout templates price à-la-carte extras this
 * way: 300 -> "£3.00".
 */
export function formatPriceExact(pence: number): string {
  return GBP_EXACT.format(pence / 100);
}

/** Formats a signed delta without ever producing a "+-£" prefix. */
export function formatSignedPrice(pence: number, exact = false): string {
  const amount = (exact ? formatPriceExact : formatPrice)(Math.abs(pence));
  return `${pence < 0 ? '-' : '+'}${amount}`;
}

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

/**
 * Formats a delivery date: "2026-08-06" -> "6 August".
 *
 * The promise is a CALENDAR DATE, not an instant. It is therefore parsed from
 * its own digits rather than through `new Date(...)`, which would attach a
 * timezone and can shift the day — a customer in UTC−10 must not be told the
 * box arrives on the 5th because we round-tripped the 6th through their clock.
 *
 * Returns null for a missing or unparseable date, so callers render nothing
 * rather than "Invalid Date". A wrong date is worse than no date.
 */
export function formatDeliveryDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;

  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${day} ${MONTHS[month - 1]}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * A delivery date with its weekday, as Delivery & FAQs' postcode result sets
 * it: "2026-08-06" -> "Thursday 6 August".
 *
 * The weekday is DERIVED from the date, never stored beside it
 * (frontend-backend-contract §4), and derived in UTC from the date's own
 * digits for the reason `formatDeliveryDate` gives: a calendar date has no
 * timezone to shift it. Null for a missing, malformed or impossible date
 * ("2026-02-30"), so callers render nothing rather than a wrong weekday.
 */
export function formatDeliveryDateLong(isoDate: string | null | undefined): string | null {
  const short = formatDeliveryDate(isoDate);
  if (!short || !isoDate) return null;

  const [year, month, day] = isoDate.trim().split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls an impossible day into the next month; refuse it instead.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  return `${WEEKDAYS[date.getUTCDay()]} ${short}`;
}

/**
 * A delivery date as the menu's availability strip sets it: "2026-09-18" ->
 * "Fri 18 Sep" (Menu Landing v3, `nextDelivery`). Weekday and month are the
 * first three letters of `formatDeliveryDateLong`'s words — the weekday
 * derived from the date, never stored beside it (contract §4) — and null for
 * anything that would not make a true date.
 */
export function formatDeliveryDateShort(isoDate: string | null | undefined): string | null {
  const long = formatDeliveryDateLong(isoDate);
  if (!long) return null;
  const [weekday, day, month] = long.split(' ');
  return `${weekday.slice(0, 3)} ${day} ${month.slice(0, 3)}`;
}

/** Joins parts into a natural list: ["a","b","c"] -> "a, b or c". */
export function joinWithOr(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}`;
}

const COUNT_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

/**
 * A count as running copy sets it: words up to twelve ("six dishes"), digits
 * above (18 -> "18"). For prose only — prices, labels and data rows keep digits.
 */
export function formatCountInWords(count: number): string {
  return Number.isInteger(count) && count >= 0 && count < COUNT_WORDS.length
    ? COUNT_WORDS[count]
    : String(count);
}

/**
 * Formats `placedAtUtc` as "21 July 2026 at 14:32".
 *
 * Two things it gets right that a bare `new Date(x).toLocaleString()` does not:
 *
 *  1. A .NET `DateTime` with `Kind=Unspecified` serialises with NO timezone
 *     designator, and `new Date(...)` then reads it as LOCAL time. The field is
 *     named `...Utc`, so a missing designator means UTC and is made explicit
 *     rather than left to the server's clock.
 *  2. The zone is pinned to Europe/London instead of inherited from whatever
 *     the render host is set to. A UK storefront telling a customer their order
 *     was placed at 02:32 because the box runs on UTC+12 is a bug nobody would
 *     think to look for.
 *
 * Returns null for a missing or unparseable value so callers render nothing
 * rather than "Invalid Date" — the same rule `formatDeliveryDate` follows.
 */
export function formatOrderDate(placedAtUtc: string | null | undefined): string | null {
  const date = parseInstant(placedAtUtc);
  return date ? PLACED_AT.format(date) : null;
}

const PLACED_AT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/London',
});

function parseInstant(value: string | null | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const hasDesignator = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const date = new Date(hasDesignator ? trimmed : `${trimmed}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

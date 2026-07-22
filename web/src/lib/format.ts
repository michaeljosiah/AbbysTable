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

/** Joins parts into a natural list: ["a","b","c"] -> "a, b or c". */
export function joinWithOr(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}`;
}

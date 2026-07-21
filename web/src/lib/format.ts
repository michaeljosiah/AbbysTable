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

const DELIVERY_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** Formats an ISO date as the site's delivery style: "2026-08-06" -> "6 August". */
export function formatDeliveryDate(isoDate: string): string {
  return DELIVERY_DATE.format(new Date(`${isoDate}T00:00:00Z`));
}

/** Joins parts into a natural list: ["a","b","c"] -> "a, b or c". */
export function joinWithOr(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}`;
}

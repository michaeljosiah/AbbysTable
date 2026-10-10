/**
 * Checkout's order summary rows, React-free (`tests/checkout.test.tsx`).
 *
 * Every figure is Aonik's quote, in its order, rendered as given: nothing is
 * added up here (A24 — the total IS the components' sum, and Aonik sends it).
 * A row shows only when it applies — a zero upgrade or extras line is left
 * out — except delivery, which always shows, as "Free" when nothing is
 * charged. The delivery row carries the chosen date once one is held; before
 * that it reads "Delivery" with no date (D25), never the earliest date as
 * though it were chosen.
 */

import type { BoxQuote } from '@/lib/aonik/map';
import { quoteComponentLabel } from '@/lib/cart/quote';
import { formatDeliveryDateShort, formatPriceExact } from '@/lib/format';

export interface SummaryRow {
  key: string;
  label: string;
  value: string;
  /** The list price struck through beside "Free" delivery. */
  was?: string;
  tone?: 'free' | 'saving';
}

/** Components that may be zero and are then not worth a row. */
const OPTIONAL = new Set(['personalisation', 'unitSurcharges', 'addOns', 'greetingCard', 'discount', 'tax', 'points']);

export function summaryRows(quote: BoxQuote, options: { deliveryDate: string | null }): SummaryRow[] {
  const rows: SummaryRow[] = [];
  quote.components.forEach((component, index) => {
    const key = `${component.key}:${index}`;
    if (component.amountPence === 0 && OPTIONAL.has(component.key)) return;

    if (component.key === 'boxPrice') {
      rows.push({ key, label: `${quote.boxSize}-dish box`, value: formatPriceExact(component.amountPence) });
      return;
    }
    if (component.key === 'deliveryCharged') {
      const date = options.deliveryDate ? formatDeliveryDateShort(options.deliveryDate) : null;
      const label = date ? `Delivery · ${date}` : 'Delivery';
      if (component.amountPence === 0) {
        rows.push({
          key,
          label,
          value: 'Free',
          tone: 'free',
          ...(quote.deliveryListPence > 0 ? { was: formatPriceExact(quote.deliveryListPence) } : {}),
        });
      } else {
        rows.push({ key, label, value: formatPriceExact(component.amountPence) });
      }
      return;
    }
    if (component.key === 'discount') {
      const code = quote.discount?.code;
      rows.push({
        key,
        label: code ? `Discount (${code})` : 'Discount',
        value: `−${formatPriceExact(Math.abs(component.amountPence))}`,
        tone: 'saving',
      });
      return;
    }
    const label = component.key === 'greetingCard' ? 'Greeting card' : quoteComponentLabel(component.key);
    rows.push({
      key,
      label,
      value:
        component.amountPence < 0
          ? `−${formatPriceExact(-component.amountPence)}`
          : `+${formatPriceExact(component.amountPence)}`,
      ...(component.amountPence < 0 ? { tone: 'saving' as const } : {}),
    });
  });
  return rows;
}

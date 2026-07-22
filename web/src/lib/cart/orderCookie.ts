/**
 * The placed-order snapshot — what `/box/confirmation` renders from.
 *
 * An anonymous customer CANNOT read their order back from Aonik: both
 * storefront order routes are `Policies("AdminUserPolicy")` and party-scoped,
 * and Spec 072 answers another party's order id with 404 rather than 403 so
 * there is no existence oracle. Guest order lookup is deliberately not offered.
 *
 * So the confirmation cannot re-fetch — it must render from a snapshot taken at
 * the moment checkout succeeded. That snapshot lives here, in a short-lived
 * httpOnly cookie, which makes the page refresh-safe (FR-4) without ever
 * re-triggering checkout and without putting an order reference in a URL.
 *
 * Two things are deliberately NOT in the snapshot:
 *  - `clientSecret` / `checkoutUrl` from the checkout result. They authorize a
 *    payment attempt; a cookie is the wrong place for them and nothing here
 *    needs them.
 *  - anything not needed to render the page. Cookies are capped near 4KB by
 *    every browser, so `snapshotFits` measures the encoded value and the writer
 *    degrades to reference-plus-totals rather than emitting a cookie the
 *    browser will silently drop — losing the whole confirmation.
 *
 * SERVER-ONLY.
 */

import { cookies } from 'next/headers';

export const ORDER_COOKIE = 'abbys-table:order';

/** One line as it was placed. Titles and quantities only — no images, no ids. */
export interface PlacedOrderLine {
  name: string;
  quantity: number;
  /** Personalisation as Aonik summarised it, when it was not the default. */
  detail?: string;
  /** Add-ons carry a retail price; box dishes are covered by the box price. */
  pricePence?: number;
}

export interface PlacedOrder {
  orderId: string;
  /** Aonik's status at placement, e.g. "RequiresPaymentMethod". */
  paymentStatus: string;
  subtotalPence: number;
  discountTotalPence: number;
  taxTotalPence: number;
  totalPence: number;
  currency: string;
  /** The promise as known at placement — never re-resolved later. */
  earliestDeliveryDate?: string;
  boxSize?: number;
  dishes: PlacedOrderLine[];
  addOns: PlacedOrderLine[];
  /**
   * True when the line detail was dropped to fit the cookie. The page then
   * shows the reference and totals only, and says so, rather than presenting a
   * truncated box as if it were the whole order.
   */
  linesOmitted?: boolean;
}

/**
 * Browsers cap a cookie near 4096 bytes including the name and attributes.
 * 3500 leaves room for those and for the encoding overhead, and is measured
 * against the ENCODED value because that is what actually gets sent.
 */
const MAX_COOKIE_BYTES = 3500;

function encodedSize(value: PlacedOrder): number {
  return encodeURIComponent(JSON.stringify(value)).length;
}

export async function readPlacedOrder(): Promise<PlacedOrder | null> {
  const raw = (await cookies()).get(ORDER_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const order = parsed as Partial<PlacedOrder>;
    if (typeof order.orderId !== 'string' || !order.orderId) return null;

    return {
      orderId: order.orderId,
      paymentStatus: typeof order.paymentStatus === 'string' ? order.paymentStatus : '',
      subtotalPence: Number(order.subtotalPence) || 0,
      discountTotalPence: Number(order.discountTotalPence) || 0,
      taxTotalPence: Number(order.taxTotalPence) || 0,
      totalPence: Number(order.totalPence) || 0,
      currency: typeof order.currency === 'string' ? order.currency : 'GBP',
      earliestDeliveryDate:
        typeof order.earliestDeliveryDate === 'string' ? order.earliestDeliveryDate : undefined,
      boxSize: typeof order.boxSize === 'number' ? order.boxSize : undefined,
      dishes: Array.isArray(order.dishes) ? order.dishes : [],
      addOns: Array.isArray(order.addOns) ? order.addOns : [],
      linesOmitted: order.linesOmitted === true,
    };
  } catch {
    return null;
  }
}

/**
 * Stores the snapshot, shedding detail rather than overflowing.
 *
 * The order reference is the customer's only record of the purchase, so it is
 * the last thing dropped: a confirmation without the dish list is a degraded
 * page, while a cookie the browser refuses is no page at all.
 */
export async function writePlacedOrder(order: PlacedOrder): Promise<void> {
  let value = order;

  if (encodedSize(value) > MAX_COOKIE_BYTES) {
    // Personalisation summaries are the bulkiest and least essential part.
    value = {
      ...value,
      dishes: value.dishes.map(({ name, quantity }) => ({ name, quantity })),
      addOns: value.addOns.map(({ name, quantity, pricePence }) => ({ name, quantity, pricePence })),
    };
  }

  if (encodedSize(value) > MAX_COOKIE_BYTES) {
    value = { ...value, dishes: [], addOns: [], linesOmitted: true };
  }

  (await cookies()).set(ORDER_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: 'lax',
    // Secure is skipped on http://localhost only — see `cartCookie.ts`.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Long enough to survive a refresh, a back-navigation and a phone handoff;
    // short enough that a shared machine is not left holding someone's order.
    maxAge: 60 * 60 * 2,
  });
}

export async function clearPlacedOrder(): Promise<void> {
  (await cookies()).delete(ORDER_COOKIE);
}

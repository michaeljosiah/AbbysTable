/**
 * What My Account says about orders — React-free, so the rules are unit-tested
 * (tests/account-orders.test.tsx). Components render; they decide nothing here.
 *
 * Sources: design/CLAUDE.md "My Account", design/frontend-backend-contract.md,
 * and Aonik's own grouping and fulfilment vocabulary (StorefrontOrderService).
 */

import type { OrderSummary } from '@/lib/aonik/orders';
import { formatDeliveryDateLong, formatOrderDay } from '@/lib/format';

export type OrderGroup = 'upcoming' | 'past' | 'pending';

/**
 * Which list an order belongs to. Aonik says (`historyGroup`); an older Aonik
 * that does not is read from its fulfilment status. An order that was never
 * PAID — still awaiting payment, or abandoned and expired at checkout — is
 * neither: nothing was confirmed, so it is not shown as an order of the
 * customer's.
 */
export function orderGroup(
  order: Pick<OrderSummary, 'historyGroup' | 'fulfilmentStatus'> & { paymentStatus?: string },
): OrderGroup {
  // Aonik reads an order that was abandoned or expired at checkout as
  // "Cancelled" and files it under Past. It was never an order of the
  // customer's: no payment was taken.
  if (order.paymentStatus !== undefined && order.paymentStatus !== 'Captured') return 'pending';
  if (order.historyGroup === 'Upcoming') return 'upcoming';
  if (order.historyGroup === 'Past') return 'past';
  if (order.historyGroup === 'PendingPayment') return 'pending';
  if (!order.fulfilmentStatus) return 'pending';
  return order.fulfilmentStatus === 'Delivered' || order.fulfilmentStatus === 'Cancelled' ? 'past' : 'upcoming';
}

export interface OrderStatusLabel {
  label: string;
  /** The pill's colour: `live` (sage) for work in progress, `done` (sand) once over. */
  kind: 'live' | 'done';
}

/** Aonik's four fulfilment steps, and Cancelled, as the customer reads them. */
const FULFILMENT_LABELS: Record<string, OrderStatusLabel> = {
  Confirmed: { label: 'Confirmed', kind: 'live' },
  Cooking: { label: 'Cooking', kind: 'live' },
  OutForDelivery: { label: 'Out for delivery', kind: 'live' },
  Delivered: { label: 'Delivered', kind: 'done' },
  Cancelled: { label: 'Cancelled', kind: 'done' },
};

/**
 * The status pill. Aonik's fulfilment status where it sent one; otherwise its
 * own order status, verbatim — a status is never made up.
 */
export function orderStatusLabel(order: Pick<OrderSummary, 'fulfilmentStatus' | 'status'>): OrderStatusLabel {
  const known = order.fulfilmentStatus ? FULFILMENT_LABELS[order.fulfilmentStatus] : undefined;
  return known ?? { label: order.status, kind: 'done' };
}

/**
 * Upcoming soonest first (an order with no date last), past newest first. Page
 * order from Aonik is newest-placed-first, which is already right for past.
 */
export function splitOrders(orders: readonly OrderSummary[]): { upcoming: OrderSummary[]; past: OrderSummary[] } {
  const upcoming: OrderSummary[] = [];
  const past: OrderSummary[] = [];
  for (const order of orders) {
    const group = orderGroup(order);
    if (group === 'upcoming') upcoming.push(order);
    else if (group === 'past') past.push(order);
  }
  upcoming.sort((a, b) => (a.deliveryDate ?? '9999').localeCompare(b.deliveryDate ?? '9999'));
  return { upcoming, past };
}

/**
 * The card's title: the delivery day ("Thursday 8 October"), else when it was
 * placed. Never a guess.
 */
export function orderHeading(order: Pick<OrderSummary, 'deliveryDate' | 'placedAtUtc'>): string {
  const delivery = formatDeliveryDateLong(order.deliveryDate);
  if (delivery) return delivery;
  const placed = formatOrderDay(order.placedAtUtc);
  return placed ? `Ordered ${placed}` : 'Your order';
}

/** "6-dish box" — or just "Box" when Aonik gave no size. */
export function orderBoxLabel(order: Pick<OrderSummary, 'boxSize'>): string {
  return order.boxSize ? `${order.boxSize}-dish box` : 'Box';
}

/** The disclosure's label: "Show dishes (6)" / "Hide dishes (6)". */
export function dishesToggleLabel(open: boolean, count: number): string {
  return `${open ? 'Hide' : 'Show'} dishes (${count})`;
}

/** The dishes' total count, for the label (a 2× line counts twice). */
export function dishCount(order: Pick<OrderSummary, 'dishes'>): number {
  return order.dishes.reduce((sum, dish) => sum + dish.quantity, 0);
}

/** "Gift for Kemi Adeyemi · prices hidden · greeting card" — only what was chosen. */
export function giftLine(
  gift: { hidePrices: boolean; includeGreetingCard: boolean } | undefined,
  recipientName?: string,
): string {
  const parts = [recipientName ? `Gift for ${recipientName}` : 'Gift'];
  if (gift?.hidePrices) parts.push('prices hidden');
  if (gift?.includeGreetingCard) parts.push('greeting card');
  return parts.join(' · ');
}

/** "12 High Street, Dartford DA1 1AA": the postcode follows the last line with a space. */
export function addressText(lines: readonly string[]): string {
  if (lines.length < 2) return lines.join(', ');
  const postcode = lines[lines.length - 1];
  return `${lines.slice(0, -1).join(', ')} ${postcode}`;
}

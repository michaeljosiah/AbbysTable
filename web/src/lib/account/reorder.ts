/**
 * What Order again says, and which orders offer it — React-free.
 */

import type { OrderSummary } from '@/lib/aonik/orders';

export const REORDER_COPY = {
  upcomingHint: 'This starts a new box. Your delivery won’t change.',
  activeBox:
    'You already have a box in progress. We can only hold one box at a time, so finish it first and then order again.',
  notReorderable: 'This order can’t be ordered again.',
  unavailable: 'Order again isn’t available yet.',
  failed: 'We couldn’t start that box just now. Please try again in a moment.',
} as const;

/**
 * Whether an order offers Order again: it was paid and is not cancelled. (Aonik
 * decides the rest — only a confirmed, paid FOOD box can be reordered — and the
 * button says plainly when it can't.)
 */
export function canOrderAgain(order: Pick<OrderSummary, 'fulfilmentStatus' | 'paymentStatus'>): boolean {
  if (order.paymentStatus !== undefined && order.paymentStatus !== 'Captured') return false;
  return order.fulfilmentStatus !== 'Cancelled';
}

/** "Order again: dishes from Thursday 8 October". */
export function orderAgainLabel(heading: string): string {
  return `Order again: dishes from ${heading}`;
}

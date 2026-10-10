/**
 * The orders page's data: one page of history, split into Upcoming and Past,
 * with the delivery address (and the gift line) read for the orders that show
 * one. SERVER-ONLY.
 *
 * The list carries no address, so the detail is read for each UPCOMING order
 * and each gift order on the page (a handful, in parallel), and only for those:
 * a customer with years of past orders must not cost one read per card. A
 * detail that cannot be read costs its line, never the page.
 *
 * Cached per request (the argument is the page number), so the Orders page and
 * the overview's Next delivery card share one set of reads.
 */

import { cache } from 'react';

import {
  getMyOrder,
  listMyOrders,
  ORDERS_PAGE_SIZE,
  type OrderHistoryPage,
  type OrderSummary,
} from '@/lib/aonik/orders';

import { addressText, giftLine, splitOrders } from './orders';

/** The most detail reads one page makes. */
const MAX_DETAIL_READS = 8;

export interface OrderExtras {
  address?: string;
  gift?: string;
}

export interface AccountOrders {
  history: OrderHistoryPage;
  upcoming: OrderSummary[];
  past: OrderSummary[];
  extras: Map<string, OrderExtras>;
}

export const loadAccountOrders = cache(async (page: number): Promise<AccountOrders> => {
  const history = await listMyOrders(page, ORDERS_PAGE_SIZE);
  const { upcoming, past } = splitOrders(history.orders);

  const wanted = [...upcoming, ...past.filter((order) => order.isGift)].slice(0, MAX_DETAIL_READS);
  const extras = new Map<string, OrderExtras>();
  const results = await Promise.allSettled(wanted.map((order) => getMyOrder(order.orderId)));

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled' || !result.value?.delivery) return;
    const { delivery } = result.value;
    extras.set(wanted[index].orderId, {
      address: delivery.addressLines.length > 0 ? addressText(delivery.addressLines) : undefined,
      gift: wanted[index].isGift || delivery.gift ? giftLine(delivery.gift, delivery.recipientName) : undefined,
    });
  });

  return { history, upcoming, past, extras };
});

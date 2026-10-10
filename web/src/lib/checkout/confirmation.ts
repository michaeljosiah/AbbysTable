/**
 * Order Confirmation v2's data (#32; spec checkout-and-payment FR-11).
 * SERVER-ONLY except `confirmationRows` and `confirmationVariant`, which are
 * React-free and tested (`tests/payment.test.tsx`).
 *
 * The order is READ BACK from Aonik — never a snapshot taken before payment:
 * a guest with the `X-Order-Token` checkout issued (kept in the payment
 * cookie), a signed-in customer with their session. It is shown only when its
 * payment is `Captured`: an order that exists but is not paid is never
 * "confirmed".
 */

import { readAonikConfig } from '@/lib/aonik/dataMode';
import type { StorefrontOrderDetailDto } from '@/lib/aonik/dto';
import { AonikError } from '@/lib/aonik/errors';
import { aonikFetch } from '@/lib/aonik/http';
import { aonikAuthedFetch, currentSession } from '@/lib/auth/server';
import { formatDeliveryDateShort, formatPriceExact } from '@/lib/format';

import { readPaymentCookie } from './paymentCookie';

/** Logged in, account setup pending, or a guest (design: the three states). */
export type ConfirmationVariant = 'member' | 'setup' | 'guest';

export interface ConfirmationRow {
  key: string;
  label: string;
  value: string;
  tone?: 'free' | 'saving';
}

export interface ConfirmedOrder {
  orderNumber: string | null;
  deliveryDate: string | null;
  /** The address, one line each, as delivered. */
  address: string[];
  rows: ConfirmationRow[];
  total: string;
  variant: ConfirmationVariant;
  /** Points earned and visible; null when loyalty says nothing (disabled, or none). */
  points: number | null;
}

export type ConfirmationRead =
  /** Nothing to show in this browser: no recent order, or it cannot be read. */
  | { kind: 'none' }
  /** An order that is not paid yet: the payment page says where it stands. */
  | { kind: 'unpaid' }
  | { kind: 'paid'; order: ConfirmedOrder };

const pence = (major: number) => Math.round(major * 100);

/**
 * The variant (Order Confirmation v2): from Aonik's earning status when
 * loyalty reports one; otherwise the session decides member or guest, and no
 * points are claimed.
 */
export function confirmationVariant(dto: Pick<StorefrontOrderDetailDto, 'loyalty'>, signedIn: boolean): ConfirmationVariant {
  switch (dto.loyalty?.earningStatus) {
    case 'Earned':
      return 'member';
    case 'AccountSetupRequired':
      return 'setup';
    case 'AccountNotLinked':
      return 'guest';
    default:
      return signedIn ? 'member' : 'guest';
  }
}

/**
 * The summary's rows from what the order records. Aonik's order read does not
 * break out upgrades or a list delivery price, so this shows what it does
 * record (D11): the box at its amount, any other items, a discount, and the
 * delivery charged — the total less goods after discount, points and tax.
 * Never a struck "was" figure the order does not hold.
 */
export function confirmationRows(dto: StorefrontOrderDetailDto): ConfirmationRow[] {
  const rows: ConfirmationRow[] = [];
  const boxIndexes = new Set(dto.selections.map((selection) => selection.orderItemIndex ?? 0));
  const items = dto.items.map((item, index) => ({ ...item, index: item.itemIndex ?? index }));
  const box = items.find((item) => boxIndexes.has(item.index)) ?? items[0];

  if (box) {
    rows.push({
      key: 'box',
      label: dto.boxSize ? `${dto.boxSize}-dish box` : (box.name ?? 'Your box'),
      value: formatPriceExact(pence(box.amountIn)),
    });
  }
  // A charged delivery is an order item of its own: it is the Delivery row below, not an extra.
  const deliveryItem = items.find((item) => item.itemType === 'DeliveryFee');
  for (const item of items) {
    if (item === box || item === deliveryItem) continue;
    const quantity = item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : '';
    rows.push({ key: `item-${item.index}`, label: `${item.name ?? 'Extra'}${quantity}`, value: `+${formatPriceExact(pence(item.amountIn))}` });
  }
  if (dto.discountTotal > 0) {
    rows.push({
      key: 'discount',
      label: dto.discountCode ? `Discount (${dto.discountCode})` : 'Discount',
      value: `−${formatPriceExact(pence(dto.discountTotal))}`,
      tone: 'saving',
    });
  }
  const pointsValue = dto.loyalty?.appliedValue ?? 0;
  if (pointsValue > 0) {
    rows.push({ key: 'points', label: 'Points', value: `−${formatPriceExact(pence(pointsValue))}`, tone: 'saving' });
  }
  const deliveryPence = deliveryItem
    ? pence(deliveryItem.amountIn)
    : pence(dto.total) - (pence(dto.subtotal) - pence(dto.discountTotal) - pence(pointsValue) + pence(dto.taxTotal));
  const date = formatDeliveryDateShort(dto.delivery?.deliveryDate);
  rows.push({
    key: 'delivery',
    label: date ? `Delivery · ${date}` : 'Delivery',
    value: deliveryPence <= 0 ? 'Free' : formatPriceExact(deliveryPence),
    ...(deliveryPence <= 0 ? { tone: 'free' as const } : {}),
  });
  if (dto.taxTotal > 0) rows.push({ key: 'tax', label: 'Tax', value: formatPriceExact(pence(dto.taxTotal)) });
  return rows;
}

function toConfirmed(dto: StorefrontOrderDetailDto, signedIn: boolean): ConfirmedOrder {
  const address = dto.delivery?.address;
  const variant = confirmationVariant(dto, signedIn);
  const earned = dto.loyalty?.earnedPoints;
  return {
    orderNumber: dto.orderNumber ?? null,
    deliveryDate: dto.delivery?.deliveryDate ?? null,
    address: address ? [address.line1, address.line2, address.city, address.postcode].filter((line): line is string => Boolean(line)) : [],
    rows: confirmationRows(dto),
    total: formatPriceExact(pence(dto.total)),
    variant,
    // Never a points claim to a guest (SHOPPING-STATE §47), and only a figure Aonik gave.
    points: variant !== 'guest' && typeof earned === 'number' && earned > 0 ? earned : null,
  };
}

/**
 * The order in this browser's payment cookie, read back from Aonik: the order
 * and whether the customer is signed in, or null when there is nothing this
 * browser can read (no cookie, another account's order, a 404).
 */
export async function readPaymentOrder(): Promise<{ dto: StorefrontOrderDetailDto; signedIn: boolean; paymentIntentId: string } | null> {
  const paid = await readPaymentCookie();
  const config = readAonikConfig();
  if (!paid || !config) return null;
  const session = await currentSession();

  let dto: StorefrontOrderDetailDto;
  try {
    if (paid.guestOrderToken) {
      dto = await aonikFetch<StorefrontOrderDetailDto>(`/commerce/storefront/guest-orders/${encodeURIComponent(paid.orderId)}`, {
        baseUrl: config.baseUrl,
        tenantId: config.tenantId,
        policy: 'volatile',
        orderToken: paid.guestOrderToken,
      });
    } else if (session) {
      dto = await aonikAuthedFetch<StorefrontOrderDetailDto>(`/commerce/storefront/orders/${encodeURIComponent(paid.orderId)}`);
    } else {
      // A signed-in order, and no longer signed in: nothing here can read it.
      return null;
    }
  } catch (error) {
    // Missing, wrong or expired: the same 404 as no order at all, and said the same way.
    if (error instanceof AonikError && error.status === 404) return null;
    throw error;
  }
  return { dto, signedIn: Boolean(session), paymentIntentId: paid.paymentIntentId };
}

/** The order in this browser's payment cookie, read back from Aonik. */
export async function readConfirmation(): Promise<ConfirmationRead> {
  const found = await readPaymentOrder();
  if (!found) return { kind: 'none' };
  if (found.dto.paymentStatus !== 'Captured') return { kind: 'unpaid' };
  return { kind: 'paid', order: toConfirmed(found.dto, found.signedIn) };
}

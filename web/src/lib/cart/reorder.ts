/**
 * Order again: start a fresh box from a paid order's dishes.
 *
 * `POST /commerce/storefront/orders/{id}/reorder` rebuilds the order's food box
 * SERVER-SIDE from today's catalogue — every dish at its purchased quantity and
 * personalisation — as a NEW box owned by the signed-in customer, and reports
 * what it could not carry over (a dish now off the menu or short on stock is
 * flagged unavailable, and Step 2 already says so and swaps it out).
 *
 * What Aonik does not do, and so neither can this: merge into a box already in
 * progress (it answers 409 `commerce.active_box_exists`), carry a subset of the
 * dishes (the whole box is rebuilt; the customer removes any they don't want on
 * Step 2), or carry anything but food (no date, gift details, card or code).
 *
 * SERVER-ONLY.
 */

import { AONIK_CODES, AonikError } from '@/lib/aonik/errors';
import type { BoxCartDto } from '@/lib/aonik/dto';
import { mapBoxCart } from '@/lib/aonik/map';
import { AccountsUnavailableError, SessionExpiredError, aonikAuthedFetch } from '@/lib/auth/server';
import { clearPaymentCookie } from '@/lib/checkout/paymentCookie';

import { writeCartCookie } from './cartCookie';

export type ReorderOutcome =
  /** The new box is the customer's box now (its cookie is written). */
  | { status: 'started'; dishes: number; unavailable: number }
  /** A box is already in progress: Aonik holds one at a time. Nothing changed. */
  | { status: 'active-box' }
  /** Not a paid food box, or not this customer's (Aonik says the same for both). */
  | { status: 'not-reorderable' }
  /** No Aonik to ask (demo data). */
  | { status: 'unavailable' }
  /** Aonik could not be reached or refused for a reason that is not the customer's. */
  | { status: 'failed' };

export async function reorderOrder(orderId: string): Promise<ReorderOutcome> {
  let dto: BoxCartDto;
  try {
    dto = await aonikAuthedFetch<BoxCartDto>(`/commerce/storefront/orders/${encodeURIComponent(orderId)}/reorder`, {
      method: 'POST',
      forbiddenKeepsSession: true,
    });
  } catch (error) {
    if (error instanceof AccountsUnavailableError) return { status: 'unavailable' };
    if (error instanceof SessionExpiredError) throw error;
    if (error instanceof AonikError) {
      if (error.status === 409 && error.code === AONIK_CODES.activeBoxExists) return { status: 'active-box' };
      if (error.isNotFound || error.status === 400 || error.status === 422 || error.status === 403) {
        return { status: 'not-reorderable' };
      }
    }
    console.error('[cart] a reorder failed', error instanceof AonikError ? error.status : error);
    return { status: 'failed' };
  }

  // The box answers to the account's bearer; a token is stored only if Aonik disclosed one.
  await writeCartCookie({ cartId: dto.box.cartId, cartToken: dto.cartToken ?? undefined });
  // A new box ends the last one's confirmation (see `createBoxCart`).
  await clearPaymentCookie();

  const cart = mapBoxCart(dto);
  return {
    status: 'started',
    dishes: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
    unavailable: cart.lines.filter((line) => line.isUnavailable).length,
  };
}

/**
 * Order again: start a fresh box from a paid order's dishes.
 *
 * `POST /commerce/storefront/orders/{id}/reorder` rebuilds the order's food box
 * SERVER-SIDE from today's catalogue — every dish at its purchased quantity and
 * personalisation — as a NEW box owned by the signed-in customer, and reports
 * what it could not carry over (a dish now off the menu or short on stock is
 * flagged unavailable, and Step 2 already says so and swaps it out).
 *
 * The selection sheet submits only IDs from the owner-scoped purchased-row preview.
 * Creation rechecks today’s catalogue/stock and refuses an existing active box.
 * No date, gift details, card or code is copied into the new box.
 *
 * SERVER-ONLY.
 */

import { AONIK_CODES, AonikError } from '@/lib/aonik/errors';
import type { BoxCartDto } from '@/lib/aonik/dto';
import { mapBoxCart } from '@/lib/aonik/map';
import {
  AccountsUnavailableError,
  SessionExpiredError,
  aonikAuthedFetch,
} from '@/lib/auth/server';

import { readCartCookie, writeCartCookie } from './cartCookie';
import { getBoxCart } from './server';

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

/** Aonik's 400 for an order that can never be reordered (as opposed to a transient one). */
const PERMANENT_REFUSAL =
  /confirmed paid food box|incomplete|start a new box instead/i;

/**
 * Points this browser at the account's own active box when it holds none of its
 * own — so "View box" shows the box that is blocking an Order again, even one
 * started on another device. A GUEST box in this cookie is never replaced.
 */
async function recoverAccountBox(): Promise<void> {
  const cookie = await readCartCookie();
  if (cookie?.cartToken) return;
  try {
    const dto = await aonikAuthedFetch<BoxCartDto>(
      '/commerce/carts/box/current',
      { forbiddenKeepsSession: true },
    );
    if (dto.box.cartId !== cookie?.cartId)
      await writeCartCookie({ cartId: dto.box.cartId });
  } catch (error) {
    // Nothing to point at (404) or it could not be read: the message stands without the link's help.
    if (error instanceof SessionExpiredError) throw error;
  }
}

/** Whether this browser holds a GUEST box with dishes in it, which a reorder would orphan. */
async function holdsGuestBoxWithDishes(): Promise<boolean> {
  const cookie = await readCartCookie();
  if (!cookie?.cartToken) return false;
  try {
    const cart = await getBoxCart();
    return Boolean(cart && cart.lines.length > 0);
  } catch {
    return false;
  }
}

export async function reorderOrder(
  orderId: string,
  selections?: ReorderDishChoice[],
): Promise<ReorderOutcome> {
  // A guest box with dishes is "a box in progress" too, though Aonik does not count it:
  // starting another would overwrite the only token that reaches it.
  if (await holdsGuestBoxWithDishes()) return { status: 'active-box' };

  let dto: BoxCartDto;
  try {
    dto = await aonikAuthedFetch<BoxCartDto>(
      `/commerce/storefront/orders/${encodeURIComponent(orderId)}/reorder`,
      {
        method: 'POST',
        ...(selections ? { body: { selections } } : {}),
        forbiddenKeepsSession: true,
      },
    );
  } catch (error) {
    if (error instanceof AccountsUnavailableError)
      return { status: 'unavailable' };
    if (error instanceof SessionExpiredError) throw error;
    if (error instanceof AonikError) {
      if (
        error.status === 409 &&
        (error.code === AONIK_CODES.activeBoxExists ||
          error.code === AONIK_CODES.multipleActiveBoxes)
      ) {
        await recoverAccountBox();
        return { status: 'active-box' };
      }
      // Only what can never succeed is "can't be ordered again": a missing or foreign order,
      // or one that is not a complete paid food box. A 403, or a 400 that is not that
      // (the plan repriced mid-way, a catalogue fault), is a failure to try again.
      if (
        error.isNotFound ||
        ((error.status === 400 || error.status === 422) &&
          PERMANENT_REFUSAL.test(error.message))
      ) {
        return { status: 'not-reorderable' };
      }
    }
    console.error(
      '[cart] a reorder failed',
      error instanceof AonikError
        ? `${error.status} ${error.code ?? ''}`
        : error,
    );
    return { status: 'failed' };
  }

  // The box answers to the account's bearer; a token is stored only if Aonik disclosed one.
  // The previous order's confirmation pointer is left alone: an order paid in another tab
  // must still be able to reach its own confirmation.
  await writeCartCookie({
    cartId: dto.box.cartId,
    cartToken: dto.cartToken ?? undefined,
  });

  const cart = mapBoxCart(dto);
  return {
    status: 'started',
    dishes: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
    unavailable: cart.lines.filter((line) => line.isUnavailable).length,
  };
}

export interface ReorderDishChoice {
  selectionId: string;
  quantity: number;
}
export interface ReorderPreview {
  orderId: string;
  dishes: Array<{
    selectionId: string;
    name: string;
    quantity: number;
    personalisationSummary: string | null;
    isSignature: boolean;
    maxQuantity: number;
  }>;
}
export function previewReorder(orderId: string): Promise<ReorderPreview> {
  return aonikAuthedFetch(
    `/commerce/storefront/orders/${encodeURIComponent(orderId)}/reorder-preview`,
    { forbiddenKeepsSession: true },
  );
}

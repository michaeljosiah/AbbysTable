/**
 * Checkout's Aonik calls (aonik#344–#347, #355). SERVER-ONLY.
 *
 * Everything goes through `cartCall` — the cart cookie's token or the
 * signed-in owner proves the box is ours, as for every cart call — and every
 * write carries the version of the box the customer's tab last saw, so a stale
 * tab is refused (409) rather than overwriting a newer change.
 *
 * Three rules shape it:
 *
 *  - The draft is a FULL replacement on save. The form owns its purchaser,
 *    address and notes; everything else in the draft (the date, the code, the
 *    gift, the account choice, accepted terms) is read back and echoed as it
 *    stands, so saving a name never clears a date.
 *  - The date is written only through the reservation route, which holds
 *    capacity: a date in a draft save would reserve as a side effect.
 *  - A code is applied by Aonik at once (one per cart); the box is re-read
 *    afterwards so the summary shows Aonik's new components and total.
 */

import type {
  BoxCartDto,
  CartPaymentStateDto,
  CartDeliveryReservationDto,
  CartDiscountQuoteDto,
  CheckoutDraftDto,
  CheckoutDraftResponseDto,
} from '@/lib/aonik/dto';
import { mapBoxCart, type BoxCart } from '@/lib/aonik/map';
import { sessionNeedsRefresh } from '@/lib/auth/server';
import { CartMissingError } from '@/lib/cart/cartMissing';
import { readCartCookie } from '@/lib/cart/cartCookie';
import {
  cartCall,
  getBoxCart,
  readStoredBoxCart,
  type CartVersion,
} from '@/lib/cart/server';

import { detailsFromDraft, draftSections, type CheckoutDetails } from './form';
import { readReservation, type ReservationView } from './reservation';

/** Where `/box/checkout` stands for the stored box. */
export type CheckoutEntry =
  /**
   * The signed-in session must be renewed before the box can be read, and a
   * render cannot write the renewed cookie: the page has a route handler do it.
   */
  | { kind: 'session' }
  /** No box at all — or one Aonik expired: back to the start. */
  | { kind: 'none' }
  /** It became an order (here, or in another tab): SHOPPING-STATE §53. */
  | { kind: 'completed' }
  /** A payment attempt holds it: nothing on it can change until Aonik resolves it. */
  | { kind: 'payment' }
  /** Not full, or holding a dish that is no longer available: back to the dishes. */
  | { kind: 'incomplete' }
  | {
      kind: 'ready';
      cart: BoxCart;
      details: CheckoutDetails;
      reservation: ReservationView | null;
    };

/** The box with its draft and hold, as a tab re-syncs from after another tab's change. */
export interface CheckoutSync {
  cart: BoxCart;
  details: CheckoutDetails;
  reservation: ReservationView | null;
}

/** A write took, but the box could not be read back after it: the page must reload to show it. */
export class CheckoutReloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutReloadError';
  }
}

async function reservationOf(dto: BoxCartDto): Promise<ReservationView | null> {
  const draftDate = dto.checkoutDraft?.deliveryDate ?? null;
  try {
    return readReservation(
      await cartCall<CartDeliveryReservationDto>('/delivery-reservation'),
      draftDate,
    );
  } catch (error) {
    // Unknown is never "held": a date we cannot confirm is shown as one to choose again.
    console.error(
      '[checkout] the delivery reservation could not be read',
      error,
    );
    return readReservation(null, draftDate);
  }
}

/** The entry gate: what the page should show for the box in this browser. */
export async function loadCheckout(): Promise<CheckoutEntry> {
  // No box to find, whoever is signed in: nothing to renew a session for.
  if (!(await readCartCookie())) return { kind: 'none' };
  // Before any cart read: reading would try the refresh this render cannot keep.
  if (await sessionNeedsRefresh()) return { kind: 'session' };
  const dto = await readStoredBoxCart().catch((error: unknown) => {
    if (error instanceof CartMissingError) return null;
    throw error;
  });
  if (!dto) return { kind: 'none' };
  if (dto.status === 'CheckedOut') return { kind: 'completed' };
  if (dto.status && dto.status !== 'Open') return { kind: 'none' };
  if (dto.orderId) {
    // An attempt exists. Only once Aonik has proven it closed unpaid (recovery)
    // may the box change and pay again — with its date chosen afresh.
    const payment = await cartCall<CartPaymentStateDto>('/payment');
    if (!payment.canEdit) return { kind: 'payment' };
  }
  if (!dto.quote.isFull || dto.box.lines.some((line) => line.isUnavailable))
    return { kind: 'incomplete' };

  return {
    kind: 'ready',
    cart: mapBoxCart(dto),
    details: detailsFromDraft(dto.checkoutDraft),
    reservation: await reservationOf(dto),
  };
}

/**
 * The box, its draft and its hold as they are now — after a refused write, or
 * when the tab finds the box has moved on. Null when there is no open box;
 * `locked` while a payment attempt holds it.
 */
export async function readCheckoutSync(): Promise<
  (CheckoutSync & { locked: boolean }) | null
> {
  const dto = await readStoredBoxCart();
  if (!dto || (dto.status && dto.status !== 'Open')) return null;
  return {
    cart: mapBoxCart(dto),
    details: detailsFromDraft(dto.checkoutDraft),
    reservation: await reservationOf(dto),
    // An attempt holds the box until Aonik proves it closed unpaid (recovery).
    locked: dto.orderId
      ? !(await cartCall<CartPaymentStateDto>('/payment')).canEdit
      : false,
  };
}

/**
 * Saves the form's own sections. The rest of the draft is read first and sent
 * back unchanged — with the TAB's version, not the read's, so a change another
 * tab made in between is refused rather than overwritten.
 */
export async function saveCheckoutDetails(
  details: CheckoutDetails,
  version: CartVersion,
): Promise<{ version: string; details: CheckoutDetails }> {
  const current = await cartCall<CheckoutDraftResponseDto>('/checkout-draft');
  const saved: CheckoutDraftDto = current.draft ?? {};
  const body: CheckoutDraftDto = {
    giftCardDraft: saved.giftCardDraft ?? null,
    recipient: saved.recipient ?? null,
    deliveryDate: saved.deliveryDate ?? null,
    gift: saved.gift ?? null,
    createAccount: saved.createAccount ?? false,
    discountCode: saved.discountCode ?? null,
    acceptedTermsVersion: saved.acceptedTermsVersion ?? null,
    requestedPoints: saved.requestedPoints ?? 0,
    ...draftSections(details),
    ...(saved.gift?.giftIntent
      ? {
          recipient: {
            name: `${details.firstName} ${details.lastName}`.trim(),
            phone: details.phone,
          },
          purchaser: {
            email: details.email,
            firstName: saved.purchaser?.firstName ?? '',
            lastName: saved.purchaser?.lastName ?? '',
            phone: saved.purchaser?.phone ?? '',
          },
        }
      : {}),
  };
  const response = await cartCall<CheckoutDraftResponseDto>(
    '/checkout-draft',
    { method: 'PUT', body },
    version,
  );
  return {
    version: response.cartVersion,
    details: detailsFromDraft(response.draft),
  };
}

/**
 * The hold as it stands; reading it never extends it. With it, the box's
 * version as Aonik has it now — reported, never adopted: a version belongs to
 * the box, draft and hold a tab is showing, so a tab that finds it moved on
 * re-syncs all three (`readCheckoutSync`) instead of taking the number alone.
 */
export async function readCheckoutReservation(): Promise<{
  boxVersion: string;
  reservation: ReservationView | null;
}> {
  const dto = await cartCall<CartDeliveryReservationDto>(
    '/delivery-reservation',
  );
  return { boxVersion: dto.cartVersion, reservation: readReservation(dto) };
}

/** Chooses (or atomically replaces) the date, starting a fresh 15-minute hold. */
export async function reserveDeliveryDate(
  date: string,
  version: CartVersion,
): Promise<{ version: string; reservation: ReservationView | null }> {
  const dto = await cartCall<CartDeliveryReservationDto>(
    '/delivery-reservation',
    { method: 'PUT', body: { deliveryDate: date } },
    version,
  );
  return { version: dto.cartVersion, reservation: readReservation(dto) };
}

/**
 * The box after a code change, re-read for Aonik's own components — with the
 * WRITE's version, not the read's: a change another tab made in between is
 * then refused at the next write and re-synced, rather than taken without its
 * draft. A write that took but cannot be read back is said as such.
 */
async function boxAfter(
  write: Promise<{ cartVersion: string }>,
  saved: string,
): Promise<BoxCart> {
  const written = await write;
  let cart: BoxCart | null;
  try {
    cart = await getBoxCart();
  } catch (error) {
    if (error instanceof CartMissingError) throw error;
    console.error(
      '[checkout] the box could not be read back after a code change',
      error,
    );
    throw new CheckoutReloadError(
      `${saved} Reload the page to see your total.`,
    );
  }
  if (!cart) throw new CartMissingError();
  return { ...cart, version: written.cartVersion || cart.version };
}

/** Applies a code: Aonik checks it at once, and a refusal keeps the previous one. */
export function applyDiscountCode(
  code: string,
  version: CartVersion,
): Promise<BoxCart> {
  return boxAfter(
    cartCall<CartDiscountQuoteDto>(
      '/discount',
      { method: 'PUT', body: { code } },
      version,
    ),
    'Your code has been applied.',
  );
}

export function removeDiscountCode(version: CartVersion): Promise<BoxCart> {
  return boxAfter(
    cartCall<CartDiscountQuoteDto>('/discount', { method: 'DELETE' }, version),
    'Your code has been removed.',
  );
}

/** Save only the account/points choice, echoing the complete draft and the shown version. */
export async function saveCheckoutBenefits(
  input: { createAccount?: boolean; requestedPoints?: number },
  version: CartVersion,
): Promise<BoxCart> {
  const current = await cartCall<CheckoutDraftResponseDto>('/checkout-draft');
  const written = await cartCall<CheckoutDraftResponseDto>(
    '/checkout-draft',
    { method: 'PUT', body: { ...(current.draft ?? {}), ...input } },
    version,
  );
  const cart = await getBoxCart();
  if (!cart) throw new CartMissingError();
  // Keep the write’s version: a later read must not adopt another tab’s draft unseen.
  return { ...cart, version: written.cartVersion || cart.version };
}

/** Full gift codes stay in the request body; public state contains the backend mask only. */
export async function applyGiftTender(code: string, version: CartVersion): Promise<BoxCart> {
  const current = await getBoxCart();
  if (!current) throw new CartMissingError();
  return boxAfter(cartCall<{ cartVersion: string }>('/gift-card-tender', {
    method: 'PUT', body: { code, requestedAmount: current.quote.totalPence / 100 },
  }, version), 'Your gift card has been applied.');
}
export function removeGiftTender(version: CartVersion): Promise<BoxCart> {
  return boxAfter(cartCall<{ cartVersion: string }>('/gift-card-tender', { method: 'DELETE' }, version), 'Your gift card has been removed.');
}

/**
 * Server-side box cart operations.
 *
 * The ONLY module that touches both the cart cookie and Aonik's cart routes.
 * Route handlers call these; components never do. Everything here is
 * `no-store` — a cart response is never cacheable.
 *
 * SERVER-ONLY.
 */

import type { BoxCartDto, CheckoutResultDto } from '@/lib/aonik/dto';
import { AONIK_CODES, AonikError } from '@/lib/aonik/errors';
import { aonikFetch, type AonikFetchOptions } from '@/lib/aonik/http';
import {
  mapBoxCart,
  mapCheckoutResult,
  toMajor,
  type BoxCart,
  type CheckoutResult,
  type PersonalisationSelection,
} from '@/lib/aonik/map';
import { readAonikConfig } from '@/lib/aonik/dataMode';

import { isExpired, readSession } from '@/lib/auth/session';

import { clearCartCookie, readCartCookie, writeCartCookie } from './cartCookie';
import { writePlacedOrder, type PlacedOrder, type PlacedOrderLine } from './orderCookie';

/**
 * Raised when a cart route is called without a configured Aonik.
 *
 * Distinct from a generic failure so the handler can answer 503 with a reason:
 * in demo mode the cart is client-side and these routes are simply not the
 * path in use, which is a configuration fact rather than a bug to debug.
 */
export class CartUnavailableError extends Error {
  constructor() {
    super(
      'The server cart requires AONIK_API_URL and AONIK_TENANT_ID. This build is running on ' +
        'demo data, where the box is held client-side instead.',
    );
    this.name = 'CartUnavailableError';
  }
}

/** Live cart operations require a configured Aonik; demo mode never gets here. */
function connection(): { baseUrl: string; tenantId: string } {
  const config = readAonikConfig();
  if (!config) throw new CartUnavailableError();
  return config;
}

type CartFetchOptions = Omit<AonikFetchOptions, 'baseUrl' | 'tenantId' | 'policy'>;

async function cartFetch<T>(path: string, options: CartFetchOptions = {}): Promise<T> {
  return aonikFetch<T>(path, {
    ...connection(),
    // Cart traffic is never cached, on any verb.
    policy: 'volatile',
    ...options,
  });
}

export interface CartOperationResult {
  cart: BoxCart;
}

/**
 * Creates the box session and stores the token.
 *
 * `cartToken` is disclosed exactly once, in this response — if it is not
 * captured here it cannot be recovered, and the cart becomes unreachable.
 */
export async function createBoxCart(input: {
  bundleProductId: string;
  size: number;
  firstLine?: { productVariantId: string; quantity: number; personalisation?: PersonalisationSelection };
}): Promise<CartOperationResult> {
  const dto = await cartFetch<BoxCartDto>('/commerce/carts/box', {
    method: 'POST',
    body: {
      bundleProductId: input.bundleProductId,
      size: input.size,
      firstLine: input.firstLine,
    },
  });

  if (!dto.cartToken) {
    throw new Error(
      'Aonik created the cart without disclosing a token. The cart would be unreachable, so ' +
        'this is treated as a failure rather than stored half-formed.',
    );
  }

  await writeCartCookie({ cartId: dto.box.cartId, cartToken: dto.cartToken });
  return { cart: mapBoxCart(dto) };
}

/**
 * Runs an operation against the stored cart.
 *
 * A 404 means the cart is unknown OR not ours — Aonik makes those deliberately
 * indistinguishable, so the only safe response is to drop the cookie and let
 * the customer start again. No copy may speculate about which it was.
 */
async function withCart<T>(
  run: (cartId: string, auth: CartFetchOptions) => Promise<T>,
): Promise<T | null> {
  const cookie = await readCartCookie();
  if (!cookie) return null;

  try {
    return await run(cookie.cartId, await cartAuth(cookie.cartToken));
  } catch (error) {
    if (error instanceof AonikError && error.isNotFound) {
      await clearCartCookie();
      return null;
    }
    throw error;
  }
}

/**
 * How this cart proves it is ours: possession, identity, or both.
 *
 * Aonik takes two independent halves (`CartRequestAccess`) — the `X-Cart-Token`
 * header and the authenticated principal's party. Sending whichever we have is
 * what makes the transition seamless:
 *
 *  - guest         → token only, as before;
 *  - just adopted  → the token is dead and gone from the cookie, so the bearer
 *                    alone authorizes;
 *  - born signed-in → never had a token; Aonik stamped the buyer at creation.
 *
 * The bearer is attached WITHOUT `aonikAuthedFetch`, deliberately: that helper
 * throws when there is no session, and the overwhelmingly common case here is a
 * perfectly valid guest cart with no session at all. A session that cannot be
 * refreshed simply means "no bearer to add", never "this cart call fails".
 */
async function cartAuth(cartToken: string | undefined): Promise<CartFetchOptions> {
  const auth: CartFetchOptions = { cartToken };

  try {
    const session = await readSession();
    if (session && !isExpired(session)) auth.accessToken = session.accessToken;
  } catch {
    // No session, unreadable cookie — guest semantics, exactly as before.
  }

  return auth;
}

/** The current cart, or null when there is none (or it is no longer ours). */
export async function getBoxCart(): Promise<BoxCart | null> {
  const dto = await withCart((cartId, auth) =>
    cartFetch<BoxCartDto>(`/commerce/carts/${cartId}`, auth),
  );
  return dto ? mapBoxCart(dto) : null;
}

export async function addBoxLine(input: {
  productVariantId: string;
  quantity: number;
  personalisation?: PersonalisationSelection;
}): Promise<BoxCart | null> {
  const dto = await withCart((cartId, auth) =>
    cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/lines`, {
      ...auth,
      method: 'POST',
      body: input,
    }),
  );
  return dto ? mapBoxCart(dto) : null;
}

/**
 * Updates a line. `quantity: 0` deletes it; `applyToUnits` splits a
 * personalisation change across n of the line's units in ONE atomic call —
 * the two-line result is never assembled client-side.
 */
export async function updateBoxLine(
  lineId: string,
  input: { quantity?: number; personalisation?: PersonalisationSelection; applyToUnits?: number },
): Promise<BoxCart | null> {
  const dto = await withCart((cartId, auth) =>
    cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/lines/${lineId}`, {
      ...auth,
      method: 'PATCH',
      body: input,
    }),
  );
  return dto ? mapBoxCart(dto) : null;
}

export async function removeBoxLine(lineId: string): Promise<BoxCart | null> {
  const dto = await withCart((cartId, auth) =>
    cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/lines/${lineId}`, {
      ...auth,
      method: 'DELETE',
    }),
  );
  return dto ? mapBoxCart(dto) : null;
}

/**
 * Changes the box size. The price change is the plan's marginal cost
 * (`boxPrice(target) − boxPrice(current)`), computed server-side — it may bend
 * around preset price points and is never a flat per-dish figure.
 */
export async function setBoxSize(size: number): Promise<BoxCart | null> {
  const dto = await withCart((cartId, auth) =>
    cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/size`, {
      ...auth,
      method: 'PATCH',
      body: { size },
    }),
  );
  return dto ? mapBoxCart(dto) : null;
}

/** Adds an à-la-carte extra. Consumes no box space; lands in the `addOns` component. */
export async function addBoxExtra(input: {
  productVariantId: string;
  quantity: number;
  personalisation?: PersonalisationSelection;
}): Promise<BoxCart | null> {
  const dto = await withCart((cartId, auth) =>
    cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/extras`, {
      ...auth,
      method: 'POST',
      body: input,
    }),
  );
  return dto ? mapBoxCart(dto) : null;
}

/** Re-validates against the live catalogue before review (SPEC review-checkout). */
export async function continueBoxCart(): Promise<BoxCart | null> {
  const dto = await withCart((cartId, auth) =>
    cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/continue`, { ...auth, method: 'POST' }),
  );
  return dto ? mapBoxCart(dto) : null;
}

/**
 * The tenant's payment labels.
 *
 * Aonik validates only that these are non-empty — the vocabulary belongs to the
 * tenant's payment configuration, so they are configuration here too. The
 * defaults match the gateway the platform ships with (`ProviderCode => "Stripe"`).
 */
function paymentLabels(): { provider: string; paymentMethodType: string } {
  return {
    provider: process.env.AONIK_PAYMENT_PROVIDER?.trim() || 'Stripe',
    paymentMethodType: process.env.AONIK_PAYMENT_METHOD_TYPE?.trim() || 'card',
  };
}

/**
 * Places the order.
 *
 * Three things about this call shape the code around it:
 *
 *  1. It is NOT idempotent, and it is the one call in the journey that creates
 *     durable state (order, invoice, payment intent, stock reservation). It is
 *     therefore never retried automatically anywhere in this codebase.
 *  2. Drift throws 409 `commerce.box_drift` carrying the refreshed box, and
 *     Aonik persists the repair before throwing — so the resubmit is against
 *     saved state. The error propagates unchanged; the caller re-renders from
 *     `error.drift` and the customer confirms the change. That stop is the
 *     point (Spec 068 A18) and swallowing it would place an order the customer
 *     never agreed to.
 *  3. On success the cart is checked out and Aonik rejects further edits on it,
 *     so the cookie is cleared here — leaving it would strand the customer on a
 *     dead cart with no way back to an empty box.
 */
export async function checkoutBoxCart(input?: {
  returnUrl?: string;
  cancelUrl?: string;
  customerAccountId?: string;
  discountCode?: string;
}): Promise<CheckoutResult | null> {
  // The box is read BEFORE placing, because the checkout response carries only
  // totals — no lines. Once the cart is checked out this is the last chance to
  // see what was in it, and the confirmation page has no other source: Aonik's
  // order routes are authenticated and party-scoped, so an anonymous customer
  // can never read the order back. A drift 409 throws before the snapshot is
  // written, which is correct — nothing was placed.
  const placed = await getBoxCart();

  const dto = await withCart((cartId, auth) =>
    cartFetch<CheckoutResultDto>(`/commerce/carts/${cartId}/checkout`, {
      ...auth,
      method: 'POST',
      body: { ...paymentLabels(), ...input },
    }),
  );

  if (!dto) return null;

  const order = mapCheckoutResult(dto);
  await writePlacedOrder(snapshotOrder(order, placed, await earliestDeliveryDate()));
  await clearCartCookie();
  return order;
}

/**
 * The promise as it stood at placement, or undefined.
 *
 * Never re-resolved afterwards: the confirmation must keep saying what the
 * customer was told when they paid, even after the calendar has moved on.
 */
async function earliestDeliveryDate(): Promise<string | undefined> {
  try {
    const { getAonikClient } = await import('@/lib/aonik/client');
    const window = await (await getAonikClient()).getDeliveryWindow();
    return window?.earliestDeliveryDate;
  } catch {
    // A confirmation without a date is fine; a failed order because the
    // delivery config blipped is not.
    return undefined;
  }
}

/** Reduces the placed cart to the display-only fields the confirmation needs. */
function snapshotOrder(
  order: CheckoutResult,
  placed: BoxCart | null,
  deliveryDate: string | undefined,
): PlacedOrder {
  const toLine = (line: BoxCart['lines'][number]): PlacedOrderLine => ({
    name: line.name,
    quantity: line.quantity,
    detail: line.isDefaultPersonalisation ? undefined : line.personalisationSummary || undefined,
    pricePence: line.unitPricePence,
  });

  return {
    orderId: order.orderId,
    paymentStatus: order.paymentStatus,
    subtotalPence: order.subtotalPence,
    discountTotalPence: order.discountTotalPence,
    taxTotalPence: order.taxTotalPence,
    totalPence: order.totalPence,
    currency: order.currency,
    earliestDeliveryDate: deliveryDate,
    boxSize: placed?.size,
    dishes: (placed?.lines ?? []).filter((line) => line.kind !== 'AddOn').map(toLine),
    addOns: (placed?.lines ?? []).filter((line) => line.kind === 'AddOn').map(toLine),
  };
}

/**
 * Binds the guest box to the customer who just signed in.
 *
 * Called immediately after any successful sign-in or registration, and only
 * when a guest token still exists — a cart created while signed in is
 * party-bound from birth, so there is nothing to adopt.
 *
 * Every outcome is non-fatal to sign-in. Someone who has just typed their
 * password correctly must end up signed in; whether their half-built box came
 * with them is a lesser question, and no branch here may throw past it.
 *
 *  - **success** → the guest token is dead. It is dropped from the cookie (the
 *    `cartId` stays), after which the session bearer alone authorizes the cart.
 *    Keeping a dead token would mean sending a credential that can only fail.
 *  - **404** → unknown, expired, or already someone else's. Aonik makes these
 *    indistinguishable on purpose, so the cookie is cleared and no copy
 *    speculates about which it was.
 *  - **400 `commerce.storefront_validation`** → either the cart is no longer
 *    Open (it already became an order — order history carries it now) or the
 *    account has no customer profile to adopt into. Different facts, same
 *    response here: leave the cart alone and carry on.
 */
export async function adoptBoxCart(): Promise<'adopted' | 'nothing-to-adopt' | 'skipped'> {
  const cookie = await readCartCookie();
  // No cart, or one that already authorizes by session — nothing to do.
  if (!cookie?.cartToken) return 'nothing-to-adopt';

  const session = await readSession();
  if (!session || isExpired(session)) return 'nothing-to-adopt';

  try {
    await cartFetch<unknown>(`/commerce/carts/${cookie.cartId}/adopt`, {
      method: 'POST',
      cartToken: cookie.cartToken,
      accessToken: session.accessToken,
    });

    await writeCartCookie({ cartId: cookie.cartId });
    return 'adopted';
  } catch (error) {
    if (error instanceof AonikError && error.isNotFound) {
      await clearCartCookie();
      return 'skipped';
    }

    if (
      error instanceof AonikError &&
      error.status === 400 &&
      error.code === AONIK_CODES.storefrontValidation
    ) {
      return 'skipped';
    }

    // Anything else is a real fault, but it is still not worth failing a
    // sign-in over. Log it for us; say nothing to the customer.
    console.error('[cart] adoption failed unexpectedly', error);
    return 'skipped';
  }
}

/** Exposed for the money adapter's benefit in request bodies we may add later. */
export { toMajor };

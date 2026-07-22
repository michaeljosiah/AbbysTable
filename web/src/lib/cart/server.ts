/**
 * Server-side box cart operations.
 *
 * The ONLY module that touches both the cart cookie and Aonik's cart routes.
 * Route handlers call these; components never do. Everything here is
 * `no-store` — a cart response is never cacheable.
 *
 * SERVER-ONLY.
 */

import type { BoxCartDto } from '@/lib/aonik/dto';
import { AonikError } from '@/lib/aonik/errors';
import { aonikFetch, type AonikFetchOptions } from '@/lib/aonik/http';
import { mapBoxCart, toMajor, type BoxCart, type PersonalisationSelection } from '@/lib/aonik/map';
import { readAonikConfig } from '@/lib/aonik/dataMode';

import { clearCartCookie, readCartCookie, writeCartCookie } from './cartCookie';

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
    return await run(cookie.cartId, { cartToken: cookie.cartToken });
  } catch (error) {
    if (error instanceof AonikError && error.isNotFound) {
      await clearCartCookie();
      return null;
    }
    throw error;
  }
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

/** Exposed for the money adapter's benefit in request bodies we may add later. */
export { toMajor };

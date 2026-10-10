/**
 * Server-side box cart operations.
 *
 * The ONLY module that touches both the cart cookie and Aonik's cart routes.
 * Route handlers call these; components never do. Everything here is
 * `no-store` — a cart response is never cacheable.
 *
 * SERVER-ONLY.
 */

import type { BoxCartDto, BoxPlanDto, ProductDto } from '@/lib/aonik/dto';
import { AONIK_CODES, AonikError } from '@/lib/aonik/errors';
import { aonikFetch, type AonikFetchOptions } from '@/lib/aonik/http';
import {
  encodeSelection,
  mapBoxCart,
  mapOptionGroups,
  toMajor,
  type BoxCart,
  type MappedOptionGroup,
  type PersonalisationSelection,
  type StorefrontConfigDto,
} from '@/lib/aonik/map';
import { readAonikConfig } from '@/lib/aonik/dataMode';

import { currentSession } from '@/lib/auth/server';
import { isExpired, readSession } from '@/lib/auth/session';

import { clearCartCookie, readCartCookie, writeCartCookie } from './cartCookie';
import { CartMissingError, cartOrderedError } from './cartMissing';
import { cartExistsAfterProbe } from './convergence';
import { ORDERING_DISABLED_MESSAGE } from './ordering';
import { clearPaymentCookie } from '@/lib/checkout/paymentCookie';

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

/**
 * Raised by the payment start (`@/lib/checkout/payment`) while live ordering is
 * switched off.
 *
 * Checked on the server, not only in the button: the switch exists because an
 * order placed today is unpaid and undeliverable, so a request that skips the
 * Review page must be refused just the same. Nothing reaches Aonik.
 */
export class OrderingDisabledError extends Error {
  constructor() {
    super(ORDERING_DISABLED_MESSAGE);
    this.name = 'OrderingDisabledError';
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

  /*
   * A new box ends the last one's confirmation.
   *
   * The payment cookie names the order `/box/confirmation` reads back, and it
   * has to outlive the redirect from Stripe so a refresh still shows it. But a
   * customer who ordered and then started building again could otherwise open
   * the confirmation mid-build and be shown the PREVIOUS order as though it
   * were the box they were working on.
   *
   * Starting a box is the unambiguous moment that stops being true, so it is
   * cleared here rather than on read: clearing on read would lose the
   * confirmation to a refresh, which customers reliably do on that page.
   */
  await clearPaymentCookie();

  return { cart: mapBoxCart(dto) };
}

/**
 * Whether a box is finished for good: Aonik answers `status` on every box and
 * on a refused write, and only `Open` can change. `Abandoned` is a box its
 * sweeper expired (an empty one after 24 hours idle, a populated one after 7
 * days — while the cookie naming it lives 30); `CheckedOut` is one that became
 * an order. An absent status is an Aonik from before it reported one: Open.
 */
function isFinished(status: string | undefined): boolean {
  return status !== undefined && status !== 'Open';
}

/** What a finished box means to the tab: an order already placed, or simply no box. */
function finishedCartError(status: string | undefined): CartMissingError {
  return status === 'CheckedOut' ? cartOrderedError() : new CartMissingError();
}

/**
 * Runs an operation against the stored cart.
 *
 * A 404 about the CART means it is unknown OR not ours — Aonik makes those two
 * deliberately indistinguishable, so the only safe response is to drop the
 * cookie and reject with authoritative `cart: null`. It must not look like an
 * absent-cookie start: replacing a projected box inside the failed activation
 * would announce success for a mutation that never reached that box.
 *
 * But a cart route can 404 about something that is not the cart: a variant that
 * does not exist, a line already removed. Treating those the same way threw
 * away a full box over a bad product id, reported as a cheerful 200 with an
 * empty cart. Aonik returns the same bare 404 for both and only the message
 * differs, so rather than pattern-match English, ask the question directly —
 * re-read the cart, and let its answer decide. That costs one request on an
 * error path and is immune to how the message is worded.
 *
 * A write refused because the box is FINISHED (expired, or already an order)
 * is the same dead end as a missing cart: no retry can ever succeed against it,
 * so the cookie goes and the tab is told the box is gone — never "payment in
 * progress", which would leave the customer retrying for good.
 */
async function withCart<T>(
  run: (cartId: string, auth: CartFetchOptions) => Promise<T>,
  version?: string,
): Promise<T | null> {
  const cookie = await readCartCookie();
  if (!cookie) return null;

  const auth = await cartAuth(cookie.cartToken);

  // A box adopted into an account answers only to that account's bearer. With
  // no session (signed out, or lapsed) there is nothing to send: asking would
  // 404 and clear the cookie — the one way back to the box once the customer
  // signs in again. So there is simply no box to show until then.
  if (!cookie.cartToken && !auth.accessToken) return null;

  try {
    // Only a write carries the version: it is the precondition Aonik checks
    // before changing the box, and a read has nothing to check.
    return await run(cookie.cartId, version ? { ...auth, cartVersion: version } : auth);
  } catch (error) {
    if (error instanceof AonikError && error.isCartWriteRefused && isFinished(error.cartStatus)) {
      await clearCartCookie();
      throw finishedCartError(error.cartStatus);
    }

    if (!(error instanceof AonikError) || !error.isNotFound) throw error;

    if (await cartStillExists(cookie.cartId, auth)) {
      // The cart is fine; the 404 was about whatever the operation named.
      // Surfacing it keeps the box intact and the failure honest.
      throw error;
    }

    await clearCartCookie();
    throw new CartMissingError();
  }
}

/** Requires the cart rather than turning a missing/stale cart into a 200 no-op. */
async function withRequiredCart<T>(
  run: (cartId: string, auth: CartFetchOptions) => Promise<T>,
  version?: string,
): Promise<T> {
  const result = await withCart(run, version);
  if (result === null) throw new CartMissingError();
  return result;
}

/**
 * The version of the box a change is based on: the `version` of the cart the
 * customer's tab last adopted, sent with the request (`CART_VERSION_HEADER`).
 *
 * Every write below takes one and sends it to Aonik, which refuses the write
 * when it is missing or older than the box (409 `commerce.cart_conflict`) — so
 * a change made in a stale tab never lands blindly on a box that has moved on
 * (SHOPPING-STATE §53). It is never fetched here to make a write "just work":
 * that would defeat the precondition. Creating a box needs none.
 */
export type CartVersion = string | undefined;

/** Whether the cart still resolves for us; only Aonik not-found means gone. */
async function cartStillExists(cartId: string, auth: CartFetchOptions): Promise<boolean> {
  return cartExistsAfterProbe(() => cartFetch<BoxCartDto>(`/commerce/carts/${cartId}`, auth));
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
 *
 * An expired access token IS refreshed here (`currentSession`), though: an
 * adopted box answers only to its bearer, so without one the box would read
 * as gone — and the next size or dish would start a second box over it.
 */
async function cartAuth(cartToken: string | undefined): Promise<CartFetchOptions> {
  const auth: CartFetchOptions = { cartToken };
  const session = await currentSession();
  if (session) auth.accessToken = session.accessToken;
  return auth;
}

/**
 * The stored box as Aonik answers it, or null without one. Confirmed stale
 * carts reject. A FINISHED box (expired, or already an order) is no box at
 * all: its cookie is cleared and the answer is null — SHOPPING-STATE's "clear
 * stale draft, fresh ordering state" — so the tab never shows a box that every
 * change would be refused on.
 */
async function readBoxCart(): Promise<BoxCartDto | null> {
  const dto = await fetchBoxCart();
  if (dto && isFinished(dto.status)) {
    await clearCartCookie();
    return null;
  }
  return dto;
}

/** The stored box exactly as Aonik answers it, finished or not. */
function fetchBoxCart(): Promise<BoxCartDto | null> {
  return withCart((cartId, auth) => cartFetch<BoxCartDto>(`/commerce/carts/${cartId}`, auth));
}

/**
 * The stored box exactly as Aonik answers it, finished or not — for checkout's
 * entry gate (`/box/checkout`), which must tell an order already placed from no
 * box at all. Null without one.
 */
export function readStoredBoxCart(): Promise<BoxCartDto | null> {
  return fetchBoxCart();
}

/**
 * One Aonik call on the stored box (`/commerce/carts/{cartId}` + `path`),
 * proved ours as every cart call is — the checkout routes' way in
 * (`@/lib/checkout/server`). A write passes the version the tab's change is
 * based on; a box that is gone rejects with `CartMissingError`.
 */
export function cartCall<T>(
  path: string,
  options: Pick<CartFetchOptions, 'method' | 'body' | 'query' | 'signal'> = {},
  version?: CartVersion,
): Promise<T> {
  return withRequiredCart(
    (cartId, auth) => cartFetch<T>(`/commerce/carts/${cartId}${path}`, { ...options, ...auth }),
    version,
  );
}

/** The current cart, or null without one. Confirmed stale carts reject. */
export async function getBoxCart(): Promise<BoxCart | null> {
  const dto = await readBoxCart();
  return dto ? mapBoxCart(dto) : null;
}

/**
 * Product slug → the variant a box line is actually built from.
 *
 * Aonik's cart takes a VARIANT id, and a browse row carries none — the summary
 * DTO publishes `variantCount` and nothing else, so Step 2's grid genuinely
 * cannot know it. Sending the product id instead is not a near miss: Aonik
 * answers 404 "Product variant … was not found", which used to read as "this
 * cart is gone" and wiped the box.
 *
 * So the client sends the slug — the identifier it already uses in URLs — and
 * the translation to an Aonik id happens here, where every other Aonik id is
 * resolved. Read on the `catalog` policy because that is what it is: a
 * catalogue lookup, cacheable for the same window as the rest of the menu, not
 * cart state.
 */
async function resolveForCart(slug: string): Promise<{
  variantId: string;
  groups: MappedOptionGroup[];
}> {
  const product = await aonikFetch<ProductDto>(
    `/commerce/catalog/products/${encodeURIComponent(slug)}`,
    { ...connection(), policy: 'catalog' },
  );

  const variant = product.variants.find((candidate) => candidate.isActive) ?? product.variants[0];
  if (!variant) {
    throw new Error(
      `"${slug}" has no variant to add. A product with no variant cannot be put in a box; ` +
        'the catalogue needs fixing rather than this call retrying.',
    );
  }

  // The same read answers both questions, so encoding costs no extra request.
  return { variantId: variant.id, groups: mapOptionGroups(product.effectiveOptionGroups) };
}

export async function addBoxLine(input: {
  /** Public product slug; resolved to a variant id here. */
  slug: string;
  quantity: number;
  /**
   * Chosen option key per GROUP key (`{portion: 'full', heat: '3'}`), as the UI
   * holds them. Encoded here rather than client-side because encoding needs the
   * product's groups — `Multi` wants an array where `One` wants a bare string,
   * and an all-defaults selection must become `undefined` — and this is the
   * only side of the seam that knows them.
   */
  choices?: PersonalisationSelection;
}, version?: CartVersion): Promise<BoxCart | null> {
  const { variantId, groups } = await resolveForCart(input.slug);
  // The UI has already applied add policy: an all-default add sends no choices.
  // Once choices are present (custom add or edit), retain their complete canonical
  // shape so an explicit reset edit is not collapsed back into absence.
  const personalisation = input.choices
    ? encodeSelection(groups, input.choices, false)
    : undefined;

  const dto = await withCart(
    (cartId, auth) =>
      cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/lines`, {
        ...auth,
        method: 'POST',
        body: {
          productVariantId: variantId,
          quantity: input.quantity,
          personalisation,
        },
      }),
    version,
  );
  if (dto) return mapBoxCart(dto);

  /*
   * No cookie yet — and this call is one of the two ways a box can begin.
   *
   * "Add this dish to your box" on a dish page adds BEFORE Step 1: the customer
   * picks a dish, then chooses a size, and Step 1 greets them with "<dish> will
   * be added to your box". Without this branch that add answered 200 with a
   * null cart, the dish was silently dropped, and Step 1 showed an empty box —
   * so the dish they had just chosen was gone. It bites hardest right after an
   * order, when checkout has cleared the cookie and the next add is the first.
   *
   * Created at the plan's minimum size, which is what Step 1 preselects anyway;
   * choosing a bigger box there PATCHes the size and keeps the line.
   * `firstLine` exists on Aonik's create for exactly this — one call, so the
   * cart is never briefly empty.
   */
  const plan = await defaultBoxPlan();
  const created = await createBoxCart({
    bundleProductId: plan.bundleProductId,
    size: plan.minSize,
    firstLine: { productVariantId: variantId, quantity: input.quantity, personalisation },
  });
  return created.cart;
}

/**
 * Updates a line. `quantity: 0` deletes it; `applyToUnits` splits a
 * personalisation change across n of the line's units in ONE atomic call —
 * the two-line result is never assembled client-side.
 */
export async function updateBoxLine(
  lineId: string,
  input: { quantity?: number; personalisation?: PersonalisationSelection; applyToUnits?: number },
  version?: CartVersion,
): Promise<BoxCart> {
  const dto = await withRequiredCart(
    (cartId, auth) =>
      cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/lines/${lineId}`, {
        ...auth,
        method: 'PATCH',
        body: input,
      }),
    version,
  );
  return mapBoxCart(dto);
}

export async function removeBoxLine(lineId: string, version?: CartVersion): Promise<BoxCart> {
  const dto = await withRequiredCart(
    (cartId, auth) =>
      cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/lines/${lineId}`, {
        ...auth,
        method: 'DELETE',
      }),
    version,
  );
  return mapBoxCart(dto);
}

/**
 * Sets the box to `size`, creating the cart if this is the first step.
 *
 * Step 1 is where a box begins, so there is usually no cart yet. `withCart`
 * answers null when the cookie is absent, which made this a silent no-op that
 * still returned 200: the size never persisted, and every later step showed
 * "Choose your box size first" for a customer who had just chosen one. Creating
 * on demand makes the operation mean what its name says at any point in the
 * flow, rather than only after something else happened to create the cart.
 *
 * Which bundle to create is the tenant's `defaultBoxSlug`, resolved here rather
 * than passed in: the client has no business knowing Aonik product ids, and
 * this module is already the only place that talks to Aonik's cart routes.
 *
 * On an existing cart the price change is the plan's marginal cost
 * (`boxPrice(target) − boxPrice(current)`), computed server-side — it may bend
 * around preset price points and is never a flat per-dish figure.
 */
export async function setBoxSize(size: number, version?: CartVersion): Promise<BoxCart | null> {
  const dto = await withCart(
    (cartId, auth) =>
      cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/size`, {
        ...auth,
        method: 'PATCH',
        body: { size },
      }),
    version,
  );
  if (dto) return mapBoxCart(dto);

  // No cookie means the customer is starting a box. Confirmed stale carts throw
  // above so this activation cannot silently replace a previously projected box.
  const plan = await defaultBoxPlan();
  return (await createBoxCart({ bundleProductId: plan.bundleProductId, size })).cart;
}

/**
 * The tenant's box bundle plan, for the calls that may have to create a cart.
 *
 * Read through this module's own transport rather than the catalogue client:
 * only live mode reaches these routes at all (demo throws
 * `CartUnavailableError` in `connection()`), so routing through the shared
 * client would mean widening its interface with a method the mock could only
 * ever answer with a fabricated bundle id.
 */
async function defaultBoxPlan(): Promise<BoxPlanDto> {
  const config = await cartFetch<StorefrontConfigDto>('/commerce/config/storefront');
  if (!config.defaultBoxSlug) {
    throw new Error(
      'No defaultBoxSlug in the storefront config — the tenant has not named a box bundle, ' +
        'so there is nothing to create a cart from.',
    );
  }

  return cartFetch<BoxPlanDto>(
    `/commerce/catalog/products/${encodeURIComponent(config.defaultBoxSlug)}/box-plan`,
  );
}

/** Adds an à-la-carte extra. Consumes no box space; lands in the `addOns` component. */
export async function addBoxExtra(
  input: {
    productVariantId: string;
    quantity: number;
    personalisation?: PersonalisationSelection;
  },
  version?: CartVersion,
): Promise<BoxCart> {
  const dto = await withRequiredCart(
    (cartId, auth) =>
      cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/extras`, {
        ...auth,
        method: 'POST',
        body: input,
      }),
    version,
  );
  return mapBoxCart(dto);
}

/** Re-validates against the live catalogue before review (SPEC review-checkout). */
export async function continueBoxCart(version?: CartVersion): Promise<BoxCart> {
  const dto = await withRequiredCart(
    (cartId, auth) =>
      cartFetch<BoxCartDto>(`/commerce/carts/${cartId}/continue`, { ...auth, method: 'POST' }),
    version,
  );
  return mapBoxCart(dto);
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
 *  - **409 `commerce.box_choice_required`** → the account already holds a
 *    different box (Aonik #348). Choosing between them is SHOPPING-STATE §54's
 *    KEEP THIS BOX / USE SAVED BOX, not built yet (#14), so the guest box stays
 *    a guest box and nothing is lost. `cart_locked` / `cart_conflict` likewise:
 *    the box is mid-payment or changed as we read it, so adoption waits; and
 *    `box_choice_stale` / `multiple_active_boxes` are that same unbuilt choice.
 *  - **a finished guest box** (expired, or already an order) → nothing to bring
 *    along: its cookie is cleared, and adoption is not attempted.
 *
 * Adoption is a write, so it carries the box's version (#347). It is read here
 * first, from the guest box itself: unlike an edit, adoption changes who owns
 * the box, not what is in it, so there is no customer-seen state to protect.
 */
export async function adoptBoxCart(): Promise<'adopted' | 'nothing-to-adopt' | 'skipped'> {
  const cookie = await readCartCookie();
  // No cart, or one that already authorizes by session — nothing to do.
  if (!cookie?.cartToken) return 'nothing-to-adopt';

  const session = await readSession();
  if (!session || isExpired(session)) return 'nothing-to-adopt';

  try {
    const guest = await cartFetch<BoxCartDto>(`/commerce/carts/${cookie.cartId}`, {
      cartToken: cookie.cartToken,
    });
    if (isFinished(guest.status)) {
      await clearCartCookie();
      return 'skipped';
    }

    await cartFetch<unknown>(`/commerce/carts/${cookie.cartId}/adopt`, {
      method: 'POST',
      cartToken: cookie.cartToken,
      cartVersion: guest.cartVersion || undefined,
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

    if (
      error instanceof AonikError &&
      (error.isCartWriteRefused ||
        error.code === AONIK_CODES.boxChoiceRequired ||
        error.code === AONIK_CODES.boxChoiceStale ||
        error.code === AONIK_CODES.multipleActiveBoxes)
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

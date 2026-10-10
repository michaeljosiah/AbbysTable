/**
 * The mobile purchase bar once a box is ACTIVE: it stops selling and reports
 * the box — "6-dish box · £105 · VIEW BOX". Derived from the existing cart
 * (`useCart()`); no new store. No React here, so the rules are unit-tested.
 *
 * Sources: design/CLAUDE.md "Order in progress — at-order-state.js" and
 * "ACTIVE BOX — one shared rule", design/at-order-state.js (`isActive`,
 * `applyBar`). The shared shopping state (#14) owns everything the cart cannot
 * yet say — the furthest valid step, above all.
 */

import type { CartState, ExtraLine } from '@/lib/cart/CartProvider';
import type { ShoppingStatus } from '@/lib/shopping-state';
import { buildDemoQuote } from '@/lib/cart/quote';
import { formatPrice } from '@/lib/format';
import { BOX_BUILDER_PATH } from '@/lib/how-it-works/boxSizes';

import type { PurchaseBarOffer, PurchaseBarPricing } from './offer';

/** The cart, as far as the bar reads it — `useCart()` satisfies this. */
export interface BarCart extends Pick<CartState, 'boxSize' | 'isCustom' | 'lines'> {
  extras: ExtraLine[];
  hydrated: boolean;
  dishCount: number;
  isServerCart: boolean;
  quote: { totalPence: number } | null;
  /**
   * The shared shopping state (#14), when the cart has one: it decides whether
   * a box is active and where VIEW BOX goes. A cart without it (a test's plain
   * object) falls back to the bare rule below.
   */
  shopping?: Pick<ShoppingStatus, 'active' | 'resumeHref'>;
}

/**
 * ACTIVE BOX — the one shared rule (design/CLAUDE.md, `ATOrder.isActive`): a
 * box is active once it is COMMITTED (a size chosen at Step 1) or genuinely
 * holds a dish, a dish carried from a dish page included. Merely opening Step 1
 * commits nothing. Never true before the cart has hydrated, so the first render
 * always sells — the order state only ever adds information.
 */
export function isBoxActive(cart: Pick<BarCart, 'hydrated' | 'boxSize' | 'dishCount' | 'shopping'>): boolean {
  if (cart.shopping) return cart.hydrated && cart.shopping.active;
  return cart.hydrated && (cart.boxSize !== null || cart.dishCount > 0);
}

/** Where VIEW BOX goes: the shared state's furthest valid step, else the bare rule. */
export function resumeHrefFor(cart: Pick<BarCart, 'boxSize' | 'shopping'>): string {
  return cart.shopping?.resumeHref ?? boxResumeHref(cart.boxSize);
}

/**
 * Where an active box resumes: Step 1 while no size is committed (a dish
 * carried from a dish page), Step 2 once one is. The furthest valid step —
 * what the design's VIEW BOX promises — needs the shared shopping state (#14).
 */
export function boxResumeHref(boxSize: number | null): string {
  return boxSize === null ? BOX_BUILDER_PATH : `${BOX_BUILDER_PATH}/dishes`;
}

export interface ActiveBoxSummary {
  /** "6-dish box". */
  label: string;
  /** "£105", or null when this page cannot know the total. */
  total: string | null;
  /** VIEW BOX's destination. */
  href: string;
}

/**
 * The size an uncommitted box is shown at: Step 1's own preselection — its
 * first preset, else the plan minimum (BoxChooser) — so the bar never names a
 * different box from the page it links to.
 */
function displaySize(cart: BarCart, pricing: PurchaseBarPricing | null, offer: PurchaseBarOffer | null) {
  if (cart.boxSize !== null) return { size: cart.boxSize, isCustom: cart.isCustom };
  if (pricing) {
    const size = pricing.box.presets[0]?.dishCount ?? pricing.box.custom.minDishes;
    return { size, isCustom: !pricing.box.presets.some((preset) => preset.dishCount === size) };
  }
  return offer ? { size: offer.minDishes, isCustom: false } : null;
}

/**
 * The running total, in pence. Live: Aonik's quote, verbatim — never
 * recomputed. Demo: the checkout's own demo quote (`buildDemoQuote`, what
 * Review renders), so the bar and Review can never disagree on what the total
 * includes — delivery among it, as in live. Undefined when it cannot be known
 * here — no demo pricing, or a surcharge the client cannot price.
 */
export function boxTotalPence(
  cart: BarCart,
  pricing: PurchaseBarPricing | null,
  size: { size: number; isCustom: boolean } | null,
): number | undefined {
  if (cart.isServerCart) return cart.quote?.totalPence;
  if (!pricing || !size) return undefined;
  const quote = buildDemoQuote({
    state: { boxSize: size.size, isCustom: size.isCustom, lines: cart.lines, extras: cart.extras },
    pricing: pricing.box,
    extrasCatalogue: pricing.extras,
  });
  return quote?.totalPence;
}

/**
 * The bar's box summary, or null while no box is active. The band, height and
 * pill treatment stay the same — only what the bar says changes.
 */
export function activeBoxSummary(
  cart: BarCart,
  pricing: PurchaseBarPricing | null,
  offer: PurchaseBarOffer | null,
): ActiveBoxSummary | null {
  if (!isBoxActive(cart)) return null;
  const size = displaySize(cart, pricing, offer);
  const totalPence = boxTotalPence(cart, pricing, size);
  return {
    label: size ? `${size.size}-dish box` : 'Your box',
    total: totalPence === undefined ? null : formatPrice(totalPence),
    href: resumeHrefFor(cart),
  };
}

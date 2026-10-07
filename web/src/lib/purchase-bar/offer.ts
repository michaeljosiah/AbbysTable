/**
 * The mobile purchase bar's default offer — "Minimum 6 dishes / From £158" —
 * from the tenant's box plan. Data in, strings out; no React, and nothing
 * client-only, because the page resolves it server-side (`./data`).
 *
 * Source: frontend-backend-contract §2 (price). The active-box summary that
 * replaces the offer is `./activeBox`.
 */

import type { BoxPricing, Extra, StorefrontBoxPlan } from '@/lib/aonik/types';
import { formatPrice } from '@/lib/format';
import { buildBoxSizeModel } from '@/lib/how-it-works/boxSizes';

/* ---- The offer: "Minimum 6 dishes / From £158" ----------------------------- */

export interface PurchaseBarOffer {
  /** The plan's minimum box size — "Minimum 6 dishes". */
  minDishes: number;
  /** The price of a box at that minimum, or null when the plan publishes none. */
  fromPence: number | null;
}

/**
 * The bar's offer, from the tenant's box plan (`StorefrontConfig.box`) — the
 * editable price source contract §2 requires, so £158 can become £165 with no
 * frontend change. Read through the How it works size model so the bar and
 * that page's picker can never quote different floors: the same validation,
 * and "From" is a preset's price at exactly the minimum size or nothing — the
 * embedded plan carries no base price to compute one from.
 *
 * Null when there is no usable plan: the bar then shows its CTA alone rather
 * than a price that is not true.
 */
export function purchaseBarOffer(plan: StorefrontBoxPlan | null | undefined): PurchaseBarOffer | null {
  const model = buildBoxSizeModel(plan);
  if (model.minDishes === null) return null;
  const atMinimum = model.options.find(
    (option) => option.kind === 'preset' && option.dishes === model.minDishes,
  );
  return { minDishes: model.minDishes, fromPence: atMinimum?.pricePence ?? null };
}

/** The offer's two lines, formatted at the edge. */
export function offerLines(offer: PurchaseBarOffer): { minimum: string; from: string | null } {
  const { minDishes, fromPence } = offer;
  return {
    minimum: `Minimum ${minDishes} ${minDishes === 1 ? 'dish' : 'dishes'}`,
    from: fromPence === null ? null : `From ${formatPrice(fromPence)}`,
  };
}

/**
 * What a client-side (demo) box needs to be totalled: the box pricing and the
 * extras catalogue. Live mode needs neither — Aonik's quote is the total.
 */
export interface PurchaseBarPricing {
  box: BoxPricing;
  extras: Extra[];
}

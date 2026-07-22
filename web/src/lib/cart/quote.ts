'use client';

/**
 * One quote shape for both engines.
 *
 * In live mode the quote IS Aonik's, rendered verbatim. In demo mode there is
 * no server, so this file computes an equivalent one from local state — using
 * the same component keys, in the same order, so every money surface has a
 * single renderer rather than a branch on which engine is running.
 *
 * That is what "nothing client-side re-derives money" means in practice: the
 * derivation exists once, here, as the demo analogue of the server quote —
 * not scattered through five components.
 */

import { useMemo } from 'react';

import type { BoxQuote, BoxQuoteComponent } from '@/lib/aonik/map';
import type { BoxPricing, Extra } from '@/lib/aonik/types';

import { boxPricePence, extraUnitPence, useCart, type CartState } from './CartProvider';

/**
 * Human labels for quote component keys.
 *
 * Aonik emits `boxPrice`, `personalisation`, `unitSurcharges`, `addOns` and
 * `deliveryCharged`, plus `discount` and `tax` on a closed cart. `extraDishes`
 * is demo-only — live carts treat capacity as a hard ceiling, so there is
 * nothing to overflow.
 *
 * An unknown key falls back to the raw string rather than being dropped: a
 * component we have never seen must still show up with its money.
 */
const COMPONENT_LABELS: Record<string, string> = {
  boxPrice: 'Box',
  personalisation: 'Personalisation',
  unitSurcharges: 'Signature upgrades',
  addOns: 'Extras',
  extraDishes: 'Extra dishes',
  deliveryCharged: 'Delivery',
  discount: 'Discount',
  tax: 'Tax',
};

export function quoteComponentLabel(key: string): string {
  return COMPONENT_LABELS[key] ?? key;
}

/**
 * Splits a dish line's per-unit surcharge into its signature and
 * personalisation halves, so the demo quote can emit the same two components
 * Aonik does. A signature upgrade is the dish's own `upgradePence`; whatever
 * remains is personalisation.
 */
function splitSurcharges(
  state: CartState,
  signatureUpgradeFor: (dishId: string) => number,
): { signaturePence: number; personalisationPence: number } {
  let signaturePence = 0;
  let personalisationPence = 0;

  for (const line of state.lines) {
    const upgrade = signatureUpgradeFor(line.dishId);
    const perUnitPersonalisation = Math.max(0, line.surchargePence - upgrade);
    signaturePence += upgrade * line.quantity;
    personalisationPence += perUnitPersonalisation * line.quantity;
  }

  return { signaturePence, personalisationPence };
}

export interface DemoQuoteInput {
  state: CartState;
  pricing: BoxPricing;
  /** Catalogue for pricing add-on lines; omit when the surface has no extras. */
  extrasCatalogue?: Extra[];
  /** Per-dish signature upgrade, in pence. Absent dishes contribute nothing. */
  signatureUpgradeFor?: (dishId: string) => number;
}

/** The demo analogue of Aonik's quote, in Aonik's own component vocabulary. */
export function buildDemoQuote({
  state,
  pricing,
  extrasCatalogue = [],
  signatureUpgradeFor = () => 0,
}: DemoQuoteInput): BoxQuote {
  const boxSize = state.boxSize ?? 0;
  const boxPence = boxPricePence(state.boxSize, state.isCustom, pricing);
  const { signaturePence, personalisationPence } = splitSurcharges(state, signatureUpgradeFor);

  const dishCount = state.lines.reduce((total, line) => total + line.quantity, 0);
  const overflow = state.boxSize === null ? 0 : Math.max(0, dishCount - state.boxSize);
  const extraDishPence = overflow * pricing.extraDishPence;

  const byId = new Map(extrasCatalogue.map((extra) => [extra.id, extra]));
  let addOnsPence = 0;
  for (const line of state.extras) {
    const extra = byId.get(line.extraId);
    if (extra) addOnsPence += extraUnitPence(line, extra) * line.quantity;
  }

  const deliveryChargedPence = pricing.delivery?.pricePence ?? 0;

  // Same order Aonik emits, with zero-valued optional components omitted just
  // as it omits `addOns` when there are none.
  const components: BoxQuoteComponent[] = [{ key: 'boxPrice', amountPence: boxPence }];
  if (personalisationPence !== 0)
    components.push({ key: 'personalisation', amountPence: personalisationPence });
  if (signaturePence !== 0) components.push({ key: 'unitSurcharges', amountPence: signaturePence });
  if (addOnsPence !== 0) components.push({ key: 'addOns', amountPence: addOnsPence });
  if (extraDishPence !== 0)
    components.push({ key: 'extraDishes', amountPence: extraDishPence });
  components.push({ key: 'deliveryCharged', amountPence: deliveryChargedPence });

  return {
    components,
    deliveryListPence: pricing.delivery?.listPence ?? 0,
    // Σ components, matching Aonik's own A24 invariant — computed once here so
    // no surface ever sums them itself.
    totalPence: components.reduce((total, component) => total + component.amountPence, 0),
    currency: 'GBP',
    unitsSelected: dishCount,
    boxSize,
    spacesLeft: Math.max(0, boxSize - dishCount),
    isFull: boxSize > 0 && dishCount >= boxSize,
  };
}

/**
 * The quote for whichever engine is running.
 *
 * Live returns Aonik's verbatim; demo computes the equivalent. Either way the
 * caller renders `components` in order and `totalPence` as given.
 */
export function useCartQuote(
  pricing: BoxPricing,
  options: { extrasCatalogue?: Extra[]; signatureUpgradeFor?: (dishId: string) => number } = {},
): BoxQuote {
  const cart = useCart();
  const { extrasCatalogue, signatureUpgradeFor } = options;

  return useMemo(() => {
    if (cart.quote) return cart.quote;
    return buildDemoQuote({
      state: {
        boxSize: cart.boxSize,
        isCustom: cart.isCustom,
        lines: cart.lines,
        extras: cart.extras,
      },
      pricing,
      extrasCatalogue,
      signatureUpgradeFor,
    });
  }, [
    cart.quote,
    cart.boxSize,
    cart.isCustom,
    cart.lines,
    cart.extras,
    pricing,
    extrasCatalogue,
    signatureUpgradeFor,
  ]);
}

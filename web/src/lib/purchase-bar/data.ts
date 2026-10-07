/**
 * The mobile purchase bar's commerce data, resolved by the page that renders
 * the bar (server-side, once) and passed down — the bar never fetches.
 *
 * SERVER-ONLY: reads the data mode.
 *
 * Optional to the page, like How it works' pieces (`lib/how-it-works/
 * pageData.ts`): a marketing page must not become a 500 because Aonik is slow
 * or failing. No plan means a bar with its CTA and no price; no demo pricing
 * means an active box shows its label without a total.
 */

import { getAonikClient } from '@/lib/aonik/client';
import { resolveDataMode } from '@/lib/aonik/dataMode';
import type { StorefrontBoxPlan } from '@/lib/aonik/types';
import { resolveBoxPlan } from '@/lib/how-it-works/pageData';

import { purchaseBarOffer, type PurchaseBarOffer, type PurchaseBarPricing } from './offer';

export interface PurchaseBarData {
  /** "Minimum N dishes / From £x", or null when the tenant has no usable plan. */
  offer: PurchaseBarOffer | null;
  /**
   * Demo only: what a client-side box is totalled with. Null in live mode,
   * where the cart's own quote is the total and nothing here re-derives it.
   */
  pricing: PurchaseBarPricing | null;
}

const log = (message: string, error?: unknown) => {
  console.error(`[purchase-bar] ${message}`, error ?? '');
};

/**
 * @param options.plan — the box plan when the page already holds it (How it
 *   works reads it for its size picker), so it is not fetched twice. `null`
 *   means "the page looked and there is none"; omit it to have it read here.
 */
export async function getPurchaseBarData(
  options: { plan?: StorefrontBoxPlan | null } = {},
): Promise<PurchaseBarData> {
  try {
    const [client, { mode }] = await Promise.all([getAonikClient(), resolveDataMode()]);

    const [plan, pricing] = await Promise.all([
      options.plan !== undefined ? options.plan : resolveBoxPlan(client, log),
      mode === 'demo'
        ? Promise.all([client.getBoxPricing(), client.getExtras()])
            .then(([box, extras]): PurchaseBarPricing => ({ box, extras }))
            .catch((error: unknown) => {
              log('demo pricing unavailable; an active box shows no total', error);
              return null;
            })
        : null,
    ]);

    return { offer: purchaseBarOffer(plan), pricing };
  } catch (error) {
    log('bar data unavailable; the bar shows its CTA alone', error);
    return { offer: null, pricing: null };
  }
}

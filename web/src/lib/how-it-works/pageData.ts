/**
 * How the /how-it-works page resolves its two pieces of commerce data, each
 * of which is OPTIONAL to the page: the box plan behind the size picker and
 * the example dish. A marketing page must not become a 500 because Aonik is
 * slow or failing, so each piece degrades on its own — no plan means a picker
 * with no sizes or prices (just the way in to Choose Box), no dish means no
 * example card — and the failure is logged for the operator.
 *
 * Takes the client as a parameter (type-only import) so the rules are
 * unit-tested with a stand-in (tests/how-it-works.test.tsx).
 */

import type { AonikClient } from '@/lib/aonik/client';
import type { Dish, StorefrontBoxPlan } from '@/lib/aonik/types';

/** Where failures are reported. Injected so tests can capture them. */
export type PageDataLog = (message: string, error?: unknown) => void;

const defaultLog: PageDataLog = (message, error) => {
  console.error(`[how-it-works] ${message}`, error ?? '');
};

/**
 * At most this many featured dishes are tried, one detail read at a time,
 * when the editorial slug does not resolve. Normally the first succeeds, so
 * this is one extra read; the cap bounds the page when it does not.
 */
export const FEATURED_FALLBACK_ATTEMPTS = 3;

/** The tenant's box plan, or undefined (and logged) when it cannot be read. */
export async function resolveBoxPlan(
  client: Pick<AonikClient, 'getStorefrontConfig'>,
  log: PageDataLog = defaultLog,
): Promise<StorefrontBoxPlan | undefined> {
  try {
    return (await client.getStorefrontConfig()).box;
  } catch (error) {
    log('storefront config unavailable; the size picker renders without sizes or prices', error);
    return undefined;
  }
}

/**
 * The example dish, always from a successful DETAIL read — never a browse
 * summary, which omits figures the dish does publish and would make the card
 * say "not yet published" about them.
 *
 * 1. The editorial slug (`HOW_IT_WORKS_EXAMPLE_DISH_SLUG`).
 * 2. If that is not in the catalogue (a 404), the featured collection is
 *    listed in its curated order — one cheap browse, used only for its slugs —
 *    and its dishes are detail-read one at a time, stopping at the first that
 *    resolves, at most `FEATURED_FALLBACK_ATTEMPTS` of them.
 * 3. Otherwise null: the page omits the card.
 *
 * Any Aonik error ends the search at once (logged, null): it is a fault, not
 * a missing dish, and further reads would only add latency to a failing page.
 */
export async function resolveExampleDish(
  client: Pick<AonikClient, 'getDishBySlug' | 'listProducts'>,
  options: { slug: string; featuredCollection: string },
  log: PageDataLog = defaultLog,
): Promise<Dish | null> {
  try {
    const named = await client.getDishBySlug(options.slug);
    if (named) return named;

    const featured = await client.listProducts({
      collection: options.featuredCollection,
      // The collection's curated order, so the fallback is the rail's lead dish.
      sort: 'rank',
      page: 1,
      pageSize: FEATURED_FALLBACK_ATTEMPTS,
    });

    for (const candidate of featured.dishes.slice(0, FEATURED_FALLBACK_ATTEMPTS)) {
      const dish = await client.getDishBySlug(candidate.slug);
      if (dish) return dish;
    }

    log(`no example dish: '${options.slug}' and the first featured dishes did not resolve`);
    return null;
  } catch (error) {
    log('example dish unavailable; the page renders without the example card', error);
    return null;
  }
}

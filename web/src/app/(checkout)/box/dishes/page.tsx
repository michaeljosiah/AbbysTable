import type { Metadata } from 'next';
import Link from 'next/link';

import { BoxSummary } from '@/components/checkout/BoxSummary';
import { DishPicker } from '@/components/checkout/DishPicker';
import { getAonikClient } from '@/lib/aonik/client';
import { formatDeliveryDate } from '@/lib/format';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: "Add dishes to your box — Abby's Table",
  description:
    'Choose your dishes from the menu and personalise to your table as required. Portion, protein, side and heat — your way.',
};

/**
 * Step 2 of the box builder.
 *
 * The catalogue, box pricing and personalisation options are resolved here so
 * the full dish grid is in the initial HTML; only the box itself (which lives in
 * `CartProvider`) is client state, owned by `DishPicker` and `BoxSummary`.
 */
export default async function BoxDishesPage() {
  const client = await getAonikClient();

  // `heating` feeds the shared DishInfoPanels inside the personaliser, so the
  // dialog states allergen and reheating facts from the catalogue rather than
  // repeating them locally.
  const [dishes, pricing, delivery, heating] = await Promise.all([
    client.getDishes(),
    client.getBoxPricing(),
    client.getDeliveryWindow(),
    client.getHeatingInstructions(),
  ]);

  /*
   * Per-dish option groups, because Aonik has no catalogue-wide ones.
   *
   * There is no catalogue-wide option endpoint. Groups are attached per product with a per-product default
   * (each dish's own heat level, for one), which is also more faithful than a
   * shared set would be.
   *
   * One catalogue read per dish, in parallel and on the `catalog` cache policy,
   * so they collapse to nothing on repeat renders. A dish whose groups fail to
   * load yields no groups rather than taking the page down, and the UI omits
   * what it cannot offer.
   */
  const optionGroupsBySlug = Object.fromEntries(
    await Promise.all(
      dishes.map(async (dish) => {
        const groups = await client.getDishOptionGroups(dish.slug).catch(() => []);
        return [dish.slug, groups] as const;
      }),
    ),
  );

  return (
    <div className={styles.page}>
      <Link href="/box" className={styles.back}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        <span>Back to choose box</span>
      </Link>

      <div className={styles.shell}>
        <div className={styles.column}>
          {/* Bespoke sizes from the checkout template, as on Step 1. */}
          <span className={styles.eyebrow}>Step 2 of 5</span>
          <h1 className={styles.heading}>Add dishes to your box</h1>
          <p className={styles.intro}>
            Choose your dishes from the menu and personalise to your table as required.
          </p>
          <p className={styles.flavour}>
            Flavour built from real food.{' '}
            <span className={styles.flavourSoft}>Never a bouillon, stock cube or additive.</span>
          </p>

          <DishPicker
            dishes={dishes}
            pricing={pricing}
            optionGroupsBySlug={optionGroupsBySlug}
            heating={heating}
          />
        </div>

        <aside className={styles.aside} aria-label="Your box">
          <BoxSummary
            dishes={dishes}
            pricing={pricing}
            optionGroupsBySlug={optionGroupsBySlug}
            earliestDeliveryLabel={formatDeliveryDate(delivery?.earliestDeliveryDate)}
          />
        </aside>
      </div>
    </div>
  );
}

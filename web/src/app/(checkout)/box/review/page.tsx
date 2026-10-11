import type { Metadata } from 'next';
import { FlowBack } from '@/components/checkout/ReviewReturn';

import { ReviewStep } from '@/components/checkout/ReviewStep';
import { getAonikClient } from '@/lib/aonik/client';
import { formatDeliveryDate } from '@/lib/format';

import styles from '@/components/checkout/Flow.module.css';

export const metadata: Metadata = {
  title: "Review your order — Abby's Table",
  description: 'Check everything over, then continue to checkout.',
};

/** Step 4 of the box builder: review dishes, extras and the order summary. */
export default async function BoxReviewPage() {
  const client = await getAonikClient();

  const [dishes, extras, pricing, delivery, heating] = await Promise.all([
    client.getDishes(),
    client.getExtras(),
    client.getBoxPricing(),
    client.getDeliveryWindow(),
    client.getHeatingInstructions(),
  ]);

  // Authored portion labels for the read-only dish summary.
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
      <FlowBack step="review" className={styles.back} />

      <ReviewStep
        dishes={dishes}
        extras={extras}
        pricing={pricing}
        optionGroupsBySlug={optionGroupsBySlug}
        heating={heating}
        earliestDeliveryLabel={formatDeliveryDate(delivery?.earliestDeliveryDate)}
        heading={
          <>
            <h1 className={styles.heading}>Review your order</h1>
            <p className={styles.intro}>Check everything over, then continue to checkout.</p>
          </>
        }
      />
    </div>
  );
}

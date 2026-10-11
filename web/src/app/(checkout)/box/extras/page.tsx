import type { Metadata } from 'next';
import { FlowBack } from '@/components/checkout/ReviewReturn';

import { ExtrasStep } from '@/components/checkout/ExtrasStep';
import { getAonikClient } from '@/lib/aonik/client';
import { formatDeliveryDate } from '@/lib/format';

import styles from '@/components/checkout/Flow.module.css';

export const metadata: Metadata = {
  title: "Add extras — Abby's Table",
  description:
    'Small chops, sides, drinks and more to round out your table. Each is priced individually and added on top of your box.',
};

/**
 * Step 3 of the box builder: à-la-carte extras.
 *
 * Optional by design — the whole page can be skipped straight to review. The
 * extras catalogue resolves here; selection lives in the cart's extras lines.
 */
export default async function BoxExtrasPage() {
  const client = await getAonikClient();

  const [extras, pricing, delivery, dishes] = await Promise.all([
    client.getExtras(),
    client.getBoxPricing(),
    client.getDeliveryWindow(),
    client.getDishes(),
  ]);

  const optionGroupsBySlug = Object.fromEntries(await Promise.all(dishes.map(async (dish) => [dish.slug, await client.getDishOptionGroups(dish.slug).catch(() => [])])));
  return (
    <div className={styles.page}>
      <FlowBack step="extras" className={styles.back} />

      <ExtrasStep
        extras={extras}
        dishes={dishes}
        optionGroupsBySlug={optionGroupsBySlug}
        pricing={pricing}
        earliestDeliveryLabel={formatDeliveryDate(delivery?.earliestDeliveryDate)}
        heading={
          <>
            <h1 className={styles.heading}>
              Extras <span className={styles.optional}>Optional</span>
            </h1>
            <p className={styles.intro}>Add sides, snacks, drinks and sauces to your box, or skip straight to review.</p>
          </>
        }
      />
    </div>
  );
}

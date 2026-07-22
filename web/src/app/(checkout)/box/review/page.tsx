import type { Metadata } from 'next';
import Link from 'next/link';

import { ReviewStep } from '@/components/checkout/ReviewStep';
import { getAonikClient } from '@/lib/aonik/client';
import { formatDeliveryDate } from '@/lib/format';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: "Review your order — Abby's Table",
  description: 'Check everything over, then continue to checkout.',
};

/** Step 4 of the box builder: review dishes, extras and the order summary. */
export default async function BoxReviewPage() {
  const client = await getAonikClient();

  // `heating` feeds the shared info panels inside the edit-personalisation
  // modal, exactly as on Step 2.
  const [dishes, extras, pricing, personalisation, delivery, heating] = await Promise.all([
    client.getDishes(),
    client.getExtras(),
    client.getBoxPricing(),
    client.getPersonalisationOptions(),
    client.getDeliveryWindow(),
    client.getHeatingInstructions(),
  ]);

  return (
    <div className={styles.page}>
      <Link href="/box/extras" className={styles.back}>
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
        <span>Back to extras</span>
      </Link>

      <ReviewStep
        dishes={dishes}
        extras={extras}
        pricing={pricing}
        personalisation={personalisation}
        heating={heating}
        earliestDeliveryLabel={formatDeliveryDate(delivery.earliestDeliveryDate)}
        heading={
          <>
            <span className={styles.eyebrow}>Step 4 of 5</span>
            <h1 className={styles.heading}>Review your order</h1>
            <p className={styles.intro}>
              Tap a dish to see its details and tweak how it&rsquo;s made.
            </p>
            <p className={styles.introMobile}>
              Check everything over, then continue to checkout.
            </p>
          </>
        }
      />
    </div>
  );
}

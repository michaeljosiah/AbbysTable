import type { Metadata } from 'next';
import Link from 'next/link';

import { ExtrasStep } from '@/components/checkout/ExtrasStep';
import { getAonikClient } from '@/lib/aonik/client';
import { formatDeliveryDate } from '@/lib/format';

import styles from './page.module.css';

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

  const [extras, pricing, personalisation, delivery] = await Promise.all([
    client.getExtras(),
    client.getBoxPricing(),
    client.getPersonalisationOptions(),
    client.getDeliveryWindow(),
  ]);

  return (
    <div className={styles.page}>
      <Link href="/box/dishes" className={styles.back}>
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
        <span>Back to add dishes</span>
      </Link>

      <ExtrasStep
        extras={extras}
        pricing={pricing}
        personalisation={personalisation}
        earliestDeliveryLabel={formatDeliveryDate(delivery?.earliestDeliveryDate)}
        heading={
          <>
            <span className={styles.eyebrow}>Step 3 of 5</span>
            <h1 className={styles.heading}>
              Add extras <span className={styles.optional}>(optional)</span>
            </h1>
            <p className={styles.intro}>
              Small chops, sides, drinks and more to round out your table. Each is priced
              individually and added on top of your box — add as many as you like, or skip
              straight to review.
            </p>
            <p className={styles.introMobile}>
              Add as many extras as you like, or skip straight to review.
            </p>
          </>
        }
      />
    </div>
  );
}

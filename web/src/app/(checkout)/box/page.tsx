import type { Metadata } from 'next';
import Link from 'next/link';

import { BoxChooser } from '@/components/checkout/BoxChooser';
import { getAonikClient } from '@/lib/aonik/client';
import { formatDeliveryDate } from '@/lib/format';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: "Choose your box — Abby's Table",
  description: "Pick a set box or build your own. You'll add the rest of your dishes next.",
};

/**
 * Step 1 of the box builder.
 *
 * Server Component: box pricing and the delivery window are resolved here and
 * handed to `BoxChooser`, which owns the selection. Prices, dish counts and
 * savings are never written into the markup by hand — every figure on this page
 * comes out of `BoxPricing`, so a change in Aonik lands without a code edit.
 *
 * The step heading is built here rather than in the client component so the
 * static copy stays out of the client bundle; `BoxChooser` slots it into the
 * left column, where the template puts it, level with the summary card.
 */
export default async function ChooseBoxPage() {
  const client = await getAonikClient();

  const [pricing, delivery] = await Promise.all([
    client.getBoxPricing(),
    client.getDeliveryWindow(),
  ]);

  return (
    <div className={styles.page}>
      <Link href="/menu" className={styles.back}>
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
        <span>Back to menu</span>
      </Link>

      <BoxChooser
        pricing={pricing}
        earliestDeliveryLabel={formatDeliveryDate(delivery.earliestDeliveryDate)}
        heading={
          <div className={styles.stepHeading}>
            {/* Bespoke sizes from the checkout template (50px display, 13px
                eyebrow at .18em) — the site-wide Eyebrow/SectionHeading scale
                doesn't apply here. */}
            <span className={styles.stepEyebrow}>Step 1 of 5</span>
            <h1 className={styles.heading}>Choose your box</h1>
            <p className={styles.intro}>
              Pick a set box or build your own. You&apos;ll add the rest of your dishes next.
            </p>
          </div>
        }
      />
    </div>
  );
}

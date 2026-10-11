import type { Metadata } from 'next';

import { BackLink } from '@/components/checkout/BackLink';
import { BoxChooser } from '@/components/checkout/BoxChooser';
import { BoxPostcodeCheck } from '@/components/checkout/BoxPostcodeCheck';
import { getAonikClient } from '@/lib/aonik/client';
import { entrySizeFromLink, resolveEntrySize } from '@/lib/box/entry';
import { upcomingDeliveryDate } from '@/lib/delivery/checker';
import { formatDeliveryDate } from '@/lib/format';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: "Build your box — Abby's Table",
  description:
    "Choose a set box size or set your own quantity. You'll add your dishes next.",
};

/**
 * Step 1 of the box builder (Choose Box v2).
 *
 * Server Component: box pricing, the delivery window and the entry size are
 * resolved here and handed to `BoxChooser`, which owns the selection. Prices,
 * dish counts and savings are never written into the markup by hand — every
 * figure on this page comes out of `BoxPricing`, so a change in Aonik lands
 * without a code edit.
 *
 * `?dishes=6|12|18|custom` (How it works, contract §4c) preselects the size; a
 * missing or unknown value falls back to the first tier, never an error. The
 * postcode check renders only where a coverage lookup can answer
 * (`AonikClient.coverage`) — otherwise there is no check, and nothing is faked.
 */
export default async function ChooseBoxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await getAonikClient();
  const { dishes } = await searchParams;

  const [pricing, delivery, extras] = await Promise.all([
    client.getBoxPricing(),
    client.getDeliveryWindow(),
    client.getExtras(),
  ]);
  const initialSize = resolveEntrySize(
    dishes,
    pricing.presets,
    pricing.custom.minDishes,
  );

  return (
    <div className={styles.page}>
      <div className={styles.backbar}>
        <BackLink href="/menu" className={styles.back}>
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
          <span>Back</span>
        </BackLink>
      </div>

      {client.coverage ? <BoxPostcodeCheck /> : null}

      <div className={styles.body}>
        <BoxChooser
          pricing={pricing}
          extras={extras}
          earliestDeliveryLabel={formatDeliveryDate(
            upcomingDeliveryDate(delivery?.earliestDeliveryDate),
          )}
          initialSize={initialSize}
          sizeFromLink={entrySizeFromLink(
            dishes,
            pricing.presets,
            pricing.custom.minDishes,
          )}
          heading={
            <div className={styles.stepHeading}>
              {/* The progress band above already says "Step 1 of 5". */}
              <h1 className={styles.heading}>Build your box</h1>
              <p className={styles.intro}>
                Choose a set box size or set your own quantity. You&apos;ll add
                your dishes next.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}

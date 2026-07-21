import type { Metadata } from 'next';

import { FlavourBand } from '@/components/menu/FlavourBand';
import { MenuBrowser } from '@/components/menu/MenuBrowser';
import { Eyebrow, SectionHeading } from '@/components/ui';
import { getMenuPageData } from '@/lib/aonik/client';
import { formatDeliveryDate } from '@/lib/format';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: "Menu — Abby's Table",
  description:
    'The full Abby’s Table menu. Chef-prepared Nigerian dishes, cooked to order in small batches and delivered chilled UK-wide. Filter by protein, spice, wellness goal, meal type, dietary need or calories.',
};

export default async function MenuPage() {
  const { dishes, delivery } = await getMenuPageData();
  const earliestDeliveryLabel = formatDeliveryDate(delivery.earliestDeliveryDate);

  return (
    <>
      <section className={styles.intro}>
        <Eyebrow tone="brass" align="center">
          What&apos;s on the table?
        </Eyebrow>
        <SectionHeading level={1} as="h1" align="center" className={styles.heading}>
          Menu
        </SectionHeading>
        <p className={styles.lead}>
          Cooked to order in small batches.
          <br />
          Earliest UK-wide delivery:{' '}
          <span className={styles.delivery}>{earliestDeliveryLabel}</span>
        </p>
      </section>

      <section className={styles.dishes}>
        <div className={styles.inner}>
          <MenuBrowser dishes={dishes} />
        </div>
      </section>

      <FlavourBand />
    </>
  );
}

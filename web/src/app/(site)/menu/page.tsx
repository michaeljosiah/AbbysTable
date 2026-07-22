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

/** How many dishes the grid shows before "Load more". */
const DEFAULT_LIMIT = 6;

interface MenuPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  // `facet.<key>=v1,v2` — the same wire format Aonik takes, so the URL, the
  // client call and the API all speak one language.
  const filters: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(params)) {
    if (!key.startsWith('facet.')) continue;
    const values = (first(raw) ?? '').split(',').filter(Boolean);
    if (values.length) filters[key.slice('facet.'.length)] = values;
  }

  const query = first(params.q) ?? '';
  const parsedLimit = Number.parseInt(first(params.limit) ?? '', 10);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 200) : DEFAULT_LIMIT;

  const { dishes, totalCount, facetGroups, delivery } = await getMenuPageData({
    filters,
    query,
    limit,
  });
  const earliestDeliveryLabel = formatDeliveryDate(delivery?.earliestDeliveryDate);

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
          {earliestDeliveryLabel ? (
            <>
              <br />
              Earliest UK-wide delivery:{' '}
              <span className={styles.delivery}>{earliestDeliveryLabel}</span>
            </>
          ) : null}
        </p>
      </section>

      <section className={styles.dishes}>
        <div className={styles.inner}>
          <MenuBrowser
            dishes={dishes}
            totalCount={totalCount}
            limit={limit}
            facetGroups={facetGroups}
            filters={filters}
            query={query}
          />
        </div>
      </section>

      <FlavourBand />
    </>
  );
}

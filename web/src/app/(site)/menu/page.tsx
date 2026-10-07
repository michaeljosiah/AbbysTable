import type { Metadata } from 'next';

import { FlavourBand } from '@/components/menu/FlavourBand';
import { MenuBrowser } from '@/components/menu/MenuBrowser';
import { MenuDeliveryStrip } from '@/components/menu/MenuDeliveryStrip';
import { MenuTopButton } from '@/components/menu/MenuTopButton';
import { MobilePurchaseBar } from '@/components/purchase-bar/MobilePurchaseBar';
import { KeepCompounds } from '@/components/sections/KeepTogether';
import { getMenuPageData } from '@/lib/aonik/client';
import { MENU_HEADING, MENU_LEDE } from '@/lib/content/menu';
import { formatCountInWords, formatDeliveryDateShort } from '@/lib/format';
import { MENU_BAND_ATTR, MENU_PAGE_SIZE, MENU_TITLE_ID } from '@/lib/menu/constants';
import { filtersFromParams } from '@/lib/menu/facets';
import { SORT_PARAM } from '@/lib/menu/sort';
import { getPurchaseBarData } from '@/lib/purchase-bar/data';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: "Menu — Abby's Table",
  description:
    'The full Abby’s Table menu: chef-prepared Nigerian fusion dishes, cooked in small batches and delivered chilled to mainland UK. Search, or filter by protein source, eating style, heat and dietary need.',
};

interface MenuPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** The most a `?limit=` may ask for in one browse. */
const MAX_LIMIT = 200;

/**
 * The menu — Menu Landing v3 (#21): the page title and lede, the delivery
 * strip, the filter card, the dish grid, "Where the flavour comes from", the
 * mobile purchase bar and ↑ Top.
 *
 * Everything commercial is a value: the dishes, filters and order from Aonik
 * (`getMenuPageData`), the box minimum in the lede from the same plan read as
 * the purchase bar, and the date from Aonik's delivery window. A missing value
 * leaves its words out — never a guess.
 */
export default async function MenuPage({ searchParams }: MenuPageProps) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const query = first(params.q) ?? '';
  const parsedLimit = Number.parseInt(first(params.limit) ?? '', 10);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : MENU_PAGE_SIZE;

  const [menu, purchaseBar] = await Promise.all([
    getMenuPageData({
      filters: filtersFromParams(params),
      query,
      limit,
      sort: params[SORT_PARAM],
    }),
    getPurchaseBarData(),
  ]);

  // "Next deliveries from Fri 18 Sep". Today this is Aonik's earliest delivery
  // window; the note promises the next cooking run WITH CAPACITY, which waits
  // on michaeljosiah/aonik#346 (contract §4). No window, no strip.
  const nextDelivery = formatDeliveryDateShort(menu.delivery?.earliestDeliveryDate);
  // "Choose six or more dishes…": the plan's minimum, the bar's own read.
  const minimum = purchaseBar.offer?.minDishes;

  return (
    <>
      {/* The title band is the purchase bar's reveal point: the page has no
          hero CTA. The bar is suppressed at the footer. */}
      <section className={styles.hero} data-purchase-bar-reveal="">
        <div className={styles.inner}>
          <h1 id={MENU_TITLE_ID} className={styles.title} tabIndex={-1}>
            {MENU_HEADING}
          </h1>
          {/* Shorter on a phone: the first clause alone. One element revealed
              from 640, with the phone's full stop as its counterpart. */}
          <p className={styles.lede}>
            <KeepCompounds text={MENU_LEDE.lead} />
            <span className={styles.ledeStop}>.</span>
            <span className={styles.ledeMore}>
              {' '}
              {MENU_LEDE.more}
              {minimum ? <> {MENU_LEDE.choose(formatCountInWords(minimum))}</> : null}
            </span>
          </p>

          {nextDelivery ? <MenuDeliveryStrip date={nextDelivery} /> : null}
        </div>
      </section>

      <section className={styles.band} {...{ [MENU_BAND_ATTR]: '' }}>
        <div className={styles.inner}>
          <MenuBrowser
            dishes={menu.dishes}
            totalCount={menu.totalCount}
            limit={limit}
            facetGroups={menu.facetGroups}
            filters={menu.filters}
            query={query}
            sort={menu.sort}
            sorts={menu.sorts}
          />
        </div>
      </section>

      <FlavourBand />
      <MobilePurchaseBar data={purchaseBar} />
      <MenuTopButton />
    </>
  );
}

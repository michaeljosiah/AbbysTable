import { upcomingDeliveryDate } from '@/lib/delivery/checker';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DishInfoPanels } from '@/components/dish/DishInfoPanels';
import { DishOrderPanel } from '@/components/dish/DishOrderPanel';
import { DishOrderProvider } from '@/components/dish/DishOrderProvider';
import { DishPurchaseBar } from '@/components/dish/DishPurchaseBar';
import { RelatedDishes } from '@/components/dish/RelatedDishes';
import { MenuDeliveryStrip } from '@/components/menu/MenuDeliveryStrip';
import { HeatPips } from '@/components/ui';
import { getAonikClient, getDishPageData } from '@/lib/aonik/client';
import { formatDeliveryDate, formatPrice } from '@/lib/format';

import styles from './page.module.css';

interface DishPageProps {
  params: Promise<{ slug: string }>;
}

/** Pre-render every dish in the catalogue. */
export async function generateStaticParams() {
  const dishes = await (await getAonikClient()).getDishes();
  return dishes.map((dish) => ({ slug: dish.slug }));
}

export async function generateMetadata({ params }: DishPageProps): Promise<Metadata> {
  const { slug } = await params;
  const dish = await (await getAonikClient()).getDishBySlug(slug);

  if (!dish) return { title: "Dish not found — Abby's Table" };

  return {
    title: `${dish.title} — Abby's Table`,
    description: dish.description,
    openGraph: {
      title: dish.title,
      description: dish.description,
      type: 'article',
      locale: 'en_GB',
    },
  };
}

export default async function DishPage({ params }: DishPageProps) {
  const { slug } = await params;
  const data = await getDishPageData(slug);

  if (!data) notFound();

  const { dish, related, boxes, delivery, optionGroups, heating } = data;
  const earliestDeliveryLabel = formatDeliveryDate(upcomingDeliveryDate(delivery?.earliestDeliveryDate));

  // "Boxes start at ..." is derived from the cheapest offer rather than hardcoded.
  const entryBox = [...boxes].sort((a, b) => a.pricePence - b.pricePence)[0];

  return (
    // One add-to-box action for the inline button and the mobile bar.
    <DishOrderProvider dish={dish} optionGroups={optionGroups}>
      <div className={styles.main}>
        <div className={styles.imageColumn}>
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
            Back
          </Link>

          <div className={styles.figure}>
            <Image
              src={dish.imageUrl}
              alt={dish.imageAlt ?? dish.title}
              width={720}
              height={720}
              priority
              className={styles.image}
              sizes="(max-width: 1040px) 100vw, 46vw"
            />

            {dish.isSignature ? (
              <>
                <div className={styles.signatureBadges}>
                  <span className={styles.signaturePill}>
                    <span className={styles.lozenge} aria-hidden="true">
                      ⬥
                    </span>
                    Signature
                  </span>
                  {dish.upgradePence ? (
                    <span className={styles.signaturePill}>
                      +{formatPrice(dish.upgradePence)} upgrade
                    </span>
                  ) : null}
                </div>

                <div className={styles.signatureBanner}>
                  <Image src="/assets/floral-mark.png" alt="" width={17} height={17} aria-hidden="true" />
                  <span>Abby&apos;s Signature</span>
                  <Image src="/assets/floral-mark.png" alt="" width={17} height={17} aria-hidden="true" />
                </div>
              </>
            ) : null}
          </div>

          <div className={styles.relatedDesktop}>
            <RelatedDishes dishes={related} />
          </div>
        </div>

        <div className={styles.infoColumn}>
          <div className={styles.chips}>
            {dish.isSignature ? (
              <span className={styles.chip} data-signature="">
                <span className={styles.lozenge} aria-hidden="true">
                  ⬥
                </span>
                Signature
              </span>
            ) : null}
            {[dish.category, ...dish.tags].filter(Boolean).map((label) => (
              <span key={label} className={styles.chip}>
                {label}
              </span>
            ))}
          </div>

          <h1 className={styles.title}>{dish.title}</h1>

          {dish.parts && <p className={styles.components}>{dish.parts}</p>}
          <p className={styles.description}>{dish.description}</p>
          {dish.heat && <div className={styles.heatRow}><span className={styles.heatLabel}>Heat</span><HeatPips heat={dish.heat} /></div>}
          <p className={styles.flavourLine}>Flavour built properly.</p>
          <p>Herbs, spices, aromatics and house-made stocks. No commercial seasoning blends or added MSG.</p>

          <DishOrderPanel />

          <p className={styles.boxNote}>Minimum order: any {entryBox?.dishCount ?? 6} dishes.</p>
          {earliestDeliveryLabel && <MenuDeliveryStrip date={earliestDeliveryLabel} />}

          <DishInfoPanels dish={dish} heating={heating} />

          <div className={styles.relatedMobile}>
            <RelatedDishes dishes={related} />
          </div>
        </div>
      </div>


      {/* Mobile only; revealed once the inline button is scrolled past, gone
          from the footer on (the footer carries data-purchase-bar-stop). */}
      <DishPurchaseBar />
    </DishOrderProvider>
  );
}

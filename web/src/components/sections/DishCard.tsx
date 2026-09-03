import Image from 'next/image';
import Link from 'next/link';

import { HeatPips, NutritionTag } from '@/components/ui';
import type { Dish } from '@/lib/aonik/types';
import { formatPrice } from '@/lib/format';

import styles from './DishCard.module.css';

/**
 * A single dish in the menu rail: photograph with merchandising badges, title,
 * description, heat and nutrition, and the personalisation affordance.
 */
interface DishCardProps {
  dish: Dish;
  /**
   * `rail` is the homepage carousel card; `grid` adds the menu's hairline border.
   */
  variant?: 'rail' | 'grid';
  /** When set the whole card becomes a link to the dish page. */
  href?: string;
}

const SIGNATURE_EXPLAINER =
  "One of Abby's specials. Counts as one of your box dishes — the upgrade is added on top.";

interface Badge {
  label: string;
  /** Brass fill rather than cream — reserved for "New". */
  emphasis?: boolean;
}

/**
 * The card's badge stack, in the order the template sets: the dish's category
 * first so every card is placed at a glance, then its other tags, and "New"
 * last in brass so the one badge that is time-sensitive reads as the loudest.
 */
function buildBadges(dish: Dish): Badge[] {
  const isNew = (tag: string) => tag === 'New';

  return [
    ...(dish.category ? [{ label: dish.category }] : []),
    ...dish.tags.filter((tag) => !isNew(tag)).map((label) => ({ label })),
    ...dish.tags.filter(isNew).map((label) => ({ label, emphasis: true })),
  ];
}

export function DishCard({ dish, variant = 'rail', href }: DishCardProps) {
  const badges = buildBadges(dish);

  // An anchor may not contain a button, so the signature explainer is exposed as
  // text rather than a control — keeping the card linkable without invalid nesting.
  const content = (
    <>
      <div className={styles.media}>
        <Image
          src={dish.imageUrl}
          alt={dish.title}
          fill
          sizes="(max-width: 768px) 82vw, 360px"
          className={styles.image}
        />

        {badges.length > 0 ? (
          <ul className={styles.tags}>
            {badges.map((badge) => (
              <li
                key={badge.label}
                className={styles.tag}
                data-emphasis={badge.emphasis ? 'new' : undefined}
              >
                {badge.label}
              </li>
            ))}
          </ul>
        ) : null}

        {dish.isSignature ? (
          <>
            <div className={styles.signatureBadges}>
              <span className={styles.signaturePill}>
                <span className={styles.lozenge} aria-hidden="true">
                  ⬥
                </span>
                Signature
                <span className={styles.info} aria-hidden="true">
                  i
                  <span className={styles.infoTip}>{SIGNATURE_EXPLAINER}</span>
                </span>
                {/* The tooltip above is a hover affordance only; assistive tech
                    gets the same sentence unconditionally. */}
                <span className="visuallyHidden">{SIGNATURE_EXPLAINER}</span>
              </span>
              {dish.upgradePence ? (
                <span className={styles.signaturePill}>+{formatPrice(dish.upgradePence)} upgrade</span>
              ) : null}
            </div>

            <div className={styles.signatureBanner}>
              <Image src="/assets/floral-mark.png" alt="" width={15} height={15} aria-hidden="true" />
              <span>Abby&apos;s Signature</span>
              <Image src="/assets/floral-mark.png" alt="" width={15} height={15} aria-hidden="true" />
            </div>
          </>
        ) : null}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{dish.title}</h3>

        {dish.parts ? (
          <>
            <span className={styles.partsDivider} aria-hidden="true">
              <span className={styles.partsRule} />
              <span className={styles.partsDiamond}>◆</span>
              <span className={styles.partsRule} />
            </span>
            <p className={styles.parts}>{dish.parts}</p>
          </>
        ) : null}

        {dish.description ? <p className={styles.description}>{dish.description}</p> : null}

        <div className={styles.facts}>
          <span className={styles.heat}>
            <HeatPips heat={dish.heat} />
            {/* Hairline between the heat and the macros. Homepage only: the
                menu grid's card sets these side by side with no rule. */}
            {variant === 'rail' ? <span className={styles.heatRule} aria-hidden="true" /> : null}
          </span>
          {dish.nutrition.proteinGrams !== undefined ? (
            <NutritionTag dot="protein">Protein {dish.nutrition.proteinGrams}g</NutritionTag>
          ) : null}
          {dish.nutrition.fibreGrams !== undefined ? (
            <NutritionTag dot="fibre">Fibre {dish.nutrition.fibreGrams}g</NutritionTag>
          ) : null}
        </div>

      </div>
    </>
  );

  const shared = {
    className: styles.card,
    'data-signature': dish.isSignature || undefined,
    'data-variant': variant,
  };

  return href ? (
    <Link href={href} {...shared}>
      {content}
    </Link>
  ) : (
    <article {...shared}>{content}</article>
  );
}

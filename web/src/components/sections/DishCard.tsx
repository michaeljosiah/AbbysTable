import Image from 'next/image';
import Link from 'next/link';

import { HeatPips, NutritionTag } from '@/components/ui';
import type { Dish } from '@/lib/aonik/types';
import { PERSONALISATION_LABELS } from '@/lib/content/marketing';
import { formatPrice, joinWithOr } from '@/lib/format';

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

function personalisationSummary(dish: Dish): string {
  const labels = dish.personalisation.map((option) => PERSONALISATION_LABELS[option]).filter(Boolean);
  return labels.length > 0 ? `Change ${joinWithOr(labels)}.` : '';
}

export function DishCard({ dish, variant = 'rail', href }: DishCardProps) {
  const personalisation = personalisationSummary(dish);

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

        {dish.tags.length > 0 ? (
          <ul className={styles.tags}>
            {dish.tags.map((tag) => (
              <li key={tag} className={styles.tag} data-emphasis={tag === 'New' ? 'new' : undefined}>
                {tag}
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
        {dish.description ? <p className={styles.description}>{dish.description}</p> : null}

        <div className={styles.facts}>
          <HeatPips heat={dish.heat} />
          <NutritionTag dot="protein">Protein {dish.nutrition.proteinGrams}g</NutritionTag>
          <NutritionTag dot="fibre">Fibre {dish.nutrition.fibreGrams}g</NutritionTag>
        </div>

        {personalisation ? (
          <div className={styles.personalise}>
            <span className={styles.personaliseHead}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="4" y1="8" x2="20" y2="8" />
                <circle cx="10" cy="8" r="2.4" fill="var(--surface-card)" />
                <line x1="4" y1="16" x2="20" y2="16" />
                <circle cx="15" cy="16" r="2.4" fill="var(--surface-card)" />
              </svg>
              Personalise this dish
            </span>
            <p className={styles.personaliseCopy}>{personalisation}</p>
          </div>
        ) : null}
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

import Image from 'next/image';
import Link from 'next/link';

import { NutritionTag } from '@/components/ui';
import { CHILLI_BODY_PATH, CHILLI_STEM_PATH, CHILLI_VIEW_BOX } from '@/components/ui/glyphs';
import { HEAT_LABELS, HEAT_STEPS, type Dish, type HeatLevel } from '@/lib/aonik/types';
import { formatPrice } from '@/lib/format';
import { dishCardTags } from '@/lib/menu/cardTags';

import { KeepCompounds } from './KeepTogether';
import { SignatureInfo } from './SignatureInfo';
import styles from './DishCard.module.css';

/**
 * The approved dish card (Homepage v2), shared by the homepage rail and the
 * menu grid (Menu Landing v3, which takes it verbatim with two named
 * departures — design/CLAUDE.md "Cards and repeated content"): the menu shows
 * the description at every width, with no clamps on a phone, and states the
 * heat word beside the pips.
 *
 * The tag stack — cream tags, "New" in gold, the Signature pill with its "i",
 * the upgrade pill — sits OUTSIDE the card link, over the photograph: the
 * Signature note needs a real button, and a button inside a link is invalid.
 * The stack takes no pointer events except on the "i", so a tap anywhere else
 * still reaches the link. There is no "Abby's Signature" banner in v2.
 */
interface DishCardProps {
  dish: Dish;
  /** `rail`: the homepage carousel card. `grid`: the menu's card. */
  variant?: 'rail' | 'grid';
  /** When set the card (all but its tag stack) is a link to the dish page. */
  href?: string;
  /**
   * The title's level is the page's, not the card's: the menu has no section
   * heading between its h1 and the cards, so its titles are h2.
   */
  headingLevel?: 2 | 3;
}

const PIP_COUNT = 3;

/** Three chillies, the dish's level lit — one labelled image, plus the word on the menu. */
function CardHeat({ heat, showWord }: { heat: HeatLevel; showWord: boolean }) {
  const lit = HEAT_STEPS[heat];
  return (
    <span className={styles.heatGroup} role="img" aria-label={`Heat level: ${HEAT_LABELS[heat]}`}>
      <span className={styles.pips} aria-hidden="true">
        {Array.from({ length: PIP_COUNT }, (_, index) => (
          <svg
            key={index}
            width="15"
            height="15"
            viewBox={CHILLI_VIEW_BOX}
            className={styles.pip}
            data-lit={index < lit || undefined}
          >
            <path className={styles.stem} d={CHILLI_STEM_PATH} />
            <path className={styles.body} d={CHILLI_BODY_PATH} />
          </svg>
        ))}
      </span>
      {showWord ? (
        <span className={styles.heatWord} aria-hidden="true">
          {HEAT_LABELS[heat]}
        </span>
      ) : null}
    </span>
  );
}

export function DishCard({ dish, variant = 'rail', href, headingLevel = 3 }: DishCardProps) {
  const tags = dishCardTags(dish, { category: variant !== 'grid' });
  const Title = headingLevel === 2 ? 'h2' : 'h3';
  const { proteinGrams, fibreGrams } = dish.nutrition;
  const hasNutrition = proteinGrams !== undefined || fibreGrams !== undefined;

  const card = (
    <article className={styles.card}>
      <div className={styles.media}>
        {dish.imageUrl ? (
          <Image
            src={dish.imageUrl}
            alt={dish.title}
            fill
            sizes={
              variant === 'grid'
                ? '(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw'
                : '(max-width: 768px) 82vw, 360px'
            }
            className={styles.image}
          />
        ) : null}
      </div>

      <div className={styles.body}>
        {/* Approved compounds held together at render time, never with a
            non-breaking hyphen in the data (design/build-handoff.md §3e). */}
        <Title className={styles.title}>
          <KeepCompounds text={dish.title} />
        </Title>

        {dish.parts ? (
          <>
            <span className={styles.partsDivider} aria-hidden="true">
              <span className={styles.partsRule} />
              <span className={styles.partsDiamond}>◆</span>
              <span className={styles.partsRule} />
            </span>
            <p className={styles.parts}>
              <KeepCompounds text={dish.parts} />
            </p>
          </>
        ) : null}

        {dish.description ? (
          <p className={styles.description}>
            <KeepCompounds text={dish.description} />
          </p>
        ) : null}

        {/* Heat and the two macros, each only where the dish published it —
            never a zero, never a guessed level. The homepage sets them on one
            row with a rule after the pips; the menu on two fixed rows, so no
            two cards break in different places. */}
        {dish.heat || hasNutrition ? (
          <div className={styles.facts}>
            {dish.heat ? (
              <span className={styles.heat}>
                <CardHeat heat={dish.heat} showWord={variant === 'grid'} />
                {variant === 'rail' && hasNutrition ? (
                  <span className={styles.heatRule} aria-hidden="true" />
                ) : null}
              </span>
            ) : null}
            {hasNutrition ? (
              <span className={styles.macros}>
                {proteinGrams !== undefined ? (
                  <NutritionTag dot="protein">Protein {proteinGrams}g</NutritionTag>
                ) : null}
                {fibreGrams !== undefined ? (
                  <NutritionTag dot="fibre">Fibre {fibreGrams}g</NutritionTag>
                ) : null}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );

  const hasTags = tags.cream.length > 0 || tags.isNew || dish.isSignature;

  return (
    <div className={styles.cell} data-variant={variant}>
      {href ? (
        <Link href={href} className={styles.link}>
          {card}
        </Link>
      ) : (
        card
      )}

      {hasTags ? (
        <div className={styles.tags}>
          {tags.cream.map((label) => (
            <span key={label} className={styles.pill}>
              {label}
            </span>
          ))}
          {tags.isNew ? (
            <span className={styles.pill} data-tone="new">
              New
            </span>
          ) : null}
          {dish.isSignature ? (
            <>
              <SignatureInfo />
              {dish.upgradePence ? (
                <span className={`${styles.pill} ${styles.signaturePill}`}>
                  +{formatPrice(dish.upgradePence)} upgrade
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

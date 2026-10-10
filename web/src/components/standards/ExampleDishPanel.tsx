import Link from 'next/link';

import { CHILLI_BODY_PATH, CHILLI_STEM_PATH, CHILLI_VIEW_BOX } from '@/components/ui/glyphs';
import { HEAT_LABELS, HEAT_STEPS, type Dish } from '@/lib/aonik/types';
import { exampleDishFacts, joinWithAnd } from '@/lib/standards/exampleDish';

import styles from './ExampleDishPanel.module.css';

const ALLERGENS_HREF = '/allergens';
const PIP_COUNT = 3;

/**
 * Band 05's visual: one catalogue dish's published nutrition and allergens —
 * the evidence for "Always transparent" (design: Standards v2, `.st-panelfig`).
 *
 * Everything printed comes from the dish record through `exampleDishFacts`;
 * nothing is copy. A figure the catalogue has not published shows a dash and
 * is named in the note beneath the grid, so a gap reads as a gap — never as a
 * number. The eyebrow keeps the design's "Example dish information": the
 * figures are the catalogue's current (holding) data, not a signed-off label.
 */
export function ExampleDishPanel({ dish, className }: { dish: Dish; className?: string }) {
  const facts = exampleDishFacts(dish);
  const heat = facts.heat;

  return (
    <div className={[styles.panel, className].filter(Boolean).join(' ')}>
      <div className={styles.head}>
        <div className={styles.titles}>
          <p className={styles.eyebrow}>Example dish information</p>
          <p className={styles.title}>{facts.title}</p>
        </div>
        {/* No published heat, no pips: a gap, never a guessed level. */}
        {heat ? (
          <span className={styles.heat}>
            <span className={styles.pips} role="img" aria-label={`Heat level: ${HEAT_LABELS[heat]}`}>
              {Array.from({ length: PIP_COUNT }, (_, index) => (
                <svg
                  key={index}
                  width="14"
                  height="14"
                  viewBox={CHILLI_VIEW_BOX}
                  className={styles.pip}
                  data-lit={index < HEAT_STEPS[heat] || undefined}
                  aria-hidden="true"
                >
                  <path className={styles.stem} d={CHILLI_STEM_PATH} />
                  <path className={styles.body} d={CHILLI_BODY_PATH} />
                </svg>
              ))}
            </span>
            <span className={styles.heatLabel} aria-hidden="true">
              {HEAT_LABELS[heat]}
            </span>
          </span>
        ) : null}
      </div>

      {/* A real definition list: each figure is a value for a named nutrient,
          so the pairing survives without the visual grid. The cells reverse
          visually (figure above label) while the DOM keeps dt before dd. */}
      <dl className={styles.grid}>
        {facts.cells.map((cell) => (
          <div key={cell.label} className={styles.cell}>
            <dt className={styles.label}>{cell.label}</dt>
            {cell.value !== undefined ? (
              <dd className={styles.value}>{cell.value}</dd>
            ) : (
              <dd className={`${styles.value} ${styles.unpublished}`}>
                <span aria-hidden="true">—</span>
                <span className="visuallyHidden">Not yet published</span>
              </dd>
            )}
          </div>
        ))}
      </dl>

      {facts.unpublished.length > 0 || facts.figuresNote ? (
        <div className={styles.notes}>
          {facts.unpublished.length > 0 ? (
            <p className={styles.note}>
              Not yet published for this dish: {joinWithAnd(facts.unpublished)}.
            </p>
          ) : null}
          {facts.figuresNote ? <p className={styles.note}>{facts.figuresNote}</p> : null}
        </div>
      ) : null}

      <div className={styles.foot}>
        <p className={styles.allergens}>
          <span className={styles.allergensLabel}>Allergens</span>{' '}
          {facts.allergens ? (
            <span className={styles.allergensValue}>
              {facts.allergens}
              {/* The kitchen's own statement, as authored (aonik#351). */}
              {facts.precautionaryStatement ? (
                <span className={styles.precaution}>{facts.precautionaryStatement}</span>
              ) : null}
            </span>
          ) : (
            // Never guessed: an absent declaration is stated as absent.
            <span className={styles.allergensValue}>Not yet published for this dish</span>
          )}
        </p>
        <Link href={ALLERGENS_HREF} className={styles.link}>
          <span className={styles.linkLabel}>Allergen information</span>
        </Link>
      </div>
    </div>
  );
}

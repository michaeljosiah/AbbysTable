import { CHILLI_BODY_PATH, CHILLI_STEM_PATH, CHILLI_VIEW_BOX } from '@/components/ui/glyphs';
import type { Dish } from '@/lib/aonik/types';
import { exampleDishFacts } from '@/lib/how-it-works/exampleDish';

import styles from './ExampleDishCard.module.css';

const PIP_COUNT = 3;

/**
 * The "Example dish" card in How it works' nutrition band (`.hw-nut`).
 *
 * Every value is the dish record's own (see `exampleDishFacts`). Where the
 * record publishes nothing, the card says so in words — a dash alone would be
 * read as a figure — and never shows a stand-in value.
 */
export function ExampleDishCard({ dish }: { dish: Dish }) {
  const facts = exampleDishFacts(dish);
  const publishedCount = facts.figures.filter((figure) => figure.value !== null).length;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Example dish</p>
          <h3 className={styles.name}>{facts.title}</h3>
        </div>
        {/* No published heat, no line — never a guessed level. */}
        {facts.heatLabel !== null && facts.heatSteps !== null ? (
          <p className={styles.heat}>
            {/* Three pips, the unlit ones muted: the muted pip IS the
                denominator. Graphic only — the word carries the level. */}
            <span className={styles.pips} aria-hidden="true">
              {Array.from({ length: PIP_COUNT }, (_, index) => (
                <svg
                  key={index}
                  width="13"
                  height="13"
                  viewBox={CHILLI_VIEW_BOX}
                  className={styles.pip}
                  data-lit={index < (facts.heatSteps ?? 0) || undefined}
                >
                  <path className={styles.stem} d={CHILLI_STEM_PATH} />
                  <path className={styles.body} d={CHILLI_BODY_PATH} />
                </svg>
              ))}
            </span>
            <span className="visuallyHidden">Heat: </span>
            {facts.heatLabel}
          </p>
        ) : null}
      </div>

      {publishedCount > 0 ? (
        <>
          {/* role="list": `list-style: none` drops list semantics in Safari. */}
          <ul className={styles.grid} role="list">
            {facts.figures.map((figure) => (
              <li key={figure.key} className={styles.cell}>
                {figure.value !== null ? (
                  <>
                    <span className={styles.value}>{figure.value}</span>{' '}
                    <span className={styles.label}>{figure.label}</span>
                  </>
                ) : (
                  <>
                    {/* Read as "Fat, not yet published": the dash is visual only. */}
                    <span className={styles.value} aria-hidden="true">
                      –
                    </span>
                    <span className={styles.label}>{figure.label}</span>
                    <span className="visuallyHidden">, not yet published</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          {publishedCount < facts.figures.length ? (
            <p className={styles.note}>
              Figures shown as – are not yet published for this dish.
            </p>
          ) : null}
        </>
      ) : (
        <p className={styles.note}>Nutrition figures are not yet published for this dish.</p>
      )}

      {facts.figuresNote ? <p className={styles.note}>{facts.figuresNote}</p> : null}

      <div className={styles.foot}>
        {/* The declaration is a sentence, so it is supporting copy at the 16px
            floor, not a chip. */}
        <p className={styles.allergens}>
          <span className={styles.allergensLabel}>Allergens</span>{' '}
          {facts.allergens !== null ? facts.allergens : 'Not yet published'}
        </p>
        <p className={styles.ingredients}>
          {facts.ingredientsPublished
            ? 'Full ingredients available'
            : 'Ingredients not yet published'}
        </p>
      </div>
    </div>
  );
}

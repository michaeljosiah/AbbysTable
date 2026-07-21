'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';

import type { Dish, HeatingInstruction } from '@/lib/aonik/types';

import styles from './DishInfoPanels.module.css';

/**
 * The three expandable panels beneath the CTA: full nutrition, ingredients and
 * allergens, and reheating guidance.
 */
interface DishInfoPanelsProps {
  dish: Dish;
  heating: HeatingInstruction[];
}

type PanelId = 'nutrition' | 'ingredients' | 'heating';

const PANEL_IDS: PanelId[] = ['nutrition', 'ingredients', 'heating'];

/** The template's 22px warning triangle beside the allergen statement. */
function AllergenIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green-forest)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 4.3 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

const PANEL_ICONS: Record<PanelId, ReactNode> = {
  nutrition: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 20h18" />
      <path d="M6 20v-6" />
      <path d="M12 20V5" />
      <path d="M18 20v-9" />
    </svg>
  ),
  ingredients: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21V8" />
      <path d="M12 8c0-2.2-1.4-4-3.2-4C8.8 6.2 10.2 8 12 8z" />
      <path d="M12 8c0-2.2 1.4-4 3.2-4C15.2 6.2 13.8 8 12 8z" />
    </svg>
  ),
  heating: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 15c-1-1-1-2.4 0-3.4C9 10.6 9 9.2 8 8.2" />
      <path d="M12 15c-1-1-1-2.4 0-3.4 1-1 1-2.4 0-3.4" />
      <path d="M16 15c-1-1-1-2.4 0-3.4 1-1 1-2.4 0-3.4" />
    </svg>
  ),
};

function Panel({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: PanelId;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel} id={`dish-${id}`}>
      <h2 className={styles.headingWrap}>
        <button
          type="button"
          className={styles.head}
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`dish-${id}-body`}
        >
          <span className={styles.icon} aria-hidden="true">
            {PANEL_ICONS[id]}
          </span>
          <span className={styles.title}>{title}</span>
          <span
            className={styles.backToTop}
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            Back to top
          </span>
          <svg
            className={styles.chevron}
            data-open={open || undefined}
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h2>
      {open ? (
        <div className={styles.body} id={`dish-${id}-body`}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function DishInfoPanels({ dish, heating }: DishInfoPanelsProps) {
  const [open, setOpen] = useState<Record<PanelId, boolean>>({
    nutrition: true,
    ingredients: true,
    heating: true,
  });

  const toggle = (id: PanelId) => setOpen((current) => ({ ...current, [id]: !current[id] }));

  const { nutrition } = dish;
  const cells: { label: string; value: string }[] = [
    nutrition.calories !== undefined && { label: 'kcal', value: String(nutrition.calories) },
    { label: 'Protein', value: `${nutrition.proteinGrams}g` },
    nutrition.carbsGrams !== undefined && { label: 'Carbs', value: `${nutrition.carbsGrams}g` },
    nutrition.fatGrams !== undefined && { label: 'Fat', value: `${nutrition.fatGrams}g` },
    { label: 'Fibre', value: `${nutrition.fibreGrams}g` },
    nutrition.sugarsGrams !== undefined && { label: 'Sugars', value: `${nutrition.sugarsGrams}g` },
    nutrition.saltGrams !== undefined && { label: 'Salt', value: `${nutrition.saltGrams}g` },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className={styles.panels}>
      <Panel
        id={PANEL_IDS[0]}
        title="Full nutrition"
        open={open.nutrition}
        onToggle={() => toggle('nutrition')}
      >
        <p className={styles.caption}>Per serving, as Abby designed it.</p>
        <dl className={styles.nutritionGrid} style={{ '--cells': cells.length } as CSSProperties}>
          {cells.map((cell) => (
            <div key={cell.label} className={styles.nutritionCell}>
              <dt className={styles.nutritionLabel}>{cell.label}</dt>
              <dd className={styles.nutritionValue}>{cell.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel
        id={PANEL_IDS[1]}
        title="Ingredients & allergens"
        open={open.ingredients}
        onToggle={() => toggle('ingredients')}
      >
        {dish.ingredients ? (
          <p className={styles.ingredients}>{dish.ingredients}</p>
        ) : (
          <p className={styles.ingredients}>
            The ingredient list for this dish has not been published yet.
          </p>
        )}

        {dish.allergens ? (
          <div className={styles.allergens}>
            <AllergenIcon />
            <span>
              <strong>Allergens:</strong> {dish.allergens}
            </span>
          </div>
        ) : (
          /* Never guess allergens. Absent data is stated plainly and routed to a human. */
          <div className={styles.allergens} role="note">
            <AllergenIcon />
            <span>
              <strong>Allergen information is not yet published for this dish.</strong> If you have
              an allergy or intolerance, please{' '}
              <Link href="/#contact" className={styles.allergensLink}>
                contact us
              </Link>{' '}
              before ordering.
            </span>
          </div>
        )}
      </Panel>

      <Panel
        id={PANEL_IDS[2]}
        title="How to heat"
        open={open.heating}
        onToggle={() => toggle('heating')}
      >
        <ul className={styles.heating}>
          {heating.map((instruction) => (
            <li key={instruction.method} className={styles.heatingItem}>
              <span className={styles.heatingMethod}>{instruction.method}</span>
              <p className={styles.heatingBody}>{instruction.body}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/**
 * The "Example dish" card on How it works, as data — free of React so the
 * safety rules are unit-tested (tests/how-it-works.test.tsx).
 *
 * SAFETY: every figure, the allergen line and the ingredients claim come from
 * the dish record and nowhere else. A value the record does not carry is
 * reported as unpublished (null), never filled with a plausible-looking one —
 * the same rule, and the same declaration gating, as the dish page
 * (`DishInfoPanels`).
 */

import { HEAT_LABELS, HEAT_STEPS, type Dish, type DishNutrition } from '@/lib/aonik/types';

export interface NutritionFigure {
  key: 'calories' | 'protein' | 'fibre' | 'fat' | 'carbs';
  /** "kcal", "Protein", … — the small caps line under the figure. */
  label: string;
  /** "540", "32g"; null when the dish has not published it. */
  value: string | null;
}

export interface ExampleDishFacts {
  title: string;
  /** 'None' | 'Mild' | 'Medium' | 'Hot'; null when the dish has published no heat. */
  heatLabel: string | null;
  /** How many of the three chilli pips are lit; null with `heatLabel`. */
  heatSteps: number | null;
  /** Always the design's five, in its order; unpublished ones carry null. */
  figures: NutritionFigure[];
  /** Caption owed when the figures are not current fact for this recipe. */
  figuresNote: string | null;
  /** The allergen declaration, verbatim; null when not published. */
  allergens: string | null;
  ingredientsPublished: boolean;
}

/** The design's five cells, in its order: kcal, protein, fibre, fat, carbs. */
const FIGURES: {
  key: NutritionFigure['key'];
  label: string;
  field: keyof DishNutrition;
  unit: string;
}[] = [
  { key: 'calories', label: 'kcal', field: 'calories', unit: '' },
  { key: 'protein', label: 'Protein', field: 'proteinGrams', unit: 'g' },
  { key: 'fibre', label: 'Fibre', field: 'fibreGrams', unit: 'g' },
  { key: 'fat', label: 'Fat', field: 'fatGrams', unit: 'g' },
  { key: 'carbs', label: 'Carbs', field: 'carbsGrams', unit: 'g' },
];

const published = (text: string | undefined): string | null => {
  const trimmed = text?.trim();
  return trimmed ? trimmed : null;
};

export function exampleDishFacts(dish: Dish): ExampleDishFacts {
  /*
   * Declarations are gated on Aonik's resolution FLAG, not on presence: it can
   * withhold them while still returning one half (see DishInfoPanels). Fixture
   * dishes carry no `contentState`, so they fall back to presence.
   */
  const state = dish.contentState;
  const withheld = state?.declarationsWithheld ?? false;

  const figures = FIGURES.map(({ key, label, field, unit }) => {
    const raw = dish.nutrition?.[field];
    const value =
      typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? `${raw}${unit}` : null;
    return { key, label, value };
  });

  // The dish page's captions, so a stale or stand-in figure is never shown as fact.
  const figuresNote = state?.figuresAreStandardPreparation
    ? 'These figures are for the standard preparation.'
    : state?.figuresAreStale
      ? 'These figures are under review and may not reflect the current recipe.'
      : null;

  return {
    title: dish.title,
    heatLabel: dish.heat ? HEAT_LABELS[dish.heat] : null,
    heatSteps: dish.heat ? HEAT_STEPS[dish.heat] : null,
    figures,
    figuresNote,
    allergens: withheld ? null : published(dish.allergens),
    ingredientsPublished: !withheld && published(dish.ingredients) !== null,
  };
}

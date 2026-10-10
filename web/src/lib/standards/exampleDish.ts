import type { Dish, DishNutrition } from '../aonik/types';

/**
 * The facts Our Standards' "Example dish information" panel prints for one
 * catalogue dish (design: Standards v2, band 05).
 *
 * SAFETY: every figure and the allergen line come from the dish record and are
 * NEVER inferred. A figure the catalogue has not published renders as an
 * explicit "not yet published" cell and is named in the panel's note — never a
 * zero, never a plausible-looking number.
 *
 * Kept free of React so the rules can be tested on their own.
 */

export interface NutrientCell {
  /** Printed label, in the design's casing ("kcal", "Fat", …). */
  label: string;
  /** Lower-case name for running text ("saturates"). */
  name: string;
  /** Formatted figure, or undefined when the catalogue has not published it. */
  value?: string;
}

export interface ExampleDishFacts {
  title: string;
  heat: Dish['heat'];
  /** All eight cells, in the design's order, published or not. */
  cells: NutrientCell[];
  /** Names of the cells with no published figure, for the panel's note. */
  unpublished: string[];
  /** The published allergen declaration, verbatim; undefined when there is none. */
  allergens?: string;
  /** The kitchen's precautionary statement, as authored — only with its declaration. */
  precautionaryStatement?: string;
  /** Aonik's caption when the figures are not the current recipe's own. */
  figuresNote?: string;
}

const grams = (value: number | undefined) => (value === undefined ? undefined : `${value}g`);

/**
 * The design's eight nutrients, in its order.
 *
 * Saturates: neither Aonik's `DishNutrition` nor any source the fixtures were
 * built from publishes a saturates figure, so the cell is always "not yet
 * published" until the catalogue carries one. It is listed rather than dropped
 * because the design (and issue #17) treat it as part of full nutrition — the
 * gap should be visible, not hidden. When Aonik adds the field, read it here.
 */
const NUTRIENTS: { label: string; name: string; read: (n: DishNutrition) => string | undefined }[] = [
  { label: 'kcal', name: 'calories', read: (n) => (n.calories === undefined ? undefined : String(n.calories)) },
  { label: 'Fat', name: 'fat', read: (n) => grams(n.fatGrams) },
  { label: 'Saturates', name: 'saturates', read: () => undefined },
  { label: 'Carbs', name: 'carbs', read: (n) => grams(n.carbsGrams) },
  { label: 'Sugars', name: 'sugars', read: (n) => grams(n.sugarsGrams) },
  { label: 'Fibre', name: 'fibre', read: (n) => grams(n.fibreGrams) },
  { label: 'Protein', name: 'protein', read: (n) => grams(n.proteinGrams) },
  { label: 'Salt', name: 'salt', read: (n) => grams(n.saltGrams) },
];

export function exampleDishFacts(dish: Dish): ExampleDishFacts {
  const cells = NUTRIENTS.map(({ label, name, read }) => ({ label, name, value: read(dish.nutrition) }));

  /*
   * Declarations are gated on Aonik's resolution flag, not on presence — the
   * same rule as the dish page's panels (`DishInfoPanels`): a withheld
   * resolution can still carry one half, and printing it would be a partial
   * declaration passed off as a complete one.
   */
  const state = dish.contentState;
  const allergens = state?.declarationsWithheld ? undefined : dish.allergens?.trim() || undefined;
  // A statement goes with its declaration and never without one.
  const precautionaryStatement = allergens ? dish.precautionaryStatement?.trim() || undefined : undefined;

  // The dish page's captions, in its order, so the two pages cannot disagree.
  const figuresNote = state?.figuresAreStandardPreparation
    ? 'These figures are for the standard preparation.'
    : state?.figuresAreStale
      ? 'These figures are under review and may not reflect the current recipe.'
      : undefined;

  return {
    title: dish.title,
    heat: dish.heat,
    cells,
    unpublished: cells.filter((cell) => cell.value === undefined).map((cell) => cell.name),
    allergens,
    precautionaryStatement,
    figuresNote,
  };
}

/** ["a"] → "a"; ["a","b"] → "a and b"; ["a","b","c"] → "a, b and c". */
export function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

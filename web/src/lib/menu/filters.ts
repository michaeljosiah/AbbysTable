/**
 * Menu faceting — pure functions over the dish catalogue.
 *
 * Kept free of React so the matching rules can be reasoned about (and tested)
 * on their own. The menu page owns the state; this module owns the semantics.
 */

import {
  DIETARY_TAGS,
  HEAT_STEPS,
  MEAL_TYPES,
  PROTEIN_TYPES,
  WELLNESS_GOALS,
  type Dish,
} from '@/lib/aonik/types';

export type FacetKey = 'protein' | 'spice' | 'wellness' | 'meal' | 'dietary' | 'calories';

/** Selected option labels per facet. Empty array means "All". */
export type MenuFilters = Record<FacetKey, string[]>;

export const EMPTY_FILTERS: MenuFilters = {
  protein: [],
  spice: [],
  wellness: [],
  meal: [],
  dietary: [],
  calories: [],
};

/**
 * Spice chips map to the same 0-3 scale as `HEAT_STEPS`. "None" is a legitimate
 * option with no matches in the current catalogue.
 */
export const SPICE_STEPS: Record<string, number> = {
  None: 0,
  Mild: 1,
  Medium: 2,
  Hot: 3,
};

const CALORIE_BANDS: Record<string, (calories: number) => boolean> = {
  'Under 500': (calories) => calories < 500,
  '500–550': (calories) => calories >= 500 && calories <= 550,
};

export interface FacetGroup {
  key: FacetKey;
  title: string;
  options: readonly string[];
}

/**
 * NOTE: the design template's protein chips omitted "Lamb", which made the Ata
 * Dindin Lamb Shank — a signature dish — unreachable by protein filter. Lamb is
 * included here so every catalogue value is selectable.
 */
export const FACET_GROUPS: FacetGroup[] = [
  { key: 'protein', title: 'Protein', options: PROTEIN_TYPES },
  { key: 'spice', title: 'Spice level', options: Object.keys(SPICE_STEPS) },
  { key: 'wellness', title: 'Wellness goal', options: WELLNESS_GOALS },
  { key: 'meal', title: 'Meal type', options: MEAL_TYPES },
  { key: 'dietary', title: 'Dietary', options: DIETARY_TAGS },
  { key: 'calories', title: 'Calories', options: Object.keys(CALORIE_BANDS) },
];

/** How an active selection reads in the removable-chip row. */
const ACTIVE_LABEL: Partial<Record<FacetKey, (label: string) => string>> = {
  spice: (label) => `${label} spice`,
  calories: (label) => `${label} kcal`,
};

/** Fields the search box looks at — dish, protein, or goal. */
function searchCorpus(dish: Dish): string {
  return [dish.title, ...dish.tags, dish.heat, dish.proteinType ?? '', ...dish.wellness]
    .join(' ')
    .toLowerCase();
}

function matchesFacets(dish: Dish, filters: MenuFilters): boolean {
  const { protein, spice, wellness, meal, dietary, calories } = filters;

  if (protein.length && (!dish.proteinType || !protein.includes(dish.proteinType))) return false;
  if (spice.length && !spice.some((label) => SPICE_STEPS[label] === HEAT_STEPS[dish.heat])) {
    return false;
  }
  // Selections are plain strings; widen the dish's literal arrays to compare.
  if (wellness.length && !wellness.some((goal) => (dish.wellness as string[]).includes(goal))) {
    return false;
  }
  if (meal.length && (!dish.mealType || !meal.includes(dish.mealType))) return false;
  if (dietary.length && !dietary.some((tag) => (dish.dietary as string[]).includes(tag))) {
    return false;
  }

  if (calories.length) {
    const kcal = dish.nutrition.calories;
    // A dish with no calorie figure cannot satisfy a calorie band.
    if (kcal === undefined) return false;
    if (!calories.some((label) => CALORIE_BANDS[label]?.(kcal))) return false;
  }

  return true;
}

export function filterDishes(dishes: Dish[], filters: MenuFilters, query: string): Dish[] {
  const q = query.trim().toLowerCase();

  return dishes.filter((dish) => {
    if (q && !searchCorpus(dish).includes(q)) return false;
    return matchesFacets(dish, filters);
  });
}

export interface ActiveFilter {
  key: FacetKey;
  value: string;
  label: string;
}

/** Flattens the selection into the removable chips shown above the grid. */
export function activeFilters(filters: MenuFilters): ActiveFilter[] {
  return FACET_GROUPS.flatMap(({ key }) =>
    filters[key].map((value) => ({
      key,
      value,
      label: ACTIVE_LABEL[key]?.(value) ?? value,
    })),
  );
}

export function hasAnyFilter(filters: MenuFilters): boolean {
  return FACET_GROUPS.some(({ key }) => filters[key].length > 0);
}

/** Toggles one option within one facet, leaving the others untouched. */
export function toggleFilter(filters: MenuFilters, key: FacetKey, value: string): MenuFilters {
  const current = filters[key];
  return {
    ...filters,
    [key]: current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value],
  };
}

export function clearFacet(filters: MenuFilters, key: FacetKey): MenuFilters {
  return { ...filters, [key]: [] };
}

/** "Showing 6 of 10 dishes" */
export function resultLabel(visible: number, total: number): string {
  return `Showing ${visible} of ${total} ${total === 1 ? 'dish' : 'dishes'}`;
}

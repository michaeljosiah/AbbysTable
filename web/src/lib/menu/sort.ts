/**
 * The menu's Sort (Menu Landing v3; frontend-backend-contract §4d) — React-free
 * and unit-tested (tests/menu.test.tsx).
 *
 * Three orders: Recommended (the list's own order — the source must have an
 * intentional one), Highest protein, Lowest calories.
 *
 * Sorting happens BEFORE paging, wherever the whole match set is — so it is a
 * capability of the data source, not of the page (`AonikClient.menuSorts`).
 * Demo sorts its fixtures with `sortDishes`; live, Aonik sorts the whole match
 * set (`protein-desc`, `calories-asc`, and Recommended as the `menu`
 * collection's rank — michaeljosiah/aonik#359). Sorting one page of results in
 * the browser would quietly give a wrong order across pages.
 *
 * NEVER A ZERO. A dish that has not published the figure being sorted on is
 * not treated as 0 — that would put an unknown at the top of "Lowest
 * calories". It goes after every dish that has the figure, in its recommended
 * place. Ties keep the recommended order too: the sort is stable.
 */

import type { Dish, DishNutrition } from '@/lib/aonik/types';

export type MenuSortKey = 'recommended' | 'protein' | 'calories';

export interface MenuSortOption {
  key: MenuSortKey;
  label: string;
}

/** In the design's order. */
export const MENU_SORTS: readonly MenuSortOption[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'protein', label: 'Highest protein' },
  { key: 'calories', label: 'Lowest calories' },
];

export const DEFAULT_SORT: MenuSortKey = 'recommended';

/** The URL parameter; absent means Recommended. */
export const SORT_PARAM = 'sort';

/** Every order the demo source can apply. */
export const ALL_SORTS: readonly MenuSortKey[] = MENU_SORTS.map((option) => option.key);

/**
 * The order a `?sort=` value asks for — only if the source can apply it.
 * Anything else (absent, unknown, or an order this source cannot sort by) is
 * Recommended, never an error.
 */
export function parseMenuSort(
  raw: string | string[] | undefined,
  available: readonly MenuSortKey[],
): MenuSortKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const match = available.find((key) => key === value);
  return match ?? DEFAULT_SORT;
}

/** The options to offer: the design's three, less any the source cannot apply. */
export function sortOptions(available: readonly MenuSortKey[]): MenuSortOption[] {
  return MENU_SORTS.filter((option) => available.includes(option.key));
}

const FIGURE: Record<Exclude<MenuSortKey, 'recommended'>, keyof DishNutrition> = {
  protein: 'proteinGrams',
  calories: 'calories',
};

/** Highest first for protein, lowest first for calories. */
const DIRECTION: Record<Exclude<MenuSortKey, 'recommended'>, 1 | -1> = {
  protein: -1,
  calories: 1,
};

function figureOf(dish: Dish, field: keyof DishNutrition): number | undefined {
  const value = dish.nutrition[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * The dishes in the requested order, as a new array. Dishes without the figure
 * follow every dish with it; ties and the figure-less keep their given
 * (recommended) order.
 */
export function sortDishes(dishes: readonly Dish[], key: MenuSortKey): Dish[] {
  if (key === 'recommended') return [...dishes];
  const field = FIGURE[key];
  const direction = DIRECTION[key];

  return dishes
    .map((dish, index) => ({ dish, index, figure: figureOf(dish, field) }))
    .sort((a, b) => {
      if (a.figure === undefined || b.figure === undefined) {
        if (a.figure !== b.figure) return a.figure === undefined ? 1 : -1;
        return a.index - b.index;
      }
      return (a.figure - b.figure) * direction || a.index - b.index;
    })
    .map(({ dish }) => dish);
}

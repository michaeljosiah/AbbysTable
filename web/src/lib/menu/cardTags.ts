/**
 * The dish card's tag stack (Homepage v2 and Menu Landing v3 share the card):
 * cream tags first, then "New" in gold, then the Signature and upgrade pills.
 * React-free and unit-tested (tests/menu.test.tsx).
 *
 * The cream tags are the dish's place at a glance — its first eating style
 * (the menu's records) or, for a dish with none, its homepage category (the
 * homepage's records) — and "Under 500 kcal".
 *
 * "Under 500 kcal" is DERIVED from the dish's published calories, never stored
 * as content (frontend-backend-contract §4d): the old menu page carried it as
 * a literal tag on a 520 kcal dish. So a stored tag with that label is ignored,
 * and a dish with no published calories gets no calorie tag at all.
 */

import type { Dish } from '@/lib/aonik/types';

/** Strictly under this many kcal earns the tag. */
export const UNDER_KCAL_LIMIT = 500;

export const UNDER_KCAL_TAG = `Under ${UNDER_KCAL_LIMIT} kcal`;

/** Whether the dish has PUBLISHED calories under the limit. */
export function isUnderKcal(dish: Pick<Dish, 'nutrition'>): boolean {
  const kcal = dish.nutrition.calories;
  return typeof kcal === 'number' && Number.isFinite(kcal) && kcal >= 0 && kcal < UNDER_KCAL_LIMIT;
}

export interface DishCardTags {
  /** Cream pills, in order. */
  cream: string[];
  /** The gold "New" pill. */
  isNew: boolean;
}

const isNewTag = (tag: string) => tag.trim().toLowerCase() === 'new';

/**
 * `category` falls back to the homepage's tag where a dish has no eating
 * style. The menu grid passes false: there a cream tag reads as an Eating
 * style chip, and a word the filters cannot match would be one the page
 * contradicts the moment that chip is chosen.
 */
export function dishCardTags(dish: Dish, { category = true }: { category?: boolean } = {}): DishCardTags {
  const place = dish.wellness[0] ?? (category ? dish.category : undefined);
  return {
    cream: [...(place ? [place] : []), ...(isUnderKcal(dish) ? [UNDER_KCAL_TAG] : [])],
    isNew: dish.tags.some(isNewTag),
  };
}

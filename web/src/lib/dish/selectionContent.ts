/**
 * A dish's content for the customer's OWN choices — the safety rule the
 * personaliser needs, React-free (`tests/selection-content.test.tsx`).
 *
 * A dish's ingredients, allergens and reheating are authored for one
 * preparation. Choosing King prawns instead of chicken can add Crustaceans,
 * and Aonik never lets one preparation inherit another's declaration ("a
 * missing variant never inherits default allergens for another
 * preparation"). So when the customer's selection is not the standard one,
 * the panels ask Aonik for THAT selection's content
 * (`GET /commerce/catalog/products/{slug}/content?selection=`, via
 * `/api/dish-content/[slug]`) and show what it resolves: an exact variant's
 * declaration, or — far more often — declarations withheld. Until the answer
 * arrives, and whenever it cannot be had, the standard recipe's declaration is
 * NOT shown for the customer's choices: it is withheld, and the figures are
 * captioned as the standard preparation's.
 */

import type { DishContentState, DishNutrition, Dish, HeatingInstruction } from '@/lib/aonik/types';

/** Where the panels ask (`app/api/dish-content/[slug]/route.ts`). */
export function selectionContentPath(slug: string, selection: Record<string, string | string[]>): string {
  return `/api/dish-content/${encodeURIComponent(slug)}?selection=${encodeURIComponent(JSON.stringify(selection))}`;
}

/** Longest selection the route reads: a few groups of short keys. */
export const MAX_SELECTION_LENGTH = 2048;

/** What one selection resolves to, as the panels need it. */
export interface SelectionContent {
  ingredients?: string;
  allergens?: string;
  precautionaryStatement?: string;
  nutrition: DishNutrition;
  state: DishContentState;
  /** Authored steps for this selection; empty when withheld (`state.heatingWithheld`). */
  heating: HeatingInstruction[];
}

/**
 * `resolved`: Aonik's answer for exactly that selection (its declaration may
 * itself be withheld). `unpublished`: there is no content to have (demo, or a
 * product with none). `unavailable`: Aonik could not be asked or did not
 * answer — not known, so not "not published".
 */
export type SelectionContentAnswer =
  | { status: 'resolved'; content: SelectionContent }
  | { status: 'unpublished' }
  | { status: 'unavailable' };

/** A selection the route may pass on: an object of short keys to a key or keys. */
export function readSelection(raw: string | null): Record<string, string | string[]> | null {
  if (!raw || raw.length > MAX_SELECTION_LENGTH) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const key = /^[A-Za-z0-9_.:-]{1,64}$/;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 12) return null;
  for (const [group, choice] of entries) {
    if (!key.test(group)) return null;
    const choices = Array.isArray(choice) ? choice : [choice];
    if (choices.length === 0 || choices.length > 12 || !choices.every((c) => typeof c === 'string' && key.test(c))) {
      return null;
    }
  }
  return value as Record<string, string | string[]>;
}

/** An answer from the route as the panels may use it — anything else is unavailable. */
export function readSelectionContentAnswer(body: unknown): SelectionContentAnswer {
  const answer = body as { status?: unknown; content?: Partial<SelectionContent> } | null;
  if (answer?.status === 'unpublished') return { status: 'unpublished' };
  const content = answer?.content;
  if (
    answer?.status === 'resolved' &&
    content &&
    typeof content.nutrition === 'object' &&
    content.nutrition !== null &&
    typeof content.state === 'object' &&
    content.state !== null &&
    typeof content.state.declarationsWithheld === 'boolean' &&
    Array.isArray(content.heating)
  ) {
    return { status: 'resolved', content: content as SelectionContent };
  }
  return { status: 'unavailable' };
}

/**
 * The dish as the panels show it for the customer's choices while their own
 * content is unknown: no declaration (the standard recipe's does not apply),
 * the standard figures captioned as such, and no reheating (the standard's
 * timings need not hold for other choices either).
 */
export function withoutSelectionContent(dish: Dish): Dish {
  const state: DishContentState = {
    servingLabel: dish.contentState?.servingLabel ?? 'Per serving',
    declarationsWithheld: true,
    figuresAreStandardPreparation: true,
    figuresAreStale: dish.contentState?.figuresAreStale ?? false,
    heatingWithheld: true,
    heating: [],
    contentVersion: dish.contentState?.contentVersion ?? 0,
  };
  return { ...dish, ingredients: undefined, allergens: undefined, precautionaryStatement: undefined, contentState: state };
}

/** The dish as the panels show it with its selection's own resolved content. */
export function withSelectionContent(dish: Dish, content: SelectionContent): Dish {
  return {
    ...dish,
    ingredients: content.ingredients,
    allergens: content.allergens,
    precautionaryStatement: content.precautionaryStatement,
    nutrition: content.nutrition,
    contentState: content.state,
  };
}

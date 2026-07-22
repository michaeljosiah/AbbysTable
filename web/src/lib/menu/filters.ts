/**
 * Menu filter state — the shape only. The matching itself is Aonik's.
 *
 * This module used to own the semantics too: a `filterDishes` matcher and a
 * compile-time `FACET_GROUPS` built from the type unions. Both are gone.
 *
 * Filtering moved to the server because the browse endpoint pages its results,
 * so filtering one page in the browser gives wrong answers the moment the
 * catalogue outgrows a page. Which facets exist moved to tenant data, read from
 * `GET /commerce/catalog/facets`, so a group can be added, renamed or retired
 * with no deploy. See SPEC-2026-07-22-catalog-browse FR-2.
 *
 * What remains is the state's shape and the result-count copy.
 */

/**
 * Selected option TOKENS per facet key, e.g. `{ protein: ['chicken', 'fish'] }`.
 *
 * Open-keyed by design — the type cannot enumerate groups the tenant owns.
 * Values are the stable tokens the facets read advertised, never display
 * labels: Aonik rejects anything it did not publish with a 400, deliberately.
 */
export type MenuFilters = Record<string, string[]>;

export const EMPTY_FILTERS: MenuFilters = {};

/** One selected chip, resolved to its label for the removable pills. */
export interface ActiveFilter {
  key: string;
  value: string;
  label: string;
}

/**
 * "Showing 6 of 24 dishes" — `total` is the whole match set from Aonik, not the
 * number on screen, so the count stays honest while paging.
 */
export function resultLabel(visible: number, total: number): string {
  return `Showing ${visible} of ${total} ${total === 1 ? 'dish' : 'dishes'}`;
}

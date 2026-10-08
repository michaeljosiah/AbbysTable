/**
 * Menu filter state — its shape, the active-filter pills and the result-count
 * copy. React-free (tests/menu.test.tsx).
 *
 * The vocabulary and the matching rules are `./facets`; the order is
 * `./sort`. Which groups exist is tenant data, read from
 * `GET /commerce/catalog/facets`, so a group can be added, renamed or retired
 * with no deploy; Aonik applies them server-side, because the browse endpoint
 * pages its results and filtering one page in the browser gives wrong answers
 * the moment the catalogue outgrows a page (SPEC-2026-07-22-catalog-browse
 * FR-2). Demo mode mirrors the same contract (`MockAonikClient`).
 */

import type { MappedFacetGroup } from '@/lib/aonik/map';

import { isHeatGroup } from './facets';

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
  /** What the pill says: the chip's label, "Mild heat" for a heat chip. */
  label: string;
}

/**
 * The selected chips, in the groups' order, as pills. Heat pills read "Mild
 * heat" (the prototype's wording), since "Mild" alone says nothing out of
 * context. A token no group advertises is not shown — nothing applied it.
 */
export function activeFilters(
  groups: readonly MappedFacetGroup[],
  filters: MenuFilters,
): ActiveFilter[] {
  return groups.flatMap((group) =>
    (filters[group.key] ?? []).flatMap((value) => {
      const option = group.options.find((candidate) => candidate.value === value);
      if (!option) return [];
      const label = isHeatGroup(group.key) ? `${option.label} heat` : option.label;
      return [{ key: group.key, value, label }];
    }),
  );
}

/** How many chips are selected across every group (the Filters button's count). */
export function filterCount(filters: MenuFilters): number {
  return Object.values(filters).reduce((total, values) => total + values.length, 0);
}

/** "1 dish" / "6 dishes". */
export function dishCount(count: number): string {
  return `${count} ${count === 1 ? 'dish' : 'dishes'}`;
}

/**
 * The results line. "All 8 dishes" when nothing narrows the menu and every
 * dish is on screen; otherwise "Showing 6 of 24 dishes" — `total` is the whole
 * match set from the source, not the number on screen, so the count stays
 * honest while paging.
 */
export function resultLabel(visible: number, total: number, narrowed: boolean): string {
  if (!narrowed && visible >= total) return `All ${dishCount(total)}`;
  return `Showing ${Math.min(visible, total)} of ${dishCount(total)}`;
}

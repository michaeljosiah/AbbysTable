/**
 * The menu's filter vocabulary and matching rules — Menu Landing v3's four
 * groups, as frontend-backend-contract §4d records them. No React: the rules
 * are unit-tested on their own (tests/menu.test.tsx).
 *
 * WHO MATCHES. In live mode Aonik does: the facets read
 * (`GET /commerce/catalog/facets`) advertises the groups the tenant authored,
 * and the browse applies `facet.<key>=a,b` itself. In demo mode
 * `MockAonikClient` serves `MENU_FACET_GROUPS` and matches with
 * `filterDishes` — the same OR-within-a-group, AND-across-groups semantics —
 * so the menu behaves identically in both, and the browser never filters a
 * page of results on its own (that gives wrong answers once results page).
 *
 * NEVER A GUESS. A dish matches a value only through a field its record
 * actually carries. A dish without a protein source matches no protein chip;
 * without a heat level, no heat chip — it is left out, never placed in a
 * default. That is the whole safety rule, and it is why "Low sugar" is not
 * here: demo's dish records have no sugar flag, and the prototype's stand-in
 * (carbs ≤ 20g) would make a nutrition claim nobody has made. Live, it is the
 * tenant's own facet on Aonik's typed `lowSugar` (michaeljosiah/aonik#359),
 * advertised by the facets read and matched by Aonik.
 */

import type { MappedFacetGroup, MappedFacetOption } from '@/lib/aonik/map';
// Relative, not `@/`: demo fixtures reach this module in tests without the alias hook.
import { HEAT_LABELS, HEAT_STEPS, PROTEIN_TYPES, type Dish, type HeatLevel } from '../aonik/types';

import type { MenuFilters } from './filters';

/** A stable request token from a display label: "Gluten-free" → "gluten-free". */
export function toFacetToken(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Facet keys the page gives a treatment of its own — the Eating style note and
 * the Heat chips' pips. Keys, not labels: a tenant may rename a group freely.
 * They are also the attribute keys the operator data asks for
 * (SPEC-2026-07-22-catalog-browse § Operator data).
 */
export const FACET_KEY = {
  protein: 'protein',
  style: 'wellness',
  heat: 'heat',
  dietary: 'dietary',
} as const;

/**
 * Before #21 the demo (and the tenant seeded from it) called the heat group
 * `spice`. Still recognised for the pips, so a tenant that has not re-authored
 * its facets keeps them.
 */
const LEGACY_HEAT_KEY = 'spice';

/** Whether a facet group is the heat group (pips on its chips, "… heat" pills). */
export function isHeatGroup(key: string): boolean {
  return key === FACET_KEY.heat || key === LEGACY_HEAT_KEY;
}

/** Eating styles WITH a chip, in the design's order. "DASH" has none (§4d). */
export const EATING_STYLES = [
  'Protein-led',
  'Carb-conscious',
  'Plant-led',
  'Mediterranean-inspired',
] as const;

/** The heat chips' tokens, in the design's order, and the level each one is. */
export const HEAT_TOKENS: Record<string, HeatLevel> = {
  none: 'none',
  mild: 'low',
  medium: 'medium',
  hot: 'high',
};

/** The token for a level — the inverse of `HEAT_TOKENS` ("high" → "hot"). */
export function heatToken(level: HeatLevel): string {
  return Object.keys(HEAT_TOKENS).find((token) => HEAT_TOKENS[token] === level) ?? level;
}

/** How many chilli pips a heat chip draws, by its token (0 for anything unknown). */
export function heatChipPips(token: string): number {
  const level = HEAT_TOKENS[token];
  return level === undefined ? 0 : HEAT_STEPS[level];
}

/**
 * Dietary chips. The label is the chip's own words ("High in fibre" reads
 * better on a chip than the record's "High-fibre"); the token is the record's.
 */
const DIETARY_OPTIONS = [
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'dairy-free', label: 'Dairy-free' },
  { value: 'high-fibre', label: 'High in fibre' },
];

/**
 * The design's four groups, in its order. Demo mode serves these as its facets
 * read; a live tenant authors its own (and should author these).
 */
export const MENU_FACET_GROUPS: MappedFacetGroup[] = [
  {
    key: FACET_KEY.protein,
    label: 'Protein source',
    options: PROTEIN_TYPES.map((label) => ({ value: toFacetToken(label), label })),
  },
  {
    key: FACET_KEY.style,
    label: 'Eating style',
    options: EATING_STYLES.map((label) => ({ value: toFacetToken(label), label })),
  },
  {
    key: FACET_KEY.heat,
    label: 'Heat',
    options: Object.keys(HEAT_TOKENS).map((value) => ({
      value,
      label: HEAT_LABELS[HEAT_TOKENS[value]],
    })),
  },
  {
    key: FACET_KEY.dietary,
    label: 'Dietary & other',
    options: DIETARY_OPTIONS,
  },
];

/**
 * Where a product publishes its facet tokens in `attributesJson`: an object of
 * its own, so the display attributes (`protein: "Lamb"`, `dietary:
 * ["High-fibre"]`) stay the record's words while Aonik matches the very
 * tokens demo mode and every URL use (`?facet.protein=lamb`).
 */
export const FACET_ATTRIBUTE = 'facets';

/** A facet group as a tenant authors it (`scripts/seed/seed.mjs`). */
export interface TenantFacetGroup {
  key: string;
  label: string;
  matchKind: 'Attribute' | 'Range';
  /**
   * What Aonik matches the group's values against: a dot path into
   * `attributesJson`, or one of its typed fields (`heat`, aonik#359).
   */
  sourcePath: string;
  /** A Range group's options carry their half-open band, [min, max). */
  options: Array<MappedFacetOption & { min?: number; max?: number }>;
}

/**
 * The design's four groups as a tenant should author them: demo's own groups,
 * values and labels unchanged. Heat is matched on Aonik's TYPED heat (0–3,
 * aonik#359) as one-step bands, so the filter and the card's pips read the same
 * field — the card shows typed heat wherever the record carries it; the rest on
 * `facets.<key>`. No DASH, no meal type, no calories: the groups the page no
 * longer draws are not authored either.
 */
export function tenantFacetGroups(): TenantFacetGroup[] {
  return MENU_FACET_GROUPS.map((group) =>
    group.key === FACET_KEY.heat
      ? {
          key: group.key,
          label: group.label,
          matchKind: 'Range' as const,
          sourcePath: 'heat',
          options: group.options.map(({ value, label }) => {
            const step = heatChipPips(value);
            return { value, label, min: step, max: step + 1 };
          }),
        }
      : {
          key: group.key,
          label: group.label,
          matchKind: 'Attribute' as const,
          sourcePath: `${FACET_ATTRIBUTE}.${group.key}`,
          options: group.options.map(({ value, label }) => ({ value, label })),
        },
  );
}

/**
 * The tokens a dish publishes under `attributesJson.facets` — exactly the
 * values `dishMatchesFacet` would match it on, so a seeded tenant filters as
 * demo does. A field the dish does not carry is left out, never guessed.
 */
export function dishFacetTokens(dish: Dish): Record<string, string | string[]> {
  const tokens: Record<string, string | string[]> = {
    [FACET_KEY.style]: dish.wellness.map(toFacetToken),
    [FACET_KEY.dietary]: dish.dietary.map(toFacetToken),
  };
  if (dish.proteinType !== undefined) tokens[FACET_KEY.protein] = toFacetToken(dish.proteinType);
  if (dish.heat !== undefined) tokens[FACET_KEY.heat] = heatToken(dish.heat);
  return tokens;
}

/**
 * Does one dish match one facet value? Only through a field the dish carries:
 * a dish missing the attribute matches nothing, and an unknown key matches
 * nothing (Aonik would 400; the page never sends one — `sanitiseFilters`).
 */
export function dishMatchesFacet(dish: Dish, key: string, value: string): boolean {
  switch (key) {
    case FACET_KEY.protein:
      return dish.proteinType !== undefined && toFacetToken(dish.proteinType) === value;
    case FACET_KEY.style:
      return dish.wellness.some((style) => toFacetToken(style) === value);
    case FACET_KEY.heat:
      return dish.heat !== undefined && heatToken(dish.heat) === value;
    case FACET_KEY.dietary:
      return dish.dietary.some((tag) => toFacetToken(tag) === value);
    default:
      return false;
  }
}

/** OR within a group, AND across groups — Aonik's browse semantics. */
export function filterDishes(dishes: readonly Dish[], filters: MenuFilters): Dish[] {
  const groups = Object.entries(filters).filter(([, values]) => values.length > 0);
  return dishes.filter((dish) =>
    groups.every(([key, values]) => values.some((value) => dishMatchesFacet(dish, key, value))),
  );
}

/**
 * The demo's search, over what a card shows: name, components line,
 * description, protein source, eating styles and the heat word (the
 * prototype's haystack). Live search is Aonik's `search` parameter.
 */
export function dishMatchesSearch(dish: Dish, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    dish.title,
    dish.parts ?? '',
    dish.description,
    dish.proteinType ?? '',
    dish.wellness.join(' '),
    dish.heat ? HEAT_LABELS[dish.heat] : '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

/** The `facet.<key>=a,b` prefix — the wire format Aonik takes, kept in the URL too. */
export const FACET_PARAM_PREFIX = 'facet.';

/**
 * Facet selections from a page's search params: `facet.<key>=v1,v2`, so the
 * URL, the client and the API speak one language. Repeated values collapse.
 */
export function filtersFromParams(
  params: Record<string, string | string[] | undefined>,
): MenuFilters {
  const filters: MenuFilters = {};
  for (const [name, raw] of Object.entries(params)) {
    if (!name.startsWith(FACET_PARAM_PREFIX)) continue;
    const first = Array.isArray(raw) ? raw[0] : raw;
    const values = [...new Set((first ?? '').split(',').map((v) => v.trim()).filter(Boolean))];
    if (values.length) filters[name.slice(FACET_PARAM_PREFIX.length)] = values;
  }
  return filters;
}

/**
 * Only what the facets read advertised. A pasted or stale URL (a group the
 * tenant retired, the pre-#21 `facet.spice`, a typo) must not reach Aonik —
 * it answers an unknown key or value with a 400, which would take the whole
 * menu down — and must not leave a pill for a filter nothing applied.
 */
export function sanitiseFilters(
  filters: MenuFilters,
  groups: readonly MappedFacetGroup[],
): MenuFilters {
  const clean: MenuFilters = {};
  for (const group of groups) {
    const allowed = new Set(group.options.map((option) => option.value));
    const values = (filters[group.key] ?? []).filter((value) => allowed.has(value));
    if (values.length) clean[group.key] = values;
  }
  return clean;
}

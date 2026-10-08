/**
 * Demo-mode facets and option groups.
 *
 * These make `MockAonikClient` behave like Aonik rather than like a fixture
 * array: the same facet keys, the same option tokens, the same OR-within-group
 * / AND-across-groups semantics, and the same per-product option groups. That
 * parity is what lets the menu and personaliser be written once against the
 * client contract instead of branching on which mode is active.
 *
 * The facet groups are the menu design's own (Menu Landing v3, #21) and live
 * with their matching rules in `lib/menu/facets.ts`, so the vocabulary and
 * the rules a demo dish is matched by are one tested module. Switching a
 * tenant that authored the same groups to live mode should change the data,
 * not the behaviour (SPEC-2026-07-22-catalog-browse § Operator data).
 */

// Relative, not `@/`: the unit tests load this module without the alias hook.
import { MENU_FACET_GROUPS } from '../menu/facets';

import { HEAT_STEPS } from './types';
import type { Dish } from './types';
import { mapOptionGroups, type MappedFacetGroup, type MappedOptionGroup } from './map';
import { PERSONALISATION_GROUP_SOURCE } from './fixtures';

export const FACET_FIXTURES: MappedFacetGroup[] = MENU_FACET_GROUPS;

/**
 * A dish's personalisation groups, in Aonik's shape.
 *
 * Protein is `Multi` here deliberately: the template's own copy says "Choose 1
 * or more", and exercising the array-valued path in demo mode is the only way
 * to catch an encoder that assumes a bare string before it reaches live data.
 *
 * The heat group defaults to the dish's own level; a dish that has published
 * none keeps the group's authored default rather than one invented for it.
 */
export function fixtureOptionGroups(dish: Dish): MappedOptionGroup[] {
  const heat = dish.heat;
  return mapOptionGroups(
    PERSONALISATION_GROUP_SOURCE.map((group) =>
      group.key === 'heat' && heat !== undefined
        ? { ...group, defaultChoiceKey: String(HEAT_STEPS[heat]) }
        : group,
    ),
  );
}

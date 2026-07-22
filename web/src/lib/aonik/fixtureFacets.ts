/**
 * Demo-mode facets and option groups.
 *
 * These make `MockAonikClient` behave like Aonik rather than like a fixture
 * array: the same facet keys, the same option tokens, the same OR-within-group
 * / AND-across-groups semantics, and the same per-product option groups. That
 * parity is what lets the menu and personaliser be written once against the
 * client contract instead of branching on which mode is active.
 *
 * The values mirror what SPEC-2026-07-22-catalog-browse § Operator data asks
 * the tenant to author, so switching a correctly-authored tenant to live mode
 * should change the data, not the behaviour.
 */

import { DIETARY_TAGS, HEAT_STEPS, MEAL_TYPES, PROTEIN_TYPES, WELLNESS_GOALS } from './types';
import type { Dish } from './types';
import type { MappedFacetGroup, MappedOptionGroup } from './map';
import { PERSONALISATION_FIXTURE } from './fixtures';

/** A stable request token from a display label: "Gluten-free" → "gluten-free". */
export function toFacetToken(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const SPICE_OPTIONS = [
  { value: 'mild', label: 'Mild', step: 1 },
  { value: 'medium', label: 'Medium', step: 2 },
  { value: 'hot', label: 'Hot', step: 3 },
];

const CALORIE_OPTIONS = [
  { value: 'under-500', label: 'Under 500 kcal' },
  { value: '500-plus', label: '500+ kcal' },
];

export const FACET_FIXTURES: MappedFacetGroup[] = [
  {
    key: 'meal',
    label: 'Category',
    options: MEAL_TYPES.map((label) => ({ value: toFacetToken(label), label })),
  },
  {
    key: 'protein',
    label: 'Protein',
    options: PROTEIN_TYPES.map((label) => ({ value: toFacetToken(label), label })),
  },
  {
    key: 'wellness',
    label: 'Wellness',
    options: WELLNESS_GOALS.map((label) => ({ value: toFacetToken(label), label })),
  },
  {
    key: 'dietary',
    label: 'Dietary',
    options: DIETARY_TAGS.map((label) => ({ value: toFacetToken(label), label })),
  },
  {
    key: 'spice',
    label: 'Spice level',
    options: SPICE_OPTIONS.map(({ value, label }) => ({ value, label })),
  },
  {
    key: 'calories',
    label: 'Calories',
    options: CALORIE_OPTIONS,
  },
];

/**
 * Does one dish match one facet value? A dish missing the attribute simply does
 * not match — never a fallback, matching the fixtures' existing rule for dishes
 * the design templates never gave facet data.
 */
export function fixtureMatchesFacet(dish: Dish, key: string, value: string): boolean {
  switch (key) {
    case 'meal':
      return dish.mealType !== undefined && toFacetToken(dish.mealType) === value;
    case 'protein':
      return dish.proteinType !== undefined && toFacetToken(dish.proteinType) === value;
    case 'wellness':
      return dish.wellness.some((goal) => toFacetToken(goal) === value);
    case 'dietary':
      return dish.dietary.some((tag) => toFacetToken(tag) === value);
    case 'spice':
      return SPICE_OPTIONS.some(
        (option) => option.value === value && HEAT_STEPS[dish.heat] === option.step,
      );
    case 'calories': {
      const kcal = dish.nutrition.calories;
      if (kcal === undefined) return false;
      return value === 'under-500' ? kcal < 500 : kcal >= 500;
    }
    default:
      // An unknown key matches nothing. Aonik would 400; demo mode stays quiet
      // because the UI only ever submits tokens the facets read advertised.
      return false;
  }
}

/**
 * A dish's personalisation groups, in Aonik's shape.
 *
 * Built from the global fixture options, filtered to the groups that dish
 * actually offers — so a dish whose `personalisation` list is empty correctly
 * yields no groups and the panel hides.
 *
 * Protein is `Multi` here deliberately: the template's own copy says "Choose 1
 * or more", and exercising the array-valued path in demo mode is the only way
 * to catch an encoder that assumes a bare string before it reaches live data.
 */
export function fixtureOptionGroups(dish: Dish): MappedOptionGroup[] {
  const groups: MappedOptionGroup[] = [];
  const has = (key: string) => dish.personalisation.includes(key as never);

  const defaultKey = (options: { key: string; isAbbysChoice?: boolean }[]) =>
    options.find((option) => option.isAbbysChoice)?.key ?? options[0]?.key ?? '';

  if (has('portion')) {
    groups.push({
      key: 'portion',
      label: 'Choose your portion size',
      selectionMode: 'One',
      defaultChoiceKey: defaultKey(PERSONALISATION_FIXTURE.portions),
      choices: PERSONALISATION_FIXTURE.portions,
    });
  }

  if (has('protein')) {
    groups.push({
      key: 'protein',
      label: 'Choose your protein',
      helpText: 'Choose 1 or more',
      selectionMode: 'Multi',
      defaultChoiceKey: defaultKey(PERSONALISATION_FIXTURE.proteins),
      choices: PERSONALISATION_FIXTURE.proteins,
    });
  }

  if (has('sides')) {
    groups.push({
      key: 'side',
      label: 'Choose your side',
      selectionMode: 'One',
      defaultChoiceKey: defaultKey(PERSONALISATION_FIXTURE.sides),
      choices: PERSONALISATION_FIXTURE.sides,
    });
  }

  if (has('heat')) {
    const choices = PERSONALISATION_FIXTURE.heatLevels.map((level) => ({
      key: String(level.step),
      label: level.label,
      pricePence: 0,
      isAbbysChoice: level.step === HEAT_STEPS[dish.heat],
    }));
    groups.push({
      key: 'heat',
      label: 'Choose your heat level',
      selectionMode: 'One',
      defaultChoiceKey: String(HEAT_STEPS[dish.heat]),
      choices,
    });
  }

  return groups;
}

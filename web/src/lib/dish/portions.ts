import type { MappedOptionGroup, PersonalisationSelection } from '../aonik/map';
import type { DishOption, BoxPricing } from '../aonik/types';

export type PortionKey = 'light' | 'full';
export interface PortionModel {
  choices: [DishOption, DishOption];
}

/** An invalid catalogue must not silently become a free/default preparation. */
export function portionModel(groups: MappedOptionGroup[]): PortionModel | null {
  if (groups.length !== 1) return null;
  const group = groups[0];
  if (
    group.key !== 'portion' ||
    group.selectionMode !== 'One' ||
    group.defaultChoiceKey !== 'light' ||
    group.choices.length !== 2 ||
    group.valid === false ||
    (group.currency && group.currency !== 'GBP')
  )
    return null;
  const light = group.choices.find((choice) => choice.key === 'light');
  const full = group.choices.find((choice) => choice.key === 'full');
  if (
    !light ||
    !full ||
    light.pricePence !== 0 ||
    !Number.isSafeInteger(full.pricePence) ||
    full.pricePence < 0
  )
    return null;
  return {
    choices: [
      { ...light, label: 'Light Table' },
      { ...full, label: 'Full Table' },
    ],
  };
}

/** Unknown/retired choices stay visible as legacy lines; never normalise them away. */
export function linePortion(
  selection?: PersonalisationSelection,
): PortionKey | null {
  if (!selection || Object.keys(selection).length === 0) return 'light';
  if (Object.keys(selection).some((key) => key !== 'portion')) return null;
  return selection.portion === 'light' || selection.portion === 'full'
    ? selection.portion
    : null;
}

export function portionSelection(
  key: PortionKey,
): PersonalisationSelection | undefined {
  return key === 'light' ? undefined : { portion: key };
}

/** Default Light Table spellings merge; retired selections retain every key. */
export function selectionIdentity(
  selection?: PersonalisationSelection,
): string {
  const portion = linePortion(selection);
  if (portion) return `portion:${portion}`;
  return JSON.stringify(
    Object.entries(selection ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [
        key,
        Array.isArray(value) ? [...value].sort() : value,
      ]),
  );
}

export function portionDescription(
  groups: MappedOptionGroup[],
  selection?: PersonalisationSelection,
): string {
  const key = linePortion(selection);
  if (!key)
    return `Previous choices: ${Object.entries(selection ?? {})
      .map(
        ([name, value]) =>
          `${name}: ${Array.isArray(value) ? value.join(', ') : value}`,
      )
      .join(' · ')}`;
  const choice = portionModel(groups)?.choices.find((item) => item.key === key);
  return [key === 'light' ? 'Light Table' : 'Full Table', choice?.detail]
    .filter(Boolean)
    .join(' · ');
}

/** Exact presets win, including when a custom size is expanded across a tier. */
export function expandedBoxPrice(
  pricing: BoxPricing,
  size: number,
): number | null {
  if (
    !Number.isInteger(size) ||
    size < pricing.custom.minDishes ||
    size > pricing.custom.maxDishes
  )
    return null;
  const preset = pricing.presets.find((item) => item.dishCount === size);
  return (
    preset?.pricePence ??
    pricing.custom.basePence +
      (size - pricing.custom.baseDishes) * pricing.custom.perSpacePence
  );
}

/**
 * Choose Box's entry rules, React-free (`tests/choose-box.test.tsx`; contract
 * §4c, SHOPPING-STATE §3, design: Choose Box v2).
 *
 * Three small questions, answered in one place so the page, the chooser and the
 * tests cannot disagree:
 *  - which size does the page open on (`?dishes=` from How it works)?
 *  - what is the smallest box this customer can take (never below the dishes
 *    already in it)?
 *  - is a typed quantity one we can use?
 */

import type { BoxOffer } from '@/lib/aonik/types';

/** The size Step 1 opens on: a tier's card lit, or the set-your-own card open. */
export type EntrySize = { kind: 'preset'; size: number } | { kind: 'custom'; size: number };

/**
 * `?dishes=6|12|18|custom` (contract §4c). A preset's size lights its card;
 * `custom` opens the set-your-own card at the minimum; a missing or unknown
 * value falls back to the page's default — never an error, never an empty
 * selection. A number that is not a tier but is inside the range opens set-
 * your-own at that number (a stale link from a plan that had another tier).
 * The URL is a convenience: what the box costs comes from the plan.
 */
export function resolveEntrySize(
  param: string | string[] | undefined,
  presets: readonly Pick<BoxOffer, 'dishCount'>[],
  minDishes: number,
  maxDishes: number,
): EntrySize {
  return (
    parseEntry(param, presets, minDishes, maxDishes) ?? { kind: 'preset', size: presets[0]?.dishCount ?? minDishes }
  );
}

/**
 * Whether `?dishes=` named a size we recognised. Only then is the link's size
 * this entry's choice; an empty or unknown value is no choice, and the size of
 * an earlier visit still stands.
 */
export function entrySizeFromLink(
  param: string | string[] | undefined,
  presets: readonly Pick<BoxOffer, 'dishCount'>[],
  minDishes: number,
  maxDishes: number,
): boolean {
  return parseEntry(param, presets, minDishes, maxDishes) !== null;
}

function parseEntry(
  param: string | string[] | undefined,
  presets: readonly Pick<BoxOffer, 'dishCount'>[],
  minDishes: number,
  maxDishes: number,
): EntrySize | null {
  const raw = (Array.isArray(param) ? param[0] : param)?.trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'custom') return { kind: 'custom', size: minDishes };
  if (!/^\d{1,3}$/.test(raw)) return null;
  const size = Number(raw);
  if (presets.some((preset) => preset.dishCount === size)) return { kind: 'preset', size };
  if (size >= minDishes && size <= maxDishes) return { kind: 'custom', size };
  return null;
}

/** Which card is lit. A custom box takes its size from the field and the stepper. */
export type Selection = { source: 'preset'; size: number } | { source: 'custom' };

/**
 * What is lit and what the custom quantity reads, from what was CHOSEN and the
 * smallest box this one can be. A choice below the floor is raised to it — to
 * its own tier when the floor lands on one, set-your-own otherwise — and
 * `raised` says so (the rail's held-size line is for exactly that).
 */
export function deriveSelection(input: {
  chosen: Selection;
  chosenQty: number;
  floor: number;
  presets: readonly Pick<BoxOffer, 'dishCount'>[];
}): { selection: Selection; customQty: number; raised: boolean } {
  const chosenSize = input.chosen.source === 'custom' ? input.chosenQty : input.chosen.size;
  if (chosenSize >= input.floor) return { selection: input.chosen, customQty: input.chosenQty, raised: false };
  const onTier = input.presets.some((preset) => preset.dishCount === input.floor);
  return {
    selection: onTier ? { source: 'preset', size: input.floor } : { source: 'custom' },
    customQty: input.floor,
    raised: true,
  };
}

/**
 * The selection for a size an earlier visit (or the cart) already holds: its
 * tier when it is one, set-your-own at that size otherwise — whatever the cart
 * says about "custom": a live box reports a plain size.
 */
export function selectionForSize(
  size: number,
  presets: readonly Pick<BoxOffer, 'dishCount'>[],
): { selection: Selection; customQty: number | null } {
  return presets.some((preset) => preset.dishCount === size)
    ? { selection: { source: 'preset', size }, customQty: null }
    : { selection: { source: 'custom' }, customQty: size };
}

/**
 * The smallest box this customer can take: the dishes already in it, within
 * the range. Nothing is ever deleted to make a smaller box fit — fewer dishes
 * is a choice made on the next step.
 */
export function sizeFloor(dishCount: number, minDishes: number, maxDishes: number): number {
  return Math.min(maxDishes, Math.max(minDishes, dishCount));
}

/** Said in the rail when the box already holds more than the smallest tier. */
export function heldSizeCopy(dishCount: number): string {
  return `Your box has ${dishCount} ${dishCount === 1 ? 'dish' : 'dishes'}. To choose a smaller box, remove dishes on the next step.`;
}

export function rangeError(min: number, max: number): string {
  return `Choose between ${min} and ${max} dishes.`;
}

/**
 * A typed quantity: the whole number it is, or the reason it is not one. An
 * entry we cannot use changes nothing — the field simply shows the quantity it
 * had, with the range said beside it. Below the floor is not "out of range":
 * the box holds that many dishes, so it is raised to the floor.
 */
export function readTypedSize(
  raw: string,
  bounds: { min: number; max: number; floor: number },
): { ok: true; size: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return { ok: false, error: rangeError(bounds.min, bounds.max) };
  const size = Number(trimmed);
  if (size < bounds.min || size > bounds.max) return { ok: false, error: rangeError(bounds.min, bounds.max) };
  if (size < bounds.floor) return { ok: true, size: bounds.floor };
  return { ok: true, size };
}

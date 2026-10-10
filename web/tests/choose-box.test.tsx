import './support/runtime';

import assert from 'node:assert/strict';
import test from 'node:test';

import { BOX_FIXTURES, BOX_PRICING_FIXTURE, STOREFRONT_CONFIG_FIXTURE } from '../src/lib/aonik/fixtures';
import { deriveSelection, entrySizeFromLink, heldSizeCopy, rangeError, readTypedSize, resolveEntrySize, selectionForSize, sizeFloor } from '../src/lib/box/entry';
import { boxPricePence, cartTotals, customBoxPricePence } from '../src/lib/cart/CartProvider';
import { canGoBackTo, clearHop, isSitePath, readPreviousPath, recordHop, TRAIL_KEY } from '../src/lib/dom/trail';

/*
 * Choose Box v2 (#28): the entry size from `?dishes=`, the size a box can take,
 * a typed quantity, the one demo plan (£158), and the real "Back".
 */

const PRESETS = [{ dishCount: 6 }, { dishCount: 12 }, { dishCount: 18 }];

test('?dishes= preselects a tier; custom opens set-your-own at the minimum; anything else is the default, never an error', () => {
  assert.deepEqual(resolveEntrySize('12', PRESETS, 6), { kind: 'preset', size: 12 });
  assert.deepEqual(resolveEntrySize('18', PRESETS, 6), { kind: 'preset', size: 18 });
  assert.deepEqual(resolveEntrySize('custom', PRESETS, 6), { kind: 'custom', size: 6 });
  assert.deepEqual(resolveEntrySize(' CUSTOM ', PRESETS, 6), { kind: 'custom', size: 6 });
  // A number that is no tier is no choice (a stale or malformed link never changes the box).
  assert.deepEqual(resolveEntrySize('24', PRESETS, 6), { kind: 'preset', size: 6 });
  for (const unknown of [undefined, '', 'big', '0', '5', '100', '-6', '12.5', '１２', '6&x=1', ['nope']]) {
    assert.deepEqual(resolveEntrySize(unknown, PRESETS, 6), { kind: 'preset', size: 6 }, String(unknown));
  }
  // The first value of a repeated parameter.
  assert.deepEqual(resolveEntrySize(['18', '6'], PRESETS, 6), { kind: 'preset', size: 18 });
  // No tiers at all: the minimum, still a selection.
  assert.deepEqual(resolveEntrySize(undefined, [], 6), { kind: 'preset', size: 6 });
});

test('a box is never smaller than the dishes in it, and nothing says it is deleted', () => {
  assert.equal(sizeFloor(0, 6, 99), 6);
  assert.equal(sizeFloor(11, 6, 99), 11);
  assert.equal(sizeFloor(140, 6, 99), 99);
  assert.equal(heldSizeCopy(11), 'Your box has 11 dishes. To choose a smaller box, remove dishes on the next step.');
  assert.equal(heldSizeCopy(1), 'Your box has 1 dish. To choose a smaller box, remove dishes on the next step.');
});

test('a typed quantity: a whole number in range is taken; below the dishes held it is raised; anything else changes nothing and says the range', () => {
  const bounds = { min: 6, max: 99, floor: 9 };
  assert.deepEqual(readTypedSize('24', bounds), { ok: true, size: 24 });
  assert.deepEqual(readTypedSize(' 24 ', bounds), { ok: true, size: 24 });
  assert.deepEqual(readTypedSize('99', bounds), { ok: true, size: 99 });
  // In range but below the dishes already in the box: raised, not an error.
  assert.deepEqual(readTypedSize('7', bounds), { ok: true, size: 9 });
  const error = rangeError(6, 99);
  assert.equal(error, 'Choose between 6 and 99 dishes.');
  // An entry we cannot use carries no size at all: the quantity the field had stands.
  for (const bad of ['', '0', '5', '100', 'abc', '1.5', '-8', '1e2']) {
    assert.deepEqual(readTypedSize(bad, bounds), { ok: false, error }, bad);
  }
});

test('what is lit: a choice below the box’s floor is raised to its tier or to set-your-own, and said; the size already held is adopted whole', () => {
  const presets = PRESETS;
  const preset = (size: number) => ({ source: 'preset' as const, size });
  // Nothing raised.
  assert.deepEqual(deriveSelection({ chosen: preset(12), chosenQty: 6, floor: 6, presets }), { selection: preset(12), customQty: 6, raised: false });
  // Choosing the tier the box is already at is a choice, not a raise.
  assert.equal(deriveSelection({ chosen: preset(12), chosenQty: 6, floor: 12, presets }).raised, false);
  // Six chosen, twelve held: raised to the 12 tier.
  assert.deepEqual(deriveSelection({ chosen: preset(6), chosenQty: 6, floor: 12, presets }), { selection: preset(12), customQty: 12, raised: true });
  // Six chosen, eleven held: no tier of eleven, so set-your-own at eleven.
  assert.deepEqual(deriveSelection({ chosen: preset(6), chosenQty: 6, floor: 11, presets }), { selection: { source: 'custom' }, customQty: 11, raised: true });
  // A typed 8 over a floor of 11.
  assert.deepEqual(deriveSelection({ chosen: { source: 'custom' }, chosenQty: 8, floor: 11, presets }), { selection: { source: 'custom' }, customQty: 11, raised: true });
  // Set-your-own is reachable when the box holds exactly a tier's dishes (it was lost to the tier once).
  assert.deepEqual(deriveSelection({ chosen: { source: 'custom' }, chosenQty: 6, floor: 12, presets }), { selection: { source: 'custom' }, customQty: 12, raised: true });
  assert.deepEqual(deriveSelection({ chosen: { source: 'custom' }, chosenQty: 20, floor: 12, presets }), { selection: { source: 'custom' }, customQty: 20, raised: false });

  // A live box reports a plain size: a tier lights its card, anything else opens set-your-own at it.
  assert.deepEqual(selectionForSize(12, presets), { selection: preset(12), customQty: null });
  assert.deepEqual(selectionForSize(24, presets), { selection: { source: 'custom' }, customQty: 24 });

  // A link's size is this entry's choice only when it named one we recognise.
  for (const [param, from] of [['12', true], ['custom', true], ['24', false], ['', false], ['banana', false], [undefined, false], ['100', false]] as const) {
    assert.equal(entrySizeFromLink(param, presets, 6), from, String(param));
  }
});

test('one demo plan: £158 for six, the tiers and the custom scale derive from it, 6 to 99, delivery charged not struck', () => {
  assert.equal(BOX_FIXTURES[0].pricePence, 15800, '"6 dishes from £158"');
  assert.deepEqual(BOX_FIXTURES.map((offer) => offer.dishCount), [6, 12, 18]);
  assert.equal(BOX_PRICING_FIXTURE.custom.minDishes, 6);
  assert.equal(BOX_PRICING_FIXTURE.custom.maxDishes, 99);
  assert.equal(BOX_PRICING_FIXTURE.custom.basePence, 15800);

  // The two copies of the plan are one: the storefront config's reads the same figures.
  const plan = STOREFRONT_CONFIG_FIXTURE.box!;
  assert.equal(plan.minSize, BOX_PRICING_FIXTURE.custom.minDishes);
  assert.equal(plan.maxSize, BOX_PRICING_FIXTURE.custom.maxDishes);
  assert.equal(plan.perSpacePence, BOX_PRICING_FIXTURE.custom.perSpacePence);
  assert.deepEqual(plan.presets.map((preset) => [preset.size, preset.pricePence]), BOX_FIXTURES.map((offer) => [offer.dishCount, offer.pricePence]));

  // A set-your-own size lands on the same price as the tier of that size, and a preset is priced as itself.
  assert.equal(boxPricePence(6, false, BOX_PRICING_FIXTURE), 15800);
  assert.equal(customBoxPricePence(BOX_PRICING_FIXTURE, 6), 15800);
  assert.equal(customBoxPricePence(BOX_PRICING_FIXTURE, 7), 15800 + 2633);
  assert.ok(customBoxPricePence(BOX_PRICING_FIXTURE, 99) > customBoxPricePence(BOX_PRICING_FIXTURE, 98));

  // The steps' running total counts delivery, as Review's demo quote and a live quote do.
  const total = cartTotals({ boxSize: 6, isCustom: false, lines: [] }, BOX_PRICING_FIXTURE);
  assert.equal(total.totalPence, 15800 + 595);
  assert.equal(total.deliveryPence, 595);
  // …so a screen that prints the box and delivery on their own rows can make the rows add up to the total.
  assert.equal(total.boxPence + (total.surchargePence ?? 0) + total.extraPence + total.deliveryPence, total.totalPence);
  const line = { lineId: 'l', dishId: 'd', slug: 's', title: 't', imageUrl: '/i.jpg', quantity: 8, surchargePence: 100 };
  const over = cartTotals({ boxSize: 6, isCustom: false, lines: [line] }, BOX_PRICING_FIXTURE);
  assert.equal(over.extraDishes, 2, 'two dishes beyond the box');
  assert.equal(over.totalPence, 15800 + 800 + 2 * BOX_PRICING_FIXTURE.extraDishPence + 595);

  // Delivery is the same figure in the steps and in the storefront config, and never a struck-through "was".
  const delivery = BOX_PRICING_FIXTURE.delivery!;
  assert.equal(delivery.listPence, delivery.pricePence);
  assert.equal(delivery.pricePence, STOREFRONT_CONFIG_FIXTURE.delivery.chargedPence);
});

test('Back goes back only to a page of this site that is not the box builder; a hop is trusted only for the page it ends on', () => {
  assert.equal(canGoBackTo('/dishes/seafood-okra', '/menu'), true);
  assert.equal(canGoBackTo('/how-it-works', '/menu'), true);
  assert.equal(canGoBackTo('/menu', '/menu'), true);
  assert.equal(canGoBackTo('/box/dishes', '/menu'), false, 'not back into the funnel from its first step');
  assert.equal(canGoBackTo(null, '/menu'), false);

  assert.equal(isSitePath('/menu'), true);
  for (const bad of ['//evil.test/menu', 'https://evil.test', 'menu', '/a b', '/a\\b', '', null, 5]) assert.equal(isSitePath(bad), false, String(bad));

  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
  assert.equal(readPreviousPath(storage, '/box'), null);
  recordHop(storage, '/how-it-works', '/box');
  assert.equal(readPreviousPath(storage, '/box'), '/how-it-works');
  // Another visit to another site and back, landing on a different page: the old hop is not about this page.
  assert.equal(readPreviousPath(storage, '/menu'), null);
  // A full load starts a trail of its own.
  clearHop(storage);
  assert.equal(readPreviousPath(storage, '/box'), null);

  recordHop(storage, '/menu', '/box');
  recordHop(storage, '//evil.test', '/box');
  assert.equal(readPreviousPath(storage, '/box'), '/menu', 'a path that is not ours is never kept');
  assert.ok(store.get(TRAIL_KEY)?.includes('/menu'));
  store.set(TRAIL_KEY, 'not json');
  assert.equal(readPreviousPath(storage, '/box'), null);
  store.set(TRAIL_KEY, JSON.stringify({ from: '//evil.test', to: '/box' }));
  assert.equal(readPreviousPath(storage, '/box'), null);
  // Unreadable or unwritable storage is no trail, not an error.
  assert.equal(readPreviousPath({ getItem: () => { throw new Error('blocked'); } }, '/box'), null);
  recordHop({ setItem: () => { throw new Error('full'); } }, '/menu', '/box');
  clearHop({ removeItem: () => { throw new Error('blocked'); } });
});

import './support/runtime';

import assert from 'node:assert/strict';
import test from 'node:test';

import { BOX_FIXTURES, BOX_PRICING_FIXTURE, STOREFRONT_CONFIG_FIXTURE } from '../src/lib/aonik/fixtures';
import { heldSizeCopy, rangeError, readTypedSize, resolveEntrySize, sizeFloor } from '../src/lib/box/entry';
import { boxPricePence, cartTotals, customBoxPricePence } from '../src/lib/cart/CartProvider';
import { canGoBackTo, isSitePath, readPreviousPath, recordPath, TRAIL_KEY } from '../src/lib/dom/trail';

/*
 * Choose Box v2 (#28): the entry size from `?dishes=`, the size a box can take,
 * a typed quantity, the one demo plan (£158), and the real "Back".
 */

const PRESETS = [{ dishCount: 6 }, { dishCount: 12 }, { dishCount: 18 }];

test('?dishes= preselects a tier; custom opens set-your-own at the minimum; anything else is the default, never an error', () => {
  assert.deepEqual(resolveEntrySize('12', PRESETS, 6, 99), { kind: 'preset', size: 12 });
  assert.deepEqual(resolveEntrySize('18', PRESETS, 6, 99), { kind: 'preset', size: 18 });
  assert.deepEqual(resolveEntrySize('custom', PRESETS, 6, 99), { kind: 'custom', size: 6 });
  assert.deepEqual(resolveEntrySize(' CUSTOM ', PRESETS, 6, 99), { kind: 'custom', size: 6 });
  // A size inside the range that is no tier (a stale link): set-your-own at that number.
  assert.deepEqual(resolveEntrySize('24', PRESETS, 6, 99), { kind: 'custom', size: 24 });
  for (const unknown of [undefined, '', 'big', '0', '5', '100', '-6', '12.5', '１２', '6&x=1', ['nope']]) {
    assert.deepEqual(resolveEntrySize(unknown, PRESETS, 6, 99), { kind: 'preset', size: 6 }, String(unknown));
  }
  // The first value of a repeated parameter.
  assert.deepEqual(resolveEntrySize(['18', '6'], PRESETS, 6, 99), { kind: 'preset', size: 18 });
  // No tiers at all: the minimum, still a selection.
  assert.deepEqual(resolveEntrySize(undefined, [], 6, 99), { kind: 'preset', size: 6 });
});

test('a box is never smaller than the dishes in it, and nothing says it is deleted', () => {
  assert.equal(sizeFloor(0, 6, 99), 6);
  assert.equal(sizeFloor(11, 6, 99), 11);
  assert.equal(sizeFloor(140, 6, 99), 99);
  assert.equal(heldSizeCopy(11), 'Your box has 11 dishes. To choose a smaller box, remove dishes on the next step.');
  assert.equal(heldSizeCopy(1), 'Your box has 1 dish. To choose a smaller box, remove dishes on the next step.');
});

test('a typed quantity: a whole number in range is taken; below the dishes held it is raised; anything else reverts with the range', () => {
  const bounds = { min: 6, max: 99, floor: 9 };
  assert.deepEqual(readTypedSize('24', bounds), { ok: true, size: 24 });
  assert.deepEqual(readTypedSize(' 24 ', bounds), { ok: true, size: 24 });
  assert.deepEqual(readTypedSize('99', bounds), { ok: true, size: 99 });
  // In range but below the dishes already in the box: raised, not an error.
  assert.deepEqual(readTypedSize('7', bounds), { ok: true, size: 9 });
  const error = rangeError(6, 99);
  assert.equal(error, 'Choose between 6 and 99 dishes.');
  for (const bad of ['', '0', '5', '100', 'abc', '1.5', '-8', '1e2']) {
    assert.deepEqual(readTypedSize(bad, bounds), { ok: false, error, revertTo: 9 }, bad);
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

  // Delivery is the same figure in the steps and in the storefront config, and never a struck-through "was".
  const delivery = BOX_PRICING_FIXTURE.delivery!;
  assert.equal(delivery.listPence, delivery.pricePence);
  assert.equal(delivery.pricePence, STOREFRONT_CONFIG_FIXTURE.delivery.chargedPence);
});

test('Back goes back only to a page of this site that is not the box builder; the trail keeps a path, never a query', () => {
  assert.equal(canGoBackTo('/dishes/seafood-okra', '/menu'), true);
  assert.equal(canGoBackTo('/how-it-works', '/menu'), true);
  assert.equal(canGoBackTo('/menu', '/menu'), true);
  assert.equal(canGoBackTo('/box/dishes', '/menu'), false, 'not back into the funnel from its first step');
  assert.equal(canGoBackTo(null, '/menu'), false);

  assert.equal(isSitePath('/menu'), true);
  for (const bad of ['//evil.test/menu', 'https://evil.test', 'menu', '/a b', '/a\\b', '', null, 5]) assert.equal(isSitePath(bad), false, String(bad));

  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
  assert.equal(readPreviousPath(storage), null);
  recordPath(storage, '/dishes/seafood-okra');
  assert.equal(readPreviousPath(storage), '/dishes/seafood-okra');
  recordPath(storage, '//evil.test');
  assert.equal(store.get(TRAIL_KEY), '/dishes/seafood-okra', 'a path that is not ours is never kept');
  // Unreadable storage is no trail, not an error.
  assert.equal(readPreviousPath({ getItem: () => { throw new Error('blocked'); } }), null);
  recordPath({ setItem: () => { throw new Error('full'); } }, '/menu');
});

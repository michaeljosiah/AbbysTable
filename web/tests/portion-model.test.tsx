import './support/runtime';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { PortionCard } from '../src/components/dish/PortionCard';
import {
  portionModel,
  linePortion,
  portionSelection,
  selectionIdentity,
  expandedBoxPrice,
} from '../src/lib/dish/portions';
import {
  readQuickReturn,
  type QuickReturn,
} from '../src/lib/dish/quick-return';
import { summaryRows } from '../src/lib/checkout/summary';
import { boxStatus, guardRedirect } from '../src/lib/shopping-state';
import { RemovalWindow } from '../src/lib/cart/removalWindow';
import { MockAonikClient } from '../src/lib/aonik/client';
import { buildDemoQuote } from '../src/lib/cart/quote';
import { extraOptionKind } from '../src/lib/aonik/extra-options';
import type { BoxPricing } from '../src/lib/aonik/types';
import type { BoxQuote, MappedOptionGroup } from '../src/lib/aonik/map';

const portion: MappedOptionGroup = {
  key: 'portion',
  label: 'Portion',
  selectionMode: 'One',
  defaultChoiceKey: 'light',
  choices: [
    { key: 'light', label: 'Standard', detail: '225g', pricePence: 0 },
    { key: 'full', label: 'Large', detail: '450g', pricePence: 750 },
  ],
};

test('extras retain heat/size labels with live namespaced keys and keep unknown options neutral', () => {
  for (const key of ['heat', 'extra-pepper-sauce-heat'])
    assert.equal(extraOptionKind({ key }), 'heat');
  for (const key of ['size', 'extra-puff-puff-size'])
    assert.equal(extraOptionKind({ key }), 'size');
  assert.equal(extraOptionKind({ key: 'sauce' }), 'option');
});

test('every demo dish uses the approved £5 Full Table charge, additional to Signature', async () => {
  const client = new MockAonikClient();
  const dishes = await client.getDishes();
  assert.ok(dishes.length > 0);
  for (const dish of dishes) {
    const groups = await client.getDishOptionGroups(dish.slug);
    const model = portionModel(groups);
    assert.ok(model, dish.slug);
    assert.equal(model.choices[0].pricePence, 0, dish.slug);
    assert.equal(model.choices[1].pricePence, 500, dish.slug);
  }
  const dish = dishes.find((dish) => (dish.upgradePence ?? 0) > 0)!;
  assert.ok(dish);
  const signature = dish.upgradePence!;
  const pricing = await client.getBoxPricing();
  const quote = buildDemoQuote({
    state: {
      boxSize: 6,
      isCustom: false,
      extras: [],
      lines: [
        {
          lineId: 'full',
          dishId: dish.id,
          slug: dish.slug,
          title: dish.title,
          imageUrl: dish.imageUrl,
          quantity: 2,
          personalisation: { portion: 'full' },
          surchargePence: 500 + signature,
        },
        {
          lineId: 'light',
          dishId: dish.id,
          slug: dish.slug,
          title: dish.title,
          imageUrl: dish.imageUrl,
          quantity: 1,
          surchargePence: signature,
        },
      ],
    },
    pricing,
    signatureUpgradeFor: () => signature,
  });
  assert.ok(quote);
  assert.equal(quote.unitsSelected, 3);
  assert.equal(
    quote.components.find((row) => row.key === 'personalisation')?.amountPence,
    1000,
  );
  assert.equal(
    quote.components.find((row) => row.key === 'unitSurcharges')?.amountPence,
    3 * signature,
  );
  assert.equal(
    quote.totalPence,
    pricing.presets.find((box) => box.dishCount === 6)!.pricePence +
      1000 +
      3 * signature +
      (pricing.delivery?.pricePence ?? 0),
  );
});

test('portion UI uses canonical labels and the authored per-unit upcharge', () => {
  const html = renderToStaticMarkup(
    <PortionCard groups={[portion]} value="full" onChange={() => undefined} />,
  );
  assert.match(html, /Light Table/);
  assert.match(html, /Full Table/);
  assert.match(html, /450g/);
  assert.match(html, /\+£7\.50/);
  assert.match(html, /checked="" value="full"/);
  assert.doesNotMatch(html, /protein|heat|side/i);
});

test('ambiguous, retired and invalid catalogue groups cannot become orderable defaults', () => {
  for (const groups of [
    [],
    [portion, portion],
    [{ ...portion, valid: false }],
    [{ ...portion, currency: 'USD' }],
    [{ ...portion, defaultChoiceKey: 'full' }],
    [{ ...portion, selectionMode: 'Multi' as const }],
    [{ ...portion, choices: [portion.choices[0]] }],
    [
      {
        ...portion,
        choices: [
          portion.choices[0],
          { ...portion.choices[1], pricePence: -1 },
        ],
      },
    ],
  ]) {
    assert.equal(portionModel(groups), null);
  }
});

test('Light and Full are separate one-slot selections; equivalent defaults merge', () => {
  assert.equal(portionSelection('light'), undefined);
  assert.deepEqual(portionSelection('full'), { portion: 'full' });
  assert.equal(selectionIdentity(), selectionIdentity({}));
  assert.equal(selectionIdentity({}), selectionIdentity({ portion: 'light' }));
  assert.notEqual(selectionIdentity({ portion: 'full' }), selectionIdentity());
});

test('legacy choices are recognised without losing or normalising their values', () => {
  const selection = {
    portion: 'full',
    protein: 'goat',
    garnish: ['mint', 'parsley'],
  };
  const before = JSON.stringify(selection);
  assert.equal(linePortion(selection), null);
  assert.equal(linePortion({ portion: ['full'] }), null);
  assert.equal(linePortion({ portion: 'retired' }), null);
  assert.equal(
    selectionIdentity(selection),
    selectionIdentity({
      garnish: ['parsley', 'mint'],
      protein: 'goat',
      portion: 'full',
    }),
  );
  assert.equal(JSON.stringify(selection), before);
});

test('expanding into a preset uses its actual price, not the custom formula', () => {
  const pricing = {
    presets: [{ dishCount: 12, pricePence: 19000 }],
    custom: {
      minDishes: 6,
      maxDishes: 99,
      baseDishes: 6,
      basePence: 12000,
      perSpacePence: 2000,
    },
  } as BoxPricing;
  assert.equal(expandedBoxPrice(pricing, 11), 22000);
  assert.equal(expandedBoxPrice(pricing, 12), 19000);
  for (const size of [5, 100, 6.5, NaN])
    assert.equal(expandedBoxPrice(pricing, size), null);
});

const trip: QuickReturn = {
  source: 'dishes',
  id: 'goat',
  name: 'Goat',
  url: '/box/dishes?q=goat&return=review',
  selection: { portion: 'full' },
  entry: 'entry-1',
  time: 1000,
  scroll: 500,
  historyLength: 2,
  departed: true,
  returning: false,
};
test('Standards return keeps filters, Review context and the exact portion', () => {
  assert.deepEqual(readQuickReturn(JSON.stringify(trip), 2000), trip);
});
test('Standards return rejects expired, corrupt, external or wrong-step records', () => {
  for (const raw of [
    'broken',
    JSON.stringify({ ...trip, url: '//other.test/box/dishes' }),
    JSON.stringify({ ...trip, url: '/box/checkout' }),
    JSON.stringify({ ...trip, selection: { portion: 2 } }),
    JSON.stringify({ ...trip, time: -30_000_000 }),
  ]) {
    assert.equal(readQuickReturn(raw, 2000), null);
  }
});

test('delivery discount is struck through for partial and free reductions only', () => {
  const quote = {
    boxSize: 6,
    deliveryListPence: 1000,
    components: [{ key: 'deliveryCharged', amountPence: 500 }],
  } as BoxQuote;
  assert.deepEqual(summaryRows(quote, { deliveryDate: null })[0], {
    key: 'deliveryCharged:0',
    label: 'Delivery',
    value: '£5.00',
    was: '£10.00',
  });
  assert.equal(
    summaryRows({ ...quote, deliveryListPence: 500 }, { deliveryDate: null })[0]
      .was,
    undefined,
  );
  assert.equal(
    summaryRows(
      { ...quote, components: [{ key: 'deliveryCharged', amountPence: 0 }] },
      { deliveryDate: null },
    )[0].value,
    'Free',
  );
});

test('an overfilled or legacy-incomplete box must return to Add Dishes before checkout', () => {
  for (const dishCount of [5, 7]) {
    const status = boxStatus({
      hydrated: true,
      boxSize: 6,
      dishCount,
      unavailableCount: 0,
      ordered: false,
      lastStep: 'review',
    });
    assert.equal(guardRedirect('checkout', status), '/box/dishes');
  }
});

test('Undo expires after eight seconds and a new removal replaces its deadline', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let expired = 0;
  const window = new RemovalWindow(() => expired++);
  window.start();
  t.mock.timers.tick(7999);
  assert.equal(expired, 0);
  window.start();
  t.mock.timers.tick(7999);
  assert.equal(expired, 0);
  t.mock.timers.tick(1);
  assert.equal(expired, 1);
  window.resume();
  t.mock.timers.tick(9000);
  assert.equal(expired, 1);
});

test('Undo pauses without expiring and resumes with at least 2.5 seconds', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let expired = 0;
  const window = new RemovalWindow(() => expired++);
  window.start();
  t.mock.timers.tick(7000);
  window.pause();
  t.mock.timers.tick(30_000);
  assert.equal(expired, 0);
  window.resume();
  t.mock.timers.tick(2499);
  assert.equal(expired, 0);
  t.mock.timers.tick(1);
  assert.equal(expired, 1);
});

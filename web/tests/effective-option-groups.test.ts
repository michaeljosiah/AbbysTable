import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodeSelection,
  encodeSelection,
  mapOptionGroups,
  type MappedOptionGroup,
} from '../src/lib/aonik/map';
import {
  defaultSelection,
  localSurcharge,
  selectChoice,
  selectionDraft,
  selectionSummary,
} from '../src/lib/aonik/personalisation';

const groups: MappedOptionGroup[] = [
  {
    key: 'garnish',
    label: 'Choose a garnish',
    helpText: 'Finished at the table',
    selectionMode: 'One',
    defaultChoiceKey: 'parsley',
    choices: [
      { key: 'parsley', label: 'Parsley', pricePence: 0 },
      { key: 'mint', label: 'Mint', pricePence: 25 },
    ],
  },
  {
    key: 'toppings',
    label: 'Choose toppings',
    selectionMode: 'Multi',
    defaultChoiceKey: 'paprika',
    choices: [
      { key: 'paprika', label: 'Paprika', pricePence: 0 },
      { key: 'sesame', label: 'Sesame', pricePence: 50 },
    ],
  },
];

test('defaults and explicit add/edit encoding preserve group keys and cardinality', () => {
  const defaults = defaultSelection(groups);

  assert.deepEqual(defaults, { garnish: ['parsley'], toppings: ['paprika'] });
  assert.equal(encodeSelection(groups, defaults, true), undefined);
  assert.deepEqual(encodeSelection(groups, defaults, false), {
    garnish: 'parsley',
    toppings: ['paprika'],
  });

  const custom = {
    ...defaults,
    garnish: selectChoice(groups[0], defaults.garnish, 'mint'),
    toppings: selectChoice(groups[1], defaults.toppings, 'sesame'),
  };
  assert.deepEqual(encodeSelection(groups, custom), {
    garnish: 'mint',
    toppings: ['paprika', 'sesame'],
  });
});

test('decode and draft reopening retain every Multi choice', () => {
  const encoded = { garnish: 'mint', toppings: ['paprika', 'sesame'] };

  assert.deepEqual(decodeSelection(encoded), {
    garnish: ['mint'],
    toppings: ['paprika', 'sesame'],
  });
  assert.deepEqual(selectionDraft(groups, encoded), {
    garnish: ['mint'],
    toppings: ['paprika', 'sesame'],
  });
});

test('One replaces, Multi toggles without dropping its last choice', () => {
  assert.deepEqual(selectChoice(groups[0], ['parsley'], 'mint'), ['mint']);
  assert.deepEqual(selectChoice(groups[1], ['paprika'], 'sesame'), ['paprika', 'sesame']);
  assert.deepEqual(selectChoice(groups[1], ['paprika', 'sesame'], 'paprika'), ['sesame']);
  assert.deepEqual(selectChoice(groups[1], ['sesame'], 'sesame'), ['sesame']);
});

test('unknown group labels render normally and Multi drafts omit aggregate surcharge', () => {
  const draft = selectionDraft(groups, { garnish: 'mint', toppings: ['sesame', 'paprika'] });

  assert.equal(selectionSummary(groups, draft), 'Mint · Paprika · Sesame');
  assert.equal(localSurcharge(groups, defaultSelection(groups)), undefined);
  assert.equal(localSurcharge(groups, draft), undefined);
  assert.equal(localSurcharge(groups, { garnish: ['mint'], toppings: [] }), 25);
  assert.equal(localSurcharge(groups.slice(0, 1), { garnish: ['mint'] }), 25);
});

test('absolute source prices map to deltas against the authored default', () => {
  const [mapped] = mapOptionGroups([
    {
      key: 'side',
      label: 'Side',
      helpText: null,
      selectionMode: 'One',
      currency: 'GBP',
      sortOrder: 0,
      defaultChoiceKey: 'rice',
      choices: [
        { key: 'none', label: 'No side', note: null, price: 0, sortOrder: 0 },
        { key: 'rice', label: 'Rice', note: null, price: 2, sortOrder: 1 },
        { key: 'plantain', label: 'Plantain', note: null, price: 3.5, sortOrder: 2 },
      ],
    },
  ]);

  assert.deepEqual(
    mapped.choices.map(({ key, pricePence }) => ({ key, pricePence })),
    [
      { key: 'none', pricePence: -200 },
      { key: 'rice', pricePence: 0 },
      { key: 'plantain', pricePence: 150 },
    ],
  );
});

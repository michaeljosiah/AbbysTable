import assert from 'node:assert/strict';
import test from 'node:test';
import { dishPortionGroup } from './dish-portion-group.mjs';

const portion = {
  key: 'portion',
  selectionMode: 'One',
  defaultChoiceKey: 'light',
  currency: 'GBP',
  choices: [
    { key: 'light', price: 0 },
    { key: 'full', price: 5 },
  ],
};

test('dish setup attaches only portions and checks the approved £5 delta', () => {
  assert.equal(
    dishPortionGroup([{ key: 'protein' }, portion, { key: 'heat' }]),
    portion,
  );
  const nonzeroDefault = {
    ...portion,
    choices: [
      { key: 'light', price: 3 },
      { key: 'full', price: 8 },
    ],
  };
  assert.equal(dishPortionGroup([nonzeroDefault]), nonzeroDefault);
});

test('dish setup refuses missing, ambiguous, or incorrectly priced portions before writes', () => {
  for (const groups of [
    [],
    [portion, portion],
    [{ ...portion, currency: 'USD' }],
    [{ ...portion, defaultChoiceKey: 'full' }],
    [
      {
        ...portion,
        choices: [
          { key: 'light', price: 0 },
          { key: 'full', price: 10 },
        ],
      },
    ],
    [
      {
        ...portion,
        choices: [
          { key: 'light', price: 0 },
          { key: 'full', price: NaN },
        ],
      },
    ],
  ])
    assert.throws(() => dishPortionGroup(groups), /£5 Full Table delta/);
});

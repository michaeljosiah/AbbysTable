import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

import { fixtureOptionGroups } from '../src/lib/aonik/fixtureFacets';
import { DISH_FIXTURES } from '../src/lib/aonik/fixtures';
import type { MappedOptionGroup } from '../src/lib/aonik/map';
import type { Dish } from '../src/lib/aonik/types';
import {
  DISH_RETURN_STORAGE_KEY,
  DISH_RETURN_TTL_MS,
  chosenPortion,
  createDishReturnRecord,
  dishHref,
  dishReturnGateScript,
  readDishReturnParams,
  readDishReturnRecord,
  resolveDishReturn,
  returnedPortion,
  returnsByHistory,
  standardsHref,
} from '../src/lib/dish-return';
import { exampleDishFacts, joinWithAnd } from '../src/lib/standards/exampleDish';

const okra = DISH_FIXTURES.find((dish) => dish.slug === 'royal-seafood-okra') as Dish;
const groups = fixtureOptionGroups(okra);
const NOW = 1_800_000_000_000;

/* ---- Links ------------------------------------------------------------- */

test('both ends of the round trip build the same URLs', () => {
  assert.equal(standardsHref('royal-seafood-okra'), '/standards?from=dish&dish=royal-seafood-okra');
  assert.equal(
    standardsHref('royal-seafood-okra', 'full'),
    '/standards?from=dish&dish=royal-seafood-okra&portion=full',
  );
  assert.equal(dishHref('royal-seafood-okra'), '/menu/royal-seafood-okra');
  assert.equal(dishHref('royal-seafood-okra', 'full'), '/menu/royal-seafood-okra?portion=full');
});

/* ---- Our Standards' query ---------------------------------------------- */

test('a bare or malformed ?from=dish offers nothing', () => {
  assert.equal(readDishReturnParams({}), null);
  assert.equal(readDishReturnParams({ from: 'dish' }), null);
  assert.equal(readDishReturnParams({ from: 'dish', dish: '' }), null);
  assert.equal(readDishReturnParams({ from: 'dish', dish: '../account' }), null);
  assert.equal(readDishReturnParams({ from: 'dish', dish: 'Royal Seafood Okra' }), null);
  assert.equal(readDishReturnParams({ from: 'dish', dish: 'https://evil.example' }), null);
  assert.equal(readDishReturnParams({ from: 'dish', dish: 'a'.repeat(121) }), null);
  assert.equal(readDishReturnParams({ from: 'step2', dish: 'royal-seafood-okra' }), null);
  // A repeated parameter is not trusted.
  assert.equal(readDishReturnParams({ from: ['dish', 'dish'], dish: 'royal-seafood-okra' }), null);
  assert.equal(readDishReturnParams({ from: 'dish', dish: ['royal-seafood-okra'] }), null);
});

test('a well-formed query keeps its slug, and a portion only when it is URL-tame', () => {
  assert.deepEqual(readDishReturnParams({ from: 'dish', dish: 'royal-seafood-okra' }), {
    slug: 'royal-seafood-okra',
  });
  assert.deepEqual(
    readDishReturnParams({ from: 'dish', dish: 'royal-seafood-okra', portion: 'full' }),
    { slug: 'royal-seafood-okra', portion: 'full' },
  );
  assert.deepEqual(
    readDishReturnParams({ from: 'dish', dish: 'royal-seafood-okra', portion: '<script>' }),
    { slug: 'royal-seafood-okra' },
  );
});

test('the back link is validated against real dish data', () => {
  const params = { slug: 'royal-seafood-okra', portion: 'full' };

  // A forged slug: the catalogue has no such dish.
  assert.equal(resolveDishReturn({ slug: 'not-a-dish' }, null, []), null);
  // The catalogue answered for a different dish.
  assert.equal(resolveDishReturn(params, { slug: 'jollof-quinoa-bowl' }, groups), null);
  // No query at all.
  assert.equal(resolveDishReturn(null, okra, groups), null);

  assert.deepEqual(resolveDishReturn(params, okra, groups), {
    slug: 'royal-seafood-okra',
    href: '/menu/royal-seafood-okra?portion=full',
  });
});

test('only a real, non-default portion travels back to the dish', () => {
  const back = (portion?: string) =>
    resolveDishReturn({ slug: okra.slug, portion }, okra, groups)?.href;

  assert.equal(back(undefined), '/menu/royal-seafood-okra');
  assert.equal(back('light'), '/menu/royal-seafood-okra', 'the default needs no restoring');
  assert.equal(back('family'), '/menu/royal-seafood-okra', 'a portion the dish does not offer');
  // A dish with no portion group carries none.
  assert.equal(
    resolveDishReturn({ slug: okra.slug, portion: 'full' }, okra, [])?.href,
    '/menu/royal-seafood-okra',
  );
});

/* ---- The dish page's portion ------------------------------------------- */

test('the dish carries its chosen portion only when it differs from the default', () => {
  assert.equal(chosenPortion(groups, undefined), undefined);
  assert.equal(chosenPortion(groups, { portion: 'light', protein: ['salmon'] }), undefined);
  assert.equal(chosenPortion(groups, { portion: 'full', protein: ['chicken'] }), 'full');
  assert.equal(chosenPortion(groups, { portion: ['full'] }), 'full');
  assert.equal(chosenPortion(groups, { portion: 'jumbo' }), undefined);
});

test('the dish restores a portion from its own URL, validated against its groups', () => {
  assert.equal(returnedPortion('?portion=full', groups), 'full');
  assert.equal(returnedPortion('?from=menu&portion=full', groups), 'full');
  assert.equal(returnedPortion('', groups), undefined);
  assert.equal(returnedPortion('?portion=light', groups), undefined);
  assert.equal(returnedPortion('?portion=jumbo', groups), undefined);
  assert.equal(returnedPortion('?portion=full', []), undefined);

  const noPortionGroup: MappedOptionGroup[] = groups.filter((group) => group.key !== 'portion');
  assert.equal(returnedPortion('?portion=full', noPortionGroup), undefined);
});

/* ---- The session record ------------------------------------------------- */

const live = JSON.stringify(createDishReturnRecord('royal-seafood-okra', NOW - 60_000, 4));

/** Raw records and whether each counts for royal-seafood-okra at NOW. */
const RECORD_CASES: { name: string; raw: string | null; valid: boolean }[] = [
  { name: 'a live record for this dish', raw: live, valid: true },
  { name: 'no record', raw: null, valid: false },
  { name: 'an empty string', raw: '', valid: false },
  { name: 'unparseable JSON', raw: '{"v":1,', valid: false },
  { name: 'JSON null', raw: 'null', valid: false },
  { name: 'a bare number', raw: '1', valid: false },
  {
    name: 'a record for another dish',
    raw: JSON.stringify(createDishReturnRecord('jollof-quinoa-bowl', NOW - 60_000, 4)),
    valid: false,
  },
  {
    name: 'an expired record',
    raw: JSON.stringify(createDishReturnRecord('royal-seafood-okra', NOW - DISH_RETURN_TTL_MS, 4)),
    valid: false,
  },
  {
    name: 'a record one minute inside the TTL',
    raw: JSON.stringify(
      createDishReturnRecord('royal-seafood-okra', NOW - DISH_RETURN_TTL_MS + 60_000, 4),
    ),
    valid: true,
  },
  { name: 'a different version', raw: live.replace('"v":1', '"v":2'), valid: false },
  {
    name: 'a record with no history length',
    raw: JSON.stringify({ v: 1, t: NOW, slug: 'royal-seafood-okra' }),
    valid: false,
  },
  {
    name: 'a record with a string time',
    raw: JSON.stringify({ v: 1, t: String(NOW), slug: 'royal-seafood-okra', hl: 2 }),
    valid: false,
  },
];

for (const { name, raw, valid } of RECORD_CASES) {
  test(`record: ${name} ${valid ? 'shows' : 'does not show'} the link`, () => {
    const record = readDishReturnRecord(raw, 'royal-seafood-okra', NOW);
    assert.equal(record !== null, valid);
  });
}

test('the inline gate script makes exactly the same decision as readDishReturnRecord', () => {
  for (const { name, raw, valid } of RECORD_CASES) {
    const element = { hidden: false };
    const context = {
      window: { sessionStorage: { getItem: (key: string) => (key === DISH_RETURN_STORAGE_KEY ? raw : null) } },
      document: { getElementById: (id: string) => (id === 'gate' ? element : null) },
      Date: { now: () => NOW },
      JSON,
      isFinite,
    };
    vm.runInNewContext(dishReturnGateScript('royal-seafood-okra', 'gate'), context);
    assert.equal(element.hidden, !valid, `gate script disagreed on: ${name}`);
  }
});

test('the gate script hides the link when storage throws', () => {
  const element = { hidden: false };
  vm.runInNewContext(dishReturnGateScript('royal-seafood-okra', 'gate'), {
    window: {
      sessionStorage: {
        getItem() {
          throw new Error('SecurityError');
        },
      },
    },
    document: { getElementById: () => element },
    Date,
    JSON,
    isFinite,
  });
  assert.equal(element.hidden, true);
});

test('no value can close the inline script element', () => {
  const script = dishReturnGateScript('a</script><script>alert(1)//', 'gate');
  assert.equal(script.includes('</script'), false);
  assert.equal(script.includes('<'), false);
});

test('Back to dish goes back only when the entry behind is the dish', () => {
  const record = createDishReturnRecord('royal-seafood-okra', NOW, 4);
  assert.equal(returnsByHistory(record, 5), true);
  // An in-page jump on Our Standards pushed another entry: replace instead.
  assert.equal(returnsByHistory(record, 6), false);
  // History was cut and regrown.
  assert.equal(returnsByHistory(record, 3), false);
});

/* ---- The example dish panel -------------------------------------------- */

test('the example panel prints only published figures, and names the gaps', () => {
  const facts = exampleDishFacts(okra);

  assert.deepEqual(
    facts.cells.map((cell) => [cell.label, cell.value]),
    [
      ['kcal', '560'],
      ['Fat', '19g'],
      ['Saturates', undefined],
      ['Carbs', '14g'],
      ['Sugars', undefined],
      ['Fibre', '7g'],
      ['Protein', '40g'],
      ['Salt', undefined],
    ],
  );
  assert.deepEqual(facts.unpublished, ['saturates', 'sugars', 'salt']);
  assert.equal(facts.allergens, okra.allergens);
  assert.equal(facts.figuresNote, undefined);
});

test('a dish with no declaration shows none — never a guess', () => {
  const bowl = DISH_FIXTURES.find((dish) => dish.slug === 'jollof-quinoa-bowl') as Dish;
  assert.equal(exampleDishFacts(bowl).allergens, undefined);

  // Aonik withheld the declarations: the half it still returned is not printed.
  const withheld: Dish = {
    ...okra,
    contentState: {
      servingLabel: 'Per serving',
      declarationsWithheld: true,
      figuresAreStandardPreparation: false,
      figuresAreStale: true,
      heatingWithheld: false,
      heating: [],
      contentVersion: 1,
    },
  };
  const facts = exampleDishFacts(withheld);
  assert.equal(facts.allergens, undefined);
  assert.equal(facts.figuresNote, 'These figures are under review and may not reflect the current recipe.');
});

test('a zero is a published figure, not a gap', () => {
  const facts = exampleDishFacts({ ...okra, nutrition: { saltGrams: 0, calories: 0 } });
  assert.equal(facts.cells.find((cell) => cell.label === 'Salt')?.value, '0g');
  assert.equal(facts.cells.find((cell) => cell.label === 'kcal')?.value, '0');
});

test('gaps are listed in plain English', () => {
  assert.equal(joinWithAnd([]), '');
  assert.equal(joinWithAnd(['salt']), 'salt');
  assert.equal(joinWithAnd(['sugars', 'salt']), 'sugars and salt');
  assert.equal(joinWithAnd(['saturates', 'sugars', 'salt']), 'saturates, sugars and salt');
});

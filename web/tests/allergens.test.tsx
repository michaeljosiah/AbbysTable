import './support/runtime';

import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { DishInfoPanels } from '../src/components/dish/DishInfoPanels';
import { ExampleDishCard } from '../src/components/how-it-works/ExampleDishCard';
import { ExampleDishPanel } from '../src/components/standards/ExampleDishPanel';
import {
  ALLERGEN_NAMES,
  allergenLine,
  declaredAllergens,
  NONE_DECLARED,
  splitAllergenText,
} from '../src/lib/allergens';
import type { ExtraRowDto, ResolvedContentDto } from '../src/lib/aonik/dto';
import { mapExtraRow, mapResolvedContent } from '../src/lib/aonik/map';
import type { Dish } from '../src/lib/aonik/types';
import { exampleDishFacts as howItWorksFacts } from '../src/lib/how-it-works/exampleDish';
import { exampleDishFacts as standardsFacts } from '../src/lib/standards/exampleDish';

/*
 * Controlled allergens (michaeljosiah/aonik#351): the 14 groups as Aonik
 * declares them, an empty reviewed list that is never an allergen-free claim,
 * and the kitchen's own precautionary statement. Never inferred, never
 * dropped: a declaration that cannot be read whole is not shown at all.
 */

/** A resolved content block as Aonik sends it since #351. */
function content(overrides: Partial<ResolvedContentDto> = {}): ResolvedContentDto {
  return {
    servingLabel: 'Per portion',
    nutrition: { kcal: 520, proteinGrams: 40, carbsGrams: 50, fatGrams: 18, fibreGrams: 6, sugarsGrams: 4, saltGrams: 1.2 },
    ingredients: 'Chicken, rice, tomato, peppers, onion, sesame oil.',
    allergens: 'Sesame',
    declarationsWithheld: false,
    heating: [],
    heatingWithheld: true,
    isStandardPreparation: false,
    isStale: false,
    canonicalSelectionJson: '{}',
    matchedVariantSelectionJson: null,
    contentVersion: 3,
    allergensPresent: ['Sesame'],
    precautionaryStatement: null,
    ...overrides,
  };
}

test('the 14 groups, by the names a customer reads, in Aonik’s order', () => {
  assert.equal(ALLERGEN_NAMES.size, 14);
  // Exactly Aonik's FormatAllergens words, in its enum order — the label on the box says the same.
  assert.deepEqual(
    [...ALLERGEN_NAMES.values()],
    [
      'Celery',
      'Cereals containing gluten',
      'Crustaceans',
      'Eggs',
      'Fish',
      'Lupin',
      'Milk',
      'Molluscs',
      'Mustard',
      'Peanuts',
      'Sesame',
      'Soybeans',
      'Sulphur dioxide and sulphites',
      'Tree nuts',
    ],
  );
  // Aonik's own words, so the website and the box's label agree.
  assert.deepEqual(declaredAllergens(['CerealsContainingGluten', 'Milk', 'TreeNuts', 'Soybeans']), [
    'Cereals containing gluten',
    'Milk',
    'Tree nuts',
    'Soybeans',
  ]);
  // Nothing from an object's prototype passes for an allergen.
  assert.equal(declaredAllergens(['Milk', 'constructor']), null);
  assert.equal(declaredAllergens(['hasOwnProperty']), null);
  assert.deepEqual(declaredAllergens(['Milk', 'Milk']), ['Milk']);
  assert.deepEqual(declaredAllergens([]), []);
  // One value we do not know makes the whole list unreadable: never one dropped.
  assert.equal(declaredAllergens(['Milk', 'Kiwi']), null);
  assert.equal(declaredAllergens(['Milk, Fish']), null);
  assert.equal(declaredAllergens([3]), null);
  assert.equal(declaredAllergens(null), null);
  assert.equal(declaredAllergens('Milk'), null);
});

test('a reviewed list with none of the 14 is never "None" or "free from"', () => {
  assert.equal(allergenLine([]), NONE_DECLARED);
  assert.equal(NONE_DECLARED, 'None of the 14 regulated allergens declared');
  assert.equal(allergenLine(['Milk', 'Fish']), 'Milk, Fish');
  // An older Aonik's text: "None", or Aonik's own reviewed-and-none wording, is a declaration of none.
  assert.deepEqual(splitAllergenText('None'), []);
  assert.deepEqual(splitAllergenText(NONE_DECLARED), []);
  assert.deepEqual(splitAllergenText('Milk, Fish; Sesame'), ['Milk', 'Fish', 'Sesame']);
  assert.equal(splitAllergenText(undefined), undefined);
  // Blank text declares nothing: never "none declared".
  for (const blank of ['', '  ', ',', ' ; ']) assert.equal(splitAllergenText(blank), undefined, JSON.stringify(blank));
});

test('the dish line comes from the controlled list, with the kitchen’s statement as authored', () => {
  const mapped = mapResolvedContent(
    content({
      allergens: 'Milk, Fish',
      allergensPresent: ['Fish', 'Milk'],
      precautionaryStatement: '  Made in a kitchen that also handles peanuts.  ',
    }),
  );
  assert.equal(mapped.allergens, 'Fish, Milk');
  assert.deepEqual(mapped.allergenNames, ['Fish', 'Milk']);
  assert.equal(mapped.precautionaryStatement, 'Made in a kitchen that also handles peanuts.');
  assert.equal(mapped.ingredients, 'Chicken, rice, tomato, peppers, onion, sesame oil.');

  const none = mapResolvedContent(content({ allergens: NONE_DECLARED, allergensPresent: [] }));
  assert.equal(none.allergens, NONE_DECLARED);
  assert.deepEqual(none.allergenNames, []);
});

test('withheld, or a list that cannot be read whole: no allergens, no ingredients, no statement', () => {
  // Aonik withholds an unreviewed or stale declaration…
  const withheld = mapResolvedContent(
    content({ declarationsWithheld: true, allergens: null, allergensPresent: null, precautionaryStatement: 'May contain nuts.' }),
  );
  assert.equal(withheld.allergens, undefined);
  assert.equal(withheld.ingredients, undefined);
  assert.equal(withheld.precautionaryStatement, undefined);
  assert.equal(withheld.state.declarationsWithheld, true);

  // A source that sends the member speaks for it: null is unreviewed, never a cue to read the text.
  const warn = mock.method(console, 'warn', () => undefined);
  const unreviewed = mapResolvedContent(content({ allergensPresent: null, allergens: 'Sesame' }));
  assert.equal(unreviewed.allergens, undefined);
  assert.equal(unreviewed.ingredients, undefined);
  assert.match(String(warn.mock.calls[0]?.arguments[0]), /not reviewed/);

  // …and one we cannot read whole is withheld here, ingredients and all (and logged).
  const unknown = mapResolvedContent(content({ allergensPresent: ['Sesame', 'Kiwi'], allergens: 'Sesame, Kiwi' }));
  assert.equal(warn.mock.callCount(), 2);
  assert.match(String(warn.mock.calls[1]?.arguments[0]), /does not know/);
  warn.mock.restore();
  assert.equal(unknown.allergens, undefined);
  assert.equal(unknown.allergenNames, undefined);
  assert.equal(unknown.ingredients, undefined);
  assert.equal(unknown.state.declarationsWithheld, true);
});

test('an older Aonik without the controlled list: its text, as before', () => {
  const legacy = content({ allergens: 'Milk; Fish' });
  delete legacy.allergensPresent;
  delete legacy.precautionaryStatement;
  const mapped = mapResolvedContent(legacy);
  assert.equal(mapped.allergens, 'Milk; Fish', 'its text, exactly as written');
  assert.deepEqual(mapped.allergenNames, ['Milk', 'Fish']);
  const bracketed = content({ allergens: 'Milk (cow; goat), Fish' });
  delete bracketed.allergensPresent;
  assert.equal(mapResolvedContent(bracketed).allergens, 'Milk (cow; goat), Fish');
  // Its "None" reads as the reviewed-and-none wording too — never "None".
  const none = content({ allergens: 'None' });
  delete none.allergensPresent;
  assert.equal(mapResolvedContent(none).allergens, NONE_DECLARED);
  // Blank text is nothing declared: "not yet published", never "none declared".
  for (const blank of ['', '  ', ',']) {
    const empty = content({ allergens: blank });
    delete empty.allergensPresent;
    assert.equal(mapResolvedContent(empty).allergens, undefined, JSON.stringify(blank));
  }
});

function extraRow(contentDto: ResolvedContentDto | null): ExtraRowDto {
  return {
    productId: 'p-1',
    productVariantId: 'v-1',
    slug: 'chin-chin',
    name: 'Chin chin',
    description: null,
    imageUrl: null,
    tags: [],
    attributesJson: null,
    unitPrice: 4.5,
    unitSurcharge: null,
    currency: 'GBP',
    content: contentDto,
    optionGroups: [],
  };
}

test('extras: the controlled names, [] for none declared — Aonik’s wording is never read as one allergen', () => {
  assert.deepEqual(mapExtraRow(extraRow(content({ allergensPresent: ['Eggs', 'Milk'] }))).allergens, ['Eggs', 'Milk']);
  const none = mapExtraRow(extraRow(content({ allergens: NONE_DECLARED, allergensPresent: [] })));
  assert.deepEqual(none.allergens, []);
  // An older Aonik's text with the same wording, too.
  const legacy = content({ allergens: NONE_DECLARED });
  delete legacy.allergensPresent;
  assert.deepEqual(mapExtraRow(extraRow(legacy)).allergens, []);
  assert.equal(
    mapExtraRow(extraRow(content({ precautionaryStatement: 'May contain peanuts.' }))).precautionaryStatement,
    'May contain peanuts.',
  );
  assert.equal(mapExtraRow(extraRow(null)).allergens, undefined, 'no content: not declared');
});

const DISH: Dish = {
  id: 'd-1',
  slug: 'jollof',
  title: 'Jollof',
  description: '',
  imageUrl: '',
  tags: [],
  isSignature: false,
  nutrition: {},
  isFeatured: false,
  wellness: [],
  dietary: [],
};

test('the dish page shows the declaration and the statement — or says plainly it is not published', () => {
  const declared = mapResolvedContent(
    content({ allergensPresent: [], allergens: NONE_DECLARED, precautionaryStatement: 'Made in a kitchen that also handles peanuts.' }),
  );
  const html = renderToStaticMarkup(
    <DishInfoPanels
      dish={{
        ...DISH,
        ingredients: declared.ingredients,
        allergens: declared.allergens,
        precautionaryStatement: declared.precautionaryStatement,
        contentState: declared.state,
      }}
      heating={[]}
    />,
  );
  assert.match(
    html,
    /<strong>Allergens:<\/strong> None of the 14 regulated allergens declared<span class="precaution">Made in a kitchen that also handles peanuts\.<\/span>/,
  );

  // An older Aonik's "None" never reaches the page as "None" either.
  const legacy = content({ allergens: 'None' });
  delete legacy.allergensPresent;
  const legacyNone = mapResolvedContent(legacy);
  const legacyHtml = renderToStaticMarkup(
    <DishInfoPanels dish={{ ...DISH, allergens: legacyNone.allergens, contentState: legacyNone.state }} heating={[]} />,
  );
  assert.match(legacyHtml, /<strong>Allergens:<\/strong> None of the 14 regulated allergens declared/);
  assert.doesNotMatch(legacyHtml, /Allergens:<\/strong> None</);

  const withheld = mapResolvedContent(content({ declarationsWithheld: true, allergensPresent: null, allergens: null }));
  const quiet = renderToStaticMarkup(
    <DishInfoPanels
      dish={{ ...DISH, allergens: withheld.allergens, precautionaryStatement: 'May contain nuts.', contentState: withheld.state }}
      heating={[]}
    />,
  );
  assert.match(quiet, /Allergen information is not yet published for this dish\./);
  assert.doesNotMatch(quiet, /May contain nuts/, 'never a statement without its declaration');
});

test('the example dishes (Our Standards, How it works) carry the statement with the declaration, never alone', () => {
  const resolved = mapResolvedContent(
    content({ allergensPresent: [], allergens: NONE_DECLARED, precautionaryStatement: 'Made in a kitchen that also handles tree nuts.' }),
  );
  const example: Dish = {
    ...DISH,
    ingredients: resolved.ingredients,
    allergens: resolved.allergens,
    precautionaryStatement: resolved.precautionaryStatement,
    contentState: resolved.state,
  };
  assert.equal(standardsFacts(example).allergens, NONE_DECLARED);
  assert.equal(standardsFacts(example).precautionaryStatement, 'Made in a kitchen that also handles tree nuts.');
  assert.equal(howItWorksFacts(example).allergens, NONE_DECLARED);
  assert.equal(howItWorksFacts(example).precautionaryStatement, 'Made in a kitchen that also handles tree nuts.');

  // No declaration (withheld, or none published): no statement either.
  const withheld = { ...example, contentState: { ...resolved.state, declarationsWithheld: true } };
  assert.equal(standardsFacts(withheld).precautionaryStatement, undefined);
  assert.equal(howItWorksFacts(withheld).precautionaryStatement, null);
  const bare = { ...example, allergens: undefined, contentState: undefined };
  assert.equal(standardsFacts(bare).precautionaryStatement, undefined);
  assert.equal(howItWorksFacts(bare).precautionaryStatement, null);
});

test('the example dishes print the statement beside the declaration', () => {
  const resolved = mapResolvedContent(
    content({ allergensPresent: ['Milk'], allergens: 'Milk', precautionaryStatement: 'Made in a kitchen that also handles sesame.' }),
  );
  const example: Dish = {
    ...DISH,
    ingredients: resolved.ingredients,
    allergens: resolved.allergens,
    precautionaryStatement: resolved.precautionaryStatement,
    contentState: resolved.state,
  };
  for (const html of [renderToStaticMarkup(<ExampleDishPanel dish={example} />), renderToStaticMarkup(<ExampleDishCard dish={example} />)]) {
    assert.match(html, /Allergens<\/span> (?:<span class="allergensValue">)?Milk(?:<\/span>)?<span class="precaution">Made in a kitchen that also handles sesame\.<\/span>/);
  }
});

import './support/runtime';

import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { GET as dishContent } from '../src/app/api/dish-content/[slug]/route';
import { DishInfoPanels } from '../src/components/dish/DishInfoPanels';
import type { ResolvedContentDto } from '../src/lib/aonik/dto';
import type { Dish } from '../src/lib/aonik/types';
import {
  readSelection,
  readSelectionContentAnswer,
  selectionContentPath,
  withoutSelectionContent,
} from '../src/lib/dish/selectionContent';

import { aonikRequests, configureAonik, useAonik } from './support/aonik';
import { resetCookies } from './support/next-headers';

/*
 * A dish's declaration is authored for ONE preparation. When the customer's
 * choices are not the standard ones, the panels describe those choices —
 * Aonik's resolution for exactly that selection — and never the standard
 * recipe's ingredients or allergens.
 */

const env = process.env as Record<string, string | undefined>;

const STANDARD: Dish = {
  id: 'd-1',
  slug: 'jollof-chicken',
  title: 'Jollof Chicken',
  description: '',
  imageUrl: '',
  tags: [],
  isSignature: false,
  nutrition: { calories: 520, proteinGrams: 40 },
  isFeatured: false,
  wellness: [],
  dietary: [],
  ingredients: 'Chicken, rice, tomato.',
  allergens: 'Celery',
  precautionaryStatement: 'Made in a kitchen that also handles peanuts.',
  contentState: {
    servingLabel: 'Per portion',
    declarationsWithheld: false,
    figuresAreStandardPreparation: false,
    figuresAreStale: false,
    heatingWithheld: false,
    heating: [],
    contentVersion: 4,
  },
};

test('only a small, plain selection is passed on', () => {
  assert.deepEqual(readSelection('{"protein":"king-prawns"}'), { protein: 'king-prawns' });
  assert.deepEqual(readSelection('{"sides":["plantain","slaw"]}'), { sides: ['plantain', 'slaw'] });
  for (const raw of [null, '', 'nope', '[]', '{}', '"x"', '{"a":1}', '{"a":["b",2]}', '{"a b":"c"}', `{"a":"${'x'.repeat(3000)}"}`]) {
    assert.equal(readSelection(raw), null, String(raw));
  }
  assert.equal(
    selectionContentPath('jollof-chicken', { protein: 'king-prawns' }),
    '/api/dish-content/jollof-chicken?selection=%7B%22protein%22%3A%22king-prawns%22%7D',
  );
});

test('without its own content, a selection shows no declaration — the standard one does not apply', () => {
  const shown = withoutSelectionContent(STANDARD);
  assert.equal(shown.ingredients, undefined);
  assert.equal(shown.allergens, undefined);
  assert.equal(shown.precautionaryStatement, undefined);
  assert.equal(shown.contentState?.declarationsWithheld, true);
  assert.equal(shown.contentState?.figuresAreStandardPreparation, true, 'the figures are captioned as the standard’s');
  assert.deepEqual(readSelectionContentAnswer({ status: 'resolved' }), { status: 'unavailable' });
  assert.deepEqual(readSelectionContentAnswer(null), { status: 'unavailable' });
});

test('the panels, asked about other choices, never print the standard recipe’s declaration', () => {
  const html = renderToStaticMarkup(
    <DishInfoPanels dish={STANDARD} heating={[]} selection={{ protein: 'king-prawns' }} />,
  );
  assert.doesNotMatch(html, /Celery/);
  assert.doesNotMatch(html, /Chicken, rice, tomato/);
  assert.doesNotMatch(html, /handles peanuts/);
  assert.match(html, /Checking the ingredients and allergens for your choices…/);
  assert.match(html, /Allergen information for the choices you’ve made is not yet published\./);
  assert.match(html, /These figures are for the standard preparation\./);

  // The standard preparation: the dish's own declaration, as before.
  const standard = renderToStaticMarkup(<DishInfoPanels dish={STANDARD} heating={[]} />);
  assert.match(standard, /<strong>Allergens:<\/strong> Celery/);
});

const ROUTE = (slug: string, selection: string) =>
  dishContent(new Request(`http://shop.test/api/dish-content/${slug}?selection=${encodeURIComponent(selection)}`), {
    params: Promise.resolve({ slug }),
  });

function resolved(overrides: Partial<ResolvedContentDto> = {}): ResolvedContentDto {
  return {
    servingLabel: 'Per portion',
    nutrition: { kcal: 480, proteinGrams: 36, carbsGrams: 50, fatGrams: 14, fibreGrams: 5, sugarsGrams: 4, saltGrams: 1.1 },
    ingredients: 'King prawns, rice, tomato.',
    allergens: 'Crustaceans',
    declarationsWithheld: false,
    heating: [{ method: 'Hob', body: 'Heat through.' }],
    heatingWithheld: false,
    isStandardPreparation: false,
    isStale: false,
    canonicalSelectionJson: '{"protein":"king-prawns"}',
    matchedVariantSelectionJson: '{"protein":"king-prawns"}',
    contentVersion: 4,
    allergensPresent: ['Crustaceans'],
    precautionaryStatement: null,
    ...overrides,
  };
}

test('live: the route asks Aonik for exactly that selection and passes on only what it resolves', async () => {
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  try {
    useAonik(() => ({ status: 200, body: resolved() }));
    const response = await ROUTE('jollof-chicken', '{"protein":"king-prawns"}');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = readSelectionContentAnswer(await response.json());
    assert.equal(body.status, 'resolved');
    assert.equal(body.status === 'resolved' && body.content.allergens, 'Crustaceans');
    assert.equal(
      aonikRequests[0].path,
      '/commerce/catalog/products/jollof-chicken/content?selection=%7B%22protein%22%3A%22king-prawns%22%7D',
    );

    // No variant for these choices: Aonik withholds the declaration, and so does the route.
    useAonik((request) =>
      request.path.startsWith('/commerce/catalog/products/jollof-chicken/content')
        ? { status: 200, body: resolved({ declarationsWithheld: true, ingredients: null, allergens: null, allergensPresent: null, isStandardPreparation: true, heatingWithheld: true, heating: [] }) }
        : undefined,
    );
    const withheld = readSelectionContentAnswer(await (await ROUTE('jollof-chicken', '{"protein":"king-prawns"}')).json());
    assert.equal(withheld.status === 'resolved' && withheld.content.allergens, undefined);
    assert.equal(withheld.status === 'resolved' && withheld.content.state.declarationsWithheld, true);

    // No content, an outage, a bad request: unavailable — never the standard's.
    useAonik(() => ({ status: 404, body: {} }));
    assert.deepEqual(await (await ROUTE('jollof-chicken', '{"protein":"king-prawns"}')).json(), { status: 'unavailable' });
    const quiet = mock.method(console, 'error', () => undefined);
    useAonik(() => ({ status: 503, body: {} }));
    assert.deepEqual(await (await ROUTE('jollof-chicken', '{"protein":"king-prawns"}')).json(), { status: 'unavailable' });
    quiet.mock.restore();
    assert.equal((await ROUTE('jollof-chicken', 'nope')).status, 400);
    assert.equal((await ROUTE('Bad Slug', '{"a":"b"}')).status, 400);
  } finally {
    delete env.AONIK_DATA_MODE;
  }
});

test('demo: no content per selection, so the declaration for other choices is withheld', async () => {
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'demo' });
  try {
    useAonik(() => undefined);
    assert.deepEqual(await (await ROUTE('jollof-chicken', '{"protein":"king-prawns"}')).json(), { status: 'unavailable' });
    assert.equal(aonikRequests.length, 0);
  } finally {
    delete env.AONIK_DATA_MODE;
  }
});

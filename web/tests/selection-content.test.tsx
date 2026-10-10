import './support/runtime';

import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { GET as dishContent } from '../src/app/api/dish-content/[slug]/route';
import { DishInfoPanels, DishInfoPanelsView } from '../src/components/dish/DishInfoPanels';
import { selectionKey, selectionView } from '../src/components/dish/useSelectionContent';
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
  // While the answer is on its way: checking — neither the standard's nor "not published".
  assert.match(html, /Checking the ingredients for your choices…/);
  assert.match(html, /Checking the allergens for your choices…/);
  assert.match(html, /Checking how to heat your choices…/);
  assert.doesNotMatch(html, /not yet published|has not been published/);
  assert.match(html, /role="status">Checking the ingredients and allergens for your choices…</, 'announced');
  assert.match(html, /These figures are for the standard preparation\./);

  // The standard preparation (no choices, or null): the dish's own declaration, as before.
  for (const standard of [
    renderToStaticMarkup(<DishInfoPanels dish={STANDARD} heating={[]} />),
    renderToStaticMarkup(<DishInfoPanels dish={STANDARD} heating={[]} selection={null} />),
  ]) {
    assert.match(standard, /<strong>Allergens:<\/strong> Celery/);
    assert.match(standard, /role="status"><\/p>/, 'the live region is always there, silent for the standard');
  }
});

test('an answer counts only for the dish AND the choices it was asked for', () => {
  const selection = { protein: 'king-prawns' };
  const content = {
    ingredients: 'King prawns, rice, tomato.',
    allergens: 'Crustaceans',
    nutrition: { calories: 480 },
    state: { ...STANDARD.contentState!, contentVersion: 5 },
    heating: [{ method: 'Hob', body: 'Heat through.' }],
  };
  const held = { key: selectionKey('jollof-chicken', selection), answer: { status: 'resolved' as const, content } };

  const own = selectionView(STANDARD, [], selectionKey('jollof-chicken', selection), held);
  assert.equal(own.state, 'resolved');
  assert.equal(own.dish.allergens, 'Crustaceans');

  // Another dish with the same group keys and choice: not its answer.
  const other = { ...STANDARD, id: 'd-2', slug: 'fried-rice-chicken' };
  const borrowed = selectionView(other, [], selectionKey('fried-rice-chicken', selection), held);
  assert.equal(borrowed.state, 'pending');
  assert.equal(borrowed.dish.allergens, undefined);
  assert.deepEqual(borrowed.heating, [], 'never the standard’s reheating for other choices');

  // Other choices on the same dish: not its answer either.
  assert.equal(selectionView(STANDARD, [], selectionKey('jollof-chicken', { protein: 'beef' }), held).state, 'pending');
  // The standard preparation needs no answer.
  assert.equal(selectionView(STANDARD, [{ method: 'Oven', body: 'x' }], null, held).state, 'standard');
});

test('a resolved answer shows that selection’s own declaration; any other answer withholds it', () => {
  const selection = { protein: 'king-prawns' };
  const key = selectionKey('jollof-chicken', selection);
  const content = {
    ingredients: 'King prawns, rice, tomato.',
    allergens: 'Crustaceans',
    precautionaryStatement: 'Made in a kitchen that also handles fish.',
    nutrition: { calories: 480 },
    state: { ...STANDARD.contentState!, contentVersion: 5 },
    heating: [{ method: 'Hob', body: 'Heat through.' }],
  };
  const resolvedHtml = renderToStaticMarkup(
    <DishInfoPanelsView view={selectionView(STANDARD, [], key, { key, answer: { status: 'resolved', content } })} />,
  );
  assert.match(resolvedHtml, /<strong>Allergens:<\/strong> Crustaceans/);
  assert.match(resolvedHtml, /also handles fish/);
  assert.doesNotMatch(resolvedHtml, /Celery|handles peanuts/);
  assert.match(resolvedHtml, /role="status">Ingredients and allergens updated for your choices\.</);

  for (const status of ['unpublished', 'unavailable'] as const) {
    const view = selectionView(STANDARD, [{ method: 'Oven', body: 'x' }], key, { key, answer: { status } });
    assert.equal(view.state, status);
    assert.equal(view.dish.allergens, undefined);
    assert.equal(view.dish.precautionaryStatement, undefined);
    assert.deepEqual(view.heating, []);
  }

  // A standard block standing in for other choices that is ALSO under review says both.
  const stale = { ...STANDARD, contentState: { ...STANDARD.contentState!, figuresAreStale: true } };
  const staleHtml = renderToStaticMarkup(
    <DishInfoPanelsView view={selectionView(stale, [], key, { key, answer: { status: 'unpublished' } })} />,
  );
  assert.match(staleHtml, /These figures are for the standard preparation\. These figures are under review/);
});

test('"not yet published" and "couldn’t check" are different answers, said differently', () => {
  const view = (state: 'unpublished' | 'unavailable') =>
    renderToStaticMarkup(
      <DishInfoPanelsView view={{ dish: withoutSelectionContent(STANDARD), heating: [], forSelection: true, state }} />,
    );

  const unpublished = view('unpublished');
  assert.match(unpublished, /Allergen information for the choices you’ve made is not yet published\./);
  assert.match(unpublished, /The ingredient list for the choices you’ve made has not been published yet\./);
  assert.match(unpublished, /Heating instructions for the choices you’ve made have not been published yet\./);
  assert.doesNotMatch(unpublished, /General guidance/, 'no steps, so nothing to frame as general');
  assert.doesNotMatch(unpublished, /couldn’t check/);

  const unavailable = view('unavailable');
  assert.match(unavailable, /We couldn’t check the allergens for the choices you’ve made just now\./);
  assert.match(unavailable, /We couldn’t check the ingredient list for the choices you’ve made just now\./);
  assert.match(unavailable, /role="status">We couldn’t check the ingredients and allergens for your choices just now\.</);
  assert.doesNotMatch(unavailable, /not yet published|has not been published/);
  for (const html of [unpublished, unavailable]) {
    assert.doesNotMatch(html, /Celery/);
    assert.match(html, /contact us<\/a> before ordering/);
  }
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
    const before = aonikRequests.length;
    const withheld = readSelectionContentAnswer(await (await ROUTE('jollof-chicken', '{"protein":"king-prawns"}')).json());
    assert.equal(withheld.status === 'resolved' && withheld.content.allergens, undefined);
    assert.equal(withheld.status === 'resolved' && withheld.content.state.declarationsWithheld, true);
    // Withheld reheating stays withheld: no general steps passed off as these choices'.
    assert.deepEqual(withheld.status === 'resolved' && withheld.content.heating, []);
    assert.equal(aonikRequests.length, before + 1, 'one read: the selection’s content, nothing else');

    // A product with no content: not published. An outage: couldn't check. Never the standard's.
    const errors = mock.method(console, 'error', () => undefined);
    const warnings = mock.method(console, 'warn', () => undefined);
    useAonik(() => ({ status: 404, body: {} }));
    assert.deepEqual(await (await ROUTE('jollof-chicken', '{"protein":"king-prawns"}')).json(), { status: 'unpublished' });
    useAonik(() => ({ status: 400, body: { error: 'Unknown option.', code: 'commerce.option_validation' } }));
    assert.deepEqual(await (await ROUTE('jollof-chicken', '{"protein":"nope"}')).json(), { status: 'unavailable' });
    assert.equal(errors.mock.callCount(), 0, 'a 404 or a rejected selection is not an outage to log');
    useAonik(() => ({ status: 503, body: {} }));
    assert.deepEqual(await (await ROUTE('jollof-chicken', '{"protein":"king-prawns"}')).json(), { status: 'unavailable' });
    assert.equal(errors.mock.callCount(), 1, 'an outage is logged');
    assert.equal(warnings.mock.callCount(), 1, 'no content at all is noted, not hidden');
    errors.mock.restore();
    warnings.mock.restore();
    assert.equal((await ROUTE('jollof-chicken', 'nope')).status, 400);
    assert.equal((await ROUTE('Bad Slug', '{"a":"b"}')).status, 400);
    assert.equal((await ROUTE('x'.repeat(161), '{"a":"b"}')).status, 400);
  } finally {
    delete env.AONIK_DATA_MODE;
  }
});

test('demo: no content per selection, so the declaration for other choices is withheld', async () => {
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'demo' });
  try {
    useAonik(() => undefined);
    assert.deepEqual(await (await ROUTE('jollof-chicken', '{"protein":"king-prawns"}')).json(), { status: 'unpublished' });
    assert.equal(aonikRequests.length, 0);
  } finally {
    delete env.AONIK_DATA_MODE;
  }
});

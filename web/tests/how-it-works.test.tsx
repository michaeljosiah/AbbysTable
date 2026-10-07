import './support/runtime';

import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { BoxSizePicker } from '../src/components/how-it-works/BoxSizePicker';
import { BoxSizeLink, BoxSizeProvider } from '../src/components/how-it-works/BoxSizeProvider';
import { ExampleDishCard } from '../src/components/how-it-works/ExampleDishCard';
import { DISH_FIXTURES, STOREFRONT_CONFIG_FIXTURE } from '../src/lib/aonik/fixtures';
import type { Dish, StorefrontBoxPlan } from '../src/lib/aonik/types';
import { formatPrice } from '../src/lib/format';
import {
  boxBuilderHref,
  buildBoxSizeModel,
  closingSentence,
  countInWords,
  CUSTOM_SIZE_ID,
  priceReadout,
  selectedOption,
  sizesSentence,
} from '../src/lib/how-it-works/boxSizes';
import { exampleDishFacts } from '../src/lib/how-it-works/exampleDish';
import {
  FEATURED_FALLBACK_ATTEMPTS,
  resolveBoxPlan,
  resolveExampleDish,
} from '../src/lib/how-it-works/pageData';
import type { ProductBrowseOptions, ProductPage } from '../src/lib/aonik/client';
import HowItWorksPage from '../src/app/(site)/how-it-works/page';
import { CartProvider } from '../src/lib/cart/CartProvider';

// Aliased: `useAonik` stubs fetch, it is not a React hook.
import { configureAonik, useAonik as stubAonik } from './support/aonik';
import { resetCookies } from './support/next-headers';

/*
 * How it works (#16): the size picker's rules and the example dish card.
 * Sources: design/Abby's Table - How It Works v2.dc.html, build-handoff §3v,
 * frontend-backend-contract §4c.
 */

/** A plan with round numbers, so the arithmetic under test is visible. */
const plan: StorefrontBoxPlan = {
  minSize: 6,
  maxSize: 99,
  currency: 'GBP',
  perSpacePence: 1700,
  presets: [
    { size: 18, pricePence: 44900, savingPence: 2500 },
    { size: 6, pricePence: 15800 },
    { size: 12, pricePence: 30600, savingPence: 1000 },
  ],
};

/* ---- Options ---------------------------------------------------------------- */

test('presets in size order, then "Set your own" at the plan minimum', () => {
  const model = buildBoxSizeModel(plan);

  assert.deepEqual(
    model.options.map((option) => [option.id, option.label, option.subLabel]),
    [
      ['6', '6', null],
      ['12', '12', null],
      ['18', '18', null],
      [CUSTOM_SIZE_ID, '6+', 'Custom'],
    ],
  );
  assert.equal(model.defaultId, '6');
  assert.equal(model.minDishes, 6);
});

test('prices and savings are the plan’s own; custom is the minimum box and never saves', () => {
  const model = buildBoxSizeModel(plan);
  const byId = Object.fromEntries(model.options.map((option) => [option.id, option]));

  assert.equal(byId['6'].pricePence, 15800);
  assert.equal(byId['6'].savingPence, null, 'no authored saving, none shown');
  assert.equal(byId['12'].pricePence, 30600);
  assert.equal(byId['12'].savingPence, 1000);
  assert.equal(byId['18'].savingPence, 2500);
  assert.equal(byId.custom.pricePence, 15800, 'From = the price of a box at the minimum size');
  assert.equal(byId.custom.savingPence, null);
});

test('the read-out is formatted at the edge: "From £x" and "Save £y"', () => {
  const model = buildBoxSizeModel(plan);
  assert.deepEqual(priceReadout(selectedOption(model, '12')), { price: '£306', saving: 'Save £10' });
  assert.deepEqual(priceReadout(selectedOption(model, '6')), { price: '£158', saving: null });
  assert.deepEqual(priceReadout(selectedOption(model, 'custom')), { price: '£158', saving: null });
  assert.deepEqual(priceReadout(null), { price: null, saving: null });
});

test('demo mode renders whatever the fixtures say (the obsolete ladder is #28’s to fix)', () => {
  const box = STOREFRONT_CONFIG_FIXTURE.box;
  assert.ok(box);
  const model = buildBoxSizeModel(box);

  for (const preset of box.presets) {
    const option = selectedOption(model, String(preset.size));
    assert.equal(option?.pricePence, preset.pricePence);
    assert.equal(
      priceReadout(option).saving,
      preset.savingPence ? `Save ${formatPrice(preset.savingPence)}` : null,
    );
  }
});

test('custom cannot be priced when no preset sits at the plan minimum', () => {
  const model = buildBoxSizeModel({ ...plan, minSize: 5 });
  const custom = selectedOption(model, CUSTOM_SIZE_ID);

  assert.equal(custom?.label, '5+');
  assert.equal(custom?.pricePence, null, 'the embedded plan has no base price to derive one from');
  assert.deepEqual(priceReadout(custom), { price: null, saving: null });
  assert.equal(model.defaultId, '6', 'no preset at the minimum, so the first preset');
});

test('a plan in another currency is offered but never priced in sterling', () => {
  const model = buildBoxSizeModel({ ...plan, currency: 'EUR' });
  assert.equal(model.options.length, 4);
  assert.ok(model.options.every((option) => option.pricePence === null && option.savingPence === null));
});

test('tenant data is defended: out-of-range, duplicate and malformed presets', () => {
  const model = buildBoxSizeModel({
    ...plan,
    maxSize: 30,
    presets: [
      { size: 12, pricePence: 30600, savingPence: 1000 },
      { size: 12, pricePence: 99999 },
      { size: 4, pricePence: 9000 },
      { size: 40, pricePence: 60000 },
      { size: 18, pricePence: 449.5, savingPence: 2500 },
      { size: 6, pricePence: 15800, savingPence: 0 },
    ],
  });
  const byId = Object.fromEntries(model.options.map((option) => [option.id, option]));

  assert.deepEqual(Object.keys(byId), ['6', '12', '18', 'custom']);
  assert.equal(byId['12'].pricePence, 30600, 'the first authored duplicate wins');
  assert.equal(byId['18'].pricePence, null, 'not whole pence, so not a price');
  assert.equal(byId['18'].savingPence, null, 'a saving needs a price beside it');
  assert.equal(byId['6'].savingPence, null, 'a zero saving is not shown');
});

test('"Set your own" needs a range; no plan means no picker', () => {
  const fixed = buildBoxSizeModel({ ...plan, maxSize: 6, presets: [{ size: 6, pricePence: 15800 }] });
  assert.deepEqual(
    fixed.options.map((option) => option.id),
    ['6'],
  );

  for (const missing of [undefined, null, { ...plan, minSize: 0 }, { ...plan, maxSize: 3 }]) {
    const model = buildBoxSizeModel(missing as StorefrontBoxPlan | undefined);
    assert.deepEqual(model.options, []);
    assert.equal(model.defaultId, null);
  }
});

test('a presets-only plan (no per-space rate) offers no "Set your own" and no custom link', () => {
  // Absent `perSpacePence` means "presets only" (StorefrontBoxPlan, types.ts).
  const presetsOnly: StorefrontBoxPlan = { ...plan, perSpacePence: undefined };

  for (const candidate of [
    presetsOnly,
    { ...plan, perSpacePence: Number.NaN },
    { ...plan, perSpacePence: -100 },
    { ...plan, perSpacePence: 17.5 },
  ]) {
    const model = buildBoxSizeModel(candidate);
    assert.deepEqual(
      model.options.map((option) => option.id),
      ['6', '12', '18'],
      `no custom option for perSpacePence=${String(candidate.perSpacePence)}`,
    );
    assert.equal(sizesSentence(model), 'Start with 6, 12 or 18 dishes.');

    const html = renderToStaticMarkup(
      <BoxSizeProvider defaultId={model.defaultId}>
        <BoxSizeLink>Build a Box</BoxSizeLink>
        <BoxSizePicker model={model} />
      </BoxSizeProvider>,
    );
    assert.doesNotMatch(html, /custom/i);
    assert.equal(html.match(/type="radio"/g)?.length, 3);
  }
});

/* ---- Links (contract §4c) ---------------------------------------------------------- */

test('every option carries ?dishes=6|12|18|custom; no choice means plain /box', () => {
  const model = buildBoxSizeModel(plan);
  assert.deepEqual(
    model.options.map((option) => boxBuilderHref(option.id)),
    ['/box?dishes=6', '/box?dishes=12', '/box?dishes=18', '/box?dishes=custom'],
  );
  assert.equal(boxBuilderHref(null), '/box');
  assert.equal(boxBuilderHref(''), '/box');
});

test('an unknown selection falls back to the default option', () => {
  const model = buildBoxSizeModel(plan);
  assert.equal(selectedOption(model, 'nonsense')?.id, '6');
  assert.equal(selectedOption(model, undefined)?.id, '6');
  assert.equal(selectedOption({ options: [], defaultId: null }, '6'), null);
});

/* ---- Copy with counts from the plan ------------------------------------------------- */

test('step 1 and the closing band take their counts from the plan', () => {
  assert.equal(
    sizesSentence(buildBoxSizeModel(plan)),
    'Start with 6, 12 or 18 dishes, or set your own quantity from six upwards.',
  );
  assert.equal(
    sizesSentence(buildBoxSizeModel({ ...plan, presets: [] })),
    'Set your own quantity from six upwards.',
  );
  assert.equal(
    closingSentence(6),
    'Choose at least six dishes, select your portion size, and pick your delivery date.',
  );
  assert.equal(
    closingSentence(null),
    'Choose your dishes, select your portion size, and pick your delivery date.',
  );
  assert.equal(countInWords(9), 'nine');
  assert.equal(countInWords(10), '10');
});

/* ---- The picker's server render (also what a no-JS visitor gets) --------------------- */

test('the picker server-renders a labelled radio group with the default checked', () => {
  const model = buildBoxSizeModel(plan);
  const html = renderToStaticMarkup(
    <BoxSizeProvider defaultId={model.defaultId}>
      <BoxSizeLink>Build a Box</BoxSizeLink>
      <BoxSizePicker model={model} />
    </BoxSizeProvider>,
  );

  assert.match(html, /<form[^>]*action="\/box"/);
  assert.match(html, /role="radiogroup" aria-labelledby="([^"]+)"/);
  const labelId = /role="radiogroup" aria-labelledby="([^"]+)"/.exec(html)?.[1];
  assert.match(html, new RegExp(`id="${labelId}">Choose a size<`));
  assert.equal(html.match(/type="radio"/g)?.length, 4);
  assert.equal(html.match(/checked=""/g)?.length, 1);
  assert.match(html, /type="radio" name="dishes" checked="" value="6"/);
  assert.match(html, /aria-live="polite" aria-atomic="true">.*From.*£158/);
  assert.match(html, /href="\/box\?dishes=6"/, 'links carry the default with no JavaScript');
  assert.match(html, /<button type="submit"[^>]*>Start building<\/button>/);
  assert.match(html, /Minimum 6 dishes\./);
});

test('with no plan the panel is just the way in to Choose Box', () => {
  const html = renderToStaticMarkup(
    <BoxSizeProvider defaultId={null}>
      <BoxSizePicker model={buildBoxSizeModel(undefined)} />
    </BoxSizeProvider>,
  );
  assert.doesNotMatch(html, /radiogroup|aria-live|<form/);
  assert.match(html, /href="\/box">Start building</);
});

/* ---- Example dish: never infer ---------------------------------------------------------- */

const okra = DISH_FIXTURES.find((dish) => dish.slug === 'royal-seafood-okra') as Dish;
const salmon = DISH_FIXTURES.find((dish) => dish.slug === 'yaji-crusted-wild-salmon') as Dish;

test('a fully published dish shows its own five figures and declarations', () => {
  const facts = exampleDishFacts(okra);
  assert.deepEqual(
    facts.figures.map((figure) => [figure.label, figure.value]),
    [
      ['kcal', String(okra.nutrition.calories)],
      ['Protein', `${okra.nutrition.proteinGrams}g`],
      ['Fibre', `${okra.nutrition.fibreGrams}g`],
      ['Fat', `${okra.nutrition.fatGrams}g`],
      ['Carbs', `${okra.nutrition.carbsGrams}g`],
    ],
  );
  assert.equal(facts.allergens, okra.allergens);
  assert.equal(facts.ingredientsPublished, true);
  assert.equal(facts.heatLabel, 'Medium');
  assert.equal(facts.heatSteps, 2);
});

test('what a dish does not publish stays unpublished — never zero, never invented', () => {
  const facts = exampleDishFacts(salmon);
  const values = Object.fromEntries(facts.figures.map((figure) => [figure.key, figure.value]));

  assert.equal(values.calories, null);
  assert.equal(values.fat, null);
  assert.equal(values.carbs, null);
  assert.equal(values.protein, `${salmon.nutrition.proteinGrams}g`);
  assert.equal(facts.allergens, null);
  assert.equal(facts.ingredientsPublished, false);

  const garbage = exampleDishFacts({
    ...salmon,
    nutrition: { calories: Number.NaN, proteinGrams: -1, fibreGrams: 0 },
    allergens: '   ',
  });
  const garbageValues = Object.fromEntries(garbage.figures.map((f) => [f.key, f.value]));
  assert.equal(garbageValues.calories, null);
  assert.equal(garbageValues.protein, null);
  assert.equal(garbageValues.fibre, '0g', 'a published zero is a real figure');
  assert.equal(garbage.allergens, null);
});

test('withheld declarations are hidden even when one half still arrives', () => {
  const facts = exampleDishFacts({
    ...okra,
    contentState: {
      servingLabel: 'Per serving',
      declarationsWithheld: true,
      figuresAreStandardPreparation: false,
      figuresAreStale: true,
      heatingWithheld: false,
      heating: [],
      contentVersion: 3,
    },
  });
  assert.equal(facts.allergens, null);
  assert.equal(facts.ingredientsPublished, false);
  assert.equal(
    facts.figuresNote,
    'These figures are under review and may not reflect the current recipe.',
  );
});

test('the card says "not yet published" in words', () => {
  const partial = renderToStaticMarkup(<ExampleDishCard dish={salmon} />);
  assert.match(partial, /Example dish/);
  assert.match(partial, /kcal<\/span><span class="visuallyHidden">, not yet published/);
  assert.match(partial, /Figures shown as – are not yet published for this dish\./);
  assert.match(partial, /Allergens<\/span> Not yet published/);
  assert.match(partial, /Ingredients not yet published/);

  const none = renderToStaticMarkup(<ExampleDishCard dish={{ ...salmon, nutrition: {} }} />);
  assert.match(none, /Nutrition figures are not yet published for this dish\./);
  assert.doesNotMatch(none, /role="list"/);

  const full = renderToStaticMarkup(<ExampleDishCard dish={okra} />);
  assert.doesNotMatch(full, /not yet published/i);
  assert.match(full, /Full ingredients available/);
});

/* ---- Page data: optional pieces degrade, and only detail reads reach the card ---- */

/**
 * A stand-in Aonik client. `details` maps slug → what a DETAIL read returns
 * (a dish, null for a 404, or an Error to throw); `featured` is what the
 * featured browse lists — summaries, marked so a test can tell them apart.
 */
function fakeClient(options: {
  details: Record<string, Dish | null | Error>;
  featured?: string[] | Error;
}) {
  const calls = { detail: [] as string[], browse: [] as ProductBrowseOptions[] };
  const client = {
    async getDishBySlug(slug: string): Promise<Dish | null> {
      calls.detail.push(slug);
      const result = options.details[slug] ?? null;
      if (result instanceof Error) throw result;
      return result;
    },
    async listProducts(browse: ProductBrowseOptions = {}): Promise<ProductPage> {
      calls.browse.push(browse);
      if (options.featured instanceof Error) throw options.featured;
      const dishes = (options.featured ?? []).map(
        (slug) => ({ ...salmon, slug, title: `${slug} (browse summary)` }) as Dish,
      );
      return { dishes, totalCount: dishes.length, page: 1, pageSize: dishes.length };
    },
  };
  return { client, calls };
}

const detail = (slug: string): Dish => ({ ...okra, slug, title: `${slug} (detail read)` });

function captureLog() {
  const messages: string[] = [];
  return { messages, log: (message: string) => void messages.push(message) };
}

const exampleOptions = { slug: 'editorial', featuredCollection: 'featured' };

test('the editorial dish is used when it resolves, with no fallback reads', async () => {
  const { client, calls } = fakeClient({ details: { editorial: detail('editorial') } });
  const dish = await resolveExampleDish(client, exampleOptions, captureLog().log);

  assert.equal(dish?.title, 'editorial (detail read)');
  assert.deepEqual(calls.detail, ['editorial']);
  assert.equal(calls.browse.length, 0);
});

test('a missing editorial dish falls back to the first featured dish that DETAIL-reads', async () => {
  const { client, calls } = fakeClient({
    details: { editorial: null, a: null, b: detail('b'), c: detail('c') },
    featured: ['a', 'b', 'c'],
  });
  const dish = await resolveExampleDish(client, exampleOptions, captureLog().log);

  assert.equal(dish?.title, 'b (detail read)', 'never the browse summary');
  assert.deepEqual(calls.detail, ['editorial', 'a', 'b'], 'stops at the first success');
  assert.equal(calls.browse.length, 1);
  assert.equal(calls.browse[0].collection, 'featured');
  assert.equal(calls.browse[0].sort, 'rank');
  assert.equal(calls.browse[0].pageSize, FEATURED_FALLBACK_ATTEMPTS);
});

test('the fallback is capped, and no resolvable dish means no card', async () => {
  const featured = ['a', 'b', 'c', 'd', 'e', 'f'];
  const { client, calls } = fakeClient({
    details: { editorial: null, f: detail('f') },
    featured,
  });
  const { messages, log } = captureLog();
  const dish = await resolveExampleDish(client, exampleOptions, log);

  assert.equal(dish, null);
  assert.deepEqual(calls.detail, ['editorial', ...featured.slice(0, FEATURED_FALLBACK_ATTEMPTS)]);
  assert.equal(messages.length, 1);
});

test('an Aonik error ends the search at once: no card, logged, no 500', async () => {
  const failing = fakeClient({
    details: { editorial: new Error('503 from Aonik') },
    featured: ['a'],
  });
  const first = captureLog();
  assert.equal(await resolveExampleDish(failing.client, exampleOptions, first.log), null);
  assert.deepEqual(failing.calls.detail, ['editorial']);
  assert.equal(failing.calls.browse.length, 0);
  assert.equal(first.messages.length, 1);

  const browseFails = fakeClient({ details: { editorial: null }, featured: new Error('timeout') });
  const second = captureLog();
  assert.equal(await resolveExampleDish(browseFails.client, exampleOptions, second.log), null);
  assert.equal(second.messages.length, 1);

  const candidateFails = fakeClient({
    details: { editorial: null, a: new Error('reset'), b: detail('b') },
    featured: ['a', 'b'],
  });
  assert.equal(await resolveExampleDish(candidateFails.client, exampleOptions, captureLog().log), null);
  assert.deepEqual(candidateFails.calls.detail, ['editorial', 'a']);
});

/* ---- The page: its hero is the one high-priority image (marketing FR-06, T11) ---- */

async function renderHowItWorks(live: boolean): Promise<string> {
  const saved = { ...process.env };
  if (live) {
    // Aonik down: no example dish, so the hero falls back to the placeholder photograph.
    configureAonik({ AONIK_DATA_MODE: 'live' });
    stubAonik(() => ({ status: 503, body: { title: 'Service Unavailable' } }));
  }
  const quiet = console.error;
  console.error = () => {};
  try {
    resetCookies();
    return renderToStaticMarkup(<CartProvider mode={live ? undefined : 'demo'}>{await HowItWorksPage()}</CartProvider>);
  } finally {
    console.error = quiet;
    process.env = saved;
  }
}

test('the hero image is the page’s only fetchpriority="high" — whichever image the hero shows', async () => {
  for (const live of [false, true]) {
    const html = await renderHowItWorks(live);
    // React writes the prop as `fetchPriority`; HTML attribute names are case-insensitive.
    const high = [...html.matchAll(/<img\b[^>]*fetchpriority="high"[^>]*>/gi)].map((match) => match[0]);
    assert.equal(high.length, 1, `${live ? 'placeholder' : 'example dish'} hero: exactly one`);
    // The first image on the page, inside the hero (before the step rail).
    assert.equal(html.indexOf('<img'), html.indexOf(high[0]));
    assert.ok(html.indexOf(high[0]) < html.indexOf('aria-label="The four steps"'));
    if (live) assert.match(high[0], /how-1-build-your-box/);
  }
});

test('the box plan degrades to none (a picker without prices) when the config fails', async () => {
  const box = STOREFRONT_CONFIG_FIXTURE.box;
  assert.equal(
    await resolveBoxPlan({ getStorefrontConfig: async () => STOREFRONT_CONFIG_FIXTURE }),
    box,
  );

  const { messages, log } = captureLog();
  const failed = await resolveBoxPlan(
    {
      getStorefrontConfig: async () => {
        throw new Error('502 from Aonik');
      },
    },
    log,
  );
  assert.equal(failed, undefined);
  assert.equal(messages.length, 1);
  assert.deepEqual(buildBoxSizeModel(failed).options, []);
});

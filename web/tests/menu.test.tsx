import './support/runtime';

import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  PathnameContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';

import MenuPage from '../src/app/(site)/menu/page';
import { DishCard } from '../src/components/sections/DishCard';
import type { ProductSummaryDto } from '../src/lib/aonik/dto';
import { DISH_FIXTURES, DELIVERY_FIXTURE } from '../src/lib/aonik/fixtures';
import { heatFromStep, mapSummaryToDish } from '../src/lib/aonik/map';
import type { Dish } from '../src/lib/aonik/types';
import { CartProvider } from '../src/lib/cart/CartProvider';
import { DELIVERY_NOTE, EATING_STYLE_DEFINITIONS } from '../src/lib/content/menu';
import { formatDeliveryDateShort } from '../src/lib/format';
import { dishCardTags, isUnderKcal, UNDER_KCAL_TAG } from '../src/lib/menu/cardTags';
import {
  dishMatchesFacet,
  dishMatchesSearch,
  filterDishes,
  filtersFromParams,
  heatChipPips,
  MENU_FACET_GROUPS,
  sanitiseFilters,
} from '../src/lib/menu/facets';
import { activeFilters, filterCount, resultLabel } from '../src/lib/menu/filters';
import { ALL_SORTS, parseMenuSort, sortDishes, sortOptions } from '../src/lib/menu/sort';
import { nextTopShown } from '../src/lib/menu/topControl';

import { aonikRequests, configureAonik, useAonik as stubAonik } from './support/aonik';
import { resetCookies } from './support/next-headers';

/*
 * The menu to Menu Landing v3 (#21). Sources: design/Abby's Table - Menu
 * Landing v3.dc.html, frontend-backend-contract §4 and §4d, build-handoff §3w,
 * SPEC-2026-10-07-menu.
 */

/** A dish with only what a test names — every optional field absent. */
function dish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: overrides.slug ?? 'd',
    slug: 'd',
    title: 'Dish',
    description: '',
    imageUrl: '',
    tags: [],
    isSignature: false,
    nutrition: {},
    isFeatured: false,
    wellness: [],
    dietary: [],
    ...overrides,
  };
}

const bySlug = (slug: string) => DISH_FIXTURES.find((candidate) => candidate.slug === slug)!;
const titles = (dishes: Dish[]) => dishes.map((candidate) => candidate.slug);

/* ---- Vocabulary ------------------------------------------------------------------ */

test('the four groups, in the design’s order and words — no Category, no Calories, no Low sugar', () => {
  assert.deepEqual(
    MENU_FACET_GROUPS.map((group) => [group.key, group.label, group.options.map((o) => o.label)]),
    [
      ['protein', 'Protein source', ['Chicken', 'Beef', 'Lamb', 'Fish', 'Turkey', 'Plant-based']],
      ['wellness', 'Eating style', ['Protein-led', 'Carb-conscious', 'Plant-led', 'Mediterranean-inspired']],
      ['heat', 'Heat', ['None', 'Mild', 'Medium', 'Hot']],
      ['dietary', 'Dietary & other', ['Gluten-free', 'Dairy-free', 'High in fibre']],
    ],
  );
  // "Low sugar" has no field in any dish record: no chip until Aonik publishes one (aonik#359).
  const labels = MENU_FACET_GROUPS.flatMap((group) => group.options.map((option) => option.label));
  assert.ok(!labels.includes('Low sugar'));
  assert.ok(!labels.includes('DASH'), '"DASH" stays in the data with no chip (contract §4d)');
  assert.ok(!labels.some((label) => /kcal/.test(label)), '"Under 500 kcal" is a card tag, not a filter');
});

test('every eating-style chip has a definition, and the definitions are the design’s', () => {
  const styles = MENU_FACET_GROUPS.find((group) => group.key === 'wellness')!.options;
  for (const option of styles) assert.ok(EATING_STYLE_DEFINITIONS[option.label], option.label);
  assert.equal(EATING_STYLE_DEFINITIONS['Protein-led'], 'Dishes where protein is a key focus of the meal.');
});

test('heat chips draw the card’s pips: None none, Mild one, Medium two, Hot three', () => {
  assert.deepEqual(['none', 'mild', 'medium', 'hot', 'unknown'].map(heatChipPips), [0, 1, 2, 3, 0]);
});

/* ---- Matching: each group --------------------------------------------------------- */

test('protein source: one value per dish, and a dish without one matches no chip', () => {
  assert.ok(dishMatchesFacet(bySlug('ata-dindin-lamb-shank'), 'protein', 'lamb'));
  assert.ok(dishMatchesFacet(dish({ proteinType: 'Plant-based' }), 'protein', 'plant-based'));
  assert.ok(!dishMatchesFacet(bySlug('ata-dindin-lamb-shank'), 'protein', 'fish'));
  // The goat dish the design files under "Beef" carries no protein source.
  assert.equal(bySlug('wild-rice-goat-efo').proteinType, undefined);
  for (const option of MENU_FACET_GROUPS[0].options) {
    assert.ok(!dishMatchesFacet(dish(), 'protein', option.value), option.value);
  }
});

test('eating style: many per dish', () => {
  const salmon = bySlug('suya-salmon-kale-quinoa');
  assert.ok(dishMatchesFacet(salmon, 'wellness', 'protein-led'));
  assert.ok(dishMatchesFacet(salmon, 'wellness', 'mediterranean-inspired'));
  assert.ok(!dishMatchesFacet(salmon, 'wellness', 'plant-led'));
});

test('heat: one level per dish, None is a level, and an unpublished heat matches nothing', () => {
  assert.ok(dishMatchesFacet(dish({ heat: 'none' }), 'heat', 'none'));
  assert.ok(dishMatchesFacet(dish({ heat: 'low' }), 'heat', 'mild'));
  assert.ok(dishMatchesFacet(dish({ heat: 'high' }), 'heat', 'hot'));
  assert.ok(!dishMatchesFacet(dish({ heat: 'high' }), 'heat', 'medium'));
  for (const token of ['none', 'mild', 'medium', 'hot']) {
    assert.ok(!dishMatchesFacet(dish(), 'heat', token), `no heat never matches ${token}`);
  }
});

test('dietary: the chip says "High in fibre", the record says "High-fibre"', () => {
  assert.ok(dishMatchesFacet(dish({ dietary: ['High-fibre'] }), 'dietary', 'high-fibre'));
  assert.ok(dishMatchesFacet(dish({ dietary: ['Gluten-free'] }), 'dietary', 'gluten-free'));
  assert.ok(!dishMatchesFacet(dish({ dietary: ['Gluten-free'] }), 'dietary', 'dairy-free'));
});

test('an unknown group matches nothing', () => {
  assert.ok(!dishMatchesFacet(bySlug('royal-seafood-okra'), 'calories', 'under-500'));
  assert.ok(!dishMatchesFacet(bySlug('royal-seafood-okra'), 'spice', 'medium'));
});

/* ---- Matching: combinations ------------------------------------------------------- */

test('OR within a group, AND across groups', () => {
  const or = filterDishes(DISH_FIXTURES, { protein: ['lamb', 'turkey'] });
  assert.deepEqual(titles(or), ['ata-dindin-lamb-shank', 'turkey-ayamase-greens']);
  const and = filterDishes(DISH_FIXTURES, { protein: ['lamb', 'turkey'], heat: ['hot'] });
  assert.deepEqual(titles(and), ['ata-dindin-lamb-shank']);
  const none = filterDishes(DISH_FIXTURES, { protein: ['lamb'], dietary: ['dairy-free'] });
  assert.deepEqual(none, []);
  assert.equal(filterDishes(DISH_FIXTURES, {}).length, DISH_FIXTURES.length);
  assert.equal(filterDishes(DISH_FIXTURES, { protein: [] }).length, DISH_FIXTURES.length);
});

test('the demo search reads what a card shows: name, components, description, protein, styles, heat word', () => {
  assert.ok(dishMatchesSearch(bySlug('royal-seafood-okra'), 'blue crab'));
  assert.ok(dishMatchesSearch(bySlug('ata-dindin-lamb-shank'), 'LAMB'));
  assert.ok(dishMatchesSearch(bySlug('suya-salmon-kale-quinoa'), 'mediterranean'));
  assert.ok(dishMatchesSearch(bySlug('fish-peppersoup-bone-broth'), 'hot'));
  assert.ok(!dishMatchesSearch(bySlug('fish-peppersoup-bone-broth'), 'lamb'));
  assert.ok(dishMatchesSearch(dish(), '   '));
});

test('URL filters: parsed from facet.<key>, and only what the facets read advertised survives', () => {
  const parsed = filtersFromParams({
    'facet.protein': 'fish,lamb,fish',
    'facet.spice': 'mild',
    'facet.heat': ['hot', 'mild'],
    q: 'okra',
    'facet.dietary': '',
  });
  assert.deepEqual(parsed, { protein: ['fish', 'lamb'], spice: ['mild'], heat: ['hot'] });
  // The pre-#21 `spice` key and a made-up value are dropped before Aonik sees them (it would 400).
  assert.deepEqual(
    sanitiseFilters({ ...parsed, protein: ['fish', 'goat'] }, MENU_FACET_GROUPS),
    { protein: ['fish'], heat: ['hot'] },
  );
  assert.deepEqual(sanitiseFilters(parsed, []), {});
});

test('active pills: in the groups’ order, heat as "… heat", nothing for a token no group offers', () => {
  const pills = activeFilters(MENU_FACET_GROUPS, {
    heat: ['mild'],
    protein: ['fish'],
    dietary: ['high-fibre', 'low-sugar'],
  });
  assert.deepEqual(
    pills.map((pill) => pill.label),
    ['Fish', 'Mild heat', 'High in fibre'],
  );
  assert.equal(filterCount({ protein: ['fish', 'lamb'], heat: ['hot'] }), 3);
});

test('the results line: "All N dishes" only when nothing narrows the menu and every dish shows', () => {
  assert.equal(resultLabel(14, 14, false), 'All 14 dishes');
  assert.equal(resultLabel(6, 14, false), 'Showing 6 of 14 dishes');
  assert.equal(resultLabel(3, 3, true), 'Showing 3 of 3 dishes');
  assert.equal(resultLabel(1, 1, true), 'Showing 1 of 1 dish');
  assert.equal(resultLabel(0, 0, true), 'Showing 0 of 0 dishes');
});

/* ---- Sort ---------------------------------------------------------------------------- */

test('sort: Recommended is the list’s own order', () => {
  assert.deepEqual(titles(sortDishes(DISH_FIXTURES, 'recommended')), titles(DISH_FIXTURES));
  assert.notEqual(sortDishes(DISH_FIXTURES, 'recommended'), DISH_FIXTURES, 'a new array');
});

test('sort: Highest protein, ties in recommended order, an unpublished figure last — never a zero', () => {
  const list = [
    dish({ slug: 'a', nutrition: { proteinGrams: 30 } }),
    dish({ slug: 'unknown' }),
    dish({ slug: 'b', nutrition: { proteinGrams: 40 } }),
    dish({ slug: 'c', nutrition: { proteinGrams: 30 } }),
    dish({ slug: 'zero', nutrition: { proteinGrams: 0 } }),
  ];
  assert.deepEqual(titles(sortDishes(list, 'protein')), ['b', 'a', 'c', 'zero', 'unknown']);
});

test('sort: Lowest calories, an unpublished figure last rather than first', () => {
  const list = [
    dish({ slug: 'unknown' }),
    dish({ slug: 'a', nutrition: { calories: 520 } }),
    dish({ slug: 'b', nutrition: { calories: 480 } }),
    dish({ slug: 'c', nutrition: { calories: 520 } }),
    dish({ slug: 'nan', nutrition: { calories: Number.NaN } }),
  ];
  assert.deepEqual(titles(sortDishes(list, 'calories')), ['b', 'a', 'c', 'unknown', 'nan']);
});

test('sort: only the orders the source can apply; anything else is Recommended', () => {
  assert.equal(parseMenuSort('protein', ALL_SORTS), 'protein');
  assert.equal(parseMenuSort(['calories', 'protein'], ALL_SORTS), 'calories');
  assert.equal(parseMenuSort('price', ALL_SORTS), 'recommended');
  assert.equal(parseMenuSort(undefined, ALL_SORTS), 'recommended');
  // Live: Aonik sorts by name | newest | rank only (aonik#359).
  assert.equal(parseMenuSort('protein', ['recommended']), 'recommended');
  assert.deepEqual(sortOptions(['recommended']).map((o) => o.label), ['Recommended']);
  assert.deepEqual(sortOptions(ALL_SORTS).map((o) => o.label), [
    'Recommended',
    'Highest protein',
    'Lowest calories',
  ]);
});

/* ---- The card's tags --------------------------------------------------------------- */

test('"Under 500 kcal" is derived from published calories, strictly under 500', () => {
  assert.ok(isUnderKcal(dish({ nutrition: { calories: 480 } })));
  assert.ok(!isUnderKcal(dish({ nutrition: { calories: 500 } })));
  assert.ok(!isUnderKcal(dish({ nutrition: { calories: 520 } })));
  assert.ok(!isUnderKcal(dish()), 'no calories, no tag');
  // A stored tag is not content: the old page carried it on a 520 kcal dish.
  const stored = dish({ tags: [UNDER_KCAL_TAG], nutrition: { calories: 520 } });
  assert.deepEqual(dishCardTags(stored).cream, []);
  // The fixtures no longer store it anywhere.
  assert.ok(!DISH_FIXTURES.some((candidate) => candidate.tags.includes(UNDER_KCAL_TAG)));
});

test('cream tags: the first eating style (or the homepage category), then the kcal tag; New in gold', () => {
  assert.deepEqual(dishCardTags(bySlug('chicken-egusi-cauliflower-rice')), {
    cream: ['Carb-conscious', UNDER_KCAL_TAG],
    isNew: false,
  });
  assert.deepEqual(dishCardTags(bySlug('wild-rice-goat-efo')), { cream: ['Protein-led'], isNew: true });
  assert.deepEqual(dishCardTags(bySlug('fish-peppersoup-bone-broth')).cream, ['DASH']);
  assert.deepEqual(dishCardTags(bySlug('slow-braised-egusi')).cream, ['Everyday balance']);
  assert.deepEqual(dishCardTags(dish({ tags: ['new'] })), { cream: [], isNew: true });
});

test('the menu card: an h2, the heat word, the derived tag; no heat row for an unpublished heat', () => {
  const egusi = bySlug('chicken-egusi-cauliflower-rice');
  const html = renderToStaticMarkup(
    <DishCard dish={egusi} variant="grid" href={`/menu/${egusi.slug}`} headingLevel={2} />,
  );
  assert.match(html, /<h2 class="title">/);
  assert.match(html, /aria-label="Heat level: Mild"/);
  assert.match(html, /class="heatWord"[^>]*>Mild</);
  assert.match(html, />Under 500 kcal</);
  assert.doesNotMatch(html, /<a[^>]*>[\s\S]*Under 500 kcal[\s\S]*<\/a>/, 'tags sit outside the link');

  const unknown = renderToStaticMarkup(<DishCard dish={dish({ title: 'X', nutrition: { proteinGrams: 30 } })} variant="grid" />);
  assert.doesNotMatch(unknown, /Heat level/);
  assert.match(unknown, /Protein 30g/);
  assert.doesNotMatch(unknown, /Fibre/, 'no fibre published, no fibre shown');
});

/* ---- Live mapping: no guessed heat ------------------------------------------------- */

test('heat from a browse row: 0–3 map to the four levels; anything else is NO level, not "Medium"', () => {
  assert.deepEqual([0, 1, 2, 3].map(heatFromStep), ['none', 'low', 'medium', 'high']);
  for (const step of [undefined, 4, -1, 1.5]) assert.equal(heatFromStep(step), undefined, String(step));

  const row: ProductSummaryDto = {
    id: 'p1',
    slug: 'p1',
    name: 'Row',
    status: 'Active',
    kind: 'Simple',
    categoryId: null,
    variantCount: 1,
    heroImageUrl: null,
    tags: [],
    attributesJson: '{}',
    unitSurcharge: null,
  };
  assert.equal(mapSummaryToDish(row).heat, undefined);
  assert.equal(mapSummaryToDish({ ...row, attributesJson: '{"heatStep":0}' }).heat, 'none');
});

/* ---- The delivery date ---------------------------------------------------------------- */

test('"Fri 18 Sep": the weekday derived from the date, never stored; null for a date that is not one', () => {
  assert.equal(formatDeliveryDateShort('2026-09-18'), 'Fri 18 Sep');
  assert.equal(formatDeliveryDateShort('2026-08-06'), 'Thu 6 Aug');
  assert.equal(formatDeliveryDateShort('2026-02-30'), null);
  assert.equal(formatDeliveryDateShort(null), null);
  assert.equal(formatDeliveryDateShort('Fri 18 Sep'), null);
});

/* ---- ↑ Top ---------------------------------------------------------------------------- */

test('↑ Top: position, two thresholds, never a dish count', () => {
  const phone = (bandTop: number) => ({ desktop: false, bandTop, firstCardBottom: 0, viewportHeight: 800 });
  assert.equal(nextTopShown(false, phone(-1000)), false, 'under 1.75 viewports');
  assert.equal(nextTopShown(false, phone(-1401)), true);
  assert.equal(nextTopShown(true, phone(-1000)), true, 'held between the thresholds');
  assert.equal(nextTopShown(true, phone(-700)), false, 'under 0.9 viewports');

  const desk = (firstCardBottom: number | null) => ({ desktop: true, bandTop: 0, firstCardBottom, viewportHeight: 900 });
  assert.equal(nextTopShown(false, desk(-1)), true, 'the first row has left');
  assert.equal(nextTopShown(true, desk(100)), true, 'held');
  assert.equal(nextTopShown(true, desk(141)), false, 'the row is back');
  assert.equal(nextTopShown(true, desk(null)), false, 'no cards, no Top');
});

/* ---- The page -------------------------------------------------------------------------- */

const router = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
  hmrRefresh() {},
};

function inApp(node: ReactNode, search = '') {
  return (
    <AppRouterContext.Provider value={router as never}>
      <SearchParamsContext.Provider value={new URLSearchParams(search) as never}>
        <PathnameContext.Provider value="/menu">{node}</PathnameContext.Provider>
      </SearchParamsContext.Provider>
    </AppRouterContext.Provider>
  );
}

async function renderMenu(params: Record<string, string> = {}, live = false): Promise<string> {
  resetCookies();
  const page = await MenuPage({ searchParams: Promise.resolve(params) });
  return renderToStaticMarkup(
    inApp(<CartProvider mode={live ? undefined : 'demo'}>{page}</CartProvider>, new URLSearchParams(params).toString()),
  );
}

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

test('demo: title, lede with the plan’s minimum, the strip with the window’s date, the note verbatim', async () => {
  const html = await renderMenu();
  assert.match(html, /<h1 id="menu-title"[^>]*tabindex="-1"[^>]*>What’s on the table\?<\/h1>/);
  const words = text(html);
  assert.match(words, /Chef-prepared Nigerian fusion dishes, cooked in small batches/);
  // Mainland UK, not the design's "across the UK" — a recorded departure.
  assert.match(words, /and delivered chilled to mainland UK\. Choose six or more dishes to build your box\./);
  assert.match(words, new RegExp(`Next deliveries from ${formatDeliveryDateShort(DELIVERY_FIXTURE.earliestDeliveryDate)}`));
  assert.ok(words.includes(`${DELIVERY_NOTE.body} ${DELIVERY_NOTE.caveat}`));
  assert.match(html, /aria-label="About delivery dates" aria-controls="menu-delivery-note" aria-expanded="false"/);
  assert.match(html, /data-purchase-bar-reveal=""/, 'the title band reveals the bar');
});

test('demo: the sheet is server-rendered as a dialog, closed, with the four groups and Sort', async () => {
  const html = await renderMenu();
  assert.match(html, /<button[^>]*aria-expanded="false" aria-controls="menu-filters"[^>]*>/);
  assert.match(html, /id="menu-filters"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-label="Filter the menu"/);
  for (const label of ['Protein source', 'Eating style', 'Heat', 'Dietary &amp; other']) {
    assert.ok(html.includes(`>${label}</span>`), label);
  }
  assert.match(html, /aria-label="What do these eating styles mean\?" aria-controls="menu-style-note"/);
  assert.match(html, /<button[^>]*aria-haspopup="listbox"[^>]*>/);
  assert.match(html, /role="option" aria-selected="true"[^>]*><span>Recommended<\/span>/);
  assert.match(html, /Showing 6 of 14 dishes/);
  assert.match(html, /Load more dishes/);
  // Card titles are h2: the page has no section heading between h1 and cards.
  assert.equal(html.match(/<h2 class="title">/g)?.length, 6);
  assert.match(html, /aria-label="Back to top of menu"/);
});

test('demo: a URL with filters, search and sort is what the server applies', async () => {
  const html = await renderMenu({ 'facet.protein': 'fish', 'facet.heat': 'medium', sort: 'protein' });
  assert.match(html, /Showing 1 of 1 dish/);
  assert.match(html, /aria-label="Remove filter: Fish"/);
  assert.match(html, /aria-label="Remove filter: Medium heat"/);
  assert.match(html, /<span class="countPill">.*?2.*?<\/span>/);
  assert.match(html, /Royal Seafood Okra/);
  assert.match(html, /aria-selected="true"[^>]*><span>Highest protein/);

  const stale = await renderMenu({ 'facet.spice': 'mild', 'facet.calories': 'under-500' });
  assert.match(stale, /Showing 6 of 14 dishes/, 'retired keys are dropped, not matched');
  assert.doesNotMatch(stale, /Remove filter/);
});

/* ---- Live: honest about what Aonik cannot do yet ----------------------------------------- */

const LIVE_FACETS = [
  {
    id: 'f1',
    key: 'protein',
    label: 'Protein source',
    matchKind: 'Attribute',
    sourcePath: 'protein',
    sortOrder: 0,
    isActive: true,
    options: [{ value: 'fish', label: 'Fish', sortOrder: 0 }],
  },
];

function liveRow(slug: string, attributes: Record<string, unknown>): ProductSummaryDto {
  return {
    id: slug,
    slug,
    name: slug,
    status: 'Active',
    kind: 'Simple',
    categoryId: null,
    variantCount: 1,
    heroImageUrl: null,
    tags: [],
    attributesJson: JSON.stringify(attributes),
    unitSurcharge: null,
  };
}

async function withLive<T>(responder: Parameters<typeof stubAonik>[0], run: () => Promise<T>): Promise<T> {
  const saved = { ...process.env };
  const quiet = console.error;
  console.error = () => {};
  configureAonik({ AONIK_DATA_MODE: 'live' });
  stubAonik(responder);
  try {
    return await run();
  } finally {
    console.error = quiet;
    process.env = saved;
  }
}

test('live: no Sort control, no sort sent, unadvertised facets never sent, no guessed heat', async () => {
  const html = await withLive(
    (request) => {
      if (request.path.startsWith('/commerce/catalog/facets')) return { status: 200, body: LIVE_FACETS };
      if (request.path.startsWith('/commerce/catalog/products')) {
        return {
          status: 200,
          body: { items: [liveRow('no-heat', {}), liveRow('hot', { heatStep: 3, kcal: 450 })], totalCount: 2, page: 1, pageSize: 6 },
        };
      }
      if (request.path.startsWith('/commerce/config/delivery')) return { status: 404, body: {} };
      return { status: 503, body: {} };
    },
    () => renderMenu({ 'facet.protein': 'fish', 'facet.heat': 'hot', sort: 'protein' }, true),
  );

  const browse = aonikRequests.find((request) => request.path.startsWith('/commerce/catalog/products'))!;
  assert.match(browse.path, /facet\.protein=fish/);
  assert.doesNotMatch(browse.path, /facet\.heat/, 'heat is not a facet this tenant advertises');
  assert.doesNotMatch(browse.path, /sort=/, 'Aonik cannot sort by protein');
  assert.doesNotMatch(html, /aria-haspopup="listbox"/, 'no Sort control for one order');
  assert.doesNotMatch(html, /Next deliveries from/, 'no delivery window, no strip');
  assert.equal(html.match(/Heat level:/g)?.length, 1, 'only the row that published a heat states one');
  assert.match(html, />Under 500 kcal</);
});

test('live: a facets read that fails costs the filters, not the menu', async () => {
  const html = await withLive(
    (request) => {
      if (request.path.startsWith('/commerce/catalog/products')) {
        return { status: 200, body: { items: [liveRow('a', {})], totalCount: 1, page: 1, pageSize: 6 } };
      }
      return { status: 503, body: {} };
    },
    () => renderMenu({ 'facet.protein': 'fish' }, true),
  );
  const browse = aonikRequests.find((request) => request.path.startsWith('/commerce/catalog/products'))!;
  assert.doesNotMatch(browse.path, /facet\./, 'nothing to validate against, nothing sent');
  assert.doesNotMatch(html, /aria-controls="menu-filters"/, 'no Filters button that opens nothing');
  assert.match(html, /What’s on the table\?/);
});

test('live: a menu that cannot read its dishes is a fault for the error boundary, not an empty page', async () => {
  await withLive(
    () => ({ status: 503, body: {} }),
    async () => {
      await assert.rejects(() => MenuPage({ searchParams: Promise.resolve({}) }));
    },
  );
});

import './support/runtime';

import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import HomePage from '../src/app/(site)/page';
import { MenuGrid } from '../src/components/menu/MenuGrid';
import { DishCard } from '../src/components/sections/DishCard';
import { Founder } from '../src/components/sections/Founder';
import { Hero } from '../src/components/sections/Hero';
import { HowItWorks } from '../src/components/sections/HowItWorks';
import { KeepCompounds } from '../src/components/sections/KeepTogether';
import { PrivateTable } from '../src/components/sections/PrivateTable';
import { Standards } from '../src/components/sections/Standards';
import { DELIVERY_FIXTURE, DISH_FIXTURES, STOREFRONT_CONFIG_FIXTURE } from '../src/lib/aonik/fixtures';
import type { StorefrontBoxPlan } from '../src/lib/aonik/types';
import { CartProvider } from '../src/lib/cart/CartProvider';
import {
  HOMEPAGE_STANDARDS,
  homepageSteps,
  PRIVATE_TABLE_FROM_PENCE,
  PRIVATE_TABLE_HREF,
  SIGNATURE_EXPLAINER,
} from '../src/lib/content/marketing';
import { formatDeliveryDate, formatPrice } from '../src/lib/format';
import { offerLines, purchaseBarOffer } from '../src/lib/purchase-bar/offer';

import { aonikRequests, configureAonik, useAonik } from './support/aonik';
import { resetCookies } from './support/next-headers';

/*
 * Homepage to the v2 design (#15). Sources: design/Abby's Table - Homepage
 * v2.dc.html, build-handoff "Homepage section order" and the homepage
 * sections, behaviour guide §1, frontend-backend-contract §2.
 */

/** A plan with round numbers, so a figure on screen can only have come from it. */
const plan: StorefrontBoxPlan = {
  minSize: 6,
  maxSize: 99,
  currency: 'GBP',
  perSpacePence: 1700,
  presets: [
    { size: 6, pricePence: 15800 },
    { size: 12, pricePence: 30600 },
  ],
};

const MONTH = /\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)\b/;

/** The text a reader gets: tags dropped, entities decoded, whitespace collapsed. */
function textOf(html: string): string {
  return html
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every href in the markup, in order. */
function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
}

/* ---- The whole page ---------------------------------------------------------- */

async function renderHomePage(): Promise<string> {
  resetCookies();
  const page = await HomePage();
  return renderToStaticMarkup(<CartProvider mode="demo">{page}</CartProvider>);
}

test('the six bands, in the canonical order, with the boxes promo and gifting gone', async () => {
  const html = await renderHomePage();
  const order = ['top', 'howitworks', 'menu', 'standards', 'founder', 'private'].map((id) =>
    html.indexOf(`id="${id}"`),
  );

  assert.ok(order.every((index) => index >= 0), `every band renders: ${order.join(', ')}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'Hero → How it works → dishes → standards → founder → Private Table');
  assert.doesNotMatch(html, /id="(boxes|gifting)"/);
  assert.doesNotMatch(html, /Build a gift box|Choose your dishes/);
});

test('one h1, then h2s in reading order', async () => {
  const html = await renderHomePage();
  assert.equal(html.match(/<h1\b/g)?.length, 1);
  const h2s = [...html.matchAll(/<h2\b[^>]*>(.*?)<\/h2>/g)].map((match) => textOf(match[1]));
  assert.deepEqual(h2s, [
    'How Abby’s Table works',
    'A taste of the table',
    'Our standards',
    'Meet the founder',
    'Abby’s Private Table',
  ]);
});

test('no delivery date anywhere on the homepage', async () => {
  const html = await renderHomePage();
  const text = textOf(html);
  assert.ok(!text.includes(formatDeliveryDate(DELIVERY_FIXTURE.earliestDeliveryDate)!));
  assert.doesNotMatch(text, MONTH);
  assert.doesNotMatch(text, /earliest/i);
});

test('the How it works note is the demo plan’s offer, read once with the bar’s (still £95 until #28)', async () => {
  const html = await renderHomePage();
  const lines = offerLines(purchaseBarOffer(STOREFRONT_CONFIG_FIXTURE.box)!);
  assert.match(textOf(html), new RegExp(`${lines.minimum} · ${lines.from}`));
});

test('every homepage link goes to a real route — none to a 404, none to a removed band', async () => {
  const html = await renderHomePage();
  const links = hrefs(html);
  for (const expected of ['/menu', '/how-it-works', '/box', '/standards', '/our-story']) {
    assert.ok(links.includes(expected), `links to ${expected}`);
  }
  assert.ok(!links.includes('/private-table'), 'the Private Table page is #25; not linked yet');
  assert.ok(!links.some((href) => /^\/?#(boxes|gifting)$/.test(href)));
});

test('nothing elsewhere points at the removed bands: the /menu grid’s "handpicked boxes" row is gone', () => {
  const noop = () => {};
  const html = renderToStaticMarkup(
    <MenuGrid
      dishes={DISH_FIXTURES.slice(0, 2)}
      resultLabel="2 dishes"
      active={[]}
      onRemoveFilter={noop}
      onClearAll={noop}
      showLoadMore={false}
      onLoadMore={noop}
    />,
  );
  // Menu Landing v3 has no such row, and its only target was the boxes promo.
  assert.doesNotMatch(html, /#boxes|handpicked boxes/);
});

/* ---- Hero ---------------------------------------------------------------------- */

test('hero: the v2 headline, lede, three facts and both CTAs', () => {
  const html = renderToStaticMarkup(<Hero />);
  const text = textOf(html);

  assert.match(html, /<h1[^>]*>Nigerian<br\/>Fusion Food\.<br\/>Nutrition<br\/>at the Core\.<\/h1>/);
  assert.match(text, /Chef-prepared dishes made from scratch, with quality ingredients and real flavour\./);
  for (const fact of ['Rooted in tradition', 'No ultra-processed foods', 'Real ingredients. Real flavour.']) {
    assert.ok(text.includes(fact), fact);
  }
  // "View the menu" is the purchase bar's reveal point.
  const primary = /<a([^>]*)>View the menu<\/a>/.exec(html)?.[1] ?? '';
  assert.match(primary, /href="\/menu"/);
  assert.match(primary, /data-purchase-bar-reveal=""/);
  assert.match(html, /<a[^>]*href="\/how-it-works"[^>]*>.*How it works/);
});

test('hero: one art-directed photograph — the 2:1 crop from 1024 only, the one fetchpriority=high', () => {
  const html = renderToStaticMarkup(<Hero />);
  assert.match(html, /<source media="\(min-width: 1024px\)" srcSet="[^"]*hero-landscape-1774\.jpg/);
  assert.match(html, /<img[^>]*hero-portrait-800\.jpg/);
  assert.equal(html.match(/fetchPriority="high"/gi)?.length, 1);
  assert.match(html, /alt="A ceramic bowl of jollof rice/);
});

/* ---- How it works ------------------------------------------------------------- */

test('How it works: the four steps, Build a Box to /box and Learn more to /how-it-works', () => {
  const html = renderToStaticMarkup(<HowItWorks offer={purchaseBarOffer(plan)} />);
  const text = textOf(html);

  assert.ok(text.includes('Four simple steps, from our table to yours.'));
  const titles = [...html.matchAll(/class="stepTitle">([^<]*)</g)].map((match) => match[1]);
  assert.deepEqual(titles, ['Build a box', 'We cook from scratch', 'Delivered chilled', 'Heat, enjoy, live well']);
  assert.match(html, /<ol[^>]*>/, 'a real ordered list');
  assert.match(html, /<a[^>]*href="\/box"[^>]*>Build a Box<\/a>/);
  assert.match(html, /<a[^>]*href="\/how-it-works"[^>]*>.*Learn more/);
});

test('How it works: "Minimum 6 dishes · From £158" and step 01’s minimum come from the plan', () => {
  const text = textOf(renderToStaticMarkup(<HowItWorks offer={purchaseBarOffer(plan)} />));
  assert.ok(text.includes('Minimum 6 dishes · From £158'));
  assert.ok(text.includes('Minimum order: 6 dishes. Choose your meals and preferred portion size.'));

  // An edited price source is a data change only — no figure is copy.
  const edited = purchaseBarOffer({ ...plan, minSize: 8, presets: [{ size: 8, pricePence: 16500 }] });
  const editedText = textOf(renderToStaticMarkup(<HowItWorks offer={edited} />));
  assert.ok(editedText.includes('Minimum 8 dishes · From £165'));
  assert.ok(editedText.includes('Minimum order: 8 dishes.'));
  assert.ok(!editedText.includes('£158'));
});

test('How it works: no plan, no figures — the note goes and step 01 loses its minimum', () => {
  const html = renderToStaticMarkup(<HowItWorks offer={null} />);
  assert.doesNotMatch(textOf(html), /Minimum|From £/);
  assert.match(html, /class="stepBody">Choose your meals and preferred portion size\.</);
  assert.deepEqual(homepageSteps(null)[0].body, 'Choose your meals and preferred portion size.');
});

test('How it works: the plan’s minimum with no price at it still states the minimum, no "From"', () => {
  const offer = purchaseBarOffer({ ...plan, presets: [{ size: 12, pricePence: 30600 }] });
  const text = textOf(renderToStaticMarkup(<HowItWorks offer={offer} />));
  assert.ok(text.includes('Minimum 6 dishes'));
  assert.doesNotMatch(text, /From £/);
});

test('How it works: the looping clip has a pause control and its own label, and loads nothing up front', () => {
  const html = renderToStaticMarkup(<HowItWorks offer={null} />);
  assert.match(html, /<video[^>]*preload="none"/);
  assert.doesNotMatch(html, /<video[^>]*\bsrc=/, 'the source is attached near the viewport, not in the HTML');
  assert.match(html, /<video[^>]*role="img"[^>]*aria-label="A tray of jollof rice/);
  assert.match(html, /<button[^>]*aria-label="Play the video"/);
  assert.match(html, /<source media="\(min-width: 1024px\)" srcSet="[^"]*hiw-poster-desktop\.jpg/);
  assert.match(html, /<img[^>]*loading="lazy"[^>]*hiw-poster-mobile\.jpg|<img[^>]*hiw-poster-mobile\.jpg[^>]*loading="lazy"/);
});

/* ---- Our standards ------------------------------------------------------------ */

test('Our standards: the band’s four items in their deliberate order, and View our standards', () => {
  const html = renderToStaticMarkup(<Standards />);
  const titles = [...html.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((match) => textOf(match[1]));
  assert.deepEqual(titles, [
    'High-quality ingredients',
    'No commercial seasoning blends',
    'Full nutritional information',
    'No seed oils',
  ]);
  assert.deepEqual(titles, HOMEPAGE_STANDARDS.map((item) => item.title));
  assert.ok(textOf(html).includes('Real food, higher standards.'));
  assert.equal(html.match(/<svg/g)?.length, 4);
  assert.equal(html.match(/aria-hidden="true"><svg/g)?.length, 4, 'the marks are decorative');
  assert.match(html, /<a[^>]*href="\/standards"[^>]*>View our standards<\/a>/);
});

/* ---- Founder ------------------------------------------------------------------- */

test('Founder: "Meet the founder" is the heading, the name a subtitle, Read Abby’s story → /our-story', () => {
  const html = renderToStaticMarkup(<Founder />);
  assert.match(html, /<h2[^>]*>Meet the founder<\/h2>/);
  assert.match(html, /<p[^>]*>Esther Abby Josiah<\/p>/);
  assert.match(html, /<a[^>]*href="\/our-story"[^>]*>Read Abby’s story<\/a>/);
  assert.match(html, /alt="Esther Abby Josiah at a kitchen table/);
  assert.match(html, /loading="lazy"/);
});

/* ---- Private Table ------------------------------------------------------------- */

test('Private Table: the price is the content constant, formatted — never a literal', () => {
  const html = renderToStaticMarkup(<PrivateTable />);
  const text = textOf(html);
  assert.ok(text.includes(`Private Table from ${formatPrice(PRIVATE_TABLE_FROM_PENCE)}`));
  assert.equal(formatPrice(PRIVATE_TABLE_FROM_PENCE), '£1,500');
  assert.ok(!text.includes('£2,500'));
});

test('Private Table: globe and pin reach rows, the credentials, and the bar stops here', () => {
  const html = renderToStaticMarkup(<PrivateTable />);
  const text = textOf(html);
  assert.match(html, /<section[^>]*id="private"[^>]*data-purchase-bar-stop=""/);
  const rows = [...html.matchAll(/class="reachLabel">([^<]*)<\/span><span class="reachValue">([^<]*)</g)];
  assert.deepEqual(
    rows.map((row) => [row[1], row[2]]),
    [
      ['Worldwide', 'Bespoke recipes created for you'],
      ['UK-wide', 'Bespoke recipes created and prepared for you'],
    ],
  );
  assert.equal(html.match(/class="reachRing" aria-hidden="true"><svg/g)?.length, 2);
  for (const credential of ['A UK-certified health coach', 'A registered nutritionist', 'Your clinical team']) {
    assert.ok(text.includes(credential), credential);
  }
});

test('Private Table: "Find out more" waits for the page (#25) — no 404, no inert button', () => {
  const html = renderToStaticMarkup(<PrivateTable />);
  assert.equal(PRIVATE_TABLE_HREF, null, 'flip to "/private-table" when #25 lands');
  assert.doesNotMatch(html, /Find out more/);
  assert.doesNotMatch(html, /<button/);
  assert.equal(hrefs(html).length, 0);
});

/* ---- Dish card ------------------------------------------------------------------ */

const signatureDish = DISH_FIXTURES.find((dish) => dish.isSignature && dish.isFeatured)!;

test('the Signature note is the v2 copy, on every card variant', () => {
  for (const variant of ['rail', 'grid'] as const) {
    const html = renderToStaticMarkup(<DishCard dish={signatureDish} variant={variant} />);
    assert.ok(textOf(html).includes(SIGNATURE_EXPLAINER));
    assert.doesNotMatch(html, /Counts as one of your box dishes/);
  }
  assert.equal(
    SIGNATURE_EXPLAINER,
    'One of Abby’s specials. This dish takes a little more time or uses premium cuts, so there’s a small upgrade.',
  );
});

test('the homepage rail card leaves the heat word off; the menu grid card states it', () => {
  const rail = renderToStaticMarkup(<DishCard dish={signatureDish} variant="rail" />);
  const grid = renderToStaticMarkup(<DishCard dish={signatureDish} variant="grid" />);
  // Both name the level to assistive tech through the pips.
  assert.match(rail, /role="img" aria-label="Heat: /);
  assert.match(grid, /role="img" aria-label="Heat: /);
  assert.equal(rail.match(/class="label"/g), null);
  assert.equal(grid.match(/class="label"/g)?.length, 1);
});

/* ---- Hyphenated compounds --------------------------------------------------------- */

test('approved compounds are held together at render time; the content keeps ordinary hyphens', () => {
  const html = renderToStaticMarkup(
    <KeepCompounds text="Chef-prepared, nutrition-led, made for flavour with quality ingredients." />,
  );
  assert.equal(
    html,
    '<span class="keep">Chef-prepared</span>, <span class="keep">nutrition-led</span>, made for flavour with quality ingredients.',
  );
  assert.equal(renderToStaticMarkup(<KeepCompounds text="Fall-off-the-bone" />), 'Fall-off-the-bone');
});

test('the dish card holds its name’s and components line’s compounds together ("Lime- / Herb" never)', () => {
  const oxtail = DISH_FIXTURES.find((dish) => dish.slug === 'slow-braised-oxtail-pappardelle')!;
  const html = renderToStaticMarkup(<DishCard dish={oxtail} />);
  assert.match(html, /<h3[^>]*><span class="keep">Slow-Braised<\/span> Oxtail Pappardelle<\/h3>/);
  assert.match(html, /<span class="keep">Lime-Herb<\/span> Purple Cabbage/);
  assert.ok(oxtail.parts?.includes('Lime-Herb'), 'the data keeps an ordinary hyphen');
});

/* ---- What the page asks Aonik for --------------------------------------------------- */

test('live: the homepage reads its dishes and the box plan once — and never a delivery date', async () => {
  const saved = { ...process.env };
  configureAonik({ AONIK_DATA_MODE: 'live' });
  // Aonik down: the request list is the point, not the render.
  useAonik(() => ({ status: 503, body: { title: 'Service Unavailable' } }));
  try {
    resetCookies();
    await HomePage().catch(() => null);
    const paths = aonikRequests.map((request) => request.path);

    assert.ok(paths.some((path) => path.startsWith('/commerce/catalog/collections/')), 'the featured rail');
    assert.equal(paths.filter((path) => path === '/commerce/config/storefront').length, 1, 'the plan, once');
    assert.ok(!paths.some((path) => path.includes('/config/delivery')), 'no delivery date is read');
  } finally {
    process.env = saved;
  }
});

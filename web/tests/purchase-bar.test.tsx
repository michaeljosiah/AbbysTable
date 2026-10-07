import './support/runtime';

import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { MobilePurchaseBar } from '../src/components/purchase-bar/MobilePurchaseBar';
import { purchaseBarClasses } from '../src/components/purchase-bar/classes';
import { PurchaseBarShell } from '../src/components/purchase-bar/PurchaseBarShell';
import { EXTRA_FIXTURES } from '../src/lib/aonik/extras';
import { BOX_PRICING_FIXTURE, STOREFRONT_CONFIG_FIXTURE } from '../src/lib/aonik/fixtures';
import type { StorefrontBoxPlan } from '../src/lib/aonik/types';
import { CartProvider } from '../src/lib/cart/CartProvider';
import { holdDocumentFlag, type FlagTarget } from '../src/lib/dom/documentFlag';
import { swallowClicksFor } from '../src/lib/dom/ghostClicks';
import {
  activeBoxSummary,
  boxResumeHref,
  isBoxActive,
  type BarCart,
} from '../src/lib/purchase-bar/activeBox';
import { offerLines, purchaseBarOffer, type PurchaseBarPricing } from '../src/lib/purchase-bar/offer';
import {
  DIRECTION_FLOOR_PX,
  firstStopTop,
  hasScrolledPast,
  initialDirection,
  isSuppressed,
  nextDirection,
  scrollerView,
  shouldShowBar,
  type ScrollDirection,
} from '../src/lib/purchase-bar/visibility';

/*
 * Mobile purchase bar (#12). Sources: design/build-handoff.md §3j,
 * design/CLAUDE.md "Mobile purchase CTA + header behaviour" and "Order in
 * progress", design/at-order-state.js, contract §2 — and the bar as built in
 * Homepage v2, How It Works v2, Menu Landing v3 and Dish Landing v2.
 */

/* ---- Scroll direction ------------------------------------------------------ */

test('movement under 8px changes nothing — not even the last counted position', () => {
  const start = { lastY: 400, down: false };
  assert.equal(nextDirection(start, 407), start);
  // Slow scrolling still accumulates: 400 → 407 was ignored, 400 → 409 counts.
  assert.deepEqual(nextDirection(start, 409), { lastY: 409, down: true });
});

test('never "down" within the 120px floor, and any counted upward move is "up"', () => {
  assert.deepEqual(nextDirection({ lastY: 0, down: false }, DIRECTION_FLOOR_PX), {
    lastY: DIRECTION_FLOOR_PX,
    down: false,
  });
  assert.equal(nextDirection({ lastY: 100, down: false }, 130).down, true);
  assert.equal(nextDirection({ lastY: 900, down: true }, 880).down, false);
});

test('focus in the header holds the page out of "down", but still moves the mark', () => {
  const held = nextDirection({ lastY: 300, down: false }, 360, { holdDown: true });
  assert.deepEqual(held, { lastY: 360, down: false });
  // Holding never blocks "up".
  assert.equal(nextDirection({ lastY: 300, down: true }, 200, { holdDown: true }).down, false);
});

test('a page opened mid-scroll starts "not down", measured from where it opened', () => {
  assert.deepEqual(initialDirection(2400), { lastY: 2400, down: false });
  assert.deepEqual(initialDirection(-30), { lastY: 0, down: false });
});

/* ---- Reveal and suppression ------------------------------------------------ */

test('revealed only once the marker is wholly above the viewport', () => {
  assert.equal(hasScrolledPast({ bottom: 40 }), false);
  assert.equal(hasScrolledPast({ bottom: 0 }), true);
  assert.equal(hasScrolledPast({ bottom: -300 }), true);
  // A page with no marker has nothing to wait for.
  assert.equal(hasScrolledPast(null), true);
});

test('suppressed once the first stop marker crosses 75% of the viewport', () => {
  assert.equal(isSuppressed(null, 844), false);
  assert.equal(isSuppressed(634, 844), false); // 844 × 0.75 = 633
  assert.equal(isSuppressed(632, 844), true);
  assert.equal(isSuppressed(-5000, 844), true); // deep in the footer: still suppressed
  // Private Table above the footer: the higher marker decides.
  assert.equal(firstStopTop([1900, 600]), 600);
  assert.equal(firstStopTop([]), null);
});

test('the bar needs reveal AND (downward scroll, unless the page ignores direction) AND no suppression', () => {
  const base = { revealed: true, down: true, suppressed: false, followsDirection: true };
  assert.equal(shouldShowBar(base), true);
  assert.equal(shouldShowBar({ ...base, down: false }), false);
  assert.equal(shouldShowBar({ ...base, revealed: false }), false);
  assert.equal(shouldShowBar({ ...base, suppressed: true }), false);
  // Dish Landing v2: shown past the CTA in either direction, still suppressed at the footer.
  const dish = { ...base, followsDirection: false };
  assert.equal(shouldShowBar({ ...dish, down: false }), true);
  assert.equal(shouldShowBar({ ...dish, suppressed: true }), false);
  assert.equal(shouldShowBar({ ...dish, revealed: false }), false);
});

/**
 * Walks a page the way the component does: per scroll position, the reveal
 * marker's bottom and the first stop's top, in viewport coordinates.
 */
function walk(
  positions: number[],
  page: { revealBottom: number; stopTop: number; viewport: number; followsDirection?: boolean },
) {
  let direction: ScrollDirection = initialDirection(positions[0]);
  return positions.map((y) => {
    direction = nextDirection(direction, y);
    return shouldShowBar({
      revealed: hasScrolledPast({ bottom: page.revealBottom - y }),
      down: direction.down,
      suppressed: isSuppressed(page.stopTop - y, page.viewport),
      followsDirection: page.followsDirection ?? true,
    });
  });
}

test('homepage walk: hidden in the hero, shown going down, retracts going up, suppressed from Private Table', () => {
  // Hero CTA ends at 700px; Private Table starts at 5000px; a 844px phone.
  const page = { revealBottom: 700, stopTop: 5000, viewport: 844 };
  const shown = walk([0, 200, 600, 800, 1200, 1100, 1000, 1300, 4300, 4400, 4500, 6000, 4000, 3900, 4100], page);
  assert.deepEqual(shown, [
    false, // load, hero in view
    false, // down, hero CTA still on screen
    false,
    true, //  down, hero CTA gone
    true,
    false, // up: header's turn
    false,
    true, //  down again
    true, //  4300: Private Table top at 700 > 633
    false, // 4400: top at 600 — suppressed
    false,
    false, // footer: still suppressed
    false, // up past Private Table: released, but never forced back
    false,
    true, //  the next downward scroll brings it back
  ]);
});

test('dish walk: shown past the inline CTA whichever way the page moves, gone at the footer', () => {
  const page = { revealBottom: 1400, stopTop: 4000, viewport: 844, followsDirection: false };
  assert.deepEqual(walk([0, 1000, 1500, 1460, 1300, 3500], page), [
    false, // CTA below
    false, // CTA on screen
    true, //  scrolled past
    true, //  scrolling up, still past: stays (no direction rule here)
    false, // CTA back on screen
    false, // footer
  ]);
});

/* ---- The offer ------------------------------------------------------------- */

const plan: StorefrontBoxPlan = {
  minSize: 6,
  maxSize: 99,
  currency: 'GBP',
  perSpacePence: 1700,
  presets: [
    { size: 12, pricePence: 30600 },
    { size: 6, pricePence: 15800 },
  ],
};

test('"Minimum 6 dishes / From £158" comes from the plan, never a literal', () => {
  const offer = purchaseBarOffer(plan);
  assert.deepEqual(offer, { minDishes: 6, fromPence: 15800 });
  assert.deepEqual(offerLines(offer!), { minimum: 'Minimum 6 dishes', from: 'From £158' });
  // An edited price source is a data change only.
  const raised = purchaseBarOffer({ ...plan, presets: [{ size: 6, pricePence: 16500 }] });
  assert.equal(offerLines(raised!).from, 'From £165');
});

test('no "From" figure the plan does not publish', () => {
  // No preset AT the minimum: the embedded plan has no base price to compute one from.
  assert.deepEqual(purchaseBarOffer({ ...plan, presets: [{ size: 12, pricePence: 30600 }] }), {
    minDishes: 6,
    fromPence: null,
  });
  // A currency formatPrice cannot render is not priced.
  assert.equal(purchaseBarOffer({ ...plan, currency: 'EUR' })?.fromPence, null);
  assert.equal(offerLines({ minDishes: 6, fromPence: null }).from, null);
  // No plan at all: no offer, and the bar shows its CTA alone.
  assert.equal(purchaseBarOffer(undefined), null);
  assert.equal(purchaseBarOffer({ ...plan, maxSize: 3 }), null);
});

test('the demo fixtures flow through unchanged (still the £95 box until #28)', () => {
  assert.deepEqual(purchaseBarOffer(STOREFRONT_CONFIG_FIXTURE.box), { minDishes: 6, fromPence: 9500 });
});

/* ---- The active box -------------------------------------------------------- */

const pricing: PurchaseBarPricing = { box: BOX_PRICING_FIXTURE, extras: EXTRA_FIXTURES };

function cart(overrides: Partial<BarCart> = {}): BarCart {
  return {
    hydrated: true,
    boxSize: null,
    isCustom: false,
    lines: [],
    extras: [],
    dishCount: 0,
    isServerCart: false,
    quote: null,
    ...overrides,
  };
}

const okra = {
  lineId: 'okra-1',
  dishId: 'okra',
  slug: 'seafood-okra',
  title: 'Royal Seafood Okra',
  imageUrl: '/okra.jpg',
  quantity: 1,
  surchargePence: 0,
};

test('active once committed OR holding a dish — and never before hydration', () => {
  assert.equal(isBoxActive(cart()), false);
  assert.equal(isBoxActive(cart({ boxSize: 6 })), true); // committed, empty: still active
  assert.equal(isBoxActive(cart({ dishCount: 1 })), true); // a carried dish
  assert.equal(isBoxActive(cart({ hydrated: false, boxSize: 6, dishCount: 3 })), false);
});

test('VIEW BOX resumes Step 1 for a carried dish, Step 2 once a size is committed', () => {
  assert.equal(boxResumeHref(null), '/box');
  assert.equal(boxResumeHref(12), '/box/dishes');
});

test('no active box, no summary: the bar keeps selling', () => {
  assert.equal(activeBoxSummary(cart(), pricing, null), null);
});

test('a carried dish reads as Step 1 preselects it: the first preset, at its price', () => {
  const summary = activeBoxSummary(cart({ lines: [okra], dishCount: 1 }), pricing, null);
  assert.deepEqual(summary, { label: '6-dish box', total: '£95', href: '/box' });
});

test('a committed box totals box, surcharges, overflow and extras, as the checkout does', () => {
  const summary = activeBoxSummary(
    cart({
      boxSize: 12,
      lines: [{ ...okra, quantity: 2, surchargePence: 500 }],
      extras: [{ lineId: 'puff-1', variantId: 'extra-puffpuff', quantity: 2 }],
      dishCount: 2,
    }),
    pricing,
    null,
  );
  // £170 box + 2 × £5 surcharge + 2 × £4.50 puff puff.
  assert.deepEqual(summary, { label: '12-dish box', total: '£189', href: '/box/dishes' });
});

test('a demo delivery charge is in the total, as Review and the live quote count it', () => {
  const charged: PurchaseBarPricing = {
    ...pricing,
    box: { ...BOX_PRICING_FIXTURE, delivery: { listPence: 1000, pricePence: 650 } },
  };
  const summary = activeBoxSummary(cart({ boxSize: 6, lines: [okra], dishCount: 1 }), charged, null);
  // £95 box + £6.50 delivery.
  assert.equal(summary?.total, '£101.50');
});

test('a total the client cannot price is left out rather than guessed', () => {
  const unpriced = cart({ boxSize: 6, lines: [{ ...okra, surchargePence: undefined }], dishCount: 1 });
  assert.equal(activeBoxSummary(unpriced, pricing, null)?.total, null);
  // No demo pricing reached the page: label from the offer, no total.
  assert.deepEqual(activeBoxSummary(cart({ dishCount: 1, lines: [okra] }), null, { minDishes: 6, fromPence: 15800 }), {
    label: '6-dish box',
    total: null,
    href: '/box',
  });
});

test('live: the quote is the total, verbatim', () => {
  const live = cart({ isServerCart: true, boxSize: 6, dishCount: 4, quote: { totalPence: 10525 } });
  assert.deepEqual(activeBoxSummary(live, null, null), {
    label: '6-dish box',
    total: '£105.25',
    href: '/box/dishes',
  });
});

/* ---- Document flags -------------------------------------------------------- */

function fakeRoot(): FlagTarget & { attrs: Set<string> } {
  const attrs = new Set<string>();
  return {
    attrs,
    setAttribute: (name) => void attrs.add(name),
    removeAttribute: (name) => void attrs.delete(name),
  };
}

test('flags are held, counted and released once', () => {
  const root = fakeRoot();
  const drawer = holdDocumentFlag('data-overlay-open', root);
  const sheet = holdDocumentFlag('data-overlay-open', root);
  assert.ok(root.attrs.has('data-overlay-open'));

  drawer();
  drawer(); // a second release is a no-op, not someone else's hold
  assert.ok(root.attrs.has('data-overlay-open'), 'the sheet still holds it');

  sheet();
  assert.equal(root.attrs.has('data-overlay-open'), false);
});

/* ---- Markup ---------------------------------------------------------------- */

function render(node: ReactNode) {
  return renderToStaticMarkup(<CartProvider mode="demo">{node}</CartProvider>);
}

test('server-rendered retracted: inert, and yielding to consent and overlays', () => {
  const html = render(
    <MobilePurchaseBar data={{ offer: { minDishes: 6, fromPence: 15800 }, pricing: null }} />,
  );
  assert.match(html, /^<div class="bar" data-layout="split" data-consent-yield="" data-overlay-yield="" inert=""/);
  assert.doesNotMatch(html, /data-on/);
  assert.match(html, /<span class="textLead">Minimum 6 dishes<\/span><span class="textStrong">From £158<\/span>/);
  assert.match(html, /<a class="cta" href="\/box">Build a Box<\/a>/);
});

test('the first render always sells: the box summary waits for the cart to hydrate', () => {
  const html = render(<MobilePurchaseBar data={{ offer: { minDishes: 6, fromPence: 9500 }, pricing }} />);
  assert.doesNotMatch(html, /View box/);
});

test('a page can supply its own CTA; with no offer it stands alone, centred', () => {
  const html = render(
    <MobilePurchaseBar
      data={{ offer: null, pricing: null }}
      cta={<a className={purchaseBarClasses.cta} href="/box?dishes=12">Build a Box</a>}
    />,
  );
  assert.match(html, /data-layout="centre"/);
  assert.match(html, /href="\/box\?dishes=12"/);
  assert.doesNotMatch(html, /Minimum/);
});

test('the shell takes any content — Private Table v2 passes its waitlist CTA (#25)', () => {
  const html = renderToStaticMarkup(
    <PurchaseBarShell layout="centre">
      <a className={purchaseBarClasses.cta} href="#waitlist">
        Join the waitlist
      </a>
    </PurchaseBarShell>,
  );
  assert.match(html, /data-layout="centre"/);
  assert.match(html, />Join the waitlist<\/a>/);
});

/* ---- Scroll containers and the hand-off ------------------------------------ */

test('an ancestor scroller is measured by its own visible box, clipped to the window', () => {
  // A host shell whose scroll box starts 100px down: its top is the line, and
  // 75% is of its height, not the window's.
  assert.deepEqual(scrollerView(100, 744, 844), { top: 100, height: 744 });
  // A full-window scroller (body as the scroll box) measures as the viewport does.
  assert.deepEqual(scrollerView(0, 844, 844), { top: 0, height: 844 });
  // Taller than the window, or starting above it: only what is on screen counts.
  assert.deepEqual(scrollerView(-50, 2000, 844), { top: 0, height: 844 });
});

test('after the hand-off every click is swallowed for the window, then let through', () => {
  const page = new EventTarget();
  let release: (() => void) | undefined;
  const fakeWindow = {
    setTimeout: (callback: () => void, ms: number) => {
      assert.equal(ms, 500);
      release = callback;
      return 0;
    },
  };
  const globals = globalThis as unknown as Record<string, unknown>;
  const saved = { document: globals.document, window: globals.window };
  globals.document = page;
  globals.window = fakeWindow;
  try {
    swallowClicksFor(500);
    const ghost = new Event('click', { cancelable: true });
    page.dispatchEvent(ghost);
    assert.equal(ghost.defaultPrevented, true); // the second tap of a double tap

    assert.ok(release, 'the guard always schedules its own removal');
    release();
    const deliberate = new Event('click', { cancelable: true });
    page.dispatchEvent(deliberate);
    assert.equal(deliberate.defaultPrevented, false); // a tap after the window acts
  } finally {
    globals.document = saved.document;
    globals.window = saved.window;
  }
});

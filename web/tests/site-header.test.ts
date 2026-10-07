import './support/runtime';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCOUNT_ITEM,
  CONTACT_HREF,
  FOOTER_COLUMNS,
  GIFTING_ITEM,
  GIFTING_LIVE,
  LOGIN_ITEM,
  NAV_ITEMS,
  PRIVATE_TABLE_ITEM,
  SOCIAL_HANDLE,
  SOCIAL_LINKS,
} from '../src/lib/content/navigation';
import { nextDirection } from '../src/lib/purchase-bar/visibility';
import {
  accountItem,
  ariaCurrentFor,
  drawerOrderCta,
  headerOrderCta,
} from '../src/lib/site-header/state';
import {
  autoHidesOnDesktop,
  DESKTOP_AUTO_HIDE_PATHS,
  DESKTOP_HIDE_PX,
  DESKTOP_REVEAL_PX,
  DESKTOP_STATIC_EXAMPLES,
  initialDesktopHeader,
  isHeaderHidden,
  isInPageJump,
  nextDesktopHeader,
  type DesktopHeaderState,
} from '../src/lib/site-header/visibility';

/*
 * The v2 header, drawer and footer (#10). Sources: design/CLAUDE.md
 * "Canonical shared components", "Desktop marketing header" and "Mobile
 * purchase CTA + header behaviour"; design/build-handoff.md §3j and §3v;
 * design/at-desktop-header.js; behaviour guide §A2, §A3, §A5.
 */

/* ---- Which routes auto-hide on desktop ---------------------------------------- */

test('desktop auto-hide: the built marketing pages, and nothing else', () => {
  for (const path of ['/', '/menu', '/how-it-works', '/our-story', '/standards', '/contact', '/delivery-and-faqs']) {
    assert.equal(autoHidesOnDesktop(path), true, path);
  }
  // Trailing slash, query and hash do not change the route.
  assert.equal(autoHidesOnDesktop('/menu/'), true);
  assert.equal(autoHidesOnDesktop('/menu?protein=lamb'), true);
  assert.equal(autoHidesOnDesktop('/#private'), true);
});

test('desktop auto-hide never reaches dish pages, Allergens, legal, account, log in or checkout', () => {
  for (const path of DESKTOP_STATIC_EXAMPLES) {
    assert.equal(autoHidesOnDesktop(path), false, path);
    assert.ok(!DESKTOP_AUTO_HIDE_PATHS.includes(path), path);
  }
  for (const path of ['/box/dishes', '/box/review', '/box/confirmation', '/account/orders/AT-1']) {
    assert.equal(autoHidesOnDesktop(path), false, path);
  }
  // Unbuilt marketing routes join when they land: until then they are a 404,
  // and error pages keep a static header.
  for (const path of ['/gifting', '/private-table', '/nope']) {
    assert.equal(autoHidesOnDesktop(path), false, path);
  }
  assert.equal(autoHidesOnDesktop(null), false);
});

/* ---- Desktop hysteresis: 40 to hide, 64 to reveal --------------------------- */

const HEADER = 81;
const walk = (state: DesktopHeaderState, ys: number[], extra = {}) =>
  ys.reduce((s, y) => nextDesktopHeader(s, y, { headerHeight: HEADER, ...extra }), state);

test('desktop: hides after 40px of travel down from the highest point since shown', () => {
  // Opened mid-page at 200: that is the turning point.
  let s = walk(initialDesktopHeader(200), [220]);
  assert.equal(s.hidden, false);
  s = walk(s, [200 + DESKTOP_HIDE_PX - 1]);
  assert.equal(s.hidden, false, '39px is not enough');
  s = walk(s, [200 + DESKTOP_HIDE_PX]);
  assert.equal(s.hidden, true, '40px from the turning point hides it');
});

test('desktop: the turning point moves with the page, so jitter never flips it', () => {
  // Shown: drifting up resets the high point, so the 40px counts from there.
  let s = walk(initialDesktopHeader(400), [380, 360]);
  assert.deepEqual(s, { hidden: false, turn: 360 });
  s = walk(s, [395]);
  assert.equal(s.hidden, false);
  s = walk(s, [400]);
  assert.equal(s.hidden, true);
  // Hidden: a few px of momentum either way changes nothing.
  s = walk(s, [396, 403, 398]);
  assert.equal(s.hidden, true);
});

test('desktop: reveals after 64px of travel up from the lowest point since hidden', () => {
  let s = walk(initialDesktopHeader(0), [300, 900]);
  assert.equal(s.hidden, true);
  s = walk(s, [1200]);
  assert.deepEqual(s, { hidden: true, turn: 1200 });
  s = walk(s, [1200 - DESKTOP_REVEAL_PX + 1]);
  assert.equal(s.hidden, true, '63px is not enough');
  s = walk(s, [1200 - DESKTOP_REVEAL_PX]);
  assert.equal(s.hidden, false);
});

test('desktop: never hidden within the header’s own height of the top', () => {
  const hidden = walk(initialDesktopHeader(0), [300, 900]);
  assert.equal(hidden.hidden, true);
  assert.equal(walk(hidden, [HEADER]).hidden, false);
  assert.equal(walk(initialDesktopHeader(0), [HEADER], { jumping: true }).hidden, false);
});

test('desktop: focus inside shows it; an anchor jump keeps it out of the way', () => {
  const hidden = walk(initialDesktopHeader(0), [300, 900]);
  assert.equal(walk(hidden, [880], { focusInside: true }).hidden, false);
  const shown = initialDesktopHeader(300);
  assert.equal(walk(shown, [302], { jumping: true }).hidden, true);
});

test('in-page jumps: same document with a fragment, root-relative or bare', () => {
  const home = { origin: 'https://abbystable.test', pathname: '/', search: '' };
  assert.equal(isInPageJump('/#private', home), true);
  assert.equal(isInPageJump('#private', home), true);
  assert.equal(isInPageJump('https://abbystable.test/#contact', home), true);
  assert.equal(isInPageJump('/menu#top', home), false);
  assert.equal(isInPageJump('#', home), false);
  assert.equal(isInPageJump('/', home), false);
  assert.equal(isInPageJump('https://elsewhere.test/#private', home), false);
  const menu = { origin: 'https://abbystable.test', pathname: '/menu', search: '?q=egusi' };
  assert.equal(isInPageJump('#results', menu), true);
  assert.equal(isInPageJump('/menu#results', menu), false, 'a different query is another document');
});

/* ---- The whole decision -------------------------------------------------------- */

const base = {
  desktop: false,
  autoHidesOnDesktop: true,
  desktopHidden: false,
  down: false,
  drawerOpen: false,
  focusInside: false,
};

test('mobile: hidden exactly while the page scrolls down — on every page', () => {
  assert.equal(isHeaderHidden({ ...base, down: true }), true);
  assert.equal(isHeaderHidden({ ...base, down: false }), false);
  // The desktop route list does not apply below 1024.
  assert.equal(isHeaderHidden({ ...base, down: true, autoHidesOnDesktop: false }), true);
});

test('mobile: never hidden under an open drawer or with focus inside', () => {
  assert.equal(isHeaderHidden({ ...base, down: true, drawerOpen: true }), false);
  assert.equal(isHeaderHidden({ ...base, down: true, focusInside: true }), false);
});

test('desktop: the hysteresis decides, on the opted-in routes only; direction is ignored', () => {
  const desktop = { ...base, desktop: true };
  assert.equal(isHeaderHidden({ ...desktop, desktopHidden: true }), true);
  assert.equal(isHeaderHidden({ ...desktop, desktopHidden: true, autoHidesOnDesktop: false }), false);
  assert.equal(isHeaderHidden({ ...desktop, down: true }), false);
  assert.equal(isHeaderHidden({ ...desktop, desktopHidden: true, focusInside: true }), false);
});

test('mobile header and purchase bar share one direction: 8px threshold, 120px floor', () => {
  // The header reads the bar's `nextDirection`; under the floor nothing hides.
  let direction = { lastY: 0, down: false };
  direction = nextDirection(direction, 110);
  assert.equal(isHeaderHidden({ ...base, down: direction.down }), false);
  direction = nextDirection(direction, 140);
  assert.equal(isHeaderHidden({ ...base, down: direction.down }), true);
  direction = nextDirection(direction, 134);
  assert.equal(isHeaderHidden({ ...base, down: direction.down }), true, 'under 8px: unchanged');
  direction = nextDirection(direction, 128);
  assert.equal(isHeaderHidden({ ...base, down: direction.down }), false, 'a counted move up');
});

/* ---- Current page ---------------------------------------------------------------- */

test('the current page is marked; a dish page sits inside Menu', () => {
  assert.equal(ariaCurrentFor('/menu', '/menu'), 'page');
  assert.equal(ariaCurrentFor('/menu/', '/menu'), 'page');
  assert.equal(ariaCurrentFor('/menu/egusi', '/menu'), 'true');
  assert.equal(ariaCurrentFor('/how-it-works', '/menu'), undefined);
  assert.equal(ariaCurrentFor('/our-story', '/our-story'), 'page');
  assert.equal(ariaCurrentFor('/contact', CONTACT_HREF), 'page');
  assert.equal(ariaCurrentFor('/menu-extra', '/menu'), undefined);
});

test('anchors and external links are never current; nor is anything on the homepage', () => {
  assert.equal(ariaCurrentFor('/', PRIVATE_TABLE_ITEM.href), undefined);
  assert.equal(ariaCurrentFor('/', CONTACT_HREF), undefined);
  assert.equal(ariaCurrentFor('/', 'https://www.instagram.com/fromabbystable'), undefined);
  for (const item of NAV_ITEMS) assert.equal(ariaCurrentFor('/', item.href), undefined, item.label);
  assert.equal(ariaCurrentFor(null, '/menu'), undefined);
});

test('My Account is current across the account area', () => {
  assert.equal(ariaCurrentFor('/account/orders', ACCOUNT_ITEM.href), 'page');
  assert.equal(ariaCurrentFor('/account/orders/AT-1', ACCOUNT_ITEM.href), 'true');
});

/* ---- Account slot and order pills ----------------------------------------------- */

test('"Log in" signed out, "My Account" signed in — label and destination', () => {
  assert.deepEqual(accountItem({ isSignedIn: false }), { label: 'Log in', href: '/login' });
  assert.equal(accountItem({ isSignedIn: false }), LOGIN_ITEM);
  assert.deepEqual(accountItem({ isSignedIn: true }), {
    label: 'My Account',
    href: '/account/orders',
  });
});

const cart = (over: Partial<{ hydrated: boolean; boxSize: number | null; dishCount: number }> = {}) => ({
  hydrated: true,
  boxSize: null,
  dishCount: 0,
  ...over,
});

test('GET STARTED to Choose Box until a box is active', () => {
  assert.deepEqual(headerOrderCta(cart()), { label: 'Get started', href: '/box', continuing: false });
  // Never active before the cart has hydrated: the first render always sells.
  assert.equal(headerOrderCta(cart({ hydrated: false, boxSize: 6, dishCount: 3 })).label, 'Get started');
});

test('VIEW BOX once committed or holding a dish — the bar’s rule and resume path', () => {
  assert.deepEqual(headerOrderCta(cart({ boxSize: 6 })), {
    label: 'View box',
    href: '/box/dishes',
    continuing: true,
  });
  // An EMPTY committed box is still active (design: "active" is never "has dishes").
  assert.equal(headerOrderCta(cart({ boxSize: 12, dishCount: 0 })).label, 'View box');
  // A dish carried from a dish page, no size yet: back to Step 1.
  assert.deepEqual(headerOrderCta(cart({ dishCount: 1 })), {
    label: 'View box',
    href: '/box',
    continuing: true,
  });
});

test('the drawer pill: BUILD A BOX, switching with the header to VIEW BOX', () => {
  assert.deepEqual(drawerOrderCta(cart()), { label: 'Build a Box', href: '/box', continuing: false });
  assert.deepEqual(drawerOrderCta(cart({ boxSize: 6 })), headerOrderCta(cart({ boxSize: 6 })));
});

/* ---- Navigation content ------------------------------------------------------------ */

test('the header links: the v2 five, in order — Gifting only once its page exists', () => {
  const expected = ['Menu', 'How it works', 'Abby’s Story', 'Gifting', 'Private Table'].filter(
    (label) => GIFTING_LIVE || label !== 'Gifting',
  );
  assert.deepEqual(
    NAV_ITEMS.map((item) => item.label),
    expected,
  );
  assert.equal(NAV_ITEMS.includes(GIFTING_ITEM), GIFTING_LIVE);
});

test('no chrome link 404s or points at an anchor the v2 homepage drops', () => {
  const BUILT = new Set(['/menu', '/how-it-works', '/our-story', '/standards', '/contact', '/delivery-and-faqs', '/allergens', '/privacy', '/terms-of-sale', '/box', '/login', '/account/orders']);
  // The v2 homepage keeps Private Table (#private) until #25.
  const ANCHORS = new Set(['/#private']);
  const links = [...NAV_ITEMS, ...FOOTER_COLUMNS.flatMap((column) => column.links)];
  for (const link of links) {
    assert.ok(BUILT.has(link.href) || ANCHORS.has(link.href), `${link.label} → ${link.href}`);
  }
  assert.ok(!links.some((link) => link.href === '/#gifting'), '#gifting is gone from the v2 homepage');
});

test('the footer columns: Shop / Learn / Information, without Discovery Box or Journal', () => {
  assert.deepEqual(
    FOOTER_COLUMNS.map((column) => [column.heading, column.links.map((link) => link.label)]),
    [
      ['Shop', GIFTING_LIVE ? ['Menu', 'Gifting', 'Private Table'] : ['Menu', 'Private Table']],
      ['Learn', ['Abby’s Story', 'How it works', 'Our standards']],
      ['Information', ['Delivery & FAQs', 'Allergens', 'Contact us']],
    ],
  );
});

test('the social links are the design’s accounts; the handle is text, not a fifth link', () => {
  assert.deepEqual(
    SOCIAL_LINKS.map((link) => link.href),
    [
      'https://www.instagram.com/fromabbystable',
      'https://www.tiktok.com/@fromabbystable',
      'https://www.facebook.com/fromabbystable/',
      'https://x.com/fromabbystable',
    ],
  );
  assert.equal(SOCIAL_HANDLE, '@FromAbbysTable');
});

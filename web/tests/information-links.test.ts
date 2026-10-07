import './support/runtime';

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  ALLERGENS_ITEM,
  CHECKOUT_FOOTER_LINKS,
  CONTACT_HREF,
  CONTACT_ITEM,
  DELIVERY_FAQS_HREF,
  DELIVERY_FAQS_ITEM,
  FOOTER_COLUMNS,
  PRIVACY_ITEM,
  STATUS_FOOTER_LINKS,
  TERMS_ITEM,
} from '../src/lib/content/navigation';

/*
 * Information links on real routes (site-chrome spec FR-21, issue #8).
 *
 * Every link to Contact and Delivery & FAQs reads ONE constant each in
 * `src/lib/content/navigation.ts`: `CONTACT_HREF` (`/contact`, built in #24 —
 * the site footer, `/#contact`, before it) and `DELIVERY_FAQS_HREF` (Contact's
 * destination until its own page, #23). Building a page is then a one-line
 * change there — and these tests fail until that line is changed, so a built
 * page is never left behind its placeholder, nor a placeholder brought back.
 */

/** Contact's interim destination before #24: the site footer. */
const FOOTER_ANCHOR = '/#contact';

// `.test-dist/tests` → `web`
const WEB_ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(WEB_ROOT, 'src');
const NAVIGATION = path.join('lib', 'content', 'navigation.ts');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css|mjs|js)$/.test(name) ? [full] : [];
  });
}

const read = (relative: string) => readFileSync(path.join(SRC, relative), 'utf8');

/** Every page route under `src/app`, as a URL path: route groups `(name)` are not part of it. */
function appRoutes(): Set<string> {
  const app = path.join(SRC, 'app');
  const routes = new Set<string>();
  for (const file of sourceFiles(app)) {
    if (path.basename(file) !== 'page.tsx') continue;
    const segments = path
      .relative(app, path.dirname(file))
      .split(path.sep)
      .filter((segment) => segment && !/^\(.*\)$/.test(segment));
    routes.add(`/${segments.join('/')}`);
  }
  return routes;
}

const ROUTES = appRoutes();

const filesContaining = (needle: string) =>
  sourceFiles(SRC)
    .filter((file) => readFileSync(file, 'utf8').includes(needle))
    .map((file) => path.relative(SRC, file));

test('no `/#contact` outside CONTACT_HREF (FR-21: the swap is one line)', () => {
  if (ROUTES.has('/contact')) {
    // FR-21's scenario: once /contact is built, a search of web/src finds nothing.
    assert.deepEqual(filesContaining(FOOTER_ANCHOR), []);
    return;
  }
  assert.deepEqual(filesContaining(FOOTER_ANCHOR), [NAVIGATION]);
  // …where it is written exactly once: CONTACT_HREF's value.
  assert.equal(read(NAVIGATION).match(/'\/#contact'/g)?.length, 1);
  assert.match(read(NAVIGATION), /export const CONTACT_HREF: string = '\/#contact';/);
});

test('Contact and Delivery & FAQs point at their page once it exists, never at a 404 before', () => {
  if (ROUTES.has('/contact')) {
    assert.equal(CONTACT_HREF, '/contact', '/contact is built: swap CONTACT_HREF in navigation.ts');
  } else {
    assert.equal(CONTACT_HREF, FOOTER_ANCHOR, 'Contact must not link to /contact before it is built');
  }
  if (ROUTES.has('/delivery-and-faqs')) {
    assert.equal(DELIVERY_FAQS_HREF, '/delivery-and-faqs', '/delivery-and-faqs is built: swap DELIVERY_FAQS_HREF');
  } else {
    // Until its own page, Contact's destination (FR-21).
    assert.equal(DELIVERY_FAQS_HREF, CONTACT_HREF, 'Delivery & FAQs must not link to /delivery-and-faqs before it is built');
  }
});

test('the footer carries id="contact" only while Contact resolves to it', () => {
  const footer = read(path.join('components', 'layout', 'Footer.tsx'));
  if (CONTACT_HREF === FOOTER_ANCHOR) {
    assert.match(footer, /<footer id="contact"/);
  } else {
    // Nothing jumps there any more: a stale anchor would invite a new link to it.
    assert.doesNotMatch(footer, /id="contact"/);
  }
});

test('Contact is built, so nothing links to its old stand-in (#24)', () => {
  assert.ok(ROUTES.has('/contact'), 'app/(site)/contact/page.tsx');
  assert.equal(CONTACT_HREF, '/contact');
  // The Contact page never links to itself: its FAQs card waits for #23.
  const page = read(path.join('app', '(site)', 'contact', 'page.tsx'));
  assert.match(page, /from '@\/lib\/content\/navigation'/);
  assert.match(page, /faqsHref=\{DELIVERY_FAQS_HREF === CONTACT_HREF \? null : DELIVERY_FAQS_HREF\}/);
  assert.doesNotMatch(page, /'\/(delivery-and-faqs|contact)'/);
});

test('the chrome lists read the shared items, so they follow the constants', () => {
  assert.equal(CONTACT_ITEM.href, CONTACT_HREF);
  assert.equal(DELIVERY_FAQS_ITEM.href, DELIVERY_FAQS_HREF);
  assert.equal(ALLERGENS_ITEM.href, '/allergens');

  // The checkout footer: the design's five, in its order and labels — "Contact
  // us" in sentence case, as Checkout v2 and Review v2 set it.
  const checkout = [DELIVERY_FAQS_ITEM, ALLERGENS_ITEM, CONTACT_ITEM, PRIVACY_ITEM, TERMS_ITEM];
  assert.equal(CHECKOUT_FOOTER_LINKS.length, checkout.length);
  // The very same objects (strict equality), not look-alikes with their own hrefs.
  checkout.forEach((item, index) => assert.equal(CHECKOUT_FOOTER_LINKS[index], item, item.label));
  assert.deepEqual(
    CHECKOUT_FOOTER_LINKS.map((link) => link.label),
    ['Delivery & FAQs', 'Allergens', 'Contact us', 'Privacy Policy', 'Terms'],
  );

  // The site footer's Information column and the 500 page's footer.
  const information = FOOTER_COLUMNS.find((column) => column.heading === 'Information');
  assert.ok(information);
  assert.equal(information.links[0], DELIVERY_FAQS_ITEM);
  assert.equal(information.links[1], ALLERGENS_ITEM);
  assert.equal(information.links[2], CONTACT_ITEM);
  assert.equal(STATUS_FOOTER_LINKS[0], DELIVERY_FAQS_ITEM);
  assert.equal(STATUS_FOOTER_LINKS[1], CONTACT_ITEM);
});

test('every information link lands on a built page (or, before #24, the footer anchor)', () => {
  const information = FOOTER_COLUMNS.find((column) => column.heading === 'Information')?.links ?? [];
  for (const link of [...CHECKOUT_FOOTER_LINKS, ...STATUS_FOOTER_LINKS, ...information]) {
    assert.ok(ROUTES.has(link.href) || link.href === FOOTER_ANCHOR, `${link.label} → ${link.href}`);
  }
  for (const route of ['/allergens', '/privacy', '/terms-of-sale']) assert.ok(ROUTES.has(route), route);
});

/*
 * The links written into pages, file by file. Contact and Delivery & FAQs share
 * one value today, so only the source can say WHICH one a link means; each
 * must read the semantically right constant, never a literal.
 */
const IN_PAGE_LINKS: Array<{ file: string; contact: number; faqs: number; why: string }> = [
  { file: 'components/auth/LoginForm.tsx', contact: 1, faqs: 0, why: '"Forgotten it?" (open question 10)' },
  {
    file: 'components/dish/DishInfoPanels.tsx',
    contact: 1,
    faqs: 0,
    why: 'the allergen fallback says "please contact us" — a person, not /allergens',
  },
  { file: 'app/(checkout)/layout.tsx', contact: 1, faqs: 0, why: '"Questions about your order? Contact us"' },
  {
    file: 'app/(checkout)/box/confirmation/page.tsx',
    contact: 2,
    faqs: 0,
    why: '"Contact us" and "Questions about your order?"',
  },
  { file: 'app/(site)/account/orders/[orderId]/page.tsx', contact: 1, faqs: 0, why: '"Questions about this order?"' },
  {
    file: 'app/(site)/allergens/page.tsx',
    contact: 2,
    faqs: 1,
    why: 'two "contact us", and "Browse our FAQs" (Delivery & FAQs, as in the design)',
  },
];

test('each in-page information link reads the right constant', () => {
  for (const { file, contact, faqs, why } of IN_PAGE_LINKS) {
    const source = read(file);
    assert.equal(source.match(/href=\{CONTACT_HREF\}/g)?.length ?? 0, contact, `${file}: ${why}`);
    assert.equal(source.match(/href=\{DELIVERY_FAQS_HREF\}/g)?.length ?? 0, faqs, `${file}: ${why}`);
    assert.match(source, /from '@\/lib\/content\/navigation'/, file);
    // No local stand-in for the shared constants (the Allergens page had one).
    assert.doesNotMatch(source, /const (CONTACT_HREF|FAQS_HREF|DELIVERY_FAQS_HREF)\s*=/, file);
  }
  // The checkout footer is the shared list, opened in the same tab (FR-22).
  const layout = read('app/(checkout)/layout.tsx');
  assert.match(layout, /CHECKOUT_FOOTER_LINKS\.map/);
  assert.doesNotMatch(layout, /target=/);
});

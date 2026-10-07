import './support/runtime';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COOKIE_PREFERENCES_ITEM,
  PRIVACY_COOKIES_HREF,
  PRIVACY_ITEM,
  STATUS_FOOTER_LINKS,
  TERMS_ITEM,
} from '../src/lib/content/navigation';
import {
  groupIndexOf,
  groupRange,
  resolveLegalAnchor,
  sectionsOf,
  type LegalDocument,
} from '../src/lib/legal/document';
import { fragmentUrl, linkTarget, type LocationLike } from '../src/lib/legal/history';
import { PRIVACY_COOKIES_SLUG, PRIVACY_POLICY } from '../src/lib/legal/privacy';
import { TERMS_OF_SALE } from '../src/lib/legal/terms';

/*
 * The legal documents' anchors are a PUBLIC CONTRACT: FAQ answers, emails,
 * checkout and confirmation link to them (design/build-handoff.md, "Terms of
 * Sale — the document architecture"). These lists are the published slugs,
 * verbatim from the design. A failure here means a link in the wild just
 * broke — add a new slug for new content, never rename an old one.
 */
const TERMS_SLUGS = [
  'about-abbys-table',
  'what-these-terms-cover',
  'our-food',
  'food-standards',
  'choosing-your-order',
  'minimum-orders-boxes',
  'cooking-runs-availability',
  'how-a-contract-is-formed',
  'when-we-may-decline-an-order',
  'prices',
  'obvious-pricing-errors',
  'payment',
  'where-we-deliver',
  'delivery-dates-time-windows',
  'delivery-information-you-provide',
  'receiving-chilled-deliveries',
  'failed-delivery',
  'delays-and-events-outside-our-control',
  'ingredients-recipe-changes',
  'allergen-information',
  'cross-contact-severe-allergies',
  'dietary-descriptions',
  'nutrition-information',
  'portion-choices',
  'changing-an-order',
  'cancelling-before-cutoff',
  'perishable-food-and-cancellation-rights',
  'requests-after-cutoff',
  'if-we-cancel-an-accepted-order',
  'refunds',
  'checking-your-order',
  'storage-use-by-information',
  'freezing-defrosting',
  'reheating',
  'product-recalls-food-safety-notices',
  'reporting-a-problem',
  'perishable-food-complaints',
  'returns-food',
  'complaints-procedure',
  'gifting-food',
  'gift-cards-vouchers',
  'promotions-discount-codes',
  'account-credits',
  'customer-accounts',
  'private-table-waitlist',
  'our-responsibility-to-you',
  'liability-we-cannot-exclude',
  'personal-information',
  'images-you-upload',
  'changes-to-these-terms',
  'severability',
  'delay-in-enforcing-a-right',
  'transferring-rights-obligations',
  'third-party-rights',
  'governing-law-jurisdiction',
  'how-to-contact-us',
] as const;

const PRIVACY_SLUGS = [
  'who-we-are',
  'what-information-we-collect',
  'how-and-why-we-use-your-information',
  'allergies-sensitive-information',
  'who-we-share-information-with',
  'marketing-and-private-table',
  'cookies',
  'how-long-we-keep-your-information',
  'your-rights',
  'security-and-international-transfers',
  'questions-and-complaints',
] as const;

const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function groupBounds(doc: LegalDocument) {
  return doc.groups.map((group) => [group.sections[0].n, group.sections[group.sections.length - 1].n]);
}

function assertWellFormed(doc: LegalDocument, slugs: readonly string[]) {
  const sections = sectionsOf(doc);
  // Stable: exactly the published slugs, in document order.
  assert.deepEqual(
    sections.map((section) => section.slug),
    [...slugs],
  );
  // Unique, and URL-safe without escaping.
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) assert.match(slug, SLUG_SHAPE);
  // Numbered 1…N, contiguous, in order — presentation, but the legacy resolver relies on it.
  assert.deepEqual(
    sections.map((section) => section.n),
    sections.map((_, index) => index + 1),
  );
  for (const section of sections) assert.ok(section.title.trim().length > 0);
}

test('Terms of Sale: 56 clauses in 8 groups, with the published slugs', () => {
  assertWellFormed(TERMS_OF_SALE, TERMS_SLUGS);
  assert.equal(sectionsOf(TERMS_OF_SALE).length, 56);
  assert.deepEqual(
    TERMS_OF_SALE.groups.map((group) => group.title),
    [
      'Ordering',
      'Delivery',
      'Food & allergens',
      'Changes, cancellations & refunds',
      'After delivery',
      'Problems & complaints',
      'Gifting & accounts',
      'Legal',
    ],
  );
  // The design's GROUPS ranges.
  assert.deepEqual(groupBounds(TERMS_OF_SALE), [
    [1, 12],
    [13, 18],
    [19, 24],
    [25, 30],
    [31, 35],
    [36, 39],
    [40, 45],
    [46, 56],
  ]);
});

test('Privacy Policy: 11 sections in 4 groups, with the published slugs', () => {
  assertWellFormed(PRIVACY_POLICY, PRIVACY_SLUGS);
  assert.deepEqual(
    PRIVACY_POLICY.groups.map((group) => group.title),
    ['Your privacy', 'How we use your information', 'Keeping your information', 'Need help?'],
  );
  assert.deepEqual(groupBounds(PRIVACY_POLICY), [
    [1, 3],
    [4, 7],
    [8, 10],
    [11, 11],
  ]);
});

test('#cookies is committed: section 7, and every cookie-preferences fallback lands on it', () => {
  assert.equal(PRIVACY_COOKIES_SLUG, 'cookies');
  assert.equal(resolveLegalAnchor(PRIVACY_POLICY, '#cookies')?.section.n, 7);
  assert.equal(PRIVACY_COOKIES_HREF, '/privacy#cookies');
  assert.equal(COOKIE_PREFERENCES_ITEM.href, '/privacy#cookies');
});

test('every legacy #sN and #N anchor resolves to its clause', () => {
  for (const doc of [TERMS_OF_SALE, PRIVACY_POLICY]) {
    for (const section of sectionsOf(doc)) {
      for (const legacy of [`s${section.n}`, `${section.n}`, `#s${section.n}`, `#${section.n}`]) {
        const resolved = resolveLegalAnchor(doc, legacy);
        assert.equal(resolved?.section.slug, section.slug, legacy);
        assert.equal(resolved?.legacy, true, legacy);
      }
    }
  }
  // The examples the handoff names.
  assert.equal(resolveLegalAnchor(TERMS_OF_SALE, '#s30')?.section.slug, 'refunds');
  assert.equal(resolveLegalAnchor(TERMS_OF_SALE, '#30')?.section.slug, 'refunds');
  assert.equal(resolveLegalAnchor(PRIVACY_POLICY, '#s7')?.section.slug, 'cookies');
});

test('a slug resolves to itself, and is not legacy', () => {
  for (const doc of [TERMS_OF_SALE, PRIVACY_POLICY]) {
    for (const section of sectionsOf(doc)) {
      const resolved = resolveLegalAnchor(doc, `#${section.slug}`);
      assert.equal(resolved?.section, section);
      assert.equal(resolved?.legacy, false);
    }
  }
});

test('anything else resolves to nothing', () => {
  for (const hash of ['', '#', 's57', '#57', '0', 's0', '#s', 'S30', 's030', 's 30', 'refund', 'top', '#legal-index']) {
    assert.equal(resolveLegalAnchor(TERMS_OF_SALE, hash), null, hash);
  }
  assert.equal(resolveLegalAnchor(PRIVACY_POLICY, '#s12'), null);
  assert.equal(resolveLegalAnchor(PRIVACY_POLICY, '#refunds'), null);
  // A malformed escape is simply not one of ours.
  assert.equal(resolveLegalAnchor(TERMS_OF_SALE, '#%E0%A4%A'), null);
});

test('group rows print their range; a section maps to its group', () => {
  assert.equal(groupRange(TERMS_OF_SALE.groups[0]), '1–12');
  assert.equal(groupRange(PRIVACY_POLICY.groups[3]), '11');
  assert.equal(groupIndexOf(TERMS_OF_SALE, 30), 3);
  assert.equal(groupIndexOf(TERMS_OF_SALE, 56), 7);
  assert.equal(groupIndexOf(PRIVACY_POLICY, 7), 1);
});

test('Privacy Policy and Terms links point at their pages (the legal half of #8)', () => {
  assert.equal(PRIVACY_ITEM.href, '/privacy');
  assert.equal(TERMS_ITEM.href, '/terms-of-sale');
  assert.ok(STATUS_FOOTER_LINKS.includes(PRIVACY_ITEM));
  assert.ok(STATUS_FOOTER_LINKS.includes(TERMS_ITEM));
});

/* ---- The URL rules (src/lib/legal/history.ts) --------------------------------- */

const at = (pathname: string, hash = '', search = ''): LocationLike => ({
  origin: 'https://abbystable.test',
  pathname,
  search,
  hash,
});

test('the reading position is written under the document\'s own path only', () => {
  assert.equal(fragmentUrl(at('/terms-of-sale'), '/terms-of-sale', 'refunds'), '/terms-of-sale#refunds');
  assert.equal(fragmentUrl(at('/terms-of-sale', '#refunds'), '/terms-of-sale', null), '/terms-of-sale');
  assert.equal(fragmentUrl(at('/privacy', '', '?from=checkout'), '/privacy', 'cookies'), '/privacy?from=checkout#cookies');
});

test('nothing is written once the reader has left the document', () => {
  // Next pushes the next page's URL before the legal page unmounts; a write
  // then would strip the destination's fragment (/#standards → /).
  assert.equal(fragmentUrl(at('/', '#standards'), '/terms-of-sale', null), null);
  assert.equal(fragmentUrl(at('/', '#standards'), '/terms-of-sale', 'refunds'), null);
  assert.equal(fragmentUrl(at('/privacy', '#cookies'), '/terms-of-sale', null), null);
});

test('nothing is written when the URL already says so', () => {
  assert.equal(fragmentUrl(at('/terms-of-sale', '#refunds'), '/terms-of-sale', 'refunds'), null);
  assert.equal(fragmentUrl(at('/terms-of-sale'), '/terms-of-sale', null), null);
  assert.equal(fragmentUrl(at('/terms-of-sale', '#'), '/terms-of-sale', null), null);
});

test('a link counts as this document\'s only on its own origin, path and query', () => {
  const here = at('/privacy', '#who-we-are');
  const slugOf = (href: string) => {
    const target = linkTarget(PRIVACY_POLICY, href, here, 'top');
    return target && target !== 'top' ? target.slug : target;
  };
  assert.equal(linkTarget(PRIVACY_POLICY, '#cookies', here, 'top'), sectionsOf(PRIVACY_POLICY)[6]);
  assert.equal(slugOf('/privacy#cookies'), 'cookies');
  assert.equal(slugOf('https://abbystable.test/privacy#s7'), 'cookies');
  assert.equal(linkTarget(PRIVACY_POLICY, '#top', here, 'top'), 'top');
  // Elsewhere, or not a section.
  assert.equal(linkTarget(PRIVACY_POLICY, '/terms-of-sale#refunds', here, 'top'), null);
  assert.equal(linkTarget(PRIVACY_POLICY, '/#standards', here, 'top'), null);
  assert.equal(linkTarget(PRIVACY_POLICY, '/privacy?x=1#cookies', here, 'top'), null);
  assert.equal(linkTarget(PRIVACY_POLICY, 'https://elsewhere.test/privacy#cookies', here, 'top'), null);
  assert.equal(linkTarget(PRIVACY_POLICY, '/privacy', here, 'top'), null);
  assert.equal(linkTarget(PRIVACY_POLICY, '#legal-index', here, 'top'), null);
});

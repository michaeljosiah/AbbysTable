import './support/runtime';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test, { before } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import PrivacyPolicyPage from '../src/app/(site)/privacy/page';
import TermsOfSalePage from '../src/app/(site)/terms-of-sale/page';
import { COMPANY } from '../src/lib/content/company';
import { PRIVATE_TABLE_ITEM } from '../src/lib/content/navigation';
import { sectionsOf, type LegalDocument } from '../src/lib/legal/document';
import { PRIVACY_POLICY } from '../src/lib/legal/privacy';
import { TERMS_OF_SALE } from '../src/lib/legal/terms';

/*
 * The two pages as the server renders them — what a reader without
 * JavaScript, a printer, browser Find and a search engine all get.
 */

let terms = '';
let privacy = '';
before(async () => {
  terms = renderToStaticMarkup(await TermsOfSalePage());
  privacy = renderToStaticMarkup(await PrivacyPolicyPage());
});

const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

function assertOneContinuousDocument(html: string, doc: LegalDocument) {
  const sections = sectionsOf(doc);
  // Every section is in the page, once, in order, under its slug.
  const ids = [...html.matchAll(/<div id="([a-z0-9-]+)" class="docSection"/g)].map((match) => match[1]);
  assert.deepEqual(
    ids,
    sections.map((section) => section.slug),
  );
  // Heading outline: one h1, a h2 per group, a h3 per section.
  assert.equal(count(html, /<h1[ >]/g), 1);
  assert.match(html, /<h1 id="top"/);
  assert.ok(count(html, /<h2[ >]/g) >= doc.groups.length);
  for (const section of sections) {
    assert.ok(html.includes(`<a class="jump" href="#${section.slug}" data-n="${section.n}">`), section.slug);
  }
  // The index is one nav, before the document.
  assert.equal(count(html, /<nav id="legal-index"/g), 1);
  assert.ok(html.indexOf('id="legal-index"') < html.indexOf(`id="${sections[0].slug}"`));
}

test('Terms of Sale renders all 56 clauses as one continuous document', () => {
  assertOneContinuousDocument(terms, TERMS_OF_SALE);
  assert.equal(count(terms, /<a href="#top" class="backToTop">/g), 56);
  assert.match(terms, /Nothing in these terms affects your statutory rights as a consumer\./);
  // Cross-references are real fragment links, so they work without JavaScript.
  assert.match(terms, /<a href="#refunds" class="link">section 30 — Refunds<\/a>/);
  assert.match(terms, /<a href="#gifting-food" class="link">section 40<\/a>/);
});

test('Privacy Policy renders its 11 sections and the closing section', () => {
  assertOneContinuousDocument(privacy, PRIVACY_POLICY);
  assert.equal(count(privacy, /<a href="#top" class="backToTop">/g), 12);
  assert.match(privacy, /About this policy<\/h2>/);
  assert.match(privacy, /Changes to this Privacy Policy/);
  // Cross-references use the slug anchors.
  assert.match(privacy, /<a href="#allergies-sensitive-information" class="link">section 4<\/a>/);
  assert.match(privacy, /<a href="#cookies" class="link">section 7<\/a>/);
});

test('section 7 carries the committed #cookies anchor and the consent trigger', () => {
  const cookies = privacy.slice(privacy.indexOf('<div id="cookies"'), privacy.indexOf('<div id="how-long-we-keep'));
  // The in-page trigger is a button bound only by `data-consent-open`, hidden until the manager is
  // ready, and a disclosure for the consent panel (the manager keeps `aria-expanded` in step).
  assert.match(
    cookies,
    /<div class="prefs">[\s\S]*<button type="button" class="cta" data-consent-open="true" aria-controls="consent-panel" aria-expanded="false">/,
  );
  assert.match(cookies, /Cookie preferences/);
});

test('the cookie table is a "not yet published" panel, not a table of placeholders', () => {
  assert.match(privacy, /<div class="audit"><p class="auditTitle">This list is not yet published<\/p>/);
  assert.doesNotMatch(privacy, /<table/);
});

test('the 21 "to be confirmed" items stay visible', () => {
  // 18 values written into the copy when confirmed, the named payment provider
  // in two places (configuration), and the unpublished cookie list = 21.
  assert.equal(count(privacy, /data-tbc="copy"/g), 18);
  const providerMarks = COMPANY.paymentProvider ? 0 : 2;
  const payments = privacy.slice(privacy.indexOf('<div id="who-we-share'), privacy.indexOf('<div id="marketing-and'));
  assert.equal(count(payments, /data-tbc="config"/g), providerMarks);
  assert.equal(18 + providerMarks + count(privacy, /This list is not yet published/g), 21);
});

test('company details never come from the design placeholders', () => {
  // Every one of these is a placeholder in the designs (build-handoff.md, open
  // items). They may only appear once configured — and none is configured.
  const placeholders = [
    /Example (?:Street|Town|Foods)/,
    /Abby(?:'|’|&#x27;)s Table Foods/,
    /12345678/,
    /AB1 2CD/,
    /EX1 2YZ/,
    /FromAbbysTable\.co\.uk/i,
    /3875 1234/,
    /442038751234/,
    /Stripe/,
  ];
  for (const html of [terms, privacy]) {
    for (const placeholder of placeholders) assert.doesNotMatch(html, placeholder);
  }
});

test('unset company details print as "to be confirmed", in both documents', () => {
  assert.equal(COMPANY.legalName, null);
  assert.equal(COMPANY.companyNumber, null);
  assert.equal(COMPANY.registeredOffice, null);
  for (const html of [terms, privacy]) {
    assert.match(html, /a trading name of <span class="tbc" data-tbc="config">company name to be confirmed<\/span>/);
  }
  // Terms clause 1's registered-details panel.
  const clause1 = terms.slice(terms.indexOf('<div id="about-abbys-table"'), terms.indexOf('<div id="what-these-terms-cover"'));
  assert.equal(count(clause1, /data-tbc="config"/g), 5);
  // Terms clause 12 names no provider until one is configured.
  const clause12 = terms.slice(terms.indexOf('<div id="payment"'), terms.indexOf('<div id="where-we-deliver"'));
  assert.match(
    clause12,
    /a third-party payment provider such as \(<span class="tbc" data-tbc="config">provider name to be confirmed<\/span>\)\./,
  );
});

test('internal links route through the site, the ICO opens in a new tab', () => {
  assert.match(privacy, /accepting our <a class="link" href="\/terms-of-sale">Terms<\/a>/);
  assert.match(privacy, /<a href="https:\/\/ico\.org\.uk" class="cta" target="_blank" rel="noopener noreferrer">/);
  // No link is left on a design-file path.
  for (const html of [terms, privacy]) assert.doesNotMatch(html, /\.dc\.html/);
});

test('the Private Table waitlist clause links the chrome’s one Private Table destination', () => {
  const clause = terms.slice(
    terms.indexOf('<div id="private-table-waitlist"'),
    terms.indexOf('class="docSection"', terms.indexOf('<div id="private-table-waitlist"') + 40),
  );
  assert.match(clause, new RegExp(`<a class="link" href="${PRIVATE_TABLE_ITEM.href}">Private Table</a> waitlist`));
  // Read from navigation.ts, never a local stand-in: #25's swap to /private-table is one line there.
  const source = readFileSync(path.resolve(__dirname, '..', '..', 'src/app/(site)/terms-of-sale/clauses.tsx'), 'utf8');
  assert.match(source, /href=\{PRIVATE_TABLE_ITEM\.href\}/);
  assert.doesNotMatch(source, /\/#private|PRIVATE_TABLE_HREF/);
});

test('the index has no controls until they can work', () => {
  for (const html of [terms, privacy]) {
    // Server-rendered (and so without JavaScript) the group rows are labels,
    // not buttons with no handler behind them.
    const nav = html.slice(html.indexOf('<nav id="legal-index"'), html.indexOf('</nav>'));
    assert.doesNotMatch(nav, /<button/);
    assert.match(nav, /<div class="groupToggle">/);
    // And the no-script treatment drops the "Jump to a section" toggle while
    // showing every section link.
    assert.match(html, /<noscript><style>\.navhead\{display:none\}\.nav,\.groupList,\.navTitle\{display:block\}/);
  }
});

test('the sheet frame is not a dialog until it is a sheet', () => {
  for (const html of [terms, privacy]) {
    assert.match(html, /<div class="indexPanel"><nav id="legal-index"/);
    assert.doesNotMatch(html, /role="dialog"/);
  }
});

test('print removes the site chrome on these two pages only', () => {
  for (const html of [terms, privacy]) {
    assert.match(html, /<style media="print">body&gt;:not\(main\)|<style media="print">body>:not\(main\)/);
  }
});

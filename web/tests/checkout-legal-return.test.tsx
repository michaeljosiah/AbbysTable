import './support/runtime';

import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { renderToStaticMarkup } from 'react-dom/server';

import PrivacyPolicyPage from '../src/app/(site)/privacy/page';
import TermsOfSalePage from '../src/app/(site)/terms-of-sale/page';
import { CHECKOUT_FOOTER_LINKS, PRIVACY_COOKIES_HREF, PRIVACY_ITEM, TERMS_ITEM } from '../src/lib/content/navigation';
import {
  CHECKOUT_LEGAL_LINK,
  CHECKOUT_STILL_OPEN,
  checkoutLegalHref,
  checkoutReturnGateScript,
  documentQuery,
  isFromCheckout,
  NEW_TAB_NOTE,
  reachableCheckout,
  type OpenerLike,
} from '../src/lib/legal/checkoutReturn';
import { fragmentUrl, linkTarget, type LocationLike } from '../src/lib/legal/history';
import { PRIVACY_POLICY } from '../src/lib/legal/privacy';

/*
 * Legal links from checkout (site-chrome spec FR-22; design/SHOPPING-STATE.md
 * §40). The legal line itself belongs to Checkout v2, which is not built yet
 * (#31 wires `checkoutLegalHref`); the legal pages' end is built.
 */

const ORIGIN = 'https://abbystable.test';

/* ---- Checkout's legal line ------------------------------------------------------ */

test('the legal line links carry checkout\'s origin marker, before any fragment', () => {
  assert.equal(checkoutLegalHref(TERMS_ITEM.href), '/terms-of-sale?from=checkout');
  assert.equal(checkoutLegalHref(PRIVACY_ITEM.href), '/privacy?from=checkout');
  assert.equal(checkoutLegalHref(PRIVACY_COOKIES_HREF), '/privacy?from=checkout#cookies');
  assert.equal(checkoutLegalHref('/privacy?x=1#cookies'), '/privacy?x=1&from=checkout#cookies');
  // Already marked: unchanged.
  assert.equal(checkoutLegalHref('/privacy?from=checkout#cookies'), '/privacy?from=checkout#cookies');
});

test('the legal line opens a new tab that can find checkout again, and says so', () => {
  assert.deepEqual(CHECKOUT_LEGAL_LINK, { target: '_blank', rel: 'opener' });
  assert.equal(NEW_TAB_NOTE, ' (opens in a new tab)');
});

test('the checkout footer\'s legal links stay same-tab, with no marker', () => {
  for (const link of CHECKOUT_FOOTER_LINKS) assert.equal(isFromCheckout(new URL(link.href, ORIGIN).search), false, link.label);
});

/* ---- The marker ------------------------------------------------------------------ */

const SEARCH_CASES: Array<[string, boolean]> = [
  ['?from=checkout', true],
  ['?x=1&from=checkout', true],
  ['from=checkout', true],
  ['', false],
  ['?', false],
  ['?from=', false],
  ['?from=Checkout', false],
  ['?from=checkout2', false],
  ['?from=footer', false],
  ['?source=checkout', false],
];

test('isFromCheckout reads only ?from=checkout', () => {
  for (const [search, expected] of SEARCH_CASES) assert.equal(isFromCheckout(search), expected, search);
});

function runGate(search: string) {
  // The server renders the control hidden; the script may only reveal it.
  const element = { hidden: true };
  vm.runInNewContext(checkoutReturnGateScript('gate'), {
    window: { location: { search } },
    document: { getElementById: (id: string) => (id === 'gate' ? element : null) },
    URLSearchParams,
  });
  return element;
}

test('the inline gate script makes exactly the same decision as isFromCheckout', () => {
  for (const [search, expected] of SEARCH_CASES) assert.equal(runGate(search).hidden, !expected, search);
});

test('the gate script leaves the control hidden when anything throws', () => {
  const element = { hidden: true };
  vm.runInNewContext(checkoutReturnGateScript('gate'), {
    window: {
      get location(): never {
        throw new Error('SecurityError');
      },
    },
    document: { getElementById: () => element },
    URLSearchParams,
  });
  assert.equal(element.hidden, true);
});

test('no value can close the inline script element', () => {
  assert.equal(checkoutReturnGateScript('a</script><script>alert(1)//').includes('<'), false);
});

/* ---- The marker survives the legal pages' own URL handling ---------------------- */

const at = (pathname: string, hash = '', search = ''): LocationLike => ({ origin: ORIGIN, pathname, search, hash });

test('reading and section jumps keep the marker in the URL', () => {
  assert.equal(fragmentUrl(at('/terms-of-sale', '', '?from=checkout'), '/terms-of-sale', 'refunds'), '/terms-of-sale?from=checkout#refunds');
  assert.equal(fragmentUrl(at('/terms-of-sale', '#refunds', '?from=checkout'), '/terms-of-sale', null), '/terms-of-sale?from=checkout');
});

test('the marker is not part of the document\'s address', () => {
  assert.equal(documentQuery('?from=checkout'), '');
  assert.equal(documentQuery('?x=1&from=checkout'), '?x=1');
  assert.equal(documentQuery('?from=footer'), '?from=footer');
  assert.equal(documentQuery(''), '');

  // On /privacy?from=checkout, links to the bare document are jumps within it —
  // so the URL keeps the marker and the page keeps "Back to checkout".
  const here = at('/privacy', '', '?from=checkout');
  assert.equal(linkTarget(PRIVACY_POLICY, '/privacy', here, 'top'), 'top');
  const cookies = linkTarget(PRIVACY_POLICY, '/privacy#cookies', here, 'top');
  assert.ok(cookies && cookies !== 'top' && cookies.slug === 'cookies');
  const relative = linkTarget(PRIVACY_POLICY, '#cookies', here, 'top');
  assert.ok(relative && relative !== 'top' && relative.slug === 'cookies');
  // Another document, or another query, is still somewhere else.
  assert.equal(linkTarget(PRIVACY_POLICY, '/terms-of-sale', here, 'top'), null);
  assert.equal(linkTarget(PRIVACY_POLICY, '/privacy?x=1#cookies', here, 'top'), null);
});

/* ---- Back to checkout -------------------------------------------------------------- */

function opener(pathname: string, { origin = ORIGIN, closed = false } = {}): OpenerLike {
  return { closed, location: { origin, pathname }, focus() {} };
}

test('only a live checkout tab on this origin is focused; anything else is no switch', () => {
  const checkout = opener('/box/review');
  assert.equal(reachableCheckout(checkout, ORIGIN), checkout);
  const builder = opener('/box');
  assert.equal(reachableCheckout(builder, ORIGIN), builder);

  // No opener — severed, noopener, a pasted link — is the ordinary case.
  assert.equal(reachableCheckout(null, ORIGIN), null);
  assert.equal(reachableCheckout(undefined, ORIGIN), null);
  assert.equal(reachableCheckout(opener('/box/review', { closed: true }), ORIGIN), null);
  // The opener has left checkout: there is no checkout in it to go back to.
  assert.equal(reachableCheckout(opener('/'), ORIGIN), null);
  assert.equal(reachableCheckout(opener('/boxes'), ORIGIN), null);
  assert.equal(reachableCheckout(opener('/privacy'), ORIGIN), null);
  assert.equal(reachableCheckout(opener('/box/review', { origin: 'https://elsewhere.test' }), ORIGIN), null);
  // Cross-origin: reading its location throws.
  const foreign = {
    closed: false,
    get location(): never {
      throw new Error('SecurityError');
    },
    focus() {},
  } as OpenerLike;
  assert.equal(reachableCheckout(foreign, ORIGIN), null);
});

test('the "can\'t switch" message is the design\'s, verbatim', () => {
  assert.equal(CHECKOUT_STILL_OPEN, 'Your checkout is still open in your previous tab. Switch back to it to carry on.');
});

/* ---- On the page ------------------------------------------------------------------- */

for (const [name, Page] of [
  ['Terms of Sale', TermsOfSalePage],
  ['Privacy Policy', PrivacyPolicyPage],
] as const) {
  test(`${name}: "← Back to checkout" is rendered hidden above the h1, revealed only by the gate`, () => {
    const html = renderToStaticMarkup(<Page />);
    const row = html.indexOf('id="legal-checkout-return"');
    assert.ok(row > -1);
    assert.ok(row < html.indexOf('<h1'), 'above the h1');
    // Hidden on every server render: a plain visit never shows it.
    assert.match(html, /<div id="legal-checkout-return" class="row" hidden="">/);
    // A button that never navigates — no link that could open a second checkout.
    const control = html.slice(row, html.indexOf('<h1'));
    assert.match(control, /<button type="button" class="back"><span aria-hidden="true">←<\/span><span>Back to checkout<\/span><\/button>/);
    assert.doesNotMatch(control, /<a /);
    // The message has a live region waiting for it.
    assert.match(control, /<p class="note" role="status" aria-live="polite"><\/p>/);
    assert.ok(control.includes(checkoutReturnGateScript('legal-checkout-return')));
  });
}

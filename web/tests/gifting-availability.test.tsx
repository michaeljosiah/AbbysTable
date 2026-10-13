import './support/runtime';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { Gifting } from '../src/components/gifting/Gifting';
import CheckoutPage from '../src/app/(gift-checkout)/gift-card/checkout/page';
import { CartProvider } from '../src/lib/cart/CartProvider';
import { DESIGN_GIFT_OPTIONS, EMPTY_GIFT } from '../src/lib/gifting/model';
import { configureAonik, useAonik as stubAonik } from './support/aonik';
import { resetCookies } from './support/next-headers';

const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {}, hmrRefresh() {} };
function render(enabled: boolean) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <SearchParamsContext.Provider value={new URLSearchParams()}>
        <CartProvider mode="demo">
          <Gifting options={{ ...DESIGN_GIFT_OPTIONS, enabled }}
            resume={{ draft: EMPTY_GIFT, version: 'saved', mode: 'live', totalPence: null }} />
        </CartProvider>
      </SearchParamsContext.Provider>
    </AppRouterContext.Provider>,
  );
}
test('disabled cards hide purchase, zero-postage and resume controls while food gifts remain available', () => {
  const html = render(false);
  assert.match(html, /Gift-card purchasing is currently unavailable/);
  assert.match(html, /Build their box/);
  assert.doesNotMatch(html, /Buy gift card|Order a gift card|Choose a value|Delivery \+|Continue your gift|Edit gift details/);
});
test('enabled cards retain configured prices, purchase and saved-draft controls', () => {
  const html = render(true);
  assert.match(html, /Buy gift card/);
  assert.match(html, /Delivery \+£3.95/);
  assert.match(html, /Continue your gift/);
});
test('a direct checkout bookmark with disabled or unreadable options shows unavailable instead of a payable form', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live', LIVE_ORDERING_ENABLED: 'true' });
  for (const status of [200, 503]) {
    resetCookies();
    stubAonik(request => request.path.endsWith('/gift-cards/options')
      ? { status, body: { ...DESIGN_GIFT_OPTIONS, enabled: false, postage: 0 } } : undefined);
    const html = renderToStaticMarkup(await CheckoutPage({ searchParams: Promise.resolve({}) }));
    assert.match(html, /Gift-card purchasing is currently unavailable/);
    assert.match(html, /Build a gift box/);
    assert.doesNotMatch(html, /Continue to payment|Delivery \+£0/);
  }
});

import './support/runtime';

import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

import { GET as paymentReturn } from '../src/app/(payment)/box/payment/return/route';
import { POST as checkoutPost } from '../src/app/api/checkout/[action]/route';
import type { BoxCartDto, CartPaymentStateDto, StorefrontOrderDetailDto } from '../src/lib/aonik/dto';
import { confirmationRows, confirmationVariant, readConfirmation } from '../src/lib/checkout/confirmation';
import { nextPollDelay, PAYMENT_PAGES, paymentStatusPage } from '../src/lib/checkout/paymentPages';
import { PAYMENT_COOKIE } from '../src/lib/checkout/paymentCookie';
import { loadCheckout } from '../src/lib/checkout/server';

import { aonikRequests, configureAonik, useAonik, type AonikRequest, type AonikReply } from './support/aonik';
import { cookieValue, cookieWrites, renderMode, resetCookies } from './support/next-headers';

/*
 * Paying for the box (#32; spec checkout-and-payment FR-9 to FR-11): the
 * Stripe hand-off, the payment pages decided from Aonik's state, recovery on a
 * cancel return, retry against the same order, and the confirmation read back
 * with the guest order token — shown only once payment is Captured.
 */

const env = process.env as Record<string, string | undefined>;
const CART_COOKIE = { 'abbys-table-cart': JSON.stringify({ cartId: 'c1', cartToken: 'secret-token' }) };

function box(overrides: Partial<BoxCartDto> = {}): BoxCartDto {
  return {
    box: { cartId: 'c1', bundleProductId: 'b1', size: 6, currency: 'GBP', lines: [] },
    quote: { components: [{ key: 'boxPrice', amount: 162 }], deliveryList: 0, total: 162, currency: 'GBP', unitsSelected: 6, boxSize: 6, spacesLeft: 0, isFull: true },
    changes: [],
    cartToken: null,
    cartVersion: 'v2',
    status: 'Open',
    orderId: null,
    checkoutDraft: { deliveryDate: '2026-10-22', acceptedTermsVersion: null },
    ...overrides,
  };
}

const placed = {
  orderId: 'o1',
  invoiceId: null,
  paymentIntentId: 'pi1',
  paymentStatus: 'Pending',
  subtotal: 162,
  discountTotal: 0,
  taxTotal: 0,
  total: 162,
  currency: 'GBP',
  clientSecret: null,
  checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
  guestOrderToken: 'order-token-secret',
};

const state = (overrides: Partial<CartPaymentStateDto> = {}): CartPaymentStateDto => ({
  orderId: 'o1',
  paymentIntentId: 'pi1',
  status: 'processing',
  canEdit: false,
  cartVersion: 'v3',
  checkoutUrl: null,
  ...overrides,
});

const post = (action: string, body: unknown, version = 'v1') =>
  checkoutPost(
    new Request(`https://shop.test/api/checkout/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Cart-Version': version },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ action }) },
  );

/* ---- Which page ---------------------------------------------------------------- */

test('the payment page is decided by Aonik’s state; the return only chooses cancelled over not completed', () => {
  assert.deepEqual(paymentStatusPage({ status: 'succeeded' }, null), { redirect: '/box/confirmation' });
  assert.deepEqual(paymentStatusPage({ status: 'processing' }, null), { kind: 'processing', checking: false });
  assert.deepEqual(paymentStatusPage({ status: 'requires_action' }, 'checking'), { kind: 'processing', checking: true });
  assert.deepEqual(paymentStatusPage({ status: 'something-new' }, 'cancelled'), { kind: 'processing', checking: false }, 'never an offer to pay again');
  assert.deepEqual(paymentStatusPage({ status: 'failed' }, null), { kind: 'failed', checking: false });
  assert.deepEqual(paymentStatusPage({ status: 'cancelled' }, 'cancelled'), { kind: 'cancelled', checking: false });
  assert.deepEqual(paymentStatusPage({ status: 'cancelled' }, 'failed'), { kind: 'notCompleted', checking: false });
  assert.deepEqual(paymentStatusPage({ status: 'cancelled' }, null), { kind: 'notCompleted', checking: false });
  assert.equal(paymentStatusPage(null, null), null);

  // "No charges have been made" only once Aonik proved the attempt closed.
  assert.doesNotMatch(PAYMENT_PAGES.failed.panelText, /No charges/);
  assert.match(PAYMENT_PAGES.notCompleted.panelText, /^No charges have been made\./);
  assert.equal(PAYMENT_PAGES.cancelled.lede, 'Nothing has been charged and your order is still here.');

  assert.deepEqual([0, 1, 2, 9].map((attempt) => nextPollDelay(attempt, false)), [2000, 5000, 10000, 10000]);
  assert.equal(nextPollDelay(3, true), 30_000);
});

/* ---- The hand-off ----------------------------------------------------------------- */

test('CONTINUE TO PAYMENT: nothing starts while ordering is closed', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  delete env.LIVE_ORDERING_ENABLED;
  resetCookies(CART_COOKIE);
  useAonik(() => undefined);
  const response = await post('pay', { expectedTotalPence: 16200 });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'ordering.disabled');
  assert.equal(aonikRequests.length, 0);
});

test('CONTINUE TO PAYMENT: terms accepted, the total agreed, the draft as the source — then Stripe', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live', LIVE_ORDERING_ENABLED: 'true' });
  resetCookies(CART_COOKIE);
  useAonik((request): AonikReply | undefined => {
    if (request.path === '/commerce/carts/c1' && request.method === 'GET') return { status: 200, body: box() };
    if (request.path === '/commerce/config/storefront') return { status: 200, body: { saleTerms: { version: '2026-10', url: 'https://shop.test/terms-of-sale' } } };
    if (request.path === '/commerce/carts/c1/checkout-draft' && request.method === 'GET') {
      return { status: 200, body: { cartId: 'c1', cartVersion: 'v1', status: 'Open', orderId: null, draft: { deliveryDate: '2026-10-22', discountCode: 'SAVE10' } } };
    }
    if (request.path === '/commerce/carts/c1/checkout-draft' && request.method === 'PUT') {
      return { status: 200, body: { cartId: 'c1', cartVersion: 'v2', status: 'Open', orderId: null, draft: request.body } };
    }
    if (request.path === '/commerce/carts/c1/checkout') return { status: 200, body: placed };
    return undefined;
  });

  const response = await post('pay', { expectedTotalPence: 16200 }, 'v1');
  assert.deepEqual(await response.json(), { kind: 'redirect', checkoutUrl: placed.checkoutUrl });

  const terms = aonikRequests.find((request) => request.path.endsWith('/checkout-draft') && request.method === 'PUT')!;
  assert.deepEqual(terms.body, { deliveryDate: '2026-10-22', discountCode: 'SAVE10', acceptedTermsVersion: '2026-10' }, 'everything else echoed');
  assert.equal(terms.headers['x-cart-version'], 'v1');

  const checkout = aonikRequests.find((request) => request.path === '/commerce/carts/c1/checkout')!;
  assert.equal(checkout.headers['x-cart-version'], 'v2', 'the version after the terms were saved');
  assert.deepEqual(checkout.body, {
    provider: 'Stripe',
    paymentMethodType: 'Card',
    returnUrl: 'https://shop.test/box/payment/return?outcome=success',
    cancelUrl: 'https://shop.test/box/payment/return?outcome=cancel',
    expectedTotal: 162,
  });

  const cookie = cookieWrites.find((write) => write.name === PAYMENT_COOKIE);
  assert.equal(cookie?.httpOnly, true);
  assert.deepEqual(JSON.parse(cookieValue(PAYMENT_COOKIE)!), {
    orderId: 'o1',
    paymentIntentId: 'pi1',
    expectedTotalPence: 16200,
    guestOrderToken: 'order-token-secret',
  });
  delete env.LIVE_ORDERING_ENABLED;
});

test('CONTINUE TO PAYMENT: Aonik’s refusals come back named, with the box when the total moved', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live', LIVE_ORDERING_ENABLED: 'true' });
  resetCookies(CART_COOKIE);
  let refusal: AonikReply = { status: 409, body: { error: 'Review and accept the current total before checkout.', code: 'commerce.discount_price_changed' } };
  useAonik((request) => {
    if (request.path === '/commerce/carts/c1' && request.method === 'GET') return { status: 200, body: box({ cartVersion: 'v9' }) };
    if (request.path === '/commerce/config/storefront') return { status: 200, body: {} };
    if (request.path === '/commerce/carts/c1/checkout') return refusal;
    return undefined;
  });
  const changed = await (await post('pay', { expectedTotalPence: 15000 })).json();
  assert.equal(changed.code, 'checkout.total_changed');
  assert.equal(changed.cart.version, 'v9', 'the summary shows the new total');

  refusal = { status: 409, body: { error: 'Expired', code: 'commerce.delivery_reservation_expired' } };
  assert.equal((await (await post('pay', { expectedTotalPence: 16200 })).json()).code, 'checkout.reservation_ended');
  refusal = { status: 400, body: { error: 'Outside our area', code: 'commerce.delivery_not_served' } };
  assert.equal((await (await post('pay', { expectedTotalPence: 16200 })).json()).code, 'checkout.not_served');
  assert.equal((await post('pay', { expectedTotalPence: 0 })).status, 400, 'a total is required');
  delete env.LIVE_ORDERING_ENABLED;
});

/* ---- Back from Stripe --------------------------------------------------------------- */

const back = (outcome: string) => paymentReturn(new Request(`https://shop.test/box/payment/return?outcome=${outcome}`));

test('back from Stripe: read, never trusted; a cancel is recovered by Aonik before anything is said', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  resetCookies(CART_COOKIE);
  let current = state();
  let recovered = state({ status: 'cancelled', canEdit: true, cartVersion: 'v4' });
  useAonik((request: AonikRequest) => {
    if (request.path === '/commerce/carts/c1/payment') return { status: 200, body: current };
    if (request.path === '/commerce/carts/c1/payment/recover') return { status: 200, body: recovered };
    return undefined;
  });

  const success = await back('success');
  assert.equal(success.status, 303);
  assert.equal(success.headers.get('location'), 'https://shop.test/box/payment', 'success is not taken on the URL’s word');

  const cancelled = await back('cancel');
  assert.equal(cancelled.headers.get('location'), 'https://shop.test/box/payment?outcome=cancelled');
  const recover = aonikRequests.find((request) => request.path.endsWith('/payment/recover'))!;
  assert.deepEqual(recover.body, { paymentIntentId: 'pi1' });
  assert.equal(recover.headers['x-cart-version'], 'v3');

  current = state({ status: 'failed' });
  assert.equal((await back('cancel')).headers.get('location'), 'https://shop.test/box/payment?outcome=failed');

  recovered = state({ status: 'processing' });
  current = state();
  assert.equal((await back('cancel')).headers.get('location'), 'https://shop.test/box/payment?outcome=checking', 'uncertain: never pay again yet');

  current = state({ status: 'succeeded' });
  assert.equal((await back('cancel')).headers.get('location'), 'https://shop.test/box/confirmation');
});

/* ---- Retry ------------------------------------------------------------------------- */

test('retry: the same Stripe session while it lives; after recovery, the saved date again and the agreed total', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live', LIVE_ORDERING_ENABLED: 'true' });
  resetCookies({
    ...CART_COOKIE,
    [PAYMENT_COOKIE]: JSON.stringify({ orderId: 'o1', paymentIntentId: 'pi1', expectedTotalPence: 16200 }),
  });
  let current = state({ status: 'failed', checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_live_same' });
  let reserve: AonikReply = { status: 200, body: { cartId: 'c1', cartVersion: 'v5', serverNowUtc: '2026-10-10T12:00:00Z', reservation: null } };
  useAonik((request) => {
    if (request.path === '/commerce/carts/c1/payment') return { status: 200, body: current };
    if (request.path === '/commerce/carts/c1/checkout-draft') return { status: 200, body: { cartId: 'c1', cartVersion: 'v4', status: 'Open', orderId: 'o1', draft: { deliveryDate: '2026-10-22' } } };
    if (request.path === '/commerce/carts/c1/delivery-reservation') return reserve;
    if (request.path === '/commerce/carts/c1' && request.method === 'GET') return { status: 200, body: box({ orderId: 'o1' }) };
    if (request.path === '/commerce/config/storefront') return { status: 200, body: {} };
    if (request.path === '/commerce/carts/c1/checkout') return { status: 200, body: { ...placed, checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_new' } };
    return undefined;
  });

  assert.deepEqual(await (await post('retry', {})).json(), { kind: 'redirect', checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_live_same' });
  assert.equal(aonikRequests.some((request) => request.method !== 'GET'), false, 'nothing new was started');

  current = state({ status: 'cancelled', canEdit: true, cartVersion: 'v4' });
  assert.deepEqual(await (await post('retry', {})).json(), { kind: 'redirect', checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_new' });
  const held = aonikRequests.find((request) => request.path.endsWith('/delivery-reservation'))!;
  assert.deepEqual(held.body, { deliveryDate: '2026-10-22' });
  assert.equal(held.headers['x-cart-version'], 'v4');
  const started = aonikRequests.find((request) => request.path.endsWith('/checkout'))!;
  assert.equal((started.body as { expectedTotal: number }).expectedTotal, 162, 'the total the customer agreed to');
  assert.equal(started.headers['x-cart-version'], 'v5');

  reserve = { status: 409, body: { error: 'Full', code: 'commerce.delivery_date_full' } };
  assert.deepEqual(await (await post('retry', {})).json(), { kind: 'checkout', reason: 'date' });

  current = state({ status: 'processing' });
  assert.deepEqual(await (await post('retry', {})).json(), { kind: 'pending' }, 'never a second payment while one may go through');
  delete env.LIVE_ORDERING_ENABLED;
});

/* ---- Checkout's gate ---------------------------------------------------------------- */

test('checkout with an attempt: locked until Aonik proves it closed, then editable again', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  let current = state();
  useAonik((request) => {
    if (request.path === '/commerce/carts/c1') return { status: 200, body: box({ orderId: 'o1' }) };
    if (request.path === '/commerce/carts/c1/payment') return { status: 200, body: current };
    if (request.path === '/commerce/carts/c1/delivery-reservation') return { status: 200, body: { cartId: 'c1', cartVersion: 'v2', serverNowUtc: '2026-10-10T12:00:00Z', reservation: null } };
    return undefined;
  });
  resetCookies(CART_COOKIE);
  renderMode();
  assert.equal((await loadCheckout()).kind, 'payment');
  current = state({ status: 'cancelled', canEdit: true });
  const ready = await loadCheckout();
  assert.equal(ready.kind, 'ready');
  // Recovery released the hold: the saved date must be chosen again.
  assert.equal(ready.kind === 'ready' && ready.reservation?.status, 'ended');
});

/* ---- The confirmation -------------------------------------------------------------- */

const order = (overrides: Partial<StorefrontOrderDetailDto> = {}): StorefrontOrderDetailDto => ({
  orderId: 'o1',
  placedAtUtc: '2026-10-10T12:00:00Z',
  status: 'Confirmed',
  currency: 'GBP',
  subtotal: 168.5,
  discountTotal: 16.2,
  taxTotal: 0,
  total: 152.3,
  boxSize: 6,
  items: [
    { itemType: 'ProductPurchase', quantity: 1, unitPrice: 162, amountIn: 162, sku: 'BOX', name: 'Box', itemIndex: 0 },
    { itemType: 'ProductPurchase', quantity: 2, unitPrice: 3.25, amountIn: 6.5, sku: 'PLANTAIN', name: 'Fried Plantain', itemIndex: 1 },
  ],
  selections: [{ productVariantId: 'v1', quantity: 6, sku: 'JOLLOF', personalisationSummary: null, orderItemIndex: 0, name: 'Jollof' }],
  paymentStatus: 'Captured',
  delivery: {
    purchaser: { email: 'pat@example.com', firstName: 'Pat', lastName: 'Customer', phone: '07700 900123' },
    address: { line1: '1 Example Road', line2: null, city: 'London', region: null, postcode: 'SW1A 1AA', countryCode: 'GB' },
    deliveryDate: '2026-10-22',
    timezone: 'Europe/London',
    recipient: { name: 'Pat Customer', phone: '07700 900123' },
  },
  orderNumber: 'AT-10482',
  discountCode: 'SAVE10',
  loyalty: { redeemedPoints: 0, appliedValue: 0, earnedPoints: 304, earningStatus: 'AccountNotLinked' },
  ...overrides,
});

test('the confirmation’s rows are what the order records; its state comes from Aonik’s earning status', () => {
  assert.deepEqual(
    confirmationRows(order()).map(({ label, value }) => [label, value]),
    [
      ['6-dish box', '£162.00'],
      ['Fried Plantain × 2', '+£6.50'],
      ['Discount (SAVE10)', '−£16.20'],
      ['Delivery · Thu 22 Oct', 'Free'],
    ],
  );
  assert.equal(confirmationRows(order({ total: 157.25 })).at(-1)?.value, '£4.95', 'delivery charged is what is left of the total');

  assert.equal(confirmationVariant(order({ loyalty: { redeemedPoints: 0, appliedValue: 0, earnedPoints: 304, earningStatus: 'Earned' } }), false), 'member');
  assert.equal(confirmationVariant(order({ loyalty: { redeemedPoints: 0, appliedValue: 0, earnedPoints: 304, earningStatus: 'AccountSetupRequired' } }), false), 'setup');
  assert.equal(confirmationVariant(order(), true), 'guest');
  assert.equal(confirmationVariant(order({ loyalty: null }), true), 'member');
  assert.equal(confirmationVariant(order({ loyalty: null }), false), 'guest');
});

test('the confirmation reads the order back with the guest token, and confirms only a captured payment', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  resetCookies({ [PAYMENT_COOKIE]: JSON.stringify({ orderId: 'o1', paymentIntentId: 'pi1', expectedTotalPence: 15230, guestOrderToken: 'order-token-secret' }) });
  let reply: AonikReply = { status: 200, body: order() };
  useAonik((request) => (request.path === '/commerce/storefront/guest-orders/o1' ? reply : undefined));

  const paid = await readConfirmation();
  assert.equal(paid.kind, 'paid');
  assert.equal(paid.kind === 'paid' && paid.order.orderNumber, 'AT-10482');
  assert.deepEqual(paid.kind === 'paid' && paid.order.address, ['1 Example Road', 'London', 'SW1A 1AA']);
  assert.equal(paid.kind === 'paid' && paid.order.points, null, 'never a points claim to a guest');
  assert.equal(aonikRequests[0].headers['x-order-token'], 'order-token-secret');
  assert.doesNotMatch(aonikRequests[0].path, /order-token-secret/, 'the token travels only in its header');

  reply = { status: 200, body: order({ paymentStatus: 'Pending' }) };
  assert.equal((await readConfirmation()).kind, 'unpaid');
  reply = { status: 404, body: {} };
  assert.equal((await readConfirmation()).kind, 'none');

  resetCookies();
  assert.equal((await readConfirmation()).kind, 'none');
  const quiet = mock.method(console, 'error', () => undefined);
  quiet.mock.restore();
});

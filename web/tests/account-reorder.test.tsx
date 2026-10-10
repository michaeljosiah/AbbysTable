import './support/runtime';

import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';

import { OrderAgainButton } from '../src/components/account/OrderAgainButton';
import { OrderCard, type OrderCardData } from '../src/components/account/OrderCard';
import { reorderAction } from '../src/lib/account/reorderActions';
import { REORDER_COPY, canOrderAgain, orderAgainLabel } from '../src/lib/account/reorder';
import type { BoxCartDto } from '../src/lib/aonik/dto';
import { SESSION_COOKIE } from '../src/lib/auth/session';
import { CART_COOKIE } from '../src/lib/cart/cartCookie';
import { CartProvider } from '../src/lib/cart/CartProvider';
import { reorderOrder } from '../src/lib/cart/reorder';
import { PAYMENT_COOKIE } from '../src/lib/checkout/paymentCookie';

import { aonikRequests, configureAonik, useAonik as installAonik, type AonikReply, type AonikRequest } from './support/aonik';
import { cookieValue, resetCookies } from './support/next-headers';

/*
 * Order again (#35 PR 4): Aonik rebuilds the paid box as a NEW box from today's
 * menu; the storefront stores it as the customer's box and sends them to Step 2.
 * Against a stubbed Aonik.
 */

configureAonik({ AONIK_AUTH_CLIENT_ID: 'storefront' });

const ID = '0b6c1e2a-1111-4222-8333-444455556666';
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

beforeEach(() => {
  resetCookies({
    [SESSION_COOKIE]: JSON.stringify({ accessToken: 'a', expiresAt: Date.now() + 3_600_000, email: 'ada@example.com' }),
    [PAYMENT_COOKIE]: JSON.stringify({ orderId: 'old-order' }),
    [CART_COOKIE]: JSON.stringify({ cartId: 'old-cart' }),
  });
});

function line(overrides: Record<string, unknown> = {}) {
  return {
    lineId: 'l1', productId: 'p1', variantId: 'v1', name: 'Jollof Rice', quantity: 2,
    personalisation: { heat: 'mild' }, personalisationSummary: 'Mild', isDefaultPersonalisation: false,
    personalisationAdjustment: 0, unitSurcharge: 0, slotId: 's1', isUnavailable: false, ...overrides,
  };
}

function reordered(lines = [line(), line({ lineId: 'l2', name: 'Egusi Soup', quantity: 4, isUnavailable: true })], token: string | null = null): BoxCartDto {
  return {
    box: { cartId: 'new-cart', bundleProductId: 'b1', size: 6, currency: 'GBP', lines },
    quote: { components: [{ key: 'boxPrice', amount: 158 }], deliveryList: 0, total: 158, currency: 'GBP', unitsSelected: 6, boxSize: 6, spacesLeft: 0, isFull: true },
    changes: [],
    cartToken: token,
    cartVersion: 'v1',
    status: 'Open',
    orderId: null,
    checkoutDraft: null,
  } as unknown as BoxCartDto;
}

function stubAonik(reply: AonikReply) {
  installAonik((request: AonikRequest) => (request.path.endsWith('/reorder') ? reply : undefined));
}

/* ---- Aonik's side ----------------------------------------------------------- */

test('a reorder POSTs for the order, stores the new box as the customer’s, and ends the last confirmation', async () => {
  stubAonik({ status: 200, body: reordered() });

  const outcome = await reorderOrder(ID);

  assert.deepEqual(outcome, { status: 'started', dishes: 6, unavailable: 1 });
  assert.equal(aonikRequests.length, 1);
  assert.equal(aonikRequests[0].method, 'POST');
  assert.equal(aonikRequests[0].path, `/commerce/storefront/orders/${ID}/reorder`);
  assert.equal(aonikRequests[0].headers.authorization, 'Bearer a');
  assert.deepEqual(JSON.parse(cookieValue(CART_COOKIE) ?? ''), { cartId: 'new-cart' }, 'the account box answers to the bearer: no token invented');
  assert.equal(cookieValue(PAYMENT_COOKIE), undefined, 'the previous order’s confirmation is over');
});

test('a token Aonik discloses is kept', async () => {
  stubAonik({ status: 200, body: reordered(undefined, 'tok-1') });

  await reorderOrder(ID);

  assert.deepEqual(JSON.parse(cookieValue(CART_COOKIE) ?? ''), { cartId: 'new-cart', cartToken: 'tok-1' });
});

test('with a box already in progress nothing starts: Aonik holds one at a time, and the cookie is untouched', async () => {
  stubAonik({ status: 409, body: { error: 'You already have an active box.', code: 'commerce.active_box_exists' } });

  assert.deepEqual(await reorderOrder(ID), { status: 'active-box' });
  assert.deepEqual(JSON.parse(cookieValue(CART_COOKIE) ?? ''), { cartId: 'old-cart' });
  assert.ok(cookieValue(PAYMENT_COOKIE));
});

test('an order that is not a paid food box, or not theirs, is "not reorderable" and says no more', async () => {
  for (const status of [404, 422, 400, 403]) {
    stubAonik({ status, body: { error: 'Only a confirmed paid food box can be reordered.' } });
    assert.deepEqual(await reorderOrder(ID), { status: 'not-reorderable' }, String(status));
  }
});

test('an outage is "failed", a dead session is thrown to the action, and demo data is "unavailable"', async () => {
  stubAonik({ status: 503, body: { error: 'down' } });
  assert.deepEqual(await reorderOrder(ID), { status: 'failed' });
  assert.deepEqual(JSON.parse(cookieValue(CART_COOKIE) ?? ''), { cartId: 'old-cart' });

  stubAonik({ status: 401, body: { error: 'expired' } });
  assert.deepEqual(await reorderAction(ID), { status: 'ended' });

  const saved = { url: process.env.AONIK_API_URL, tenant: process.env.AONIK_TENANT_ID };
  delete process.env.AONIK_API_URL;
  delete process.env.AONIK_TENANT_ID;
  try {
    assert.deepEqual(await reorderOrder(ID), { status: 'unavailable' });
  } finally {
    process.env.AONIK_API_URL = saved.url;
    process.env.AONIK_TENANT_ID = saved.tenant;
  }
});

test('the action refuses an id that is not a GUID without asking Aonik', async () => {
  stubAonik({ status: 200, body: reordered() });

  for (const bad of ['..', '', 'abc', '../orders']) {
    assert.deepEqual(await reorderAction(bad), { status: 'not-reorderable' }, JSON.stringify(bad));
  }
  assert.equal(aonikRequests.length, 0);
});

/* ---- Rules and rendering -------------------------------------------------------- */

test('an order offers Order again once paid and unless cancelled', () => {
  assert.equal(canOrderAgain({ fulfilmentStatus: 'Cooking', paymentStatus: 'Captured' }), true);
  assert.equal(canOrderAgain({ fulfilmentStatus: 'Delivered', paymentStatus: undefined }), true);
  assert.equal(canOrderAgain({ fulfilmentStatus: 'Cancelled', paymentStatus: 'Captured' }), false);
  assert.equal(canOrderAgain({ fulfilmentStatus: 'Confirmed', paymentStatus: 'Pending' }), false);
  assert.equal(orderAgainLabel('Thursday 8 October'), 'Order again: dishes from Thursday 8 October');
});

const CARD: OrderCardData = {
  number: 'AT-10517', status: { label: 'Cooking', kind: 'live' }, heading: 'Thursday 8 October', box: '6-dish box', total: '£158',
  dishes: [], dishCount: 0, href: `/account/orders/${ID}`,
};

function render(card: OrderCardData) {
  return renderToStaticMarkup(
    <CartProvider mode="demo">
      <OrderCard order={card} />
    </CartProvider>,
  );
}

test('a card with Order again says what it will do, and an upcoming one says its delivery is not being edited', () => {
  const past = render({ ...CARD, again: { orderId: ID, upcoming: false } });
  assert.match(past, /aria-label="Order again: dishes from Thursday 8 October"[^>]*>Order again</);
  assert.doesNotMatch(text(past), /Your delivery won’t change/);

  const upcoming = text(render({ ...CARD, again: { orderId: ID, upcoming: true } }));
  assert.match(upcoming, /Order again This starts a new box\. Your delivery won’t change\./);
});

test('a card without it (cancelled, unpaid) offers no Order again', () => {
  assert.doesNotMatch(render(CARD), /Order again/);
});

test('the button on its own renders idle and quiet', () => {
  const html = renderToStaticMarkup(
    <CartProvider mode="demo">
      <OrderAgainButton orderId={ID} label="Order again: x" returnTo="/account/orders" />
    </CartProvider>,
  );
  assert.doesNotMatch(text(html), /box in progress|couldn’t/);
  assert.equal(REORDER_COPY.activeBox.includes('one box at a time'), true);
});

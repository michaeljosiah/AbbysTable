import './support/runtime';

import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { DELETE, GET, POST } from '../src/app/api/cart/[[...action]]/route';
import type { BoxCartDto, CheckoutResultDto } from '../src/lib/aonik/dto';
import { AONIK_CODES } from '../src/lib/aonik/errors';
import { CART_COOKIE } from '../src/lib/cart/cartCookie';
import { ORDER_COOKIE } from '../src/lib/cart/orderCookie';

import { aonikRequests, configureAonik, useAonik } from './support/aonik';
import { cookieValue, cookieWrites, resetCookies } from './support/next-headers';

/*
 * The `/api/cart/*` seam (server-box-cart, review-checkout), against a stubbed
 * Aonik. The handlers, cart server and cookie code are the real modules.
 */

const CART_ID = 'cart-1';
const CART_TOKEN = 'guest-token-secret';
const GUEST_COOKIE = JSON.stringify({ cartId: CART_ID, cartToken: CART_TOKEN });

// Checkout is gated on this once live ordering lands behind a flag (#5); it is
// set here so the success path keeps testing checkout rather than the gate.
configureAonik({ LIVE_ORDERING_ENABLED: 'true' });

function cartDto(overrides: Partial<BoxCartDto> = {}): BoxCartDto {
  return {
    box: { cartId: CART_ID, bundleProductId: 'bundle-1', size: 6, currency: 'GBP', lines: [] },
    quote: {
      components: [{ key: 'box', amount: 158 }],
      deliveryList: 0,
      total: 158,
      currency: 'GBP',
      unitsSelected: 0,
      boxSize: 6,
      spacesLeft: 6,
      isFull: false,
    },
    changes: [],
    cartToken: null,
    ...overrides,
  };
}

const placed: CheckoutResultDto = {
  orderId: 'order-1',
  invoiceId: null,
  paymentIntentId: 'pi-1',
  paymentStatus: 'requires_payment_method',
  subtotal: 158,
  discountTotal: 0,
  taxTotal: 0,
  total: 158,
  currency: 'GBP',
  clientSecret: null,
  checkoutUrl: null,
};

function call(action: string[], method: 'POST' | 'DELETE', body?: unknown) {
  const request = new Request(`http://localhost/api/cart/${action.join('/')}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const context = { params: Promise.resolve({ action }) };
  return method === 'POST' ? POST(request, context) : DELETE(request, context);
}

async function read(response: Response) {
  const text = await response.text();
  return { status: response.status, text, json: JSON.parse(text) as Record<string, unknown> };
}

function cartCookieWrites() {
  return cookieWrites.filter((write) => write.name === CART_COOKIE);
}

beforeEach(() => resetCookies());

test('create stores the token once, in an httpOnly cookie, and never returns it', async () => {
  useAonik((request) =>
    request.method === 'POST' && request.path === '/commerce/carts/box'
      ? { status: 201, body: cartDto({ cartToken: CART_TOKEN }) }
      : undefined,
  );

  const { status, text, json } = await read(
    await call(['create'], 'POST', { bundleProductId: 'bundle-1', size: 6 }),
  );

  assert.equal(status, 200);
  assert.equal((json.cart as { cartId: string }).cartId, CART_ID);
  assert.ok(!text.includes(CART_TOKEN), 'the cart token must never reach a response body');

  const writes = cartCookieWrites();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].httpOnly, true);
  assert.deepEqual(JSON.parse(cookieValue(CART_COOKIE) ?? ''), { cartId: CART_ID, cartToken: CART_TOKEN });

  assert.equal(aonikRequests[0].headers['x-tenant-id'], 'tenant-test');
});

test('a cart created without a disclosed token is a failure, not a half-stored cart', async () => {
  useAonik(() => ({ status: 201, body: cartDto({ cartToken: null }) }));
  const logged = mock.method(console, 'error', () => undefined);

  try {
    const response = await call(['create'], 'POST', { bundleProductId: 'bundle-1', size: 6 });

    assert.equal(response.status, 500);
    assert.equal(cartCookieWrites().length, 0);
    assert.equal(logged.mock.callCount(), 1);
  } finally {
    logged.mock.restore();
  }
});

test('reading with no cart cookie answers an empty box without calling Aonik', async () => {
  useAonik(() => undefined);

  const { status, json } = await read(await GET());

  assert.equal(status, 200);
  assert.equal(json.cart, null);
  assert.equal(aonikRequests.length, 0);
});

test('reading the cart proves possession with the token header, and keeps it server-side', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) =>
    request.path === `/commerce/carts/${CART_ID}` ? { status: 200, body: cartDto() } : undefined,
  );

  const { status, text } = await read(await GET());

  assert.equal(status, 200);
  assert.equal(aonikRequests[0].headers['x-cart-token'], CART_TOKEN);
  assert.ok(!text.includes(CART_TOKEN));
});

test('a mutation with no cart is refused with an authoritative empty cart', async () => {
  useAonik(() => undefined);

  const { status, json } = await read(await call(['continue'], 'POST'));

  assert.equal(status, 404);
  assert.equal(json.cart, null);
  assert.equal(json.code, 'cart.missing');
  assert.equal(aonikRequests.length, 0);
});

test('a 404 for the cart itself clears the cookie and answers cart: null', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik(() => ({ status: 404, body: { error: `Cart ${CART_ID} was not found.` } }));

  const { status, json } = await read(await call(['continue'], 'POST'));

  assert.equal(status, 404);
  assert.equal(json.cart, null);
  assert.equal(cookieValue(CART_COOKIE), undefined);
  assert.equal(cartCookieWrites().at(-1)?.maxAge, 0);
});

test('a 404 about something else keeps the cart and its cookie', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    if (request.method === 'DELETE') return { status: 404, body: { error: 'Line l-9 was not found.' } };
    if (request.method === 'GET') return { status: 200, body: cartDto() };
    return undefined;
  });

  const { status, json } = await read(await call(['lines', 'l-9'], 'DELETE'));

  assert.equal(status, 404);
  assert.equal(json.cart, undefined, 'no cart key: the box on screen stays as it is');
  assert.equal(cookieValue(CART_COOKIE), GUEST_COOKIE);
});

test('checkout drift answers 409 with the repaired box and orders nothing', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  const repaired = cartDto({
    changes: [
      { lineId: 'l-1', group: null, from: null, to: null, reason: 'unavailable', priceDelta: null, mergedIntoLineId: null },
    ],
  });
  useAonik((request) => {
    if (request.method === 'GET') return { status: 200, body: cartDto() };
    if (request.path === `/commerce/carts/${CART_ID}/checkout`) {
      return {
        status: 409,
        body: {
          error: AONIK_CODES.boxDrift,
          message: 'Your box changed.',
          box: repaired.box,
          quote: repaired.quote,
          changes: repaired.changes,
        },
      };
    }
    return undefined;
  });

  const { status, json } = await read(await call(['checkout'], 'POST', {}));

  assert.equal(status, 409);
  assert.equal(json.code, AONIK_CODES.boxDrift);
  const cart = json.cart as { cartId: string; changes: unknown[] };
  assert.equal(cart.cartId, CART_ID);
  assert.equal(cart.changes.length, 1);
  assert.equal(cookieValue(CART_COOKIE), GUEST_COOKIE, 'the box survives a drift stop');
  assert.equal(cookieValue(ORDER_COOKIE), undefined, 'nothing was ordered');
});

test('a successful checkout clears the cart cookie and leaves an order snapshot', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    if (request.method === 'GET') return { status: 200, body: cartDto() };
    if (request.path === `/commerce/carts/${CART_ID}/checkout`) return { status: 200, body: placed };
    return undefined;
  });

  const { status, text, json } = await read(await call(['checkout'], 'POST', {}));

  assert.equal(status, 200);
  assert.equal(json.cart, null, 'an explicit null resets the client');
  assert.equal((json.order as { orderId: string }).orderId, 'order-1');
  assert.ok(!text.includes(CART_TOKEN));
  assert.equal(cookieValue(CART_COOKIE), undefined);
  assert.equal(JSON.parse(cookieValue(ORDER_COOKIE) ?? '{}').orderId, 'order-1');
});

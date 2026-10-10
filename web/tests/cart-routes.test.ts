import './support/runtime';

import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { DELETE, GET, PATCH, POST } from '../src/app/api/cart/[[...action]]/route';
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

function call(action: string[], method: 'POST' | 'PATCH' | 'DELETE', body?: unknown, version?: string) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // The provider sends the version of the box the tab last adopted.
  if (version) headers['X-Cart-Version'] = version;
  const request = new Request(`http://localhost/api/cart/${action.join('/')}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const context = { params: Promise.resolve({ action }) };
  if (method === 'POST') return POST(request, context);
  return method === 'PATCH' ? PATCH(request, context) : DELETE(request, context);
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

/* ---- The box version (Aonik #347) ---------------------------------------------- */

test('every write carries the version of the box the tab last saw; the box comes back with its new one', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  let next = 1;
  useAonik((request) => {
    if (request.method === 'GET') return { status: 200, body: cartDto({ cartVersion: 'v0' }) };
    next += 1;
    return { status: 200, body: cartDto({ cartVersion: `v${next}` }) };
  });

  const extra = await read(await call(['extras'], 'POST', { productVariantId: 'var-1' }, 'v1'));
  const size = await read(await call(['size'], 'PATCH', { size: 12 }, 'v2'));
  const line = await read(await call(['lines', 'l-1'], 'PATCH', { quantity: 2 }, 'v3'));
  const removed = await read(await call(['lines', 'l-1'], 'DELETE', undefined, 'v4'));
  const continued = await read(await call(['continue'], 'POST', {}, 'v5'));

  assert.deepEqual(
    aonikRequests.map((request) => [request.method, request.path, request.headers['x-cart-version']]),
    [
      ['POST', `/commerce/carts/${CART_ID}/extras`, 'v1'],
      ['PATCH', `/commerce/carts/${CART_ID}/size`, 'v2'],
      ['PATCH', `/commerce/carts/${CART_ID}/lines/l-1`, 'v3'],
      ['DELETE', `/commerce/carts/${CART_ID}/lines/l-1`, 'v4'],
      ['POST', `/commerce/carts/${CART_ID}/continue`, 'v5'],
    ],
  );
  // Each response hands the tab the version its next change must be based on.
  assert.deepEqual(
    [extra, size, line, removed, continued].map(({ json }) => (json.cart as { version?: string }).version),
    ['v2', 'v3', 'v4', 'v5', 'v6'],
  );
});

test('a read never carries a version: there is nothing for it to protect', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik(() => ({ status: 200, body: cartDto({ cartVersion: 'v3' }) }));

  const { json } = await read(await GET());

  assert.equal(aonikRequests[0].headers['x-cart-version'], undefined);
  assert.equal((json.cart as { version?: string }).version, 'v3');
});

test('a change based on an older box is refused, answered with the box as it is now, and never retried', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    if (request.method === 'GET') return { status: 200, body: cartDto({ cartVersion: 'v9' }) };
    return {
      status: 409,
      body: {
        code: AONIK_CODES.cartConflict,
        message: 'The cart changed. Reload it before saving your changes.',
        cartId: CART_ID,
        cartVersion: 'v9',
        status: 'Open',
        orderId: null,
      },
    };
  });

  const { status, json } = await read(await call(['size'], 'PATCH', { size: 12 }, 'v1'));

  assert.equal(status, 409);
  assert.equal(json.code, 'cart.conflict');
  assert.match(String(json.error), /changed in another window/);
  // The tab adopts this box and its version before the customer tries again.
  assert.equal((json.cart as { version?: string }).version, 'v9');
  // One write, then one read: re-sending the change against a box the customer
  // has not seen is exactly what the version exists to prevent.
  assert.deepEqual(
    aonikRequests.map((request) => request.method),
    ['PATCH', 'GET'],
  );
  assert.equal(cookieValue(CART_COOKIE), GUEST_COOKIE, 'the box is kept');
});

test('a box whose payment is in progress cannot be changed, and says so', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    if (request.method === 'GET') return { status: 200, body: cartDto({ cartVersion: 'v4' }) };
    return {
      status: 409,
      body: { code: AONIK_CODES.cartLocked, message: 'This cart is no longer editable.', cartId: CART_ID, cartVersion: 'v4' },
    };
  });

  const { status, json } = await read(await call(['extras'], 'POST', { productVariantId: 'var-1' }, 'v4'));

  assert.equal(status, 409);
  assert.equal(json.code, 'cart.locked');
  assert.match(String(json.error), /payment/);
  assert.equal((json.cart as { version?: string }).version, 'v4');
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
  // A non-empty tombstone on the cookie's own path: Azure SWA drops empty
  // Set-Cookie values, and a different path would clear nothing.
  assert.deepEqual(
    { ...cartCookieWrites().at(-1) },
    { name: CART_COOKIE, value: 'deleted', maxAge: 0, httpOnly: true, path: '/' },
  );
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
          cartVersion: 'v-repaired',
        },
      };
    }
    return undefined;
  });

  const { status, json } = await read(await call(['checkout'], 'POST', {}, 'v1'));

  assert.equal(status, 409);
  assert.equal(json.code, AONIK_CODES.boxDrift);
  const cart = json.cart as { cartId: string; changes: unknown[]; version?: string };
  assert.equal(cart.cartId, CART_ID);
  assert.equal(cart.changes.length, 1);
  // Aonik saved the repair, so the confirmation must be based on the repaired box.
  assert.equal(cart.version, 'v-repaired');
  assert.equal(cookieValue(CART_COOKIE), GUEST_COOKIE, 'the box survives a drift stop');
  assert.equal(cookieValue(ORDER_COOKIE), undefined, 'nothing was ordered');
});

test('a successful checkout clears the cart cookie and leaves an order snapshot', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    if (request.method === 'GET') return { status: 200, body: cartDto({ cartVersion: 'v5' }) };
    if (request.path === `/commerce/carts/${CART_ID}/checkout`) return { status: 200, body: placed };
    return undefined;
  });

  const { status, text, json } = await read(await call(['checkout'], 'POST', {}, 'v5'));

  assert.equal(status, 200);
  // Placing is a write like any other: based on the box the tab confirmed.
  const checkout = aonikRequests.find((request) => request.path.endsWith('/checkout'));
  assert.equal(checkout?.headers['x-cart-version'], 'v5');
  assert.equal(json.cart, null, 'an explicit null resets the client');
  assert.equal((json.order as { orderId: string }).orderId, 'order-1');
  assert.ok(!text.includes(CART_TOKEN));
  assert.equal(cookieValue(CART_COOKIE), undefined);
  assert.equal(JSON.parse(cookieValue(ORDER_COOKIE) ?? '{}').orderId, 'order-1');
});


/* ---- A box that moved, or finished, under the tab (#347) ------------------------------ */

test('adding a dish carries the version too', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    if (request.path === '/commerce/catalog/products/jollof') {
      return {
        status: 200,
        body: { id: 'p-1', slug: 'jollof', variants: [{ id: 'var-1', isActive: true }], effectiveOptionGroups: [] },
      };
    }
    if (request.path === `/commerce/carts/${CART_ID}/lines`) return { status: 200, body: cartDto({ cartVersion: 'v8' }) };
    return undefined;
  });

  const { status } = await read(await call(['lines'], 'POST', { slug: 'jollof', quantity: 1 }, 'v7'));

  assert.equal(status, 200);
  const added = aonikRequests.find((request) => request.path === `/commerce/carts/${CART_ID}/lines`);
  assert.equal(added?.headers['x-cart-version'], 'v7');
});

test('checkout stops before placing when its own read finds the box repaired, and shows what changed', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    // The read before placing repairs the box (Aonik saves it, so it moves on).
    if (request.method === 'GET') {
      return {
        status: 200,
        body: cartDto({
          cartVersion: 'v6',
          changes: [
            { lineId: 'l-1', group: 'Heat', from: 'Hot', to: 'Medium', reason: 'option-retired', priceDelta: null, mergedIntoLineId: null },
          ],
        }),
      };
    }
    return undefined;
  });

  const { status, json } = await read(await call(['checkout'], 'POST', {}, 'v5'));

  assert.equal(status, 409);
  assert.equal(json.code, AONIK_CODES.boxDrift);
  const cart = json.cart as { changes: unknown[]; version?: string };
  assert.equal(cart.changes.length, 1, 'the customer sees what changed');
  assert.equal(cart.version, 'v6');
  assert.deepEqual(aonikRequests.map((request) => request.method), ['GET'], 'nothing was placed');
  assert.equal(cookieValue(ORDER_COOKIE), undefined);
});

test('checkout of a box another tab changed is refused by Aonik on the tab’s version', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    if (request.method === 'GET') return { status: 200, body: cartDto({ cartVersion: 'v9' }) };
    return { status: 409, body: { code: AONIK_CODES.cartConflict, message: 'The cart changed.', cartVersion: 'v9', status: 'Open', orderId: null } };
  });

  const { status, json } = await read(await call(['checkout'], 'POST', {}, 'v5'));

  assert.equal(status, 409);
  assert.equal(json.code, 'cart.conflict');
  assert.equal((json.cart as { version?: string }).version, 'v9');
  const placing = aonikRequests.find((request) => request.path.endsWith('/checkout'));
  assert.equal(placing?.headers['x-cart-version'], 'v5', 'based on the box the tab confirmed');
  assert.equal(cookieValue(ORDER_COOKIE), undefined, 'nothing was ordered');
});

test('checkout of a box that already became an order is replayed, never refused as stale', async () => {
  // The answer to the first click never arrived: Aonik holds the order and the
  // box moved on (checkout saved it), but the tab still has the old version.
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    if (request.method === 'GET') return { status: 200, body: cartDto({ cartVersion: 'v9', orderId: 'order-1' }) };
    if (request.path === `/commerce/carts/${CART_ID}/checkout`) return { status: 200, body: placed };
    return undefined;
  });

  const { status, json } = await read(await call(['checkout'], 'POST', {}, 'v5'));

  assert.equal(status, 200);
  assert.equal((json.order as { orderId: string }).orderId, 'order-1', 'the same order, replayed');
  assert.equal(JSON.parse(cookieValue(ORDER_COOKIE) ?? '{}').orderId, 'order-1');
  assert.equal(cookieValue(CART_COOKIE), undefined);
});

test('checkout of a box already paid for reaches the confirmation, not "no box"', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    if (request.method === 'GET') return { status: 200, body: cartDto({ cartVersion: 'v9', status: 'CheckedOut', orderId: 'order-1' }) };
    if (request.path === `/commerce/carts/${CART_ID}/checkout`) return { status: 200, body: placed };
    return undefined;
  });

  const { status, json } = await read(await call(['checkout'], 'POST', {}, 'v5'));

  assert.equal(status, 200);
  assert.equal((json.order as { orderId: string }).orderId, 'order-1');
  assert.equal(JSON.parse(cookieValue(ORDER_COOKIE) ?? '{}').orderId, 'order-1');
});

/** Aonik's refusal of a write on a box that can no longer change. */
function lockedBody(status: string, orderId: string | null = null) {
  return {
    code: AONIK_CODES.cartLocked,
    message: 'This cart is no longer editable. Reload its current state.',
    cartId: CART_ID,
    cartVersion: 'v4',
    status,
    orderId,
  };
}

test('a box Aonik expired is no box: the write is refused as missing and the cookie goes', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik(() => ({ status: 409, body: lockedBody('Abandoned') }));

  const { status, json } = await read(await call(['size'], 'PATCH', { size: 12 }, 'v4'));

  assert.equal(status, 404);
  assert.equal(json.code, 'cart.missing');
  assert.equal(json.cart, null, 'the tab drops it; the next size or add starts a fresh box');
  assert.doesNotMatch(String(json.error), /payment/);
  assert.equal(cookieValue(CART_COOKIE), undefined);
});

test('a box that already became an order says so, and the cookie goes', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik(() => ({ status: 409, body: lockedBody('CheckedOut', 'order-7') }));

  const { status, json } = await read(await call(['extras'], 'POST', { productVariantId: 'var-1' }, 'v4'));

  assert.equal(status, 409);
  assert.equal(json.code, 'cart.ordered');
  assert.equal(json.error, 'This order has already been completed.');
  assert.equal(json.cart, null);
  assert.equal(cookieValue(CART_COOKIE), undefined);
});

for (const finished of ['Abandoned', 'CheckedOut']) {
  test(`reading a box that is ${finished} answers no box, and clears it`, async () => {
    resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
    useAonik(() => ({ status: 200, body: cartDto({ status: finished }) }));

    const { status, json } = await read(await GET());

    assert.equal(status, 200);
    assert.equal(json.cart, null);
    assert.equal(cookieValue(CART_COOKIE), undefined);
  });
}

test('reading a box that is gone answers no box, not an error', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik(() => ({ status: 404, body: { error: `Cart ${CART_ID} was not found.` } }));

  const { status, json } = await read(await GET());

  assert.equal(status, 200);
  assert.equal(json.cart, null);
  assert.equal(json.error, undefined);
  assert.equal(cookieValue(CART_COOKIE), undefined);
});

test('a conflict whose box is gone by the re-read drops the box too', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    if (request.method === 'GET') return { status: 404, body: { error: `Cart ${CART_ID} was not found.` } };
    return { status: 409, body: { code: AONIK_CODES.cartConflict, message: 'The cart changed.', status: 'Open' } };
  });

  const { status, json } = await read(await call(['size'], 'PATCH', { size: 12 }, 'v1'));

  assert.equal(status, 409);
  assert.equal(json.cart, null, 'never undefined: the tab must not keep a box that is gone');
  assert.equal(json.code, 'cart.missing', 'no longer a conflict: there is no box');
  assert.match(String(json.error), /no box/i);
  assert.equal(cookieValue(CART_COOKIE), undefined);
});

test('a conflict whose box cannot be re-read says nothing was updated here', async () => {
  resetCookies({ [CART_COOKIE]: GUEST_COOKIE });
  useAonik((request) => {
    if (request.method === 'GET') return { status: 500, body: { error: 'Boom.' } };
    return { status: 409, body: { code: 'concurrency_conflict', error: 'The resource was modified by another operation.' } };
  });
  const logged = mock.method(console, 'error', () => undefined);

  try {
    const { status, json } = await read(await call(['size'], 'PATCH', { size: 12 }, 'v1'));

    assert.equal(status, 409);
    assert.equal(json.code, 'cart.reload', 'a conflict (a lost race on the same version) only a reload can resolve');
    assert.equal(json.cart, undefined, 'the tab keeps its own box');
    assert.match(String(json.error), /Reload the page/);
    assert.doesNotMatch(String(json.error), /updated it here/);
  } finally {
    logged.mock.restore();
  }
});

/* ---- A box adopted into an account, while signed out --------------------------------- */

test('signed out, an adopted box is simply not shown — and its cookie is kept for signing back in', async () => {
  const adopted = JSON.stringify({ cartId: CART_ID });
  resetCookies({ [CART_COOKIE]: adopted });
  useAonik(() => ({ status: 404, body: { error: 'Not found.' } }));

  const reading = await read(await GET());
  assert.equal(reading.status, 200);
  assert.equal(reading.json.cart, null);

  const writing = await read(await call(['lines', 'l-1'], 'PATCH', { quantity: 2 }, 'v1'));
  assert.equal(writing.status, 404);
  assert.equal(writing.json.cart, null);

  assert.equal(aonikRequests.length, 0, 'nothing to authorize with, so nothing is asked');
  assert.equal(cookieValue(CART_COOKIE), adopted, 'the way back to the box survives');
});

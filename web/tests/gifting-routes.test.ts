import './support/runtime';
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { GET, POST, PUT } from '../src/app/api/gift-card/[action]/route';
import { DESIGN_GIFT_OPTIONS, EMPTY_GIFT } from '../src/lib/gifting/model';
import {
  aonikRequests,
  configureAonik,
  useAonik as stubAonik,
} from './support/aonik';
import {
  cookieValue,
  cookieWrites,
  resetCookies,
} from './support/next-headers';

configureAonik({ AONIK_DATA_MODE: 'live', LIVE_ORDERING_ENABLED: 'true' });
beforeEach(() => resetCookies());
const options = {
  ...DESIGN_GIFT_OPTIONS,
  enabled: true,
  version: 'approved-policy',
  emailSendTime: '09:00:00',
  neverExpires: true,
};
function call(action: string, draft = EMPTY_GIFT, version = '') {
  const request = new Request(`http://localhost/api/gift-card/${action}`, {
    method: action === 'draft' ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cart-Version': version,
      Origin: 'http://localhost',
    },
    body: JSON.stringify({ draft }),
  });
  return (action === 'draft' ? PUT : POST)(request, {
    params: Promise.resolve({ action }),
  });
}
function backend(
  overrides?: (
    request: (typeof aonikRequests)[number],
  ) => { status: number; body?: unknown } | undefined,
) {
  stubAonik((request) => {
    const overridden = overrides?.(request);
    if (overridden) return overridden;
    if (request.path.endsWith('/gift-cards/options'))
      return { status: 200, body: options };
    if (request.path === '/commerce/carts')
      return {
        status: 201,
        body: {
          id: 'gift-cart',
          anonymousToken: 'gift-private-proof',
          cartVersion: 'v1',
        },
      };
    if (request.path.endsWith('/payment'))
      return {
        status: 200,
        body: {
          status: 'processing',
          canEdit: true,
          cartVersion: 'v1',
          paymentIntentId: null,
        },
      };
    if (request.path.endsWith('/checkout-draft')) {
      return {
        status: 200,
        body: {
          status: 'Open',
          cartVersion: request.method === 'PUT' ? 'v2' : 'v1',
          draft:
            request.method === 'PUT'
              ? request.body
              : { deliveryNotes: 'Preserve this', gift: null },
        },
      };
    }
    return undefined;
  });
}
test('standalone gift uses its own private proof and saves partial draft without creating a purchase', async () => {
  backend();
  const response = await call('start', {
    ...EMPTY_GIFT,
    quantity: 10,
    message: 'Happy birthday',
  });
  assert.equal(response.status, 200);
  assert.ok(!(await response.text()).includes('gift-private-proof'));
  assert.ok(
    cookieValue('abbys-table-gift-cart')?.includes('gift-private-proof'),
  );
  assert.equal(
    cookieWrites.find((write) => write.name === 'abbys-table-gift-cart')
      ?.httpOnly,
    true,
  );
  assert.ok(!cookieWrites.some((write) => write.name === 'abbys-table-cart'));
  const saved = aonikRequests.find((request) => request.method === 'PUT')!;
  assert.equal(saved.headers['x-cart-token'], 'gift-private-proof');
  assert.equal(saved.headers['x-cart-version'], 'v1');
  assert.equal(
    (saved.body as { deliveryNotes: string }).deliveryNotes,
    'Preserve this',
  );
  assert.equal(
    (saved.body as { giftCardDraft: { quantity: number } }).giftCardDraft
      .quantity,
    10,
  );
  assert.ok(
    !aonikRequests.some(
      (request) =>
        request.path.endsWith('/gift-card-purchase') ||
        request.path.endsWith('/checkout'),
    ),
  );
});
test('old backend cannot create an unsaveable gift checkout draft', async () => {
  backend((request) =>
    request.path.endsWith('/gift-cards/options')
      ? {
          status: 200,
          body: {
            ...options,
            draftVersion: undefined,
            maximumQuantity: undefined,
          },
        }
      : undefined,
  );
  assert.equal((await call('start')).status, 400);
  assert.ok(
    !aonikRequests.some((request) => request.path === '/commerce/carts'),
  );
});
test('stale versions are forwarded instead of silently adopting a newer server version', async () => {
  backend();
  await call('start');
  backend((request) =>
    request.method === 'PUT'
      ? {
          status: 409,
          body: {
            code: 'commerce.cart_conflict',
            message: 'Reload the saved gift.',
          },
        }
      : undefined,
  );
  const response = await call('draft', EMPTY_GIFT, 'stale-tab');
  assert.equal(response.status, 409);
  assert.equal(
    aonikRequests.find((request) => request.method === 'PUT')?.headers[
      'x-cart-version'
    ],
    'stale-tab',
  );
});
test('disabled purchase sends no purchase or checkout mutation', async () => {
  backend((request) =>
    request.path.endsWith('/gift-cards/options')
      ? { status: 200, body: { ...options, enabled: false } }
      : undefined,
  );
  const response = await call('prepare', EMPTY_GIFT, 'v1');
  assert.equal(response.status, 400);
  assert.ok(!aonikRequests.some((request) => request.method !== 'GET'));
});
test('foreign-origin mutation is refused before backend requests', async () => {
  backend();
  const response = await POST(
    new Request('http://localhost/api/gift-card/start', {
      method: 'POST',
      headers: { Origin: 'https://elsewhere.test' },
      body: JSON.stringify({ draft: EMPTY_GIFT }),
    }),
    { params: Promise.resolve({ action: 'start' }) },
  );
  assert.equal(response.status, 403);
  assert.equal(aonikRequests.length, 0);
});

test('captured guest confirmation proof is recovered into an httpOnly cookie and never exposed to the browser', async () => {
  backend();
  await call('start');
  backend((request) =>
    request.path.endsWith('/payment/confirmation')
      ? {
          status: 200,
          body: {
            orderId: 'paid-order',
            paymentIntentId: 'captured-intent',
            status: 'succeeded',
            canEdit: false,
            cartVersion: 'paid-version',
            guestOrderToken: 'private-order-proof',
          },
        }
      : undefined,
  );
  const response = await GET(
    new Request('http://localhost/api/gift-card/payment'),
    { params: Promise.resolve({ action: 'payment' }) },
  );
  assert.equal(response.status, 200);
  assert.ok(!(await response.text()).includes('private-order-proof'));
  assert.ok(
    cookieValue('abbys-table-gift-payment')?.includes('private-order-proof'),
  );
  assert.equal(
    cookieWrites.find((write) => write.name === 'abbys-table-gift-payment')
      ?.httpOnly,
    true,
  );
  assert.ok(!aonikRequests.some((request) => request.method !== 'GET'));
});
test('removal clears the priced purchase but preserves typed details and advances the write version', async () => {
  backend();
  await call('start');
  backend((request) =>
    request.method === 'DELETE' && request.path.endsWith('/gift-card-purchase')
      ? { status: 200, body: { cartVersion: 'v3' } }
      : undefined,
  );
  const response = await call(
    'draft',
    { ...EMPTY_GIFT, message: 'Keep my message', removed: true },
    'v2',
  );
  assert.equal(response.status, 200);
  const answer = await response.json();
  assert.equal(answer.version, 'v3');
  assert.equal(answer.draft.message, 'Keep my message');
  assert.equal(
    aonikRequests.find((request) => request.method === 'DELETE')?.headers[
      'x-cart-version'
    ],
    'v2',
  );
});

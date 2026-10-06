import './support/runtime';

import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { AONIK_CODES } from '../src/lib/aonik/errors';
import { aonikAuthedFetch, SessionExpiredError } from '../src/lib/auth/server';
import {
  clearSession,
  isExpired,
  readSession,
  readSessionView,
  sessionFromToken,
  SESSION_COOKIE,
  writeSession,
  type CustomerSession,
} from '../src/lib/auth/session';
import { CART_COOKIE } from '../src/lib/cart/cartCookie';
import { adoptBoxCart } from '../src/lib/cart/server';

import { aonikRequests, configureAonik, useAonik } from './support/aonik';
import { cookieValue, cookieWrites, renderMode, resetCookies } from './support/next-headers';

/*
 * customer-identity: the session cookie, a 401 becoming the signed-out state,
 * and every branch of adopting a guest box on sign-in — against a stubbed Aonik.
 */

configureAonik({ AONIK_AUTH_CLIENT_ID: 'storefront' });

const NOW = 1_800_000_000_000;
const CART_ID = 'cart-1';
const CART_TOKEN = 'guest-token-secret';

function session(overrides: Partial<CustomerSession> = {}): CustomerSession {
  return {
    accessToken: 'access-1',
    expiresAt: Date.now() + 3_600_000,
    email: 'ada@example.com',
    ...overrides,
  };
}

function signedInWith(value: CustomerSession, extra: Record<string, string> = {}) {
  resetCookies({ [SESSION_COOKIE]: JSON.stringify(value), ...extra });
}

beforeEach(() => resetCookies());

/* ---- The session cookie ---------------------------------------------------- */

test('a token response becomes an absolute expiry', () => {
  const value = sessionFromToken({ accessToken: 'a', refreshToken: null, expiresIn: 300 }, 'ada@example.com', NOW);

  assert.equal(value.expiresAt, NOW + 300_000);
  assert.equal(value.refreshToken, undefined, 'null on the wire is absent here');
  assert.equal(value.email, 'ada@example.com');
});

test('a missing or nonsensical expiry is treated as a short one', () => {
  for (const expiresIn of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const value = sessionFromToken({ accessToken: 'a', expiresIn }, undefined, NOW);
    assert.equal(value.expiresAt, NOW + 60_000, `expiresIn ${expiresIn}`);
  }
});

test('a token counts as expired thirty seconds early', () => {
  assert.equal(isExpired(session({ expiresAt: NOW + 29_000 }), NOW), true);
  assert.equal(isExpired(session({ expiresAt: NOW + 31_000 }), NOW), false);
});

test('the session round-trips through an httpOnly cookie', async () => {
  const value = session({ refreshToken: 'refresh-1' });
  await writeSession(value);

  assert.equal(cookieWrites.at(-1)?.httpOnly, true);
  assert.deepEqual(await readSession(), value);
});

test('a tombstone or a malformed cookie reads as no session', async () => {
  for (const raw of ['deleted', '{}', '{"accessToken":"","expiresAt":1}', '{"accessToken":"a"}', 'null']) {
    resetCookies({ [SESSION_COOKIE]: raw });
    assert.equal(await readSession(), null, raw);
  }
});

test('the page view carries the email and no token', async () => {
  signedInWith(session());
  const view = await readSessionView();
  assert.deepEqual(view, { isSignedIn: true, email: 'ada@example.com' });

  signedInWith(session({ expiresAt: Date.now() - 1 }));
  assert.deepEqual(await readSessionView(), { isSignedIn: false });
});

/* ---- 401 → signed out ------------------------------------------------------- */

test('a 401 from Aonik clears the session and becomes the signed-out state', async () => {
  signedInWith(session());
  useAonik(() => ({ status: 401, body: { error: 'Unauthorized' } }));

  await assert.rejects(aonikAuthedFetch('/commerce/storefront/orders'), SessionExpiredError);

  assert.equal(aonikRequests[0].headers.authorization, 'Bearer access-1');
  assert.equal(cookieValue(SESSION_COOKIE), undefined);
});

test('a 401 during a page render is still the signed-out state, not an error page', async () => {
  // /account/orders reads orders in a Server Component, where Next seals the
  // cookie store. A revoked token must still surface as SessionExpiredError,
  // which the page turns into its sign-in prompt.
  signedInWith(session());
  renderMode();
  useAonik(() => ({ status: 401, body: { error: 'Unauthorized' } }));

  await assert.rejects(aonikAuthedFetch('/commerce/storefront/orders'), SessionExpiredError);
  assert.ok(cookieValue(SESSION_COOKIE), 'a render cannot clear it; the next action will');
});

test('outside a render, clearing the session really clears it', async () => {
  signedInWith(session());
  await clearSession();
  assert.equal(cookieValue(SESSION_COOKIE), undefined);
});

test('an expired session with no refresh token signs out without calling Aonik', async () => {
  signedInWith(session({ expiresAt: Date.now() - 1 }));
  useAonik(() => undefined);

  await assert.rejects(aonikAuthedFetch('/commerce/storefront/orders'), SessionExpiredError);

  assert.equal(aonikRequests.length, 0);
  assert.equal(cookieValue(SESSION_COOKIE), undefined);
});

test('an expired session with a refresh token is renewed, then the call goes through', async () => {
  signedInWith(session({ expiresAt: Date.now() - 1, refreshToken: 'refresh-1' }));
  useAonik((request) => {
    if (request.path === '/auth/token') {
      return { status: 200, body: { accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 300, tokenType: 'Bearer', idToken: null } };
    }
    if (request.path === '/commerce/storefront/orders') return { status: 200, body: { items: [] } };
    return undefined;
  });

  assert.deepEqual(await aonikAuthedFetch('/commerce/storefront/orders'), { items: [] });

  assert.deepEqual(aonikRequests[0].body, {
    grantType: 'refresh_token',
    clientId: 'storefront',
    refreshToken: 'refresh-1',
  });
  assert.equal(aonikRequests[1].headers.authorization, 'Bearer access-2');
  assert.equal(JSON.parse(cookieValue(SESSION_COOKIE) ?? '{}').accessToken, 'access-2');
});

test('a refresh that fails is the same as no session', async () => {
  signedInWith(session({ expiresAt: Date.now() - 1, refreshToken: 'refresh-1' }));
  useAonik(() => ({ status: 400, body: { error: 'invalid_grant' } }));

  await assert.rejects(aonikAuthedFetch('/commerce/storefront/orders'), SessionExpiredError);
  assert.equal(cookieValue(SESSION_COOKIE), undefined);
});

/* ---- Adopt on sign-in ---------------------------------------------------------- */

const GUEST_CART = JSON.stringify({ cartId: CART_ID, cartToken: CART_TOKEN });

test('nothing to adopt without a guest token or without a session', async () => {
  useAonik(() => undefined);

  signedInWith(session());
  assert.equal(await adoptBoxCart(), 'nothing-to-adopt');

  signedInWith(session(), { [CART_COOKIE]: JSON.stringify({ cartId: CART_ID }) });
  assert.equal(await adoptBoxCart(), 'nothing-to-adopt', 'an adopted cart has no token left');

  resetCookies({ [CART_COOKIE]: GUEST_CART });
  assert.equal(await adoptBoxCart(), 'nothing-to-adopt', 'signed out');

  assert.equal(aonikRequests.length, 0);
});

test('a successful adoption drops the dead guest token and keeps the cart', async () => {
  signedInWith(session(), { [CART_COOKIE]: GUEST_CART });
  useAonik((request) =>
    request.method === 'POST' && request.path === `/commerce/carts/${CART_ID}/adopt`
      ? { status: 200, body: {} }
      : undefined,
  );

  assert.equal(await adoptBoxCart(), 'adopted');

  assert.equal(aonikRequests[0].headers['x-cart-token'], CART_TOKEN);
  assert.equal(aonikRequests[0].headers.authorization, 'Bearer access-1');
  assert.deepEqual(JSON.parse(cookieValue(CART_COOKIE) ?? '{}'), { cartId: CART_ID });
});

test('a 404 on adoption clears the cart cookie without failing sign-in', async () => {
  signedInWith(session(), { [CART_COOKIE]: GUEST_CART });
  useAonik(() => ({ status: 404, body: { error: 'Not found.' } }));

  assert.equal(await adoptBoxCart(), 'skipped');
  assert.equal(cookieValue(CART_COOKIE), undefined);
  assert.ok(cookieValue(SESSION_COOKIE), 'still signed in');
});

test('a storefront-validation 400 leaves the cart alone, as an expected outcome', async () => {
  signedInWith(session(), { [CART_COOKIE]: GUEST_CART });
  useAonik(() => ({ status: 400, body: { error: 'Cart is not open.', code: AONIK_CODES.storefrontValidation } }));
  const logged = mock.method(console, 'error', () => undefined);

  try {
    assert.equal(await adoptBoxCart(), 'skipped');
    assert.equal(cookieValue(CART_COOKIE), GUEST_CART);
    // Expected, so not logged — which is what tells this branch apart from the
    // catch-all below.
    assert.equal(logged.mock.callCount(), 0);
  } finally {
    logged.mock.restore();
  }
});

test('an unexpected failure is logged, not thrown, and leaves the cart alone', async () => {
  signedInWith(session(), { [CART_COOKIE]: GUEST_CART });
  useAonik(() => ({ status: 500, body: { error: 'Boom.' } }));
  const logged = mock.method(console, 'error', () => undefined);

  try {
    assert.equal(await adoptBoxCart(), 'skipped');
    assert.equal(logged.mock.callCount(), 1);
    assert.equal(cookieValue(CART_COOKIE), GUEST_CART);
  } finally {
    logged.mock.restore();
  }
});

import './support/runtime';

import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeEach, test } from 'node:test';

import OrderDetailPage from '../src/app/(site)/account/orders/[orderId]/page';
import OrdersPage from '../src/app/(site)/account/orders/page';
import { GET as refresh } from '../src/app/account/refresh/route';
import { SESSION_COOKIE, type CustomerSession } from '../src/lib/auth/session';
import { DESKTOP_STATIC_EXAMPLES, autoHidesOnDesktop } from '../src/lib/site-header/visibility';

import { aonikRequests, configureAonik, useAonik } from './support/aonik';
import { cookieValue, renderMode, resetCookies } from './support/next-headers';

/*
 * The account area is for signed-in customers only (#33): a signed-out request
 * is redirected to Log in with a return path - server-side, never a signed-out
 * panel - an expired session is renewed on the way, and a session that dies
 * mid-render becomes the same redirect.
 */

configureAonik({ AONIK_AUTH_CLIENT_ID: 'storefront' });

beforeEach(() => resetCookies());

function session(overrides: Partial<CustomerSession> = {}): CustomerSession {
  return { accessToken: 'access-1', expiresAt: Date.now() + 3_600_000, email: 'ada@example.com', ...overrides };
}

function signedInWith(value: CustomerSession) {
  resetCookies({ [SESSION_COOKIE]: JSON.stringify(value) });
  // Pages render with a sealed cookie store, as in Next.
  renderMode();
}

async function redirectedTo(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? '';
    if (digest.startsWith('NEXT_REDIRECT')) return digest.split(';')[2];
    throw error;
  }
  assert.fail('expected a redirect');
}

const orders = (page?: string) => OrdersPage({ searchParams: Promise.resolve(page ? { page } : {}) });
const order = () => OrderDetailPage({ params: Promise.resolve({ orderId: 'ord-1' }) });

test('the order history sends a signed-out request to Log in, carrying the page', async () => {
  resetCookies();
  renderMode();
  useAonik(() => undefined);

  assert.equal(await redirectedTo(orders()), '/login?next=%2Faccount%2Forders');
  assert.equal(await redirectedTo(orders('3')), '/login?next=%2Faccount%2Forders%3Fpage%3D3');
  assert.equal(aonikRequests.length, 0, 'nothing is read for a visitor with no session');
});

test('an order sends a signed-out request to Log in, carrying the order', async () => {
  resetCookies();
  renderMode();
  useAonik(() => undefined);

  assert.equal(await redirectedTo(order()), '/login?next=%2Faccount%2Forders%2Ford-1');
});

test('an expired session with a refresh token goes via the refresh route, not to Log in', async () => {
  signedInWith(session({ expiresAt: Date.now() - 1, refreshToken: 'refresh-1' }));
  useAonik(() => undefined);

  assert.equal(await redirectedTo(orders('2')), '/account/refresh?next=%2Faccount%2Forders%3Fpage%3D2');
  assert.equal(aonikRequests.length, 0, 'a render never spends the refresh token');
});

test('an expired session with nothing to refresh with is signed out', async () => {
  signedInWith(session({ expiresAt: Date.now() - 1 }));
  useAonik(() => undefined);

  assert.equal(await redirectedTo(orders()), '/login?next=%2Faccount%2Forders');
});

test('a session Aonik rejects mid-render becomes the same redirect, not a signed-out panel', async () => {
  signedInWith(session());
  useAonik((request) =>
    request.path.startsWith('/commerce/storefront/orders') ? { status: 401, body: { error: 'expired' } } : undefined,
  );

  assert.equal(await redirectedTo(orders()), '/login?next=%2Faccount%2Forders');
  assert.equal(await redirectedTo(order()), '/login?next=%2Faccount%2Forders%2Ford-1');
});

test('the refresh route renews the cookie and goes on to the page', async () => {
  resetCookies({ [SESSION_COOKIE]: JSON.stringify(session({ expiresAt: Date.now() - 1, refreshToken: 'refresh-1' })) });
  useAonik((request) =>
    request.path === '/auth/token'
      ? { status: 200, body: { accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 300, tokenType: 'Bearer', idToken: null } }
      : undefined,
  );

  const response = await refresh(new Request('https://shop.test/account/refresh?next=%2Faccount%2Forders%3Fpage%3D2'));

  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), '/account/orders?page=2');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(JSON.parse(cookieValue(SESSION_COOKIE) ?? '{}').accessToken, 'access-2');
});

test('the refresh route sends a session that cannot be renewed to Log in, and clears it: no loop', async () => {
  resetCookies({ [SESSION_COOKIE]: JSON.stringify(session({ expiresAt: Date.now() - 1, refreshToken: 'refresh-1' })) });
  useAonik(() => ({ status: 400, body: { error: 'invalid_grant' } }));

  const response = await refresh(new Request('https://shop.test/account/refresh?next=%2Faccount%2Forders'));

  assert.equal(response.headers.get('Location'), '/login?next=%2Faccount%2Forders');
  assert.equal(cookieValue(SESSION_COOKIE), undefined);
});

test('the refresh route never leaves the site', async () => {
  resetCookies({ [SESSION_COOKIE]: JSON.stringify(session()) });
  useAonik(() => undefined);

  for (const next of ['//evil.example', 'https://evil.example', '/\\evil.example', '']) {
    const response = await refresh(new Request(`https://shop.test/account/refresh?next=${encodeURIComponent(next)}`));
    assert.equal(response.headers.get('Location'), '/account/orders', JSON.stringify(next));
  }
});

test('/register is retired to Log in with a permanent redirect', async () => {
  const load = new Function('url', 'return import(url)') as (url: string) => Promise<{ default: { redirects(): Promise<unknown[]> } }>;
  const config = await load(pathToFileURL(path.resolve(__dirname, '..', '..', 'next.config.mjs')).href);

  assert.deepEqual(await config.default.redirects(), [
    { source: '/register', destination: '/login', permanent: true },
  ]);
});

test('Log in and Forgot password keep a static desktop header', () => {
  assert.ok(DESKTOP_STATIC_EXAMPLES.includes('/login'));
  assert.ok(DESKTOP_STATIC_EXAMPLES.includes('/forgot-password'));
  for (const route of DESKTOP_STATIC_EXAMPLES) assert.equal(autoHidesOnDesktop(route), false, route);
});

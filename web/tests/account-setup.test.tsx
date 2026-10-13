import './support/runtime';
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import { startAccountSetup, completeAccountSetup, SETUP_COOKIE, SETUP_CALLBACK, setupByAddress } from '../src/lib/auth/accountSetup';
import { SESSION_COOKIE } from '../src/lib/auth/session';
import { GET as callback } from '../src/app/account/setup/callback/route';
import { cookieValue, cookieWrites, resetCookies } from './support/next-headers';
import { configureAonik } from './support/aonik';

const ISSUER = 'https://identity.test';
const ORIGIN = 'https://shop.test';
const TOKEN = 'opaque-paid-email-token';
const calls: { url: URL; init?: RequestInit }[] = [];
let resolveStatus: number, completeStatus: number, providerStatus: number;
let discoveredIssuer: string, tokenEndpoint: string;
beforeEach(() => {
  resetCookies();
  setupByAddress.clear();
  calls.length = 0;
  resolveStatus = completeStatus = providerStatus = 200;
  discoveredIssuer = ISSUER;
  tokenEndpoint = ISSUER + '/token';
  configureAonik({
    AONIK_AUTH_CLIENT_ID: 'storefront', AONIK_OIDC_ISSUER: ISSUER,
    AONIK_OIDC_AUDIENCE: 'aonik-api', STOREFRONT_ORIGIN: ORIGIN,
    ACCOUNT_SETUP_COOKIE_KEY: randomBytes(32).toString('hex'),
  });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    const json = (body: unknown, status = 200) => Response.json(body, { status });
    if (url.href === ISSUER + '/.well-known/openid-configuration')
      return json({ issuer: discoveredIssuer, authorization_endpoint: ISSUER + '/authorize', token_endpoint: tokenEndpoint });
    if (url.href === ISSUER + '/token')
      return json({ access_token: 'verified-provider-access', token_type: 'Bearer', expires_in: 3600, refresh_token: 'private-refresh' }, providerStatus);
    if (url.href === 'https://aonik.test/identity/account-access/resolve')
      return json({ status: 'ready' }, resolveStatus);
    if (url.href === 'https://aonik.test/identity/account-access/complete')
      return json({ status: 'complete' }, completeStatus);
    if (url.href === 'https://aonik.test/profiles/customers/me')
      return json({ email: 'verified@example.test' });
    throw new Error('Unexpected test request');
  };
});
async function start() {
  const result = await startAccountSetup(TOKEN);
  assert.equal(result.status, 'redirect');
  if (result.status !== 'redirect') throw new Error('Expected redirect');
  return new URL(result.url);
}
function params(url: URL) {
  return new URLSearchParams({ state: url.searchParams.get('state')!, code: 'single-use-code' });
}

test('setup uses S256 and an encrypted HttpOnly browser-bound attempt; the email link never enters an OAuth URL', async () => {
  const url = await start();
  assert.equal(url.origin, ISSUER);
  assert.equal(url.searchParams.get('redirect_uri'), ORIGIN + SETUP_CALLBACK);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('max_age'), '0');
  assert.equal(url.searchParams.get('audience'), 'aonik-api');
  assert.ok(!url.href.includes(TOKEN));
  const encrypted = cookieValue(SETUP_COOKIE)!;
  assert.ok(!encrypted.includes(TOKEN));
  assert.ok(!Buffer.from(encrypted, 'base64url').toString('utf8').includes(TOKEN));
  const stored = cookieWrites.find(x => x.name === SETUP_COOKIE)!;
  assert.equal(stored.httpOnly, true);
  assert.equal(stored.maxAge, 600);
  assert.equal(await completeAccountSetup(params(url)), 'complete');
  const exchange = calls.find(x => x.url.pathname === '/token')!;
  const body = new URLSearchParams(String(exchange.init?.body));
  assert.equal(createHash('sha256').update(body.get('code_verifier')!).digest('base64url'), url.searchParams.get('code_challenge'));
  assert.equal(body.get('redirect_uri'), ORIGIN + SETUP_CALLBACK);
  const complete = calls.find(x => x.url.pathname.endsWith('/complete'))!;
  assert.deepEqual(JSON.parse(String(complete.init?.body)), { token: TOKEN });
  assert.equal(new Headers(complete.init?.headers).get('authorization'), 'Bearer verified-provider-access');
  assert.ok(cookieValue(SESSION_COOKIE));
  assert.equal(JSON.parse(cookieValue(SESSION_COOKIE)!).email, 'verified@example.test');
  assert.equal(cookieValue(SETUP_COOKIE), undefined);
  assert.equal(await completeAccountSetup(params(url)), 'gone');
});

test('missing configuration and expired links never start provider registration', async () => {
  delete process.env.ACCOUNT_SETUP_COOKIE_KEY;
  assert.deepEqual(await startAccountSetup(TOKEN), { status: 'unavailable' });
  assert.equal(calls.length, 0);
  process.env.ACCOUNT_SETUP_COOKIE_KEY = randomBytes(32).toString('hex');
  resolveStatus = 410;
  assert.deepEqual(await startAccountSetup(TOKEN), { status: 'gone' });
  assert.ok(!calls.some(x => x.url.origin === ISSUER));
  assert.equal(cookieValue(SETUP_COOKIE), undefined);
});

test('discovery cannot send the code or verifier to another issuer or origin', async () => {
  discoveredIssuer = 'https://other.test';
  assert.deepEqual(await startAccountSetup(TOKEN), { status: 'failed' });
  discoveredIssuer = ISSUER;
  tokenEndpoint = 'https://other.test/token';
  assert.deepEqual(await startAccountSetup(TOKEN), { status: 'failed' });
  assert.equal(cookieValue(SETUP_COOKIE), undefined);
});

test('wrong state, duplicate parameters, missing cookie and provider cancellation never exchange a code', async () => {
  for (const kind of ['wrong', 'duplicate', 'missing', 'cancel', 'issuer']) {
    const url = await start();
    const query = params(url);
    if (kind === 'wrong') query.set('state', randomBytes(32).toString('base64url'));
    if (kind === 'duplicate') query.append('state', query.get('state')!);
    if (kind === 'missing') resetCookies();
    if (kind === 'cancel') query.set('error', 'access_denied');
    if (kind === 'issuer') query.set('iss', 'https://other.test');
    assert.notEqual(await completeAccountSetup(query), 'complete');
    assert.equal(cookieValue(SESSION_COOKIE), undefined);
  }
  assert.ok(!calls.some(x => x.url.pathname === '/token'));
});

test('encrypted flow expires and cannot be moved between tenants or changed', async (t) => {
  for (const kind of ['expired', 'tenant', 'tampered']) {
    process.env.AONIK_TENANT_ID = 'tenant-test';
    const url = await start();
    if (kind === 'expired') {
      const future = Date.now() + 601_000;
      t.mock.method(Date, 'now', () => future);
    }
    if (kind === 'tenant') process.env.AONIK_TENANT_ID = 'other-tenant';
    if (kind === 'tampered') {
      const bytes = Buffer.from(cookieValue(SETUP_COOKIE)!, 'base64url');
      bytes[20] ^= 1;
      resetCookies({ [SETUP_COOKIE]: bytes.toString('base64url') });
    }
    assert.notEqual(await completeAccountSetup(params(url)), 'complete');
    t.mock.restoreAll();
    assert.equal(cookieValue(SESSION_COOKIE), undefined);
  }
  assert.ok(!calls.some(x => x.url.pathname === '/token'));
});

test('unverified, mismatched or expired backend proof never creates a session', async () => {
  for (const status of [401, 403, 410, 503]) {
    const url = await start();
    completeStatus = status;
    assert.notEqual(await completeAccountSetup(params(url)), 'complete');
    assert.equal(cookieValue(SESSION_COOKIE), undefined);
  }
});

test('provider failures are neutral and leave no storefront session', async () => {
  const url = await start();
  providerStatus = 400;
  assert.equal(await completeAccountSetup(params(url)), 'failed');
  assert.equal(cookieValue(SESSION_COOKIE), undefined);
  assert.ok(!calls.some(x => x.url.pathname.endsWith('/complete')));
});

test('the callback strips OAuth parameters and returns a private relative redirect', async () => {
  const url = await start();
  const result = await callback(new Request(ORIGIN + SETUP_CALLBACK + '?' + params(url)));
  assert.equal(result.status, 303);
  assert.equal(result.headers.get('location'), '/account');
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.headers.get('referrer-policy'), 'no-referrer');
  assert.match(result.headers.get('x-robots-tag')!, /noindex/);
});

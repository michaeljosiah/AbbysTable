import './support/runtime';

import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeEach, test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';

import AccountAccessPage, { metadata } from '../src/app/(site)/account/access/page';
import {
  ACCESS_RESEND_PATH,
  ACCESS_RESOLVE_PATH,
  MAX_ACCESS_TOKEN_LENGTH,
  checkByAddress,
  resendAccessLink,
  resendByAddress,
  resolveAccessLink,
  usableAccessToken,
} from '../src/lib/auth/accountAccess';
import { resendAccessLinkAction, resolveAccessLinkAction } from '../src/lib/auth/accessActions';
import { ACCESS_COPY } from '../src/lib/content/accountAccess';

import { aonikRequests, configureAonik, useAonik } from './support/aonik';
import { resetCookies, setRequestHeaders } from './support/next-headers';

/*
 * The emailed secure link (#34): resolve and resend against a stubbed Aonik,
 * the neutral answers, the page's copy, and the headers that keep the token
 * out of caches, indexes and Referers.
 */

configureAonik({ AONIK_AUTH_CLIENT_ID: 'storefront' });

beforeEach(() => {
  resetCookies();
  checkByAddress.clear();
  resendByAddress.clear();
});

const TOKEN = 'CfDJ8-opaque_token.value';

test('only a bounded, printable token is ever sent', () => {
  assert.equal(usableAccessToken(TOKEN), true);
  for (const bad of ['', ' ', 'a b', 'a\nb', 'x'.repeat(MAX_ACCESS_TOKEN_LENGTH + 1), null, undefined, 5]) {
    assert.equal(usableAccessToken(bad), false, String(bad));
  }
});

test('resolve posts the token and reads ready; it consumes nothing and sends no credentials', async () => {
  useAonik((request) => (request.path === ACCESS_RESOLVE_PATH ? { status: 200, body: { status: 'ready' } } : undefined));

  assert.equal(await resolveAccessLink(TOKEN, '203.0.113.9'), 'ready');

  assert.equal(aonikRequests.length, 1);
  assert.equal(aonikRequests[0].method, 'POST');
  assert.deepEqual(aonikRequests[0].body, { token: TOKEN });
  assert.equal(aonikRequests[0].headers.authorization, undefined);
  assert.equal(aonikRequests[0].headers['x-forwarded-for'], '203.0.113.9');
});

test('every link Aonik refuses is one answer: gone', async () => {
  useAonik(() => ({ status: 410 }));
  assert.equal(await resolveAccessLink(TOKEN), 'gone');

  useAonik(() => ({ status: 200, body: { status: 'something-else' } }));
  assert.equal(await resolveAccessLink(TOKEN), 'gone');
});

test('a link that is not a token is gone without asking Aonik', async () => {
  useAonik(() => undefined);
  for (const bad of ['', 'x'.repeat(MAX_ACCESS_TOKEN_LENGTH + 1), 'a b']) {
    assert.equal(await resolveAccessLink(bad), 'gone');
  }
  assert.equal(aonikRequests.length, 0);
});

test('an outage or a throttle is "could not check", not "gone": the link was not judged', async () => {
  useAonik(() => ({ status: 429 }));
  assert.equal(await resolveAccessLink(TOKEN), 'failed');
  useAonik(() => ({ status: 503 }));
  assert.equal(await resolveAccessLink(TOKEN), 'failed');
});

test('on demo data the link cannot be checked and nothing is sent', async () => {
  const saved = { url: process.env.AONIK_API_URL, tenant: process.env.AONIK_TENANT_ID };
  delete process.env.AONIK_API_URL;
  delete process.env.AONIK_TENANT_ID;
  try {
    useAonik(() => undefined);
    assert.equal(await resolveAccessLink(TOKEN), 'unavailable');
    assert.equal(await resendAccessLink(TOKEN), 'unavailable');
    assert.equal(aonikRequests.length, 0);
  } finally {
    process.env.AONIK_API_URL = saved.url;
    process.env.AONIK_TENANT_ID = saved.tenant;
  }
});

test('resend posts the ORIGINAL token and reads no body', async () => {
  useAonik((request) => (request.path === ACCESS_RESEND_PATH ? { status: 202 } : undefined));

  assert.equal(await resendAccessLink(TOKEN, '203.0.113.9'), 'requested');

  assert.deepEqual(aonikRequests[0].body, { token: TOKEN });
  assert.equal(aonikRequests[0].headers['x-forwarded-for'], '203.0.113.9');
});

test('resend answers the same for a token that is not one, and for a throttle, without claiming anything', async () => {
  useAonik(() => undefined);
  assert.equal(await resendAccessLink(''), 'requested');
  assert.equal(aonikRequests.length, 0);

  useAonik(() => ({ status: 429 }));
  assert.equal(await resendAccessLink(TOKEN), 'requested');

  useAonik(() => ({ status: 500 }));
  assert.equal(await resendAccessLink(TOKEN), 'failed');
});

test('the actions limit by address: resolves answer "could not check", resends stay neutral', async () => {
  useAonik((request) => (request.path === ACCESS_RESOLVE_PATH ? { status: 410 } : { status: 202 }));
  setRequestHeaders({ 'x-forwarded-for': '198.51.100.4' });

  for (let attempt = 0; attempt < 30; attempt++) assert.equal(await resolveAccessLinkAction(TOKEN), 'gone');
  assert.equal(await resolveAccessLinkAction(TOKEN), 'failed');
  assert.equal(aonikRequests.length, 30);

  aonikRequests.length = 0;
  for (let attempt = 0; attempt < 5; attempt++) await resendAccessLinkAction(TOKEN);
  assert.equal(await resendAccessLinkAction(TOKEN), 'requested');
  assert.equal(aonikRequests.length, 5, 'the sixth never reaches Aonik');
});

test('the page is the design’s "Link no longer valid" copy, verbatim, and noindex', () => {
  assert.equal(ACCESS_COPY.eyebrow, 'Secure link');
  assert.equal(ACCESS_COPY.gone.heading, 'This link is no longer valid.');
  assert.equal(ACCESS_COPY.gone.lede, 'For your security, this link has expired or has already been used.');
  assert.equal(ACCESS_COPY.gone.send, 'Send a new link');
  assert.equal(ACCESS_COPY.gone.sentHeading, 'Check your email');
  assert.match(ACCESS_COPY.gone.sentBody, /^If this link belongs to an account, we’ve sent a new one\./);
  assert.deepEqual(metadata.robots, { index: false, follow: false });
});

test('the server renders a neutral shell: no token, no verdict before the browser has read the fragment', () => {
  const html = renderToStaticMarkup(AccountAccessPage());

  assert.match(html, /Checking your link…/);
  assert.doesNotMatch(html, /no longer valid|Send a new link|token/i);
});

test('the secure-link page is never cached, never indexed and leaves by no Referer', async () => {
  const load = new Function('url', 'return import(url)') as (
    url: string,
  ) => Promise<{ default: { headers(): Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>> } }>;
  const config = await load(pathToFileURL(path.resolve(__dirname, '..', '..', 'next.config.mjs')).href);

  const rule = (await config.default.headers()).find((entry) => entry.source === '/account/access');
  assert.ok(rule);
  const headers = Object.fromEntries(rule.headers.map((header) => [header.key, header.value]));
  assert.equal(headers['Cache-Control'], 'no-store');
  assert.equal(headers['Referrer-Policy'], 'no-referrer');
  assert.match(headers['X-Robots-Tag'], /noindex/);
});

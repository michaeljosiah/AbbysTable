import './support/runtime';

import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import type { ReactElement } from 'react';

import NotFound from '../src/app/not-found';
import { Footer } from '../src/components/layout/Footer';
import { Header } from '../src/components/layout/Header';
import { SiteChrome } from '../src/components/layout/SiteChrome';

import { aonikRequests, configureAonik, useAonik } from './support/aonik';
import { renderMode, resetCookies } from './support/next-headers';

/*
 * Next renders the root 404 into EVERY document request, not only for
 * unmatched URLs. So the chrome must never wait on Aonik: a slow Aonik would
 * hold every page open, and a failing one would turn the 404 — and, through
 * the `(site)` layout, every marketing page — into a 500.
 *
 * The announcement bar was the chrome's only commerce data (the earliest
 * delivery date). The v2 design dropped it site-wide (#10), so the chrome now
 * makes no Aonik request at all, on any route.
 */

configureAonik({ AONIK_DATA_MODE: 'live' });

/** Aonik is down: every request fails. */
const failingAonik = () => ({ status: 503, body: { title: 'Service Unavailable' } });

beforeEach(() => {
  resetCookies();
  renderMode();
});

test('the root 404 renders the site chrome — the same chrome as every marketing page', () => {
  const element = NotFound();
  assert.equal(element.type, SiteChrome);
  assert.deepEqual(Object.keys(element.props).sort(), ['children']);
});

test('the chrome makes no Aonik request at all, so a failing Aonik cannot fail it', async () => {
  useAonik(failingAonik);

  const chrome = await SiteChrome({ children: null });

  assert.equal(aonikRequests.length, 0);
  // Header, <main>, footer — and nothing before the header: no promo strip.
  const parts = chrome.props.children as ReactElement[];
  assert.deepEqual(
    parts.map((part) => part.type),
    [Header, 'main', Footer],
  );
});

test('nothing in the chrome reaches the network — not Aonik, not anything', async () => {
  const calls: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input instanceof Request ? input.url : input));
    throw new Error('the chrome must not fetch');
  }) as typeof fetch;

  try {
    await SiteChrome({ children: null });
    await SiteChrome({ children: NotFound() });
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.deepEqual(calls, []);
});

test('the chrome hands the server session to the header (a cookie read only)', async () => {
  const chrome = await SiteChrome({ children: null });
  const [header] = chrome.props.children as ReactElement<{ session: { isSignedIn: boolean } }>[];
  assert.equal(header.props.session.isSignedIn, false);
});

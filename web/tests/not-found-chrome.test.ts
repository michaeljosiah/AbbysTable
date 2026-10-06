import './support/runtime';

import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import NotFound from '../src/app/not-found';
import { SiteChrome } from '../src/components/layout/SiteChrome';

import { aonikRequests, configureAonik, useAonik } from './support/aonik';
import { renderMode, resetCookies } from './support/next-headers';

/*
 * Next renders the root 404 into EVERY document request, not only for
 * unmatched URLs. So its chrome must never wait on Aonik: a slow Aonik would
 * hold every page open, and a failing one would turn the 404 into a 500.
 */

configureAonik({ AONIK_DATA_MODE: 'live' });

/** Aonik is down: every request fails. */
const failingAonik = () => ({ status: 503, body: { title: 'Service Unavailable' } });

beforeEach(() => {
  resetCookies();
  renderMode();
});

test('the root 404 renders the site chrome without the delivery date', () => {
  const element = NotFound();
  assert.equal(element.type, SiteChrome);
  assert.equal(element.props.withDeliveryDate, false);
});

test('without the delivery date the chrome makes no Aonik request, so cannot fail', async () => {
  useAonik(failingAonik);

  const chrome = await SiteChrome({ children: null, withDeliveryDate: false });

  assert.equal(aonikRequests.length, 0);
  const [announcement] = chrome.props.children;
  assert.equal(announcement.props.earliestDeliveryLabel, null);
});

test('the site layout’s chrome does read the delivery date, and fails with Aonik', async () => {
  // The control for the test above: the stub is live, and the default fetches.
  useAonik(failingAonik);

  await assert.rejects(SiteChrome({ children: null }));
  assert.deepEqual(
    aonikRequests.map((request) => request.path),
    ['/commerce/config/delivery'],
  );
});

import './support/runtime';

import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { GET as newsletterConsent } from '../src/app/api/newsletter/route';
import { Footer, NewsletterSignup } from '../src/components/layout/Footer';
import { SiteChrome } from '../src/components/layout/SiteChrome';
import { HttpAonikClient, MockAonikClient } from '../src/lib/aonik/client';
import { AonikError } from '../src/lib/aonik/errors';
import { publishedList, readConsentVersion, readPublishedLists, type SignupLists } from '../src/lib/aonik/signupLists';
import { isEmailAddress } from '../src/lib/email';
import { subscribeNewsletterAction } from '../src/lib/newsletter/actions';
import { NEWSLETTER_MESSAGES, subscribeNewsletter } from '../src/lib/newsletter/subscribe';
import { SIGNUP_FORM_CHANGED } from '../src/lib/signup/consent';

import { AONIK_BASE, TENANT_ID, aonikRequests, configureAonik, useAonik } from './support/aonik';
import { resetCookies } from './support/next-headers';

/*
 * Aonik's sign-up lists (michaeljosiah/aonik#357): what the storefront reads
 * as published, and the footer newsletter end to end. Notify-me and the
 * Private Table waitlist are covered with their pages (delivery-faqs,
 * private-table).
 */

const env = process.env as Record<string, string | undefined>;

const NEWSLETTER = {
  listType: 'newsletter',
  consentVersion: 'newsletter-v1',
  consentText: 'We use your email for kitchen notes and offers only. Unsubscribe any time.',
};

const textOf = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ').trim();

beforeEach(() => resetCookies());

/* ---- What counts as published --------------------------------------------------- */

test('a published list is whole or it is not offered', () => {
  const services = [
    { id: 'recipe-development', label: 'Recipe development' },
    { id: 'x'.repeat(65), label: 'Too long an id' },
    { id: 'not-sure', label: '' },
  ];
  const lists = readPublishedLists({
    lists: [
      NEWSLETTER,
      // A second newsletter is a duplicate: the first wins.
      { ...NEWSLETTER, consentVersion: 'newsletter-v2' },
      { listType: 'delivery-availability', consentVersion: 'delivery v1', consentText: 'Only to say when we reach you.' },
      { listType: 'private-table', consentVersion: 'pt-1', consentText: 'Only about Private Table.', services },
      { listType: 'loyalty', consentVersion: 'v1', consentText: 'Unknown list.' },
      { listType: 'newsletter' },
    ],
  });

  assert.deepEqual(lists.map((list) => [list.listType, list.consentVersion]), [
    ['newsletter', 'newsletter-v1'],
    ['delivery-availability', 'delivery v1'],
    ['private-table', 'pt-1'],
  ]);
  assert.deepEqual(publishedList(lists, 'private-table')?.services, [{ id: 'recipe-development', label: 'Recipe development' }]);
  assert.equal(publishedList(lists, 'newsletter')?.services, null);

  // No wording, no form: a version without text, text without a version, untrimmed values.
  for (const broken of [
    { ...NEWSLETTER, consentText: '' },
    { ...NEWSLETTER, consentText: ' padded ' },
    { ...NEWSLETTER, consentVersion: '' },
    { ...NEWSLETTER, consentVersion: 'x'.repeat(33) },
    { ...NEWSLETTER, consentVersion: 'v1\u0007' },
  ]) {
    assert.deepEqual(readPublishedLists({ lists: [broken] }), [], JSON.stringify(broken).slice(0, 60));
  }
  for (const body of [null, {}, { lists: 'nope' }, []]) assert.deepEqual(readPublishedLists(body), []);
});

test('a posted consent version is the published shape, or nothing', () => {
  for (const ok of ['newsletter-v1', 'v1', 'delivery v1', 'x'.repeat(32)]) assert.equal(readConsentVersion(ok), ok);
  for (const bad of [undefined, null, 1, '', ' v1', 'v1 ', 'x'.repeat(33), 'v\n1', 'v\u00001']) {
    assert.equal(readConsentVersion(bad), null, JSON.stringify(bad));
  }
});

test('an email with a control character is not one: Aonik refuses them', () => {
  assert.equal(isEmailAddress('ada\u0001@example.com'), false);
  assert.equal(isEmailAddress('ada@example.com\u007f'), false);
  assert.equal(isEmailAddress('ada@example.com'), true);
});

test('demo has no lists; live reads them', () => {
  assert.equal(new MockAonikClient().signupLists, null, 'demo never pretends a write');
  assert.ok(new HttpAonikClient({ baseUrl: AONIK_BASE, tenantId: TENANT_ID }).signupLists);
});

/* ---- The newsletter action ------------------------------------------------------ */

function newsletterForm(email: string, consentVersion: string | null = NEWSLETTER.consentVersion): FormData {
  const form = new FormData();
  form.set('email', email);
  if (consentVersion !== null) form.set('consentVersion', consentVersion);
  return form;
}

test('the newsletter answers "joined" only once Aonik stored it, with the version shown', async () => {
  const joined: Array<[string, Record<string, string>]> = [];
  let failWith: Error | null = null;
  const client = async () => ({
    signupLists: {
      published: async () => [],
      join: async (listType, body) => {
        if (failWith) throw failWith;
        joined.push([listType, body]);
      },
    } satisfies SignupLists,
  });

  assert.deepEqual(await subscribeNewsletter(newsletterForm(' ada@example.com '), client), { status: 'joined' });
  assert.deepEqual(joined, [['newsletter', { email: 'ada@example.com', consentVersion: 'newsletter-v1' }]]);

  assert.deepEqual(await subscribeNewsletter(newsletterForm('not-an-email'), client), {
    status: 'error',
    message: NEWSLETTER_MESSAGES.email,
  });
  assert.deepEqual(await subscribeNewsletter(newsletterForm('ada@example.com', null), client), {
    status: 'error',
    message: SIGNUP_FORM_CHANGED,
  });
  assert.deepEqual(await subscribeNewsletter(newsletterForm('ada@example.com'), async () => ({ signupLists: null })), {
    status: 'error',
    message: NEWSLETTER_MESSAGES.unavailable,
  });
  assert.equal(joined.length, 1, 'none of those reached the list');

  const quiet = mock.method(console, 'warn', () => undefined);
  const logged = mock.method(console, 'error', () => undefined);
  try {
    failWith = new AonikError({ status: 422, path: '/v1/signup-lists/newsletter', message: 'This sign-up form is unavailable or has changed.' });
    assert.deepEqual(await subscribeNewsletter(newsletterForm('ada@example.com'), client), {
      status: 'error',
      message: SIGNUP_FORM_CHANGED,
    });
    failWith = new AonikError({ status: 503, path: '/v1/signup-lists/newsletter', message: 'down' });
    // The footer's own "couldn't add you" line; never Aonik's text.
    assert.deepEqual(await subscribeNewsletter(newsletterForm('ada@example.com'), client), { status: 'error' });
  } finally {
    quiet.mock.restore();
    logged.mock.restore();
  }
});

test('the newsletter action, live: one POST to the newsletter list and nothing else', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  useAonik(() => ({ status: 202 }));
  try {
    assert.deepEqual(await subscribeNewsletterAction({ status: 'idle' }, newsletterForm('ada@example.com')), { status: 'joined' });
    assert.deepEqual(
      aonikRequests.map((request) => [request.method, request.path, request.body]),
      [['POST', '/v1/signup-lists/newsletter', { email: 'ada@example.com', consentVersion: 'newsletter-v1' }]],
    );
  } finally {
    delete env.AONIK_DATA_MODE;
  }
});

/* ---- The footer's consent read ------------------------------------------------ */

async function readConsentRoute() {
  const response = await newsletterConsent();
  return { status: response.status, cache: response.headers.get('cache-control'), json: await response.json() };
}

test('GET /api/newsletter: the published wording and version, fresh — or 404', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  try {
    useAonik(() => ({ status: 200, body: { lists: [NEWSLETTER] } }));
    assert.deepEqual(await readConsentRoute(), {
      status: 200,
      cache: 'no-store',
      json: { consent: { text: NEWSLETTER.consentText, version: NEWSLETTER.consentVersion } },
    });
    assert.equal(aonikRequests[0].path, '/v1/signup-lists');

    useAonik(() => ({ status: 200, body: { lists: [{ ...NEWSLETTER, listType: 'delivery-availability' }] } }));
    assert.equal((await readConsentRoute()).status, 404, 'only the newsletter list');

    const logged = mock.method(console, 'error', () => undefined);
    try {
      useAonik(() => ({ status: 503, body: { error: 'down' } }));
      const failed = await readConsentRoute();
      assert.equal(failed.status, 404, 'a failed read holds the form back');
      assert.equal(failed.cache, 'no-store');
    } finally {
      logged.mock.restore();
    }

    env.AONIK_DATA_MODE = 'demo';
    assert.equal((await readConsentRoute()).status, 404, 'demo never pretends a write');
  } finally {
    delete env.AONIK_DATA_MODE;
  }
});

/* ---- The footer ---------------------------------------------------------------- */

test('the chrome gives the footer the action, and awaits nothing for it', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  useAonik(() => undefined);
  try {
    const chrome = await SiteChrome({ children: null });
    const footer = (chrome.props.children as ReactElement<{ subscribeAction?: unknown }>[]).find((part) => part.type === Footer);
    assert.equal(footer?.props.subscribeAction, subscribeNewsletterAction);
    assert.equal(aonikRequests.length, 0);
  } finally {
    delete env.AONIK_DATA_MODE;
  }
});

test('server-rendered, the footer has no "Join the table": it appears once the browser finds the list', () => {
  const html = renderToStaticMarkup(<Footer subscribeAction={subscribeNewsletterAction} />);
  assert.doesNotMatch(html, /Join the table|name="email"/);
  assert.doesNotMatch(html, /data-signup/);
});

test('"Join the table": the published wording, its version, and the email in a POST', () => {
  const html = renderToStaticMarkup(
    <NewsletterSignup
      action={async () => ({ status: 'idle' })}
      consent={{ text: NEWSLETTER.consentText, version: NEWSLETTER.consentVersion }}
    />,
  );
  assert.match(textOf(html), /Join the table Kitchen notes and offers from Abby, monthly\./);
  const email = html.match(/<input[^>]*name="email"[^>]*>/)?.[0] ?? '';
  assert.match(email, /type="email"/);
  assert.match(email, /required=""/);
  assert.match(html, /<input type="hidden" name="consentVersion" value="newsletter-v1"\/>/);
  assert.match(textOf(html), /We use your email for kitchen notes and offers only\. Unsubscribe any time\. See our Privacy Policy ?\./);
  assert.match(html, /href="\/privacy"/);
});

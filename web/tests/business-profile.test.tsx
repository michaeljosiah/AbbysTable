import './support/runtime';

import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import ContactPage from '../src/app/(site)/contact/page';
import PrivacyPolicyPage from '../src/app/(site)/privacy/page';
import TermsOfSalePage from '../src/app/(site)/terms-of-sale/page';
import { BUSINESS_PROFILE_PATH, readBusinessProfile, toE164 } from '../src/lib/aonik/businessProfile';
import { HttpAonikClient, MockAonikClient } from '../src/lib/aonik/client';
import { isOpenAt, ukDayStart, wholeDayClosure } from '../src/lib/contact/hours';
import { mergeBusinessDetails, resolveBusinessDetails } from '../src/lib/content/business';
import { COMPANY } from '../src/lib/content/company';
import { clearPublishedListsCache } from '../src/lib/aonik/signupLists';

import { AONIK_BASE, TENANT_ID, aonikRequests, configureAonik, useAonik, useAonik as stubAonik } from './support/aonik';
import { resetCookies } from './support/next-headers';

/*
 * The tenant's published business profile (michaeljosiah/aonik#358,
 * `GET /v1/business-profile`) on the Contact page and the legal pages.
 *
 * Every value below is TEST data from the ranges reserved for drama and
 * documentation (Ofcom's 01632 960xxx and 07700 900xxx, `.test` domains) —
 * never the designs' placeholder details, which must not ship.
 */

const env = process.env as Record<string, string | undefined>;

/** Aonik's response shape (PublicBusinessProfileDto, camelCase). */
const PROFILE = {
  displayName: "Abby's Table",
  logoUrl: null,
  website: null,
  contact: { email: 'hello@example.test', phone: '01632 960000', whatsApp: '07700 900123' },
  legal: {
    companyName: 'Example Kitchen Ltd',
    companyNumber: '00000001',
    registeredOffice: '1 Test Street\nTestville\nTE1 1ST',
    icoRegistrationNumber: null,
    isVatRegistered: null,
    vatNumber: null,
  },
  openingHours: {
    timezone: 'Europe/London',
    weeklyHours: [
      { dayOfWeek: 1, opensAt: '08:30:00', closesAt: '12:00:00' },
      { dayOfWeek: 1, opensAt: '12:00:00', closesAt: '18:00:00' },
      { dayOfWeek: 2, opensAt: '08:30:00', closesAt: '18:00:00' },
      { dayOfWeek: 6, opensAt: '09:00:00', closesAt: '13:00:00' },
    ],
    bankHolidays: ['2026-12-25'],
    exceptionalClosures: ['2026-11-03'],
  },
};

const quietly = <T,>(run: () => T): T => {
  const warn = mock.method(console, 'warn', () => undefined);
  try {
    return run();
  } finally {
    warn.mock.restore();
  }
};

/* ---- Reading Aonik's profile ------------------------------------------------------- */

test('telephone numbers become E.164 for the link and keep their written form', () => {
  assert.equal(toE164('01632 960000'), '+441632960000');
  assert.equal(toE164('+44 (0)1632 960000'), '+441632960000');
  assert.equal(toE164('0044 1632 960000'), '+441632960000');
  assert.equal(toE164('44 1632 960000'), '+441632960000');
  assert.equal(toE164('+1 (202) 555-0100'), '+12025550100');
  assert.equal(toE164('1632 960000'), null, 'no country, no trunk prefix: not guessed');
  assert.equal(toE164('call us'), null);
  assert.equal(toE164('+44 12'), null, 'too short');

  const profile = readBusinessProfile(PROFILE);
  assert.deepEqual(profile?.contact, {
    email: 'hello@example.test',
    phone: { display: '01632 960000', e164: '+441632960000' },
    whatsApp: '+447700900123',
  });
});

test('a contact detail that does not read cleanly is left out and logged — never guessed', () => {
  const logged: string[] = [];
  const profile = readBusinessProfile(
    { contact: { email: 'hello at example', phone: 'ring the bell', whatsApp: '' } },
    (message) => logged.push(message),
  );
  assert.deepEqual(profile?.contact, { email: null, phone: null, whatsApp: null });
  assert.equal(logged.length, 2, 'the email and the phone; an empty WhatsApp is simply unset');
  assert.equal(readBusinessProfile({ contact: { email: 'a@b@example.test' } })?.contact.email, null);
  assert.equal(readBusinessProfile({ contact: { email: 'hello@example.test\r\nBcc: x@example.test' } })?.contact.email, null);
  assert.equal(readBusinessProfile(null), null);
  assert.equal(readBusinessProfile('profile'), null);
});

test('the legal facts: the registered office one line per entry, on lines or after commas', () => {
  const legal = readBusinessProfile(PROFILE)?.legal;
  assert.deepEqual(legal, {
    companyName: 'Example Kitchen Ltd',
    companyNumber: '00000001',
    registeredOffice: ['1 Test Street', 'Testville', 'TE1 1ST'],
  });
  const office = (registeredOffice: unknown) =>
    readBusinessProfile({ legal: { registeredOffice } })?.legal.registeredOffice;
  assert.deepEqual(office('1 Test Street, Testville, TE1 1ST'), ['1 Test Street', 'Testville', 'TE1 1ST']);
  assert.deepEqual(office('1 Test Street\r\n\r\nTestville'), ['1 Test Street', 'Testville']);
  assert.equal(office('1 Test Street\u0000'), null, 'no other control characters');
  assert.equal(office('  '), null);
  assert.equal(office(null), null);
  // Unpublished facts stay null — nothing is copied from anywhere else.
  assert.deepEqual(readBusinessProfile({ displayName: 'x' })?.legal, {
    companyName: null,
    companyNumber: null,
    registeredOffice: null,
  });
});

test('opening hours: ISO weekdays become ours, touching periods join, closures stay what they are', () => {
  const hours = readBusinessProfile(PROFILE)?.openingHours;
  assert.ok(hours);
  assert.deepEqual(hours.weekly, [
    null, // Sunday: omitted, so closed
    { opens: '08:30', closes: '18:00' }, // Monday: 08:30–12:00 and 12:00–18:00, touching
    { opens: '08:30', closes: '18:00' },
    null,
    null,
    null,
    { opens: '09:00', closes: '13:00' }, // Saturday is ISO 6
  ]);
  assert.deepEqual(hours.bankHolidays, ['2026-12-25']);
  // An exceptional closure is a whole London day — not a bank holiday.
  assert.deepEqual(hours.closures, [{ from: '2026-11-03T00:00:00.000Z', until: '2026-11-04T00:00:00.000Z' }]);
  assert.equal(isOpenAt(hours, new Date('2026-11-03T10:00:00Z')), false, 'Tuesday, but closed');
  assert.equal(isOpenAt(hours, new Date('2026-11-10T10:00:00Z')), true, 'the Tuesday after');

  // ISO Sunday (7) is our Sunday (0).
  const sunday = readBusinessProfile({
    openingHours: { ...PROFILE.openingHours, weeklyHours: [{ dayOfWeek: 7, opensAt: '10:00:00', closesAt: '14:00:00' }] },
  })?.openingHours;
  assert.deepEqual(sunday?.weekly[0], { opens: '10:00', closes: '14:00' });

  // An empty week is closed all week — a real answer, not "unknown".
  const closed = readBusinessProfile({ openingHours: { ...PROFILE.openingHours, weeklyHours: [] } })?.openingHours;
  assert.deepEqual(closed?.weekly, [null, null, null, null, null, null, null]);
  // Null is unconfigured: no table, no "Open now".
  assert.equal(readBusinessProfile({ openingHours: null })?.openingHours, null);
});

test('hours the page cannot show truthfully are not shown at all', () => {
  const hoursOf = (openingHours: unknown) => quietly(() => readBusinessProfile({ openingHours })?.openingHours);
  const base = PROFILE.openingHours;
  // A lunch break: the design's table has one window a day.
  assert.equal(
    hoursOf({
      ...base,
      weeklyHours: [
        { dayOfWeek: 1, opensAt: '09:00:00', closesAt: '12:00:00' },
        { dayOfWeek: 1, opensAt: '13:00:00', closesAt: '17:00:00' },
      ],
    }),
    null,
  );
  // Another zone: "Open now" reads London's clock.
  assert.equal(hoursOf({ ...base, timezone: 'Europe/Dublin' }), null);
  // Seconds the table cannot print, a missing list, a bad weekday, a bad date.
  assert.equal(hoursOf({ ...base, weeklyHours: [{ dayOfWeek: 1, opensAt: '09:00:30', closesAt: '17:00:00' }] }), null);
  assert.equal(hoursOf({ timezone: 'Europe/London', weeklyHours: [] }), null);
  assert.equal(hoursOf({ ...base, weeklyHours: [{ dayOfWeek: 0, opensAt: '09:00:00', closesAt: '17:00:00' }] }), null);
  assert.equal(hoursOf({ ...base, weeklyHours: [{ dayOfWeek: 1, opensAt: '17:00:00', closesAt: '09:00:00' }] }), null);
  assert.equal(hoursOf({ ...base, bankHolidays: ['2026-02-30'] }), null);
  assert.equal(hoursOf({ ...base, exceptionalClosures: ['tomorrow'] }), null);
  assert.equal(hoursOf({ ...base, weeklyHours: [null] }), null);
});

test('a whole London day, across both clock changes', () => {
  assert.equal(ukDayStart('2026-01-15'), '2026-01-15T00:00:00.000Z', 'GMT');
  assert.equal(ukDayStart('2026-07-15'), '2026-07-14T23:00:00.000Z', 'BST');
  // 29 March 2026: the clocks go forward at 01:00 UTC; the day starts in GMT.
  assert.deepEqual(wholeDayClosure('2026-03-29'), {
    from: '2026-03-29T00:00:00.000Z',
    until: '2026-03-29T23:00:00.000Z',
  });
  // 25 October 2026: back at 01:00 UTC; the day starts in BST and is 25 hours long.
  assert.deepEqual(wholeDayClosure('2026-10-25'), {
    from: '2026-10-24T23:00:00.000Z',
    until: '2026-10-26T00:00:00.000Z',
  });
  assert.deepEqual(wholeDayClosure('2026-12-31'), {
    from: '2026-12-31T00:00:00.000Z',
    until: '2027-01-01T00:00:00.000Z',
  });
  assert.equal(ukDayStart('2026-02-29'), null);
  assert.equal(wholeDayClosure('2026-13-01'), null);
});

/* ---- Over the configuration -------------------------------------------------------- */

test('the profile fills each fact it publishes; the rest stay the configuration', () => {
  // Today's configuration is all null, so with no profile nothing is known.
  const none = mergeBusinessDetails(null);
  assert.deepEqual(none, {
    email: null,
    phone: null,
    whatsapp: null,
    hours: null,
    company: { ...COMPANY },
  });

  const details = mergeBusinessDetails(readBusinessProfile(PROFILE));
  assert.equal(details.email, 'hello@example.test');
  assert.deepEqual(details.phone, { display: '01632 960000', e164: '+441632960000' });
  // No QR code: the configured code (none today) belongs to the configured number only.
  assert.deepEqual(details.whatsapp, { e164: '+447700900123', qrSrc: null });
  assert.ok(details.hours);
  assert.deepEqual(details.company, {
    legalName: 'Example Kitchen Ltd',
    registeredOffice: ['1 Test Street', 'Testville', 'TE1 1ST'],
    companyNumber: '00000001',
    paymentProvider: COMPANY.paymentProvider,
    email: 'hello@example.test',
    phone: { display: '01632 960000', e164: '+441632960000' },
  });

  // A profile with only an email leaves everything else as configured.
  const partial = mergeBusinessDetails(readBusinessProfile({ contact: { email: 'hello@example.test' } }));
  assert.equal(partial.email, 'hello@example.test');
  assert.equal(partial.phone, COMPANY.phone);
  assert.equal(partial.company.legalName, COMPANY.legalName);
});

/* ---- Reading it from Aonik --------------------------------------------------------- */

test('live: one GET to the profile; 404 (not published) is no profile, not an error', async () => {
  assert.equal(BUSINESS_PROFILE_PATH, '/v1/business-profile');
  const client = new HttpAonikClient({ baseUrl: AONIK_BASE, tenantId: TENANT_ID });

  useAonik(() => ({ status: 200, body: PROFILE }));
  const profile = await client.getBusinessProfile();
  assert.equal(profile?.legal.companyName, 'Example Kitchen Ltd');
  assert.equal(aonikRequests.length, 1);
  assert.equal(aonikRequests[0].method, 'GET');
  assert.equal(aonikRequests[0].path, '/v1/business-profile');
  assert.equal(aonikRequests[0].headers['x-tenant-id'], TENANT_ID);

  useAonik(() => ({ status: 404, body: { error: 'Not found' } }));
  assert.equal(await client.getBusinessProfile(), null);

  useAonik(() => ({ status: 500 }));
  await assert.rejects(client.getBusinessProfile());

  // Demo publishes nothing: the designs' details are placeholders.
  assert.equal(await new MockAonikClient().getBusinessProfile(), null);
});

test('a failed read falls back to the configuration rather than failing the page', async () => {
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  useAonik(() => ({ status: 503 }));
  const error = mock.method(console, 'error', () => undefined);
  try {
    assert.deepEqual(await resolveBusinessDetails(), mergeBusinessDetails(null));
    assert.equal(error.mock.callCount(), 1);
  } finally {
    error.mock.restore();
    delete env.AONIK_DATA_MODE;
  }
});

/* ---- On the pages ------------------------------------------------------------------ */

/** Answers the profile, and no published sign-up lists (so no waitlist panel). */
function stubPublishedProfile() {
  clearPublishedListsCache();
  stubAonik((request) => {
    if (request.path === BUSINESS_PROFILE_PATH) return { status: 200, body: PROFILE };
    if (request.path === '/v1/signup-lists') return { status: 200, body: { lists: [] } };
    return undefined;
  });
}

test('Contact prints the published routes and hours, and links each', async () => {
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  stubPublishedProfile();
  try {
    const html = renderToStaticMarkup(await ContactPage());
    assert.match(html, /href="https:\/\/wa\.me\/447700900123"/);
    assert.match(html, /href="mailto:hello@example\.test"/);
    assert.match(html, /href="tel:\+441632960000"/);
    assert.match(html, /01632 960000/);
    assert.doesNotMatch(html, /data-tbc=/, 'nothing left to confirm');
    // The table is the profile's, Monday's two touching periods as one window.
    assert.match(html, /<dt>Mon–Tue<\/dt><dd>8:30am – 6pm<\/dd>/);
    assert.match(html, /<dt>Saturday<\/dt><dd>9am – 1pm<\/dd>/);
    assert.match(html, /Closed on bank holidays\. /);
  } finally {
    delete env.AONIK_DATA_MODE;
    clearPublishedListsCache();
  }
});

test('the Terms and the Privacy Policy state the published company details', async () => {
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  stubPublishedProfile();
  try {
    for (const [page, providerMarks] of [
      [TermsOfSalePage, 1],
      [PrivacyPolicyPage, 2],
    ] as const) {
      const html = renderToStaticMarkup(await page());
      assert.match(html, /Example Kitchen Ltd/);
      assert.match(html, /00000001/);
      assert.match(html, /1 Test Street/);
      assert.match(html, /href="mailto:hello@example\.test"/);
      assert.doesNotMatch(html, /company name to be confirmed/);
      // Only what Aonik does not publish is still marked: the payment processor.
      assert.equal(COMPANY.paymentProvider, null);
      const marks = [...html.matchAll(/<span class="tbc" data-tbc="config">([^<]*)<\/span>/g)].map((match) => match[1]);
      assert.equal(html.match(/data-tbc="config"/g)?.length, providerMarks);
      assert.deepEqual(marks, Array(providerMarks).fill(marks[0]), marks.join(' | '));
    }
  } finally {
    delete env.AONIK_DATA_MODE;
    clearPublishedListsCache();
  }
});

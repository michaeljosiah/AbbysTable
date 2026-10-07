import './support/runtime';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import PrivateTablePage from '../src/app/(site)/private-table/page';
import { PrivateTableView } from '../src/components/private-table/PrivateTableView';
import { WaitlistForm } from '../src/components/private-table/WaitlistForm';
import { getAonikClient, HttpAonikClient, MockAonikClient } from '../src/lib/aonik/client';
import { HttpWaitlist, toWaitlistBody, WAITLIST_PATH } from '../src/lib/aonik/waitlist';
import { COUNTRIES, FEATURED_COUNTRY_CODES } from '../src/lib/content/countries';
import {
  PRIVATE_TABLE_CREDENTIALS,
  PRIVATE_TABLE_FROM_PENCE,
  PRIVATE_TABLE_MEAL_PREPARATION_FROM_PENCE,
  WAITLIST_SECTION_ID,
} from '../src/lib/content/marketing';
import { PRIVACY_ITEM } from '../src/lib/content/navigation';
import {
  JOIN_WAITLIST_LABEL,
  PRIVATE_TABLE_ASSURANCES,
  PRIVATE_TABLE_AUDIENCES,
  PRIVATE_TABLE_SERVICES,
  PRIVATE_TABLE_STEPS,
  WAITLIST_SERVICES,
} from '../src/lib/content/privateTable';
import { formatPrice } from '../src/lib/format';
import { joinWaitlistAction } from '../src/lib/private-table/actions';
import { waitlistOpen } from '../src/lib/private-table/availability';
import { joinWaitlist } from '../src/lib/private-table/join';
import {
  countryByCode,
  matchCountries,
  MAX_COUNTRY_SUGGESTIONS,
  normaliseCountryText,
  resolveCountry,
} from '../src/lib/private-table/country';
import {
  COUNTRY_NO_MATCHES,
  draftFromForm,
  EMPTY_WAITLIST,
  firstInvalidField,
  isTelephoneNumber,
  toWaitlistEntry,
  validateWaitlist,
  WAITLIST_LIMITS,
  WAITLIST_MESSAGES,
  type WaitlistAction,
  type WaitlistDraft,
} from '../src/lib/private-table/waitlist';
import {
  ENTRY_LINE,
  hasScrolledPast,
  initialDirection,
  isSuppressed,
  isSuppressedByStops,
  nextDirection,
  shouldShowBar,
  STOP_ON_ENTRY,
  stopLine,
  SUPPRESS_LINE,
  type ScrollDirection,
} from '../src/lib/purchase-bar/visibility';

import { AONIK_BASE, TENANT_ID, configureAonik } from './support/aonik';
import { resetCookies } from './support/next-headers';

/*
 * Abby's Private Table (#25). Sources: design/Abby's Table - Private Table
 * v2.dc.html (approved), behaviour guide §8, design/CLAUDE.md "Private Table
 * page" and "Mobile purchase CTA". Spec: marketing-pages FR-25–FR-29.
 */

const env = process.env as Record<string, string | undefined>;

// `.test-dist/tests` → the repository root.
const ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC = path.join(ROOT, 'web', 'src');

/** The design file's text: entities and JS escapes decoded, so copy compares as written. */
const DESIGN = readFileSync(path.join(ROOT, 'design', "Abby's Table - Private Table v2.dc.html"), 'utf8')
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
  .replace(/&amp;/g, '&');

/** The text a reader gets: tags dropped, entities decoded, whitespace collapsed. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

const draft = (overrides: Partial<WaitlistDraft> = {}): WaitlistDraft => ({
  name: 'Ada Obi',
  email: 'ada@example.test',
  phone: '',
  country: 'United Kingdom',
  service: 'not-sure',
  ...overrides,
});

const formOf = (values: Partial<WaitlistDraft>) => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...draft(), ...values })) form.set(key, value);
  return form;
};

/* ---- Copy: verbatim from the design --------------------------------------------- */

test('every line of structured copy is the design’s, word for word', () => {
  const strings = [
    ...PRIVATE_TABLE_AUDIENCES.flatMap((a) => [a.title, a.body]),
    ...PRIVATE_TABLE_ASSURANCES,
    ...PRIVATE_TABLE_SERVICES.flatMap((s) => [s.label, s.region, s.title, s.body, ...s.points, s.supportLabel, s.support]),
    ...PRIVATE_TABLE_STEPS.flatMap((s) => [s.title, ...s.points]),
    ...WAITLIST_SERVICES.flatMap((s) => [s.label, s.note ?? 'Not sure yet']),
    ...PRIVATE_TABLE_CREDENTIALS.flatMap((c) => [c.role, c.name]),
    WAITLIST_MESSAGES.name,
    WAITLIST_MESSAGES.emailMissing,
    WAITLIST_MESSAGES.emailInvalid,
    WAITLIST_MESSAGES.country,
    WAITLIST_MESSAGES.service,
    COUNTRY_NO_MATCHES,
    'Thank you — you’re on the waitlist.',
    'We’ll let you know as soon as consultations open.',
  ];
  for (const text of strings) assert.ok(DESIGN.includes(text), text);
  // The design's Who it's for has three audiences (the issue's "4" predates it),
  // two services, four steps of three points.
  assert.equal(PRIVATE_TABLE_AUDIENCES.length, 3);
  assert.equal(PRIVATE_TABLE_SERVICES.length, 2);
  assert.deepEqual(PRIVATE_TABLE_STEPS.map((s) => s.points.length), [3, 3, 3, 3]);
});

test('prices are data: £1,500 and £1,780 from their constants, never a literal in the source', () => {
  assert.equal(formatPrice(PRIVATE_TABLE_FROM_PENCE), '£1,500');
  assert.equal(formatPrice(PRIVATE_TABLE_MEAL_PREPARATION_FROM_PENCE), '£1,780');
  assert.deepEqual(
    PRIVATE_TABLE_SERVICES.map((s) => s.fromPence),
    [PRIVATE_TABLE_FROM_PENCE, PRIVATE_TABLE_MEAL_PREPARATION_FROM_PENCE],
  );
  // "Private Table from" is the lowest service price, so it never contradicts a card.
  assert.equal(PRIVATE_TABLE_FROM_PENCE, Math.min(...PRIVATE_TABLE_SERVICES.map((s) => s.fromPence)));
  for (const file of [
    'components/private-table/PrivateTableView.tsx',
    'components/private-table/WaitlistForm.tsx',
    'lib/content/privateTable.ts',
    'app/(site)/private-table/page.tsx',
  ]) {
    const code = readFileSync(path.join(SRC, file), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(code, /£\s?\d|1,500|1,780|\b1500\b|\b1780\b/, file);
  }
});

/* ---- Countries ------------------------------------------------------------------- */

test('the country list is fixed: unique ISO codes, every suggested country on it', () => {
  const codes = COUNTRIES.map((c) => c.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const code of codes) assert.match(code, /^[A-Z]{2}$/);
  assert.ok(COUNTRIES.length > 230, `${COUNTRIES.length} countries and regions`);
  for (const code of FEATURED_COUNTRY_CODES) assert.ok(countryByCode(code), code);
  // The design's own list, in its order.
  assert.deepEqual(
    FEATURED_COUNTRY_CODES.map((code) => countryByCode(code)?.name),
    ['United Kingdom', 'United Arab Emirates', 'United States', 'Ireland', 'Nigeria', 'Canada', 'France',
      'Germany', 'Netherlands', 'South Africa', 'Australia', 'Ghana', 'Kenya', 'Spain', 'Switzerland'],
  );
  // No name or alias belongs to two places.
  const seen = new Map<string, string>();
  for (const country of COUNTRIES) {
    for (const name of [country.name, ...(country.aliases ?? [])]) {
      const key = normaliseCountryText(name);
      assert.ok(!seen.has(key) || seen.get(key) === country.code, `${name}: ${seen.get(key)} and ${country.code}`);
      seen.set(key, country.code);
    }
  }
});

test('a typed name resolves only to a listed country — by name or alias, in any case', () => {
  assert.equal(resolveCountry('United Kingdom')?.code, 'GB');
  assert.equal(resolveCountry('  united kingdom ')?.code, 'GB');
  for (const alias of ['UK', 'uk', 'England', 'scotland', 'Great Britain']) assert.equal(resolveCountry(alias)?.code, 'GB', alias);
  assert.equal(resolveCountry('USA')?.code, 'US');
  assert.equal(resolveCountry("Cote d'Ivoire")?.code, 'CI');
  assert.equal(resolveCountry('Côte d’Ivoire')?.code, 'CI');
  assert.equal(resolveCountry('turkiye')?.code, 'TR');
  // Punctuation and spacing do not matter…
  assert.equal(resolveCountry('U.K.')?.code, 'GB');
  // …but partial names and free text are not countries.
  for (const text of ['', '   ', 'United', 'Nig', 'Narnia', 'London', 'England and Wales']) {
    assert.equal(resolveCountry(text), null, text);
  }
  // Too long is refused without being compared.
  assert.equal(resolveCountry('United Kingdom'.padEnd(500, ' x')), null);
});

test('the typeahead: the design’s suggestions first, then the best matches', () => {
  assert.deepEqual(
    matchCountries('').map((c) => c.name),
    ['United Kingdom', 'United Arab Emirates', 'United States', 'Ireland', 'Nigeria', 'Canada', 'France', 'Germany'],
  );
  assert.equal(matchCountries('ni')[0].name, 'Nigeria');
  assert.deepEqual(matchCountries('uk').slice(0, 2).map((c) => c.name), ['United Kingdom', 'Ukraine']);
  assert.deepEqual(matchCountries('united').slice(0, 3).map((c) => c.name), ['United Kingdom', 'United Arab Emirates', 'United States']);
  assert.deepEqual(matchCountries('korea').map((c) => c.name).sort(), ['North Korea', 'South Korea']);
  assert.equal(matchCountries('eng')[0].name, 'United Kingdom', 'by its alias');
  assert.equal(matchCountries('a').length, MAX_COUNTRY_SUGGESTIONS);
  assert.deepEqual(matchCountries('zzz'), []);
});

test('a hostile query costs no more than a short one', () => {
  const start = performance.now();
  matchCountries('a'.repeat(1_000_000));
  resolveCountry('a'.repeat(1_000_000));
  validateWaitlist(draft({ country: 'x'.repeat(1_000_000), phone: '1'.repeat(1_000_000) }));
  assert.ok(performance.now() - start < 500, `${Math.round(performance.now() - start)}ms`);
});

/* ---- The form's rules -------------------------------------------------------------- */

test('an empty form fails with the design’s messages, in field order', () => {
  const errors = validateWaitlist(EMPTY_WAITLIST);
  assert.deepEqual(errors, {
    name: WAITLIST_MESSAGES.name,
    email: WAITLIST_MESSAGES.emailMissing,
    country: WAITLIST_MESSAGES.country,
    service: WAITLIST_MESSAGES.service,
  });
  assert.equal(firstInvalidField(errors), 'name');
  assert.equal(firstInvalidField(validateWaitlist(draft({ country: 'Narnia', service: '' }))), 'country');
  assert.deepEqual(validateWaitlist(draft()), {});
});

test('email: permissive and linear, with two letters after the last dot', () => {
  for (const ok of ['ada@example.co', 'a.b+c@sub.example.org']) assert.equal(validateWaitlist(draft({ email: ok })).email, undefined, ok);
  for (const bad of ['ada', 'ada@', 'ada@example', 'ada@example.c', 'a b@example.com', 'a@b@example.com']) {
    assert.equal(validateWaitlist(draft({ email: bad })).email, WAITLIST_MESSAGES.emailInvalid, bad);
  }
  assert.equal(validateWaitlist(draft({ email: `${'a'.repeat(250)}@x.co` })).email, WAITLIST_MESSAGES.emailInvalid);
});

test('the telephone number is optional — but what is given must be one', () => {
  for (const ok of ['', '   ', '+44 7700 900000', '+44 (0) 7700 900000', '07700-900-000', '+1 212.555.0100']) {
    assert.equal(validateWaitlist(draft({ phone: ok })).phone, undefined, ok);
  }
  for (const bad of ['call me', '12345', '+44 7700 900000 ext', '1'.repeat(18), '+'.repeat(3)]) {
    assert.equal(validateWaitlist(draft({ phone: bad })).phone, WAITLIST_MESSAGES.phoneInvalid, bad);
  }
  assert.equal(isTelephoneNumber('1'.repeat(WAITLIST_LIMITS.phone + 1)), false);
});

test('country from the fixed list, service from the fixed three — nothing else', () => {
  assert.equal(validateWaitlist(draft({ country: 'Narnia' })).country, WAITLIST_MESSAGES.countryUnknown);
  assert.equal(validateWaitlist(draft({ country: 'uk' })).country, undefined);
  for (const service of ['', 'private-table', 'recipes', 'NOT-SURE']) {
    assert.equal(validateWaitlist(draft({ service })).service, WAITLIST_MESSAGES.service, service);
  }
  for (const { id } of WAITLIST_SERVICES) assert.equal(validateWaitlist(draft({ service: id })).service, undefined, id);
  assert.deepEqual(
    WAITLIST_SERVICES.map((s) => s.label),
    ['Recipe development', 'Recipe development & meal preparation', 'Not sure yet'],
  );
});

test('every field is capped: a name of 200 characters passes, 201 does not', () => {
  assert.equal(validateWaitlist(draft({ name: 'é'.repeat(200) })).name, undefined);
  assert.equal(validateWaitlist(draft({ name: 'é'.repeat(201) })).name, WAITLIST_MESSAGES.nameLong);
  // Characters as the customer sees them: 200 emoji are 400 UTF-16 units.
  assert.equal(validateWaitlist(draft({ name: '🙂'.repeat(200) })).name, undefined);
  assert.deepEqual(WAITLIST_LIMITS, { name: 200, email: 254, phone: 32, country: 100 });
});

test('the entry: trimmed, the country as its code, the phone only when given', () => {
  const result = toWaitlistEntry(draft({ name: '  Ada Obi ', email: ' ada@example.test ', country: ' england ', service: 'recipe-development' }));
  assert.ok('entry' in result);
  assert.deepEqual(result.entry, {
    name: 'Ada Obi',
    email: 'ada@example.test',
    phone: null,
    country: 'GB',
    service: 'recipe-development',
  });
  const withPhone = toWaitlistEntry(draft({ phone: ' +44 7700 900000 ' }));
  assert.ok('entry' in withPhone);
  assert.equal(withPhone.entry.phone, '+44 7700 900000');
  assert.ok('errors' in toWaitlistEntry(draft({ country: 'Narnia' })));
  // A posted form reads back as a draft; anything not text is empty.
  const form = formOf({ phone: '0123' });
  form.set('service', new File(['x'], 'x.txt'));
  assert.deepEqual(draftFromForm(form), { ...draft({ phone: '0123' }), service: '' });
});

/* ---- Nothing can store an entry yet ------------------------------------------------- */

test('no waitlist anywhere until aonik#357 — in either data mode', async () => {
  assert.equal(WAITLIST_PATH, null, 'aonik#357 has shipped? Set WAITLIST_PATH, then update this test and the spec');
  assert.equal(new MockAonikClient().waitlist, null, 'demo never pretends a write');
  assert.equal(new HttpAonikClient({ baseUrl: AONIK_BASE, tenantId: TENANT_ID }).waitlist, null);
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  try {
    assert.equal((await getAonikClient()).waitlist, null);
    assert.equal(await waitlistOpen(), false);
    env.AONIK_DATA_MODE = 'demo';
    assert.equal(await waitlistOpen(), false);
  } finally {
    delete env.AONIK_DATA_MODE;
  }
});

test('the action re-checks everything and never answers "joined" without a waitlist', async () => {
  resetCookies();
  configureAonik({ AONIK_DATA_MODE: 'live' });
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => {
    requests += 1;
    return new Response(null, { status: 201 });
  }) as typeof fetch;
  try {
    const empty = await joinWaitlistAction({ status: 'idle' }, new FormData());
    assert.equal(empty.status, 'invalid');
    assert.equal(empty.errors?.name, WAITLIST_MESSAGES.name);
    assert.equal(empty.errors?.service, WAITLIST_MESSAGES.service);

    // What a crafted post can send that the form never would.
    for (const values of [
      { country: 'Narnia' },
      { service: 'booking' },
      { name: 'x'.repeat(201) },
      { phone: 'call me' },
      { email: 'a@x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x@' },
    ]) {
      assert.equal((await joinWaitlistAction({ status: 'idle' }, formOf(values))).status, 'invalid', JSON.stringify(values).slice(0, 40));
    }

    const valid = await joinWaitlistAction({ status: 'idle' }, formOf({}));
    assert.equal(valid.status, 'unavailable');
    env.AONIK_DATA_MODE = 'demo';
    assert.equal((await joinWaitlistAction({ status: 'idle' }, formOf({}))).status, 'unavailable');
    assert.equal(requests, 0, 'nothing was sent anywhere');
  } finally {
    globalThis.fetch = original;
    delete env.AONIK_DATA_MODE;
  }
});

test('when it ships: JSON in the proposed names, the tenant, and only a 2xx is a sign-up', async () => {
  const result = toWaitlistEntry(draft({ phone: '+44 7700 900000', service: 'recipe-development-and-meal-preparation' }));
  assert.ok('entry' in result);
  assert.deepEqual(toWaitlistBody(result.entry), {
    name: 'Ada Obi',
    email: 'ada@example.test',
    phone: '+44 7700 900000',
    country: 'GB',
    service: 'recipe-development-and-meal-preparation',
  });
  const noPhone = toWaitlistEntry(draft());
  assert.ok('entry' in noPhone);
  assert.equal('phone' in toWaitlistBody(noPhone.entry), false);

  const original = globalThis.fetch;
  const seen: Array<{ url: string; init: RequestInit | undefined }> = [];
  const replyWith = (status: number, body: string | null) => {
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      seen.push({ url: String(input), init });
      return new Response(body, { status });
    }) as typeof fetch;
  };
  const waitlist = new HttpWaitlist('/commerce/waitlists/private-table', { baseUrl: AONIK_BASE, tenantId: TENANT_ID });
  try {
    replyWith(201, '{}');
    await waitlist.join(result.entry);
    assert.equal(seen[0].url, `${AONIK_BASE}/commerce/waitlists/private-table`);
    assert.equal(seen[0].init?.method, 'POST');
    const headers = new Headers(seen[0].init?.headers);
    assert.equal(headers.get('X-Tenant-Id'), TENANT_ID);
    assert.equal(headers.get('Content-Type'), 'application/json');
    assert.deepEqual(JSON.parse(String(seen[0].init?.body)), toWaitlistBody(result.entry));
    // An empty 200 or 201 is still the acceptance — never a parse failure that
    // tells the customer nothing happened and invites a second sign-up.
    replyWith(200, null);
    await waitlist.join(result.entry);
    replyWith(201, '');
    await waitlist.join(result.entry);
    replyWith(503, '{"error":"down"}');
    await assert.rejects(waitlist.join(result.entry));
    replyWith(409, '{"error":"exists"}');
    await assert.rejects(waitlist.join(result.entry));
  } finally {
    globalThis.fetch = original;
  }
});

test('"joined" only once the list has stored the entry; "error" when it could not', async () => {
  const stored: unknown[] = [];
  let fail = false;
  const withList = async () => ({
    waitlist: {
      join: async (entry: unknown) => {
        if (fail) throw new Error('down');
        stored.push(entry);
      },
    },
  });
  assert.deepEqual(await joinWaitlist(formOf({ country: 'nigeria' }), withList), { status: 'joined' });
  assert.deepEqual(stored, [{ name: 'Ada Obi', email: 'ada@example.test', phone: null, country: 'NG', service: 'not-sure' }]);
  fail = true;
  assert.deepEqual(await joinWaitlist(formOf({}), withList), { status: 'error' });
  // An invalid post never reaches the list; no list is "unavailable", never "joined".
  assert.equal((await joinWaitlist(formOf({ service: '' }), withList)).status, 'invalid');
  assert.equal(stored.length, 1);
  assert.deepEqual(await joinWaitlist(formOf({}), async () => ({ waitlist: null })), { status: 'unavailable' });
  // A client that cannot even be built is a failure to store, said as one.
  assert.deepEqual(
    await joinWaitlist(formOf({}), async () => {
      throw new Error('no Aonik');
    }),
    { status: 'error' },
  );
});

/* ---- The page as configured today: closed ---------------------------------------------- */

test('as configured today: the service, its credentials and prices — and no waitlist to join', async () => {
  resetCookies();
  const html = renderToStaticMarkup(await PrivateTablePage());
  const text = textOf(html);

  assert.equal(count(html, /<h1[ >]/g), 1);
  assert.match(html, /<h1 class="h1">Abby’s Private Table<\/h1>/);
  assert.match(text, /^Coming soon Abby’s Private Table We develop a collection of Nigerian fusion recipes/);
  for (const { role, name } of PRIVATE_TABLE_CREDENTIALS) assert.ok(text.includes(`${role} ${name}`), role);
  assert.ok(text.includes(`Private Table from ${formatPrice(PRIVATE_TABLE_FROM_PENCE)}`));
  // Each card's "From £…": the sans "£" is its own span, set against the numerals.
  const prices = [...html.matchAll(/<p class="price">(.*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
  assert.deepEqual(prices, [
    `From ${formatPrice(PRIVATE_TABLE_FROM_PENCE)}`,
    `From ${formatPrice(PRIVATE_TABLE_MEAL_PREPARATION_FROM_PENCE)}`,
  ]);

  // The waitlist is not open, so nothing offers to join it (#6's rule)…
  assert.doesNotMatch(text, /Join the waitlist/i);
  assert.doesNotMatch(html, /<form|role="combobox"|type="radio"/);
  assert.doesNotMatch(html, /href="#enquire"/, 'nothing jumps to a form that is not there');
  assert.doesNotMatch(html, /data-overlay-yield/, 'and no mobile bar');
  // …and the page says so where the form would be.
  assert.match(text, /Register your interest The Private Table waitlist isn’t open yet\./);
  assert.doesNotMatch(text, /Tell us which Private Table service/);

  // Find out more still goes to the services, which take focus.
  assert.match(html, /<a href="#services" class="more">/);
  assert.match(html, /<section id="services"[^>]*><div class="shell"><h2 class="h2" tabindex="-1" data-jump-focus="">What we offer<\/h2>/);
});

test('the heading outline, and the hero image as the page’s one priority image', async () => {
  resetCookies();
  const html = renderToStaticMarkup(await PrivateTablePage());
  const headings = [...html.matchAll(/<h([1-3])[^>]*>(.*?)<\/h\1>/g)].map((m) => `${m[1]} ${textOf(m[2])}`);
  assert.deepEqual(headings, [
    '1 Abby’s Private Table',
    '2 Who it’s for',
    '3 Living with a diagnosis',
    '3 Fuelling sporting performance',
    '3 Following clinical guidance',
    '2 What we offer',
    '3 Bespoke Recipe Development',
    '3 Recipe Development & Meal Preparation',
    '2 How it works',
    '3 Private Consultation',
    '3 Bespoke Recipe Development',
    '3 Review & sign-off',
    '3 Your programme begins',
    '2 Register your interest',
  ]);
  // React writes the prop as `fetchPriority`; HTML attribute names are case-insensitive.
  const high = [...html.matchAll(/<img\b[^>]*fetchpriority="high"[^>]*>/gi)].map((m) => m[0]);
  assert.equal(high.length, 1);
  assert.match(high[0], /alt="Nigerian ingredients laid out around a tablet showing a bespoke menu"/);
  assert.match(high[0], /%2Fassets%2Fprivate-table%2Fprivate-table-hero-1120\.jpg/);
});

test('the bar’s markers: revealed once the whole hero has gone, stopped on entry to the form', async () => {
  resetCookies();
  const html = renderToStaticMarkup(await PrivateTablePage());
  assert.equal(count(html, /data-purchase-bar-reveal=""/g), 1);
  assert.match(html, /<section class="hero" data-purchase-bar-reveal="">/);
  assert.match(html, new RegExp(`<section id="${WAITLIST_SECTION_ID}" class="section enquire" data-purchase-bar-stop="${STOP_ON_ENTRY}">`));
});

/* ---- The page with a waitlist to join ---------------------------------------------------- */

const joinStub: WaitlistAction = async () => ({ status: 'error' });

test('open: EVERY call to action reads "Join the waitlist" and goes to the form', () => {
  const html = renderToStaticMarkup(<PrivateTableView joinAction={joinStub} />);
  // Hero, both service cards and the mobile bar jump to the form; its submit joins.
  const jumps = [...html.matchAll(/<a href="#enquire" class="([^"]*)">(.*?)<\/a>/g)];
  assert.deepEqual(
    jumps.map((m) => [m[1], textOf(m[2])]),
    [
      ['heroCta', JOIN_WAITLIST_LABEL],
      ['cardCta', JOIN_WAITLIST_LABEL],
      ['cardCta', JOIN_WAITLIST_LABEL],
      ['cta', JOIN_WAITLIST_LABEL],
    ],
  );
  assert.match(html, /<button type="submit" class="submit">Join the waitlist<\/button>/);
  // Nothing else asks to be pressed: no booking, no Build a Box, no enquiry.
  const actions = [...html.matchAll(/<(a|button)[^>]*>(.*?)<\/\1>/g)].map((m) => textOf(m[2]));
  assert.deepEqual(
    [...new Set(actions)].sort(),
    ['Find out more', JOIN_WAITLIST_LABEL, PRIVACY_ITEM.label].sort(),
  );
  assert.doesNotMatch(textOf(html), /book|Build a Box|Get started/i);
  // The bar: one centred pill, retracted until scrolled to.
  assert.match(html, /<div class="bar" data-layout="centre" data-consent-yield="" data-overlay-yield="" inert="">/);
  assert.match(textOf(html), /Register your interest Tell us which Private Table service interests you and we’ll let you know when consultations open\./);
});

test('open: the form — its fields in order, a real combobox, a native radio group', () => {
  const html = renderToStaticMarkup(<WaitlistForm action={joinStub} />);
  assert.match(html, /<form[^>]*novalidate=""/i);
  const labels = [...html.matchAll(/<(?:label|legend)[^>]*>(.*?)<\/(?:label|legend)>/g)].map((m) => textOf(m[1]));
  assert.deepEqual(labels.slice(0, 5), ['Full name', 'Email address', 'Telephone number (optional)', 'Country or region', 'Which service']);
  const names = [...html.matchAll(/<input[^>]*name="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(names, ['name', 'email', 'phone', 'country', 'service', 'service', 'service']);
  const input = (name: string) => html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0] ?? '';
  for (const attribute of ['type="text"', 'autoComplete="name"', 'placeholder="Your name"', 'maxLength="200"']) {
    assert.ok(input('name').includes(attribute), attribute);
  }
  for (const attribute of ['type="email"', 'autoComplete="email"', 'placeholder="you@example.com"', 'maxLength="254"']) {
    assert.ok(input('email').includes(attribute), attribute);
  }
  for (const attribute of ['type="tel"', 'autoComplete="tel"', 'placeholder="+44 7700 900000"', 'maxLength="32"']) {
    assert.ok(input('phone').includes(attribute), attribute);
  }
  assert.doesNotMatch(input('phone'), /required/, 'optional');

  // ARIA 1.2 combobox: the list always in the DOM, so aria-controls resolves.
  const combo = html.match(/<input[^>]*role="combobox"[^>]*>/)?.[0] ?? '';
  assert.match(combo, /aria-autocomplete="list"/);
  assert.match(combo, /aria-expanded="false"/);
  assert.doesNotMatch(combo, /aria-activedescendant/);
  assert.match(combo, /autoComplete="off"/);
  assert.match(combo, /maxLength="100"/);
  const listId = combo.match(/aria-controls="([^"]*)"/)?.[1];
  assert.ok(listId);
  assert.match(html, new RegExp(`<ul id="${listId}" role="listbox" aria-label="Countries"`));

  // Three radios, none chosen; "Not sure yet" is a real answer.
  const radios = [...html.matchAll(/<input[^>]*type="radio"[^>]*>/g)].map((m) => {
    assert.match(m[0], /name="service"/);
    return m[0].match(/value="([^"]*)"/)?.[1];
  });
  assert.deepEqual(radios, WAITLIST_SERVICES.map((s) => s.id));
  assert.doesNotMatch(html, /checked=""/);
  assert.match(html, /<fieldset[^>]*><legend class="label">Which service<\/legend>/);

  assert.match(html, /<a class="privacyLink" href="\/privacy">Privacy Policy<\/a>/);
  assert.match(textOf(html), /Confidential by design\. We’ll only use your details to contact you about Private Table\. See our Privacy Policy ?\./);
  assert.doesNotMatch(html, /role="alert"/, 'no failure before a join');
});

/* ---- The mobile bar: the waitlist variant ------------------------------------------------ */

test('an on-entry stop suppresses as soon as any of it is on screen; others at 75%', () => {
  assert.equal(stopLine(STOP_ON_ENTRY), ENTRY_LINE);
  assert.equal(stopLine(''), SUPPRESS_LINE);
  assert.equal(stopLine(null), SUPPRESS_LINE);
  assert.equal(isSuppressed(843, 844, ENTRY_LINE), true, 'one pixel in');
  assert.equal(isSuppressed(844, 844, ENTRY_LINE), false, 'still below the fold');
  assert.equal(isSuppressed(700, 844), false, 'a plain stop waits for 633');
  // Any marker over its own line suppresses; with one line it is the first stop's rule.
  assert.equal(isSuppressedByStops([], 844), false);
  assert.equal(isSuppressedByStops([{ top: 800, line: ENTRY_LINE }, { top: 1900, line: SUPPRESS_LINE }], 844), true);
  assert.equal(isSuppressedByStops([{ top: 900, line: ENTRY_LINE }, { top: 1900, line: SUPPRESS_LINE }], 844), false);
  assert.equal(isSuppressedByStops([{ top: -3000, line: ENTRY_LINE }, { top: 500, line: SUPPRESS_LINE }], 844), true, 'the footer, past the form');
});

test('Private Table walk: hidden in the hero, shown going down, gone from the form through the footer', () => {
  // The hero ends at 1348px; the enquiry section starts at 4771px, the footer
  // at 5866px; a 390×844 phone (the page's measured geometry).
  const page = { heroBottom: 1348, enquireTop: 4771, footerTop: 5866, viewport: 844 };
  let direction: ScrollDirection = initialDirection(0);
  const shown = [0, 600, 1200, 1400, 1700, 1600, 2000, 3900, 3940, 4000, 4500, 6000, 3000, 2800].map((y) => {
    direction = nextDirection(direction, y);
    return shouldShowBar({
      revealed: hasScrolledPast({ bottom: page.heroBottom - y }),
      down: direction.down,
      suppressed: isSuppressedByStops(
        [
          { top: page.enquireTop - y, line: stopLine(STOP_ON_ENTRY) },
          { top: page.footerTop - y, line: stopLine('') },
        ],
        page.viewport,
      ),
      followsDirection: true,
    });
  });
  assert.deepEqual(shown, [
    false, // load
    false, // down, the hero still on screen (its CTA is below the fold here)
    false,
    true, //  down, the whole hero gone
    true,
    false, // up: the header's turn
    true, //  down again
    true, //  3900: the form's top at 871 — not yet on screen
    false, // 3940: its top at 831 — on screen, so the bar stands down
    false,
    false,
    false, // the footer
    false, // up, released — but never forced back
    false,
  ]);
});

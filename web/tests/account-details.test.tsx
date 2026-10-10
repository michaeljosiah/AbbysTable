import './support/runtime';

import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';

import AddressesPage from '../src/app/(site)/account/(frame)/addresses/page';
import DetailsPage from '../src/app/(site)/account/(frame)/details/page';
import { AddressBook as AddressBookView } from '../src/components/account/AddressBook';
import {
  removeAddressAction,
  saveAddressAction,
  setDefaultAddressAction,
} from '../src/lib/account/addressActions';
import {
  ADDRESS_MESSAGES,
  addressFormErrors,
  formFromAddress,
  toAddressWrite,
} from '../src/lib/account/addressForm';
import { sendPasswordResetLinkAction, saveDetailsAction } from '../src/lib/account/detailsActions';
import { DETAILS_MESSAGES, detailsFormErrors } from '../src/lib/account/detailsForm';
import { phoneForInput, toE164 } from '../src/lib/account/phone';
import { ACCOUNT_SECTIONS } from '../src/lib/account/sections';
import { addressWriteFailure, mapAddressBook } from '../src/lib/aonik/addresses';
import { AONIK_CODES, AonikError } from '../src/lib/aonik/errors';
import { loginByAddress, resetByAddress, resetByEmail } from '../src/lib/auth/passwordReset';
import { SESSION_COOKIE } from '../src/lib/auth/session';

import { aonikRequests, configureAonik, useAonik as installAonik, type AonikReply, type AonikRequest } from './support/aonik';
import { revalidated, resetRevalidated } from './support/next-cache';
import { cookieValue, renderMode, resetCookies, setRequestHeaders } from './support/next-headers';

/*
 * My Account, PR 3 (#35): addresses (versioned writes), details (name, phone),
 * the password-reset link and the pages — against a stubbed Aonik.
 */

configureAonik({ AONIK_AUTH_CLIENT_ID: 'storefront' });

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

beforeEach(() => {
  resetCookies();
  resetRevalidated();
  loginByAddress.clear();
  resetByAddress.clear();
  resetByEmail.clear();
});

/* ---- Rules ------------------------------------------------------------------ */

test('a UK number is read as dialled and stored as E.164; nothing else is guessed at', () => {
  assert.equal(toE164('07700 900123'), '+447700900123');
  assert.equal(toE164('(07700) 900-123'), '+447700900123');
  assert.equal(toE164('+44 7700 900123'), '+447700900123');
  assert.equal(toE164('0044 7700 900123'), '+447700900123');
  assert.equal(toE164('+1 415 555 0132'), '+14155550132');
  assert.equal(toE164('+44 (0) 7700 900123'), '+447700900123', 'the (0) trunk digit is not part of the number');
  assert.equal(toE164('0044 (0)7700 900123'), '+447700900123');
  assert.equal(toE164('+44 07700 900123'), '+447700900123', 'a trunk 0 typed after the country code');
  assert.equal(toE164(''), null);
  assert.equal(toE164('abc'), null);
  assert.equal(toE164('12345'), null);
  assert.equal(phoneForInput('+447700900123'), '07700 900123');
  assert.equal(phoneForInput('+14155550132'), '+14155550132');
  assert.equal(phoneForInput(undefined), '');
});

test('the address form asks for the design’s messages, and accepts a postcode in any case or spacing', () => {
  assert.deepEqual(addressFormErrors({ label: '', line1: '', line2: '', city: '', postcode: '' }), {
    line1: 'Enter the first line of the address.',
    city: 'Enter a town or city.',
    postcode: 'Enter a postcode.',
  });
  assert.equal(addressFormErrors({ label: '', line1: '1 A St', line2: '', city: 'Leeds', postcode: 'nope' }).postcode, 'Enter a UK postcode, like DA1 1AA.');
  assert.deepEqual(addressFormErrors({ label: '', line1: '1 A St', line2: '', city: 'Leeds', postcode: 'da11aa' }), {});
});

test('an address becomes Aonik’s write: postcode normalised, an empty label is Home, UK country', () => {
  assert.deepEqual(toAddressWrite({ label: ' ', line1: ' 12 High Street ', line2: '', city: 'Dartford', postcode: 'da11aa' }), {
    type: 'Home', line1: '12 High Street', line2: undefined, city: 'Dartford', postcode: 'DA1 1AA', country: 'GB',
  });
  assert.equal(toAddressWrite({ label: "Mum's", line1: 'x', line2: 'Flat 2', city: 'y', postcode: 'DA1 1AA' })?.type, "Mum's");
  assert.equal(toAddressWrite({ label: 'a'.repeat(50), line1: 'x', line2: '', city: 'y', postcode: 'DA1 1AA' })?.type.length, 32);
  assert.equal(toAddressWrite({ label: '', line1: 'x\u0007', line2: '', city: 'y', postcode: 'DA1 1AA' }), null, 'a control character');
  assert.equal(toAddressWrite({ label: '', line1: 'x', line2: '', city: 'y', postcode: 'nope' }), null);
});

test('the details form requires both names (Aonik does), and a phone only when one is given', () => {
  assert.deepEqual(detailsFormErrors({ firstName: '', lastName: '', phone: '' }), {
    firstName: 'Enter your first name.',
    lastName: 'Enter your last name.',
  });
  assert.deepEqual(detailsFormErrors({ firstName: 'Ada', lastName: 'L', phone: '123' }), { phone: 'Enter a phone number, like 07700 900123.' });
  assert.deepEqual(detailsFormErrors({ firstName: 'Ada', lastName: 'L', phone: '07700 900123' }), {});
});

test('a stored phone cannot be cleared (Aonik ignores a blank one), so emptying it is an error that says so', () => {
  assert.deepEqual(detailsFormErrors({ firstName: 'Ada', lastName: 'L', phone: '' }, { hasStoredPhone: true }), {
    phone: 'To remove your phone number, contact us.',
  });
  assert.deepEqual(detailsFormErrors({ firstName: 'Ada', lastName: 'L', phone: '' }, { hasStoredPhone: false }), {});
});

/* ---- Aonik's side --------------------------------------------------------------- */

const BOOK = {
  version: 'v1',
  defaultAddressId: 'a1',
  addresses: [{ id: 'a1', type: 'Home', line1: '12 High Street', line2: 'Flat 2', line3: 'Old Town', city: 'Dartford', state: 'Kent', postcode: 'DA1 1AA', country: 'GB', isDefault: true }],
};

test('an address keeps the fields as Aonik holds them, for editing', () => {
  const [address] = mapAddressBook(BOOK).addresses;

  assert.deepEqual(address.fields, { line1: '12 High Street', line2: 'Flat 2', line3: 'Old Town', city: 'Dartford', state: 'Kent', postcode: 'DA1 1AA' });
  assert.deepEqual(formFromAddress(address), { label: 'Home', line1: '12 High Street', line2: 'Flat 2', city: 'Dartford', postcode: 'DA1 1AA' });
});

test('an address write’s refusals are read: concurrency, gone, refused, or not ours to read', () => {
  const failure = (status: number, code?: string) => addressWriteFailure(new AonikError({ status, path: '/x', message: 'm', code }));

  assert.equal(failure(409, AONIK_CODES.concurrencyConflict), 'conflict');
  assert.equal(failure(404), 'missing');
  assert.equal(failure(400), 'invalid');
  assert.equal(failure(422), 'invalid');
  assert.equal(failure(409), 'invalid');
  assert.equal(failure(500), null);
  assert.equal(addressWriteFailure(new Error('boom')), null);
});

/* ---- Actions ---------------------------------------------------------------------- */

function signedIn() {
  resetCookies({
    [SESSION_COOKIE]: JSON.stringify({ accessToken: 'a', expiresAt: Date.now() + 3_600_000, email: 'ada@example.com' }),
  });
}

function stubAonik(respond: (request: AonikRequest) => AonikReply | undefined) {
  installAonik((request) => respond(request) ?? { status: 404, body: { error: 'none' } });
}

const FORM = { label: '', line1: '5 New Road', line2: '', city: 'Leeds', postcode: 'ls11aa' };
const NEW_BOOK = {
  version: 'v2',
  defaultAddressId: 'a1',
  addresses: [...BOOK.addresses, { id: 'a2', type: 'Home', line1: '5 New Road', city: 'Leeds', postcode: 'LS1 1AA', country: 'GB', isDefault: false }],
};

test('saving a new address validates first, then POSTs with the book version', async () => {
  signedIn();
  stubAonik(() => undefined);
  const invalid = await saveAddressAction({ version: 'v1', values: { ...FORM, line1: '' }, makeDefault: false, knownIds: ['a1'] });
  assert.deepEqual(invalid, { status: 'invalid', errors: { line1: 'Enter the first line of the address.' } });
  assert.equal(aonikRequests.length, 0);

  stubAonik((request) => (request.method === 'POST' ? { status: 201, body: NEW_BOOK } : undefined));
  const saved = await saveAddressAction({ version: 'v1', values: FORM, makeDefault: false, knownIds: ['a1'] });

  assert.equal(saved.status, 'ok');
  assert.equal(saved.status === 'ok' && saved.said, ADDRESS_MESSAGES.saved);
  assert.equal(aonikRequests.length, 1);
  assert.equal(aonikRequests[0].path, '/profiles/customers/me/addresses');
  assert.deepEqual(aonikRequests[0].body, {
    type: 'Home', line1: '5 New Road', line2: null, line3: null, city: 'Leeds', state: null, postcode: 'LS1 1AA', country: 'GB', expectedVersion: 'v1',
  });
});

test('"make this my default" finds the new address and sets it with the version just returned', async () => {
  signedIn();
  stubAonik((request) => {
    if (request.method === 'POST') return { status: 201, body: NEW_BOOK };
    if (request.method === 'PUT' && request.path.endsWith('/a2/default')) {
      return { status: 200, body: { ...NEW_BOOK, version: 'v3', defaultAddressId: 'a2', addresses: NEW_BOOK.addresses.map((a) => ({ ...a, isDefault: a.id === 'a2' })) } };
    }
    return undefined;
  });

  const result = await saveAddressAction({ version: 'v1', values: FORM, makeDefault: true, knownIds: ['a1'] });

  assert.equal(result.status === 'ok' && result.book.defaultAddress?.id, 'a2');
  assert.deepEqual(aonikRequests.map((request) => [request.method, request.path]), [
    ['POST', '/profiles/customers/me/addresses'],
    ['PUT', '/profiles/customers/me/addresses/a2/default'],
  ]);
  assert.deepEqual(aonikRequests[1].body, { expectedVersion: 'v2' });
});

test('editing carries the fields the form does not ask for, unchanged', async () => {
  signedIn();
  stubAonik((request) => (request.method === 'PUT' ? { status: 200, body: BOOK } : undefined));

  await saveAddressAction({ id: 'a1', version: 'v1', values: { ...FORM, line1: '12 High Street' }, makeDefault: true, knownIds: ['a1'], keep: { line3: 'Old Town', state: 'Kent' } });

  assert.equal(aonikRequests[0].path, '/profiles/customers/me/addresses/a1');
  assert.equal((aonikRequests[0].body as { line3: string }).line3, 'Old Town');
  assert.equal((aonikRequests[0].body as { state: string }).state, 'Kent');
  assert.equal(aonikRequests.length, 1, 'already the default: no second write');
});

test('a stale book is refused and the answer carries the book as it now is', async () => {
  signedIn();
  stubAonik((request) => {
    if (request.method === 'DELETE') return { status: 409, body: { error: 'modified', code: AONIK_CODES.concurrencyConflict } };
    if (request.method === 'GET') return { status: 200, body: NEW_BOOK };
    return undefined;
  });

  const result = await removeAddressAction({ id: 'a1', version: 'stale' });

  assert.equal(result.status, 'failed');
  assert.equal(result.status === 'failed' && result.message, ADDRESS_MESSAGES.conflict);
  assert.equal(result.status === 'failed' && result.book?.version, 'v2');
  assert.deepEqual(aonikRequests[0].body, { expectedVersion: 'stale' });
});

test('removing and setting a default say what was done', async () => {
  signedIn();
  stubAonik((request) => (request.method === 'DELETE' || request.method === 'PUT' ? { status: 200, body: BOOK } : undefined));

  const removed = await removeAddressAction({ id: 'a1', version: 'v1' });
  const defaulted = await setDefaultAddressAction({ id: 'a1', version: 'v1' });

  assert.equal(removed.status === 'ok' && removed.said, 'Address removed.');
  assert.equal(defaulted.status === 'ok' && defaulted.said, 'Default address updated.');
  assert.equal(aonikRequests[1].path, '/profiles/customers/me/addresses/a1/default');
});

test('a session Aonik ends mid-write is "ended", and the cookie is cleared', async () => {
  signedIn();
  stubAonik(() => ({ status: 401, body: { error: 'expired' } }));

  assert.deepEqual(await removeAddressAction({ id: 'a1', version: 'v1' }), { status: 'ended' });
  assert.equal(cookieValue(SESSION_COOKIE), undefined);
});

const PROFILE = { email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace', title: 'Countess', phone: '+447700900123', countryCode: 'GB' };

test('saving details reads the profile first and sends back what the form does not ask for', async () => {
  signedIn();
  stubAonik((request) => {
    if (request.path === '/profiles/customers/me' && request.method === 'GET') return { status: 200, body: PROFILE };
    if (request.path === '/profiles/customers/me' && request.method === 'PUT') return { status: 200, body: PROFILE };
    return undefined;
  });

  const result = await saveDetailsAction({ firstName: ' Augusta ', lastName: 'King', phone: '07911 123456' });

  assert.equal(result.status, 'saved');
  const put = aonikRequests.find((request) => request.method === 'PUT');
  assert.deepEqual(put?.body, { firstName: 'Augusta', lastName: 'King', title: 'Countess', phone: '+447911123456', countryCode: 'GB' });
  assert.equal(result.status === 'saved' && result.values.phone, '07700 900123', 'the form shows what Aonik now holds, not what was typed');
  assert.deepEqual(revalidated, [{ path: '/account', type: 'layout' }], 'the greeting reads the name');
});

test('a stored phone is never "cleared" by an empty field; a customer with none can save without one', async () => {
  signedIn();
  stubAonik((request) => (request.path === '/profiles/customers/me' ? { status: 200, body: PROFILE } : undefined));

  const kept = await saveDetailsAction({ firstName: 'Ada', lastName: 'L', phone: '' });
  assert.deepEqual(kept, { status: 'invalid', errors: { phone: 'To remove your phone number, contact us.' } });
  assert.equal(aonikRequests.some((request) => request.method === 'PUT'), false);

  aonikRequests.length = 0;
  stubAonik((request) => (request.path === '/profiles/customers/me' ? { status: 200, body: { ...PROFILE, phone: null } } : undefined));
  const saved = await saveDetailsAction({ firstName: 'Ada', lastName: 'L', phone: '' });
  assert.equal(saved.status, 'saved');
  assert.equal((aonikRequests.find((request) => request.method === 'PUT')?.body as { phone: null }).phone, null);
});

test('a bad phone, or a missing name, never reaches Aonik', async () => {
  signedIn();
  stubAonik(() => undefined);

  assert.deepEqual(await saveDetailsAction({ firstName: '', lastName: '', phone: '123' }), {
    status: 'invalid',
    errors: { firstName: 'Enter your first name.', lastName: 'Enter your last name.', phone: 'Enter a phone number, like 07700 900123.' },
  });
  assert.equal(aonikRequests.length, 0);
});

test('a 403 on a details or address write is "may not", not "session over": the cookie stays', async () => {
  signedIn();
  stubAonik((request) => (request.method === 'PUT' && request.path === '/profiles/customers/me' ? { status: 403, body: { error: 'no' } } : { status: 200, body: PROFILE }));
  const details = await saveDetailsAction({ firstName: 'Ada', lastName: 'L', phone: '07700 900123' });
  assert.deepEqual(details, { status: 'failed', message: DETAILS_MESSAGES.refused });

  stubAonik((request) => (request.method === 'DELETE' ? { status: 403, body: { error: 'no' } } : { status: 200, body: BOOK }));
  const removed = await removeAddressAction({ id: 'a1', version: 'v1' });
  assert.equal(removed.status === 'failed' && removed.message, ADDRESS_MESSAGES.forbidden);
  assert.ok(cookieValue(SESSION_COOKIE), 'the session was not cleared');
});

test('an address saved outside the UK is edited in its own country: kept, and not held to a UK postcode', async () => {
  signedIn();
  assert.deepEqual(addressFormErrors({ label: '', line1: '1 Rue X', line2: '', city: 'Dublin', postcode: 'D02 X285' }, 'IE'), {});
  assert.equal(toAddressWrite({ label: '', line1: '1 Rue X', line2: '', city: 'Dublin', postcode: 'd02 x285' }, 'IE')?.country, 'IE');
  assert.equal(toAddressWrite({ label: '', line1: '1 Rue X', line2: '', city: 'Dublin', postcode: 'd02 x285' }, 'IE')?.postcode, 'D02 X285');

  stubAonik((request) => (request.method === 'PUT' ? { status: 200, body: BOOK } : undefined));
  await saveAddressAction({ id: 'a1', version: 'v1', values: { label: '', line1: '1 Rue X', line2: '', city: 'Dublin', postcode: 'D02 X285' }, makeDefault: false, knownIds: ['a1'], keep: { country: 'IE' } });
  assert.equal((aonikRequests[0].body as { country: string }).country, 'IE');

  aonikRequests.length = 0;
  await saveAddressAction({ id: 'a1', version: 'v1', values: { label: '', line1: 'x', line2: '', city: 'y', postcode: 'DA1 1AA' }, makeDefault: false, knownIds: ['a1'], keep: { country: 'not-a-code', line3: 5 as unknown as string } });
  assert.equal((aonikRequests[0].body as { country: string }).country, 'GB', 'an unreadable country falls back to GB');
  assert.equal((aonikRequests[0].body as { line3: unknown }).line3, null, 'a carried field that is not a string is dropped');
});

test('a refused or failed save says so plainly, and a dead session is "ended"', async () => {
  signedIn();
  stubAonik((request) => (request.method === 'PUT' ? { status: 422, body: { error: 'Phone must be in E.164 format.' } } : { status: 200, body: PROFILE }));
  const refused = await saveDetailsAction({ firstName: 'Ada', lastName: 'L', phone: '07700 900123' });
  assert.deepEqual(refused, { status: 'failed', message: DETAILS_MESSAGES.refused });

  stubAonik((request) => (request.method === 'PUT' ? { status: 503, body: { error: 'down' } } : { status: 200, body: PROFILE }));
  assert.deepEqual(await saveDetailsAction({ firstName: 'Ada', lastName: 'L', phone: '07700 900123' }), { status: 'failed', message: DETAILS_MESSAGES.unavailable });

  stubAonik(() => ({ status: 401, body: { error: 'expired' } }));
  assert.deepEqual(await saveDetailsAction({ firstName: 'Ada', lastName: 'L', phone: '07700 900123' }), { status: 'ended' });
});

test('the reset link goes to the address Aonik holds for this session, under the reset limits', async () => {
  signedIn();
  setRequestHeaders({ 'x-forwarded-for': '198.51.100.4' });
  stubAonik((request) => {
    if (request.path === '/profiles/customers/me') return { status: 200, body: PROFILE };
    if (request.path === '/identity/password/forgot') return { status: 200 };
    return undefined;
  });

  const sent = await sendPasswordResetLinkAction();

  assert.deepEqual(sent, { status: 'sent', email: 'ada@example.com' });
  const forgot = aonikRequests.find((request) => request.path === '/identity/password/forgot');
  assert.equal((forgot?.body as { email: string }).email, 'ada@example.com');

  for (let attempt = 0; attempt < 2; attempt++) await sendPasswordResetLinkAction();
  const limited = await sendPasswordResetLinkAction();
  assert.equal(limited.status, 'failed');
  assert.equal(limited.status === 'failed' && limited.message, DETAILS_MESSAGES.resetLimited);
  assert.equal(aonikRequests.filter((request) => request.path === '/identity/password/forgot').length, 3);
});

/* ---- Pages ------------------------------------------------------------------------- */

function renderPageSession() {
  signedIn();
  renderMode();
}

test('the Addresses page lists the book with Default, Edit, Set as default and Remove', async () => {
  renderPageSession();
  stubAonik((request) => (request.path === '/profiles/customers/me/addresses' ? { status: 200, body: NEW_BOOK } : undefined));

  const html = renderToStaticMarkup(await AddressesPage());
  const read = text(html);

  assert.match(read, /Addresses/);
  assert.match(read, /Home Default 12 High Street Flat 2 Old Town Dartford Kent DA1 1AA/);
  assert.match(read, /Home 5 New Road Leeds LS1 1AA/);
  assert.equal((html.match(/Set as default/g) ?? []).length, 1, 'the default has no "Set as default"');
  assert.match(html, /aria-label="Edit Home address"/);
  assert.match(read, /Add an address/);
  assert.doesNotMatch(read, /offered at checkout/, 'nothing promised that is not built');
});

test('an empty book says so; an unreadable one says so with Try again', async () => {
  renderPageSession();
  stubAonik(() => ({ status: 200, body: { version: 'v1', addresses: [] } }));
  assert.match(text(renderToStaticMarkup(await AddressesPage())), /No saved addresses yet\./);

  stubAonik(() => ({ status: 503, body: { error: 'down' } }));
  const html = renderToStaticMarkup(await AddressesPage());
  assert.match(text(html), /Your addresses are unavailable right now/);
  assert.match(html, /href="\/account\/addresses"[^>]*>Try again</);
});

test('the address book view renders from a plain book (the client island’s first paint)', () => {
  const html = renderToStaticMarkup(<AddressBookView initial={mapAddressBook(BOOK)} />);
  assert.match(text(html), /Home Default 12 High Street/);
});

test('the Details page: name and phone editable, email shown and not editable, no newsletter toggle or waitlist', async () => {
  renderPageSession();
  stubAonik((request) => (request.path === '/profiles/customers/me' ? { status: 200, body: PROFILE } : undefined));

  const html = renderToStaticMarkup(await DetailsPage());
  const read = text(html);

  assert.match(read, /Details & preferences/);
  assert.match(html, /id="details-first"[^>]*value="Ada"/);
  assert.match(html, /id="details-phone"[^>]*value="07700 900123"/);
  assert.match(html, /id="details-email"[^>]*readOnly=""[^>]*|readOnly=""[^>]*id="details-email"/);
  assert.match(html, /value="ada@example.com"/);
  assert.match(read, /To change your email address, contact us\./);
  assert.match(read, /Password We’ll email you a secure link to set a new password\. Send reset link/);
  assert.match(read, /Emails & cookies Order and delivery emails are always sent\. Cookie preferences/);
  assert.match(html, /data-consent-open/);
  assert.match(read, /To close your account and delete your data, contact us ?\./);
  assert.doesNotMatch(read, /Kitchen notes|waitlist/i);
});

test('the account menu lists every built section', () => {
  assert.deepEqual(
    ACCOUNT_SECTIONS.map((section) => [section.label, section.href]),
    [
      ['Overview', '/account'],
      ['Orders', '/account/orders'],
      ['Addresses', '/account/addresses'],
      ['Details & preferences', '/account/details'],
    ],
  );
});

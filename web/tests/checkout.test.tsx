import './support/runtime';

import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

import { DELETE as checkoutDelete, GET as checkoutGet, PUT as checkoutPut } from '../src/app/api/checkout/[action]/route';
import type { BoxCartDto, CartDeliveryReservationDto, CheckoutDraftResponseDto } from '../src/lib/aonik/dto';
import type { BoxQuote } from '../src/lib/aonik/map';
import {
  addMonths,
  dayLabel,
  demoDayStatus,
  edgeAvailable,
  monthRange,
  monthTitle,
  monthWeeks,
  readDayStatus,
  stepAvailable,
} from '../src/lib/checkout/calendar';
import { appliedLine, codeRefusal, lapsedLine } from '../src/lib/checkout/codes';
import {
  blockerTarget,
  checkoutBlockers,
  cleanInput,
  detailsFromDraft,
  draftSections,
  EMPTY_DETAILS,
  FIELD_MESSAGES,
  fieldError,
  formatPostcodeInput,
  mergeDetails,
  needText,
  postcodeError,
  type CheckoutDetails,
  type CheckoutGate,
} from '../src/lib/checkout/form';
import { holdAnnouncement, holdPhase, minutesLeft, parseUtc, readReservation } from '../src/lib/checkout/reservation';
import { loadCheckout } from '../src/lib/checkout/server';
import { summaryRows } from '../src/lib/checkout/summary';

import { aonikRequests, configureAonik, useAonik, type AonikRequest } from './support/aonik';
import { renderMode, resetCookies } from './support/next-headers';

/*
 * Checkout (#31; design: Checkout v2). The rules live React-free in
 * `src/lib/checkout/`; the seam is `/api/checkout/*`, which talks to Aonik's
 * draft, reservation and discount routes (aonik#344–#347, #355).
 */

const COMPLETE: CheckoutDetails = {
  email: 'pat@example.com',
  firstName: 'Pat',
  lastName: 'Customer',
  line1: '1 Example Road',
  line2: '',
  city: 'London',
  postcode: 'SW1A 1AA',
  phone: '07700 900123',
  notes: '',
};

const gate = (overrides: Partial<CheckoutGate> = {}): CheckoutGate => ({
  details: COMPLETE,
  coverage: { status: 'serves', postcode: 'SW1A 1AA' },
  date: '2026-10-22',
  hold: 'held',
  availabilityKnown: true,
  codeRefused: false,
  ...overrides,
});

/* ---- The form ---------------------------------------------------------------- */

test('each field says what is wrong in the design’s words', () => {
  assert.equal(fieldError('email', ''), 'Enter your email address');
  assert.equal(fieldError('email', 'pat@example'), 'Enter an email address like name@example.com');
  assert.equal(fieldError('email', ' pat@example.com '), null);
  assert.equal(fieldError('firstName', '  '), 'Enter your first name');
  assert.equal(fieldError('lastName', ''), 'Enter your last name');
  assert.equal(fieldError('line1', ''), 'Enter the first line of your address');
  assert.equal(fieldError('city', ''), 'Enter your town or city');
  assert.equal(fieldError('postcode', ''), 'Enter your postcode');
  assert.equal(fieldError('postcode', 'SW1'), 'Enter a full UK postcode, like SE1 7PB');
  assert.equal(fieldError('postcode', 'gir 0aa'), null, 'Girobank is a live postcode');
  assert.equal(fieldError('phone', ''), 'Enter a phone number');
  assert.equal(fieldError('phone', '0770 090'), 'Enter a phone number with at least 10 digits');
  assert.equal(fieldError('phone', '+44 (0) 7700 900123'), null);
  assert.equal(fieldError('phone', '0'.repeat(18)), FIELD_MESSAGES.phoneLong);
  assert.equal(fieldError('phone', '0770 BIG CAT'), FIELD_MESSAGES.phoneCharacters);
  assert.equal(fieldError('line2', ''), null, 'optional');
  assert.equal(fieldError('notes', ''), null, 'optional');
});

test('a postcode is upper-cased as typed and spaced once its inward code is complete', () => {
  assert.equal(formatPostcodeInput('sw1a'), 'SW1A');
  assert.equal(formatPostcodeInput('sw1a1a'), 'SW1A1A', 'no space mid-word');
  assert.equal(formatPostcodeInput('sw1a1aa'), 'SW1A 1AA');
  assert.equal(formatPostcodeInput('  se1  7pb'), 'SE1 7PB');
});

test('one function decides what blocks payment, in page order', () => {
  assert.deepEqual(checkoutBlockers(gate()), []);

  const empty = checkoutBlockers(gate({ details: EMPTY_DETAILS, coverage: { status: 'idle' }, date: null, hold: 'none' }));
  assert.deepEqual(
    empty.map((blocker) => (blocker.kind === 'field' ? blocker.field : blocker.kind)),
    ['email', 'firstName', 'lastName', 'line1', 'city', 'postcode', 'phone', 'date'],
  );
  assert.equal(needText(empty), 'Complete 8 details to continue.');

  // A postcode we have not been told we serve blocks as surely as a refusal.
  for (const coverage of [
    { status: 'idle' as const },
    { status: 'checking' as const, postcode: 'SW1A 1AA' },
    { status: 'not-served' as const, postcode: 'SW1A 1AA' },
    { status: 'unavailable' as const, postcode: 'SW1A 1AA' },
    { status: 'serves' as const, postcode: 'SE1 7PB' },
  ]) {
    assert.deepEqual(checkoutBlockers(gate({ coverage })), [{ kind: 'eligibility' }], coverage.status);
  }
  // A postcode the lookup found does not exist is the field's own error.
  const unknown = gate({ coverage: { status: 'invalid', postcode: 'SW1A 1AA' } });
  assert.deepEqual(checkoutBlockers(unknown), [{ kind: 'field', field: 'postcode' }]);
  assert.equal(postcodeError(unknown.details, unknown.coverage), 'Check your postcode and try again.');

  assert.equal(needText([{ kind: 'date' }]), 'Choose a delivery date to continue.');
  assert.equal(needText(checkoutBlockers(gate({ hold: 'ended' }))), 'Choose a new delivery date to continue.');
  assert.equal(needText(checkoutBlockers(gate({ codeRefused: true }))), 'Complete 1 detail to continue.');
  assert.deepEqual(checkoutBlockers(gate({ date: null, availabilityKnown: false })), [{ kind: 'availability' }]);

  assert.equal(blockerTarget({ kind: 'field', field: 'city' }, { hasSuggestion: true }), 'ck-town');
  assert.equal(blockerTarget({ kind: 'eligibility' }, { hasSuggestion: true }), 'ck-postcode');
  assert.equal(blockerTarget({ kind: 'date' }, { hasSuggestion: true }), 'ck-use-date');
  assert.equal(blockerTarget({ kind: 'date' }, { hasSuggestion: false }), 'ck-another');
  assert.equal(blockerTarget({ kind: 'hold' }, { hasSuggestion: true }), 'ck-hold-new');
});

test('the form owns its sections of the draft; another tab’s save is merged, never overwritten', () => {
  const sections = draftSections({ ...COMPLETE, postcode: 'sw1a1aa', notes: '  Ring twice ' });
  assert.deepEqual(sections, {
    purchaser: { email: 'pat@example.com', firstName: 'Pat', lastName: 'Customer', phone: '07700 900123' },
    address: { line1: '1 Example Road', line2: null, city: 'London', region: null, postcode: 'SW1A 1AA', countryCode: 'GB' },
    notes: 'Ring twice',
  });
  assert.deepEqual(draftSections(EMPTY_DETAILS), { purchaser: null, address: null, notes: null }, 'untouched is null');
  assert.deepEqual(detailsFromDraft({ ...sections, deliveryDate: '2026-10-22' }), { ...COMPLETE, notes: 'Ring twice' });
  assert.deepEqual(detailsFromDraft(null), EMPTY_DETAILS);

  const base = { ...COMPLETE };
  const local = { ...COMPLETE, phone: '07700 900999', city: 'Leeds' };
  const server = { ...COMPLETE, city: 'Bristol', notes: 'Leave at the door' };
  assert.deepEqual(mergeDetails(base, local, server), {
    ...COMPLETE,
    phone: '07700 900999', // only this tab changed it: kept
    city: 'Bristol', // the other tab changed it: theirs
    notes: 'Leave at the door',
  });
});

test('a pasted control character becomes a space; line breaks stay in the notes alone', () => {
  assert.equal(cleanInput('line1', '1\tExample\u0085Road\n'), '1 Example Road ');
  assert.equal(cleanInput('notes', 'Ring twice\r\nthen wait\u0007'), 'Ring twice\r\nthen wait ');
  assert.equal(cleanInput('email', 'pat@example.com'), 'pat@example.com');
});

/* ---- The calendar ------------------------------------------------------------- */

test('the calendar runs Monday first, names every day’s state, and offers only what Aonik offered', () => {
  // October 2026 starts on a Thursday: three empty cells first.
  const weeks = monthWeeks('2026-10', (date) => (date === '2026-10-22' ? 'available' : date === '2026-10-23' ? 'fully_booked' : undefined));
  assert.equal(weeks[0].slice(0, 3).every((cell) => cell === null), true);
  assert.equal(weeks[0][3]?.date, '2026-10-01');
  assert.equal(weeks.flat().filter(Boolean).length, 31);
  assert.equal(weeks.flat().find((cell) => cell?.date === '2026-10-05')?.status, 'no_delivery', 'unmentioned is no delivery');

  assert.equal(dayLabel('2026-10-22', 'available', false), 'Thursday 22 October, available');
  assert.equal(dayLabel('2026-10-22', 'available', true), 'Thursday 22 October, selected');
  assert.equal(dayLabel('2026-10-23', 'fully_booked', false), 'Friday 23 October, fully booked');
  assert.equal(dayLabel('2026-10-24', 'unknown', false), 'Saturday 24 October, no delivery');
  assert.equal(readDayStatus('maybe'), 'unknown');

  assert.equal(monthTitle('2026-10'), 'October 2026');
  assert.equal(addMonths('2026-11', 2), '2027-01');
  assert.deepEqual(monthRange('2028-02'), { fromDate: '2028-02-01', days: 29 });

  const open = new Set(['2026-10-30', '2026-11-03']);
  const available = (date: string) => open.has(date);
  const range = { min: '2026-10-01', max: '2027-01-31' };
  assert.equal(stepAvailable('2026-10-30', 1, available, range), '2026-11-03', 'arrows cross months');
  assert.equal(stepAvailable('2026-10-30', -1, available, range), null);
  assert.equal(edgeAvailable('2026-11', 'start', available), '2026-11-03');
  assert.equal(edgeAvailable('2026-12', 'end', available), null);

  // Demo's placeholder: nothing inside a week, no Sunday or Monday runs.
  assert.equal(demoDayStatus('2026-10-12', '2026-10-10'), 'no_delivery');
  assert.equal(demoDayStatus('2026-10-19', '2026-10-10'), 'no_delivery', 'a Monday');
  assert.notEqual(demoDayStatus('2026-10-20', '2026-10-10'), 'no_delivery');
});

/* ---- The reservation --------------------------------------------------------- */

const reservationDto = (overrides: Partial<NonNullable<CartDeliveryReservationDto['reservation']>> = {}, now = '2026-10-10T12:00:00Z'): CartDeliveryReservationDto => ({
  cartId: 'c1',
  cartVersion: 'v9',
  serverNowUtc: now,
  reservation: {
    id: 'r1',
    deliveryDate: '2026-10-22',
    status: 'Held',
    selectedAtUtc: '2026-10-10T11:50:00Z',
    expiresAtUtc: '2026-10-10T12:05:00Z',
    paymentAttemptId: null,
    paymentStartedAtUtc: null,
    paymentDeadlineUtc: null,
    orderId: null,
    ...overrides,
  },
});

test('the hold counts down from Aonik’s own clock, and anything but a live hold has ended', () => {
  assert.deepEqual(readReservation(reservationDto()), { date: '2026-10-22', status: 'held', remainingMs: 5 * 60_000 });
  // .NET may drop the Z: the times are UTC by name.
  assert.deepEqual(readReservation(reservationDto({ expiresAtUtc: '2026-10-10T12:01:00' }, '2026-10-10T12:00:00')), {
    date: '2026-10-22',
    status: 'held',
    remainingMs: 60_000,
  });
  assert.equal(parseUtc('2026-10-10T12:00:00'), Date.UTC(2026, 9, 10, 12));
  assert.equal(readReservation(reservationDto({ expiresAtUtc: '2026-10-10T11:59:00Z' }))?.status, 'ended');
  assert.equal(readReservation(reservationDto({ status: 'Released' }))?.status, 'ended');
  assert.equal(readReservation(reservationDto({ status: 'Mystery' }))?.status, 'ended', 'never treated as held');
  assert.equal(readReservation(reservationDto({ status: 'PaymentPending' }))?.status, 'payment');
  assert.deepEqual(readReservation({ ...reservationDto(), reservation: null }, '2026-10-24'), {
    date: '2026-10-24',
    status: 'ended',
    remainingMs: 0,
  });
  assert.equal(readReservation(null), null);

  assert.equal(holdPhase(5 * 60_000), 'saved');
  assert.equal(holdPhase(3 * 60_000), 'warn');
  assert.equal(holdPhase(0), 'ended');
  assert.equal(minutesLeft(61_000), 2);
  assert.equal(minutesLeft(1), 1, 'never 0 while it holds');

  assert.equal(holdAnnouncement('saved', 'warn', 3 * 60_000), 'Your delivery date is reserved for 3 more minutes.');
  assert.equal(holdAnnouncement('warn', 'warn', 2 * 60_000), null, 'the minutes are never announced');
  assert.equal(holdAnnouncement('warn', 'ended', 0), 'Your delivery-date reservation has ended. Choose a new date.');
  assert.equal(holdAnnouncement(null, 'ended', 0), null, 'arriving on an ended hold is shown, not announced');
});

/* ---- Codes and the summary ------------------------------------------------------- */

test('a code is applied or refused for its real reason — never “something went wrong”', () => {
  assert.equal(codeRefusal('commerce.discount_expired'), 'This code has expired.');
  assert.equal(codeRefusal('commerce.discount_invalid'), 'We couldn’t apply that code. Check it and try again.');
  assert.equal(codeRefusal(undefined), 'We couldn’t apply that code just now. Please try again.');
  assert.equal(appliedLine('SAVE10'), 'SAVE10 has been applied to your order.');
  assert.match(lapsedLine('SAVE10', 'commerce.discount_not_eligible'), /SAVE10 can no longer be applied\. This code doesn’t apply to the items in your box\. Remove it to continue\./);
});

test('the summary renders Aonik’s components as given, a row only where it applies', () => {
  const quote: BoxQuote = {
    components: [
      { key: 'boxPrice', amountPence: 15800 },
      { key: 'personalisation', amountPence: 0 },
      { key: 'unitSurcharges', amountPence: 800 },
      { key: 'addOns', amountPence: 650 },
      { key: 'deliveryCharged', amountPence: 0 },
      { key: 'discount', amountPence: -1580 },
    ],
    deliveryListPence: 1000,
    totalPence: 15670,
    currency: 'GBP',
    unitsSelected: 6,
    boxSize: 6,
    spacesLeft: 0,
    isFull: true,
    discount: { code: 'SAVE10', amountPence: 1580 },
  };
  assert.deepEqual(
    summaryRows(quote, { deliveryDate: '2026-10-22' }).map(({ label, value, was }) => [label, value, was]),
    [
      ['6-dish box', '£158.00', undefined],
      ['Signature upgrades', '+£8.00', undefined],
      ['Extras', '+£6.50', undefined],
      ['Delivery · Thu 22 Oct', 'Free', '£10.00'],
      ['Discount (SAVE10)', '−£15.80', undefined],
    ],
  );
  // No date held yet: "Delivery", never the suggestion as though it were chosen.
  assert.equal(summaryRows(quote, { deliveryDate: null }).find((row) => row.key.startsWith('deliveryCharged'))?.label, 'Delivery');
});

/* ---- The route, against Aonik ------------------------------------------------------- */

const CART_COOKIE = { 'abbys-table-cart': JSON.stringify({ cartId: 'c1', cartToken: 'secret-token' }) };

const call = (method: 'GET' | 'PUT' | 'DELETE', action: string, body?: unknown, version = 'v1', query = '') => {
  const request = new Request(`http://shop.test/api/checkout/${action}${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Cart-Version': version },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const handler = method === 'GET' ? checkoutGet : method === 'PUT' ? checkoutPut : checkoutDelete;
  return handler(request, { params: Promise.resolve({ action }) });
};

const SAVED_DRAFT: CheckoutDraftResponseDto = {
  cartId: 'c1',
  cartVersion: 'v1',
  status: 'Open',
  orderId: null,
  draft: {
    purchaser: { email: 'old@example.com', firstName: '', lastName: '', phone: '' },
    deliveryDate: '2026-10-22',
    discountCode: 'SAVE10',
    createAccount: true,
    acceptedTermsVersion: null,
    requestedPoints: 0,
  },
};

function box(overrides: Partial<BoxCartDto> = {}): BoxCartDto {
  return {
    box: { cartId: 'c1', bundleProductId: 'b1', size: 6, currency: 'GBP', lines: [] },
    quote: {
      components: [{ key: 'boxPrice', amount: 158 }],
      deliveryList: 0,
      total: 158,
      currency: 'GBP',
      unitsSelected: 6,
      boxSize: 6,
      spacesLeft: 0,
      isFull: true,
    },
    changes: [],
    cartToken: null,
    cartVersion: 'v2',
    status: 'Open',
    orderId: null,
    checkoutDraft: SAVED_DRAFT.draft,
    ...overrides,
  };
}

test('saving the form echoes every section it does not own, on the tab’s version', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  resetCookies(CART_COOKIE);
  useAonik((request) => {
    if (request.path === '/commerce/carts/c1/checkout-draft' && request.method === 'GET') return { status: 200, body: SAVED_DRAFT };
    if (request.path === '/commerce/carts/c1/checkout-draft' && request.method === 'PUT') {
      return { status: 200, body: { ...SAVED_DRAFT, cartVersion: 'v2', draft: request.body } };
    }
    return undefined;
  });

  const response = await call('PUT', 'draft', { details: COMPLETE }, 'v1');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { version: 'v2', details: COMPLETE });

  const write = aonikRequests.find((request) => request.method === 'PUT')!;
  assert.equal(write.headers['x-cart-version'], 'v1', 'the tab’s version, not the read’s');
  assert.equal(write.headers['x-cart-token'], 'secret-token');
  const sent = write.body as Record<string, unknown>;
  assert.equal(sent.deliveryDate, '2026-10-22', 'saving a name never clears the date');
  assert.equal(sent.discountCode, 'SAVE10');
  assert.equal(sent.createAccount, true);
  assert.deepEqual(sent.purchaser, { email: 'pat@example.com', firstName: 'Pat', lastName: 'Customer', phone: '07700 900123' });
  assert.equal((sent.address as { countryCode: string }).countryCode, 'GB');

  // What the page sends is bounded before Aonik sees it.
  assert.equal((await call('PUT', 'draft', { details: { ...COMPLETE, firstName: 'x'.repeat(101) } })).status, 400);
  assert.equal((await call('PUT', 'draft', { nope: true })).status, 400);
});

test('another tab’s change: nothing is written, and the box, draft and hold come back as they are', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  resetCookies(CART_COOKIE);
  useAonik((request) => {
    if (request.path === '/commerce/carts/c1/checkout-draft' && request.method === 'GET') return { status: 200, body: SAVED_DRAFT };
    if (request.path === '/commerce/carts/c1/checkout-draft' && request.method === 'PUT') {
      return { status: 409, body: { code: 'commerce.cart_conflict', message: 'Stale', cartVersion: 'v7', status: 'Open' } };
    }
    if (request.path === '/commerce/carts/c1') return { status: 200, body: box({ cartVersion: 'v7' }) };
    if (request.path === '/commerce/carts/c1/delivery-reservation') return { status: 200, body: reservationDto() };
    return undefined;
  });
  const response = await call('PUT', 'draft', { details: COMPLETE }, 'v1');
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.code, 'cart.conflict');
  assert.equal(body.cart.version, 'v7');
  assert.equal(body.details.email, 'old@example.com');
  assert.equal(body.reservation.status, 'held');
  assert.equal(aonikRequests.filter((request) => request.method === 'PUT').length, 1, 'never replayed');
});

test('a date: held on success; refusals named so the page can say why', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  resetCookies(CART_COOKIE);
  let reply: { status: number; body: unknown } = { status: 200, body: reservationDto() };
  useAonik((request: AonikRequest) =>
    request.path === '/commerce/carts/c1/delivery-reservation' && request.method === 'PUT' ? reply : undefined,
  );

  const held = await call('PUT', 'reservation', { date: '2026-10-22' }, 'v3');
  assert.deepEqual(await held.json(), { version: 'v9', reservation: { date: '2026-10-22', status: 'held', remainingMs: 300_000 } });
  assert.deepEqual(aonikRequests[0].body, { deliveryDate: '2026-10-22' });
  assert.equal(aonikRequests[0].headers['x-cart-version'], 'v3');

  for (const [code, status, ours] of [
    ['commerce.delivery_date_full', 409, 'checkout.date_full'],
    ['commerce.no_delivery', 409, 'checkout.date_full'],
    ['commerce.delivery_availability_unknown', 503, 'checkout.availability_unknown'],
    ['commerce.delivery_reservation_expired', 409, 'checkout.reservation_ended'],
  ] as const) {
    reply = { status, body: { error: 'No', code } };
    const refused = await call('PUT', 'reservation', { date: '2026-10-22' });
    assert.equal(refused.status, status);
    assert.equal((await refused.json()).code, ours, code);
  }
  assert.equal((await call('PUT', 'reservation', { date: '2026-02-30' })).status, 400, 'not a real date');
});

test('a code: Aonik’s refusal reason is passed on; an applied one re-reads the box, on the write’s version', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  resetCookies(CART_COOKIE);
  useAonik((request) => {
    if (request.path === '/commerce/carts/c1/discount' && request.method === 'PUT') {
      return (request.body as { code: string }).code === 'OLD'
        ? { status: 400, body: { error: 'This discount code has expired.', code: 'commerce.discount_expired' } }
        : { status: 200, body: { cartId: 'c1', cartVersion: 'v4', currency: 'GBP', subtotal: 158, discountTotal: 15.8, taxTotal: 0, deliveryTotal: 0, total: 142.2, discount: { code: 'SAVE10', amount: 15.8 } } };
    }
    if (request.path === '/commerce/carts/c1') {
      return {
        status: 200,
        body: box({
          cartVersion: 'v5',
          quote: { ...box().quote, components: [{ key: 'boxPrice', amount: 158 }, { key: 'discount', amount: -15.8 }], total: 142.2, discount: { code: 'SAVE10', amount: 15.8 } },
        }),
      };
    }
    if (request.path === '/commerce/carts/c1/discount' && request.method === 'DELETE') return { status: 200, body: {} };
    return undefined;
  });

  const refused = await call('PUT', 'discount', { code: ' old ' });
  assert.equal(refused.status, 400);
  assert.deepEqual(await refused.json(), { error: 'This code has expired.', code: 'commerce.discount_expired' });

  const applied = await call('PUT', 'discount', { code: 'save10' });
  const { cart } = await applied.json();
  // The re-read may already carry another tab's change; the tab's next write is based on its own.
  assert.equal(cart.version, 'v4');
  assert.equal(cart.quote.totalPence, 14220);
  assert.deepEqual(cart.quote.discount, { code: 'SAVE10', amountPence: 1580 });
  assert.deepEqual(aonikRequests.find((request) => request.method === 'PUT' && (request.body as { code: string }).code === 'SAVE10')?.body, { code: 'SAVE10' });

  assert.equal((await call('DELETE', 'discount')).status, 200);
});

test('a code: Aonik’s own races are said plainly; a change that took but cannot be shown asks for a reload', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  resetCookies(CART_COOKIE);
  let readable = true;
  useAonik((request) => {
    if (request.path === '/commerce/carts/c1/discount' && request.method === 'PUT') {
      return (request.body as { code: string }).code === 'RACE'
        ? { status: 409, body: { error: 'Conflict', code: 'commerce.discount_conflict' } }
        : { status: 200, body: { cartId: 'c1', cartVersion: 'v4', currency: 'GBP', subtotal: 158, discountTotal: 15.8, taxTotal: 0, deliveryTotal: 0, total: 142.2 } };
    }
    if (request.path === '/commerce/carts/c1') return readable ? { status: 200, body: box() } : { status: 503, body: {} };
    return undefined;
  });

  const race = await call('PUT', 'discount', { code: 'race' });
  assert.equal(race.status, 409);
  assert.deepEqual(await race.json(), { error: 'We couldn’t apply that code just now. Please try again.', code: 'commerce.discount_conflict' });

  readable = false;
  const quiet = mock.method(console, 'error', () => undefined);
  const unseen = await call('PUT', 'discount', { code: 'save10' });
  quiet.mock.restore();
  assert.equal(unseen.status, 503);
  assert.deepEqual(await unseen.json(), { error: 'SAVE10 has been applied. Reload the page to see your total.', code: 'cart.reload' });
});

test('reading the hold reports the box’s version without handing it over; a sync hands over the box, draft and hold together', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  resetCookies(CART_COOKIE);
  let cart: BoxCartDto | null = box({ cartVersion: 'v8' });
  useAonik((request) => {
    if (request.path === '/commerce/carts/c1/delivery-reservation') return { status: 200, body: reservationDto() };
    if (request.path === '/commerce/carts/c1') return cart ? { status: 200, body: cart } : { status: 404, body: {} };
    return undefined;
  });

  const hold = await (await call('GET', 'reservation')).json();
  assert.equal(hold.boxVersion, 'v9');
  assert.equal('version' in hold || 'cart' in hold, false, 'nothing the cart engine would adopt');
  assert.equal(hold.reservation.status, 'held');

  const synced = await call('GET', 'sync');
  assert.equal(synced.status, 200);
  const sync = await synced.json();
  assert.equal(sync.cart.version, 'v8');
  assert.equal(sync.details.email, 'old@example.com');
  assert.equal(sync.reservation.status, 'held');
  assert.equal('locked' in sync, false);

  cart = box({ orderId: 'o1' });
  const locked = await call('GET', 'sync');
  assert.equal(locked.status, 409);
  assert.equal((await locked.json()).code, 'cart.locked');

  cart = null;
  const gone = await call('GET', 'sync');
  assert.equal(gone.status, 404);
  assert.equal((await gone.json()).cart, null);
});

test('the calendar read: one uncached Aonik read, its earliest date the suggestion, validated input', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  resetCookies();
  useAonik((request) => {
    if (request.path.startsWith('/commerce/config/delivery/dates')) {
      return {
        status: 200,
        body: {
          earliestDeliveryDate: '2026-10-20',
          timezone: 'Europe/London',
          fromDate: '2026-10-19',
          toDate: '2026-10-21',
          dates: ['2026-10-20'],
          availability: [
            { deliveryDate: '2026-10-19', status: 'no_delivery' },
            { deliveryDate: '2026-10-20', status: 'available' },
            { deliveryDate: '2026-10-21', status: 'fully_booked' },
          ],
          serverNowUtc: '2026-10-10T12:00:00Z',
        },
      };
    }
    return undefined;
  });
  const response = await call('GET', 'dates', undefined, '', '?from=2026-10-19&days=3');
  assert.deepEqual(await response.json(), {
    calendar: {
      earliestDeliveryDate: '2026-10-20',
      fromDate: '2026-10-19',
      toDate: '2026-10-21',
      days: [
        { date: '2026-10-19', status: 'no_delivery' },
        { date: '2026-10-20', status: 'available' },
        { date: '2026-10-21', status: 'fully_booked' },
      ],
    },
  });
  assert.equal(aonikRequests.every((request) => request.cache === 'no-store'), true, 'holds change availability');
  assert.deepEqual(aonikRequests.map((request) => request.path), ['/commerce/config/delivery/dates?fromDate=2026-10-19&days=3']);

  assert.equal((await call('GET', 'dates', undefined, '', '?from=2026-10-19&days=63')).status, 400);
  assert.equal((await call('GET', 'dates', undefined, '', '?from=soon&days=3')).status, 400);
});

/* ---- The entry gate ----------------------------------------------------------- */

test('the entry gate: no box, an incomplete box, an order, a payment in progress, or ready', async () => {
  configureAonik({ AONIK_DATA_MODE: 'live' });
  let cart: BoxCartDto | null = box();
  useAonik((request) => {
    if (request.path === '/commerce/carts/c1') return cart ? { status: 200, body: cart } : { status: 404, body: {} };
    if (request.path === '/commerce/carts/c1/delivery-reservation') return { status: 200, body: reservationDto() };
    return undefined;
  });

  resetCookies(CART_COOKIE);
  renderMode();
  const ready = await loadCheckout();
  assert.equal(ready.kind, 'ready');
  assert.equal(ready.kind === 'ready' && ready.details.email, 'old@example.com');
  assert.equal(ready.kind === 'ready' && ready.reservation?.status, 'held');

  cart = box({ status: 'CheckedOut' });
  assert.equal((await loadCheckout()).kind, 'completed');
  cart = box({ orderId: 'o1' });
  assert.equal((await loadCheckout()).kind, 'payment');
  cart = box({ quote: { ...box().quote, isFull: false } });
  assert.equal((await loadCheckout()).kind, 'incomplete');

  // Gone: the page render cannot clear the cookie, and must not fail trying.
  cart = null;
  const quiet = mock.method(console, 'error', () => undefined);
  assert.equal((await loadCheckout()).kind, 'none');
  quiet.mock.restore();

  resetCookies();
  assert.equal((await loadCheckout()).kind, 'none');

  // A signed-in session to renew: nothing is read (a render could not keep the renewed cookie).
  resetCookies({
    ...CART_COOKIE,
    'abbys-table-session': JSON.stringify({ accessToken: 'old', expiresAt: Date.now() - 60_000, refreshToken: 'r1' }),
  });
  renderMode();
  aonikRequests.length = 0;
  assert.equal((await loadCheckout()).kind, 'session');
  assert.equal(aonikRequests.length, 0);
});

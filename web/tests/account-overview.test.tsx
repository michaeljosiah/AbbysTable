import './support/runtime';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';

import AccountOverviewPage from '../src/app/(site)/account/(frame)/page';
import NextDeliverySlot from '../src/app/(site)/account/(frame)/@hero/page';
import HeroNothing from '../src/app/(site)/account/(frame)/@hero/[...rest]/page';
import { deliveryTracker } from '../src/lib/account/tracker';
import { mapAddressBook } from '../src/lib/aonik/addresses';
import { mapLoyaltyBalance } from '../src/lib/aonik/loyalty';
import { SESSION_COOKIE } from '../src/lib/auth/session';

import { aonikRequests, configureAonik, useAonik as installAonik, type AonikReply, type AonikRequest } from './support/aonik';
import { cookieValue, renderMode, resetCookies } from './support/next-headers';

/*
 * My Account, PR 2 (#35): the overview, the Next delivery card, and the data
 * behind them — against a stubbed Aonik.
 */

configureAonik({ AONIK_AUTH_CLIENT_ID: 'storefront' });

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const ID = '0b6c1e2a-1111-4222-8333-444455556666';

/* ---- Rules and mappers ------------------------------------------------------- */

test('the tracker marks the step an order is at; an unknown status draws none', () => {
  assert.deepEqual(deliveryTracker('Cooking'), {
    headline: 'We’re preparing your box',
    steps: [
      { label: 'Confirmed', state: 'done' },
      { label: 'Cooking', state: 'now' },
      { label: 'Out for delivery', state: 'todo' },
      { label: 'Delivered', state: 'todo' },
    ],
  });
  assert.equal(deliveryTracker('Confirmed')?.headline, 'Your order is confirmed');
  assert.equal(deliveryTracker('Confirmed')?.steps[0].state, 'now');
  assert.equal(deliveryTracker('OutForDelivery')?.headline, 'Your box is on its way');
  assert.equal(deliveryTracker('Delivered'), null, 'a delivered order is not "next"');
  assert.equal(deliveryTracker('Cancelled'), null);
  assert.equal(deliveryTracker(undefined), null);
});

test('an address book reads its default by id, else by flag, with empty lines dropped', () => {
  const dto = {
    version: 'v3',
    defaultAddressId: 'b',
    addresses: [
      { id: 'a', type: 'Home', line1: '1 A St', line2: null, line3: null, city: 'Leeds', state: null, postcode: 'LS1 1AA', country: 'GB', isDefault: true },
      { id: 'b', type: 'Home', line1: '12 High Street', line2: ' ', line3: null, city: 'Dartford', state: 'Kent', postcode: 'DA1 1AA', country: 'GB', isDefault: false },
    ],
  };

  const book = mapAddressBook(dto);
  assert.deepEqual(book.defaultAddress?.lines, ['12 High Street', 'Dartford', 'Kent', 'DA1 1AA']);
  assert.equal(book.version, 'v3');
  assert.equal(mapAddressBook({ ...dto, defaultAddressId: null }).defaultAddress?.id, 'a');
  assert.equal(mapAddressBook({ version: 'v1', addresses: null }).defaultAddress, undefined);
});

test('a points balance is read in pence from Aonik’s own value, never recomputed', () => {
  assert.deepEqual(
    mapLoyaltyBalance({ balancePoints: 1250, reservedPoints: 100, availablePoints: 1150, value: 12.5, highestFivePoundMarkSeen: 2 }),
    { balancePoints: 1250, reservedPoints: 100, availablePoints: 1150, valuePence: 1250 },
  );
});

/* ---- Pages ---------------------------------------------------------------------- */

function signedIn() {
  resetCookies({
    [SESSION_COOKIE]: JSON.stringify({ accessToken: 'a', expiresAt: Date.now() + 3_600_000, email: 'ada@example.com' }),
  });
  renderMode();
}

function stubAonik(handlers: Record<string, AonikReply>) {
  installAonik((request: AonikRequest) => {
    for (const [prefix, reply] of Object.entries(handlers)) if (request.path.startsWith(prefix)) return reply;
    return { status: 404, body: { error: 'none' } };
  });
}

const SELECTIONS = [{ productVariantId: 'v1', quantity: 2, sku: 'JOL', personalisationSummary: null, name: 'Jollof Rice' }];

const ORDERS = {
  status: 200,
  body: {
    items: [
      { orderId: ID, placedAtUtc: '2026-10-01T10:00:00', status: 'Placed', currency: 'GBP', total: 158, boxSize: 6, deliveryDate: '2026-10-08', isGift: false, orderNumber: 'AT-10517', fulfilmentStatus: 'Cooking', historyGroup: 'Upcoming', paymentStatus: 'Captured', selections: SELECTIONS },
      { orderId: 'past-1', placedAtUtc: '2026-07-30T10:00:00', status: 'Placed', currency: 'GBP', total: 109, boxSize: 6, deliveryDate: '2026-08-06', isGift: false, orderNumber: 'AT-10482', fulfilmentStatus: 'Delivered', historyGroup: 'Past', paymentStatus: 'Captured', selections: SELECTIONS },
    ],
    totalCount: 2, page: 1, pageSize: 20,
  },
};

const DETAIL = {
  status: 200,
  body: {
    orderId: ID, placedAtUtc: '2026-10-01T10:00:00', status: 'Placed', currency: 'GBP', subtotal: 158, discountTotal: 0, taxTotal: 0, total: 158, boxSize: 6, items: [], selections: [],
    delivery: { address: { line1: '12 High Street', city: 'Dartford', postcode: 'DA1 1AA', countryCode: 'GB' }, deliveryDate: '2026-10-08' },
  },
};

const LOYALTY = { status: 200, body: { balancePoints: 1250, reservedPoints: 0, availablePoints: 1250, value: 12.5, highestFivePoundMarkSeen: 0 } };
const ADDRESSES = {
  status: 200,
  body: { version: 'v1', defaultAddressId: 'a1', addresses: [{ id: 'a1', type: 'Home', line1: '12 High Street', city: 'Dartford', postcode: 'DA1 1AA', country: 'GB', isDefault: true }] },
};

const ALL = {
  '/commerce/storefront/loyalty': LOYALTY,
  '/profiles/customers/me/addresses': ADDRESSES,
  [`/commerce/storefront/orders/${ID}`]: DETAIL,
  '/commerce/storefront/orders': ORDERS,
};

test('the overview shows points, the default address and the latest orders', async () => {
  signedIn();
  stubAonik(ALL);

  const html = renderToStaticMarkup(await AccountOverviewPage());
  const read = text(html);

  assert.match(read, /Overview/);
  assert.match(read, /1,250 points Worth £12\.50/);
  assert.match(read, /Delivering to 12 High Street Dartford DA1 1AA/);
  assert.match(read, /Recent orders Thursday 8 October AT-10517 · 6-dish box · Cooking £158/);
  assert.match(read, /Thursday 6 August AT-10482 · 6-dish box · Delivered £109/);
  assert.doesNotMatch(read, /Order again|Manage addresses/, 'what is not built is not offered');
  assert.match(html, new RegExp(`href="/account/orders/${ID}"`), 'each row links to its own order');
});

test('a 403 on an optional card is "may not read", not "session over": the cookie stays and the page carries on', async () => {
  signedIn();
  stubAonik({
    ...ALL,
    '/commerce/storefront/loyalty': { status: 403, body: { error: 'forbidden' } },
    '/profiles/customers/me/addresses': { status: 403, body: { error: 'forbidden' } },
  });

  const read = text(renderToStaticMarkup(await AccountOverviewPage()));

  assert.doesNotMatch(read, /points|Delivering to/);
  assert.match(read, /Recent orders/);
  assert.ok(cookieValue(SESSION_COOKIE), 'the session was not cleared');
});

test('a balance of zero draws no points card: Aonik answers zeros for "nothing earned" and for "no programme"', async () => {
  signedIn();
  stubAonik({ ...ALL, '/commerce/storefront/loyalty': { status: 200, body: { balancePoints: 0, reservedPoints: 0, availablePoints: 0, value: 0, highestFivePoundMarkSeen: 0 } } });

  const read = text(renderToStaticMarkup(await AccountOverviewPage()));

  assert.doesNotMatch(read, /points|Worth/);
  assert.match(read, /Delivering to/);
});

test('addresses with none marked default say so, rather than "no saved address"', async () => {
  signedIn();
  stubAonik({
    ...ALL,
    '/profiles/customers/me/addresses': { status: 200, body: { version: 'v1', defaultAddressId: null, addresses: [{ id: 'a', type: 'Billing', line1: '1 A St', city: 'Leeds', postcode: 'LS1 1AA', country: 'GB', isDefault: false }] } },
  });

  const read = text(renderToStaticMarkup(await AccountOverviewPage()));

  assert.match(read, /No default address set\./);
  assert.doesNotMatch(read, /No saved address yet/);
});

test('a card that cannot be read is left out, never guessed: the page carries on', async () => {
  signedIn();
  stubAonik({ ...ALL, '/commerce/storefront/loyalty': { status: 404, body: { error: 'off' } }, '/profiles/customers/me/addresses': { status: 500, body: { error: 'down' } } });

  const read = text(renderToStaticMarkup(await AccountOverviewPage()));

  assert.doesNotMatch(read, /points|Delivering to/);
  assert.match(read, /Recent orders Thursday 8 October/);
});

test('no saved address and no orders say so plainly', async () => {
  signedIn();
  stubAonik({
    ...ALL,
    '/profiles/customers/me/addresses': { status: 200, body: { version: 'v1', addresses: [] } },
    '/commerce/storefront/orders': { status: 200, body: { items: [], totalCount: 0, page: 1, pageSize: 20 } },
  });

  const read = text(renderToStaticMarkup(await AccountOverviewPage()));

  assert.match(read, /No saved address yet\./);
  assert.match(read, /Your orders will appear here\./);
});

test('a signed-out request is redirected to Log in with the overview as its return path', async () => {
  resetCookies();
  renderMode();
  stubAonik({});

  await assert.rejects(AccountOverviewPage(), (error: { digest?: string }) => {
    assert.ok(String(error.digest).startsWith('NEXT_REDIRECT'));
    assert.equal(String(error.digest).split(';')[2], '/login?next=%2Faccount');
    return true;
  });
  assert.equal(aonikRequests.length, 0);
});

test('a session Aonik ends mid-render goes through the route that ends the cookie', async () => {
  signedIn();
  stubAonik({ ...ALL, '/commerce/storefront/loyalty': { status: 401, body: { error: 'expired' } } });

  await assert.rejects(AccountOverviewPage(), (error: { digest?: string }) => {
    assert.equal(String(error.digest).split(';')[2], '/account/refresh?next=%2Faccount&ended=1');
    return true;
  });
});

/* ---- The Next delivery card ----------------------------------------------------- */

test('the hero carries the Next delivery card for the soonest upcoming order', async () => {
  signedIn();
  stubAonik(ALL);

  const element = await NextDeliverySlot();
  assert.ok(element);
  const html = renderToStaticMarkup(element);
  const read = text(html);

  assert.match(read, /Next delivery We’re preparing your box Thursday 8 October Order AT-10517 · 12 High Street, Dartford DA1 1AA/);
  assert.match(html, /<ol[^>]*aria-label="Delivery progress"/);
  assert.match(html, /aria-current="step"/);
  assert.match(read, /Completed: Confirmed/);
  assert.match(read, /Current: Cooking/);
  assert.match(html, new RegExp(`href="/account/orders/${ID}"`));
  assert.doesNotMatch(read, /Need to change this delivery|7am/);
});

test('the card skips an upcoming order with no step to show and takes the next that has one', async () => {
  signedIn();
  const [first, second] = ORDERS.body.items;
  stubAonik({
    ...ALL,
    '/commerce/storefront/orders': {
      status: 200,
      body: { items: [{ ...first, orderId: 'odd', fulfilmentStatus: 'Mystery', deliveryDate: '2026-10-07' }, second.orderId === 'past-1' ? first : second], totalCount: 2, page: 1, pageSize: 20 },
    },
  });

  const element = await NextDeliverySlot();
  assert.ok(element);
  assert.match(text(renderToStaticMarkup(element)), /We’re preparing your box/);
});

test('no upcoming order, no session or an unreadable list: no card', async () => {
  signedIn();
  stubAonik({ ...ALL, '/commerce/storefront/orders': { status: 200, body: { items: [], totalCount: 0, page: 1, pageSize: 20 } } });
  assert.equal(await NextDeliverySlot(), null);

  stubAonik({ ...ALL, '/commerce/storefront/orders': { status: 503, body: { error: 'down' } } });
  assert.equal(await NextDeliverySlot(), null);

  resetCookies();
  renderMode();
  stubAonik({});
  assert.equal(await NextDeliverySlot(), null);
  assert.equal(aonikRequests.length, 0);

  assert.equal(HeroNothing(), null);
});

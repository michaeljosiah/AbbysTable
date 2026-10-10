import './support/runtime';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';

import OrderDetailPage from '../src/app/(site)/account/(frame)/orders/[orderId]/page';
import OrdersPage from '../src/app/(site)/account/(frame)/orders/page';
import AccountLayout from '../src/app/(site)/account/(frame)/layout';
import { AccountNav } from '../src/components/account/AccountNav';
import {
  addressText,
  dishCount,
  dishesToggleLabel,
  giftLine,
  orderBoxLabel,
  orderGroup,
  orderHeading,
  orderStatusLabel,
  splitOrders,
} from '../src/lib/account/orders';
import { mapProfile } from '../src/lib/account/profile';
import { ACCOUNT_SECTIONS, currentSection } from '../src/lib/account/sections';
import { mapOrderDetail, mapOrderSummary, type OrderSummary, type StorefrontOrderSummaryDto } from '../src/lib/aonik/orders';
import { SESSION_COOKIE } from '../src/lib/auth/session';
import { CartProvider } from '../src/lib/cart/CartProvider';

import { aonikRequests, configureAonik, useAonik as installAonik, type AonikReply, type AonikRequest } from './support/aonik';
import { renderMode, resetCookies } from './support/next-headers';

/*
 * My Account, PR 1 (#35): the order DTOs, the rules for grouping and labelling
 * them, the frame (hero, menu, help), and the Orders pages — against a stubbed
 * Aonik.
 */

configureAonik({ AONIK_AUTH_CLIENT_ID: 'storefront' });

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

function summaryDto(overrides: Partial<StorefrontOrderSummaryDto> = {}): StorefrontOrderSummaryDto {
  return {
    orderId: '0b6c1e2a-1111-4222-8333-444455556666',
    placedAtUtc: '2026-10-01T10:00:00',
    status: 'Placed',
    currency: 'GBP',
    total: 158,
    boxSize: 6,
    deliveryDate: '2026-10-08',
    isGift: false,
    orderNumber: 'AT-10517',
    fulfilmentStatus: 'Cooking',
    historyGroup: 'Upcoming',
    selections: [
      { productVariantId: 'v1', quantity: 2, sku: 'JOL', personalisationSummary: null, name: 'Jollof Rice', isSignature: false },
      { productVariantId: 'v2', quantity: 1, sku: 'EGU', personalisationSummary: 'Mild', name: 'Egusi Soup', isSignature: true },
      { productVariantId: 'v3', quantity: 1, sku: 'LEG', personalisationSummary: null, name: null },
    ],
    ...overrides,
  };
}

function order(overrides: Partial<StorefrontOrderSummaryDto> = {}): OrderSummary {
  return mapOrderSummary(summaryDto(overrides));
}

/* ---- DTOs ----------------------------------------------------------------- */

test('a summary carries the number, delivery day, status, group and the dishes as purchased', () => {
  const mapped = order();

  assert.equal(mapped.orderNumber, 'AT-10517');
  assert.equal(mapped.deliveryDate, '2026-10-08');
  assert.equal(mapped.fulfilmentStatus, 'Cooking');
  assert.equal(mapped.historyGroup, 'Upcoming');
  assert.equal(mapped.totalPence, 15800);
  assert.deepEqual(mapped.dishes, [
    { name: 'Jollof Rice', quantity: 2, isSignature: false },
    { name: 'Egusi Soup', quantity: 1, isSignature: true },
  ]);
});

test('a dish with no purchased name is left out, never named from its sku', () => {
  const mapped = order({ selections: [{ productVariantId: 'v', quantity: 1, sku: 'LEG-SKU', personalisationSummary: null, name: null }] });
  assert.deepEqual(mapped.dishes, []);
});

test('an older Aonik with none of the new fields still maps', () => {
  const mapped = mapOrderSummary({ orderId: 'o', placedAtUtc: '2026-07-01T00:00:00Z', status: 'Placed', currency: 'GBP', total: 109, boxSize: null });

  assert.equal(mapped.orderNumber, undefined);
  assert.equal(mapped.historyGroup, undefined);
  assert.equal(mapped.isGift, false);
  assert.deepEqual(mapped.dishes, []);
});

test('an unknown history group is read as none', () => {
  assert.equal(order({ historyGroup: 'Mystery' }).historyGroup, undefined);
});

test('a detail carries delivery, loyalty and refund in pence, and names', () => {
  const detail = mapOrderDetail({
    orderId: 'o', placedAtUtc: '2026-10-01T10:00:00', status: 'Placed', currency: 'GBP',
    subtotal: 158, discountTotal: 10, taxTotal: 0, total: 153.95, boxSize: 6,
    items: [{ itemType: 'Box', quantity: 1, unitPrice: 158, amountIn: 158, sku: 'BOX', name: 'Six-dish box', itemIndex: 0 }],
    selections: [{ productVariantId: 'v', quantity: 1, sku: 'S', personalisationSummary: null, name: 'Jollof Rice', isSignature: true, orderItemIndex: 0 }],
    orderNumber: 'AT-1', paymentStatus: 'Captured', fulfilmentStatus: 'Confirmed',
    delivery: {
      address: { line1: '12 High Street', line2: null, city: 'Dartford', region: null, postcode: 'DA1 1AA', countryCode: 'GB' },
      deliveryDate: '2026-10-08',
      recipient: { name: 'Kemi Adeyemi', phone: '0' },
      gift: { hidePrices: true, includeGreetingCard: true, greetingCardMessage: null },
    },
    loyalty: { redeemedPoints: 500, appliedValue: 5, earnedPoints: 300, earningStatus: 'Earned' },
    giftCardPaid: 20, cardAmount: 133.95,
    refund: { status: 'Partial', cashReturned: 4, giftRestored: 1, totalReturned: 5 },
  });

  assert.deepEqual(detail.delivery?.addressLines, ['12 High Street', 'Dartford', 'DA1 1AA']);
  assert.equal(detail.delivery?.recipientName, 'Kemi Adeyemi');
  assert.equal(detail.loyalty?.appliedValuePence, 500);
  assert.equal(detail.giftCardPaidPence, 2000);
  assert.equal(detail.refund?.totalReturnedPence, 500);
  assert.equal(detail.selections[0].name, 'Jollof Rice');
  assert.equal(detail.selections[0].isSignature, true);
});

test('a profile reads its first name, trimmed, or none', () => {
  assert.deepEqual(mapProfile({ email: 'a@b.co', firstName: ' Ada ', lastName: null }), { email: 'a@b.co', firstName: 'Ada', lastName: undefined });
  assert.equal(mapProfile({ email: 'a@b.co', firstName: '  ' }).firstName, undefined);
});

/* ---- Rules ---------------------------------------------------------------- */

test('Aonik’s history group decides the list; an older Aonik is read from its fulfilment status', () => {
  assert.equal(orderGroup(order({ historyGroup: 'Upcoming' })), 'upcoming');
  assert.equal(orderGroup(order({ historyGroup: 'Past', fulfilmentStatus: 'Delivered' })), 'past');
  assert.equal(orderGroup(order({ historyGroup: 'PendingPayment', fulfilmentStatus: null })), 'pending');
  assert.equal(orderGroup(order({ historyGroup: null, fulfilmentStatus: 'Cooking' })), 'upcoming');
  assert.equal(orderGroup(order({ historyGroup: null, fulfilmentStatus: 'Delivered' })), 'past');
  assert.equal(orderGroup(order({ historyGroup: null, fulfilmentStatus: 'Cancelled' })), 'past');
  assert.equal(orderGroup(order({ historyGroup: null, fulfilmentStatus: null })), 'pending');
});

test('the status pill reads Aonik’s four steps and Cancelled, else its own words', () => {
  const label = (fulfilmentStatus: string | null, status = 'Placed') => orderStatusLabel(order({ fulfilmentStatus, status }));

  assert.deepEqual(label('Confirmed'), { label: 'Confirmed', kind: 'live' });
  assert.deepEqual(label('Cooking'), { label: 'Cooking', kind: 'live' });
  assert.deepEqual(label('OutForDelivery'), { label: 'Out for delivery', kind: 'live' });
  assert.deepEqual(label('Delivered'), { label: 'Delivered', kind: 'done' });
  assert.deepEqual(label('Cancelled'), { label: 'Cancelled', kind: 'done' });
  assert.deepEqual(label(null, 'Placed'), { label: 'Placed', kind: 'done' });
});

test('orders split into upcoming (soonest first, undated last) and past; unpaid ones are in neither', () => {
  const later = order({ orderId: 'later', deliveryDate: '2026-10-15' });
  const sooner = order({ orderId: 'sooner', deliveryDate: '2026-10-08' });
  const undated = order({ orderId: 'undated', deliveryDate: null });
  const delivered = order({ orderId: 'delivered', historyGroup: 'Past', fulfilmentStatus: 'Delivered' });
  const unpaid = order({ orderId: 'unpaid', historyGroup: 'PendingPayment', fulfilmentStatus: null });

  const { upcoming, past } = splitOrders([later, undated, sooner, delivered, unpaid]);

  assert.deepEqual(upcoming.map((o) => o.orderId), ['sooner', 'later', 'undated']);
  assert.deepEqual(past.map((o) => o.orderId), ['delivered']);
});

test('an order that was never paid is in neither list, whatever Aonik filed it under', () => {
  // Aonik reads an order abandoned or expired at checkout as "Cancelled", under Past.
  assert.equal(orderGroup(order({ historyGroup: 'Past', fulfilmentStatus: 'Cancelled', paymentStatus: 'Cancelled' })), 'pending');
  assert.equal(orderGroup(order({ historyGroup: 'Upcoming', paymentStatus: 'Pending' })), 'pending');
  // Paid, then cancelled: it is the customer's order, and it says so.
  assert.equal(orderGroup(order({ historyGroup: 'Past', fulfilmentStatus: 'Cancelled', paymentStatus: 'Captured' })), 'past');
  // An older Aonik with no payment status is read as before.
  assert.equal(orderGroup(order({ historyGroup: 'Past', paymentStatus: null })), 'past');
});

test('a card is titled by its delivery day, else when it was placed, never a guess', () => {
  assert.equal(orderHeading(order({ deliveryDate: '2026-10-08' })), 'Thursday 8 October');
  assert.equal(orderHeading(order({ deliveryDate: null, placedAtUtc: '2026-07-21T14:32:00Z' })), 'Ordered 21 July 2026');
  assert.equal(orderHeading({ deliveryDate: undefined, placedAtUtc: '' }), 'Your order');
});

test('small labels', () => {
  assert.equal(orderBoxLabel({ boxSize: 6 }), '6-dish box');
  assert.equal(orderBoxLabel({ boxSize: undefined }), 'Box');
  assert.equal(dishesToggleLabel(false, 6), 'Show dishes (6)');
  assert.equal(dishesToggleLabel(true, 6), 'Hide dishes (6)');
  assert.equal(dishCount(order()), 3);
  assert.equal(giftLine({ hidePrices: true, includeGreetingCard: true }, 'Kemi Adeyemi'), 'Gift for Kemi Adeyemi · prices hidden · greeting card');
  assert.equal(giftLine({ hidePrices: false, includeGreetingCard: false }), 'Gift');
  assert.equal(addressText(['12 High Street', 'Dartford', 'DA1 1AA']), '12 High Street, Dartford DA1 1AA');
});

/* ---- Pages ---------------------------------------------------------------- */

const SESSION = JSON.stringify({ accessToken: 'a', expiresAt: Date.now() + 3_600_000, email: 'ada@example.com' });

function signedIn() {
  resetCookies({ [SESSION_COOKIE]: SESSION });
  renderMode();
}

const DETAIL = {
  orderId: '0b6c1e2a-1111-4222-8333-444455556666', placedAtUtc: '2026-10-01T10:00:00', status: 'Placed', currency: 'GBP',
  subtotal: 158, discountTotal: 0, taxTotal: 0, total: 158, boxSize: 6, items: [], selections: [],
  orderNumber: 'AT-10517', fulfilmentStatus: 'Cooking', giftCardPaid: 0,
  delivery: {
    address: { line1: '12 High Street', city: 'Dartford', postcode: 'DA1 1AA', countryCode: 'GB' },
    deliveryDate: '2026-10-08',
    recipient: { name: 'Ada Lovelace', phone: '0' },
  },
};

function stubAonik(handlers: Record<string, AonikReply> = {}) {
  installAonik((request: AonikRequest) => {
    for (const [prefix, reply] of Object.entries(handlers)) if (request.path.startsWith(prefix)) return reply;
    return { status: 404, body: { error: 'none' } };
  });
}

const ordersPage = (page?: string) => OrdersPage({ searchParams: Promise.resolve(page ? { page } : {}) });

test('the Orders page shows Upcoming and Past as cards, with the dishes behind a toggle, and no sign-out of its own', async () => {
  signedIn();
  stubAonik({
    '/commerce/storefront/orders/0b6c1e2a-1111-4222-8333-444455556666': { status: 200, body: DETAIL },
    '/commerce/storefront/orders': {
      status: 200,
      body: {
        items: [
          summaryDto(),
          summaryDto({ orderId: 'ord-0', orderNumber: 'AT-10482', historyGroup: 'Past', fulfilmentStatus: 'Delivered', deliveryDate: '2026-08-06', total: 109 }),
          summaryDto({ orderId: 'ord-x', orderNumber: 'AT-99999', historyGroup: 'PendingPayment', fulfilmentStatus: null }),
        ],
        totalCount: 3, page: 1, pageSize: 20,
      },
    },
  });

  const html = renderToStaticMarkup(await ordersPage());
  const read = text(html);

  assert.match(read, /Orders Upcoming/);
  assert.match(read, /Order AT-10517 Cooking/);
  assert.match(read, /Thursday 8 October/);
  assert.match(read, /12 High Street, Dartford DA1 1AA/, 'the upcoming order carries its address');
  assert.match(read, /Past orders/);
  assert.match(read, /Order AT-10482 Delivered/);
  assert.match(read, /Show dishes \(3\)/);
  assert.doesNotMatch(read, /AT-99999/, 'an unpaid order is not shown');
  assert.doesNotMatch(read, /Sign out|Signed in as/);
  assert.doesNotMatch(read, /Order again|Need to change this delivery/);
  assert.match(html, /href="\/account\/orders\/0b6c1e2a-1111-4222-8333-444455556666"/);
});

test('detail reads are made only for upcoming and gift orders, never one per past order', async () => {
  signedIn();
  const past = Array.from({ length: 12 }, (_, index) =>
    summaryDto({ orderId: `past-${index}`, historyGroup: 'Past', fulfilmentStatus: 'Delivered', orderNumber: `AT-${index}` }),
  );
  stubAonik({
    '/commerce/storefront/orders/': { status: 200, body: DETAIL },
    '/commerce/storefront/orders': { status: 200, body: { items: [summaryDto(), ...past], totalCount: 13, page: 1, pageSize: 20 } },
  });

  await ordersPage();

  const detailReads = aonikRequests.filter((request) => /\/orders\/[^?]+/.test(request.path));
  assert.deepEqual(detailReads.map((request) => request.path), ['/commerce/storefront/orders/0b6c1e2a-1111-4222-8333-444455556666']);
});

test('a detail that cannot be read costs its address line, not the page', async () => {
  signedIn();
  stubAonik({
    '/commerce/storefront/orders/': { status: 500, body: { error: 'down' } },
    '/commerce/storefront/orders': { status: 200, body: { items: [summaryDto()], totalCount: 1, page: 1, pageSize: 20 } },
  });

  const read = text(renderToStaticMarkup(await ordersPage()));

  assert.match(read, /Order AT-10517 Cooking/);
  assert.doesNotMatch(read, /High Street/);
});

test('an order id that is not a GUID never reaches Aonik', async () => {
  signedIn();
  stubAonik();

  await assert.rejects(OrderDetailPage({ params: Promise.resolve({ orderId: '..' }) }), (error: { digest?: string }) =>
    String(error.digest).startsWith('NEXT_NOT_FOUND') || String(error.digest).includes('404'),
  );
  assert.equal(aonikRequests.length, 0);
});

test('the order page lists what was charged for, by name', async () => {
  signedIn();
  stubAonik({
    '/commerce/storefront/orders/0b6c1e2a-1111-4222-8333-444455556666': {
      status: 200,
      body: {
        ...DETAIL,
        items: [
          { itemType: 'Box', quantity: 1, unitPrice: 158, amountIn: 158, sku: 'BOX', name: 'Six-dish box', itemIndex: 0 },
          { itemType: 'Delivery', quantity: null, unitPrice: null, amountIn: 5.95, sku: null, name: null, itemIndex: 1 },
          { itemType: 'Extra', quantity: 2, unitPrice: 4, amountIn: 8, sku: 'X', name: 'Chin chin', itemIndex: 2 },
        ],
      },
    },
  });

  const read = text(renderToStaticMarkup(await OrderDetailPage({ params: Promise.resolve({ orderId: '0b6c1e2a-1111-4222-8333-444455556666' }) })));

  assert.match(read, /What you were charged for Six-dish box £158\.00 Delivery £5\.95 2× Chin chin £8\.00/);
});

test('an empty history says so, with a way to build a box', async () => {
  signedIn();
  stubAonik({ '/commerce/storefront/orders': { status: 200, body: { items: [], totalCount: 0, page: 1, pageSize: 20 } } });

  const html = renderToStaticMarkup(await ordersPage());

  assert.match(text(html), /No deliveries on the way\./);
  assert.match(text(html), /Delivered orders will appear here\./);
  assert.match(html, /href="\/box"[^>]*>Build a box</);
});

test('an outage is said plainly, with Try again', async () => {
  signedIn();
  stubAonik({ '/commerce/storefront/orders': { status: 503, body: { error: 'down' } } });

  const html = renderToStaticMarkup(await ordersPage());

  assert.match(text(html), /Your orders are unavailable right now/);
  assert.match(html, /href="\/account\/orders"[^>]*>Try again</);
});

test('the order page names its dishes as purchased, with Signature, and splits gift card from card', async () => {
  signedIn();
  stubAonik({
    '/commerce/storefront/orders/0b6c1e2a-1111-4222-8333-444455556666': {
      status: 200,
      body: {
        ...DETAIL,
        total: 153.95, giftCardPaid: 20, discountTotal: 4.05,
        selections: [
          { productVariantId: 'v1', quantity: 2, sku: 'JOL', personalisationSummary: 'Mild', name: 'Jollof Rice', isSignature: true },
          { productVariantId: 'v2', quantity: 1, sku: 'LEG-CODE', personalisationSummary: null, name: null },
        ],
        loyalty: { redeemedPoints: 500, appliedValue: 5, earnedPoints: null, earningStatus: 'Pending' },
        refund: { status: 'Partial', cashReturned: 3, giftRestored: 0, totalReturned: 3 },
        delivery: { ...DETAIL.delivery, gift: { hidePrices: true, includeGreetingCard: false } },
      },
    },
  });

  const read = text(renderToStaticMarkup(await OrderDetailPage({ params: Promise.resolve({ orderId: '0b6c1e2a-1111-4222-8333-444455556666' }) })));

  assert.match(read, /Order AT-10517 Cooking/);
  assert.match(read, /Thursday 8 October/);
  assert.match(read, /Ada Lovelace, 12 High Street, Dartford DA1 1AA/);
  assert.match(read, /2× Jollof Rice Signature Mild/);
  assert.match(read, /1× LEG-CODE/, 'a dish with no purchased name is shown by its code, not invented');
  assert.match(read, /Gift for Ada Lovelace · prices hidden/);
  assert.match(read, /500 points −£5\.00/);
  assert.match(read, /Paid with gift card £20\.00/);
  assert.match(read, /Paid by card £133\.95/);
  assert.match(read, /£3\.00 has been returned to you\./);
  assert.doesNotMatch(read, /Listed by product code|Order it again/);
});

/* ---- The frame -------------------------------------------------------------- */

async function layoutHtml(profile: AonikReply) {
  signedIn();
  stubAonik({ '/profiles/customers/me': profile });
  const frame = await AccountLayout({ children: <p>THE SECTION</p> });
  return renderToStaticMarkup(<CartProvider mode="demo">{frame}</CartProvider>);
}

test('the frame greets by first name, carries the menu with Sign out, the section and the help panel', async () => {
  const html = await layoutHtml({ status: 200, body: { email: 'ada@example.com', firstName: 'Ada' } });
  const read = text(html);

  assert.match(html, /<h1[^>]*>Hello, Ada<\/h1>/);
  assert.match(read, /Your orders, points and saved details, all in one place\./);
  assert.match(html, /<nav[^>]*aria-label="Account"/);
  assert.match(read, /Your account Orders Sign out/);
  assert.match(read, /THE SECTION/);
  assert.match(read, /Need help with an order\? Get in touch and we’ll sort it out\. Contact us/);
  assert.doesNotMatch(read, /You have a box in progress/, 'no box, no strip');
});

test('a profile that cannot be read costs the name, not the page', async () => {
  const html = await layoutHtml({ status: 500, body: { error: 'down' } });

  assert.match(html, /<h1[^>]*>Hello<\/h1>/);
  assert.match(text(html), /THE SECTION/);
});

test('a signed-out request gets no frame: the page inside redirects it', async () => {
  resetCookies();
  renderMode();
  stubAonik();

  const frame = await AccountLayout({ children: <p>THE SECTION</p> });

  assert.equal(renderToStaticMarkup(frame), '<p>THE SECTION</p>');
  assert.equal(aonikRequests.length, 0);
});

test('the menu lists only sections that are built, each a real route', () => {
  assert.deepEqual(ACCOUNT_SECTIONS.map((section) => section.href), ['/account/orders']);
  assert.equal(currentSection('/account/orders')?.key, 'orders');
  assert.equal(currentSection('/account/orders/0b6c1e2a-1111-4222-8333-444455556666')?.key, 'orders');
  assert.equal(currentSection('/account'), undefined);
  assert.equal(currentSection(null), undefined);

  const html = renderToStaticMarkup(<AccountNav />);
  assert.match(html, /href="\/account\/orders"/);
  assert.doesNotMatch(html, /aria-current/, 'outside Next there is no current path');
});

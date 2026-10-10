import './support/runtime';
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import PointsPage from '../src/app/(site)/account/(frame)/points/page';
import GiftsPage from '../src/app/(site)/account/(frame)/gifts/page';
import { POST as emailChangePost } from '../src/app/api/account/email-change/route';
import { requestEmailChangeAction } from '../src/lib/account/detailsActions';
import { CheckoutBenefits } from '../src/components/checkout/checkout/CheckoutBenefits';
import { storeBoxChoice } from '../src/lib/cart/adoptionChoice';
import { pointsMilestone } from '../src/lib/account/benefits';
import { resendGiftCardAction } from '../src/lib/account/benefitsActions';
import {
  choiceFromConflict,
  BOX_CHOICE_COOKIE,
} from '../src/lib/cart/adoptionChoice';
import { adoptBoxCart, chooseSignedInBox } from '../src/lib/cart/server';
import { CART_COOKIE } from '../src/lib/cart/cartCookie';
import { SESSION_COOKIE } from '../src/lib/auth/session';
import { configureAonik, useAonik, aonikRequests } from './support/aonik';
import {
  resetCookies,
  cookieValue,
  cookieWrites,
} from './support/next-headers';
configureAonik({ AONIK_AUTH_CLIENT_ID: 'storefront' });
const id = '0b6c1e2a-1111-4222-8333-444455556666';
beforeEach(() =>
  resetCookies({
    [SESSION_COOKIE]: JSON.stringify({
      accessToken: 'a',
      expiresAt: Date.now() + 3600000,
      email: 'a@example.com',
    }),
  }),
);
test('milestones are £5 steps and never repeat an acknowledged mark', () => {
  assert.deepEqual(pointsMilestone(1250, 1), {
    mark: 2,
    reached: true,
    nextPence: 1500,
    toGo: 250,
    percent: 50,
  });
  assert.equal(pointsMilestone(1250, 2).reached, false);
  assert.equal(pointsMilestone(450, 2).reached, false);
});
test('points history keeps negative movements and backend running balance', async () => {
  useAonik((r) =>
    r.path === '/commerce/storefront/loyalty'
      ? {
          status: 200,
          body: {
            balancePoints: 1250,
            reservedPoints: 100,
            availablePoints: 1150,
            value: 12.5,
            highestFivePoundMarkSeen: 2,
          },
        }
      : r.path.startsWith('/commerce/storefront/loyalty/history')
        ? {
            status: 200,
            body: {
              items: [
                {
                  id,
                  kind: 'Redeem',
                  points: -250,
                  runningBalancePoints: 1250,
                  occurredAtUtc: '2026-10-10T12:00:00Z',
                  orderId: id,
                  reason: null,
                },
              ],
              page: 2,
              pageSize: 20,
              totalCount: 30,
            },
          }
        : { status: 503 },
  );
  const html = renderToStaticMarkup(
    await PointsPage({ searchParams: Promise.resolve({ page: '2' }) }),
  );
  assert.match(html, /−250/);
  assert.match(html, /Balance 1,250/);
  assert.match(html, /Worth £12.50/);
  assert.match(html, /points\?page=1/);
  assert.ok(aonikRequests.some((r) => r.path.includes('page=2')));
  assert.ok(aonikRequests.every((r) => r.cache === 'no-store'));
});
test('sent gifts expose masked details and only allowed email resend', async () => {
  useAonik(() => ({
    status: 200,
    body: {
      items: [
        {
          deliveryId: id,
          orderId: id,
          deliveryMethod: 'Email',
          faceValue: 75,
          currency: 'GBP',
          recipientName: 'Sam',
          maskedRecipientEmail: 's***@example.com',
          sendAtUtc: null,
          postingDate: null,
          status: 'Sent',
          lastSentAtUtc: '2026-10-10T12:00:00Z',
          maskedCode: '••••1234',
          expiresAtUtc: null,
          canResend: true,
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    },
  }));
  const html = renderToStaticMarkup(
    await GiftsPage({ searchParams: Promise.resolve({}) }),
  );
  assert.match(html, /Resend email/);
  assert.match(html, /s\*\*\*@example.com/);
  assert.match(html, /£75 gift card/);
  useAonik(() => ({ status: 202 }));
  assert.match(await resendGiftCardAction(id), /Resend requested/);
  assert.equal(
    aonikRequests[0].path,
    `/commerce/storefront/gift-cards/${id}/resend`,
  );
});
test('two-box conflict preserves guest credentials and submits displayed versions', async () => {
  resetCookies({
    [SESSION_COOKIE]: JSON.stringify({
      accessToken: 'a',
      expiresAt: Date.now() + 3600000,
    }),
    [CART_COOKIE]: JSON.stringify({ cartId: 'guest', cartToken: 'secret' }),
  });
  const guest = {
      cartId: 'guest',
      cartVersion: 'v1',
      boxSize: 6,
      lineCount: 3,
      lastActivityAt: '2026-10-10',
    },
    saved = { ...guest, cartId: 'saved', cartVersion: 'v2' };
  useAonik((r) =>
    r.method === 'GET'
      ? { status: 200, body: { status: 'Open', cartVersion: 'v1' } }
      : {
          status: 409,
          body: {
            code: 'commerce.box_choice_required',
            guest,
            savedCandidates: [saved],
          },
        },
  );
  assert.equal(await adoptBoxCart(), 'choice-required');
  assert.ok(cookieValue(CART_COOKIE)?.includes('secret'));
  assert.equal(
    cookieWrites.find((w) => w.name === BOX_CHOICE_COOKIE)?.httpOnly,
    true,
  );
  useAonik(() => ({ status: 200, body: {} }));
  assert.equal(await chooseSignedInBox('UseSaved'), 'chosen');
  assert.deepEqual(aonikRequests[0].body, {
    decision: 'UseSaved',
    expectedSavedCartId: 'saved',
    expectedSavedCartVersion: 'v2',
    expectedGuestCartVersion: 'v1',
  });
  assert.deepEqual(JSON.parse(cookieValue(CART_COOKIE)!), { cartId: 'saved' });
  assert.equal(
    choiceFromConflict({ guest, savedCandidates: [saved, saved] }),
    null,
  );
});

test('a stale choice with no new snapshots never makes a second adoption write', async () => {
  resetCookies({
    [SESSION_COOKIE]: JSON.stringify({
      accessToken: 'a',
      expiresAt: Date.now() + 3600000,
    }),
    [CART_COOKIE]: JSON.stringify({ cartId: 'guest', cartToken: 'secret' }),
  });
  const guest = {
    cartId: 'guest',
    cartVersion: 'v1',
    boxSize: 6,
    lineCount: 2,
    lastActivityAt: '',
  };
  await storeBoxChoice({
    guest,
    saved: { ...guest, cartId: 'saved', cartVersion: 'v2' },
  });
  useAonik(() => ({
    status: 409,
    body: { code: 'commerce.box_choice_stale' },
  }));
  assert.equal(await chooseSignedInBox('UseSaved'), 'refresh');
  assert.equal(aonikRequests.length, 1);
  assert.ok(cookieValue(CART_COOKIE)?.includes('secret'));
});
test('checkout account creation remains available without a loyalty quote', () => {
  const html = renderToStaticMarkup(
    <CheckoutBenefits
      loyalty={undefined}
      signedIn={false}
      createAccount={false}
      busy={false}
      onChange={async () => {}}
    />,
  );
  assert.match(html, /Create an Abby’s Table account/);
  assert.doesNotMatch(html, /points available/);
});
test('email changes request identity confirmation and do not write the profile email directly', async () => {
  useAonik(() => ({ status: 202 }));
  const result = await requestEmailChangeAction('new@example.com');
  assert.equal(result.status, 'requested');
  assert.match(result.message, /If this change is eligible/);
  assert.equal(aonikRequests[0].path, '/profiles/customers/me/email');
  assert.deepEqual(aonikRequests[0].body, { newEmail: 'new@example.com' });
});
test('email confirmation capability is same-origin, httpOnly and consumed only after identity confirmation', async () => {
  const token =
    '0123456789abcdef0123456789abcdef.0123456789abcdef0123456789abcdef.' +
    'a'.repeat(80);
  const req = (body: unknown, origin = 'http://shop.test') =>
    new Request('http://shop.test/api/account/email-change', {
      method: 'POST',
      headers: { origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await emailChangePost(req({ token }, 'http://other.test'))).status,
    403,
  );
  assert.equal((await emailChangePost(req({ token }))).status, 200);
  assert.ok(
    cookieWrites.some(
      (w) => w.name === 'abbys-table-email-change' && w.httpOnly,
    ),
  );
  useAonik(() => ({ status: 200, body: {} }));
  assert.equal((await emailChangePost(req({ confirm: true }))).status, 200);
  assert.equal(aonikRequests[0].path, '/identity/email-change/complete');
  assert.deepEqual(aonikRequests[0].body, { token });
  assert.equal(cookieValue('abbys-table-email-change'), undefined);
});

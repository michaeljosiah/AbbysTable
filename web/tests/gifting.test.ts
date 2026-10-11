import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DESIGN_GIFT_OPTIONS,
  EMPTY_GIFT,
  decodeGiftDraft,
  giftEntry,
  giftTotal,
  isGiftDate,
  londonToday,
  validateGift,
} from '../src/lib/gifting/model';
test('approved amounts and fees remain a non-payable design fixture', () => {
  assert.deepEqual(DESIGN_GIFT_OPTIONS.values, [50, 75, 100, 150]);
  assert.equal(DESIGN_GIFT_OPTIONS.enabled, false);
  assert.equal(DESIGN_GIFT_OPTIONS.emailSendTime, null);
  assert.equal(DESIGN_GIFT_OPTIONS.validForDays, null);
});
test('ten cards charge face value ten times but one postage and greeting fee', () => {
  assert.equal(
    giftTotal(
      {
        ...EMPTY_GIFT,
        value: 75,
        quantity: 10,
        route: 'post',
        includeGreetingCard: true,
      },
      DESIGN_GIFT_OPTIONS,
    ),
    75695,
  );
  assert.equal(
    giftTotal(
      { ...EMPTY_GIFT, value: 75, quantity: 10, includeGreetingCard: true },
      DESIGN_GIFT_OPTIONS,
    ),
    75000,
  );
  assert.equal(
    giftTotal({ ...EMPTY_GIFT, removed: true }, DESIGN_GIFT_OPTIONS),
    0,
  );
});
test('entry query cannot inject an unsupported method, fraction, quantity or message', () => {
  assert.deepEqual(
    giftEntry({
      route: 'post',
      value: '150',
      message: 'ignored',
      quantity: '10',
    }),
    { route: 'post', value: 150 },
  );
  assert.deepEqual(giftEntry({ route: 'https://example.com', value: '0' }), {});
  assert.deepEqual(giftEntry({ value: '1.5' }), {});
  assert.deepEqual(giftEntry({ value: '1000' }), {});
});
test('calendar follows London day, year limit and configured postal weekdays', () => {
  assert.equal(londonToday(new Date('2026-07-01T23:30:00Z')), '2026-07-02');
  assert.equal(
    isGiftDate('2026-10-12', 'post', DESIGN_GIFT_OPTIONS, '2026-10-10'),
    true,
  );
  assert.equal(
    isGiftDate('2026-10-11', 'post', DESIGN_GIFT_OPTIONS, '2026-10-10'),
    false,
  );
  assert.equal(
    isGiftDate('2026-10-11', 'email', DESIGN_GIFT_OPTIONS, '2026-10-10'),
    true,
  );
  assert.equal(
    isGiftDate('2026-10-09', 'email', DESIGN_GIFT_OPTIONS, '2026-10-10'),
    false,
  );
  assert.equal(
    isGiftDate('2027-10-11', 'email', DESIGN_GIFT_OPTIONS, '2026-10-10'),
    false,
  );
  assert.equal(
    isGiftDate('2026-02-30', 'email', DESIGN_GIFT_OPTIONS, '2026-01-01'),
    false,
  );
});
test('email and post validate their own fields and preserve optional last name', () => {
  const email = {
    ...EMPTY_GIFT,
    email: 'buyer@example.test',
    firstName: 'Alex',
    recipientEmail: 'recipient@example.test',
    date: '2026-10-10',
  };
  assert.deepEqual(validateGift(email, DESIGN_GIFT_OPTIONS, '2026-10-10'), {});
  const post = {
    ...email,
    route: 'post' as const,
    recipientEmail: '',
    date: '2026-10-12',
    line1: '1 Example Road',
    city: 'London',
    postcode: 'SW1A 1AA',
    phone: '07123456789',
  };
  assert.deepEqual(validateGift(post, DESIGN_GIFT_OPTIONS, '2026-10-10'), {});
  assert.ok(
    validateGift({ ...post, removed: true }, DESIGN_GIFT_OPTIONS, '2026-10-10')
      .order,
  );
  assert.ok(
    validateGift({ ...email, quantity: 11 }, DESIGN_GIFT_OPTIONS, '2026-10-10')
      .quantity,
  );
  assert.ok(
    validateGift({ ...email, value: 0.5 }, DESIGN_GIFT_OPTIONS, '2026-10-10')
      .value,
  );
});

test('partial gift draft boundary preserves quantity and fields, rejecting oversized or malformed data', () => {
  const draft = {
    ...EMPTY_GIFT,
    route: 'box' as const,
    quantity: 10,
    message: 'For Alex',
    removed: true,
  };
  assert.deepEqual(decodeGiftDraft(draft), draft);
  assert.equal(decodeGiftDraft({ ...draft, quantity: 11 }), null);
  assert.equal(decodeGiftDraft({ ...draft, message: 'x'.repeat(241) }), null);
  assert.equal(decodeGiftDraft({ ...draft, email: 'x'.repeat(255) }), null);
  assert.equal(
    decodeGiftDraft({ ...draft, includeGreetingCard: 'true' }),
    null,
  );
  assert.equal(decodeGiftDraft({ value: 50 }), null);
});

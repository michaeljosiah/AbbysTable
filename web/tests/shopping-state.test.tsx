import './support/runtime';

import assert from 'node:assert/strict';
import test from 'node:test';

import { activeBoxSummary, isBoxActive, resumeHrefFor, type BarCart } from '../src/lib/purchase-bar/activeBox';
import { drawerOrderCta, headerOrderCta } from '../src/lib/site-header/state';
import {
  boxStatus,
  forgetStep,
  guardRedirect,
  LAST_STEP_KEY,
  missingLine,
  progressLine,
  localStore,
  readLastStep,
  readyDishCount,
  rememberStep,
  replacementsBody,
  replacementsTitle,
  STEP_HREFS,
  type BoxStep,
  type ShoppingFacts,
} from '../src/lib/shopping-state';

/*
 * The shared shopping state (#14): one reading of "where is this box" for the
 * header, the drawer, the bar, VIEW BOX and every step's gate.
 */

const facts = (overrides: Partial<ShoppingFacts> = {}): ShoppingFacts => ({
  hydrated: true,
  boxSize: null,
  dishCount: 0,
  unavailableCount: 0,
  ordered: false,
  lastStep: null,
  ...overrides,
});

test('active once committed OR holding a dish — never before the cart is read', () => {
  assert.equal(boxStatus(facts()).active, false);
  assert.equal(boxStatus(facts({ boxSize: 6 })).active, true, 'committed and empty is still active');
  assert.equal(boxStatus(facts({ dishCount: 1 })).active, true, 'a dish carried from a dish page');
  assert.equal(boxStatus(facts({ hydrated: false, boxSize: 6, dishCount: 3 })).active, false);
});

test('VIEW BOX resumes at the furthest valid step: Step 1 for a carried dish, Step 2 for an empty or short box, then where the customer got to', () => {
  const resume = (overrides: Partial<ShoppingFacts>) => boxStatus(facts(overrides)).resumeHref;
  assert.equal(resume({ dishCount: 1 }), STEP_HREFS.choose, 'no size committed yet');
  assert.equal(resume({ boxSize: 6 }), STEP_HREFS.dishes, 'committed, empty');
  assert.equal(resume({ boxSize: 6, dishCount: 4, lastStep: 'review' }), STEP_HREFS.dishes, 'short: never beyond Step 2, whatever was reached');
  // A complete box resumes where the customer got to, and never before Extras.
  assert.equal(resume({ boxSize: 6, dishCount: 6 }), STEP_HREFS.extras);
  assert.equal(resume({ boxSize: 6, dishCount: 6, lastStep: 'dishes' }), STEP_HREFS.extras);
  assert.equal(resume({ boxSize: 6, dishCount: 6, lastStep: 'extras' }), STEP_HREFS.extras);
  assert.equal(resume({ boxSize: 6, dishCount: 6, lastStep: 'review' }), STEP_HREFS.review);
  assert.equal(resume({ boxSize: 6, dishCount: 6, lastStep: 'checkout' }), STEP_HREFS.checkout);
  // A dish that stopped being available sends it back to Step 2 whatever was reached.
  assert.equal(resume({ boxSize: 6, dishCount: 5, unavailableCount: 1, lastStep: 'review' }), STEP_HREFS.dishes);
});

test('a box is complete only when full and holding nothing unavailable; what it lacks is counted', () => {
  assert.deepEqual(
    (({ complete, missing, replacements }) => ({ complete, missing, replacements }))(boxStatus(facts({ boxSize: 6, dishCount: 6 }))),
    { complete: true, missing: 0, replacements: 0 },
  );
  const short = boxStatus(facts({ boxSize: 6, dishCount: 5, unavailableCount: 1 }));
  assert.deepEqual({ complete: short.complete, missing: short.missing, replacements: short.replacements }, { complete: false, missing: 1, replacements: 1 });
  assert.equal(boxStatus(facts()).complete, false);
  assert.equal(boxStatus(facts({ boxSize: 6, dishCount: 5 })).readyCount, 5);
});

test('live: Aonik counts a flagged dish in unitsSelected, so what can be ordered is what is left of it', () => {
  // A 6-dish box with one dish no longer available: unitsSelected = 6, isFull = true.
  assert.equal(readyDishCount(6, 1), 5);
  assert.equal(readyDishCount(0, 3), 0, 'never negative');
  const live = boxStatus(facts({ boxSize: 6, dishCount: readyDishCount(6, 1), unavailableCount: 1 }));
  assert.deepEqual(
    { ready: live.readyCount, missing: live.missing, replacements: live.replacements, complete: live.complete, maxStep: live.maxStep },
    { ready: 5, missing: 1, replacements: 1, complete: false, maxStep: 'dishes' },
    'the rail reads 5 of 6 and Add 1 more, and the box goes back to Step 2',
  );
});

test('an unavailable add-on is mended on Extras: nothing past it is open, and VIEW BOX never goes beyond it', () => {
  const status = boxStatus(facts({ boxSize: 6, dishCount: 6, unavailableExtras: 1, lastStep: 'checkout' }));
  assert.equal(status.complete, true, 'the dishes are all there');
  assert.equal(status.maxStep, 'extras');
  assert.equal(status.resumeHref, STEP_HREFS.extras);
  assert.equal(guardRedirect('extras', status), null);
  assert.equal(guardRedirect('review', status), STEP_HREFS.extras);
  assert.equal(guardRedirect('checkout', status), STEP_HREFS.extras);
});

test('step gates: a step can be entered only when every step before it is satisfied; the box is sent to the earliest that can mend it', () => {
  const steps: BoxStep[] = ['choose', 'dishes', 'extras', 'review', 'checkout'];
  const redirects = (status: ReturnType<typeof boxStatus>) => steps.map((step) => guardRedirect(step, status));

  assert.deepEqual(redirects(boxStatus(facts())), [null, '/box', '/box', '/box', '/box'], 'no size: everything past Step 1 goes back to it');
  assert.deepEqual(redirects(boxStatus(facts({ boxSize: 6, dishCount: 4 }))), [null, null, '/box/dishes', '/box/dishes', '/box/dishes'], 'short: Extras, Review and Checkout go back to Step 2');
  assert.deepEqual(redirects(boxStatus(facts({ boxSize: 6, dishCount: 5, unavailableCount: 1 }))), [null, null, '/box/dishes', '/box/dishes', '/box/dishes'], 'an unavailable dish: the same, from any of them');
  assert.deepEqual(redirects(boxStatus(facts({ boxSize: 6, dishCount: 6 }))), [null, null, null, null, null], 'complete: nothing is in the way');
});

test('the replacement copy is SHOPPING-STATE §5’s, verbatim, with the checkout reassurance', () => {
  assert.equal(replacementsTitle(1), 'Your box needs 1 replacement');
  assert.equal(replacementsTitle(2), 'Your box needs 2 replacements');
  assert.equal(
    replacementsBody(1, ['Scent Leaf, Ginger & Lime Chicken'], false),
    'Scent Leaf, Ginger & Lime Chicken is no longer available. We’ve kept everything else in your box. Choose any 1 dish below to complete it.',
  );
  assert.equal(
    replacementsBody(2, ['A', 'B'], false),
    'Two of your saved dishes are no longer available. We’ve kept everything else in your box. Choose any 2 dishes below to complete it.',
  );
  assert.equal(
    replacementsBody(1, ['Okra'], true),
    'Okra is no longer available. We’ve kept the rest of your box and your checkout details. Choose any 1 dish below to complete your box.',
  );
  assert.match(replacementsBody(12, [], false), /^12 of your saved dishes/);
  assert.match(replacementsBody(1, [], false), /^A saved dish is no longer available/, 'a name we do not have is never invented');
  assert.equal(progressLine(5, 6), '5 of 6 dishes');
  assert.equal(missingLine(1), 'Add 1 more dish to continue.');
  assert.equal(missingLine(3), 'Add 3 more dishes to continue.');
});

test('the step reached is remembered only forwards, forgotten with the box, and never throws', () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
  assert.equal(readLastStep(storage), null);
  rememberStep(storage, 'extras');
  rememberStep(storage, 'dishes');
  assert.equal(readLastStep(storage), 'extras', 'going back to add a dish does not lose where they had got to');
  rememberStep(storage, 'review');
  assert.equal(readLastStep(storage), 'review');
  forgetStep(storage);
  assert.equal(readLastStep(storage), null);
  store.set(LAST_STEP_KEY, 'nonsense');
  assert.equal(readLastStep(storage), null, 'only a step we know');
  const broken = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('full'); },
    removeItem: () => { throw new Error('blocked'); },
  };
  assert.equal(readLastStep(broken), null);
  rememberStep(broken, 'review');
  forgetStep(broken);
});

test('the header pill, the drawer and the bar all read the same state, and agree', () => {
  const status = boxStatus(facts({ boxSize: 6, dishCount: 6, lastStep: 'review' }));
  const cart: BarCart = {
    hydrated: true,
    boxSize: 6,
    isCustom: false,
    lines: [],
    extras: [],
    dishCount: 6,
    isServerCart: false,
    quote: null,
    shopping: status,
  };
  assert.equal(isBoxActive(cart), true);
  assert.equal(resumeHrefFor(cart), '/box/review');
  assert.deepEqual(headerOrderCta(cart), { label: 'View box', href: '/box/review', continuing: true });
  assert.deepEqual(drawerOrderCta(cart), { label: 'View box', href: '/box/review', continuing: true });
  assert.equal(activeBoxSummary(cart, null, { minDishes: 6, fromPence: 15800 })?.href, '/box/review');

  // A shared state that says no box wins over a stale cart's own numbers.
  const none = { ...cart, shopping: boxStatus(facts()) };
  assert.equal(isBoxActive(none), false);
  assert.deepEqual(headerOrderCta(none), { label: 'Get started', href: '/box', continuing: false });
  // A cart without one (a plain object) keeps the bare rule.
  const bare = { hydrated: true, boxSize: 12, dishCount: 3 };
  assert.deepEqual(headerOrderCta(bare), { label: 'View box', href: '/box/dishes', continuing: true });
});

test('blocked site data: reading localStorage throws, and nothing here takes the app down', () => {
  const g = globalThis as unknown as { window?: unknown };
  const saved = g.window;
  try {
    g.window = {
      get localStorage(): Storage {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    };
    assert.equal(localStore(), null);
    assert.equal(readLastStep(localStore()), null);
    rememberStep(localStore(), 'review');
    forgetStep(localStore());
    g.window = { localStorage: { getItem: () => null } };
    assert.notEqual(localStore(), null);
  } finally {
    if (saved === undefined) delete g.window;
    else g.window = saved;
  }
});

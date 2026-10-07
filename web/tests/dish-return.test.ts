import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

import { fixtureOptionGroups } from '../src/lib/aonik/fixtureFacets';
import { DISH_FIXTURES } from '../src/lib/aonik/fixtures';
import { encodeSelection } from '../src/lib/aonik/map';
import type { Dish } from '../src/lib/aonik/types';
import {
  DISH_RETURN_STORAGE_KEY,
  DISH_RETURN_TTL_MS,
  createDishReturnRecord,
  dishPath,
  dishReturnGateScript,
  discardDishReturn,
  isGenuineReturn,
  isSameTabClick,
  markDeparted,
  markReturning,
  readDishReturnRecord,
  readDishReturnSlug,
  resolveDishReturn,
  restorableSelection,
  returnsByHistory,
  standardsHref,
  takeDishReturn,
  type ReturnStorage,
} from '../src/lib/dish-return';
import { formatCountInWords } from '../src/lib/format';
import { exampleDishFacts, joinWithAnd } from '../src/lib/standards/exampleDish';

const okra = DISH_FIXTURES.find((dish) => dish.slug === 'royal-seafood-okra') as Dish;
const groups = fixtureOptionGroups(okra);
const NOW = 1_800_000_000_000;
const OKRA_PATH = '/menu/royal-seafood-okra';
/** The token stamped on the dish's own history entry. */
const ENTRY = 'mfz1-abc123';

/** Full table, salmon AND prawns, quinoa, hot — every group, canonically encoded. */
const CHOSEN = encodeSelection(
  groups,
  { portion: ['full'], protein: ['salmon', 'prawns'], side: ['quinoa'], heat: ['3'] },
  false,
)!;

function memoryStorage(initial: Record<string, string> = {}): ReturnStorage & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

const recordFor = (overrides: Partial<ReturnType<typeof createDishReturnRecord>> = {}) =>
  JSON.stringify({
    ...createDishReturnRecord({
      slug: 'royal-seafood-okra',
      now: NOW - 60_000,
      historyLength: 4,
      scrollY: 716,
      entry: ENTRY,
      selection: CHOSEN,
    }),
    ...overrides,
  });

/* ---- Links and the query ------------------------------------------------ */

test('both ends of the round trip build the same URLs, and no URL carries a choice', () => {
  assert.equal(standardsHref('royal-seafood-okra'), '/standards?from=dish&dish=royal-seafood-okra');
  assert.equal(dishPath('royal-seafood-okra'), OKRA_PATH);
});

test('a bare or malformed ?from=dish offers nothing', () => {
  assert.equal(readDishReturnSlug({}), null);
  assert.equal(readDishReturnSlug({ from: 'dish' }), null);
  assert.equal(readDishReturnSlug({ from: 'dish', dish: '' }), null);
  assert.equal(readDishReturnSlug({ from: 'dish', dish: '../account' }), null);
  assert.equal(readDishReturnSlug({ from: 'dish', dish: 'Royal Seafood Okra' }), null);
  assert.equal(readDishReturnSlug({ from: 'dish', dish: 'https://evil.example' }), null);
  assert.equal(readDishReturnSlug({ from: 'dish', dish: 'a'.repeat(121) }), null);
  assert.equal(readDishReturnSlug({ from: 'step2', dish: 'royal-seafood-okra' }), null);
  // A repeated parameter is not trusted.
  assert.equal(readDishReturnSlug({ from: ['dish', 'dish'], dish: 'royal-seafood-okra' }), null);
  assert.equal(readDishReturnSlug({ from: 'dish', dish: ['royal-seafood-okra'] }), null);

  assert.equal(readDishReturnSlug({ from: 'dish', dish: 'royal-seafood-okra' }), 'royal-seafood-okra');
});

test('the back link is validated against real dish data', () => {
  // A forged slug: the catalogue has no such dish (or could not answer).
  assert.equal(resolveDishReturn('not-a-dish', null), null);
  // The catalogue answered for a different dish.
  assert.equal(resolveDishReturn('royal-seafood-okra', { slug: 'jollof-quinoa-bowl' }), null);
  // No query at all.
  assert.equal(resolveDishReturn(null, okra), null);

  assert.deepEqual(resolveDishReturn('royal-seafood-okra', okra), {
    slug: 'royal-seafood-okra',
    href: OKRA_PATH,
  });
});

/* ---- The session record ------------------------------------------------- */

test('the record carries the whole selection and the scroll position', () => {
  const record = createDishReturnRecord({
    slug: 'royal-seafood-okra',
    now: NOW,
    historyLength: 3,
    scrollY: 716.4,
    entry: ENTRY,
    selection: CHOSEN,
  });
  assert.deepEqual(record, {
    v: 1,
    t: NOW,
    slug: 'royal-seafood-okra',
    hl: 3,
    y: 716,
    selection: { portion: 'full', protein: ['salmon', 'prawns'], side: 'quinoa', heat: '3' },
    entry: ENTRY,
    departed: false,
    returning: false,
  });
  // As Abby designed it: no selection at all.
  assert.equal(
    'selection' in
      createDishReturnRecord({ slug: 'x', now: NOW, historyLength: 1, scrollY: 0, entry: ENTRY }),
    false,
  );
});

/** Raw records and whether each counts for royal-seafood-okra at NOW. */
const RECORD_CASES: { name: string; raw: string | null; valid: boolean }[] = [
  { name: 'a live record for this dish', raw: recordFor(), valid: true },
  { name: 'a live record marked returning', raw: recordFor({ returning: true }), valid: true },
  { name: 'a live record with no selection', raw: recordFor({ selection: undefined }), valid: true },
  { name: 'no record', raw: null, valid: false },
  { name: 'an empty string', raw: '', valid: false },
  { name: 'unparseable JSON', raw: '{"v":1,', valid: false },
  { name: 'JSON null', raw: 'null', valid: false },
  { name: 'a bare number', raw: '1', valid: false },
  { name: 'a record for another dish', raw: recordFor({ slug: 'jollof-quinoa-bowl' }), valid: false },
  { name: 'an expired record', raw: recordFor({ t: NOW - DISH_RETURN_TTL_MS }), valid: false },
  {
    name: 'a record one minute inside the TTL',
    raw: recordFor({ t: NOW - DISH_RETURN_TTL_MS + 60_000 }),
    valid: true,
  },
  { name: 'a different version', raw: recordFor({ v: 2 as 1 }), valid: false },
  { name: 'a record with no history length', raw: recordFor({ hl: undefined }), valid: false },
  { name: 'a record with no scroll position', raw: recordFor({ y: undefined }), valid: false },
  { name: 'a record with no returning flag', raw: recordFor({ returning: undefined }), valid: false },
  { name: 'a record with no entry token', raw: recordFor({ entry: undefined }), valid: false },
  { name: 'a record with no departed flag', raw: recordFor({ departed: undefined }), valid: false },
  { name: 'a departed record', raw: recordFor({ departed: true }), valid: true },
  { name: 'a record with a string time', raw: recordFor({ t: String(NOW) as unknown as number }), valid: false },
];

for (const { name, raw, valid } of RECORD_CASES) {
  test(`record: ${name} ${valid ? 'counts' : 'does not count'}`, () => {
    assert.equal(readDishReturnRecord(raw, 'royal-seafood-okra', NOW) !== null, valid);
  });
}

/* ---- The gate script ---------------------------------------------------- */

function runGate(storage: { getItem(key: string): string | null }) {
  // The server renders the control hidden; the script may only reveal it.
  const element = { hidden: true };
  vm.runInNewContext(dishReturnGateScript('royal-seafood-okra', 'gate'), {
    window: { sessionStorage: storage },
    document: { getElementById: (id: string) => (id === 'gate' ? element : null) },
    Date: { now: () => NOW },
    JSON,
    isFinite,
  });
  return element;
}

test('the inline gate script makes exactly the same decision as readDishReturnRecord', () => {
  for (const { name, raw, valid } of RECORD_CASES) {
    const element = runGate({ getItem: (key) => (key === DISH_RETURN_STORAGE_KEY ? raw : null) });
    assert.equal(element.hidden, !valid, `gate script disagreed on: ${name}`);
  }
});

test('the gate script leaves the link hidden when storage throws', () => {
  const element = runGate({
    getItem() {
      throw new Error('SecurityError');
    },
  });
  assert.equal(element.hidden, true);
});

test('no value can close the inline script element', () => {
  const script = dishReturnGateScript('a</script><script>alert(1)//', 'gate');
  assert.equal(script.includes('<'), false);
});

test('Back to dish goes back only when the entry behind is the dish', () => {
  const record = readDishReturnRecord(recordFor(), 'royal-seafood-okra', NOW)!;
  assert.equal(returnsByHistory(record, 5), true);
  // An in-page jump on Our Standards pushed another entry: replace instead.
  assert.equal(returnsByHistory(record, 6), false);
  // History was cut and regrown.
  assert.equal(returnsByHistory(record, 3), false);
});

/* ---- The link: only a click that leaves this tab records anything -------- */

test('a modified or non-primary click on "See our standards" records nothing', () => {
  const plain = {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
  };
  assert.equal(isSameTabClick(plain), true, 'a plain click navigates this tab');
  assert.equal(isSameTabClick({ ...plain, target: '_self' }), true);
  assert.equal(isSameTabClick({ ...plain, target: '' }), true);

  assert.equal(isSameTabClick({ ...plain, metaKey: true }), false, 'Cmd: new tab');
  assert.equal(isSameTabClick({ ...plain, ctrlKey: true }), false, 'Ctrl: new tab');
  assert.equal(isSameTabClick({ ...plain, shiftKey: true }), false, 'Shift: new window');
  assert.equal(isSameTabClick({ ...plain, altKey: true }), false, 'Alt: download');
  assert.equal(isSameTabClick({ ...plain, button: 1 }), false, 'middle button');
  assert.equal(isSameTabClick({ ...plain, button: 2 }), false, 'secondary button');
  assert.equal(isSameTabClick({ ...plain, target: '_blank' }), false, 'another target');
  assert.equal(isSameTabClick({ ...plain, defaultPrevented: true }), false, 'cancelled');
});

/* ---- Restoring on the dish page ----------------------------------------- */

/** A fresh entry: a link, the menu, a bookmark — no stamp in history.state. */
const fresh = { entryStamps: [undefined, undefined], reloaded: false };
/** The very entry the customer left from, reached by Back (in-app or a document load). */
const sameEntry = { entryStamps: [ENTRY, undefined], reloaded: false };
/** Same, when Next.js rewrote the entry's state and only the popstate event kept the stamp. */
const poppedEntry = { entryStamps: [undefined, ENTRY], reloaded: false };
/** This very entry, RELOADED. */
const reloadedEntry = { entryStamps: [ENTRY, undefined], reloaded: true };

const visit = (signals: { entryStamps: unknown[]; reloaded: boolean }) => ({
  slug: 'royal-seafood-okra',
  groups,
  now: NOW,
  ...signals,
});

const WHOLE = { portion: ['full'], protein: ['salmon', 'prawns'], side: ['quinoa'], heat: ['3'] };

test('only a genuine return restores: departed, and back on this entry (or marked)', () => {
  const armed = readDishReturnRecord(recordFor(), 'royal-seafood-okra', NOW);
  const departed = armed && markDeparted(armed);

  assert.equal(isGenuineReturn(null, sameEntry), false, 'no record');
  assert.equal(isGenuineReturn(armed, sameEntry), false, 'armed but never departed');
  assert.equal(isGenuineReturn(armed && markReturning(armed), fresh), false, 'marked but never departed');
  assert.equal(isGenuineReturn(departed, fresh), false, 'departed, but this is a fresh entry');
  assert.equal(isGenuineReturn(departed, { entryStamps: ['another-token'] }), false, 'an older stamp');
  assert.equal(isGenuineReturn(departed, { entryStamps: [{ token: ENTRY }] }), false, 'a junk stamp');

  assert.equal(isGenuineReturn(departed, sameEntry), true, 'Back to the very entry it left from');
  assert.equal(isGenuineReturn(departed, poppedEntry), true, '…known from the popstate event');
  assert.equal(
    isGenuineReturn(departed && markReturning(departed), fresh),
    true,
    '"Back to dish" replaced Our Standards with the dish',
  );
});

test('a fresh visit restores nothing — whatever the URL, and whatever stale or forged record', () => {
  const cases: Record<string, string> = {
    'a departed record, on a fresh entry': recordFor({ departed: true }),
    'an expired departed, marked record': recordFor({
      departed: true,
      returning: true,
      t: NOW - DISH_RETURN_TTL_MS - 1,
    }),
    'a record for another dish': recordFor({ departed: true, returning: true, slug: 'jollof-quinoa-bowl' }),
    'a forged record': '{"v":1,"slug":"royal-seafood-okra","departed":true,"returning":true}',
  };
  for (const [name, raw] of Object.entries(cases)) {
    const storage = memoryStorage({ [DISH_RETURN_STORAGE_KEY]: raw });
    assert.equal(takeDishReturn(storage, visit(fresh)), null, name);
    assert.equal(storage.data.get(DISH_RETURN_STORAGE_KEY), raw, `${name}: left untouched`);
  }
  assert.equal(takeDishReturn(memoryStorage(), visit(sameEntry)), null, 'no record at all');
  assert.equal(
    takeDishReturn(memoryStorage({ [DISH_RETURN_STORAGE_KEY]: recordFor({ departed: true, entry: 'other' }) }), visit(sameEntry)),
    null,
    'a record bound to another entry',
  );
});

test('an armed record that never departed restores nothing, even on its own entry', () => {
  // The P1: a modified click (or an aborted navigation) once wrote a record
  // and stamped the entry while the customer stayed put.
  const storage = memoryStorage({ [DISH_RETURN_STORAGE_KEY]: recordFor() });
  assert.equal(takeDishReturn(storage, visit(sameEntry)), null);
  assert.equal(takeDishReturn(storage, visit(poppedEntry)), null);
});

test('a reload of the stamped entry restores nothing, and drops its record', () => {
  for (const raw of [recordFor(), recordFor({ departed: true }), recordFor({ departed: true, returning: true })]) {
    const storage = memoryStorage({ [DISH_RETURN_STORAGE_KEY]: raw });
    assert.equal(takeDishReturn(storage, visit(reloadedEntry)), null);
    assert.equal(storage.data.has(DISH_RETURN_STORAGE_KEY), false, 'dropped');
  }
  // A reload of some OTHER entry leaves another entry's record alone.
  const other = memoryStorage({ [DISH_RETURN_STORAGE_KEY]: recordFor({ departed: true }) });
  assert.equal(takeDishReturn(other, visit({ entryStamps: [undefined, undefined], reloaded: true })), null);
  assert.equal(other.data.has(DISH_RETURN_STORAGE_KEY), true);
});

test('a genuine return by history restores the WHOLE selection, leaving the scroll to the browser', () => {
  const storage = memoryStorage({ [DISH_RETURN_STORAGE_KEY]: recordFor({ departed: true }) });
  assert.deepEqual(takeDishReturn(storage, visit(sameEntry)), {
    selection: WHOLE,
    y: 716,
    restoreScroll: false,
    entry: ENTRY,
  });
  // Disarmed, not deleted: bound to the entry, restoring nothing until Our
  // Standards marks it departed again.
  const kept = JSON.parse(storage.data.get(DISH_RETURN_STORAGE_KEY)!);
  assert.equal(kept.departed, false);
  assert.equal(kept.returning, false);
  assert.equal(takeDishReturn(storage, visit(sameEntry)), null, 'never applies twice on its own');

  // Forward to Our Standards (which marks it departed) and Back again.
  storage.data.set(DISH_RETURN_STORAGE_KEY, JSON.stringify(markDeparted(kept)));
  assert.deepEqual(takeDishReturn(storage, visit(sameEntry))?.selection, WHOLE);
});

test('"Back to dish" replacing Our Standards restores the selection AND the scroll', () => {
  const storage = memoryStorage({
    [DISH_RETURN_STORAGE_KEY]: recordFor({ departed: true, returning: true }),
  });
  assert.deepEqual(takeDishReturn(storage, visit(fresh)), {
    selection: WHOLE,
    y: 716,
    restoreScroll: true,
    entry: ENTRY,
  });
  assert.equal(takeDishReturn(storage, visit(fresh)), null, 'never applies twice');
});

test('a genuine return as Abby designed it restores no selection', () => {
  const storage = memoryStorage({
    [DISH_RETURN_STORAGE_KEY]: recordFor({ departed: true, selection: undefined, y: 120 }),
  });
  assert.deepEqual(takeDishReturn(storage, visit(sameEntry)), {
    selection: null,
    y: 120,
    restoreScroll: false,
    entry: ENTRY,
  });
});

test('an edit on the dish drops the record bound to this entry, and only that one', () => {
  const here = memoryStorage({ [DISH_RETURN_STORAGE_KEY]: recordFor({ departed: true }) });
  discardDishReturn(here, { slug: 'royal-seafood-okra', now: NOW, entryStamp: ENTRY });
  assert.equal(here.data.has(DISH_RETURN_STORAGE_KEY), false);

  const elsewhere = memoryStorage({ [DISH_RETURN_STORAGE_KEY]: recordFor({ departed: true }) });
  discardDishReturn(elsewhere, { slug: 'royal-seafood-okra', now: NOW, entryStamp: undefined });
  discardDishReturn(elsewhere, { slug: 'jollof-quinoa-bowl', now: NOW, entryStamp: ENTRY });
  assert.equal(elsewhere.data.has(DISH_RETURN_STORAGE_KEY), true);
});

test('a selection is restored whole or not at all', () => {
  const whole = restorableSelection(groups, CHOSEN);
  assert.deepEqual(whole, WHOLE);

  const without = (patch: Record<string, unknown>) => restorableSelection(groups, { ...CHOSEN, ...patch });
  assert.equal(without({ portion: 'jumbo' }), null, 'a choice the dish no longer offers');
  assert.equal(without({ sauce: 'extra' }), null, 'a group the dish does not have');
  assert.equal(without({ portion: ['light', 'full'] }), null, 'two choices in a One group');
  assert.equal(without({ protein: [] }), null, 'an empty Multi group');
  assert.equal(without({ protein: ['salmon', 'salmon'] }), null, 'a repeated choice');
  assert.equal(without({ heat: 3 }), null, 'a non-string value');
  assert.equal(restorableSelection(groups, undefined), null);
  assert.equal(restorableSelection(groups, {}), null);
  assert.equal(restorableSelection(groups, 'full'), null);
  assert.equal(restorableSelection(groups, ['full']), null);

  // A group the dish gained since takes its default; the stored rest is whole.
  const older = Object.fromEntries(Object.entries(CHOSEN).filter(([key]) => key !== 'heat'));
  assert.deepEqual(restorableSelection(groups, older)?.heat, ['2']);
});

/* ---- The example dish panel -------------------------------------------- */

test('the example panel prints only published figures, and names the gaps', () => {
  const facts = exampleDishFacts(okra);

  assert.deepEqual(
    facts.cells.map((cell) => [cell.label, cell.value]),
    [
      ['kcal', '560'],
      ['Fat', '19g'],
      ['Saturates', undefined],
      ['Carbs', '14g'],
      ['Sugars', undefined],
      ['Fibre', '7g'],
      ['Protein', '40g'],
      ['Salt', undefined],
    ],
  );
  assert.deepEqual(facts.unpublished, ['saturates', 'sugars', 'salt']);
  assert.equal(facts.allergens, okra.allergens);
  assert.equal(facts.figuresNote, undefined);
});

test('a dish with no declaration shows none — never a guess', () => {
  const bowl = DISH_FIXTURES.find((dish) => dish.slug === 'jollof-quinoa-bowl') as Dish;
  assert.equal(exampleDishFacts(bowl).allergens, undefined);

  // Aonik withheld the declarations: the half it still returned is not printed.
  const withheld: Dish = {
    ...okra,
    contentState: {
      servingLabel: 'Per serving',
      declarationsWithheld: true,
      figuresAreStandardPreparation: false,
      figuresAreStale: true,
      heatingWithheld: false,
      heating: [],
      contentVersion: 1,
    },
  };
  const facts = exampleDishFacts(withheld);
  assert.equal(facts.allergens, undefined);
  assert.equal(facts.figuresNote, 'These figures are under review and may not reflect the current recipe.');
});

test('a zero is a published figure, not a gap', () => {
  const facts = exampleDishFacts({ ...okra, nutrition: { saltGrams: 0, calories: 0 } });
  assert.equal(facts.cells.find((cell) => cell.label === 'Salt')?.value, '0g');
  assert.equal(facts.cells.find((cell) => cell.label === 'kcal')?.value, '0');
});

test('gaps are listed in plain English', () => {
  assert.equal(joinWithAnd([]), '');
  assert.equal(joinWithAnd(['salt']), 'salt');
  assert.equal(joinWithAnd(['sugars', 'salt']), 'sugars and salt');
  assert.equal(joinWithAnd(['saturates', 'sugars', 'salt']), 'saturates, sugars and salt');
});

test('small counts read as words in copy, larger ones as digits', () => {
  assert.equal(formatCountInWords(6), 'six');
  assert.equal(formatCountInWords(12), 'twelve');
  assert.equal(formatCountInWords(13), '13');
  assert.equal(formatCountInWords(99), '99');
  assert.equal(formatCountInWords(0), 'zero');
  assert.equal(formatCountInWords(2.5), '2.5');
  assert.equal(formatCountInWords(-1), '-1');
});

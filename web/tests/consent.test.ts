import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_ACCEPTED,
  CONSENT_STORAGE_KEY,
  createConsentStore,
  ESSENTIAL_ONLY,
  isGranted,
  needsBanner,
  parseConsentRecord,
  readConsent,
  writeConsent,
  type ConsentSnapshot,
  type ConsentStorage,
} from '../src/lib/consent/consent';

/** An in-memory stand-in for localStorage. */
function memoryStorage(initial: Record<string, string> = {}): ConsentStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  };
}

/** Storage as some private modes behave: every access throws. */
const throwingStorage: ConsentStorage = {
  getItem() {
    throw new Error('SecurityError: access denied');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

const validRecord = {
  v: 1,
  ts: '2026-10-06T12:00:00.000Z',
  preferences: false,
  analytics: true,
  advertising: false,
};

function storedWith(value: unknown) {
  return memoryStorage({ [CONSENT_STORAGE_KEY]: typeof value === 'string' ? value : JSON.stringify(value) });
}

function assertEssentialOnly(snapshot: ConsentSnapshot) {
  assert.deepEqual({ ...snapshot.choices }, { ...ESSENTIAL_ONLY });
  for (const category of ['preferences', 'analytics', 'advertising'] as const) {
    assert.equal(isGranted(snapshot, category), false, `${category} must not be granted`);
  }
}

test('the storage key is the one the contract names', () => {
  assert.equal(CONSENT_STORAGE_KEY, 'at-cookie-consent-v1');
});

test('no stored record: essential only and the banner is needed', () => {
  const snapshot = readConsent(memoryStorage());
  assert.equal(snapshot.status, 'unresolved');
  assert.equal(needsBanner(snapshot), true);
  assertEssentialOnly(snapshot);
});

test('no storage at all: essential only and the banner is needed', () => {
  const snapshot = readConsent(null);
  assert.equal(snapshot.status, 'unresolved');
  assertEssentialOnly(snapshot);
});

test('a valid record round-trips through storage', () => {
  const storage = memoryStorage();
  const now = new Date('2026-10-06T09:30:00.000Z');
  const written = writeConsent(storage, { preferences: true, analytics: false, advertising: true }, now);

  assert.equal(written.status, 'resolved');
  assert.equal(needsBanner(written), false);
  assert.equal(isGranted(written, 'preferences'), true);
  assert.equal(isGranted(written, 'analytics'), false);
  assert.equal(isGranted(written, 'advertising'), true);

  // Exactly { v, ts, preferences, analytics, advertising } under the one key.
  assert.deepEqual([...storage.data.keys()], [CONSENT_STORAGE_KEY]);
  assert.deepEqual(JSON.parse(storage.data.get(CONSENT_STORAGE_KEY)!), {
    v: 1,
    ts: '2026-10-06T09:30:00.000Z',
    preferences: true,
    analytics: false,
    advertising: true,
  });

  const read = readConsent(storage);
  assert.equal(read.status, 'resolved');
  assert.equal(read.ts, '2026-10-06T09:30:00.000Z');
  assert.deepEqual({ ...read.choices }, { preferences: true, analytics: false, advertising: true });
});

test('a stored valid record is read as a resolved choice', () => {
  const snapshot = readConsent(storedWith(validRecord));
  assert.equal(snapshot.status, 'resolved');
  assert.equal(isGranted(snapshot, 'analytics'), true);
  assert.equal(isGranted(snapshot, 'advertising'), false);
});

test('corrupt JSON is no choice: essential only, banner needed', () => {
  for (const raw of ['{', 'not json', '', 'undefined', '{"v":1,']) {
    const snapshot = readConsent(storedWith(raw));
    assert.equal(snapshot.status, 'unresolved', `"${raw}" must not resolve`);
    assertEssentialOnly(snapshot);
  }
});

test('an unknown version is no choice', () => {
  for (const v of [0, 2, '1', null, undefined]) {
    const snapshot = readConsent(storedWith({ ...validRecord, v }));
    assert.equal(snapshot.status, 'unresolved', `v=${String(v)} must not resolve`);
    assertEssentialOnly(snapshot);
  }
});

test('wrong types are no choice — never coerced into consent', () => {
  const invalid: unknown[] = [
    null,
    [],
    42,
    'true',
    { ...validRecord, analytics: 'true' },
    { ...validRecord, analytics: 1 },
    { ...validRecord, advertising: null },
    { ...validRecord, preferences: undefined },
    { v: 1, ts: validRecord.ts, analytics: true },
    { ...validRecord, ts: 'yesterday' },
    { ...validRecord, ts: 1759744800000 },
  ];
  for (const value of invalid) {
    assert.equal(parseConsentRecord(JSON.stringify(value)), null, `${JSON.stringify(value)} must be rejected`);
    const snapshot = readConsent(storedWith(value));
    assert.equal(snapshot.status, 'unresolved');
    assertEssentialOnly(snapshot);
  }
});

test('a throwing storage never crashes: reads are essential only, writes are unsaved', () => {
  const read = readConsent(throwingStorage);
  assert.equal(read.status, 'unresolved');
  assert.equal(needsBanner(read), true);
  assertEssentialOnly(read);

  const written = writeConsent(throwingStorage, ALL_ACCEPTED);
  assert.equal(written.status, 'unsaved');
  assertEssentialOnly(written);
});

test('a write that cannot be read back is not honoured', () => {
  // Accepts writes, but reads throw (getItem overridden, as some browsers block it).
  const writeOnly: ConsentStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {},
  };
  assertEssentialOnly(writeConsent(writeOnly, ALL_ACCEPTED));

  // Silently drops writes.
  const forgetful: ConsentStorage = { getItem: () => null, setItem() {} };
  const snapshot = writeConsent(forgetful, ALL_ACCEPTED);
  assert.equal(snapshot.status, 'unsaved');
  assertEssentialOnly(snapshot);
});

test('a store is pending — essential only, no banner — until it is initialised', () => {
  const store = createConsentStore(() => storedWith(validRecord));
  assert.equal(store.getSnapshot().status, 'pending');
  assert.equal(needsBanner(store.getSnapshot()), false);
  assertEssentialOnly(store.getSnapshot());

  store.init();
  assert.equal(store.getSnapshot().status, 'resolved');
  assert.equal(isGranted(store.getSnapshot(), 'analytics'), true);
});

test('a storage getter that throws leaves the store essential only', () => {
  const store = createConsentStore(() => {
    throw new Error('SecurityError: localStorage is not available');
  });
  assert.equal(store.init().status, 'unresolved');
  assertEssentialOnly(store.getSnapshot());
  assert.equal(store.choose(ALL_ACCEPTED).status, 'unsaved');
  assertEssentialOnly(store.getSnapshot());
});

test('the snapshot is stable between changes', () => {
  const store = createConsentStore(() => storedWith(validRecord));
  const first = store.init();
  assert.equal(store.init(), first, 're-reading an unchanged record must not produce a new snapshot');
  assert.equal(store.getSnapshot(), first);
});

test('withdrawing consent notifies subscribers and closes the gate', () => {
  const storage = memoryStorage();
  const store = createConsentStore(() => storage);
  store.init();

  const seen: ConsentSnapshot[] = [];
  const unsubscribe = store.subscribe((snapshot) => seen.push(snapshot));

  store.choose(ALL_ACCEPTED);
  assert.equal(isGranted(store.getSnapshot(), 'analytics'), true);

  store.choose({ ...ALL_ACCEPTED, analytics: false });
  assert.equal(seen.length, 2);
  assert.equal(isGranted(seen[1], 'analytics'), false);
  assert.equal(isGranted(seen[1], 'advertising'), true);
  assert.equal(JSON.parse(storage.data.get(CONSENT_STORAGE_KEY)!).analytics, false);

  unsubscribe();
  store.choose(ESSENTIAL_ONLY);
  assert.equal(seen.length, 2, 'an unsubscribed listener hears nothing more');
});

test('whileGranted starts on consent and stops on withdrawal, without a reload', () => {
  const storage = memoryStorage();
  const store = createConsentStore(() => storage);
  store.init();

  let starts = 0;
  let stops = 0;
  const dispose = store.whileGranted('analytics', () => {
    starts += 1;
    return () => {
      stops += 1;
    };
  });

  assert.equal(starts, 0, 'nothing runs before a choice');

  store.choose(ALL_ACCEPTED);
  assert.deepEqual([starts, stops], [1, 0]);

  store.choose({ ...ALL_ACCEPTED, advertising: false });
  assert.deepEqual([starts, stops], [1, 0], 'an unrelated change neither restarts nor stops it');

  store.choose({ ...ALL_ACCEPTED, analytics: false });
  assert.deepEqual([starts, stops], [1, 1], 'withdrawal stops it in the same session');

  store.choose(ALL_ACCEPTED);
  assert.deepEqual([starts, stops], [2, 1]);

  dispose();
  assert.deepEqual([starts, stops], [2, 2], 'disposing stops a running technology');

  store.choose(ESSENTIAL_ONLY);
  store.choose(ALL_ACCEPTED);
  assert.deepEqual([starts, stops], [2, 2], 'a disposed gate stays disposed');
});

test('whileGranted runs at once when consent already exists', () => {
  const store = createConsentStore(() => storedWith({ ...validRecord, advertising: true }));
  store.init();
  let starts = 0;
  store.whileGranted('advertising', () => {
    starts += 1;
  });
  assert.equal(starts, 1);
});

test('one failing technology does not stop the others hearing a withdrawal', () => {
  const store = createConsentStore(() => memoryStorage());
  store.init();
  store.choose(ALL_ACCEPTED);

  const originalError = console.error;
  console.error = () => {};
  try {
    store.whileGranted('analytics', () => () => {
      throw new Error('broken cleanup');
    });
    let stopped = false;
    store.whileGranted('analytics', () => () => {
      stopped = true;
    });

    store.choose(ESSENTIAL_ONLY);
    assert.equal(stopped, true);
  } finally {
    console.error = originalError;
  }
});

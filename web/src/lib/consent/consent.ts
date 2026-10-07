/**
 * Cookie consent: the stored record, its validation, and the gate every
 * non-essential technology goes through.
 *
 * Contract: design/build-handoff.md §3s ("Cookie consent — production
 * contract"). Deliberately free of React so the rules can be tested on their
 * own and so a plain script tag can use the same gate a component does.
 *
 * ── The rule for every tag ────────────────────────────────────────────────────
 * ANY preference, analytics or advertising technology — a script, a pixel, an
 * iframe, a tag-manager container, a cookie or storage key it sets — MUST go
 * through this gate: `<ConsentGate category="…">` in React, or `onConsent()`
 * below anywhere else. Nothing optional may load, execute or set storage
 * before a valid choice exists, and withdrawing a category must stop it in the
 * same session, without a reload. A tag that bypasses the gate is a compliance
 * failure, not a visual defect.
 *
 * Never add a `<noscript>` fallback for a tag: with JavaScript unavailable
 * there is no consent, so nothing optional may run — including technologies
 * that do not need JavaScript (§3s "Fail-safe behaviour").
 *
 * Server-side tags are under the same rule, and the server cannot see this
 * choice: it lives in browser storage only. So no tag may fire from the server
 * until a server-readable consent signal is designed — that is a decision for
 * the owner, not something to improvise per tag.
 *
 * The real providers, cookie names and durations per category are a launch
 * dependency (the cookie audit), never something to invent here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The one storage key. The version is IN the key: changing the category set
 * means a new key, so an old answer is retired rather than silently re-read as
 * an answer to a different question.
 */
export const CONSENT_STORAGE_KEY = 'at-cookie-consent-v1';

/** The record's own `v`, matching the key. */
export const CONSENT_VERSION = 1;

/**
 * The three optional categories. Essential is not one of them: it is always on
 * and never stored. Exactly these, matching Privacy section 7 — do not add,
 * rename or split them.
 */
export type ConsentCategory = 'preferences' | 'analytics' | 'advertising';

export const CONSENT_CATEGORIES: readonly ConsentCategory[] = ['preferences', 'analytics', 'advertising'];

export type ConsentChoices = Readonly<Record<ConsentCategory, boolean>>;

/** What is stored under `CONSENT_STORAGE_KEY`: version, ISO timestamp, three booleans. */
export interface ConsentRecord {
  v: typeof CONSENT_VERSION;
  ts: string;
  preferences: boolean;
  analytics: boolean;
  advertising: boolean;
}

/** Every optional category off. What applies whenever there is no valid choice. */
export const ESSENTIAL_ONLY: ConsentChoices = Object.freeze({
  preferences: false,
  analytics: false,
  advertising: false,
});

export const ALL_ACCEPTED: ConsentChoices = Object.freeze({
  preferences: true,
  analytics: true,
  advertising: true,
});

/**
 * - `pending`    — not read yet: the server render, and the moment before the
 *                  consent manager initialises (or a manager that never does).
 *                  Essential only, and no banner, so a returning visitor never
 *                  sees it flash before storage is read.
 * - `unresolved` — no valid choice is stored. Essential only; the banner shows.
 * - `resolved`   — a valid choice was stored and read back. It applies.
 * - `unsaved`    — the visitor chose this session but the choice could not be
 *                  stored and read back (private modes throw). Essential only:
 *                  an unreadable state is no choice, not consent. The banner is
 *                  not re-shown in this page session — it returns on the next
 *                  visit, until a choice can be stored.
 */
export type ConsentStatus = 'pending' | 'unresolved' | 'resolved' | 'unsaved';

export interface ConsentSnapshot {
  readonly status: ConsentStatus;
  /** What may run. Always `ESSENTIAL_ONLY` unless `status` is `resolved`. */
  readonly choices: ConsentChoices;
  /** When the stored choice was made, for a `resolved` snapshot. */
  readonly ts: string | null;
}

/** The part of `Storage` this module touches, so tests can pass a fake. */
export interface ConsentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const PENDING: ConsentSnapshot = Object.freeze({ status: 'pending', choices: ESSENTIAL_ONLY, ts: null });

const UNRESOLVED: ConsentSnapshot = Object.freeze({ status: 'unresolved', choices: ESSENTIAL_ONLY, ts: null });

const UNSAVED: ConsentSnapshot = Object.freeze({ status: 'unsaved', choices: ESSENTIAL_ONLY, ts: null });

/** True only for a valid, stored choice that grants `category`. */
export function isGranted(snapshot: ConsentSnapshot, category: ConsentCategory): boolean {
  return snapshot.status === 'resolved' && snapshot.choices[category] === true;
}

/** The banner is needed whenever no valid choice is stored — until the visitor chooses. */
export function needsBanner(snapshot: ConsentSnapshot): boolean {
  return snapshot.status === 'unresolved';
}

/**
 * Parses a stored value. Anything that is not exactly a version-1 record with
 * a real timestamp and three booleans is `null` — no choice, never consent.
 */
export function parseConsentRecord(raw: string | null | undefined): ConsentRecord | null {
  if (typeof raw !== 'string') return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  if (record.v !== CONSENT_VERSION) return null;
  // An exact ISO round trip, as `writeConsent` stores it: `Date.parse` alone
  // accepts "1" or "2026".
  if (typeof record.ts !== 'string') return null;
  const when = new Date(record.ts);
  if (Number.isNaN(when.getTime()) || when.toISOString() !== record.ts) return null;
  for (const category of CONSENT_CATEGORIES) {
    if (typeof record[category] !== 'boolean') return null;
  }

  return {
    v: CONSENT_VERSION,
    ts: record.ts,
    preferences: record.preferences as boolean,
    analytics: record.analytics as boolean,
    advertising: record.advertising as boolean,
  };
}

/**
 * Reads the stored choice. Every failure — no storage, a throwing accessor,
 * corrupt JSON, an unknown version, the wrong types — is "no valid choice":
 * essential only, banner showing.
 */
export function readConsent(storage: ConsentStorage | null): ConsentSnapshot {
  if (!storage) return UNRESOLVED;

  let raw: string | null;
  try {
    raw = storage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return UNRESOLVED;
  }

  const record = parseConsentRecord(raw);
  if (!record) return UNRESOLVED;

  return Object.freeze({
    status: 'resolved',
    choices: Object.freeze({
      preferences: record.preferences,
      analytics: record.analytics,
      advertising: record.advertising,
    }),
    ts: record.ts,
  });
}

/**
 * Stores a choice and reads it back. Only a choice that survives the round
 * trip is `resolved`; anything else is `unsaved`, which applies essential only.
 * A choice that cannot be stored cannot be honoured on the next page either,
 * so it is not honoured on this one.
 *
 * A failed write also REMOVES whatever record was there. Otherwise a
 * withdrawal that could not be saved (storage full) would leave the previous
 * grant in place, and the next page would read it back as consent: the
 * visitor's "no" silently reversed. With the record gone, the next page asks
 * again.
 */
export function writeConsent(
  storage: ConsentStorage | null,
  choices: ConsentChoices,
  now: Date = new Date(),
): ConsentSnapshot {
  if (!storage) return UNSAVED;

  const record: ConsentRecord = {
    v: CONSENT_VERSION,
    ts: now.toISOString(),
    preferences: choices.preferences === true,
    analytics: choices.analytics === true,
    advertising: choices.advertising === true,
  };

  try {
    storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    return discardStoredChoice(storage);
  }

  const readBack = readConsent(storage);
  if (
    readBack.status !== 'resolved' ||
    readBack.ts !== record.ts ||
    CONSENT_CATEGORIES.some((category) => readBack.choices[category] !== record[category])
  ) {
    return discardStoredChoice(storage);
  }
  return readBack;
}

/** Best effort: if even removal throws, nothing more can be done from here. */
function discardStoredChoice(storage: ConsentStorage): ConsentSnapshot {
  try {
    storage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Storage refuses every operation; the in-memory state is still essential only.
  }
  return UNSAVED;
}

export type ConsentListener = (snapshot: ConsentSnapshot) => void;

/** Starts a technology; may return the function that stops it again. */
export type ConsentStart = () => void | (() => void);

export interface ConsentStore {
  /** The current snapshot. Stable between changes (for `useSyncExternalStore`). */
  getSnapshot(): ConsentSnapshot;
  /** Calls `listener` after every change. Returns the unsubscribe. */
  subscribe(listener: ConsentListener): () => void;
  /**
   * (Re-)reads storage. Called by the consent manager when it initialises and
   * when another tab changes the key; until then the store stays `pending`.
   */
  init(): ConsentSnapshot;
  /** Records a choice: Required only, Accept all, Save my choices — or a withdrawal. */
  choose(choices: ConsentChoices): ConsentSnapshot;
  /**
   * The gate for anything that is not a React component. Runs `start` while
   * `category` is granted — now, if it already is — and the cleanup it returns
   * as soon as consent is withdrawn, in the same session. The cleanup must
   * genuinely stop the processing (the vendor's own opt-out, removing what it
   * set); removing a `<script>` element does not stop code that already ran.
   * Returns a disposer that also stops it.
   */
  whileGranted(category: ConsentCategory, start: ConsentStart): () => void;
}

/** A store over a storage getter. The getter is wrapped too: `window.localStorage` itself throws when site data is blocked. */
export function createConsentStore(getStorage: () => ConsentStorage | null): ConsentStore {
  let snapshot: ConsentSnapshot = PENDING;
  const listeners = new Set<ConsentListener>();

  const storage = (): ConsentStorage | null => {
    try {
      return getStorage();
    } catch {
      return null;
    }
  };

  const sameAs = (next: ConsentSnapshot) =>
    next.status === snapshot.status &&
    next.ts === snapshot.ts &&
    CONSENT_CATEGORIES.every((category) => next.choices[category] === snapshot.choices[category]);

  const publish = (next: ConsentSnapshot) => {
    if (sameAs(next)) return snapshot;
    snapshot = next;
    // A copy, so a listener that unsubscribes itself cannot skip the next one.
    for (const listener of [...listeners]) {
      try {
        listener(snapshot);
      } catch (error) {
        // One broken subscriber must not stop the others hearing a withdrawal.
        console.error('[consent] listener failed', error);
      }
    }
    return snapshot;
  };

  const subscribe = (listener: ConsentListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const whileGranted = (category: ConsentCategory, start: ConsentStart) => {
    let stop: (() => void) | null = null;
    let running = false;

    const halt = () => {
      if (!running) return;
      running = false;
      const cleanup = stop;
      stop = null;
      try {
        cleanup?.();
      } catch (error) {
        console.error(`[consent] stopping a ${category} technology failed`, error);
      }
    };

    const sync = (current: ConsentSnapshot) => {
      if (!isGranted(current, category)) {
        halt();
        return;
      }
      if (running) return;
      running = true;
      try {
        const cleanup = start();
        stop = typeof cleanup === 'function' ? cleanup : null;
      } catch (error) {
        running = false;
        stop = null;
        console.error(`[consent] starting a ${category} technology failed`, error);
      }
    };

    const unsubscribe = subscribe(sync);
    sync(snapshot);

    return () => {
      unsubscribe();
      halt();
    };
  };

  return {
    getSnapshot: () => snapshot,
    subscribe,
    init: () => publish(readConsent(storage())),
    choose: (choices) => publish(writeConsent(storage(), choices)),
    whileGranted,
  };
}

function browserStorage(): ConsentStorage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

/** The site's one store. Initialised by `ConsentManager`, read by every gate. */
export const consentStore: ConsentStore = createConsentStore(browserStorage);

/**
 * Gate a non-React technology on `category`: `start` runs while it is granted
 * and its returned cleanup runs on withdrawal. See `ConsentStore.whileGranted`.
 *
 *   onConsent('analytics', () => {
 *     const stop = startSomeAnalytics();
 *     return () => stop();
 *   });
 */
export function onConsent(category: ConsentCategory, start: ConsentStart): () => void {
  return consentStore.whileGranted(category, start);
}

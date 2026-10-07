/**
 * Browser-side access to the round trip's one sessionStorage record (rules in
 * `./dish-return`). Every access is wrapped: storage can be blocked, full or
 * absent, and that must only ever mean "no back link, nothing restored" —
 * never an error and never a blocked navigation.
 */

import {
  DISH_ENTRY_STATE_KEY,
  DISH_RETURN_STORAGE_KEY,
  discardDishReturn,
  readDishReturnRecord,
  type DishReturnRecord,
  type ReturnStorage,
} from './dish-return';

/** sessionStorage behind a guard: unavailable storage reads as empty. */
export function returnStorage(): ReturnStorage {
  return {
    getItem(key) {
      try {
        return window.sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        window.sessionStorage.setItem(key, value);
      } catch {
        // Storage blocked or full: nothing is kept.
      }
    },
    removeItem(key) {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Nothing to remove.
      }
    },
  };
}

export function loadDishReturn(slug: string): DishReturnRecord | null {
  return readDishReturnRecord(returnStorage().getItem(DISH_RETURN_STORAGE_KEY), slug, Date.now());
}

export function saveDishReturn(record: DishReturnRecord): void {
  returnStorage().setItem(DISH_RETURN_STORAGE_KEY, JSON.stringify(record));
}

export function clearDishReturn(): void {
  returnStorage().removeItem(DISH_RETURN_STORAGE_KEY);
}

/**
 * Stamps the CURRENT history entry (the dish page) with the record's token, in
 * `history.state` and never the URL. Next.js keeps custom history state when
 * it restores an entry from its cache and copies its own internal state over
 * a native replaceState, so the stamp is there when the customer comes back.
 */
export function stampDishEntry(token: string): void {
  try {
    const state = (window.history.state ?? {}) as Record<string, unknown>;
    if (state[DISH_ENTRY_STATE_KEY] === token) return;
    window.history.replaceState({ ...state, [DISH_ENTRY_STATE_KEY]: token }, '');
  } catch {
    // No stamp: only "Back to dish" can then mark a return.
  }
}

const stampOf = (state: unknown): unknown =>
  state && typeof state === 'object'
    ? (state as Record<string, unknown>)[DISH_ENTRY_STATE_KEY]
    : undefined;

/** The stamp on the current history entry, if any. */
export function currentEntryStamp(): unknown {
  try {
    return stampOf(window.history.state);
  } catch {
    return undefined;
  }
}

/*
 * The stamp of the entry the last `popstate` landed on. There is one case
 * where `history.state` alone is not enough: when Next.js has to FETCH the
 * entry it is restoring (e.g. Our Standards was reloaded, then Back), it
 * rewrites that entry's state without custom keys before the dish page
 * mounts. The event still carries the state as it was, so it is kept here.
 *
 * Registered when this module loads, which on a full page load is before
 * Next.js registers its own listener; a later one could run after React had
 * already rendered the dish (React renders a popstate navigation
 * synchronously). Where this module only loads later, the entry came from
 * Next's cache and `history.state` still carries the stamp.
 */
let poppedStamp: unknown;
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => {
    poppedStamp = stampOf(event.state);
  });
}

/**
 * The stamps that say which history entry this page is: the entry's own
 * state, and the state the last `popstate` arrived with (taken, so it can
 * only ever vouch for the mount that follows it).
 */
export function takeDishEntryStamps(): unknown[] {
  const popped = poppedStamp;
  poppedStamp = undefined;
  return [currentEntryStamp(), popped];
}

/**
 * Was this document loaded by RELOADING the page at `path`? Read from the
 * document's own navigation entry, so it describes the first page this
 * document rendered — the caller asks only for its first mount.
 */
export function reloadedHere(path: string): boolean {
  try {
    const entry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    return entry?.type === 'reload' && new URL(entry.name).pathname === path;
  } catch {
    return false;
  }
}

/** The customer changed their choice on this entry: drop a record bound to it. */
export function discardDishReturnHere(slug: string): void {
  discardDishReturn(returnStorage(), { slug, now: Date.now(), entryStamp: currentEntryStamp() });
}

/**
 * Browser-side access to the round trip's one sessionStorage record (rules in
 * `./dish-return`). Every access is wrapped: storage can be blocked, full or
 * absent, and that must only ever mean "no back link, nothing restored" —
 * never an error and never a blocked navigation.
 */

import {
  DISH_ENTRY_STATE_KEY,
  DISH_RETURN_STORAGE_KEY,
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
  try {
    return readDishReturnRecord(
      window.sessionStorage.getItem(DISH_RETURN_STORAGE_KEY),
      slug,
      Date.now(),
    );
  } catch {
    return null;
  }
}

export function saveDishReturn(record: DishReturnRecord): void {
  try {
    window.sessionStorage.setItem(DISH_RETURN_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage blocked or full: Our Standards simply shows no back link.
  }
}

export function clearDishReturn(): void {
  try {
    window.sessionStorage.removeItem(DISH_RETURN_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
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
    window.history.replaceState({ ...state, [DISH_ENTRY_STATE_KEY]: token }, '');
  } catch {
    // No stamp: only "Back to dish" can then mark a return.
  }
}

const stampOf = (state: unknown): unknown =>
  state && typeof state === 'object'
    ? (state as Record<string, unknown>)[DISH_ENTRY_STATE_KEY]
    : undefined;

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
  try {
    return [stampOf(window.history.state), popped];
  } catch {
    return [popped];
  }
}

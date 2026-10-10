/**
 * Where the customer was before the page they are on — React-free
 * (`tests/choose-box.test.tsx`). A real "Back" (Choose Box v2: `history.back()`
 * when there is somewhere in this site to go back to, the link otherwise)
 * needs to know that, and `document.referrer` cannot say: after client
 * navigations it still names the page the tab LOADED first.
 *
 * `NavigationTrail` records each path as the router leaves it, in
 * sessionStorage (this tab only, gone with it). Only a path, never a query:
 * nothing that identifies anyone or their choices is kept.
 */

export const TRAIL_KEY = 'at-previous-path-v1';

/** A path of this site: root-relative, not protocol-relative, no control characters. */
export function isSitePath(value: unknown): value is string {
  return typeof value === 'string' && /^\/(?!\/)[^\s\\]*$/.test(value) && value.length <= 300;
}

/** The path stored before this one, or null. Never throws. */
export function readPreviousPath(storage: Pick<Storage, 'getItem'> | null | undefined): string | null {
  try {
    const value = storage?.getItem(TRAIL_KEY);
    return isSitePath(value) ? value : null;
  } catch {
    return null;
  }
}

/** Records `path` as the one just left. Never throws. */
export function recordPath(storage: Pick<Storage, 'setItem'> | null | undefined, path: string): void {
  if (!isSitePath(path)) return;
  try {
    storage?.setItem(TRAIL_KEY, path);
  } catch {
    // A full or blocked store costs a smarter Back, nothing more.
  }
}

/**
 * Whether the page "Back" should go to is somewhere real: a page of this site
 * that is not itself part of the box builder (going back into the funnel from
 * its first step would be going forward).
 */
export function canGoBackTo(previous: string | null, fallback: string): boolean {
  if (!previous) return false;
  if (previous === fallback) return true;
  return !previous.startsWith('/box');
}

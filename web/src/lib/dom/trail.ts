/**
 * Where the customer was before the page they are on — React-free
 * (`tests/choose-box.test.tsx`). A real "Back" (Choose Box v2: `history.back()`
 * when there is somewhere in this site to go back to, the link otherwise)
 * needs to know that, and `document.referrer` cannot say: after client
 * navigations it still names the page the tab LOADED first.
 *
 * `NavigationTrail` records each hop as the router makes it — `{from, to}` —
 * in sessionStorage (this tab only, gone with it). A hop is trusted only for
 * the page it ends on: a full load, or a visit to another site and back, leaves
 * a hop that does not name the page now showing, and is ignored (and a full
 * load clears it). Only paths, never a query: nothing that identifies anyone or
 * their choices is kept.
 */

export const TRAIL_KEY = 'at-navigation-hop-v1';

/** A path of this site: root-relative, not protocol-relative, no control characters. */
export function isSitePath(value: unknown): value is string {
  return typeof value === 'string' && /^\/(?!\/)[^\s\\]*$/.test(value) && value.length <= 300;
}

/**
 * The path the customer came from, when the stored hop ended on `current` —
 * the page they are looking at. Null otherwise. Never throws.
 */
export function readPreviousPath(storage: Pick<Storage, 'getItem'> | null | undefined, current: string): string | null {
  try {
    const raw = storage?.getItem(TRAIL_KEY);
    if (!raw) return null;
    const hop = JSON.parse(raw) as { from?: unknown; to?: unknown };
    return isSitePath(hop.from) && hop.to === current ? hop.from : null;
  } catch {
    return null;
  }
}

/** Records the hop from `from` to `to`. Never throws. */
export function recordHop(storage: Pick<Storage, 'setItem'> | null | undefined, from: string, to: string): void {
  if (!isSitePath(from) || !isSitePath(to)) return;
  try {
    storage?.setItem(TRAIL_KEY, JSON.stringify({ from, to }));
  } catch {
    // A full or blocked store costs a smarter Back, nothing more.
  }
}

/** Forgets the hop (a full page load starts a trail of its own). Never throws. */
export function clearHop(storage: Pick<Storage, 'removeItem'> | null | undefined): void {
  try {
    storage?.removeItem(TRAIL_KEY);
  } catch {
    // Nothing to forget in storage that cannot be reached.
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

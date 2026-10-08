/**
 * Document-level states other components react to in CSS, as boolean
 * attributes on <html> — the pattern the consent manager set with
 * `data-consent-layer` (globals.css, "Consent layer priority").
 *
 * A component announces a state by HOLDING a flag rather than toggling it, and
 * holds are counted: two sheets open at once (or a sheet that re-renders while
 * open) cannot clear each other's flag. Nothing reads another component's
 * state, so the drawer and the purchase bar stay uncoupled.
 *
 * No React here (the hook is `useDocumentFlag` in `./hooks`), so the counting is
 * unit-tested with a stand-in element.
 */

/**
 * Set while the mobile drawer or a phone bottom sheet is open. Bottom-fixed
 * chrome that would compete with it — the mobile purchase bar — carries
 * `data-overlay-yield` and is suppressed (globals.css).
 */
export const OVERLAY_OPEN_ATTR = 'data-overlay-open';

/**
 * Set while a mobile purchase bar is on the page, so focus scrolling keeps
 * clear of it (globals.css, `scroll-padding-bottom` from `--at-bar-h`).
 */
export const PURCHASE_BAR_ATTR = 'data-purchase-bar';

/**
 * Set while the mobile purchase bar is actually shown (slid in), so a control
 * that floats above it — the menu's ↑ Top — sits clear of it, and drops to the
 * viewport edge when it retracts.
 */
export const PURCHASE_BAR_SHOWN_ATTR = 'data-purchase-bar-shown';

/** The slice of `Element` a flag needs. */
export interface FlagTarget {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

const holds = new WeakMap<FlagTarget, Map<string, number>>();

/**
 * Sets `name` on the target (default `<html>`) and returns the release. The
 * attribute is removed only when the last hold is released; releasing twice is
 * a no-op, so an effect cleanup can never over-release.
 */
export function holdDocumentFlag(
  name: string,
  target: FlagTarget = document.documentElement,
): () => void {
  let counts = holds.get(target);
  if (!counts) {
    counts = new Map();
    holds.set(target, counts);
  }
  const table = counts;
  table.set(name, (table.get(name) ?? 0) + 1);
  target.setAttribute(name, '');

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const left = (table.get(name) ?? 1) - 1;
    if (left > 0) {
      table.set(name, left);
      return;
    }
    table.delete(name);
    target.removeAttribute(name);
  };
}

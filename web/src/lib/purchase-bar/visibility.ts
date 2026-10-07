/**
 * When the mobile purchase bar shows — the rules, deliberately free of React
 * and the DOM so they are unit-tested on their own (tests/purchase-bar.test.tsx).
 *
 * Sources: design/build-handoff.md §3j ("Mobile purchase bar — full visibility
 * logic"), design/CLAUDE.md "Mobile purchase CTA + header behaviour", and the
 * bar as built in Homepage v2, How It Works v2, Menu Landing v3, Standards v2
 * and Dish Landing v2.
 *
 * The component reads the page (scroll position, two kinds of marker element)
 * and feeds the numbers through these functions. Three things decide it:
 *
 * 1. REVEAL — the page's own purchase CTA (or, on a page without one, its title
 *    band) has been scrolled past. Marked in the page with
 *    `data-purchase-bar-reveal`. Scrolling back to it hides the bar again.
 * 2. DIRECTION — the bar shows on the way down and retracts on the way up, so
 *    one purchase CTA is on screen at a time (the header's returns going up).
 *    An 8px movement threshold and a 120px floor stop a jittery scroll from
 *    flickering it. Dish Landing v2 is the one page whose bar ignores direction.
 * 3. SUPPRESSION — positional and CONTINUOUS: from the moment the first
 *    element marked `data-purchase-bar-stop` has its top above 75% of the
 *    viewport, through everything below it. The footer always carries the
 *    marker (the named list is "Private Table and the footer"); the homepage
 *    marks Private Table, so suppression starts there and runs through the
 *    footer. Releasing it never forces the bar back — scrolling up is what
 *    releases it, and scrolling up already retracts the bar.
 *
 * The drawer, bottom sheets and the cookie consent layer hide the bar too, but
 * in CSS (globals.css, `data-overlay-yield` / `data-consent-yield`), since
 * they are document-level states the bar does not own.
 */

/** Movement smaller than this is ignored, so a jittery scroll cannot flicker the bar. */
export const DIRECTION_THRESHOLD_PX = 8;

/** Above this scroll position the page is never "scrolling down". */
export const DIRECTION_FLOOR_PX = 120;

/** Suppression starts once a stop marker's top crosses this fraction of the viewport. */
export const SUPPRESS_LINE = 0.75;

/** Marks the element whose scrolling past reveals the bar. */
export const REVEAL_ATTR = 'data-purchase-bar-reveal';

/** Marks an element from whose top the bar is suppressed through the end of the page. */
export const STOP_ATTR = 'data-purchase-bar-stop';

/** Marks the site header, for the focus guard in `nextDirection`. */
export const SITE_HEADER_ATTR = 'data-site-header';

export interface ScrollDirection {
  /** The scroll position the last counted movement ended at. */
  lastY: number;
  down: boolean;
}

/** A page starts "not scrolling down", measured from wherever it opened. */
export function initialDirection(y: number): ScrollDirection {
  return { lastY: Math.max(0, y), down: false };
}

/**
 * The direction after a scroll to `y` — the prototype's `_onScroll`, exactly.
 *
 * Movement under the threshold changes nothing, not even `lastY`, so slow
 * scrolling still accumulates into a counted movement. `holdDown` is the
 * header focus guard: while keyboard focus is inside the header the page is
 * never switched to "down" (the header must not slide out from under someone
 * tabbing through it), and the bar therefore stays as it was.
 */
export function nextDirection(
  state: ScrollDirection,
  y: number,
  options: { holdDown?: boolean } = {},
): ScrollDirection {
  if (Math.abs(y - state.lastY) < DIRECTION_THRESHOLD_PX) return state;
  const down = y > state.lastY && y > DIRECTION_FLOOR_PX;
  if (down && options.holdDown) return { lastY: y, down: state.down };
  return { lastY: y, down };
}

/**
 * Whether the reveal marker has been scrolled past: wholly above the viewport.
 *
 * "Not intersecting" is not enough — a CTA below the fold of a short screen is
 * not intersecting either, and the bar would then show over the hero and hide
 * again as the CTA scrolled in (the Dish Landing v2 and Private Table v2
 * fixes). A page with no marker has nothing to wait for.
 */
export function hasScrolledPast(rect: { bottom: number } | null): boolean {
  if (!rect) return true;
  return rect.bottom <= 0;
}

/** The highest top among the stop markers, or null when the page has none. */
export function firstStopTop(tops: readonly number[]): number | null {
  return tops.length > 0 ? Math.min(...tops) : null;
}

/** Suppressed once the first stop marker's top is above 75% of the viewport. */
export function isSuppressed(stopTop: number | null, viewportHeight: number): boolean {
  if (stopTop === null) return false;
  return stopTop < viewportHeight * SUPPRESS_LINE;
}

export interface BarInputs {
  revealed: boolean;
  down: boolean;
  suppressed: boolean;
  /** False only for Dish Landing v2, whose bar ignores scroll direction. */
  followsDirection: boolean;
}

/** The scroll-driven part of the decision (CSS adds drawer, sheets and consent). */
export function shouldShowBar({ revealed, down, suppressed, followsDirection }: BarInputs): boolean {
  if (!revealed || suppressed) return false;
  return followsDirection ? down : true;
}

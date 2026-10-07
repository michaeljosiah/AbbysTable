/**
 * When the menu's "↑ Top" utility shows — React-free and unit-tested
 * (tests/menu.test.tsx). Source: design/CLAUDE.md '"↑ Top" utility control'
 * and Menu Landing v3's `_updateTop`.
 *
 * Visibility is derived from scroll POSITION, never a dish count, with two
 * thresholds so it cannot flicker around a single line:
 *  - below 1024: shown once the menu band has scrolled ~1.75 viewport heights
 *    past the top of the viewport, hidden again under ~0.9;
 *  - from 1024: shown once the first ROW of cards has left the viewport
 *    (measured from the first card, so it holds whatever the card height or
 *    column count), hidden once that row is ~140px back in view.
 * Between the thresholds it keeps whatever it was. The drawer, the filter
 * sheet and the consent layer suppress it in CSS (`data-overlay-yield`,
 * `data-consent-yield`); the footer does not — the end of the page is where a
 * back-to-top is most useful.
 */

export const TOP_SHOW_PAST_VIEWPORTS = 1.75;
export const TOP_HIDE_PAST_VIEWPORTS = 0.9;
/** Desktop: hidden again once the first card's bottom is this far into view. */
export const TOP_HIDE_ROW_PX = 140;

export interface TopMeasure {
  desktop: boolean;
  /** The menu band's top, in viewport px (negative once scrolled past). */
  bandTop: number | null;
  /** The first card's bottom, in viewport px; null with no cards. */
  firstCardBottom: number | null;
  viewportHeight: number;
}

export function nextTopShown(shown: boolean, measure: TopMeasure): boolean {
  if (measure.desktop) {
    const bottom = measure.firstCardBottom;
    if (bottom === null) return false;
    if (bottom < 0) return true;
    if (bottom > TOP_HIDE_ROW_PX) return false;
    return shown;
  }
  if (measure.bandTop === null) return false;
  const past = -measure.bandTop;
  if (past > measure.viewportHeight * TOP_SHOW_PAST_VIEWPORTS) return true;
  if (past < measure.viewportHeight * TOP_HIDE_PAST_VIEWPORTS) return false;
  return shown;
}

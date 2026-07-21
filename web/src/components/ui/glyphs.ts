/**
 * Shared SVG path data. Kept separate so the heat pips on a dish card and the
 * spice chips in the menu filters draw the same chilli from one source, while
 * each component still colours it through its own stylesheet.
 */

export const CHILLI_VIEW_BOX = '0 0 24 24';

export const CHILLI_STEM_PATH = 'M13.6 6.7c.5-1.9 2.1-3.2 4.1-3.4-.2 2-1.6 3.6-3.6 4z';

export const CHILLI_BODY_PATH =
  'M13.6 6.7C9.1 8.7 7 12.2 7.8 16.2c.4 2.2 1.4 4.3 2.7 6 1.3-1.8 2.8-4.2 4-6.8 1.1-2.5 1.1-5.8-.9-8.7z';

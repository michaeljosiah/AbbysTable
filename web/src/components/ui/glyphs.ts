/**
 * Shared SVG path data. Kept separate so the heat pips on a dish card and the
 * spice chips in the menu filters draw the same chilli from one source, while
 * each component still colours it through its own stylesheet.
 */

export const CHILLI_VIEW_BOX = '0 0 24 24';

export const CHILLI_STEM_PATH = 'M13.6 6.7c.5-1.9 2.1-3.2 4.1-3.4-.2 2-1.6 3.6-3.6 4z';

export const CHILLI_BODY_PATH =
  'M13.6 6.7C9.1 8.7 7 12.2 7.8 16.2c.4 2.2 1.4 4.3 2.7 6 1.3-1.8 2.8-4.2 4-6.8 1.1-2.5 1.1-5.8-.9-8.7z';

/**
 * Line-art marks for the hero's three proof points. Drawn on a 24×24 grid and
 * stroked (never filled) so they read as one set at the 19px they render at.
 */
export const PROOF_VIEW_BOX = '0 0 24 24';

export const PROOF_PATHS: Record<'leaf' | 'cube' | 'bowl', readonly string[]> = {
  leaf: [
    'M20 4c0 8-4.7 12.4-11.4 12.9C6.6 17 5 15.3 5 13.1 5 6.9 11.6 4 20 4z',
    'M4 20c2.6-4.4 6-7.3 10.5-9.2',
  ],
  cube: ['M12 3l8 4.6v8.8L12 21l-8-4.6V7.6z', 'M12 12l8-4.6M12 12v9M12 12L4 7.4'],
  bowl: [
    'M3.5 11h17c0 4.4-3.8 7.5-8.5 7.5S3.5 15.4 3.5 11z',
    'M9 7.6c0-1.2 1.2-1.6 1.2-2.8M14.4 7.6c0-1.4 1.2-1.8 1.2-3',
  ],
};

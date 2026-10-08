/**
 * Values the menu's server page and its client components share. Kept out of
 * the `'use client'` modules on purpose: a Server Component importing a value
 * from one receives a client reference, not the value.
 */

/** Dishes per page and per "Load more" — the design's `pageSize` (6). */
export const MENU_PAGE_SIZE = 6;

/** Marks the menu band, which the phone "↑ Top" threshold is measured from. */
export const MENU_BAND_ATTR = 'data-menu-band';

/** The page heading "↑ Top" returns to and focuses. */
export const MENU_TITLE_ID = 'menu-title';

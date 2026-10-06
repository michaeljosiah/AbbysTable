/**
 * Copy for the status pages, verbatim from the designs (Page Not Found,
 * Something Went Wrong, Back Shortly; design/SHOPPING-STATE.md §55–57,
 * design/build-handoff.md §3ag–§3ai).
 *
 * One source for the React pages and for the static pages
 * `lib/status-pages/render.ts` generates, so the in-app 500 and
 * `public/500.html` cannot drift apart. Plain strings with no imports: the Edge
 * middleware loads this through render.ts.
 *
 * Titles use a straight apostrophe like every other page title; the body copy
 * keeps the design's typographic one.
 */

export const NOT_FOUND_COPY = {
  title: "Page not found — Abby's Table",
  eyebrow: 'Error 404',
  heading: 'We couldn’t find that page.',
  lede: 'The page may have moved, or the link may no longer be available.',
  home: 'Go to homepage',
  menu: 'View the menu',
} as const;

export const SERVER_ERROR_COPY = {
  title: "Something went wrong — Abby's Table",
  eyebrow: 'Error 500',
  heading: 'Something didn’t go to plan.',
  lede: 'We’re having trouble loading this page right now. Please try again in a moment.',
  retry: 'Try again',
  home: 'Back to homepage',
} as const;

export const MAINTENANCE_COPY = {
  title: "We'll be back shortly — Abby's Table",
  eyebrow: 'Temporarily unavailable',
  heading: 'We’ll be back shortly.',
  lede: 'Abby’s Table is temporarily unavailable while we carry out some improvements. Please try again soon.',
} as const;

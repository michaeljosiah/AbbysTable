import type { Metadata } from 'next';

import { SiteChrome } from '@/components/layout/SiteChrome';
import { NotFoundMessage } from '@/components/status/NotFoundMessage';
import { NOT_FOUND_COPY } from '@/lib/content/status';

export const metadata: Metadata = {
  title: NOT_FOUND_COPY.title,
};

/**
 * The 404 for any URL no route matches (design: Page Not Found;
 * design/build-handoff.md §3ag), answered with HTTP 404 — never a redirect,
 * never a soft-404 200.
 *
 * The site is working; only the page is missing. So it carries the canonical
 * marketing chrome and the session state with it (a signed-in customer still
 * sees My Account), even though an unmatched URL never enters the `(site)`
 * route group: it renders `SiteChrome` itself.
 *
 * Without the announcement bar, and that is load-bearing: the bar carries the
 * live delivery date, and Next renders this element into the payload of EVERY
 * document request, in every route group, so whatever it awaits every page
 * awaits. With the date, a slow Aonik held `/login` open and a failing one
 * turned this 404 into a 500. It must stay free of commerce data — a cookie
 * read is all it does. (The v2 Page Not Found has no bar anyway.)
 *
 * It is deliberately NOT a catch-all route inside `(site)` calling
 * `notFound()`. Next renders the root not-found for an unmatched URL as the
 * page itself, so it arrives fully server-rendered; a `notFound()` thrown from
 * inside a page arrives as an empty error shell that only JavaScript fills in.
 *
 * `notFound()` from a page inside `(site)` — an unknown dish, an order that is
 * not yours — renders `(site)/not-found.tsx` within that layout instead; from
 * `(checkout)` or `(auth)` (none exists yet) it would land here.
 */
export default function NotFound() {
  return (
    <SiteChrome withAnnouncement={false}>
      <NotFoundMessage />
    </SiteChrome>
  );
}

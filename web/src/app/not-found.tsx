import type { Metadata } from 'next';

import { SiteChrome } from '@/components/layout/SiteChrome';
import { NotFoundMessage } from '@/components/status/NotFoundMessage';

export const metadata: Metadata = {
  title: 'Page not found — Abby’s Table',
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
    <SiteChrome>
      <NotFoundMessage />
    </SiteChrome>
  );
}

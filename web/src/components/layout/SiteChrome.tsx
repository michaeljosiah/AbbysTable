import type { ReactNode } from 'react';

import { getAonikClient } from '@/lib/aonik/client';
import { readSessionView } from '@/lib/auth/session';
import { formatDeliveryDate } from '@/lib/format';

import { AnnouncementBar } from './AnnouncementBar';
import { Footer } from './Footer';
import { Header } from './Header';

interface SiteChromeProps {
  children: ReactNode;
  /**
   * Whether the announcement bar fetches the live delivery date from Aonik.
   * Without it the bar shows its line with no date, which it already does when
   * the tenant publishes none.
   *
   * The root `app/not-found.tsx` turns this off. Next renders the root 404 into
   * EVERY document request, in every route group, not only when a URL is
   * missing — so anything it awaits is awaited by every page, and anything that
   * throws there turns a 404 into a 500. A slow or failing Aonik must never do
   * either.
   */
  withDeliveryDate?: boolean;
}

/**
 * Marketing chrome: announcement bar, header, `<main>`, footer.
 *
 * Rendered by the `(site)` layout, and by the root `app/not-found.tsx` — the
 * page an unmatched URL gets, which sits outside every route group but should
 * still carry the site's header, footer and session state (design: Page Not
 * Found).
 */
export async function SiteChrome({ children, withDeliveryDate = true }: SiteChromeProps) {
  // The announcement bar carries the live delivery date, so the chrome needs
  // commerce data too — resolved here rather than threaded through every page.
  const [delivery, session] = await Promise.all([
    withDeliveryDate ? getAonikClient().then((client) => client.getDeliveryWindow()) : null,
    // Read here, in a Server Component, and handed down: the session cookie is
    // httpOnly and the header is a Client Component. A cookie read only — it
    // cannot block or fail, so the root 404 keeps it.
    readSessionView(),
  ]);

  return (
    <>
      <AnnouncementBar earliestDeliveryLabel={formatDeliveryDate(delivery?.earliestDeliveryDate)} />
      <Header session={session} />
      <main>{children}</main>
      <Footer />
    </>
  );
}

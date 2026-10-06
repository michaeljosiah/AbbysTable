import type { ReactNode } from 'react';

import { getAonikClient } from '@/lib/aonik/client';
import { readSessionView } from '@/lib/auth/session';
import { formatDeliveryDate } from '@/lib/format';

import { AnnouncementBar } from './AnnouncementBar';
import { Footer } from './Footer';
import { Header } from './Header';

/**
 * Marketing chrome: announcement bar, header, `<main>`, footer.
 *
 * Rendered by the `(site)` layout, and by the root `app/not-found.tsx` — the
 * page an unmatched URL gets, which sits outside every route group but should
 * still carry the site's header, footer and session state (design: Page Not
 * Found).
 */
export async function SiteChrome({ children }: { children: ReactNode }) {
  // The announcement bar carries the live delivery date, so the chrome needs
  // commerce data too — resolved here rather than threaded through every page.
  const [delivery, session] = await Promise.all([
    (await getAonikClient()).getDeliveryWindow(),
    // Read here, in a Server Component, and handed down: the session cookie is
    // httpOnly and the header is a Client Component.
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

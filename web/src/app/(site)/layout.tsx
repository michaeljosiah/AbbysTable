import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getAonikClient } from '@/lib/aonik/client';
import { readSessionView } from '@/lib/auth/session';
import { formatDeliveryDate } from '@/lib/format';

/** Marketing chrome: announcement bar, header, footer. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
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

import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getAonikClient } from '@/lib/aonik/client';
import { formatDeliveryDate } from '@/lib/format';

/** Marketing chrome: announcement bar, header, footer. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // The announcement bar carries the live delivery date, so the chrome needs
  // commerce data too — resolved here rather than threaded through every page.
  const { earliestDeliveryDate } = await getAonikClient().getDeliveryWindow();

  return (
    <>
      <AnnouncementBar earliestDeliveryLabel={formatDeliveryDate(earliestDeliveryDate)} />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}

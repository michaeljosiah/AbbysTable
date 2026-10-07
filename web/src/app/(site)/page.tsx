import { MobilePurchaseBar } from '@/components/purchase-bar/MobilePurchaseBar';
import { BoxesPromo } from '@/components/sections/BoxesPromo';
import { Founder } from '@/components/sections/Founder';
import { Gifting } from '@/components/sections/Gifting';
import { Hero } from '@/components/sections/Hero';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Menu } from '@/components/sections/Menu';
import { PrivateTable } from '@/components/sections/PrivateTable';
import { getHomepageData } from '@/lib/aonik/client';
import { formatDeliveryDate } from '@/lib/format';
import { getPurchaseBarData } from '@/lib/purchase-bar/data';

/**
 * Homepage. All commerce data is resolved server-side in one pass and handed to
 * the sections as props — no section fetches for itself.
 *
 * The mobile purchase bar (#12) is revealed once the hero's "View the menu" has
 * been scrolled past (`data-purchase-bar-reveal` in Hero) and suppressed from
 * Private Table's top through the footer (`data-purchase-bar-stop` on that
 * section) — so Private Table must stay the last band: anything placed below
 * it is suppressed too (build-handoff §3j).
 */
export default async function HomePage() {
  const [{ dishes, boxes, delivery }, purchaseBar] = await Promise.all([
    getHomepageData(),
    getPurchaseBarData(),
  ]);

  const earliestDeliveryLabel = formatDeliveryDate(delivery?.earliestDeliveryDate);
  // The promo band leads with the smallest box: it is the minimum order, and
  // its price is what the band quotes as a floor.
  const entryBox = [...boxes].sort((a, b) => a.pricePence - b.pricePence)[0];

  return (
    <>
      <Hero />
      <HowItWorks earliestDeliveryLabel={earliestDeliveryLabel} />
      <Menu dishes={dishes} />
      <Founder />
      <BoxesPromo entryBox={entryBox} />
      <Gifting />
      <PrivateTable />
      <MobilePurchaseBar data={purchaseBar} />
    </>
  );
}

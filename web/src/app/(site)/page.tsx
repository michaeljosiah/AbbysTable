import { MobilePurchaseBar } from '@/components/purchase-bar/MobilePurchaseBar';
import { Founder } from '@/components/sections/Founder';
import { Hero } from '@/components/sections/Hero';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Menu } from '@/components/sections/Menu';
import { PrivateTable } from '@/components/sections/PrivateTable';
import { Standards } from '@/components/sections/Standards';
import { getHomepageData } from '@/lib/aonik/client';
import { getPurchaseBarData } from '@/lib/purchase-bar/data';

/**
 * Homepage — design/Abby's Table - Homepage v2.dc.html (approved).
 *
 * Section order is canonical and load-bearing (build-handoff "Homepage
 * section order"): Hero → How it works → A taste of the table → Our standards
 * → Meet the founder → Private Table → footer. The old boxes promo and gifting
 * bands are removed, not pending.
 *
 * Commerce data is resolved here, once, and handed down — no section fetches
 * for itself. The box plan is read once, by `getPurchaseBarData`: its offer
 * ("Minimum 6 dishes / From £158", contract §2) feeds both the mobile bar and
 * How it works. The homepage reads no delivery date at all; the earliest date
 * belongs to the funnel, never this page.
 *
 * The mobile purchase bar (#12) is revealed once the hero's "View the menu"
 * has been scrolled past (`data-purchase-bar-reveal` in Hero) and suppressed
 * from Private Table's top through the footer (`data-purchase-bar-stop` on
 * that band) — so Private Table must stay the last band: anything placed below
 * it is suppressed too (build-handoff §3j). No bottom spacer, since the bar
 * can never show at the end of this page.
 */
export default async function HomePage() {
  const [{ dishes }, purchaseBar] = await Promise.all([getHomepageData(), getPurchaseBarData()]);

  return (
    <>
      <Hero />
      <HowItWorks offer={purchaseBar.offer} />
      <Menu dishes={dishes} />
      <Standards />
      <Founder />
      <PrivateTable />
      <MobilePurchaseBar data={purchaseBar} />
    </>
  );
}

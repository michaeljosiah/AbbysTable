import { BoxesPromo } from '@/components/sections/BoxesPromo';
import { Founder } from '@/components/sections/Founder';
import { Gifting } from '@/components/sections/Gifting';
import { Hero } from '@/components/sections/Hero';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Menu } from '@/components/sections/Menu';
import { PrivateTable } from '@/components/sections/PrivateTable';
import { Standards } from '@/components/sections/Standards';
import { getHomepageData } from '@/lib/aonik/client';
import { formatDeliveryDate } from '@/lib/format';

/**
 * Homepage. All commerce data is resolved server-side in one pass and handed to
 * the sections as props — no section fetches for itself.
 */
export default async function HomePage() {
  const { dishes, boxes, delivery } = await getHomepageData();

  const earliestDeliveryLabel = formatDeliveryDate(delivery?.earliestDeliveryDate);
  // Lead with the most popular tier; point newcomers at the smallest.
  const mainBox = boxes.find((box) => box.badge === 'Most popular') ?? boxes[0];
  const entryBox = [...boxes].sort((a, b) => a.pricePence - b.pricePence)[0];

  return (
    <>
      <Hero />
      <Standards />
      <HowItWorks earliestDeliveryLabel={earliestDeliveryLabel} />
      <Menu dishes={dishes} />
      <Founder />
      <BoxesPromo
        mainBox={mainBox}
        tasterBox={entryBox}
        earliestDeliveryLabel={earliestDeliveryLabel}
      />
      <Gifting />
      <PrivateTable />
    </>
  );
}

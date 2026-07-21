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

  const earliestDeliveryLabel = formatDeliveryDate(delivery.earliestDeliveryDate);
  const mainBox = boxes.find((box) => box.dishCount === 8) ?? boxes[0];
  const tasterBox = boxes.find((box) => box.dishCount === 4) ?? boxes[1];

  return (
    <>
      <Hero />
      <Standards />
      <HowItWorks earliestDeliveryLabel={earliestDeliveryLabel} />
      <Menu dishes={dishes} />
      <Founder />
      <BoxesPromo
        mainBox={mainBox}
        tasterBox={tasterBox}
        earliestDeliveryLabel={earliestDeliveryLabel}
      />
      <Gifting />
      <PrivateTable />
    </>
  );
}

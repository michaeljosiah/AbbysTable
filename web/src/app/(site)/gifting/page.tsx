import { Gifting } from '@/components/gifting/Gifting';
import { giftOptions, readGift } from '@/lib/gifting/server';
import { DESIGN_GIFT_OPTIONS } from '@/lib/gifting/model';
export const metadata = { title: 'Gifting | Abby’s Table' };
export const dynamic = 'force-dynamic';
export default async function Page() {
  const [options, resume] = await Promise.all([giftOptions().catch(() => ({ ...DESIGN_GIFT_OPTIONS, enabled: false })), readGift().catch(() => null)]);
  return <Gifting options={options} resume={resume} />;
}

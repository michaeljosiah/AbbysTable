import { redirect } from 'next/navigation';
import { GiftCheckout } from '@/components/gifting/GiftCheckout';
import { giftOptions, readGift, giftPayment } from '@/lib/gifting/server';
import { DESIGN_GIFT_OPTIONS, giftEntry } from '@/lib/gifting/model';
import { readSessionView } from '@/lib/auth/session';
export const metadata = { title: 'Gift card checkout | Abby’s Table' };
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const payment = await giftPayment().catch(() => null);
  if (payment?.paymentIntentId && !payment.canEdit) redirect('/gift-card/payment');
  const params = await searchParams;
  const [options, initial, session] = await Promise.all([giftOptions().catch(() => ({ ...DESIGN_GIFT_OPTIONS, enabled: false })), readGift().catch(() => null), readSessionView()]);
  return <GiftCheckout options={options} initial={initial} entry={giftEntry(params)} signedIn={session.isSignedIn} signedEmail={session.email} />;
}

import { NextDelivery, type NextDeliveryData } from '@/components/account/NextDelivery';
import { loadAccountOrders } from '@/lib/account/loadOrders';
import { orderHeading } from '@/lib/account/orders';
import { deliveryTracker } from '@/lib/account/tracker';
import { readSessionView } from '@/lib/auth/session';
import { formatDeliveryDateLong } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * The overview's Next delivery card, in the hero (the `@hero` slot of the account
 * frame). It is decoration on the page, never the page: a read that fails, a
 * session that has ended (the overview itself redirects that), or no upcoming
 * order all mean no card.
 */
export default async function NextDeliverySlot() {
  if (!(await readSessionView()).isSignedIn) return null;

  let data: NextDeliveryData | null = null;
  try {
    const { upcoming, extras } = await loadAccountOrders(1);
    const next = upcoming[0];
    const tracker = next ? deliveryTracker(next.fulfilmentStatus) : null;
    if (next && tracker) {
      const address = extras.get(next.orderId)?.address;
      data = {
        tracker,
        day: formatDeliveryDateLong(next.deliveryDate) ?? undefined,
        line:
          [next.orderNumber ? `Order ${next.orderNumber}` : undefined, address].filter(Boolean).join(' · ') ||
          orderHeading(next),
        href: `/account/orders/${encodeURIComponent(next.orderId)}`,
      };
    }
  } catch {
    return null;
  }

  return data ? <NextDelivery data={data} /> : null;
}

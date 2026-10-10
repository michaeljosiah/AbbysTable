import { unstable_rethrow } from 'next/navigation';

import { NextDelivery, type NextDeliveryData } from '@/components/account/NextDelivery';
import { loadAccountOrders } from '@/lib/account/loadOrders';
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
    // The soonest upcoming order that has a step to show (an unknown status is skipped).
    const next = upcoming.find((order) => deliveryTracker(order.fulfilmentStatus));
    const tracker = next ? deliveryTracker(next.fulfilmentStatus) : null;
    if (next && tracker) {
      const address = extras.get(next.orderId)?.address;
      data = {
        tracker,
        day: formatDeliveryDateLong(next.deliveryDate) ?? undefined,
        line: [next.orderNumber ? `Order ${next.orderNumber}` : undefined, address].filter(Boolean).join(' · ') || undefined,
        href: `/account/orders/${encodeURIComponent(next.orderId)}`,
      };
    }
  } catch (error) {
    // Next's own control flow is never "the card could not be read".
    unstable_rethrow(error);
    return null;
  }

  return data ? <NextDelivery data={data} /> : null;
}

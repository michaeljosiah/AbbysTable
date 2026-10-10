import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { CheckoutSessionGate } from '@/components/checkout/checkout/CheckoutSessionGate';
import { CheckoutStatus } from '@/components/checkout/checkout/CheckoutStatus';
import { CheckoutView } from '@/components/checkout/checkout/CheckoutView';
import { getAonikClient } from '@/lib/aonik/client';
import { resolveDataMode } from '@/lib/aonik/dataMode';
import type { DeliveryCalendar } from '@/lib/aonik/types';
import { EMPTY_DETAILS } from '@/lib/checkout/form';
import { loadCheckout } from '@/lib/checkout/server';
import { londonToday } from '@/lib/delivery/checker';

export const metadata: Metadata = {
  title: "Checkout — Abby's Table",
  description: 'Your details, your delivery date and your order summary.',
  robots: { index: false, follow: false },
};

/** A box, a draft and a hold are per customer and change by the minute. */
export const dynamic = 'force-dynamic';

/** The first read: today and the 61 days after it (Aonik's most in one read). */
const FIRST_READ_DAYS = 62;

/**
 * Step 5 of the box builder (#31; design: Checkout v2).
 *
 * The entry gate is decided here, on the server, from Aonik's box (live): no
 * box goes back to the start; a box that is not full, or holds a dish that is
 * no longer available, goes back to the dishes; a box already ordered, or one a
 * payment attempt holds, shows that instead of a form it could not use. A
 * signed-in session that needs renewing is renewed by a route handler first
 * (`CheckoutSessionGate`): a render cannot keep the renewed cookie. Demo keeps
 * the box in the browser, so its gate runs there (`CheckoutView`).
 */
export default async function BoxCheckoutPage() {
  const { mode } = await resolveDataMode();
  const client = await getAonikClient();
  const today = londonToday();

  const entry = mode === 'live' ? await loadCheckout() : null;
  if (entry?.kind === 'session') return <CheckoutSessionGate />;
  if (entry?.kind === 'none') redirect('/box');
  if (entry?.kind === 'incomplete') redirect('/box/dishes');
  // Back from Stripe while the attempt is live (D26): treated as leaving the
  // payment page, so Aonik is asked to close it — never a second checkout.
  if (entry?.kind === 'payment') redirect('/box/payment/return?outcome=cancel');
  if (entry?.kind === 'completed') return <CheckoutStatus kind="completed" />;

  const [calendar, pricing, extras] = await Promise.all([
    client.getDeliveryCalendar(today, FIRST_READ_DAYS).catch((error: unknown): DeliveryCalendar | null => {
      // Unknown is said as unknown (SHOPPING-STATE §22): no date is offered, and payment waits.
      console.error('[checkout] the delivery calendar could not be read', error);
      return null;
    }),
    client.getBoxPricing(),
    client.getExtras().catch(() => []),
  ]);

  const ready = entry?.kind === 'ready' ? entry : null;
  return (
    <CheckoutView
      live={mode === 'live'}
      initialCart={ready?.cart ?? null}
      initialDetails={ready?.details ?? EMPTY_DETAILS}
      initialReservation={ready?.reservation ?? null}
      calendar={calendar}
      today={today}
      pricing={pricing}
      extras={extras}
    />
  );
}

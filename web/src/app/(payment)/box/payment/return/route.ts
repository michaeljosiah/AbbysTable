/**
 * `/box/payment/return` — where Stripe sends the customer back (`?outcome=
 * success|cancel`), and where checkout sends a customer whose box an attempt
 * still holds (`?outcome=reopen`). Never linked or prefetched.
 *
 * Coming back is navigation, never proof: the payment's state is read from
 * Aonik and the customer is sent on from it (303, so a reload of the next page
 * never repeats this). A CANCEL or REOPEN asks Aonik to recover the attempt —
 * it expires a Stripe session that can still take payment and confirms one
 * that was paid — so "Payment was cancelled" is said only once Aonik has
 * proven nothing was taken, and the box is reopened only once Aonik says it
 * may change. Anything uncertain stays on the processing page, never on an
 * offer to pay again.
 *
 * The redirect is RELATIVE: behind a proxy the request's own origin can be an
 * internal one, and the browser knows where it is.
 */

import { readPaymentState, recoverPayment } from '@/lib/checkout/payment';

export const dynamic = 'force-dynamic';

function onwards(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

export async function GET(request: Request) {
  const outcome = new URL(request.url).searchParams.get('outcome');
  try {
    let state = await readPaymentState();
    // No box here: a paid order already took it, or this is another browser.
    // The confirmation decides from its own cookie and says what is true.
    if (!state) return onwards('/box/confirmation');
    if (state.status === 'succeeded') return onwards('/box/confirmation');
    if (!state.paymentIntentId) return onwards('/box/checkout');
    if (outcome !== 'cancel' && outcome !== 'reopen') return onwards('/box/payment');

    const before = state.status;
    // Already proven closed: nothing to ask. Otherwise Aonik is asked, even
    // when the provider already reports the session closed — the box moves on
    // only when Aonik moves it.
    if (!state.canEdit) state = await recoverPayment(state);
    if (state.status === 'succeeded') return onwards('/box/confirmation');
    if (state.canEdit) {
      // Closed unpaid. A reopen is the customer asking for their checkout back.
      if (outcome === 'reopen') return onwards('/box/checkout');
      return onwards(`/box/payment?outcome=${before === 'failed' ? 'failed' : 'cancelled'}`);
    }
    return onwards('/box/payment?outcome=checking');
  } catch (error) {
    // A refused or failed recovery changes nothing: the page reads the state again.
    console.error('[payment] the return from the payment provider could not be resolved', error);
    return onwards('/box/payment?outcome=checking');
  }
}

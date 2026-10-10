/**
 * `/box/payment/return` — where Stripe sends the customer back (`?outcome=
 * success|cancel`). Never linked or prefetched.
 *
 * Coming back is navigation, never proof: the payment's state is read from
 * Aonik and the customer is sent on from it (303, so a reload of the next page
 * never repeats this). A CANCEL return asks Aonik to recover the attempt — it
 * re-reads the Stripe session and closes it only if it can no longer pay — so
 * "Payment was cancelled" is said only once Aonik has proven nothing was
 * taken. Anything uncertain stays on the processing page, never on an offer
 * to pay again.
 */

import { NextResponse } from 'next/server';

import { readPaymentState, recoverPayment } from '@/lib/checkout/payment';

export const dynamic = 'force-dynamic';

function onwards(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export async function GET(request: Request) {
  const outcome = new URL(request.url).searchParams.get('outcome');
  try {
    let state = await readPaymentState();
    // No box here: a paid order already took it, or this is another browser.
    // The confirmation decides from its own cookie and says what is true.
    if (!state) return onwards(request, '/box/confirmation');
    if (state.status === 'succeeded') return onwards(request, '/box/confirmation');
    if (!state.paymentIntentId) return onwards(request, '/box/checkout');
    if (outcome !== 'cancel') return onwards(request, '/box/payment');

    const before = state.status;
    if (state.status !== 'cancelled') state = await recoverPayment(state);
    if (state.status === 'succeeded') return onwards(request, '/box/confirmation');
    if (state.status === 'cancelled') {
      return onwards(request, `/box/payment?outcome=${before === 'failed' ? 'failed' : 'cancelled'}`);
    }
    return onwards(request, '/box/payment?outcome=checking');
  } catch (error) {
    // A refused or failed recovery changes nothing: the page reads the state again.
    console.error('[payment] the return from the payment provider could not be resolved', error);
    return onwards(request, '/box/payment?outcome=checking');
  }
}

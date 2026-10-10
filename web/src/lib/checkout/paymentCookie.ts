/**
 * The payment cookie: the attempt's references, kept across the redirect to
 * Stripe and back (`@/lib/checkout/payment`) and read by the confirmation —
 * an httpOnly cookie, never a URL, a log or analytics. SERVER-ONLY.
 */

import { cookies } from 'next/headers';

export const PAYMENT_COOKIE = 'abbys-table-payment';

/**
 * How long the confirmation stays readable in this browser (D30). The guest
 * token itself never expires; a page showing an address should not live on
 * in a shared browser for ever.
 */
const PAYMENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export interface PaymentCookie {
  orderId: string;
  paymentIntentId: string;
  /** A guest's read capability for the order (`X-Order-Token`). Absent for a signed-in order. */
  guestOrderToken?: string;
  /** The total, in pence, the customer agreed to — what a retry sends again as `expectedTotal`. */
  expectedTotalPence: number;
}

export async function readPaymentCookie(): Promise<PaymentCookie | null> {
  const raw = (await cookies()).get(PAYMENT_COOKIE)?.value;
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PaymentCookie>;
    if (typeof value.orderId !== 'string' || typeof value.paymentIntentId !== 'string') return null;
    if (typeof value.expectedTotalPence !== 'number' || !Number.isInteger(value.expectedTotalPence)) return null;
    return {
      orderId: value.orderId,
      paymentIntentId: value.paymentIntentId,
      expectedTotalPence: value.expectedTotalPence,
      ...(typeof value.guestOrderToken === 'string' && value.guestOrderToken ? { guestOrderToken: value.guestOrderToken } : {}),
    };
  } catch {
    return null;
  }
}

export async function writePaymentCookie(value: PaymentCookie): Promise<void> {
  (await cookies()).set(PAYMENT_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    // Lax: sent on the top-level GET back from Stripe, never on a cross-site POST.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PAYMENT_COOKIE_MAX_AGE,
  });
}

export async function clearPaymentCookie(): Promise<void> {
  const jar = await cookies();
  try {
    // A non-empty tombstone: some hosts drop empty-value Set-Cookie headers (see the cart cookie).
    jar.set(PAYMENT_COOKIE, 'deleted', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  } catch {
    // A page render cannot set cookies; the next route that can will.
  }
}

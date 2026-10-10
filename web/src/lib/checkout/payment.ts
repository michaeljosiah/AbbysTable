/**
 * Paying for the box: the Stripe hand-off, the payment's state, recovery and
 * retry (aonik#344, #346; spec checkout-and-payment FR-9, FR-10). SERVER-ONLY.
 *
 * Aonik owns the money. It freezes the charge and the delivery snapshot,
 * claims the date's hold as a payment hold with a 10-minute deadline, creates
 * the order and a hosted Stripe Checkout session, and later reports what the
 * provider said. The storefront only:
 *
 *  - starts the attempt with the total the customer was shown
 *    (`expectedTotal` — a changed total stops it before anything is created);
 *  - keeps the attempt's references in an httpOnly cookie that survives the
 *    redirect to Stripe and back — never in a URL, a log or analytics;
 *  - reads the attempt's state back. A return URL is navigation only, never
 *    proof of payment: what the payment pages say comes from Aonik.
 *
 * Nothing here marks anything paid or cancelled. A cancel return asks Aonik to
 * RECOVER, and only Aonik's answer — the attempt proven closed and unpaid —
 * lets the box change and the customer pay again.
 */

import { readAonikConfig, liveOrderingEnabled } from '@/lib/aonik/dataMode';
import type { CartPaymentStateDto, CheckoutDraftResponseDto, CheckoutResultDto } from '@/lib/aonik/dto';
import { AonikError } from '@/lib/aonik/errors';
import { aonikFetch } from '@/lib/aonik/http';
import type { StorefrontConfigDto } from '@/lib/aonik/map';
import { cartOrderedError, CartMissingError } from '@/lib/cart/cartMissing';
import { cartCall, OrderingDisabledError, readStoredBoxCart, type CartVersion } from '@/lib/cart/server';

import { readPaymentOrder } from './confirmation';
import { readPaymentCookie, writePaymentCookie } from './paymentCookie';

/** Aonik's `Stripe` / `Card` (it accepts nothing else for a box). */
const PROVIDER = 'Stripe';
const METHOD = 'Card';

/** The storefront's return origin is not one Aonik can accept: nothing was started. */
export class PaymentOriginError extends Error {
  constructor() {
    super('Payment is not available just now.');
    this.name = 'PaymentOriginError';
  }
}

/**
 * Where Stripe sends the customer back. It must be the HTTPS origin Aonik's
 * Stripe connector is configured with (`returnOrigin`): `STOREFRONT_ORIGIN`,
 * or failing that the origin this request came in on. Anything else is
 * refused HERE, before Aonik claims the box and its date for an attempt that
 * could only be rejected afterwards (behind a proxy the request's own origin
 * can be internal and `http`).
 */
export function returnUrls(requestOrigin: string): { returnUrl: string; cancelUrl: string } {
  const origin = (process.env.STOREFRONT_ORIGIN?.trim() || requestOrigin).replace(/\/$/, '');
  if (!/^https:\/\/[^/\s]+$/i.test(origin)) {
    console.error('[payment] STOREFRONT_ORIGIN (or the request origin) is not an https origin:', origin);
    throw new PaymentOriginError();
  }
  return {
    returnUrl: `${origin}/box/payment/return?outcome=success`,
    cancelUrl: `${origin}/box/payment/return?outcome=cancel`,
  };
}

/** Money as Aonik reads it: major units, whole pennies. */
const toMajor = (pence: number) => Math.round(pence) / 100;

/** The Terms of Sale version to accept, read fresh: a stale version is refused at checkout. */
async function currentTermsVersion(): Promise<string | null> {
  const config = readAonikConfig();
  if (!config) return null;
  const storefront = await aonikFetch<StorefrontConfigDto>('/commerce/config/storefront', {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
    policy: 'volatile',
  });
  return storefront.saleTerms?.version ?? null;
}

/**
 * Records that the customer accepted the current Terms of Sale — the legal
 * line says continuing is acceptance (D29). A full replacement, like every
 * draft save: everything else is echoed as saved. Returns the box's new
 * version; unchanged when the tenant configured no terms.
 */
async function acceptTerms(version: CartVersion): Promise<CartVersion> {
  const terms = await currentTermsVersion();
  if (!terms) return version;
  const current = await cartCall<CheckoutDraftResponseDto>('/checkout-draft');
  if (current.draft?.acceptedTermsVersion === terms) return version;
  const saved = await cartCall<CheckoutDraftResponseDto>(
    '/checkout-draft',
    { method: 'PUT', body: { ...(current.draft ?? {}), acceptedTermsVersion: terms } },
    version,
  );
  return saved.cartVersion;
}

export type PaymentStart =
  /** Off to Stripe. */
  | { kind: 'redirect'; checkoutUrl: string }
  /** Already paid (a replay of a finished attempt, or another tab): the confirmation. */
  | { kind: 'paid' }
  /** An attempt is on its way but cannot take payment now: the payment page says why. */
  | { kind: 'pending' };

/**
 * CONTINUE TO PAYMENT. Aonik validates everything again — the delivery
 * details, the date's own hold, the code, the total — before any stock, order
 * or provider work, and its refusals propagate to the route unchanged.
 *
 * Never retried here: a network failure is answered by reading the payment
 * state (Aonik's attempt is idempotent, so a second press resumes the same
 * one rather than making another).
 */
export async function startPayment(input: {
  version: CartVersion;
  expectedTotalPence: number;
  origin: string;
}): Promise<PaymentStart> {
  // Checked on the server, whatever the page showed: no attempt while ordering is closed.
  if (!liveOrderingEnabled()) throw new OrderingDisabledError();
  const urls = returnUrls(input.origin);

  const box = await readStoredBoxCart();
  if (!box) throw new CartMissingError('There is no box to check out.');
  if (box.status === 'CheckedOut') throw cartOrderedError();

  const version = await acceptTerms(input.version);
  const result = await cartCall<CheckoutResultDto>(
    '/checkout',
    {
      method: 'POST',
      body: {
        provider: PROVIDER,
        paymentMethodType: METHOD,
        ...urls,
        // Omitted on purpose: `delivery` (the saved draft is the source),
        // `discountCode` (null keeps the saved code) and `customerAccountId`
        // (it makes the order invoice-backed, and recovery then needs staff).
        expectedTotal: toMajor(input.expectedTotalPence),
      },
    },
    version,
  );

  await writePaymentCookie({
    orderId: result.orderId,
    paymentIntentId: result.paymentIntentId,
    expectedTotalPence: input.expectedTotalPence,
    ...(result.guestOrderToken ? { guestOrderToken: result.guestOrderToken } : {}),
  });

  if (result.checkoutUrl) return { kind: 'redirect', checkoutUrl: result.checkoutUrl };
  return result.paymentStatus === 'Captured' ? { kind: 'paid' } : { kind: 'pending' };
}

/** The box's payment, as Aonik recorded it. Null when there is no box in this browser. */
export async function readPaymentState(): Promise<CartPaymentStateDto | null> {
  try {
    return await cartCall<CartPaymentStateDto>('/payment');
  } catch (error) {
    if (!(error instanceof CartMissingError)) throw error;
  }
  // The box is gone from this browser. A captured payment turns it into an
  // order, and the next page to load clears its cookie — which can be this
  // page's own hydration, a moment after the payment landed. The attempt in
  // the payment cookie is then read as the order it became: paid is paid.
  const found = await readPaymentOrder();
  if (found?.dto.paymentStatus !== 'Captured') return null;
  return {
    orderId: found.dto.orderId,
    paymentIntentId: found.paymentIntentId,
    status: 'succeeded',
    canEdit: false,
    cartVersion: '',
    checkoutUrl: null,
  };
}

/**
 * Asks Aonik to recover the attempt — the cancel return, a reopen of checkout,
 * a retry. Aonik EXPIRES a Stripe session that can still take payment and
 * re-reads it: a closure with nothing paid makes the box editable again (and
 * releases the hold, stock and code); a capture completes the order instead;
 * anything uncertain changes nothing.
 */
export async function recoverPayment(state: CartPaymentStateDto): Promise<CartPaymentStateDto> {
  if (!state.paymentIntentId) return state;
  return cartCall<CartPaymentStateDto>(
    '/payment/recover',
    { method: 'POST', body: { paymentIntentId: state.paymentIntentId } },
    state.cartVersion,
  );
}

export type PaymentRetry =
  | { kind: 'redirect'; checkoutUrl: string }
  | { kind: 'paid' }
  /** Back to checkout, with why (`date` — the date must be chosen again; `total` — it changed). */
  | { kind: 'checkout'; reason: 'date' | 'total' | 'other' }
  /** Still being decided: stay on the payment page. */
  | { kind: 'pending' };

const DATE_CODES = new Set([
  'commerce.delivery_date_full',
  'commerce.no_delivery',
  'commerce.delivery_availability_unknown',
  'commerce.delivery_reservation_expired',
  'commerce.delivery_reservation_conflict',
]);

/**
 * TRY AGAIN, USE ANOTHER CARD and CONTINUE TO PAYMENT on the payment pages —
 * one action: Stripe's page takes any card.
 *
 * 1. The attempt can still take payment: back to the SAME Stripe session.
 * 2. Recovery closed it unpaid (`canEdit`): its hold was released, so the
 *    saved date is reserved again (D16) and a new attempt starts on the same
 *    order, with the total the customer agreed to. A date that has gone, or a
 *    total that moved, goes back to checkout to choose or confirm again.
 * 3. Otherwise it is still being decided: never a second payment.
 */
export async function retryPayment(origin: string): Promise<PaymentRetry> {
  let state = await readPaymentState();
  if (!state) throw new CartMissingError();
  if (state.status === 'succeeded') return { kind: 'paid' };
  if (state.checkoutUrl) return { kind: 'redirect', checkoutUrl: state.checkoutUrl };
  // The provider has closed the session but Aonik has not yet moved the box
  // on (until its sweeper does): ask it to, rather than leave the press with
  // nothing to do. Only Aonik's answer says the box may change.
  if (!state.canEdit && (state.status === 'failed' || state.status === 'cancelled')) {
    state = await recoverPayment(state);
    if (state.status === 'succeeded') return { kind: 'paid' };
    if (state.checkoutUrl) return { kind: 'redirect', checkoutUrl: state.checkoutUrl };
  }
  if (!state.canEdit) return { kind: 'pending' };

  const agreed = await readPaymentCookie();
  if (!agreed) return { kind: 'checkout', reason: 'total' };
  const draft = await cartCall<CheckoutDraftResponseDto>('/checkout-draft');
  const date = draft.draft?.deliveryDate;
  if (!date) return { kind: 'checkout', reason: 'date' };

  try {
    const held = await cartCall<{ cartVersion: string }>(
      '/delivery-reservation',
      { method: 'PUT', body: { deliveryDate: date } },
      draft.cartVersion,
    );
    const started = await startPayment({ version: held.cartVersion, expectedTotalPence: agreed.expectedTotalPence, origin });
    return started.kind === 'redirect' ? started : started.kind === 'paid' ? { kind: 'paid' } : { kind: 'pending' };
  } catch (error) {
    if (error instanceof AonikError && error.code && DATE_CODES.has(error.code)) return { kind: 'checkout', reason: 'date' };
    if (error instanceof AonikError && error.code === 'commerce.discount_price_changed') return { kind: 'checkout', reason: 'total' };
    if (error instanceof AonikError && (error.status === 400 || error.status === 409)) return { kind: 'checkout', reason: 'other' };
    throw error;
  }
}

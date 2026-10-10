/**
 * The `/api/checkout/*` seam (`/box/checkout`, #31).
 *
 *   PUT    draft        { details }  saves the form's own sections of the draft
 *   GET    reservation               the delivery-date hold as it stands
 *   PUT    reservation  { date }     chooses a date and starts its 15-minute hold
 *   PUT    discount     { code }     applies a code (Aonik checks it at once)
 *   DELETE discount                  removes it
 *   GET    dates?from=&days=         the bookable calendar — no box needed
 *
 * Like `/api/cart`, only this server sees the cart cookie, and every write
 * forwards the tab's `X-Cart-Version`. A write Aonik refuses because the box
 * moved on (`cart.conflict`) or is mid-payment (`cart.locked`) answers with the
 * box, the draft and the hold as they are now, for the tab to adopt before
 * anything is retried — never retried here.
 *
 * Every answer carries the box's new `version` (or the whole `cart`), so the
 * tab's next write — here or on any box step — is based on the box it saw.
 */

import { NextResponse } from 'next/server';

import { getAonikClient } from '@/lib/aonik/client';
import { AONIK_CODES, AonikError } from '@/lib/aonik/errors';
import { CartMissingError, mapCartMissingError } from '@/lib/cart/cartMissing';
import { CartUnavailableError } from '@/lib/cart/server';
import { CART_CONFLICT_CODE, CART_LOCKED_CODE, CART_VERSION_HEADER } from '@/lib/cart/transport';
import { isIsoDate } from '@/lib/checkout/calendar';
import { CODE_MAX_LENGTH, codeRefusal, isCodeRefusal, normaliseCode } from '@/lib/checkout/codes';
import { DETAIL_FIELDS, FIELD_LIMITS, type CheckoutDetails } from '@/lib/checkout/form';
import {
  applyDiscountCode,
  readCheckoutReservation,
  readCheckoutSync,
  removeDiscountCode,
  reserveDeliveryDate,
  saveCheckoutDetails,
} from '@/lib/checkout/server';
import {
  CHECKOUT_CODES,
  type CheckoutCodeAnswer,
  type CheckoutDatesAnswer,
  type CheckoutDraftAnswer,
  type CheckoutRefusal,
  type CheckoutReservationAnswer,
} from '@/lib/checkout/transport';

export const dynamic = 'force-dynamic';

/** A month at most per read (Aonik allows 62 days). */
const MAX_DAYS = 62;

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const refuse = (status: number, body: CheckoutRefusal) => json(body, status);

function versionOf(request: Request): string | undefined {
  return request.headers.get(CART_VERSION_HEADER)?.trim() || undefined;
}

/** The form as sent: every field a string within its limit, or nothing at all. */
function readDetails(body: unknown): CheckoutDetails | null {
  const details = (body as { details?: unknown } | null)?.details;
  if (typeof details !== 'object' || details === null) return null;
  const out = {} as CheckoutDetails;
  for (const field of DETAIL_FIELDS) {
    const value = (details as Record<string, unknown>)[field] ?? '';
    if (typeof value !== 'string' || value.length > FIELD_LIMITS[field]) return null;
    out[field] = value;
  }
  return out;
}

/** Aonik's delivery refusals, as the page names them. */
const DATE_REFUSALS: Record<string, string> = {
  'commerce.delivery_date_full': CHECKOUT_CODES.dateFull,
  'commerce.no_delivery': CHECKOUT_CODES.dateFull,
  'commerce.delivery_availability_unknown': CHECKOUT_CODES.availabilityUnknown,
  'commerce.delivery_reservation_expired': CHECKOUT_CODES.reservationEnded,
  'commerce.delivery_reservation_conflict': CHECKOUT_CODES.reservationConflict,
};

async function failure(error: unknown) {
  if (error instanceof CartMissingError) {
    const mapped = mapCartMissingError(error);
    return refuse(mapped.status, { error: mapped.payload.error, code: mapped.payload.code, cart: null });
  }
  if (error instanceof CartUnavailableError) {
    return refuse(503, { error: 'Checkout needs a live box; this build is on demo data.', code: 'cart.unavailable' });
  }

  /*
   * Another tab changed the box, or a payment attempt holds it. Nothing was
   * written; the answer is the box, draft and hold as they are, for the tab to
   * adopt and reconcile. A box that cannot be re-read keeps the tab as it is.
   */
  if (error instanceof AonikError && error.isCartWriteRefused) {
    const code = error.code === AONIK_CODES.cartLocked ? CART_LOCKED_CODE : CART_CONFLICT_CODE;
    try {
      const sync = await readCheckoutSync();
      if (!sync) {
        const missing = new CartMissingError();
        return refuse(409, { error: missing.message, code: missing.code, cart: null });
      }
      return refuse(409, { error: 'Your checkout changed in another window.', code, ...sync });
    } catch (readFailure) {
      console.error('[api/checkout] could not re-read the box after a refused write', readFailure);
      return refuse(409, { error: 'Your checkout changed in another window. Reload the page to see it.', code: 'cart.reload' });
    }
  }

  if (error instanceof AonikError) {
    const date = error.code ? DATE_REFUSALS[error.code] : undefined;
    if (date) return refuse(error.status, { error: error.message, code: date });
    if (error.status === 429) return refuse(429, { error: 'Too many requests.', code: CHECKOUT_CODES.busy });
    if (isCodeRefusal(error.code)) return refuse(error.status, { error: codeRefusal(error.code), code: error.code! });
    if (error.status === 400 || error.status === 422) {
      // Aonik refused what was sent (a control character, a field too long).
      console.warn('[api/checkout] Aonik refused the request', { path: error.path, code: error.code });
      return refuse(400, { error: error.message, code: CHECKOUT_CODES.invalid });
    }
  }

  console.error('[api/checkout] unexpected failure', error);
  return refuse(503, { error: 'Checkout could not be updated just now.', code: CHECKOUT_CODES.unavailable });
}

export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  try {
    if (action === 'reservation') {
      const answer: CheckoutReservationAnswer = await readCheckoutReservation();
      return json(answer);
    }
    if (action === 'dates') {
      const url = new URL(request.url);
      const from = url.searchParams.get('from');
      const days = Number(url.searchParams.get('days'));
      if (!isIsoDate(from) || !Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
        return refuse(400, { error: 'A start date and 1–62 days are required.', code: CHECKOUT_CODES.invalid });
      }
      const answer: CheckoutDatesAnswer = { calendar: await (await getAonikClient()).getDeliveryCalendar(from, days) };
      return json(answer);
    }
    return refuse(404, { error: 'Unknown checkout action', code: CHECKOUT_CODES.invalid });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const body: unknown = await request.json().catch(() => null);
  const version = versionOf(request);
  try {
    if (action === 'draft') {
      const details = readDetails(body);
      if (!details) return refuse(400, { error: 'The checkout form was not readable.', code: CHECKOUT_CODES.invalid });
      const answer: CheckoutDraftAnswer = await saveCheckoutDetails(details, version);
      return json(answer);
    }
    if (action === 'reservation') {
      const date = (body as { date?: unknown } | null)?.date;
      if (!isIsoDate(date)) return refuse(400, { error: 'A delivery date is required.', code: CHECKOUT_CODES.invalid });
      const answer: CheckoutReservationAnswer = await reserveDeliveryDate(date, version);
      return json(answer);
    }
    if (action === 'discount') {
      const raw = (body as { code?: unknown } | null)?.code;
      const code = typeof raw === 'string' ? normaliseCode(raw) : '';
      if (!code || code.length > CODE_MAX_LENGTH) {
        return refuse(400, { error: codeRefusal('commerce.discount_invalid'), code: 'commerce.discount_invalid' });
      }
      const answer: CheckoutCodeAnswer = { cart: await applyDiscountCode(code, version) };
      return json(answer);
    }
    return refuse(404, { error: 'Unknown checkout action', code: CHECKOUT_CODES.invalid });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  try {
    if (action === 'discount') {
      const answer: CheckoutCodeAnswer = { cart: await removeDiscountCode(versionOf(request)) };
      return json(answer);
    }
    return refuse(404, { error: 'Unknown checkout action', code: CHECKOUT_CODES.invalid });
  } catch (error) {
    return failure(error);
  }
}

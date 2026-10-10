/**
 * What `/api/checkout/*` answers, shared by the route and the page. Plain data
 * only: the page never sees Aonik's shapes, its money or the cart token.
 */

import type { BoxCart } from '@/lib/aonik/map';
import type { DeliveryCalendar } from '@/lib/aonik/types';

import type { CheckoutDetails } from './form';
import type { ReservationView } from './reservation';

/** The route's own refusal codes (Aonik's code refusals pass through as `commerce.discount_*`). */
export const CHECKOUT_CODES = {
  /** The date filled, or is not a delivery day: choose another (SHOPPING-STATE §19). */
  dateFull: 'checkout.date_full',
  /** Aonik cannot confirm capacity: payment stays blocked (§22). */
  availabilityUnknown: 'checkout.availability_unknown',
  /** The hold ended before the write: choose a date again (§20). */
  reservationEnded: 'checkout.reservation_ended',
  /** A payment attempt holds the date, or availability moved under the write. */
  reservationConflict: 'checkout.reservation_conflict',
  /** What was sent could not be stored. */
  invalid: 'checkout.invalid',
  /** Aonik's rate limit: wait, then try again. */
  busy: 'checkout.busy',
  /** Anything else: could not be done just now. */
  unavailable: 'checkout.unavailable',
} as const;

export interface CheckoutDraftAnswer {
  version: string;
  details: CheckoutDetails;
}

export interface CheckoutReservationAnswer {
  version: string;
  reservation: ReservationView | null;
}

export interface CheckoutCodeAnswer {
  cart: BoxCart;
}

export interface CheckoutDatesAnswer {
  calendar: DeliveryCalendar | null;
}

/**
 * A refusal. After another tab's change (`cart.conflict` / `cart.locked`) it
 * carries the box, the draft and the hold as they are now; `cart: null` means
 * the box is gone.
 */
export interface CheckoutRefusal {
  error: string;
  code: string;
  cart?: BoxCart | null;
  details?: CheckoutDetails;
  reservation?: ReservationView | null;
}

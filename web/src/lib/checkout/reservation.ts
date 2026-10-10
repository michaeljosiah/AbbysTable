/**
 * The delivery-date reservation as checkout shows it, React-free
 * (`tests/checkout.test.tsx`).
 *
 * The hold is Aonik's (aonik#346): 15 minutes from the moment the customer
 * chooses or accepts a date, never extended by showing or re-choosing it, and
 * ended by expiry without touching the box or the form. The page's clock only
 * DISPLAYS the time left — `remainingMs` is computed once from the server's
 * own clock (`expiresAtUtc − serverNowUtc`), so a wrong device clock cannot
 * move it — and the page re-reads the hold when the countdown reaches zero or
 * the tab comes back into view. Capacity is never decided here.
 */

import type { CartDeliveryReservationDto } from '@/lib/aonik/dto';

import { isIsoDate } from './calendar';

/** How long Aonik holds a chosen date (design copy says "15 minutes"). */
export const HOLD_MINUTES = 15;

/** The last three minutes are "still reserved" rather than "saved". */
export const WARN_MS = 3 * 60_000;

export interface ReservationView {
  date: string;
  /**
   * `held`: counting down. `ended`: expired or released — choose again.
   * `payment`: a payment attempt holds it (the checkout is locked).
   */
  status: 'held' | 'ended' | 'payment';
  /** Time left on the hold when it was read; 0 unless held. */
  remainingMs: number;
}

/**
 * An instant from Aonik. .NET can serialise a UTC time without its `Z`; the
 * fields are UTC by name, so a bare one is read as UTC, never as local time.
 */
export function parseUtc(value: unknown): number | null {
  if (typeof value !== 'string' || !value) return null;
  const zoned = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const time = Date.parse(zoned);
  return Number.isFinite(time) ? time : null;
}

/**
 * The cart's reservation as the page shows it. With none, a date still in the
 * draft (a hold that lapsed and was swept, or one released by recovery) is an
 * ENDED reservation: the date is shown, and must be chosen again.
 */
export function readReservation(
  dto: CartDeliveryReservationDto | null | undefined,
  draftDate?: string | null,
): ReservationView | null {
  const reservation = dto?.reservation;
  if (!reservation || !isIsoDate(reservation.deliveryDate)) {
    return isIsoDate(draftDate) ? { date: draftDate, status: 'ended', remainingMs: 0 } : null;
  }
  const date = reservation.deliveryDate;
  if (reservation.status === 'PaymentPending' || reservation.status === 'Committed') {
    return { date, status: 'payment', remainingMs: 0 };
  }
  if (reservation.status === 'Held') {
    const expires = parseUtc(reservation.expiresAtUtc);
    const now = parseUtc(dto?.serverNowUtc);
    const remainingMs = expires !== null && now !== null ? expires - now : 0;
    if (remainingMs > 0) return { date, status: 'held', remainingMs };
  }
  // Released, lapsed, or a status this page does not know: never treated as held.
  return { date, status: 'ended', remainingMs: 0 };
}

export type HoldPhase = 'saved' | 'warn' | 'ended';

/** Which panel the time left calls for. */
export function holdPhase(remainingMs: number): HoldPhase {
  if (remainingMs <= 0) return 'ended';
  return remainingMs <= WARN_MS ? 'warn' : 'saved';
}

/** Whole minutes to show: rounded up, so the panel never says 0 while it holds. */
export function minutesLeft(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / 60_000));
}

/**
 * What a screen reader is told — only a CHANGE of phase, never the minutes
 * ticking down (design: "Minutes are NOT live-announced").
 */
export function holdAnnouncement(previous: HoldPhase | null, next: HoldPhase, remainingMs: number): string | null {
  if (previous === next) return null;
  if (next === 'warn') {
    const minutes = minutesLeft(remainingMs);
    return `Your delivery date is reserved for ${minutes} more ${minutes === 1 ? 'minute' : 'minutes'}.`;
  }
  if (next === 'ended' && previous !== null) return 'Your delivery-date reservation has ended. Choose a new date.';
  return null;
}

/**
 * The Delivery & FAQs postcode checker as a state machine — React-free, so
 * every state is unit-tested (tests/delivery-faqs.test.tsx) and the component
 * (`components/delivery-faqs/PostcodeChecker.tsx`) only orchestrates.
 *
 * The design's nine reviewable states, each reachable ONLY through real input
 * (the prototype's development-only state override does not exist here, by
 * frontend-backend-contract §4b):
 *
 *   1. idle                 nothing asked yet, or the entry was edited
 *   2. empty                Check with an empty field        (beside the field)
 *   3. invalid              Check with a malformed postcode  (beside the field)
 *   4. checking             a coverage request in flight
 *   5. serves               "Great — we deliver to …"        (result panel)
 *   6. not served           "We're not in your area yet"     (result panel)
 *   7. could not check      the lookup failed: retry, never a refusal
 *   8. finding location     "Use my current location" waiting on the browser
 *   9. location refused     refused, unavailable or unplaceable (beside the field)
 *
 * A result is only ever an ANSWER from the coverage lookup. Nothing here can
 * produce "serves" or "not served" on its own.
 */

import type { PostcodeMessage } from './postcode';

export type CheckerResult =
  | { kind: 'serves'; postcode: string; earliestDeliveryDate: string | null }
  | { kind: 'not-served'; postcode: string }
  /** A technical failure, not a delivery outcome: neutral wording and a retry. */
  | { kind: 'unavailable' };

export interface CheckerState {
  /** What is in flight, if anything. */
  busy: null | 'checking' | 'locating';
  /** The correction beside the field. */
  message: PostcodeMessage | null;
  /** The answer panel. */
  result: CheckerResult | null;
  /**
   * The request the next answer must belong to. Every start and every reset
   * takes a new number from the component's counter, so an answer that
   * arrives after the customer has moved on — edited the field, cleared it,
   * started again — is dropped, never shown against an entry it is not about.
   */
  request: number;
  /** Bumped once per answer, so the page knows a FRESH panel has arrived. */
  revision: number;
}

export const INITIAL_CHECKER_STATE: CheckerState = {
  busy: null,
  message: null,
  result: null,
  request: 0,
  revision: 0,
};

export type CheckerEvent =
  /** A check or a location lookup begins, as request `request`. */
  | { type: 'start'; busy: 'checking' | 'locating'; request: number }
  /** A correction to show beside the field (ends anything in flight). */
  | { type: 'correct'; message: PostcodeMessage; request?: number }
  /** The coverage lookup answered request `request`. */
  | { type: 'answer'; request: number; result: CheckerResult }
  /**
   * The customer moved on: typed, cleared the field, or chose "Change
   * postcode" / "Check another postcode". The panel goes and nothing in flight
   * may land: `request` is a fresh number no request was started with.
   */
  | { type: 'reset'; request: number };

export function checkerReducer(state: CheckerState, event: CheckerEvent): CheckerState {
  switch (event.type) {
    case 'start':
      return { ...state, busy: event.busy, message: null, result: null, request: event.request };

    case 'correct':
      // A late location failure for an abandoned request changes nothing.
      if (event.request !== undefined && event.request !== state.request) return state;
      return { ...state, busy: null, message: event.message, result: null };

    case 'answer':
      if (event.request !== state.request || state.busy !== 'checking') return state;
      return {
        ...state,
        busy: null,
        message: null,
        result: event.result,
        revision: state.revision + 1,
      };

    case 'reset':
      return { ...state, busy: null, message: null, result: null, request: event.request };
  }
}

/** Today's date in the UK, as `YYYY-MM-DD` — the calendar delivery dates are written in. */
export function londonToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * An earliest delivery date worth showing: a `YYYY-MM-DD` that is today or
 * later in the UK. A past date — a stale window, an old fixture — is no
 * answer at all, so the result leaves the date lines out rather than promise
 * a day that has gone.
 */
export function upcomingDeliveryDate(isoDate: string | null | undefined, now: Date = new Date()): string | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  return isoDate >= londonToday(now) ? isoDate : null;
}

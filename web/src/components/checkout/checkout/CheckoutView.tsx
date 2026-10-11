'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

import type { CustomerAddress } from '@/lib/aonik/addresses';
import type { BoxCart } from '@/lib/aonik/map';
import type { BoxPricing, DeliveryCalendar, Extra } from '@/lib/aonik/types';
import { GiftFoodOptions } from '@/components/gifting/GiftFoodOptions';
import { useCart } from '@/lib/cart/CartProvider';
import {
  ORDERING_DISABLED_CODE,
  ORDERING_DISABLED_MESSAGE,
} from '@/lib/cart/ordering';
import { useCartQuote } from '@/lib/cart/quote';
import {
  CART_CONFLICT_CODE,
  CART_LOCKED_CODE,
  CART_RELOAD_CODE,
} from '@/lib/cart/transport';
import {
  addDays,
  addMonths,
  monthOf,
  monthRange,
  readDayStatus,
  type DayStatus,
} from '@/lib/checkout/calendar';
import {
  appliedLine,
  isGiftCardCode,
  CODE_MAX_LENGTH,
  lapsedLine,
  normaliseCode,
} from '@/lib/checkout/codes';
import {
  blockerTarget,
  checkoutBlockers,
  cleanInput,
  coverageFor,
  DETAIL_FIELDS,
  FIELD_IDS,
  FIELD_LIMITS,
  fieldError,
  formatPostcodeInput,
  mergeDetails,
  needText,
  postcodeError,
  sameDetails,
  type CheckoutDetails,
  type CoverageState,
  type DetailField,
  type HoldState,
} from '@/lib/checkout/form';
import {
  holdAnnouncement,
  holdPhase,
  HOLD_MINUTES,
  type HoldPhase,
  type ReservationView,
} from '@/lib/checkout/reservation';
import {
  CHECKOUT_CODES,
  type CheckoutCodeAnswer,
  type CheckoutDatesAnswer,
  type CheckoutDraftAnswer,
  type CheckoutHoldAnswer,
  type CheckoutPayAnswer,
  type CheckoutRefusal,
  type CheckoutReservationAnswer,
  type CheckoutSyncAnswer,
} from '@/lib/checkout/transport';
import { PRIVACY_ITEM, TERMS_ITEM } from '@/lib/content/navigation';
import { guardRedirect } from '@/lib/shopping-state';
import { checkPostcode } from '@/lib/delivery/actions';
import { formatDeliveryDateLong } from '@/lib/format';
import { normalisePostcode } from '@/lib/delivery/postcode';
import {
  checkoutLegalHref,
  CHECKOUT_LEGAL_LINK,
  NEW_TAB_NOTE,
} from '@/lib/legal/checkoutReturn';

import styles from './Checkout.module.css';
import { CheckoutLogin } from './CheckoutLogin';
import { CheckoutBenefits } from './CheckoutBenefits';
import { DeliveryDate } from './DeliveryDate';
import { OrderSummary } from './OrderSummary';

/** How far ahead the calendar goes: this month and the next three (D23). */
const CALENDAR_MONTHS_AHEAD = 3;
/** A field's save waits this long after it is left, so a run of tabs saves once. */
const SAVE_SETTLE_MS = 400;

const DATE_FULL =
  'That date has just filled. Please choose another available date.';
const DATE_FAILED = 'We couldn’t save that date just now. Please try again.';
const DATE_CHANGED =
  'Your checkout changed in another window. Please choose your date again.';
const DATE_UNKNOWN =
  'We can’t confirm delivery availability right now. Please try again.';
const SYNCED =
  'Your checkout was updated in another window, so we’ve brought it up to date here.';
/* Not designed: Aonik's refusals at payment start, said plainly. Nothing was charged. */
const TOTAL_CHANGED =
  'Your total has changed. Please check your order summary, then continue to payment again.';
const BOX_CHANGED =
  'Your box has changed. Please check your order summary, then continue to payment again.';
const TERMS_CHANGED =
  'Our Terms of Sale have been updated. Please read them, then continue to payment again.';
const SAVE_FAILED =
  'We couldn’t save your details just now. They’re still here, and we’ll try again as you go.';
const CONTINUE_UNSAVED =
  'We couldn’t save your details just now. Please try again.';

/** The fields' names, for the one live line that reads out a field's error as it is left. */
const FIELD_NAMES: Record<DetailField, string> = {
  email: 'Email',
  firstName: 'First name',
  lastName: 'Last name',
  line1: 'Address line 1',
  line2: 'Address line 2',
  city: 'Town or city',
  postcode: 'Postcode',
  phone: 'Phone number',
  notes: 'Delivery notes',
};

export interface CheckoutViewProps {
  /** Live (Aonik's box and draft) or demo (the box held in this browser; nothing is reserved). */
  savedAddresses?: CustomerAddress[];
  signedIn?: boolean;
  live: boolean;
  /** The box as the page was rendered with — the summary until the cart provider has read it. */
  initialCart: BoxCart | null;
  initialDetails: CheckoutDetails;
  initialSavedDetails?: CheckoutDetails;
  initialReservation: ReservationView | null;
  /** From today for 62 days: the suggestion and the first months' availability. */
  calendar: DeliveryCalendar | null;
  /** Today in London, `YYYY-MM-DD`. */
  today: string;
  /** Demo's quote is computed from these, as on Review. */
  pricing: BoxPricing;
  extras: Extra[];
  signatureUpgrades: Record<string, number>;
}

type MonthStatuses = Map<string, DayStatus>;

/** The statuses a calendar read gives, and which whole months it covered. */
function readCalendar(calendar: DeliveryCalendar | null): {
  statuses: MonthStatuses;
  months: string[];
} {
  const statuses: MonthStatuses = new Map();
  for (const day of calendar?.days ?? [])
    statuses.set(day.date, readDayStatus(day.status));
  const months: string[] = [];
  if (calendar) {
    for (
      let month = monthOf(calendar.fromDate);
      month <= monthOf(calendar.toDate);
      month = addMonths(month, 1)
    ) {
      const { fromDate, days } = monthRange(month);
      // Covered to its last day (earlier days of the first month are past, so not needed).
      if (calendar.toDate >= addDays(fromDate, days - 1)) months.push(month);
    }
  }
  return { statuses, months };
}

function ErrorLine({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span className={styles.error} id={id}>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--chilli)"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 3.5l8.5 16h-17z" />
        <path d="M12 10v4M12 16.8h.01" />
      </svg>
      <span>{children}</span>
    </span>
  );
}

/**
 * Checkout (step 5; design: Checkout v2, #31): your details, where to send
 * the box, the delivery date and its reservation, a discount code, the legal
 * line and the order summary, up to CONTINUE TO PAYMENT.
 *
 * The draft is Aonik's (aonik#347): each field is saved when it is left, so a
 * refresh, another tab or "← Back to checkout" from a legal page finds it as
 * it was. The date is reserved by Aonik (#346) and the page only counts its
 * minutes down. Eligibility is the coverage lookup's answer — never a guess —
 * and it blocks payment until it says we deliver. What blocks payment is one
 * function, `checkoutBlockers`; CONTINUE takes the customer to the first.
 *
 * The Stripe hand-off is not here yet (#32): CONTINUE says plainly that online
 * ordering is not open, and nothing is ordered or charged.
 */
export function CheckoutView({
  signedIn = false,
  savedAddresses = [],
  live,
  initialCart,
  initialDetails,
  initialSavedDetails,
  initialReservation,
  calendar: initialCalendar,
  today,
  pricing,
  extras,
  signatureUpgrades,
}: CheckoutViewProps) {
  const router = useRouter();
  const cart = useCart();
  const signatureUpgradeFor = useCallback(
    (dishId: string) => signatureUpgrades[dishId] ?? 0,
    [signatureUpgrades],
  );
  const liveQuote = useCartQuote(pricing, {
    extrasCatalogue: extras,
    signatureUpgradeFor,
  });
  const quote = liveQuote ?? initialCart?.quote ?? null;

  /* ---- The form --------------------------------------------------------------- */

  const { checkoutRequest } = cart;
  const [details, setDetails] = useState<CheckoutDetails>(initialDetails);
  const [touched, setTouched] = useState<ReadonlySet<DetailField>>(
    () => new Set(),
  );
  const [attempted, setAttempted] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  /**
   * A field's error, read out once as the field is left. The fields' own error
   * lines are not live: CONTINUE marks every gap at once, and a screen reader
   * would read them all.
   */
  const [fieldLive, setFieldLive] = useState('');
  const latest = useRef(details);
  latest.current = details;
  /** What Aonik holds: the base for a three-way merge after another tab's save. */
  const saved = useRef(initialSavedDetails ?? initialDetails);
  /**
   * The box version the form, the hold and the code on screen were read with.
   * Every write from here is based on it — not on the cart engine's, which a
   * read elsewhere may have moved — so a tab showing an older draft is refused
   * and re-synced, never allowed to save over a newer one.
   */
  const basis = useRef(initialCart?.version);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const mounted = useRef(true);
  /** The control to focus once the change that puts it on screen has rendered. */
  const focusNext = useRef<string | null>(null);

  /* ---- Eligibility --------------------------------------------------------------- */

  const [coverage, setCoverage] = useState<CoverageState>({ status: 'idle' });
  const coverageRef = useRef(coverage);
  coverageRef.current = coverage;

  /* ---- The date and its hold ---------------------------------------------------- */

  const [reservation, setReservation] = useState<{
    view: ReservationView | null;
    at: number;
  }>(() => ({
    view: initialReservation,
    at: Date.now(),
  }));
  const reservationRef = useRef(reservation);
  reservationRef.current = reservation;
  const [now, setNow] = useState(() => reservation.at);
  const [demoDate, setDemoDate] = useState<string | null>(null);
  const [dateBusy, setDateBusy] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [earliest, setEarliest] = useState<string | null>(
    initialCalendar?.earliestDeliveryDate ?? null,
  );
  const [holdLive, setHoldLive] = useState('');

  const initialRead = useMemo(
    () => readCalendar(initialCalendar),
    [initialCalendar],
  );
  const [statuses, setStatuses] = useState<MonthStatuses>(initialRead.statuses);
  const [loadedMonths, setLoadedMonths] = useState<ReadonlySet<string>>(
    () => new Set(initialRead.months),
  );
  const requested = useRef(new Set<string>(initialRead.months));

  /* ---- Code, payment, sheet ------------------------------------------------------- */

  const [codeInput, setCodeInput] = useState('');
  const [codeMessage, setCodeMessage] = useState<{
    text: string;
    bad: boolean;
  } | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [benefitsBusy, setBenefitsBusy] = useState(false);
  const [createAccount, setCreateAccount] = useState(
    initialCart?.createAccount ?? false,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  /* ---- Derived ---------------------------------------------------------------------- */

  const view = reservation.view;
  const remainingMs =
    view?.status === 'held' ? view.remainingMs - (now - reservation.at) : 0;
  const date = live ? (view?.date ?? null) : demoDate;
  const hold: HoldState =
    !live || !view
      ? 'none'
      : view.status === 'held' && remainingMs > 0
        ? 'held'
        : 'ended';
  const phase: HoldPhase | null =
    live && view ? (hold === 'held' ? holdPhase(remainingMs) : 'ended') : null;
  const appliedCode = quote?.discount;

  const blockers = checkoutBlockers({
    details,
    coverage,
    date,
    hold,
    availabilityKnown: Boolean(earliest),
    codeRefused: Boolean(appliedCode?.reasonCode || quote?.giftTender?.reasonCode),
  });
  const need = attempted ? needText(blockers) : null;

  /* ---- Entry gate (the box itself) -------------------------------------------------- */

  useEffect(() => {
    if (!cart.hydrated) return;
    if (live) {
      // A box the engine could not read is not a box that went: only an answer moves the page.
      if (cart.readFailed) return;
      // The box went (another tab ordered it, or it expired), or another tab made it incomplete.
      // The shared shopping state decides where a box that cannot be checked out
      // goes: no box → Step 1; short or a dish unavailable → Step 2 (with the
      // "checkout details kept" wording); an unavailable add-on → Extras.
      if (!cart.quote) router.replace('/box');
      else {
        const back = guardRedirect('checkout', cart.shopping);
        if (back)
          router.replace(
            back === '/box/dishes' ? `${back}?from=checkout` : back,
          );
      }
      return;
    }
    if (cart.boxSize === null && cart.lines.length === 0)
      router.replace('/box');
    else if (cart.boxSize === null || cart.dishCount < cart.boxSize)
      router.replace('/box/dishes?from=checkout');
  }, [
    cart.hydrated,
    cart.readFailed,
    cart.quote,
    cart.shopping,
    cart.boxSize,
    cart.lines.length,
    cart.dishCount,
    live,
    router,
  ]);

  // Reaching checkout with a complete box is a step reached: VIEW BOX resumes here.
  const { rememberStep } = cart;
  const reachable =
    cart.hydrated &&
    cart.shopping.active &&
    cart.shopping.maxStep === 'checkout';
  useEffect(() => {
    if (reachable) rememberStep('checkout');
  }, [reachable, rememberStep]);

  // The sticky header's height, for "20px under the sticky header" and the rail's offset.
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const header = document.querySelector('header');
    const page = pageRef.current;
    if (!header || !page) return;
    const observer = new ResizeObserver(() =>
      page.style.setProperty(
        '--ck-h',
        `${header.getBoundingClientRect().height}px`,
      ),
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // A control that a change has just put on screen (the date button after a
  // choice, Remove after a code) takes focus once it is there, so focus never
  // falls to the page when the control that was used goes.
  useEffect(() => {
    if (!focusNext.current) return;
    const target = document.getElementById(focusNext.current);
    if (target) {
      focusNext.current = null;
      target.focus();
    }
  });

  /* ---- Another tab's change -------------------------------------------------------- */

  /**
   * Adopts the box's draft and hold as Aonik has them now (the cart engine has
   * taken the box itself): what this tab typed and has not saved is kept, a
   * field only the other tab changed is taken, and the next write is based on
   * the box as it is now.
   */
  const checkCoverageRef = useRef<() => Promise<void>>(async () => undefined);
  const adopt = useCallback(
    (sync: CheckoutSyncAnswer, announce: 'always' | 'if-changed') => {
      const before = reservationRef.current.view;
      const changed =
        !sameDetails(saved.current, sync.details) ||
        before?.date !== sync.reservation?.date ||
        before?.status !== sync.reservation?.status;
      const merged = mergeDetails(saved.current, latest.current, sync.details);
      saved.current = sync.details;
      latest.current = merged;
      basis.current = sync.cart.version;
      setDetails(merged);
      setCreateAccount(sync.cart.createAccount ?? false);
      setReservation({ view: sync.reservation, at: Date.now() });
      setNow(Date.now());
      if (announce === 'always' || changed) setSyncNote(SYNCED);
      // A postcode that arrived with the sync is judged as one the customer typed.
      void checkCoverageRef.current();
    },
    [],
  );

  /** Adopts what a refusal carried. True when it was handled (the caller says nothing more). */
  const reconcile = useCallback(
    (refusal: CheckoutRefusal): boolean => {
      // Left behind (the customer moved on while it was in flight): nothing to
      // show it on, but the next write (a flushed save) follows the box as it is.
      if (!mounted.current) {
        if (
          refusal.code === CART_CONFLICT_CODE &&
          refusal.cart &&
          refusal.details
        ) {
          saved.current = refusal.details;
          basis.current = refusal.cart.version;
        }
        return true;
      }
      if (refusal.code === CART_LOCKED_CODE) {
        // A payment attempt holds the box: the page shows that instead.
        router.refresh();
        return true;
      }
      if (refusal.cart === null) {
        router.replace('/box');
        return true;
      }
      if (
        refusal.code === CART_CONFLICT_CODE &&
        refusal.cart &&
        refusal.details
      ) {
        adopt(
          {
            cart: refusal.cart,
            details: refusal.details,
            reservation: refusal.reservation ?? null,
          },
          'always',
        );
        return true;
      }
      if (refusal.code === CART_RELOAD_CODE) {
        setSyncNote(refusal.error);
        return true;
      }
      return false;
    },
    [router, adopt],
  );

  /** Re-reads the box, its draft and its hold, and adopts them. */
  const resync = useCallback(async () => {
    const result = await checkoutRequest<CheckoutSyncAnswer>('/sync');
    if (!mounted.current) return;
    if (result.ok) adopt(result.payload, 'if-changed');
    else reconcile(result.payload as CheckoutRefusal);
  }, [checkoutRequest, adopt, reconcile]);

  /**
   * Asks Aonik how the hold stands — and whether the box has moved on since
   * this page read it (another tab's save, a restored page). Moved on: the
   * whole of it is read again, never just its number.
   */
  const check = useCallback(async () => {
    if (!live) return;
    const result = await checkoutRequest<CheckoutHoldAnswer>('/reservation');
    if (!mounted.current) return;
    if (!result.ok) {
      reconcile(result.payload as CheckoutRefusal);
      return;
    }
    if (
      result.payload.boxVersion &&
      result.payload.boxVersion !== basis.current
    ) {
      await resync();
      return;
    }
    setReservation((current) => ({
      // None at all after one was shown: it lapsed and went — ended, not vanished.
      view:
        result.payload.reservation ??
        (current.view
          ? { ...current.view, status: 'ended', remainingMs: 0 }
          : null),
      at: Date.now(),
    }));
    setNow(Date.now());
  }, [live, checkoutRequest, reconcile, resync]);

  // On arrival — including Back/Forward, which restores this page from the
  // router's cache with the form and hold it was first rendered with — and
  // whenever the page is shown again, the box is checked against Aonik.
  const checkRef = useRef(check);
  checkRef.current = check;
  useEffect(() => {
    void checkRef.current();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkRef.current();
    };
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) void checkRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onShow);
    };
  }, []);

  /* ---- Saving the draft ---------------------------------------------------------------- */

  /**
   * Saves the form if it differs from what Aonik holds. The form and the
   * version are read when the save's turn comes, not when it was asked for:
   * one queued behind another (or behind a merge) sends what is current then.
   */
  const save = useCallback(
    async (options?: {
      keepalive?: boolean;
    }): Promise<'saved' | 'merged' | 'failed'> => {
      clearTimeout(saveTimer.current);
      saveTimer.current = undefined;
      if (!live) return 'saved';
      const result = await checkoutRequest<CheckoutDraftAnswer>(
        '/draft',
        () => {
          const snapshot = latest.current;
          if (sameDetails(snapshot, saved.current)) return null;
          return {
            method: 'PUT',
            body: { details: snapshot },
            version: basis.current,
            keepalive: options?.keepalive,
          };
        },
      );
      if (result.skipped) return 'saved';
      if (result.ok) {
        saved.current = result.payload.details;
        basis.current = result.payload.version;
        if (mounted.current) setSaveNote(null);
        return 'saved';
      }
      // Kept here as typed either way; the next field left (or CONTINUE) tries again.
      if (reconcile(result.payload as CheckoutRefusal)) return 'merged';
      setSaveNote(SAVE_FAILED);
      return 'failed';
    },
    [live, checkoutRequest, reconcile],
  );

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), SAVE_SETTLE_MS);
  }, [save]);

  // A save still waiting is sent, not dropped, when the page is left — by a
  // link (the cart engine outlives the page) or by closing the tab.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    mounted.current = true;
    const flushHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const flush = () => {
      if (
        saveTimer.current !== undefined ||
        !sameDetails(latest.current, saved.current)
      ) {
        void saveRef.current({ keepalive: true });
      }
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flushHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flushHidden);
      mounted.current = false;
      flush();
    };
  }, []);

  /* ---- Eligibility ------------------------------------------------------------------------ */

  const checkCoverage = useCallback(async () => {
    const postcode = normalisePostcode(latest.current.postcode);
    if (!postcode) return;
    const current = coverageRef.current;
    if (
      current.status !== 'idle' &&
      current.status !== 'unavailable' &&
      current.postcode === postcode
    )
      return;
    setCoverage({ status: 'checking', postcode });
    const answer = await checkPostcode(postcode).catch(() => ({
      status: 'unavailable' as const,
    }));
    // An answer about a postcode no longer in the field is no answer.
    if (normalisePostcode(latest.current.postcode) !== postcode) return;
    setCoverage({
      status:
        answer.status === 'serves' ||
        answer.status === 'not-served' ||
        answer.status === 'invalid'
          ? answer.status
          : 'unavailable',
      postcode,
    });
  }, []);

  checkCoverageRef.current = checkCoverage;

  // A returning customer's saved postcode is judged as the page opens.
  useEffect(() => {
    if (normalisePostcode(initialDetails.postcode)) void checkCoverage();
  }, [initialDetails.postcode, checkCoverage]);

  /* ---- Field events --------------------------------------------------------------------- */

  const change = (field: DetailField, raw: string) => {
    const clean = cleanInput(field, raw);
    const value = field === 'postcode' ? formatPostcodeInput(clean) : clean;
    setDetails((current) => ({
      ...current,
      [field]: value.slice(0, FIELD_LIMITS[field]),
    }));
    setSyncNote(null);
  };

  const leave = (field: DetailField) => {
    setTouched((current) =>
      current.has(field) ? current : new Set(current).add(field),
    );
    scheduleSave();
    if (field === 'postcode') void checkCoverage();
    // A postcode we deliver to or not is said by its own eligibility line.
    const error =
      field === 'postcode'
        ? postcodeError(details, coverageRef.current)
        : fieldError(field, details[field]);
    setFieldLive(error ? `${FIELD_NAMES[field]}: ${error}` : '');
  };

  const errorOf = (field: DetailField): string | null => {
    if (!touched.has(field) && !attempted) return null;
    return field === 'postcode'
      ? postcodeError(details, coverage)
      : fieldError(field, details[field]);
  };

  /* ---- The hold's clock ------------------------------------------------------------------- */

  useEffect(() => {
    if (hold !== 'held') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hold]);

  // At zero, Aonik is asked rather than trusting the page's clock.
  const askedAtZero = useRef(false);
  useEffect(() => {
    if (view?.status === 'held' && remainingMs <= 0 && !askedAtZero.current) {
      askedAtZero.current = true;
      void check();
    }
    if (remainingMs > 0) askedAtZero.current = false;
  }, [view, remainingMs, check]);

  const lastPhase = useRef<HoldPhase | null>(phase);
  useEffect(() => {
    const said = holdAnnouncement(
      lastPhase.current,
      phase ?? 'ended',
      remainingMs,
    );
    if (phase !== lastPhase.current && said) setHoldLive(said);
    lastPhase.current = phase;
  }, [phase, remainingMs]);

  /* ---- The calendar -------------------------------------------------------------------- */

  const minMonth = monthOf(earliest ?? today);
  const maxMonth = addMonths(monthOf(today), CALENDAR_MONTHS_AHEAD);

  const loadMonth = useCallback(
    (month: string) => {
      if (requested.current.has(month)) return;
      requested.current.add(month);
      const { fromDate, days } = monthRange(month);
      const from = fromDate < today ? today : fromDate;
      const count =
        days -
        Math.max(
          0,
          Math.round((Date.parse(from) - Date.parse(fromDate)) / 86_400_000),
        );
      fetch(`/api/checkout/dates?from=${from}&days=${count}`)
        .then(async (response) =>
          response.ok
            ? ((await response.json()) as CheckoutDatesAnswer).calendar
            : null,
        )
        .catch(() => null)
        .then((calendar) => {
          if (calendar) {
            setStatuses((current) => {
              const next = new Map(current);
              for (const day of calendar.days)
                next.set(day.date, readDayStatus(day.status));
              return next;
            });
          }
          // Shown either way: a month that could not be read offers no dates, never stale ones.
          setLoadedMonths((current) => new Set(current).add(month));
        });
    },
    [today],
  );

  /** Reads a month again: availability moved (a date filled, or a hold that kept a place ended). */
  const reloadMonth = useCallback(
    (month: string) => {
      requested.current.delete(month);
      setLoadedMonths((current) => {
        const next = new Set(current);
        next.delete(month);
        return next;
      });
      // What was known about it is stale: a failed re-read offers no dates, never old ones.
      setStatuses((current) => {
        const next = new Map(current);
        for (const day of next.keys())
          if (monthOf(day) === month) next.delete(day);
        return next;
      });
      loadMonth(month);
    },
    [loadMonth],
  );

  const retryAvailability = useCallback(async () => {
    const response = await fetch(
      `/api/checkout/dates?from=${today}&days=62`,
    ).catch(() => null);
    const calendar = response?.ok
      ? ((await response.json()) as CheckoutDatesAnswer).calendar
      : null;
    if (!calendar) return;
    const read = readCalendar(calendar);
    setStatuses(read.statuses);
    requested.current = new Set(read.months);
    setLoadedMonths(new Set(read.months));
    setEarliest(calendar.earliestDeliveryDate);
  }, [today]);

  const initialMonth = monthOf(date ?? earliest ?? today);
  const openCalendar = useCallback(
    (open: boolean) => {
      // A hold that ended gave its place back — perhaps the last one on its
      // date — so what the calendar shows is read again, not remembered.
      if (open && live && hold === 'ended') reloadMonth(initialMonth);
      setCalendarOpen(open);
    },
    [live, hold, initialMonth, reloadMonth],
  );

  /** A date chosen: Aonik reserves it (live), or it is simply noted (demo — nothing is held). */
  const choose = useCallback(
    async (chosen: string) => {
      setDateError(null);
      if (!live) {
        setDemoDate(chosen);
        setCalendarOpen(false);
        focusNext.current = 'ck-date';
        return;
      }
      if (dateBusy) return;
      setDateBusy(true);
      const result = await checkoutRequest<CheckoutReservationAnswer>(
        '/reservation',
        () => ({
          method: 'PUT',
          body: { date: chosen },
          version: basis.current,
        }),
      );
      // The version is recorded even when the page has been left: a save
      // flushed as it was left is queued behind this write and is based on it.
      if (result.ok) basis.current = result.payload.version;
      if (!mounted.current) return;
      setDateBusy(false);
      setCalendarOpen(false);
      if (result.ok) {
        setReservation({ view: result.payload.reservation, at: Date.now() });
        setNow(Date.now());
        focusNext.current = 'ck-date';
        if (result.payload.reservation?.status === 'held') {
          setHoldLive(
            `${formatDeliveryDateLong(chosen) ?? chosen} is saved for you for ${HOLD_MINUTES} minutes.`,
          );
        }
        return;
      }
      const refusal = result.payload as CheckoutRefusal;
      switch (refusal.code) {
        case CHECKOUT_CODES.dateFull:
          setDateError(DATE_FULL);
          // Refresh what is available; the previous hold stands.
          reloadMonth(monthOf(chosen));
          return;
        case CHECKOUT_CODES.availabilityUnknown:
          setDateError(DATE_UNKNOWN);
          setEarliest(null);
          return;
        case CHECKOUT_CODES.reservationEnded:
          void check();
          return;
        case CHECKOUT_CODES.reservationConflict:
          // Availability moved under the write, or a payment attempt now holds
          // the date: said, the month read again, and the box checked.
          setDateError(DATE_FAILED);
          reloadMonth(monthOf(chosen));
          void check();
          return;
        default:
          if (reconcile(refusal)) {
            if (refusal.code === CART_CONFLICT_CODE) setDateError(DATE_CHANGED);
            return;
          }
          setDateError(DATE_FAILED);
      }
    },
    [live, dateBusy, checkoutRequest, reloadMonth, check, reconcile],
  );

  /* ---- The code ---------------------------------------------------------------------------- */

  const applyCode = async () => {
    const code = normaliseCode(codeInput);
    if (!code) {
      setCodeMessage({ text: 'Enter a code to apply.', bad: true });
      return;
    }
    if (!live) {
      setCodeMessage({
        text: 'Codes can’t be applied on demo data.',
        bad: true,
      });
      return;
    }
    if (codeBusy) return;
    setCodeBusy(true);
    const result = await checkoutRequest<CheckoutCodeAnswer>(
      isGiftCardCode(code) ? '/gift-tender' : '/discount',
      () => ({
        method: 'PUT',
        body: { code },
        version: basis.current,
      }),
    );
    if (result.ok) basis.current = result.payload.cart.version;
    if (!mounted.current) return;
    setCodeBusy(false);
    if (result.ok) {
      setCodeInput('');
      setCodeMessage({ text: isGiftCardCode(code) ? 'Your gift card has been applied to your order.' : appliedLine(code), bad: false });
      focusNext.current = 'ck-code-remove';
      return;
    }
    const refusal = result.payload as CheckoutRefusal;
    if (!reconcile(refusal)) setCodeMessage({ text: refusal.error, bad: true });
  };

  const removeCode = async (gift = false) => {
    if ((!gift && !appliedCode) || codeBusy) return;
    setCodeBusy(true);
    const result = await checkoutRequest<CheckoutCodeAnswer>(
      gift ? '/gift-tender' : '/discount',
      () => ({ method: 'DELETE', version: basis.current }),
    );
    if (result.ok) basis.current = result.payload.cart.version;
    if (!mounted.current) return;
    setCodeBusy(false);
    if (result.ok) {
      setCodeMessage({
        text: gift ? 'Your gift card has been removed.' : `${appliedCode?.code} has been removed.`,
        bad: false,
      });
      focusNext.current = 'ck-code';
      return;
    }
    const refusal = result.payload as CheckoutRefusal;
    if (!reconcile(refusal))
      setCodeMessage({
        text: 'We couldn’t remove that code just now. Please try again.',
        bad: true,
      });
  };

  /* ---- CONTINUE TO PAYMENT ----------------------------------------------------------------- */

  const [continuing, setContinuing] = useState(false);

  const onContinue = async () => {
    if (continuing || benefitsBusy) return;
    setAttempted(true);
    setMessage(null);
    if (blockers.length > 0) {
      // Every gap marked; the sheet closed; the FIRST gap's label brought to
      // just under the header and its control focused. Nothing typed is cleared.
      setTouched(new Set(DETAIL_FIELDS));
      setSheetOpen(false);
      const target = blockerTarget(blockers[0], {
        hasSuggestion: Boolean(earliest),
      });
      requestAnimationFrame(() => {
        const element = document.getElementById(target);
        const label =
          document.querySelector<HTMLElement>(`label[for="${target}"]`) ??
          element;
        label?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        element?.focus({ preventScroll: true });
      });
      return;
    }
    if (!live) {
      setMessage(
        'Ordering is turned off on demo data. Switch to live mode to place a real order.',
      );
      return;
    }
    if (!cart.orderingEnabled) {
      // Closed until a Stripe sandbox run has passed end to end: nothing is started.
      setMessage(ORDERING_DISABLED_MESSAGE);
      return;
    }
    if (!quote) return;
    setContinuing(true);
    const stored = await save();
    if (!mounted.current) return;
    // Nothing goes to payment that Aonik has not stored. A merge has said so
    // itself, and the customer sees the merged form before pressing again.
    if (stored !== 'saved') {
      setContinuing(false);
      if (stored === 'failed') setMessage(CONTINUE_UNSAVED);
      return;
    }
    await pay(quote.totalPence, false);
  };

  /**
   * Starts payment with the total on screen — the customer's acknowledgement:
   * Aonik refuses it if anything moved. A network failure is asked again once
   * (Aonik resumes the same attempt), then left to the payment page, which
   * reads what really happened.
   */
  const pay = async (
    expectedTotalPence: number,
    retried: boolean,
  ): Promise<void> => {
    const result = await checkoutRequest<CheckoutPayAnswer>('/pay', () => ({
      method: 'POST',
      body: { expectedTotalPence },
      version: basis.current,
    }));
    if (!mounted.current) return;
    if (result.ok) {
      const answer = result.payload;
      if (
        answer.kind === 'redirect' &&
        answer.checkoutUrl.startsWith('https://')
      ) {
        // Off to Stripe: "Taking you to secure payment…" stays until the page goes.
        window.location.assign(answer.checkoutUrl);
        return;
      }
      window.location.assign(
        answer.kind === 'paid' ? '/box/confirmation' : '/box/payment',
      );
      return;
    }
    if (result.status === 0) {
      if (!retried) return pay(expectedTotalPence, true);
      window.location.assign('/box/payment');
      return;
    }
    setContinuing(false);
    const refusal = result.payload as CheckoutRefusal;
    // Starting may have recorded the terms first — a write — and a refusal's
    // box moved the engine on: the page's own version follows, by a check.
    const checked =
      refusal.code === CART_CONFLICT_CODE || refusal.code === CART_LOCKED_CODE
        ? null
        : check();
    switch (refusal.code) {
      case ORDERING_DISABLED_CODE:
        setMessage(ORDERING_DISABLED_MESSAGE);
        return;
      case CHECKOUT_CODES.totalChanged:
        setMessage(TOTAL_CHANGED);
        return;
      case CHECKOUT_CODES.boxChanged:
        if (
          refusal.cart?.lines.some(
            (line) => line.isUnavailable && line.kind === 'BoxDish',
          )
        )
          router.push('/box/dishes?from=checkout');
        else setMessage(BOX_CHANGED);
        return;
      case CHECKOUT_CODES.dateFull:
        setDateError(DATE_FULL);
        focusLater('ck-date');
        return;
      case CHECKOUT_CODES.reservationEnded:
      case CHECKOUT_CODES.reservationConflict:
        await checked;
        focusLater('ck-hold-new');
        return;
      case CHECKOUT_CODES.availabilityUnknown:
        setEarliest(null);
        setMessage(DATE_UNKNOWN);
        return;
      case CHECKOUT_CODES.notServed: {
        const postcode = normalisePostcode(latest.current.postcode);
        if (postcode) setCoverage({ status: 'not-served', postcode });
        focusLater(FIELD_IDS.postcode);
        return;
      }
      case CHECKOUT_CODES.coverageUnavailable:
        setMessage(
          'We couldn’t check your postcode just now. Please try again in a moment.',
        );
        return;
      case CHECKOUT_CODES.invalid:
        setMessage(
          /^AcceptedTermsVersion/i.test(refusal.error)
            ? TERMS_CHANGED
            : `${refusal.error}`,
        );
        return;
      default:
        if (!reconcile(refusal))
          setMessage(
            'We couldn’t start your payment just now. Please try again.',
          );
    }
  };

  const focusLater = (id: string) =>
    requestAnimationFrame(() => {
      const element = document.getElementById(id);
      element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      element?.focus({ preventScroll: true });
    });

  /* ---- Render -------------------------------------------------------------------------- */

  const field = (
    name: DetailField,
    label: string,
    input: Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'id' | 'value' | 'onChange' | 'onBlur'
    >,
    className?: string,
  ) => {
    const error = errorOf(name);
    // A refused postcode takes the error border with no second sentence: the eligibility line says it.
    const refused =
      name === 'postcode' &&
      !error &&
      coverageFor(details, coverage).status === 'not-served';
    const errorId = `${FIELD_IDS[name]}-err`;
    return (
      <div className={styles.field}>
        <label className={styles.label} htmlFor={FIELD_IDS[name]}>
          {label}
        </label>
        <input
          {...input}
          id={FIELD_IDS[name]}
          className={[styles.input, className].filter(Boolean).join(' ')}
          value={details[name]}
          maxLength={FIELD_LIMITS[name]}
          onChange={(event) => change(name, event.target.value)}
          onBlur={() => leave(name)}
          data-bad={Boolean(error) || refused || undefined}
          aria-invalid={Boolean(error) || refused || undefined}
          aria-describedby={error ? errorId : refused ? 'ck-elig' : undefined}
        />
        <p className={styles.status}>
          {error ? <ErrorLine id={errorId}>{error}</ErrorLine> : null}
        </p>
      </div>
    );
  };

  async function benefits(input: {
    createAccount?: boolean;
    requestedPoints?: number;
  }) {
    if (benefitsBusy) return;
    setBenefitsBusy(true);
    if (!live) {
      if (input.createAccount !== undefined)
        setCreateAccount(input.createAccount);
      setBenefitsBusy(false);
      return;
    }
    const stored = await save();
    if (stored !== 'saved') {
      setBenefitsBusy(false);
      return;
    }
    const result = await checkoutRequest<CheckoutCodeAnswer>(
      '/benefits',
      () => ({ method: 'PUT', body: input, version: basis.current }),
    );
    if (result.ok) {
      basis.current = result.payload.cart.version;
      setCreateAccount(result.payload.cart.createAccount ?? false);
    } else if (!reconcile(result.payload as CheckoutRefusal))
      setMessage('We couldn’t save your points choice. Please try again.');
    setBenefitsBusy(false);
  }

  const eligibility = coverageFor(details, coverage);

  return (
    <div ref={pageRef} className={styles.page}>
      <Link href="/box/review" className={styles.back}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        <span>Back to Review</span>
      </Link>

      <div className={styles.shell}>
        <div className={styles.main}>
          <h1 className={styles.h1}>Checkout</h1>
          <p className={styles.status} role="status">
            {(syncNote ?? saveNote) ? (
              <span className={styles.message}>{syncNote ?? saveNote}</span>
            ) : null}
          </p>
          <p className="visuallyHidden" role="status">
            {fieldLive}
          </p>

          <GiftFoodOptions />
          <div className={styles.form}>
            <section className={styles.section} aria-labelledby="ck-contact-h">
              <div className={styles.sectionTop}>
                <span className={styles.num} aria-hidden="true">
                  1
                </span>
                <h2 className={styles.sectionH} id="ck-contact-h">
                  Your details
                </h2>
              </div>
              {field('email', 'Email', {
                type: 'email',
                autoComplete: 'email',
                inputMode: 'email',
                spellCheck: false,
                placeholder: 'Email address',
              })}
              {signedIn ? (
                <p className={styles.status}>✓ You’re signed in.</p>
              ) : (
                <CheckoutLogin
                  beforeLogin={async () => (await save()) === 'saved'}
                />
              )}
              <CheckoutBenefits
                loyalty={quote?.loyalty}
                signedIn={signedIn}
                createAccount={createAccount}
                busy={benefitsBusy}
                onChange={benefits}
              />
            </section>

            <section className={styles.section} aria-labelledby="ck-addr-h">
              <div className={styles.sectionTop}>
                <span className={styles.num} aria-hidden="true">
                  2
                </span>
                <h2 className={styles.sectionH} id="ck-addr-h">
                  Send to
                </h2>
              </div>
              {savedAddresses.length ? (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="ck-saved-address">
                    Saved address
                  </label>
                  <select
                    id="ck-saved-address"
                    className={styles.input}
                    defaultValue=""
                    onChange={(event) => {
                      const selected = savedAddresses.find(
                        (a) => a.id === event.target.value,
                      );
                      if (!selected) return;
                      const next = {
                        ...latest.current,
                        line1: selected.fields.line1,
                        line2: [selected.fields.line2, selected.fields.line3]
                          .filter(Boolean)
                          .join(', '),
                        city: selected.fields.city,
                        postcode: formatPostcodeInput(selected.fields.postcode),
                      };
                      latest.current = next;
                      setDetails(next);
                      setSyncNote(null);
                      scheduleSave();
                      void checkCoverage();
                    }}
                  >
                    <option value="">Choose a saved address</option>
                    {savedAddresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.lines.join(', ')}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className={styles.two}>
                {field(
                  'firstName',
                  cart.gift?.giftIntent ? 'Recipient first name' : 'First name',
                  { type: 'text', autoComplete: 'given-name' },
                )}
                {field(
                  'lastName',
                  cart.gift?.giftIntent ? 'Recipient last name' : 'Last name',
                  { type: 'text', autoComplete: 'family-name' },
                )}
              </div>
              {field('line1', 'Address line 1', {
                type: 'text',
                autoComplete: 'address-line1',
                placeholder: 'House number and street',
              })}
              {field('line2', 'Address line 2 (optional)', {
                type: 'text',
                autoComplete: 'address-line2',
                placeholder: 'Flat, building or company',
              })}
              {field('city', 'Town or city', {
                type: 'text',
                autoComplete: 'address-level2',
              })}
              {field(
                'postcode',
                'Postcode',
                {
                  type: 'text',
                  autoComplete: 'postal-code',
                  autoCapitalize: 'characters',
                  spellCheck: false,
                  placeholder: 'e.g. TN1 1AA',
                },
                styles.postcode,
              )}
              <p className={styles.status} role="status">
                {eligibility.status === 'serves' ? (
                  <span className={`${styles.elig} ${styles.eligOk}`}>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--green-forest)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 12.5 4.5 4.5L19 7" />
                    </svg>
                    We deliver to this address
                  </span>
                ) : eligibility.status === 'not-served' ? (
                  <span
                    id="ck-elig"
                    className={`${styles.elig} ${styles.eligNo}`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--terracotta-ink)"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7.5V13M12 16.4h.01" />
                    </svg>
                    We don’t currently deliver to this postcode.
                  </span>
                ) : eligibility.status === 'checking' ? (
                  <span className={`${styles.elig} ${styles.eligWait}`}>
                    Checking we deliver to this postcode…
                  </span>
                ) : eligibility.status === 'unavailable' ? (
                  <span className={`${styles.elig} ${styles.eligWait}`}>
                    <span>
                      We couldn’t check that postcode just now. Please try again
                      in a moment.
                      <button
                        type="button"
                        className={`${styles.textAction} ${styles.eligRetry}`}
                        onClick={() => void checkCoverage()}
                      >
                        <span>Try again</span>
                      </button>
                    </span>
                  </span>
                ) : null}
              </p>
              {field(
                'phone',
                cart.gift?.giftIntent ? 'Recipient phone' : 'Phone number',
                {
                  type: 'tel',
                  autoComplete: 'tel',
                  inputMode: 'tel',
                  placeholder: 'Mobile or landline',
                },
              )}
              {cart.gift?.giftIntent ? (
                <p className={styles.status}>
                  For the courier, in case they need to contact the recipient
                  about delivery.
                </p>
              ) : null}
            </section>

            <DeliveryDate
              state={{
                date,
                phase,
                remainingMs,
                earliest,
                busy: dateBusy,
                error: dateError,
              }}
              calendarOpen={calendarOpen}
              onCalendar={openCalendar}
              onUse={() => earliest && void choose(earliest)}
              onPick={(chosen) => void choose(chosen)}
              onRetry={() => void retryAvailability()}
              calendar={{
                initialMonth,
                minMonth,
                maxMonth,
                statusOf: (day) => statuses.get(day),
                loaded: (month) => loadedMonths.has(month),
                loadMonth,
              }}
              holdLive={holdLive}
            >
              <div className={styles.field}>
                <label
                  className={styles.label}
                  htmlFor={FIELD_IDS.notes}
                  id="ck-notes-l"
                >
                  Delivery notes (optional)
                </label>
                <div className={styles.counted}>
                  <textarea
                    id={FIELD_IDS.notes}
                    className={`${styles.input} ${styles.textarea}`}
                    rows={3}
                    maxLength={FIELD_LIMITS.notes}
                    placeholder="Add delivery instructions (e.g. safe place, access details)"
                    value={details.notes}
                    onChange={(event) => change('notes', event.target.value)}
                    onBlur={() => leave('notes')}
                  />
                  <span className={styles.count} aria-hidden="true">
                    {details.notes.length}/{FIELD_LIMITS.notes}
                  </span>
                </div>
              </div>
            </DeliveryDate>

            <section className={styles.section} aria-labelledby="ck-code-h">
              <div className={styles.sectionTop}>
                <span className={styles.num} aria-hidden="true">
                  4
                </span>
                <h2 className={styles.sectionH} id="ck-code-h">
                  Gift cards, rewards and vouchers
                </h2>
              </div>
              {appliedCode ? (
                <div className={styles.applied}>
                  <span>
                    <span className={styles.appliedCode}>
                      {appliedCode.code}
                    </span>
                    {appliedCode.reasonCode ? null : ' applied'}
                  </span>
                  <button
                    id="ck-code-remove"
                    type="button"
                    className={styles.textAction}
                    onClick={() => void removeCode()}
                    aria-disabled={codeBusy || undefined}
                    aria-label={`Remove ${appliedCode.code}`}
                  >
                    <span>Remove</span>
                  </button>
                </div>
              ) : null}
              {quote?.giftTender ? (
                <div className={styles.applied}>
                  <span><span className={styles.appliedCode}>{quote.giftTender.maskedCode ?? 'Gift card'}</span>{quote.giftTender.reasonCode ? ' cannot be used' : ' applied'}</span>
                  <button type="button" className={styles.textAction} onClick={() => void removeCode(true)} aria-disabled={codeBusy || undefined} aria-label="Remove gift card"><span>Remove</span></button>
                </div>
              ) : null}
              {(!appliedCode || !quote?.giftTender) ? (
                <>
                  <p className={styles.sectionP}>
                    Have a code? Enter it and we’ll apply it to your order.
                  </p>
                  <div className={styles.code}>
                    <label className="visuallyHidden" htmlFor="ck-code">
                      Code
                    </label>
                    <input
                      id="ck-code"
                      className={styles.input}
                      value={codeInput}
                      maxLength={CODE_MAX_LENGTH}
                      onChange={(event) =>
                        setCodeInput(event.target.value.toUpperCase())
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void applyCode();
                        }
                      }}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      placeholder="Gift card, reward or voucher code"
                      aria-describedby="ck-code-msg"
                    />
                    <button
                      type="button"
                      className={styles.apply}
                      onClick={() => void applyCode()}
                      aria-disabled={codeBusy || undefined}
                    >
                      Apply
                    </button>
                  </div>
                </>
              ) : null}
              <p
                className={styles.codeMsg}
                id="ck-code-msg"
                role="status"
                data-bad={
                  codeMessage?.bad ||
                  Boolean(appliedCode?.reasonCode) ||
                  undefined
                }
              >
                {appliedCode?.reasonCode
                  ? lapsedLine(appliedCode.code, appliedCode.reasonCode)
                  : quote?.giftTender?.reasonCode ? 'Your gift card can’t be used on this order. Remove it to continue.' : (codeMessage?.text ?? '')}
              </p>
            </section>
          </div>

          <p className={styles.terms}>
            By continuing, you agree to our{' '}
            <a
              href={checkoutLegalHref(TERMS_ITEM.href)}
              {...CHECKOUT_LEGAL_LINK}
            >
              Terms of Sale
              <span className="visuallyHidden">{NEW_TAB_NOTE}</span>
            </a>{' '}
            and acknowledge our{' '}
            <a
              href={checkoutLegalHref(PRIVACY_ITEM.href)}
              {...CHECKOUT_LEGAL_LINK}
            >
              Privacy Policy
              <span className="visuallyHidden">{NEW_TAB_NOTE}</span>
            </a>
            .
          </p>
        </div>

        <OrderSummary
          quote={quote}
          deliveryDate={hold === 'held' || !live ? date : null}
          controls={{
            onContinue: () => void onContinue(),
            busy: continuing,
            need,
            message,
            paying: continuing,
          }}
          sheetOpen={sheetOpen}
          onSheet={setSheetOpen}
        />
      </div>
    </div>
  );
}

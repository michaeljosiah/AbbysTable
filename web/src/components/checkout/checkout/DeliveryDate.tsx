'use client';

import { useRef, type ReactNode } from 'react';

import type { DayStatus } from '@/lib/checkout/calendar';
import { HOLD_MINUTES, minutesLeft, type HoldPhase } from '@/lib/checkout/reservation';
import { formatDeliveryDateLong } from '@/lib/format';

import styles from './Checkout.module.css';
import { DeliveryCalendar } from './DeliveryCalendar';
import { DeliveryDatesCopy, InfoNote } from './InfoNote';

function CalendarGlyph({ size = 20, stroke = 'currentColor' }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

function ClockGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export interface DateFieldState {
  /** The chosen date, or null. */
  date: string | null;
  /** The hold's phase, or null where there is no hold to show (none chosen, or demo data). */
  phase: HoldPhase | null;
  remainingMs: number;
  /** The suggestion: the first date with known capacity. Null when Aonik cannot give one. */
  earliest: string | null;
  /** A date choice is on its way to Aonik. */
  busy: boolean;
  /** Why the last choice did not take (SHOPPING-STATE §19), shown under the field. */
  error: string | null;
}

/**
 * Section 3's date field (design: Checkout v2). With no date chosen the
 * earliest date is SUGGESTED — showing it reserves nothing — with USE THIS
 * DATE and CHOOSE ANOTHER DATE. Once one is chosen: the date button ("Change
 * date") and the reservation panel — saved, still reserved (last three
 * minutes), or ended with CHOOSE A NEW DATE. The minutes are display only;
 * the hold is Aonik's.
 */
export function DeliveryDate({
  state,
  calendarOpen,
  onCalendar,
  onUse,
  onPick,
  onRetry,
  calendar,
  holdLive,
  children,
}: {
  state: DateFieldState;
  calendarOpen: boolean;
  onCalendar: (open: boolean) => void;
  onUse: () => void;
  onPick: (date: string) => void;
  /** §22: asks again for the calendar when availability could not be confirmed. */
  onRetry: () => void;
  calendar: {
    initialMonth: string;
    minMonth: string;
    maxMonth: string;
    statusOf: (date: string) => DayStatus | undefined;
    loaded: (month: string) => boolean;
    loadMonth: (month: string) => void;
  };
  /** The reservation's change of phase, for a screen reader (never the minutes ticking). */
  holdLive: string;
  /** The rest of the section: delivery notes. */
  children?: ReactNode;
}) {
  const dateButton = useRef<HTMLButtonElement>(null);
  const another = useRef<HTMLButtonElement>(null);
  const holdNew = useRef<HTMLButtonElement>(null);
  const openerFor = state.date ? (state.phase === 'ended' ? holdNew : dateButton) : another;
  const long = state.date ? formatDeliveryDateLong(state.date) ?? state.date : null;

  return (
    <section className={styles.section} aria-labelledby="ck-date-h">
      <div className={styles.sectionTop}>
        <span className={styles.num} aria-hidden="true">
          3
        </span>
        <h2 className={styles.sectionH} id="ck-date-h">
          Choose a delivery date
        </h2>
      </div>

      <div className={styles.adRow}>
        <InfoNote id="ck-ad-note" title="About delivery dates" closeLabel="Close About delivery dates" trigger={{ kind: 'text', label: 'About delivery dates' }}>
          <DeliveryDatesCopy holdMinutes={HOLD_MINUTES} />
        </InfoNote>
      </div>

      <div className={styles.field}>
        {state.date ? (
          <span className={styles.label} id="ck-date-l">
            Delivery date
          </span>
        ) : null}
        <div className={styles.dateWrap}>
          {state.date ? (
            <button
              ref={dateButton}
              id="ck-date"
              type="button"
              className={styles.dateBtn}
              onClick={() => onCalendar(!calendarOpen)}
              aria-haspopup="dialog"
              aria-expanded={calendarOpen}
              aria-labelledby="ck-date-l ck-date-v ck-date-a"
            >
              <span className={styles.dateValue} id="ck-date-v">
                {long}
              </span>
              <span className={styles.dateChange} id="ck-date-a">
                Change date
              </span>
              <CalendarGlyph size={19} stroke="var(--brass-ink)" />
            </button>
          ) : state.earliest ? (
            <div className={styles.suggest}>
              <p className={styles.suggestEyebrow}>Next available</p>
              <div className={styles.suggestRow}>
                <span className={styles.suggestIcon}>
                  <CalendarGlyph size={26} stroke="var(--green-forest)" />
                </span>
                <span>
                  <span className={styles.suggestDate}>{formatDeliveryDateLong(state.earliest)}</span>
                  <span className={styles.suggestSub}>Earliest available date</span>
                </span>
              </div>
              <button id="ck-use-date" type="button" className={styles.useDate} onClick={onUse} aria-disabled={state.busy || undefined}>
                <span>Use this date</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9.5 6 6 6-6 6" />
                </svg>
              </button>
              <button
                ref={another}
                id="ck-another"
                type="button"
                className={styles.otherDate}
                onClick={() => onCalendar(!calendarOpen)}
                aria-haspopup="dialog"
                aria-expanded={calendarOpen}
              >
                <CalendarGlyph />
                <span>Choose another date</span>
              </button>
            </div>
          ) : (
            // SHOPPING-STATE §22 (not designed as a slot): no truthful date can be given.
            <div className={styles.unknown}>
              <p className={styles.unknownText} role="status">
                We can’t confirm delivery availability right now. Please try again.
              </p>
              <button id="ck-dates-retry" type="button" className={styles.retry} onClick={onRetry}>
                Try again
              </button>
            </div>
          )}
          <DeliveryCalendar
            open={calendarOpen}
            onClose={() => onCalendar(false)}
            opener={openerFor}
            selected={state.date}
            initialMonth={calendar.initialMonth}
            minMonth={calendar.minMonth}
            maxMonth={calendar.maxMonth}
            statusOf={calendar.statusOf}
            loaded={calendar.loaded}
            loadMonth={calendar.loadMonth}
            onPick={onPick}
            holdMinutes={HOLD_MINUTES}
          />
        </div>

        <p className={styles.status} role="status">
          {state.error ? (
            <span className={styles.dateNote}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 4 }}>
                <path d="M12 3.5l8.5 16h-17z" />
                <path d="M12 10v4M12 16.8h.01" />
              </svg>
              <span>{state.error}</span>
            </span>
          ) : null}
        </p>

        {state.date && state.phase ? (
          <div className={styles.hold} data-phase={state.phase}>
            <span className={styles.holdIcon} aria-hidden="true">
              {state.phase === 'saved' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : state.phase === 'warn' ? (
                <ClockGlyph size={24} />
              ) : (
                '!'
              )}
            </span>
            <div className={styles.holdText}>
              {state.phase === 'saved' ? (
                <>
                  <p className={styles.holdH}>{long} is saved for you.</p>
                  <p className={styles.holdP}>You can change your delivery date at any time.</p>
                  <div className={styles.holdT}>
                    <span className={styles.holdClock}>
                      <ClockGlyph />
                    </span>
                    <span>Reserved for {minutesLeft(state.remainingMs)} min</span>
                    <HoldNote />
                  </div>
                </>
              ) : state.phase === 'warn' ? (
                <>
                  <p className={styles.holdH}>Still reserved for you · {minutesLeft(state.remainingMs)} min</p>
                  <p className={styles.holdP}>You can change your delivery date at any time.</p>
                  <div className={styles.holdT}>
                    <span>We’ll keep your box and checkout details if this reservation ends.</span>
                    <HoldNote />
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.holdH}>Your delivery-date reservation has ended.</p>
                  <p className={styles.holdP}>
                    Your box and checkout details are still here. Please choose another available delivery date.
                  </p>
                </>
              )}
            </div>
            {state.phase === 'ended' ? (
              <button
                ref={holdNew}
                id="ck-hold-new"
                type="button"
                className={styles.holdCta}
                onClick={() => onCalendar(true)}
                aria-haspopup="dialog"
                aria-expanded={calendarOpen}
              >
                Choose a new date
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="visuallyHidden" role="status">
          {holdLive}
        </p>
      </div>
      {children}
    </section>
  );
}

function HoldNote() {
  return (
    <InfoNote id="ck-hold-note" title="About your reservation" closeLabel="Close About your reservation" trigger={{ kind: 'icon', label: 'About your reservation' }}>
      <p className={styles.noteP}>
        We’ll save this delivery date for you for {HOLD_MINUTES} minutes while you finish checkout. You can change your
        date at any time.
      </p>
      <p className={styles.noteP}>
        If the reservation ends, your box and checkout details will stay exactly as they are. Simply choose a date again,
        you can reselect the same one if it’s still available.
      </p>
    </InfoNote>
  );
}

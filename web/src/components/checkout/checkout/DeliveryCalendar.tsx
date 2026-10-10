'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';

import {
  addDays,
  addMonths,
  dayLabel,
  edgeAvailable,
  monthOf,
  monthTitle,
  monthWeeks,
  stepAvailable,
  type DayStatus,
} from '@/lib/checkout/calendar';
import { useMediaQuery } from '@/lib/dom/hooks';

import styles from './Checkout.module.css';
import { CloseGlyph, DeliveryDatesCopy } from './InfoNote';
import { useOverlay } from './useOverlay';

/** Monday first, as the grid is laid out; each column's header names its day in full. */
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/**
 * The delivery calendar (design: Checkout v2, `gc-cal`): our own, never the
 * native date input. A bottom sheet headed "Choose a delivery date" on a
 * phone; from 640 a popover with the "About delivery dates" note beside it
 * (from 768) or beneath it.
 *
 * Only an available day is a choice. Fully booked (struck, terracotta) and no
 * delivery (grey) are shown and disabled, each named in its label — never
 * colour alone — and a day whose capacity is unknown is no delivery. The grid
 * has one tab stop (roving tabindex); the arrows move to the next or previous
 * AVAILABLE day, crossing months; Home and End go to the month's first and
 * last. Escape closes and focus goes back to the control that opened it.
 */
export function DeliveryCalendar({
  open,
  onClose,
  opener,
  selected,
  initialMonth,
  minMonth,
  maxMonth,
  statusOf,
  loaded,
  loadMonth,
  onPick,
  holdMinutes,
}: {
  open: boolean;
  onClose: () => void;
  opener: RefObject<HTMLElement | null>;
  selected: string | null;
  initialMonth: string;
  minMonth: string;
  maxMonth: string;
  statusOf: (date: string) => DayStatus | undefined;
  /** Whether a month's availability has arrived. */
  loaded: (month: string) => boolean;
  /** Asks for a month's availability (and is a no-op when it is here or on its way). */
  loadMonth: (month: string) => void;
  onPick: (date: string) => void;
  holdMinutes: number;
}) {
  const wide = useMediaQuery('(min-width: 640px)');
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(initialMonth);
  const [active, setActive] = useState<string | null>(null);
  /** Set by a keyboard move: focus follows it once its month is drawn. */
  const [follow, setFollow] = useState(false);

  useOverlay({ open, modal: !wide, onClose, panel, scrim, opener });

  const isAvailable = (date: string) => statusOf(date) === 'available';
  const range = useMemo(
    () => ({ min: `${minMonth}-01`, max: addDays(`${addMonths(maxMonth, 1)}-01`, -1) }),
    [minMonth, maxMonth],
  );

  // Each month shown, and the next one, so the arrows can cross into it.
  useEffect(() => {
    if (!open) return;
    loadMonth(month);
    if (month < maxMonth) loadMonth(addMonths(month, 1));
  }, [open, month, maxMonth, loadMonth]);

  // Opening starts on the chosen date's month, or the suggestion's.
  useEffect(() => {
    if (open) {
      setMonth(initialMonth);
      setActive(null);
      setFollow(false);
    }
  }, [open, initialMonth]);

  // Reading starts at the sheet's heading on a phone, in the grid from 640.
  useEffect(() => {
    if (!open) return;
    if (!wide) {
      heading.current?.focus();
      return;
    }
    const frame = requestAnimationFrame(() => {
      grid.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
    });
    // Only on opening: a later month change keeps focus where the customer is.
    return () => cancelAnimationFrame(frame);
  }, [open, wide]);

  // The one tab stop: the active day, else the chosen one, else the month's first available.
  const tabStop =
    (active && monthOf(active) === month && isAvailable(active) ? active : null) ??
    (selected && monthOf(selected) === month && isAvailable(selected) ? selected : null) ??
    edgeAvailable(month, 'start', isAvailable);

  useEffect(() => {
    if (!follow || !active || monthOf(active) !== month) return;
    grid.current?.querySelector<HTMLButtonElement>(`button[data-date="${active}"]`)?.focus();
    setFollow(false);
  }, [follow, active, month]);

  const moveTo = (date: string | null) => {
    if (!date) return;
    setActive(date);
    setFollow(true);
    if (monthOf(date) !== month) setMonth(monthOf(date));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = (event.target as HTMLElement).dataset.date;
    if (!from) return;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveTo(stepAvailable(from, 1, isAvailable, range));
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveTo(stepAvailable(from, -1, isAvailable, range));
        break;
      case 'Home':
        event.preventDefault();
        moveTo(edgeAvailable(month, 'start', isAvailable));
        break;
      case 'End':
        event.preventDefault();
        moveTo(edgeAvailable(month, 'end', isAvailable));
        break;
    }
  };

  if (!open) return null;

  const title = monthTitle(month);
  const weeks = monthWeeks(month, statusOf);

  return (
    <>
      {!wide ? <div ref={scrim} className={styles.scrim} onClick={onClose} aria-hidden="true" /> : null}
      <div
        ref={panel}
        id="ck-calendar"
        className={styles.calendar}
        role="dialog"
        aria-modal={!wide ? true : undefined}
        aria-labelledby={wide ? 'ck-cal-month' : 'ck-cal-sheet-h'}
      >
        <div className={styles.calSheetHead}>
          <span className={styles.grip} aria-hidden="true" />
          <h3 ref={heading} id="ck-cal-sheet-h" className={styles.calSheetH} tabIndex={-1}>
            Choose a delivery date
          </h3>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close calendar">
            <CloseGlyph />
          </button>
        </div>

        <div className={styles.cal}>
          <div className={styles.calHead}>
            <button
              type="button"
              className={styles.calNav}
              onClick={() => setMonth(addMonths(month, -1))}
              disabled={month <= minMonth}
              aria-label={`Previous month, ${monthTitle(addMonths(month, -1))}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.5 5.5 8 12l6.5 6.5" />
              </svg>
            </button>
            <span id="ck-cal-month" className={styles.calMonth} aria-live="polite">
              {title}
            </span>
            <button
              type="button"
              className={styles.calNav}
              onClick={() => setMonth(addMonths(month, 1))}
              disabled={month >= maxMonth}
              aria-label={`Next month, ${monthTitle(addMonths(month, 1))}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9.5 5.5 16 12l-6.5 6.5" />
              </svg>
            </button>
          </div>

          <div className={styles.calGrid} onKeyDown={onKeyDown}>
            {loaded(month) ? (
              <div ref={grid} role="grid" aria-label={title}>
                <div className={styles.weekdays} role="row">
                  {WEEKDAYS.map((weekday) => (
                    <span key={weekday} role="columnheader">
                      <span aria-hidden="true">{weekday[0]}</span>
                      <span className="visuallyHidden">{weekday}</span>
                    </span>
                  ))}
                </div>
                {weeks.map((week, index) => (
                  <div key={index} className={styles.week} role="row">
                    {week.map((cell, column) =>
                      cell ? (
                        <span key={cell.date} role="gridcell" aria-selected={cell.date === selected}>
                          <button
                            type="button"
                            className={styles.day}
                            data-date={cell.date}
                            data-status={cell.status}
                            data-selected={cell.date === selected || undefined}
                            aria-label={dayLabel(cell.date, cell.status, cell.date === selected)}
                            disabled={cell.status !== 'available'}
                            tabIndex={cell.date === tabStop ? 0 : -1}
                            onClick={() => onPick(cell.date)}
                          >
                            {cell.day}
                          </button>
                        </span>
                      ) : (
                        <span key={`blank-${column}`} role="gridcell" aria-hidden="true" />
                      ),
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className={styles.weekdays} aria-hidden="true">
                  {WEEKDAYS.map((weekday) => (
                    <span key={weekday}>{weekday[0]}</span>
                  ))}
                </div>
                <p className={styles.calLoading} role="status">
                  Loading dates…
                </p>
              </>
            )}
          </div>

          {/* Three states, three treatments, each also in the day's name. */}
          <div className={styles.key} aria-hidden="true">
            <span>
              <i className={styles.keyOpen} />
              Available
            </span>
            <span>
              <i className={styles.keyFull} />
              Fully booked
            </span>
            <span>
              <i className={styles.keyNone} />
              No delivery
            </span>
          </div>
        </div>

        <div className={styles.calSide}>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close calendar">
            <CloseGlyph />
          </button>
          <h3 className={styles.noteH}>About delivery dates</h3>
          <DeliveryDatesCopy holdMinutes={holdMinutes} />
        </div>
      </div>
    </>
  );
}

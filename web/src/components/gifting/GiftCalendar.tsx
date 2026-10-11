'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  isGiftDate,
  type GiftOptions,
  type GiftRoute,
} from '@/lib/gifting/model';
import { useOverlay } from '@/components/checkout/checkout/useOverlay';
import styles from './GiftCheckout.module.css';
const c = (...names: string[]) =>
  names
    .map((name) => styles[name])
    .filter(Boolean)
    .join(' ');
export function GiftCalendar({
  value,
  today,
  route,
  options,
  onPick,
  onClose,
  opener,
}: {
  value: string;
  today: string;
  route: GiftRoute;
  options: GiftOptions;
  onPick: (date: string) => void;
  onClose: () => void;
  opener: React.RefObject<HTMLElement | null>;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const [modal, setModal] = useState(false);
  const [month, setMonth] = useState(() => (value || today).slice(0, 7));
  const [focusDate, setFocusDate] = useState(value || today);
  useEffect(() => {
    const media = window.matchMedia('(max-width:639px)');
    const update = () => setModal(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useOverlay({ open: true, modal, panel, scrim, opener, onClose });
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
  }, [month, modal]);
  const monthDate = new Date(`${month}-01T12:00:00Z`);
  const start = new Date(monthDate);
  start.setUTCDate(1 - ((start.getUTCDay() + 6) % 7));
  const dates = Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    return day.toISOString().slice(0, 10);
  });
  const navigate = (delta: number) => {
    const next = new Date(monthDate);
    next.setUTCMonth(next.getUTCMonth() + delta);
    setMonth(next.toISOString().slice(0, 7));
    setFocusDate(next.toISOString().slice(0, 10));
  };
  const keys = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const deltas: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const next = new Date(`${date}T12:00:00Z`);
    if (event.key in deltas)
      next.setUTCDate(next.getUTCDate() + deltas[event.key]);
    else if (event.key === 'Home')
      next.setUTCDate(next.getUTCDate() - ((next.getUTCDay() + 6) % 7));
    else if (event.key === 'End')
      next.setUTCDate(next.getUTCDate() + 6 - ((next.getUTCDay() + 6) % 7));
    else if (event.key === 'PageUp' || event.key === 'PageDown')
      next.setUTCMonth(
        next.getUTCMonth() + (event.key === 'PageDown' ? 1 : -1),
      );
    else return;
    event.preventDefault();
    const target = next.toISOString().slice(0, 10);
    setFocusDate(target);
    setMonth(target.slice(0, 7));
    requestAnimationFrame(() =>
      panel.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)
        ?.focus(),
    );
  };
  const focused = dates.includes(focusDate)
    ? focusDate
    : dates.find((date) => date.startsWith(month))!;
  return (
    <div
      className={c('calendarScrim', modal ? 'calendarModal' : '')}
      ref={scrim}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={c('gc-cal')}
        ref={panel}
        role="dialog"
        aria-modal={modal || undefined}
        aria-label={
          route === 'post' ? 'Choose posting date' : 'Choose send date'
        }
      >
        <div className={c('gc-cal-head')}>
          <button
            className={c('gc-nav')}
            onClick={() => navigate(-1)}
            disabled={month <= today.slice(0, 7)}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className={c('gc-cal-m')} aria-live="polite">
            {monthDate.toLocaleDateString('en-GB', {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </span>
          <button
            className={c('gc-nav')}
            onClick={() => navigate(1)}
            disabled={
              month >=
              new Date(
                new Date(`${today}T12:00:00Z`).getTime() + 365 * 86400000,
              )
                .toISOString()
                .slice(0, 7)
            }
            aria-label="Next month"
          >
            ›
          </button>
          <button
            className={c('gc-nav')}
            onClick={onClose}
            aria-label="Close calendar"
          >
            ×
          </button>
        </div>
        <div className={c('gc-cal-grid')} role="grid" aria-label="Dates">
          <div className={c('gc-wd')} role="row">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day} role="columnheader">
                {day}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, week) => (
            <div className={c('gc-week')} role="row" key={week}>
              {dates.slice(week * 7, week * 7 + 7).map((date) => {
                const available = isGiftDate(date, route, options, today);
                return (
                  <div
                    role="gridcell"
                    key={date}
                    aria-selected={date === value}
                  >
                    <button
                      data-date={date}
                      className={c(
                        'gc-day',
                        !date.startsWith(month) ? 'is-out' : '',
                        !available ? 'is-off' : '',
                        date === today ? 'is-today' : '',
                        date === value ? 'is-sel' : '',
                      )}
                      tabIndex={date === focused ? 0 : -1}
                      aria-disabled={!available}
                      aria-label={new Date(
                        `${date}T12:00:00Z`,
                      ).toLocaleDateString('en-GB', {
                        dateStyle: 'full',
                        timeZone: 'UTC',
                      })}
                      onKeyDown={(event) => keys(event, date)}
                      onClick={() => {
                        if (available) onPick(date);
                      }}
                    >
                      {Number(date.slice(-2))}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

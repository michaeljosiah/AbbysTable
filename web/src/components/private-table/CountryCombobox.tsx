'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';

import { matchCountries, resolveCountry } from '@/lib/private-table/country';
import { COUNTRY_NO_MATCHES } from '@/lib/private-table/waitlist';

import styles from './WaitlistForm.module.css';

/** Room the open list needs below the field before it opens upwards instead. */
const LIST_ROOM_PX = 252;

interface CountryComboboxProps {
  id: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  maxLength: number;
  invalid: boolean;
  /** The field's error, when it has one. */
  errorId?: string;
  /** While a submit is in flight the field holds still. */
  disabled?: boolean;
}

/**
 * "Country or region" — an editable combobox with a list popup, the ARIA 1.2
 * pattern (WAI-ARIA APG, "List autocomplete"), from the design's `.pt-ac`.
 *
 * - DOM focus stays in the text field throughout; the active suggestion is
 *   `aria-activedescendant`, and carries `aria-selected` as the pattern asks.
 *   The country already chosen is ticked and on blush — a visual mark only.
 * - Typing filters the fixed list (`matchCountries`) and makes the best match
 *   active. ↓/↑ open the list and move through it (wrapping), Home/End jump
 *   to its ends while it is open, Enter picks the active suggestion (and only
 *   then — otherwise it submits the form), Escape closes the list and nothing
 *   else, Tab closes it and moves on.
 * - The list is always mounted, closed with `display: none`, so
 *   `aria-controls` always resolves and a closed list is out of the tab order.
 *   It opens upwards when there is not room below.
 * - Suggestions are not focusable (`li role="option"`), and a press on one
 *   keeps focus in the field.
 *
 * What is SENT is the text in the field: the server resolves it against the
 * same list (`resolveCountry`), so free text never gets past it — and with no
 * JavaScript the field still works, as a plain text input.
 */
export function CountryCombobox({
  id,
  name,
  value,
  onValueChange,
  inputRef,
  maxLength,
  invalid,
  errorId,
  disabled,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const [touched, setTouched] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const listId = `${id}-list`;
  const noteId = `${id}-note`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const hits = useMemo(() => matchCountries(value), [value]);
  const chosen = useMemo(() => resolveCountry(value), [value]);
  const expanded = open && hits.length > 0;
  const noMatches = touched && value.trim() !== '' && hits.length === 0;

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  /** Up when the space below the field is short and there is more above. */
  const placement = (): 'down' | 'up' => {
    const field = inputRef.current;
    if (!field) return 'down';
    const box = field.getBoundingClientRect();
    const below = window.innerHeight - box.bottom;
    return below < LIST_ROOM_PX && box.top > below ? 'up' : 'down';
  };

  const openList = (activeIndex: number) => {
    setDirection(placement());
    setOpen(true);
    setActive(activeIndex);
  };

  const pick = (index: number) => {
    const country = hits[index];
    if (!country) return;
    onValueChange(country.name);
    close();
    inputRef.current?.focus();
  };

  // A press anywhere outside the field and its list closes the list.
  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapRef.current && event.target instanceof Node && wrapRef.current.contains(event.target)) return;
      setOpen(false);
      setActive(-1);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [expanded]);

  // The active suggestion stays in view inside the list's own scroll.
  useEffect(() => {
    if (!expanded || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
    // `optionId` is derived from `id`, which never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, active]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const next = event.target.value;
    onValueChange(next);
    setTouched(true);
    const matches = matchCountries(next);
    if (matches.length > 0) openList(0);
    else close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!expanded) {
        if (hits.length > 0) openList(event.key === 'ArrowDown' ? 0 : hits.length - 1);
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (Math.max(current, step === 1 ? -1 : 0) + step + hits.length) % hits.length);
      return;
    }
    if (!expanded) return;
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : hits.length - 1);
      return;
    }
    if (event.key === 'Enter') {
      if (active >= 0) {
        event.preventDefault();
        pick(active);
      }
      return;
    }
    if (event.key === 'Escape') {
      // The popup's, never the page's: nothing else hears this Escape.
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === 'Tab') close();
  };

  const describedBy = [errorId, noMatches ? noteId : null].filter(Boolean).join(' ') || undefined;

  return (
    <>
      <span ref={wrapRef} className={styles.combo}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          placeholder="Start typing to search"
          maxLength={maxLength}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className={styles.field}
        />
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Countries"
          className={styles.list}
          data-open={expanded || undefined}
          data-direction={direction}
        >
          {expanded
            ? hits.map((country, index) => (
                <li
                  key={country.code}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  className={styles.option}
                  data-active={index === active || undefined}
                  data-chosen={chosen?.code === country.code || undefined}
                  // Keeps focus in the field: the press is the pick, not a move.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(index)}
                  onMouseEnter={() => setActive(index)}
                >
                  <span>{country.name}</span>
                  {chosen?.code === country.code ? (
                    <svg
                      className={styles.optionTick}
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 12.5 4.5 4.5L19 7" />
                    </svg>
                  ) : null}
                </li>
              ))
            : null}
        </ul>
      </span>
      {/* Announced as it appears; not an error — the design's own note. */}
      <p id={noteId} className={styles.note} role="status" aria-live="polite">
        {noMatches ? COUNTRY_NO_MATCHES : null}
      </p>
    </>
  );
}

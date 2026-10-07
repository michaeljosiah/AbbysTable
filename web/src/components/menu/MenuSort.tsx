'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import type { MenuSortKey, MenuSortOption } from '@/lib/menu/sort';

import styles from './MenuToolbar.module.css';

interface MenuSortProps {
  value: MenuSortKey;
  options: MenuSortOption[];
  onChange: (next: MenuSortKey) => void;
}

/** Room the list needs below the trigger before it flips above: 48px rows plus the gap. */
const ROW_HEIGHT = 48;

/**
 * The menu's Sort — a VIEW control, styled as a menu: cream panel, brass
 * chevron and tick (the one place a chevron is brass — design/CLAUDE.md
 * "Close controls, dropdowns and icon colour"). A listbox with the site's
 * dropdown keyboard contract: arrows, Home and End move; Enter or Space
 * commits; Esc closes the list only, back to the trigger; Tab closes it and
 * moves on; a press outside or focus leaving dismisses it. It opens above the
 * trigger when the space below cannot hold it.
 */
export function MenuSort({ value, options, onChange }: MenuSortProps) {
  const id = useId();
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.key === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const current = options[selectedIndex];

  const openList = useCallback(
    (start: number = selectedIndex) => {
      const button = buttonRef.current;
      if (button) {
        const box = button.getBoundingClientRect();
        const below = window.innerHeight - box.bottom;
        const needed = options.length * ROW_HEIGHT + 16;
        setAbove(below < needed && box.top > below);
      }
      setActiveIndex(start);
      setOpen(true);
    },
    [options.length, selectedIndex],
  );

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      close(true);
      if (option && option.key !== value) onChange(option.key);
    },
    [close, onChange, options, value],
  );

  // The list takes focus once it is shown, so the keys below reach it.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // A press anywhere outside dismisses it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openList(selectedIndex);
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => Math.min(last, index + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(last);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        commit(activeIndex);
        break;
      case 'Escape':
        // The list only: nothing else on the page hears this Escape.
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case 'Tab':
        // Closes and lets the browser move on from the trigger.
        setOpen(false);
        break;
    }
  };

  return (
    <div
      ref={rootRef}
      className={styles.sort}
      onBlur={(event) => {
        if (open && !rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.btn} ${styles.btnOutline}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onButtonKeyDown}
      >
        <span className="visuallyHidden">Sort: </span>
        <span>{current?.label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--brass-ink)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={styles.chevron}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Sort the menu"
        tabIndex={-1}
        className={styles.sortList}
        data-open={open || undefined}
        data-above={above || undefined}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        onKeyDown={onListKeyDown}
      >
        {options.map((option, index) => (
          <li
            key={option.key}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={option.key === value}
            data-active={(open && index === activeIndex) || undefined}
            className={styles.sortOption}
            onMouseMove={() => setActiveIndex(index)}
            onClick={() => commit(index)}
          >
            <span>{option.label}</span>
            {option.key === value ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--brass-ink)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

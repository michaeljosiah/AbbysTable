'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { DELIVERY_NOTE, NEXT_DELIVERIES_PREFIX } from '@/lib/content/menu';

import styles from './MenuDeliveryStrip.module.css';

const NOTE_ID = 'menu-delivery-note';

/**
 * "Next deliveries from {date}" with the cooking-run note (Menu Landing v3,
 * `.mn-deliv`). Page-level context, so it sits under the lede and not in the
 * filter card: it is not a filter and does not change the results.
 *
 * The date is a VALUE (frontend-backend-contract §4), formatted on the server
 * and handed in; with no date the page renders no strip at all.
 *
 * The note opens on hover AND on click (design/CLAUDE.md, "Delivery note
 * pattern"): hover-opened, it closes when the pointer leaves the whole strip
 * (not the "i", or it would shut before you could reach it); click-opened, it
 * is pinned, and only a second click, the ×, Esc or a press outside dismisses
 * it. Keyboard focus mirrors the pointer pair, so it never depends on hover.
 */
export function MenuDeliveryStrip({ date }: { date: string }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  /** Focus handed back to the "i" by the × — that is not a request to open. */
  const quietFocus = useRef(false);

  const show = () => {
    if (quietFocus.current) {
      quietFocus.current = false;
      return;
    }
    if (!open) {
      setOpen(true);
      setPinned(false);
    }
  };
  const leave = () => {
    if (open && !pinned) setOpen(false);
  };
  const dismiss = () => {
    setOpen(false);
    setPinned(false);
  };

  /** Hands focus back to the "i" without that reading as a request to open. */
  const returnFocus = useCallback(() => {
    quietFocus.current = true;
    infoRef.current?.focus();
    // Already focused (no focus event): never swallow a later one.
    requestAnimationFrame(() => {
      quietFocus.current = false;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setPinned(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!stripRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Focus on the note's × would vanish with the note: keep it on the "i".
      if (document.getElementById(NOTE_ID)?.contains(document.activeElement)) returnFocus();
      close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, returnFocus]);

  return (
    <div className={styles.wrap}>
      <div
        ref={stripRef}
        className={styles.strip}
        onMouseLeave={leave}
        onBlur={(event) => {
          // Focus moving within the strip (the "i" to the note's ×) keeps an
          // unpinned note; focus leaving the strip altogether closes it.
          if (stripRef.current?.contains(event.relatedTarget as Node | null)) return;
          leave();
        }}
      >
        {/* The homepage hero's parcel glyph: no van exists anywhere on the site,
            and the design system says to flag a new icon, not draw one quietly. */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--green-forest)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={styles.glyph}
        >
          <path d="M20.5 7.3 12 2.6 3.5 7.3v9.4l8.5 4.7 8.5-4.7z" />
          <path d="M3.5 7.3 12 12l8.5-4.7" />
          <path d="M12 12v9.4" />
        </svg>
        <span className={styles.text}>
          {NEXT_DELIVERIES_PREFIX} <span className={styles.date}>{date}</span>
        </span>
        <button
          ref={infoRef}
          type="button"
          className={styles.info}
          aria-label="About delivery dates"
          aria-controls={NOTE_ID}
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation();
            if (open && pinned) {
              dismiss();
            } else {
              setOpen(true);
              setPinned(true);
            }
          }}
          onMouseEnter={show}
          onFocus={show}
        >
          <span aria-hidden="true">i</span>
        </button>

        <div id={NOTE_ID} className={styles.note} data-open={open || undefined}>
          <span className={styles.noteTop}>
            <span className={styles.noteTitle}>{DELIVERY_NOTE.title}</span>
            <button
              type="button"
              className={styles.noteClose}
              onClick={(event) => {
                event.stopPropagation();
                dismiss();
                returnFocus();
              }}
              aria-label="Close the delivery dates note"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </span>
          <span className={styles.body}>
            {DELIVERY_NOTE.body} <strong>{DELIVERY_NOTE.caveat}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { SIGNATURE_EXPLAINER } from '@/lib/content/marketing';
import { DESKTOP_QUERY } from '@/lib/site-header/visibility';

import styles from './DishCard.module.css';

/**
 * The dish card's Signature pill and its "i" (Homepage v2 and Menu Landing v3,
 * approved). The pill sits in the card's tag stack, OUTSIDE the card link: the
 * note needs a real <button>, and a button inside a link is invalid — so the
 * link and the "i" are two separate tab stops (marketing-pages FR-11).
 *
 * The note is state-driven, never CSS :hover — a CSS-only tooltip cannot be
 * closed by Esc or by a second tap. It opens on hover (where the device can
 * hover), on keyboard focus and on a tap; a tap on the open "i", Esc, a tap
 * outside the pill or focus leaving closes it. Not a dialog: no focus trap.
 *
 * Placement is the prototype's: on a phone the note opens BELOW the tag stack
 * (it is positioned against the stack, so it clears every pill whatever their
 * number), clamped inside the card, with its tail measured to point at the
 * "i"; and dropped below the upgrade pill if it would cover the price. From
 * 1024 it sits to the right of the pill, which overlaps nothing.
 */
export function SignatureInfo() {
  const id = useId();
  const noteId = `${id}-signature-note`;
  const pillRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const [open, setOpenState] = useState(false);
  /** The state as of the latest event — a hover and a press can land in one frame. */
  const openRef = useRef(false);
  const setOpen = useCallback((next: boolean) => {
    openRef.current = next;
    setOpenState(next);
  }, []);
  /** Was the note open when this tap began? Read on pointerdown, because on
      touch focus fires first and would open it a moment before the click. */
  const wasOpen = useRef(false);
  const viaPointer = useRef(false);

  const measure = useCallback(() => {
    const button = buttonRef.current;
    const note = noteRef.current;
    const pill = pillRef.current;
    const stack = pill?.parentElement;
    const cell = stack?.parentElement;
    if (!button || !note || !stack || !cell) return;

    if (window.matchMedia(DESKTOP_QUERY).matches) {
      note.style.left = '';
      note.style.top = '';
      note.style.removeProperty('--tail-x');
      return;
    }

    const o = stack.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    const c = cell.getBoundingClientRect();
    const w = note.offsetWidth;
    if (!b.width || !w) return;

    const minLeft = c.left - o.left + 4;
    const maxLeft = c.right - o.left - w - 4;
    const left = Math.min(Math.max(b.left - o.left - 14, minLeft), Math.max(minLeft, maxLeft));
    // 6px, so the 9px caret just reaches the "i".
    let top = b.bottom - o.top + 6;

    // Covering the photograph is fine; covering the price is not.
    const upgrade = stack.lastElementChild;
    if (upgrade && upgrade !== pill) {
      const u = upgrade.getBoundingClientRect();
      const l = o.left + left;
      if (l < u.right && l + w > u.left && top < u.bottom - o.top) top = u.bottom - o.top + 6;
    }

    note.style.left = `${left}px`;
    note.style.top = `${top}px`;
    const placed = note.getBoundingClientRect();
    const tail = Math.min(Math.max(10, b.left + b.width / 2 - placed.left - 9), w - 28);
    note.style.setProperty('--tail-x', `${tail}px`);
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    const frame = requestAnimationFrame(measure);

    const onPointerDown = (event: PointerEvent) => {
      if (!pillRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure, setOpen]);

  const canHover = () => window.matchMedia('(hover: hover)').matches;

  return (
    <span ref={pillRef} className={`${styles.pill} ${styles.signaturePill}`}>
      <span className={styles.lozenge} aria-hidden="true">
        ◆
      </span>
      Signature
      <button
        ref={buttonRef}
        type="button"
        className={styles.info}
        aria-label="What does Signature mean?"
        aria-describedby={noteId}
        onPointerDown={() => {
          wasOpen.current = openRef.current;
          viaPointer.current = true;
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          // A keyboard Enter/Space has no pointerdown: it toggles from now.
          const next = viaPointer.current ? !wasOpen.current : !openRef.current;
          viaPointer.current = false;
          setOpen(next);
        }}
        onMouseEnter={() => {
          if (canHover()) setOpen(true);
        }}
        onMouseLeave={() => {
          if (canHover()) setOpen(false);
        }}
        onFocus={() => {
          if (!viaPointer.current) setOpen(true);
        }}
        onBlur={() => {
          viaPointer.current = false;
          setOpen(false);
        }}
      >
        i
      </button>
      <span
        ref={noteRef}
        id={noteId}
        role="tooltip"
        className={styles.signatureNote}
        data-open={open || undefined}
      >
        {SIGNATURE_EXPLAINER}
      </span>
    </span>
  );
}

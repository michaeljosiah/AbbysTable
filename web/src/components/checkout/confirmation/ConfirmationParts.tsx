'use client';

import { useEffect, useRef, useState } from 'react';

import { CONFIRMATION_COPY } from '@/lib/content/orderConfirmation';

import styles from './Confirmation.module.css';

/** The h1 takes focus on arrival (no ring): reading starts at "Order confirmed". */
export function FocusOnArrival({ targetId }: { targetId: string }) {
  useEffect(() => {
    document.getElementById(targetId)?.focus({ preventScroll: true });
  }, [targetId]);
  return null;
}

/** "Copy order number", with a polite "Copied" / "Copy failed" that clears after 2.5s. */
export function CopyOrderNumber({ value }: { value: string }) {
  const [said, setSaid] = useState('');
  useEffect(() => {
    if (!said) return;
    const timer = setTimeout(() => setSaid(''), 2500);
    return () => clearTimeout(timer);
  }, [said]);

  return (
    <>
      <button
        type="button"
        className={styles.copy}
        aria-label="Copy order number"
        onClick={() => {
          if (!navigator.clipboard) {
            setSaid('Copy failed');
            return;
          }
          navigator.clipboard.writeText(value).then(
            () => setSaid('Copied'),
            () => setSaid('Copy failed'),
          );
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="8.5" y="8.5" width="11" height="12" rx="2" />
          <path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" />
        </svg>
      </button>
      <span className={styles.copied} role="status" aria-live="polite">
        {said}
      </span>
    </>
  );
}

/**
 * The points ⓘ (Order Confirmation v2, using checkout's disclosure): hover
 * opens it from 640 with a pointer and leaving closes it; a click pins it;
 * ×, Escape or a press outside closes it and focus returns to the ⓘ.
 */
export function PointsRow({ points, member, line }: { points: number; member: boolean; line: string }) {
  const [state, setState] = useState<'closed' | 'peek' | 'pinned'>('closed');
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const open = state !== 'closed';

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setState('closed');
        button.current?.focus();
      }
    };
    const onPress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || button.current?.contains(target)) return;
      setState('closed');
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPress);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPress);
    };
  }, [open]);

  const canHover = () => window.matchMedia('(min-width: 640px) and (hover: hover)').matches;

  return (
    <>
      <span className={styles.accIcon}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--brass)" aria-hidden="true">
          <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" />
        </svg>
      </span>
      <span>
        <span className={styles.accH}>
          <span>{points} points earned</span>
      <button
        ref={button}
        type="button"
        className={styles.info}
        aria-expanded={open}
        aria-controls="oc-pts-note"
        aria-label="About Abby’s Table points"
        onClick={() => setState((current) => (current === 'pinned' ? 'closed' : 'pinned'))}
        onPointerEnter={() => canHover() && setState((current) => (current === 'closed' ? 'peek' : current))}
        onPointerLeave={() => setState((current) => (current === 'peek' ? 'closed' : current))}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5.5" />
          <path d="M12 7.6h.01" />
        </svg>
      </button>
        </span>
        <span className={styles.accS}>{line}</span>
      </span>
      <div ref={panel} id="oc-pts-note" className={styles.pop} role="region" aria-labelledby="oc-pts-ph" hidden={!open}>
        <span className={styles.popCaret} aria-hidden="true" />
        <button
          type="button"
          className={styles.popX}
          aria-label="Close About Abby’s Table points"
          onClick={() => {
            setState('closed');
            button.current?.focus();
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h3 className={styles.popH} id="oc-pts-ph" tabIndex={-1}>
          {CONFIRMATION_COPY.pointsNoteTitle}
        </h3>
        <p className={styles.popP}>You’ve earned {points} points with this order to use towards future purchases.</p>
        <p className={styles.popP}>{member ? CONFIRMATION_COPY.pointsNoteMember : CONFIRMATION_COPY.pointsNoteSetup}</p>
      </div>
    </>
  );
}

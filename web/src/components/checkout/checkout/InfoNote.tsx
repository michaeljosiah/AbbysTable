'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useMediaQuery } from '@/lib/dom/hooks';

import styles from './Checkout.module.css';
import { useOverlay } from './useOverlay';

export function InfoGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.6h.01" />
    </svg>
  );
}

export function CloseGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * A click-only ⓘ note (design: checkout's main-column notes). A click opens
 * it; a second click, ×, Escape or a press outside closes it, and focus goes
 * back to the trigger. A bottom sheet on a phone — a true modal — and an
 * anchored popover from 640. Always mounted, hidden when shut, so the
 * trigger's `aria-controls` always resolves.
 */
export function InfoNote({
  id,
  title,
  closeLabel,
  trigger,
  children,
}: {
  id: string;
  title: string;
  closeLabel: string;
  /** An icon button (`label` is its name), or a text button showing `label` itself. */
  trigger: { kind: 'icon'; label: string } | { kind: 'text'; label: string };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wide = useMediaQuery('(min-width: 640px)');
  const opener = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useOverlay({ open, modal: !wide, onClose: () => setOpen(false), panel, scrim, opener });

  // A content note: reading starts at its heading (no ring; tabindex -1).
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={opener}
        type="button"
        className={trigger.kind === 'icon' ? styles.info : styles.adBtn}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={trigger.kind === 'icon' ? trigger.label : undefined}
      >
        {trigger.kind === 'icon' ? (
          <InfoGlyph />
        ) : (
          <>
            <span className={styles.adBtnText}>{trigger.label}</span>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--brass-ink)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 10.5v6" />
              <path d="M12 7.3h.01" strokeWidth="2" />
            </svg>
          </>
        )}
      </button>
      {open && !wide ? <div ref={scrim} className={styles.scrim} onClick={() => setOpen(false)} aria-hidden="true" /> : null}
      <div
        ref={panel}
        id={id}
        className={styles.note}
        hidden={!open}
        role={wide ? 'region' : 'dialog'}
        aria-modal={!wide && open ? true : undefined}
        aria-labelledby={`${id}-h`}
      >
        <span className={styles.grip} aria-hidden="true" />
        <span className={styles.caret} aria-hidden="true" />
        <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label={closeLabel}>
          <CloseGlyph />
        </button>
        <h3 ref={heading} id={`${id}-h`} className={styles.noteH} tabIndex={-1}>
          {title}
        </h3>
        {children}
      </div>
    </>
  );
}

/** The cooking-run note: "About delivery dates", in its popover and beside the calendar. */
export function DeliveryDatesCopy({ holdMinutes }: { holdMinutes: number }) {
  return (
    <>
      <p className={styles.noteP}>
        We take a limited number of orders for each cooking run, so we can give every dish the care it deserves.
      </p>
      <div className={styles.noteBox}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brass-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 10h17" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
        </svg>
        <span>
          <span className={styles.noteBoxT}>
            When you choose a delivery date, we’ll save it for you for {holdMinutes} minutes while you finish checkout.
          </span>
          <span className={styles.noteBoxS}>You can change your delivery date at any time before payment.</span>
        </span>
      </div>
      <p className={styles.noteP}>
        Your delivery date is confirmed once payment is complete. If the reservation ends before you checkout, your box
        and checkout details will be kept. Simply choose a date again, you can reselect the same one if it’s still
        available.
      </p>
    </>
  );
}

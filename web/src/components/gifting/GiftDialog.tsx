'use client';
import { useEffect, useRef, useId, type ReactNode } from 'react';
import { useOverlay } from '@/components/checkout/checkout/useOverlay';
import styles from './GiftDialog.module.css';
export function GiftDialog({
  title,
  children,
  onClose,
  order = false,
  headerAction,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  order?: boolean;
  headerAction?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const id = useId();
  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
  }, []);
  useOverlay({ open: true, modal: true, panel, scrim, opener, onClose });
  useEffect(() => {
    panel.current
      ?.querySelector<HTMLElement>('button, [tabindex="0"]')
      ?.focus();
  }, []);
  return (
    <div
      className={`${styles.scrim} ${order ? styles.orderScrim : ''}`}
      ref={scrim}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`${styles.panel} ${order ? styles.order : ''}`}
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        {order ? <span className={styles.grab} aria-hidden="true" /> : null}
        <div className={styles.header}>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
          <h2 id={id}>{title}</h2>
          {headerAction}
        </div>
        {children}
      </div>
    </div>
  );
}

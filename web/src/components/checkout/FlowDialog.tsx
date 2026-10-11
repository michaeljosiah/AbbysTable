'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useOverlay } from './checkout/useOverlay';
import { useFlowActions } from './FlowActions';
import styles from './Flow.module.css';

export function FlowDialog({
  title,
  children,
  onClose,
  short = false,
  media,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  short?: boolean;
  media?: ReactNode;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const { setFeedbackHost } = useFlowActions();
  useEffect(() => {
    setFeedbackHost(feedback.current);
    return () => setFeedbackHost(null);
  }, [setFeedbackHost]);
  useEffect(() => {
    opener.current = document.activeElement as HTMLElement;
  }, []);
  useOverlay({ open: true, modal: true, onClose, panel, scrim, opener });
  useEffect(() => {
    const target = short
      ? panel.current?.querySelector<HTMLElement>(
          'input:checked, button:not([data-close])',
        )
      : panel.current?.querySelector<HTMLElement>('h2');
    (target ?? panel.current)?.focus();
  }, [short]);
  return (
    <div
      className={styles.scrim}
      ref={scrim}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={styles.dialog}
        data-wide={Boolean(media) || undefined}
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
      >
        <div className={media ? styles.detailLayout : undefined}>
          {media && <div>{media}</div>}
          <div>
            <div className={styles.dialogHead}>
              <h2 id={id} tabIndex={-1}>
                {title}
              </h2>
              <button
                type="button"
                data-close
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {children}
            <div ref={feedback} />
          </div>
        </div>
      </div>
    </div>
  );
}

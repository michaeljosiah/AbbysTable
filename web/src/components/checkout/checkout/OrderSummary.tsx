'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

import type { BoxQuote } from '@/lib/aonik/map';
import { summaryRows } from '@/lib/checkout/summary';
import { useMediaQuery } from '@/lib/dom/hooks';
import { formatPriceExact } from '@/lib/format';

import styles from './Checkout.module.css';
import { CloseGlyph } from './InfoNote';
import { useOverlay } from './useOverlay';

function BoxGlyph({ stroke = 'var(--brass)', size = 24 }: { stroke?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8l9-4 9 4-9 4-9-4z" />
      <path d="M3 8v8l9 4 9-4V8" />
      <path d="M12 12v8" />
    </svg>
  );
}

function WarnGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 2 }}>
      <path d="M12 3.5l8.5 16h-17z" />
      <path d="M12 10v4M12 16.8h.01" />
    </svg>
  );
}

/** Aonik's rows, in Aonik's order (`summaryRows`): the same markup in the rail and the sheet. */
function Rows({ quote, deliveryDate }: { quote: BoxQuote; deliveryDate: string | null }) {
  return (
    <dl className={styles.rows}>
      {summaryRows(quote, { deliveryDate }).map((row) => (
        <div key={row.key} className={styles.row} data-tone={row.tone}>
          <dt>{row.label}</dt>
          <dd>
            {row.was ? (
              <s className={styles.was}>
                <span className="visuallyHidden">was </span>
                {row.was}
              </s>
            ) : null}
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface PaymentControls {
  /** CONTINUE TO PAYMENT and the bar's PAY SECURELY: one handler. */
  onContinue: () => void;
  busy: boolean;
  /** "Complete N details to continue." — after a CONTINUE attempt only. */
  need: string | null;
  /** What happened when CONTINUE could not go on (ordering closed, demo data). */
  message: string | null;
}

function Cta({ id, controls, ctaRef }: { id?: string; controls: PaymentControls; ctaRef?: RefObject<HTMLButtonElement | null> }) {
  return (
    <>
      <p className={styles.need} role="status">
        {controls.need ? (
          <>
            <WarnGlyph />
            <span>{controls.need}</span>
          </>
        ) : null}
      </p>
      <button
        ref={ctaRef}
        id={id}
        type="button"
        className={styles.cta}
        onClick={controls.onContinue}
        aria-disabled={controls.busy || undefined}
      >
        <span className={styles.ctaIn}>
          <span className={styles.ctaMain}>
            Continue to payment
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" y1="12" x2="19" y2="12" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </span>
          <span className={styles.secure}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6z" />
              <path d="M9.5 12l1.8 1.8L15 10" />
            </svg>
            Secure checkout
          </span>
        </span>
      </button>
      <p className={styles.message} role="status">
        {controls.message}
      </p>
      <p className={styles.stripe}>You’ll review and pay securely on Stripe.</p>
    </>
  );
}

/**
 * The order summary: in page flow below 1024 (the same markup as the rail —
 * nothing duplicated or reordered), the sticky rail from 1024. Below 1024 an
 * 85px bar ("View order ⌃" + PAY SECURELY) opens a modal sheet carrying the
 * same rows, total and CTA. One CTA on screen at a time: the bar hides while
 * the summary's own CTA is visible, and once the footer is three-quarters up
 * the screen.
 */
export function OrderSummary({
  quote,
  deliveryDate,
  controls,
  sheetOpen,
  onSheet,
}: {
  quote: BoxQuote | null;
  deliveryDate: string | null;
  controls: PaymentControls;
  sheetOpen: boolean;
  onSheet: (open: boolean) => void;
}) {
  const ctaRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [barHidden, setBarHidden] = useState(false);

  useOverlay({ open: sheetOpen, modal: true, onClose: () => onSheet(false), panel: sheet, scrim, opener });

  useEffect(() => {
    if (sheetOpen) heading.current?.focus();
  }, [sheetOpen]);

  // The sheet is a phone and tablet presentation: at 1024 the rail is the summary.
  const desktop = useMediaQuery('(min-width: 1024px)');
  useEffect(() => {
    if (desktop && sheetOpen) onSheet(false);
  }, [desktop, sheetOpen, onSheet]);

  // Measured on scroll from any container (capture) and on resize: a framed
  // or nested scroller never fires window's own scroll event.
  useEffect(() => {
    const update = () => {
      const height = window.innerHeight;
      const cta = ctaRef.current?.getBoundingClientRect();
      const footer = document.querySelector('footer')?.getBoundingClientRect();
      const ctaInView = Boolean(cta && cta.height > 0 && cta.top < height && cta.bottom > 0);
      const footerNear = Boolean(footer && footer.top < height * 0.75);
      setBarHidden(ctaInView || footerNear);
    };
    update();
    document.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
    return () => {
      document.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, []);

  if (!quote) return null;
  const total = formatPriceExact(quote.totalPence);
  const boxLabel = `${quote.boxSize}-dish box`;

  return (
    <>
      <aside className={styles.summaryCol} aria-labelledby="ck-summary-h">
        <div className={styles.rail}>
          <div className={styles.railHead}>
            <BoxGlyph />
            <h2 id="ck-summary-h" className={styles.railH}>
              Order summary
            </h2>
          </div>
          <div className={styles.railBody}>
            <Rows quote={quote} deliveryDate={deliveryDate} />
          </div>
          <div className={styles.railFoot}>
            <div className={styles.total}>
              <span>Total</span>
              <span>{total}</span>
            </div>
            <Cta id="ck-continue" controls={controls} ctaRef={ctaRef} />
          </div>
        </div>
      </aside>

      <div className={styles.bar} data-hidden={barHidden || sheetOpen || undefined} data-consent-yield>
        <button
          ref={opener}
          type="button"
          className={styles.barSummary}
          onClick={() => onSheet(true)}
          aria-label="View your order"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <span className={styles.barDisc} aria-hidden="true">
            <BoxGlyph stroke="var(--green-forest)" size={22} />
          </span>
          <span className={styles.barText}>
            <span className={styles.barLabel}>{boxLabel}</span>
            <span className={styles.barPrice}>
              <span className={styles.barTotal}>{total}</span>
              <span className={styles.barView}>
                View order
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </span>
            </span>
          </span>
        </button>
        <button type="button" className={styles.barCta} onClick={controls.onContinue} aria-disabled={controls.busy || undefined}>
          Pay securely
        </button>
      </div>

      {sheetOpen ? (
        <>
          <div ref={scrim} className={styles.sheetScrim} onClick={() => onSheet(false)} aria-hidden="true" />
          <div ref={sheet} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="ck-sheet-h">
            <div className={styles.sheetHead}>
              <span className={styles.grip} aria-hidden="true" />
              <h2 ref={heading} id="ck-sheet-h" className={styles.sheetH} tabIndex={-1}>
                Order summary
              </h2>
              <button type="button" className={styles.close} onClick={() => onSheet(false)} aria-label="Close order summary">
                <CloseGlyph />
              </button>
            </div>
            <div className={styles.sheetBody}>
              <Rows quote={quote} deliveryDate={deliveryDate} />
            </div>
            <div className={styles.sheetFoot}>
              <div className={styles.total}>
                <span>Total</span>
                <span>{total}</span>
              </div>
              <Cta controls={controls} />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { CheckoutPayAnswer, CheckoutPaymentAnswer } from '@/lib/checkout/transport';
import {
  nextPollDelay,
  PAYMENT_PAGES,
  paymentStatusPage,
  SLOW_PAYMENT_MS,
  type PaymentPageKind,
} from '@/lib/checkout/paymentPages';

import styles from './Payment.module.css';
import { PaymentChrome } from './PaymentChrome';

const FOOD_BOX = '/assets/payment/food-box-open.jpg';

/** Where the retry action sends the customer, and what the page says on the way. */
async function retry(): Promise<{ go: string } | { error: string }> {
  try {
    const response = await fetch('/api/checkout/retry', { method: 'POST' });
    const answer = (await response.json().catch(() => null)) as CheckoutPayAnswer | null;
    if (!response.ok || !answer) return { error: 'We couldn’t reopen the payment just now. Please try again in a moment.' };
    if (answer.kind === 'redirect' && answer.checkoutUrl.startsWith('https://')) return { go: answer.checkoutUrl };
    if (answer.kind === 'paid') return { go: '/box/confirmation' };
    if (answer.kind === 'checkout') return { go: '/box/checkout' };
    return { go: '/box/payment' };
  } catch {
    return { error: 'We couldn’t reopen the payment just now. Please try again in a moment.' };
  }
}

function RetryActions({ primary }: { primary: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const next = await retry();
    if ('go' in next) {
      // Stripe's page, the confirmation or checkout: a full navigation, so
      // nothing of this page is left behind (and Back returns here).
      window.location.assign(next.go);
      return;
    }
    setBusy(false);
    setError(next.error);
  };

  return (
    <>
      <div className={styles.actions}>
        <button type="button" className={styles.cta} onClick={() => void go()} aria-disabled={busy || undefined}>
          {primary}
        </button>
        {/* The same action: Stripe's page takes any card. */}
        <button type="button" className={styles.cta2} onClick={() => void go()} aria-disabled={busy || undefined}>
          Use another card
        </button>
      </div>
      <p className={styles.busy} role="status">
        {busy ? 'Taking you to secure payment…' : (error ?? '')}
      </p>
      <Link href="/box/checkout" className={styles.back}>
        <span>
          Return to checkout<span aria-hidden="true">→</span>
        </span>
      </Link>
    </>
  );
}

/**
 * Polls the payment's state while Aonik confirms it (2s, then 5s, then 10s —
 * inside the shared 30-a-minute limit, and slower again after a 429), and
 * moves on only on Aonik's word: succeeded → the confirmation; failed or
 * cancelled → this page re-renders as that state from the server.
 */
function useConfirmation(onSlow: () => void) {
  const router = useRouter();
  const attempt = useRef(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const started = Date.now();
    const poll = async () => {
      let throttled = false;
      try {
        const response = await fetch('/api/checkout/payment', { cache: 'no-store' });
        throttled = response.status === 429;
        const answer = (await response.json().catch(() => null)) as CheckoutPaymentAnswer | null;
        if (stopped) return;
        if (answer?.status === 'succeeded') {
          window.location.replace('/box/confirmation');
          return;
        }
        if (answer?.status === 'failed' || answer?.status === 'cancelled') {
          router.refresh();
          return;
        }
      } catch {
        // A blip is not an answer: keep waiting.
      }
      if (stopped) return;
      if (Date.now() - started >= SLOW_PAYMENT_MS) onSlow();
      attempt.current += 1;
      timer = setTimeout(() => void poll(), nextPollDelay(attempt.current, throttled));
    };
    timer = setTimeout(() => void poll(), nextPollDelay(0, false));
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [router, onSlow]);
}

function Processing({ checking }: { checking: boolean }) {
  const [slow, setSlow] = useState(checking);
  const markSlow = useRef(() => setSlow(true)).current;
  useConfirmation(markSlow);
  const page = PAYMENT_PAGES.processing;
  return (
    <>
      <h1 className={styles.h1} id="pp-h" tabIndex={-1}>
        <span>{page.title}</span>
        <span className={styles.spin} aria-hidden="true" />
      </h1>
      <p className={styles.lede} role="status" aria-live="polite">
        {slow ? (
          <strong>We’re checking your payment. Please don’t pay again yet.</strong>
        ) : (
          <>
            <strong>Please don’t close this page or refresh your browser.</strong> We’ll confirm your payment and show your
            order details shortly.
          </>
        )}
      </p>
      <div className={styles.panel}>
        <span className={styles.panelIcon} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brass-ink)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="9.5" rx="2" />
            <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
          </svg>
        </span>
        <div>
          <h2 className={styles.panelH}>Your order is safe</h2>
          <p className={styles.panelP}>
            We’ve received your order details and are confirming your payment with our secure payment provider.
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * `/box/payment`: what Aonik says about the box's payment
 * (`paymentStatusPage`): confirming it, not completed, or cancelled.
 */
export function PaymentStatusView({ kind, checking = false }: { kind: PaymentPageKind; checking?: boolean }) {
  const page = PAYMENT_PAGES[kind];

  // A full page: reading starts at its heading.
  useEffect(() => {
    document.getElementById('pp-h')?.focus({ preventScroll: true });
  }, [kind]);

  return (
    <PaymentChrome inFlight={kind === 'processing'} faqs={page.faqs}>
      <section className={styles.section} aria-labelledby="pp-h">
        <div className={`${styles.inner} ${styles.grid}`}>
          <div>
            {kind === 'processing' ? (
              <Processing checking={checking} />
            ) : (
              <>
                <h1 className={styles.h1} id="pp-h" tabIndex={-1}>
                  {page.title}
                </h1>
                <p className={styles.lede}>{page.lede}</p>
                <div className={styles.panel} data-tone={kind === 'cancelled' ? 'neutral' : 'alert'}>
                  <span className={styles.panelIcon} aria-hidden="true">
                    {kind === 'cancelled' ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brass-ink)" strokeWidth="1.7" strokeLinecap="round">
                        <circle cx="12" cy="12" r="8.5" />
                        <path d="M12 11v5.5M12 7.9h.01" strokeWidth="2" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta-ink)" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M12 6.5v7.5M12 17.6h.01" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <h2 className={styles.panelH}>{page.panelTitle}</h2>
                    <p className={styles.panelP}>{page.panelText}</p>
                  </div>
                </div>
                <RetryActions primary={kind === 'cancelled' ? 'Continue to payment' : 'Try again'} />
              </>
            )}
          </div>
          <figure className={styles.figure}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 762×796 JPEG in a reserved frame */}
            <img src={FOOD_BOX} alt="An open Abby’s Table box packed with chilled dishes" width={762} height={796} decoding="async" />
          </figure>
        </div>
      </section>
    </PaymentChrome>
  );
}

export { paymentStatusPage };

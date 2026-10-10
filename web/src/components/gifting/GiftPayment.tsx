'use client';
import { useEffect, useRef, useState } from 'react';
import { PaymentChrome } from '@/components/checkout/payment/PaymentChrome';
import type { CartPaymentStateDto } from '@/lib/aonik/dto';
import {
  nextPollDelay,
  PAYMENT_PAGES,
  paymentStatusPage,
  SLOW_PAYMENT_MS,
} from '@/lib/checkout/paymentPages';
import { LockIcon } from './GiftIcons';
import styles from '@/components/checkout/payment/Payment.module.css';
export function GiftPayment() {
  const [state, setState] = useState<CartPaymentStateDto | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const attempt = useRef(0);
  useEffect(() => {
    let done = false;
    let timer: ReturnType<typeof setTimeout>;
    const slowTimer = setTimeout(() => setSlow(true), SLOW_PAYMENT_MS);
    const read = async () => {
      let throttled = false;
      try {
        const response = await fetch('/api/gift-card/payment', {
          cache: 'no-store',
        });
        const answer = await response.json();
        throttled = response.status === 429;
        if (!response.ok) throw new Error(answer.message);
        if (done) return;
        setState(answer);
        setLoaded(true);
        setNotice('');
        if (answer?.status === 'succeeded')
          window.location.replace('/gift-card/confirmation');
      } catch {
        if (!done)
          setNotice(
            'We couldn’t confirm payment just now. Please keep this page open while we check again.',
          );
      }
      if (!done)
        timer = setTimeout(read, nextPollDelay(attempt.current++, throttled));
    };
    void read();
    return () => {
      done = true;
      clearTimeout(timer);
      clearTimeout(slowTimer);
    };
  }, []);
  const recover = async () => {
    if (busy || !state?.paymentIntentId) return;
    setBusy(true);
    try {
      const response = await fetch('/api/gift-card/recover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cart-Version': state?.cartVersion ?? '',
        },
        body: JSON.stringify({ paymentIntentId: state?.paymentIntentId }),
      });
      const answer = await response.json();
      if (!response.ok) throw new Error(answer.message);
      if (answer.canEdit) window.location.assign('/gift-card/checkout');
      else setState(answer);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'We could not check the payment.',
      );
    } finally {
      setBusy(false);
    }
  };
  const editable = state?.canEdit;
  const mapped = paymentStatusPage(state, null);
  const kind = mapped && 'kind' in mapped ? mapped.kind : 'processing';
  const page = PAYMENT_PAGES[kind];
  if (loaded && !state) return <PaymentChrome inFlight={false} faqs={[]}><section className={styles.section}><div className={styles.inner}><h1 className={styles.h1}>No gift payment in progress</h1><p className={styles.lede}>Choose a gift card to continue.</p><div className={styles.actions}><a className={styles.cta} href="/gifting">Back to gifting</a></div></div></section></PaymentChrome>;
  return (
    <PaymentChrome inFlight={!editable} faqs={[]}>
      <section className={styles.section}>
        <div className={`${styles.inner} ${styles.grid}`}>
          <div>
            <h1 className={styles.h1}>
              {page.title}
              {kind === 'processing' ? (
                <span className={styles.spin} aria-hidden="true" />
              ) : null}
            </h1>
            <p className={styles.lede} role="status">
              {editable
                ? 'Your gift details are saved. You can return to checkout and try again.'
                : slow
                  ? 'We’re checking your payment. Please don’t pay again yet.'
                  : page.lede}
            </p>
            <div
              className={styles.panel}
              data-tone={kind === 'processing' ? undefined : 'alert'}
            >
              <span className={styles.panelIcon}>
                <LockIcon size={22} />
              </span>
              <div>
                <h2 className={styles.panelH}>
                  {kind === 'processing'
                    ? page.panelTitle
                    : 'Your gift details are saved'}
                </h2>
                <p className={styles.panelP}>
                  {kind === 'processing'
                    ? page.panelText
                    : 'We’ll check the existing payment before you return to your gift.'}
                </p>
              </div>
            </div>
            {notice ? (
              <p className={styles.busy} role="status">
                {notice}
              </p>
            ) : null}
            {editable ? (
              <div className={styles.actions}>
                <a className={styles.cta} href="/gift-card/checkout">
                  Return to gift checkout
                </a>
              </div>
            ) : state?.paymentIntentId ? (
              <button
                className={styles.back}
                disabled={busy}
                onClick={() => void recover()}
              >
                Check whether I can return to checkout
              </button>
            ) : null}
            {state?.checkoutUrl ? (
              <div className={styles.actions}>
                <a className={styles.cta} href={state.checkoutUrl}>
                  Return to secure payment
                </a>
              </div>
            ) : null}
          </div>
          <figure className={styles.figure}>
            {/* eslint-disable-next-line @next/next/no-img-element -- approved payment-status artwork in its reserved frame */}
            <img
              src="/assets/payment/food-box-open.jpg"
              alt="An Abby’s Table box packed with dishes"
              width={762}
              height={796}
            />
          </figure>
        </div>
      </section>
    </PaymentChrome>
  );
}

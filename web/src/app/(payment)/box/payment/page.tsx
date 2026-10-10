import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PaymentChrome } from '@/components/checkout/payment/PaymentChrome';
import { PaymentStatusView } from '@/components/checkout/payment/PaymentStatusView';
import styles from '@/components/checkout/payment/Payment.module.css';
import { resolveDataMode } from '@/lib/aonik/dataMode';
import { readPaymentState } from '@/lib/checkout/payment';
import { PAYMENT_PAGES, paymentStatusPage } from '@/lib/checkout/paymentPages';

export const metadata: Metadata = {
  title: "Payment — Abby's Table",
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/** A payment's state is per customer and changes by the second. */
export const dynamic = 'force-dynamic';

/**
 * `/box/payment` (#32): what Aonik says about this browser's payment —
 * confirming it, not completed, or cancelled (`paymentStatusPage`). A paid
 * order goes to its confirmation. Never decided by the browser, and reloading
 * it only reads: a payment is started or resumed only by a button press.
 */
export default async function PaymentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const outcome = typeof params.outcome === 'string' ? params.outcome : null;
  const { mode } = await resolveDataMode();
  const state = mode === 'live' ? await readPaymentState() : null;
  // A box with no payment attempt has nothing to confirm: its checkout is the place.
  if (state && !state.paymentIntentId) redirect('/box/checkout');
  const page = paymentStatusPage(state, outcome);

  if (page && 'redirect' in page) redirect(page.redirect);
  if (page) return <PaymentStatusView kind={page.kind} checking={page.checking} />;

  // Not designed: no payment for this browser (another browser, an expired
  // box, demo data). Says what is true, and implies nothing about an order.
  return (
    <PaymentChrome inFlight={false} faqs={PAYMENT_PAGES.notCompleted.faqs}>
      <section className={styles.section} aria-labelledby="pp-h">
        <div className={styles.inner}>
          <h1 className={styles.h1} id="pp-h">
            No payment to show
          </h1>
          <p className={styles.lede}>
            We can’t find a payment in progress in this browser. If you paid for an order, nothing here has changed it —
            contact us and we’ll help.
          </p>
          <div className={styles.actions}>
            <Link href="/box" className={styles.cta}>
              Build a Box
            </Link>
          </div>
        </div>
      </section>
    </PaymentChrome>
  );
}

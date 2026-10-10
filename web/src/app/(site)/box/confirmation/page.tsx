import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import styles from '@/components/checkout/confirmation/Confirmation.module.css';
import { FocusOnArrival } from '@/components/checkout/confirmation/ConfirmationParts';
import { OrderConfirmation } from '@/components/checkout/confirmation/OrderConfirmation';
import { readConfirmation } from '@/lib/checkout/confirmation';
import { CONTACT_HREF } from '@/lib/content/navigation';

export const metadata: Metadata = {
  title: "Order confirmed — Abby's Table",
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/** Somebody's own order, read back per request: never cached, never static. */
export const dynamic = 'force-dynamic';

/**
 * Order Confirmation v2 (#32), in the site's own chrome — the order is done,
 * so the header's pill reads GET STARTED again once the box is gone.
 *
 * Shown only for an order Aonik reports PAID. One that is not paid yet goes to
 * the payment page, which says where it stands; with nothing to read here
 * (another browser, a cleared cookie) the page says so, and implies nothing
 * about whether an order exists.
 */
export default async function ConfirmationPage() {
  const read = await readConfirmation();
  if (read.kind === 'unpaid') redirect('/box/payment');
  if (read.kind === 'paid') return <OrderConfirmation order={read.order} />;

  return (
    <div className={styles.page}>
      <FocusOnArrival targetId="oc-h" />
      <section className={styles.hero}>
        <div className={`${styles.in} ${styles.none}`}>
          <h1 className={styles.h1} id="oc-h" tabIndex={-1}>
            No recent order to show
          </h1>
          <p className={styles.lede}>
            We can’t find a recently placed order in this browser. If you placed one, nothing here has changed it —
            contact us and we’ll help.
          </p>
          <div className={styles.noneActions}>
            <Link href="/menu" className={styles.primary}>
              Back to the menu
            </Link>
            <Link href={CONTACT_HREF} className={styles.secondary}>
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

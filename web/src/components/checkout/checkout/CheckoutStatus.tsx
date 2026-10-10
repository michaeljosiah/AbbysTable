import Link from 'next/link';

import { CART_ORDERED_MESSAGE } from '@/lib/cart/cartMissing';

import styles from './Checkout.module.css';

/**
 * Checkout for a box that can no longer be checked out. Not designed as a
 * page (SHOPPING-STATE §53, §42): said in place of the form, with the
 * heading where reading starts.
 *
 * - `completed`: it became an order — in this tab or another.
 * - `payment`: a payment attempt holds it. Nothing about the box can change
 *   until the payment provider's answer is known, and paying again is not
 *   offered while it may still go through.
 */
export function CheckoutStatus({ kind }: { kind: 'completed' | 'payment' }) {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.main}>
          <h1 className={styles.h1}>Checkout</h1>
          {kind === 'completed' ? (
            <div className={styles.locked} role="status">
              <h2 className={styles.lockedH}>{CART_ORDERED_MESSAGE}</h2>
              <Link href="/box/confirmation" className={styles.lockedCta}>
                View order
              </Link>
            </div>
          ) : (
            <div className={styles.locked} role="status">
              <h2 className={styles.lockedH}>We’re checking your payment.</h2>
              <p className={styles.lockedP}>Please don’t pay again yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

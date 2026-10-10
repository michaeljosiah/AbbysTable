import Link from 'next/link';

import { CART_ORDERED_MESSAGE } from '@/lib/cart/cartMissing';

import styles from './Checkout.module.css';

/**
 * Checkout for a box that became an order — here or in another tab (not
 * designed as a page; SHOPPING-STATE §53): said in place of the form, with
 * VIEW ORDER. A box a payment attempt holds goes to the payment page instead.
 */
export function CheckoutStatus({ kind }: { kind: 'completed' }) {
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

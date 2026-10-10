'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useCart } from '@/lib/cart/CartProvider';
import type { CheckoutSyncAnswer } from '@/lib/checkout/transport';

import styles from './Checkout.module.css';

/**
 * Checkout for a signed-in customer whose session needs renewing first. The
 * page cannot renew it while it renders (it cannot keep the new cookie), so a
 * route handler does — the box is read through `/api/checkout/sync`, queued
 * with the cart's own requests — and the page is drawn again. A session that
 * could not be renewed is signed out by then, and the page says where the box
 * stands for a signed-out customer.
 */
export function CheckoutSessionGate() {
  const router = useRouter();
  const { checkoutRequest } = useCart();
  const [failed, setFailed] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void checkoutRequest<CheckoutSyncAnswer>('/sync').then((result) => {
      // The box is gone: back to the start, never another render of this gate.
      if (result.payload.cart === null) router.replace('/box');
      // An answer about the box — its draft, or mid-payment — means the session is settled.
      else if (result.ok || result.status === 409) router.refresh();
      else setFailed(true);
    });
  }, [checkoutRequest, router]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.main}>
          <h1 className={styles.h1}>Checkout</h1>
          <div className={styles.locked} role="status">
            {failed ? (
              <>
                <h2 className={styles.lockedH}>We couldn’t load your checkout just now.</h2>
                <button type="button" className={styles.lockedCta} onClick={() => window.location.reload()}>
                  Try again
                </button>
              </>
            ) : (
              <h2 className={styles.lockedH}>Loading your checkout…</h2>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

import { useCart } from '@/lib/cart/CartProvider';
import { replacementsBody, replacementsTitle } from '@/lib/shopping-state';

import styles from './DriftNotices.module.css';

/**
 * "Your box needs N replacement(s)" — Step 2, when dishes in the box are no
 * longer available (SHOPPING-STATE §5). The rest of the box is kept; the
 * customer chooses any N dishes to complete it, and the step's own CTA stays
 * unavailable until they have. From Checkout the line also says the checkout
 * details were kept (`?from=checkout`, set by the entry gate's redirect).
 *
 * Reads the shared shopping state, so it appears wherever the box is sent back
 * to Step 2 for this reason — from Extras, Review or Checkout alike.
 */
export function ReplacementNotice() {
  const { hydrated, shopping, unavailableNames } = useCart();
  const [fromCheckout, setFromCheckout] = useState(false);

  useEffect(() => {
    setFromCheckout(new URLSearchParams(window.location.search).get('from') === 'checkout');
  }, []);

  if (!hydrated || shopping.replacements === 0) return null;

  return (
    <ul className={styles.list} role="status">
      <li className={styles.notice} data-blocking>
        <span className={styles.body}>
          <span className={styles.title}>{replacementsTitle(shopping.replacements)}</span>
          <span className={styles.detail}>{replacementsBody(shopping.replacements, unavailableNames, fromCheckout)}</span>
        </span>
      </li>
    </ul>
  );
}

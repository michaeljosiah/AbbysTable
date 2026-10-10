'use client';

import { useEffect, useRef, useState } from 'react';

import { useCart } from '@/lib/cart/CartProvider';
import { replacementsBody, replacementsTitle } from '@/lib/shopping-state';

import styles from './DriftNotices.module.css';

/** A removal that is turned away because another change is in flight is asked again. */
const RETRY_MS = 400;
const MAX_TRIES = 6;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * "Your box needs N replacement(s)" — Step 2, when dishes in the box are no
 * longer available (SHOPPING-STATE §5). The rest of the box is kept; the
 * customer chooses any N dishes to complete it, and the step's own CTA stays
 * unavailable until they have. From Checkout the line also says the checkout
 * details were kept (`?from=checkout`, set by the entry gate's redirect).
 *
 * Aonik keeps a flagged dish in the box — and counts it — until it is removed,
 * and refuses any add while one is there. So arriving here takes the
 * unavailable dishes out (they cannot be ordered either way) and the notice
 * remembers how many, until the box is whole again: the customer is then asked
 * for exactly the dishes it lost.
 */
export function ReplacementNotice() {
  const { hydrated, shopping, unavailableDishes, removeLine } = useCart();
  const [fromCheckout, setFromCheckout] = useState(false);
  const [lost, setLost] = useState<{ count: number; names: string[] } | null>(null);
  const handled = useRef(new Set<string>());

  useEffect(() => {
    setFromCheckout(new URLSearchParams(window.location.search).get('from') === 'checkout');
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const fresh = unavailableDishes.filter((line) => !handled.current.has(line.lineId));
    if (fresh.length === 0) return;
    for (const line of fresh) handled.current.add(line.lineId);
    setLost((current) => ({
      count: (current?.count ?? 0) + fresh.reduce((total, line) => total + line.quantity, 0),
      names: [...(current?.names ?? []), ...fresh.map((line) => line.name)],
    }));
    void (async () => {
      for (const line of fresh) {
        for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
          try {
            await removeLine(line.lineId);
            break;
          } catch {
            await wait(RETRY_MS);
          }
        }
      }
    })();
  }, [hydrated, unavailableDishes, removeLine]);

  // The box is whole again (or gone): nothing left to replace.
  useEffect(() => {
    if (lost && hydrated && shopping.complete) setLost(null);
  }, [lost, hydrated, shopping.complete]);

  if (!hydrated || !lost) return null;

  return (
    <div className={styles.list} role="status">
      <div className={styles.notice} data-blocking>
        <span className={styles.body}>
          <span className={styles.title}>{replacementsTitle(lost.count)}</span>
          <span className={styles.detail}>{replacementsBody(lost.count, lost.names, fromCheckout)}</span>
        </span>
      </div>
    </div>
  );
}

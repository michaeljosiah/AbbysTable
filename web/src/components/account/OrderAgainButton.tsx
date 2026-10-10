'use client';

import Link from 'next/link';
import { useState } from 'react';

import { reorderAction } from '@/lib/account/reorderActions';
import { REORDER_COPY } from '@/lib/account/reorder';
import { useCart } from '@/lib/cart/CartProvider';
import { loginPathFor } from '@/lib/auth/redirect';
import { BOX_BUILDER_PATH } from '@/lib/how-it-works/boxSizes';
import { resumeHrefFor } from '@/lib/purchase-bar/activeBox';

import styles from './Account.module.css';

type Said = { kind: 'problem' | 'active'; text: string } | null;

/**
 * ORDER AGAIN (design: My Account, Order again). One tap starts a new box from
 * the order's dishes, rebuilt by Aonik from today's menu, and lands on Step 2
 * where anything unavailable is swapped and any dish can be taken out. It
 * cannot merge into a box already in progress — Aonik holds one box at a time —
 * so with one it says so and points at it, and starts nothing.
 */
export function OrderAgainButton({
  orderId,
  label,
  upcoming = false,
  returnTo,
}: {
  orderId: string;
  /** What assistive tech hears: "Order again: dishes from Thursday 8 October". */
  label: string;
  /** An upcoming order says its delivery is not being edited. */
  upcoming?: boolean;
  /** Where Log in comes back to, if the session ended. */
  returnTo: string;
}) {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said>(null);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    setSaid(null);
    try {
      const result = await reorderAction(orderId);
      switch (result.status) {
        case 'started':
          // A full load, not a client navigation: the cart this tab holds is the old one.
          window.location.assign(`${BOX_BUILDER_PATH}/dishes`);
          return;
        case 'ended':
          window.location.assign(loginPathFor(returnTo));
          return;
        case 'active-box':
          setSaid({ kind: 'active', text: REORDER_COPY.activeBox });
          break;
        case 'not-reorderable':
          setSaid({ kind: 'problem', text: REORDER_COPY.notReorderable });
          break;
        case 'unavailable':
          setSaid({ kind: 'problem', text: REORDER_COPY.unavailable });
          break;
        default:
          setSaid({ kind: 'problem', text: REORDER_COPY.failed });
      }
    } catch {
      setSaid({ kind: 'problem', text: REORDER_COPY.failed });
    }
    setBusy(false);
  };

  return (
    <div className={styles.reorder}>
      <button type="button" className={`${styles.pill} ${styles.pillOutline}`} onClick={go} disabled={busy} aria-label={label}>
        {busy ? 'Starting…' : 'Order again'}
      </button>
      {upcoming ? <p className={styles.hint}>{REORDER_COPY.upcomingHint}</p> : null}
      <div role="status" aria-live="polite">
        {said ? (
          <p className={said.kind === 'active' ? styles.ok : styles.problem}>
            <span>{said.text}</span>
            {said.kind === 'active' ? (
              <>
                {' '}
                <Link href={resumeHrefFor(cart)} className={styles.inlineLink}>
                  View box
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

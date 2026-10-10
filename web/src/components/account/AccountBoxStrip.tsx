'use client';

import Link from 'next/link';

import { useCart } from '@/lib/cart/CartProvider';
import { activeBoxSummary } from '@/lib/purchase-bar/activeBox';
import type { PurchaseBarData } from '@/lib/purchase-bar/data';

import styles from './Account.module.css';

/**
 * "You have a box in progress" — the account hero's strip, shown only while a
 * box is ACTIVE (the one shared rule, `isBoxActive`) and never before the cart
 * has hydrated, so the first render says nothing the cart has not said. VIEW
 * BOX goes to the furthest valid step (the shared shopping state, #14).
 */
export function AccountBoxStrip({ data }: { data: PurchaseBarData }) {
  const cart = useCart();
  const summary = activeBoxSummary(cart, data.pricing, data.offer);
  if (!summary) return null;

  return (
    <div className={styles.wip}>
      <span className={styles.wipText}>
        <b>You have a box in progress</b>
        <span>{summary.total ? `${summary.label} · ${summary.total}` : summary.label}</span>
      </span>
      <Link href={summary.href} className={styles.pill}>
        View box
      </Link>
    </div>
  );
}

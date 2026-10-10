'use client';

import Link from 'next/link';
import { useId, useState } from 'react';

import { dishesToggleLabel } from '@/lib/account/orders';

import styles from './Account.module.css';

/** What the card shows, already formatted by the page: it renders, it decides nothing. */
export interface OrderCardData {
  /** `AT-10517`, or absent on an old order. */
  number?: string;
  status: { label: string; kind: 'live' | 'done' };
  heading: string;
  address?: string;
  box: string;
  total: string;
  gift?: string;
  dishes: Array<{ name: string; quantity: number; isSignature: boolean }>;
  /** Total dishes, for the toggle's label. */
  dishCount: number;
  /** The order's own page (the price breakdown, points, refunds). */
  href: string;
}

/**
 * One order (design: My Account, Orders). Read-only: the card offers no change
 * or cancellation (confirmed orders are read-only, decided 5 Oct 2026). The
 * dishes open and close in place; with none to show (an older Aonik) there is
 * no toggle rather than an empty one.
 */
export function OrderCard({ order }: { order: OrderCardData }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const headingId = `${id}-h`;
  const listId = `${id}-l`;

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.ordTop}>
        <span className={styles.ordNo}>{order.number ? `Order ${order.number}` : 'Order'}</span>
        <span className={styles.status} data-k={order.status.kind}>
          {order.status.label}
        </span>
      </div>

      <div className={styles.ordBody}>
        <h4 className={styles.cardTitle} id={headingId}>
          {order.heading}
        </h4>
        {order.address ? <p className={styles.p}>{order.address}</p> : null}
        <p className={styles.ordMeta}>
          <span>{order.box}</span>
          <b>{order.total}</b>
        </p>
        {order.gift ? (
          <p className={styles.gift}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.giftGlyph}>
              <rect x="3.5" y="8.5" width="17" height="12" rx="1.5" />
              <path d="M3.5 12.5h17M12 8.5v12M12 8.5c-1.5-3-5-3.6-5-1.2 0 1.6 2.6 1.2 5 1.2zm0 0c1.5-3 5-3.6 5-1.2 0 1.6-2.6 1.2-5 1.2z" />
            </svg>
            <span>{order.gift}</span>
          </p>
        ) : null}
      </div>

      {order.dishes.length > 0 ? (
        <>
          <button
            type="button"
            className={styles.disclosure}
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls={listId}
          >
            {dishesToggleLabel(open, order.dishCount)}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {open ? (
            <ul className={styles.dishes} id={listId}>
              {order.dishes.map((dish, index) => (
                <li key={`${dish.name}-${index}`}>
                  <b>{dish.quantity}×</b>
                  <span>
                    {dish.name}
                    {dish.isSignature ? <span className={styles.sig}>Signature</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      <div className={styles.actions}>
        <Link href={order.href} className={styles.textLink}>
          <span>View order details</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </article>
  );
}

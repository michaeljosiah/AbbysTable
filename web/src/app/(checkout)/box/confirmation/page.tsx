import type { Metadata } from 'next';
import Link from 'next/link';

import { formatDeliveryDate, formatPrice, formatPriceExact } from '@/lib/format';
import { readPlacedOrder } from '@/lib/cart/orderCookie';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: "Order confirmed — Abby's Table",
  description: 'Your box is on its way.',
};

/**
 * A confirmation must never be a cached snapshot of somebody else's order.
 * It is also read from a cookie, which is per-request by definition.
 */
export const dynamic = 'force-dynamic';

/**
 * Step 5: the order exists.
 *
 * Rendered entirely from the snapshot written when checkout succeeded, which is
 * the ONLY source available: Aonik's storefront order routes require an
 * authenticated, party-scoped principal, so an anonymous customer cannot read
 * their own order back and guest lookup is deliberately not offered. Reading a
 * cookie also makes this refresh-safe for free — the page never re-triggers
 * checkout, because it has no way to.
 */
export default async function BoxConfirmationPage() {
  const order = await readPlacedOrder();

  // No snapshot: a direct visit, an expired cookie, or a different browser.
  // Say what is true rather than implying an order did or did not happen.
  if (!order) {
    return (
      <div className={styles.page}>
        <section className={styles.card}>
          <h1 className={styles.heading}>No recent order to show</h1>
          <p className={styles.lead}>
            We can&rsquo;t find a recently placed order in this browser. If you completed an
            order, your confirmation email is your record — nothing here has changed it.
          </p>
          <div className={styles.actions}>
            <Link href="/menu" className={styles.primary}>
              Back to the menu
            </Link>
            <Link href="/#contact" className={styles.secondary}>
              Contact us
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const deliveryLabel = formatDeliveryDate(order.earliestDeliveryDate);
  const hasDiscount = order.discountTotalPence > 0;
  const hasTax = order.taxTotalPence > 0;

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <span className={styles.tick} aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.6 4.5L19 7.5" />
          </svg>
        </span>

        <span className={styles.eyebrow}>Order confirmed</span>
        <h1 className={styles.heading}>Thank you — your box is booked</h1>
        <p className={styles.lead}>
          Abby cooks it fresh in a small batch and it travels chilled.
          {deliveryLabel ? (
            <>
              {' '}
              Earliest UK-wide delivery: <strong>{deliveryLabel}</strong>.
            </>
          ) : null}
        </p>

        <div className={styles.reference}>
          <span className={styles.referenceLabel}>Order reference</span>
          <code className={styles.referenceValue}>{order.orderId}</code>
          <p className={styles.referenceNote}>
            Keep this reference — it identifies your order if you need to get in touch.
          </p>
        </div>

        {order.linesOmitted ? (
          <p className={styles.note}>
            Your order was placed successfully. The item list isn&rsquo;t available on this
            screen — the reference above and your confirmation email are your record.
          </p>
        ) : (
          <>
            {order.dishes.length > 0 ? (
              <div className={styles.block}>
                <h2 className={styles.blockHeading}>
                  {order.boxSize ? `Your ${order.boxSize}-dish box` : 'Your box'}
                </h2>
                <ul className={styles.lines}>
                  {order.dishes.map((line, index) => (
                    <li key={`${line.name}-${index}`} className={styles.line}>
                      <span className={styles.lineQty}>{line.quantity}&times;</span>
                      <span className={styles.lineBody}>
                        <span className={styles.lineName}>{line.name}</span>
                        {line.detail ? (
                          <span className={styles.lineDetail}>{line.detail}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {order.addOns.length > 0 ? (
              <div className={styles.block}>
                <h2 className={styles.blockHeading}>Extras</h2>
                <ul className={styles.lines}>
                  {order.addOns.map((line, index) => (
                    <li key={`${line.name}-${index}`} className={styles.line}>
                      <span className={styles.lineQty}>{line.quantity}&times;</span>
                      <span className={styles.lineBody}>
                        <span className={styles.lineName}>{line.name}</span>
                      </span>
                      {line.pricePence !== undefined ? (
                        <span className={styles.linePrice}>
                          {formatPriceExact(line.pricePence * line.quantity)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}

        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotalPence)}</span>
          </div>
          {hasDiscount ? (
            <div className={styles.totalRow}>
              <span>Discount</span>
              <span className={styles.discount}>&minus;{formatPrice(order.discountTotalPence)}</span>
            </div>
          ) : null}
          {hasTax ? (
            <div className={styles.totalRow}>
              <span>Tax</span>
              <span>{formatPrice(order.taxTotalPence)}</span>
            </div>
          ) : null}
          <div className={styles.grandRow}>
            <span>Total</span>
            <span className={styles.grandValue}>{formatPrice(order.totalPence)}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href="/menu" className={styles.primary}>
            Back to the menu
          </Link>
          <Link href="/#contact" className={styles.secondary}>
            Questions about your order?
          </Link>
        </div>
      </section>
    </div>
  );
}

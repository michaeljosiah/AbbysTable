import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatOrderDate, getMyOrder } from '@/lib/aonik/orders';
import { SessionExpiredError } from '@/lib/auth/server';
import { readSessionView } from '@/lib/auth/session';
import { formatPrice, formatPriceExact } from '@/lib/format';

import styles from './page.module.css';

/**
 * Static, and deliberately so: putting the order reference or its contents in a
 * title would leak them into browser history, tab titles and shared
 * screenshots.
 */
export const metadata: Metadata = {
  title: "Your order — Abby's Table",
  description: 'The details of one Abby’s Table order.',
};

/** Reads a session cookie and is scoped to one customer — never cached. */
export const dynamic = 'force-dynamic';

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

function SignInRequired() {
  return (
    <div className={styles.notice}>
      <h1 className={styles.noticeHeading}>Sign in to see this order</h1>
      <p className={styles.noticeBody}>
        Orders are tied to the account that placed them. Sign in and it will be here.
      </p>
      <div className={styles.noticeActions}>
        <Link href="/login" className={styles.primary}>
          Sign in
        </Link>
        <Link href="/menu" className={styles.secondary}>
          Browse the menu
        </Link>
      </div>
    </div>
  );
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = await params;

  // Checked first so a signed-out visitor sees the sign-in state rather than a
  // not-found page — the order may well exist; they just cannot read it yet.
  const session = await readSessionView();

  let order = null;
  let signedIn = session.isSignedIn;

  if (signedIn) {
    try {
      order = await getMyOrder(orderId);
    } catch (error) {
      if (!(error instanceof SessionExpiredError)) throw error;
      signedIn = false;
    }
  }

  if (!signedIn) {
    return (
      <section className={styles.page}>
        <div className={styles.inner}>
          <SignInRequired />
        </div>
      </section>
    );
  }

  // Aonik answers 404 for an order that does not exist AND for one belonging to
  // someone else — by design, so the URL cannot be used to probe for other
  // customers' orders. Not-found is therefore the whole truth we have, and the
  // page must not speculate about which case it was.
  if (!order) notFound();

  const placed = formatOrderDate(order.placedAtUtc);
  const hasDiscount = order.discountTotalPence > 0;
  const hasTax = order.taxTotalPence > 0;

  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <Link href="/account/orders" className={styles.back}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          All orders
        </Link>

        <article className={styles.card}>
          <header className={styles.header}>
            <h1 className={styles.heading}>
              {order.boxSize ? `Your ${order.boxSize}-dish box` : 'Your order'}
            </h1>
            <div className={styles.meta}>
              {placed ? <span className={styles.placed}>Placed {placed}</span> : null}
              <span className={styles.status}>{order.status}</span>
            </div>
          </header>

          <div className={styles.reference}>
            <span className={styles.referenceLabel}>Order reference</span>
            <code className={styles.referenceValue}>{order.orderId}</code>
          </div>

          {order.selections.length > 0 ? (
            <div className={styles.block}>
              <h2 className={styles.blockHeading}>What&rsquo;s in this box</h2>
              {/* The detail read carries no product name for a selection — only
                  the variant id and the sku — so the sku is what is shown.
                  Inventing a dish title from it would be a guess. */}
              <p className={styles.blockNote}>Listed by product code.</p>
              <ul className={styles.lines}>
                {order.selections.map((selection, index) => (
                  <li key={`${selection.productVariantId}-${index}`} className={styles.line}>
                    <span className={styles.lineQty}>{selection.quantity}&times;</span>
                    <span className={styles.lineBody}>
                      <span className={styles.lineName}>{selection.sku}</span>
                      {selection.personalisationSummary ? (
                        <span className={styles.lineDetail}>
                          {selection.personalisationSummary}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {order.items.length > 0 ? (
            <div className={styles.block}>
              <h2 className={styles.blockHeading}>What you were charged for</h2>
              <ul className={styles.lines}>
                {order.items.map((item, index) => (
                  <li key={`${item.itemType}-${item.sku ?? ''}-${index}`} className={styles.line}>
                    <span className={styles.lineQty}>
                      {item.quantity !== undefined ? `${item.quantity}×` : ''}
                    </span>
                    <span className={styles.lineBody}>
                      <span className={styles.lineName}>{item.itemType}</span>
                      {item.sku ? <span className={styles.lineDetail}>{item.sku}</span> : null}
                      {item.unitPricePence !== undefined ? (
                        <span className={styles.lineDetail}>
                          {formatPriceExact(item.unitPricePence)} each
                        </span>
                      ) : null}
                    </span>
                    <span className={styles.linePrice}>{formatPriceExact(item.amountPence)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotalPence)}</span>
            </div>
            {hasDiscount ? (
              <div className={styles.totalRow}>
                <span>Discount</span>
                <span className={styles.discount}>
                  &minus;{formatPrice(order.discountTotalPence)}
                </span>
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
              Order it again
            </Link>
            <Link href="/#contact" className={styles.secondary}>
              Questions about this order?
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

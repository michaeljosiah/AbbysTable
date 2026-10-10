import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import styles from '@/components/account/Account.module.css';
import { addressText, giftLine, orderStatusLabel } from '@/lib/account/orders';
import { formatOrderDate, getMyOrder } from '@/lib/aonik/orders';
import { redirectToLogin, requireSignedIn } from '@/lib/auth/guard';
import { SessionExpiredError } from '@/lib/auth/server';
import { formatDeliveryDateLong, formatPrice, formatPriceExact } from '@/lib/format';

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

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = await params;

  // A signed-out request goes to Log in and comes back to this order.
  const returnTo = `/account/orders/${encodeURIComponent(orderId)}`;
  await requireSignedIn(returnTo);

  let order = null;
  let ended = false;
  try {
    order = await getMyOrder(orderId);
  } catch (error) {
    if (!(error instanceof SessionExpiredError)) throw error;
    ended = true;
  }
  if (ended) redirectToLogin(returnTo);

  // Aonik answers 404 for an order that does not exist AND for one belonging to
  // someone else — by design, so the URL cannot be used to probe for other
  // customers' orders. Not-found is therefore the whole truth we have, and the
  // page must not speculate about which case it was.
  if (!order) notFound();

  const placed = formatOrderDate(order.placedAtUtc);
  const status = orderStatusLabel({ fulfilmentStatus: order.fulfilmentStatus, status: order.status });
  const { delivery, loyalty, refund } = order;
  const deliveryDay = formatDeliveryDateLong(delivery?.deliveryDate);
  const cardPaid = order.totalPence - order.giftCardPaidPence;

  return (
    <section className={styles.section} aria-labelledby="order-h">
      <Link href="/account/orders" className={styles.textLink}>
        <span aria-hidden="true">&larr;</span>
        <span>All orders</span>
      </Link>

      <div className={styles.ordTop}>
        <h2 className={styles.h2} id="order-h">
          {order.orderNumber ? `Order ${order.orderNumber}` : order.boxSize ? `Your ${order.boxSize}-dish box` : 'Your order'}
        </h2>
        <span className={styles.status} data-k={status.kind}>
          {status.label}
        </span>
      </div>

      <div className={styles.card}>
        <div className={styles.ordBody}>
          {deliveryDay ? <h3 className={styles.cardTitle}>{deliveryDay}</h3> : null}
          {delivery && delivery.addressLines.length > 0 ? (
            <p className={styles.p}>
              {delivery.recipientName ? `${delivery.recipientName}, ` : ''}
              {addressText(delivery.addressLines)}
            </p>
          ) : null}
          <p className={styles.ordMeta}>
            {order.boxSize ? <span>{order.boxSize}-dish box</span> : null}
            {placed ? <span>Placed {placed.replace(/ at \d.*$/, '')}</span> : null}
          </p>
          {delivery?.gift ? (
            <p className={styles.gift}>
              <span>{giftLine(delivery.gift, delivery.recipientName)}</span>
            </p>
          ) : null}
        </div>
      </div>

      {order.selections.length > 0 ? (
        <div className={styles.card}>
          <h3 className={styles.h3}>In this box</h3>
          <ul className={styles.dishes}>
            {order.selections.map((selection, index) => (
              <li key={`${selection.productVariantId}-${index}`}>
                <b>{selection.quantity}×</b>
                <span>
                  {/* A dish with no purchased name is shown by its code: a name
                      is never made up from it. */}
                  {selection.name ?? selection.sku}
                  {selection.isSignature ? <span className={styles.sig}>Signature</span> : null}
                  {selection.personalisationSummary ? (
                    <span className={styles.lineNote}>{selection.personalisationSummary}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.card}>
        <h3 className={styles.h3}>What you paid</h3>
        <dl className={styles.totals}>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatPriceExact(order.subtotalPence)}</dd>
          </div>
          {order.discountTotalPence > 0 ? (
            <div>
              <dt>Discount{order.discountCode ? ` (${order.discountCode})` : ''}</dt>
              <dd>&minus;{formatPriceExact(order.discountTotalPence)}</dd>
            </div>
          ) : null}
          {loyalty && loyalty.redeemedPoints > 0 ? (
            <div>
              <dt>{loyalty.redeemedPoints} points</dt>
              <dd>&minus;{formatPriceExact(loyalty.appliedValuePence)}</dd>
            </div>
          ) : null}
          {order.taxTotalPence > 0 ? (
            <div>
              <dt>Tax</dt>
              <dd>{formatPriceExact(order.taxTotalPence)}</dd>
            </div>
          ) : null}
          {order.giftCardPaidPence > 0 ? (
            <div>
              <dt>Paid with gift card</dt>
              <dd>{formatPriceExact(order.giftCardPaidPence)}</dd>
            </div>
          ) : null}
          <div className={styles.totalsGrand}>
            <dt>{order.giftCardPaidPence > 0 ? 'Paid by card' : 'Total'}</dt>
            <dd>{formatPrice(order.giftCardPaidPence > 0 ? cardPaid : order.totalPence)}</dd>
          </div>
        </dl>
        {refund && refund.totalReturnedPence > 0 ? (
          <p className={styles.p}>{formatPriceExact(refund.totalReturnedPence)} has been returned to you.</p>
        ) : null}
      </div>
    </section>
  );
}

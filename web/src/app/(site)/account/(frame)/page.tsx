import type { Metadata } from 'next';
import { PointsMilestoneLine } from '@/components/account/PointsBalance';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';

import { loadAccountOrders } from '@/lib/account/loadOrders';
import {
  orderBoxLabel,
  orderHeading,
  orderStatusLabel,
} from '@/lib/account/orders';
import { ACCOUNT_HOME_HREF } from '@/lib/account/sections';
import { getMyAddressBook } from '@/lib/aonik/addresses';
import { AonikError } from '@/lib/aonik/errors';
import { getMyLoyaltyBalance } from '@/lib/aonik/loyalty';
import { redirectToLogin, requireSignedIn } from '@/lib/auth/guard';
import { SessionExpiredError } from '@/lib/auth/server';
import { formatPrice } from '@/lib/format';

import styles from '@/components/account/Account.module.css';

export const metadata: Metadata = {
  title: "My Account — Abby's Table",
  description: 'Your orders, points and saved details.',
};

/** One customer's page, from the session cookie: never cached or prerendered. */
export const dynamic = 'force-dynamic';

/** A read the overview can do without: its card is left out, and the page carries on. */
async function optional<T>(
  read: Promise<T>,
): Promise<{ value?: T; ended: boolean }> {
  try {
    return { value: await read, ended: false };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof SessionExpiredError) return { ended: true };
    console.error(
      '[account] an overview card could not be read',
      error instanceof AonikError ? error.status : error,
    );
    return { ended: false };
  }
}

/**
 * The overview (design: My Account): points, where the box is going, and the
 * latest orders. Each card is read on its own and left out when it cannot be
 * read — never filled with a guess — so a points programme that is switched
 * off, or an address book that is down, costs its card and nothing else.
 */
export default async function AccountOverviewPage() {
  await requireSignedIn(ACCOUNT_HOME_HREF);

  const [points, addresses, orders] = await Promise.all([
    optional(getMyLoyaltyBalance()),
    optional(getMyAddressBook()),
    optional(loadAccountOrders(1)),
  ]);
  if (points.ended || addresses.ended || orders.ended)
    redirectToLogin(ACCOUNT_HOME_HREF);

  const recent = orders.value
    ? [...orders.value.upcoming, ...orders.value.past]
        .sort((a, b) => b.placedAtUtc.localeCompare(a.placedAtUtc))
        .slice(0, 3)
    : [];

  return (
    <section className={styles.section} aria-labelledby="overview-h">
      <h2 className={styles.h2} id="overview-h">
        Overview
      </h2>

      {(points.value && points.value.balancePoints > 0) || addresses.value ? (
        <div className={styles.ovwGrid}>
          {points.value && points.value.balancePoints > 0 ? (
            <div className={styles.points}>
              <span className={styles.pointsIcon} aria-hidden="true">
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" />
                </svg>
              </span>
              <span className={styles.pointsCount}>
                {points.value.balancePoints.toLocaleString('en-GB')}{' '}
                {points.value.balancePoints === 1 ? 'point' : 'points'}
              </span>
              <span className={styles.pointsWorth}>
                <PointsMilestoneLine balance={points.value} />
                <b>Worth {formatPrice(points.value.valuePence)}</b> off your
                next order. Use any amount at checkout.{' '}
                <Link
                  href="/account/points"
                  className={styles.textLink}
                  style={{ minHeight: 0 }}
                >
                  <span>How points work</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </span>
            </div>
          ) : null}

          {addresses.value ? (
            <div className={styles.card}>
              <p className={styles.h3Plain}>Delivering to</p>
              {addresses.value.defaultAddress ? (
                <p className={styles.p}>
                  {addresses.value.defaultAddress.lines.map((line, index) => (
                    <span key={`${line}-${index}`}>
                      {index > 0 ? <br /> : null}
                      {line}
                    </span>
                  ))}
                </p>
              ) : (
                <p className={styles.p}>
                  {addresses.value.addresses.length > 0
                    ? 'No default address set.'
                    : 'No saved address yet.'}
                </p>
              )}
              <Link href="/account/addresses" className={styles.textLink}>
                <span>Manage addresses</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {orders.value ? (
        <div className={styles.card}>
          <p className={styles.h3Plain}>Recent orders</p>
          {recent.length === 0 ? (
            <p className={styles.p}>Your orders will appear here.</p>
          ) : (
            <div>
              {recent.map((order) => {
                const status = orderStatusLabel(order);
                return (
                  <div className={styles.row} key={order.orderId}>
                    <Link
                      href={`/account/orders/${encodeURIComponent(order.orderId)}`}
                      className={styles.rowMain}
                    >
                      <span className={styles.rowTitle}>
                        {orderHeading(order)}
                      </span>
                      <span className={styles.rowDetail}>
                        {[order.orderNumber, orderBoxLabel(order), status.label]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      <span className={styles.rowValue}>
                        {formatPrice(order.totalPence)}
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

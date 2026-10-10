import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';

import { OrderCard, type OrderCardData } from '@/components/account/OrderCard';
import styles from '@/components/account/Account.module.css';
import type { OrderSummary } from '@/lib/aonik/orders';
import { dishCount, orderBoxLabel, orderHeading, orderStatusLabel } from '@/lib/account/orders';
import { loadAccountOrders, type AccountOrders, type OrderExtras } from '@/lib/account/loadOrders';
import { redirectToLogin, requireSignedIn } from '@/lib/auth/guard';
import { SessionExpiredError } from '@/lib/auth/server';
import { BOX_HREF } from '@/lib/content/navigation';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: "Orders — Abby's Table",
  description: 'Every box you have ordered from Abby’s Table.',
};

/**
 * This page reads a session cookie and is scoped to one customer. Caching or
 * statically generating it would mean serving one customer's history to
 * another.
 */
export const dynamic = 'force-dynamic';

interface OrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** `?page=` — anything that is not a positive integer is page 1. */
function readPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

function pageHref(page: number): string {
  return page <= 1 ? '/account/orders' : `/account/orders?page=${page}`;
}

function cardFor(order: OrderSummary, extras: OrderExtras | undefined): OrderCardData {
  return {
    number: order.orderNumber,
    status: orderStatusLabel(order),
    heading: orderHeading(order),
    address: extras?.address,
    box: orderBoxLabel(order),
    total: formatPrice(order.totalPence),
    gift: order.isGift ? (extras?.gift ?? 'Gift') : undefined,
    dishes: order.dishes,
    dishCount: dishCount(order),
    href: `/account/orders/${encodeURIComponent(order.orderId)}`,
  };
}

/** The orders could not be read: say so. The menu beside it still carries Sign out. */
function OrdersUnavailable() {
  return (
    <section className={styles.section} aria-labelledby="orders-h">
      <h2 className={styles.h2} id="orders-h">
        Orders
      </h2>
      <div className={styles.notice}>
        <h3 className={styles.cardTitle}>Your orders are unavailable right now</h3>
        <p className={styles.p}>We couldn’t load your order history. Please try again in a few minutes.</p>
        <Link href="/account/orders" className={styles.pill}>
          Try again
        </Link>
      </div>
    </section>
  );
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const requestedPage = readPage((await searchParams).page);

  // A signed-out request goes to Log in and comes back here afterwards.
  const returnTo = pageHref(requestedPage);
  await requireSignedIn(returnTo);

  let loaded: AccountOrders | undefined;
  let ended = false;
  try {
    loaded = await loadAccountOrders(requestedPage);
  } catch (error) {
    // Next's own control flow (redirect, notFound, dynamic bail-out) is never an outage.
    unstable_rethrow(error);
    if (error instanceof SessionExpiredError) {
      // A session that died between the cookie check and the call.
      ended = true;
    } else {
      console.error('[account] order history could not be read', error);
    }
  }
  if (ended) redirectToLogin(returnTo);
  if (!loaded) return <OrdersUnavailable />;

  const { history, upcoming, past, extras } = loaded;
  const { page, pageCount } = history;

  return (
    <section className={styles.section} aria-labelledby="orders-h">
      <h2 className={styles.h2} id="orders-h">
        Orders
      </h2>

      <h3 className={styles.h3}>Upcoming</h3>
      {upcoming.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.p}>No deliveries on the way.</p>
          <Link href={BOX_HREF} className={styles.pill}>
            Build a box
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {upcoming.map((order) => (
            <OrderCard key={order.orderId} order={cardFor(order, extras.get(order.orderId))} />
          ))}
        </div>
      )}

      <h3 className={styles.h3}>Past orders</h3>
      {past.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.p}>
            {page > 1 ? 'Nothing on this page.' : 'Delivered orders will appear here.'}
          </p>
          {page > 1 ? (
            <Link href={pageHref(1)} className={styles.pill}>
              Back to the first page
            </Link>
          ) : null}
        </div>
      ) : (
        <div className={styles.list}>
          {past.map((order) => (
            <OrderCard key={order.orderId} order={cardFor(order, extras.get(order.orderId))} />
          ))}
        </div>
      )}

      {pageCount > 1 ? (
        <nav className={styles.paging} aria-label="Order history pages">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={styles.pill} rel="prev">
              Previous
            </Link>
          ) : (
            <span className={styles.pageDisabled} aria-hidden="true">
              Previous
            </span>
          )}
          <span>
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={pageHref(page + 1)} className={styles.pill} rel="next">
              Next
            </Link>
          ) : (
            <span className={styles.pageDisabled} aria-hidden="true">
              Next
            </span>
          )}
        </nav>
      ) : null}
    </section>
  );
}

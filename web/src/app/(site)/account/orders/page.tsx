import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';

import { Eyebrow, SectionHeading } from '@/components/ui';
import { formatOrderDate, listMyOrders, ORDERS_PAGE_SIZE } from '@/lib/aonik/orders';
import { signOutAction } from '@/lib/auth/actions';
import { redirectToLogin, requireSignedIn } from '@/lib/auth/guard';
import { SessionExpiredError } from '@/lib/auth/server';
import { formatPrice } from '@/lib/format';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: "Your orders — Abby's Table",
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

/** The orders could not be read: say so, and keep Sign out within reach. */
function OrdersUnavailable({ email }: { email?: string | null }) {
  return (
    <div className={styles.notice}>
      <h1 className={styles.noticeHeading}>Your orders are unavailable right now</h1>
      <p className={styles.noticeBody}>
        We couldn’t load your order history. Please try again in a few minutes.
      </p>
      <div className={styles.noticeActions}>
        <Link href="/account/orders" className={styles.primary}>
          Try again
        </Link>
        <Link href="/menu" className={styles.secondary}>
          Browse the menu
        </Link>
      </div>
      <form action={signOutAction} className={styles.signOut}>
        {email ? <span className={styles.signedInAs}>Signed in as {email}</span> : null}
        <button type="submit" className={styles.signOutButton}>
          Sign out
        </button>
      </form>
    </div>
  );
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const requestedPage = readPage(params.page);

  // A signed-out request goes to Log in and comes back here afterwards.
  const returnTo = pageHref(requestedPage);
  const session = await requireSignedIn(returnTo);

  let historyPage;
  let unavailable = false;
  let ended = false;
  try {
    historyPage = await listMyOrders(requestedPage, ORDERS_PAGE_SIZE);
  } catch (error) {
    // Next's own control flow (redirect, notFound, dynamic bail-out) is
    // never an outage.
    unstable_rethrow(error);
    if (error instanceof SessionExpiredError) {
      // A session that died between the cookie check and the call.
      ended = true;
    } else {
      // An outage: still a page with Sign out on it, since this is the only
      // place the site offers it (a shared computer must never be left signed
      // in because Aonik is down).
      console.error('[account] order history could not be read', error);
      unavailable = true;
    }
  }
  if (ended) redirectToLogin(returnTo);

  if (unavailable) {
    return (
      <section className={styles.page}>
        <div className={styles.inner}>
          <OrdersUnavailable email={session.email} />
        </div>
      </section>
    );
  }

  if (!historyPage) return null;

  const { orders, totalCount, page, pageCount } = historyPage;
  const hasPrevious = page > 1;
  const hasNext = page < pageCount;

  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.intro}>
          <Eyebrow tone="brass">Your account</Eyebrow>
          <SectionHeading level={1} as="h1" className={styles.heading}>
            Your orders
          </SectionHeading>
          <p className={styles.lead}>
            {totalCount > 0
              ? `${totalCount} ${totalCount === 1 ? 'order' : 'orders'}, newest first.`
              : 'Every box you order will be listed here.'}
          </p>
        </header>

        {totalCount === 0 ? (
          <div className={styles.notice}>
            <h2 className={styles.noticeHeading}>No orders yet</h2>
            <p className={styles.noticeBody}>
              When you build a box it will appear here, with everything that was in it.
            </p>
            <div className={styles.noticeActions}>
              <Link href="/menu" className={styles.primary}>
                Browse the menu
              </Link>
            </div>
          </div>
        ) : orders.length === 0 ? (
          // A page past the end of the history — a hand-edited URL, or an order
          // list that shrank between renders.
          <div className={styles.notice}>
            <h2 className={styles.noticeHeading}>Nothing on this page</h2>
            <p className={styles.noticeBody}>
              There are only {pageCount} {pageCount === 1 ? 'page' : 'pages'} of orders.
            </p>
            <div className={styles.noticeActions}>
              <Link href={pageHref(1)} className={styles.primary}>
                Back to the first page
              </Link>
            </div>
          </div>
        ) : (
          <ul className={styles.list}>
            {orders.map((order) => {
              const placed = formatOrderDate(order.placedAtUtc);

              return (
                <li key={order.orderId} className={styles.item}>
                  <Link href={`/account/orders/${order.orderId}`} className={styles.row}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTop}>
                        {placed ? <span className={styles.placed}>{placed}</span> : null}
                        <span className={styles.status}>{order.status}</span>
                      </span>
                      <span className={styles.reference}>{order.orderId}</span>
                    </span>

                    <span className={styles.rowSide}>
                      {order.boxSize ? (
                        <span className={styles.boxSize}>{order.boxSize}-dish box</span>
                      ) : null}
                      <span className={styles.total}>{formatPrice(order.totalPence)}</span>
                    </span>

                    <svg
                      className={styles.chevron}
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
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {pageCount > 1 ? (
          <nav className={styles.paging} aria-label="Order history pages">
            {hasPrevious ? (
              <Link href={pageHref(page - 1)} className={styles.pageLink} rel="prev">
                Previous
              </Link>
            ) : (
              <span className={styles.pageLinkDisabled} aria-hidden="true">
                Previous
              </span>
            )}

            <span className={styles.pageIndicator}>
              Page {page} of {pageCount}
            </span>

            {hasNext ? (
              <Link href={pageHref(page + 1)} className={styles.pageLink} rel="next">
                Next
              </Link>
            ) : (
              <span className={styles.pageLinkDisabled} aria-hidden="true">
                Next
              </span>
            )}
          </nav>
        ) : null}

        {/* Sign out lives in the account area, never as a loose header link
            (design/CLAUDE.md, "Signed-in state" — decided 1 Oct 2026); the
            header's account slot is a plain "My Account" link (#10). My
            Account v2 (#35) moves it to the last row of the account menu.
            A form posting to a server action: the cookie is httpOnly, and it
            works before (and without) hydration. */}
        <form action={signOutAction} className={styles.signOut}>
          {session.email ? (
            <span className={styles.signedInAs}>Signed in as {session.email}</span>
          ) : null}
          <button type="submit" className={styles.signOutButton}>
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}

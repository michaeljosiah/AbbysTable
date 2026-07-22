import Link from 'next/link';

import styles from './not-found.module.css';

/**
 * The app-wide not-found page.
 *
 * It exists because `notFound()` without one renders Next's bare fallback, and
 * the most likely way a customer reaches it is not a typo — it is following
 * their own stale link to an order that is not theirs. Aonik answers a foreign
 * order id with 404 rather than 403 precisely so there is no existence oracle,
 * and this page keeps that promise: it never speculates about whether something
 * exists, only that we cannot show it.
 *
 * Rendered inside the root layout, so it carries no header — a page that may be
 * reached without a session should not depend on session-aware chrome.
 */
export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>Nothing here</span>
        <h1 className={styles.heading}>We can&rsquo;t find that page</h1>
        <p className={styles.lead}>
          The link may be old, or the page may have moved. Everything else is where you left
          it.
        </p>

        <div className={styles.actions}>
          <Link href="/menu" className={styles.primary}>
            Browse the menu
          </Link>
          <Link href="/" className={styles.secondary}>
            Back to the homepage
          </Link>
        </div>
      </section>
    </main>
  );
}

import Link from 'next/link';

import { Logo } from '@/components/brand/Logo';
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader';
import {
  CHECKOUT_FOOTER_LINKS,
  COOKIE_PREFERENCES_ITEM,
} from '@/lib/content/navigation';

import styles from './layout.module.css';

/**
 * Chrome for the box builder: stepper instead of site navigation, and a slim
 * footer carrying only order-relevant links.
 *
 * Every destination comes from `lib/content/navigation.ts`, so Delivery & FAQs
 * and Contact follow their pages there when they land (#23, #24). The footer
 * links open in the same tab: only checkout's own legal line opens the legal
 * pages in a new tab (design/CLAUDE.md, "Legal line"; `CHECKOUT_FOOTER_LINKS`).
 */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <CheckoutHeader />
      <main className={styles.main}>{children}</main>

      <footer className={styles.footer} data-purchase-bar-stop>
        <div className={styles.inner}>
          <div className={styles.top}>
            <Link href="/" aria-label="Abby's Table — home" className={styles.logoLink}>
              <Logo width={156} height={27} withRegistered={false} />
            </Link>

            <nav className={styles.nav} aria-label="Order information">
              {CHECKOUT_FOOTER_LINKS.map((link) => (
                <Link key={link.label} href={link.href} className={styles.link}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className={styles.bottom}>
            <span className={styles.legal}>
              <span className={styles.copyright}>© 2026 Abby&apos;s Table</span>
              {/* The checkout footer's © row carries the consent trigger too
                  (design/build-handoff.md §3s): a real link, enhanced into the
                  preferences panel by the consent manager. */}
              <Link
                href={COOKIE_PREFERENCES_ITEM.href}
                className={styles.cookieLink}
                data-consent-open
              >
                {COOKIE_PREFERENCES_ITEM.label}
              </Link>

            </span>
            <span className={styles.signoff}>Abby x</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

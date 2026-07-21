import Link from 'next/link';

import { Logo } from '@/components/brand/Logo';
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader';

import styles from './layout.module.css';

/**
 * Chrome for the box builder: stepper instead of site navigation, and a slim
 * footer carrying only order-relevant links.
 *
 * The template points every one of these at pages that do not exist yet, so they
 * resolve to the closest real destination rather than to dead URLs.
 */
const FOOTER_LINKS = [
  { label: 'Delivery & FAQs', href: '/#contact' },
  { label: 'Allergens', href: '/#contact' },
  { label: 'Contact Us', href: '/#contact' },
  { label: 'Privacy Policy', href: '/#contact' },
  { label: 'Terms', href: '/#contact' },
];

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <CheckoutHeader />
      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.inner}>
          <div className={styles.top}>
            <Link href="/" aria-label="Abby's Table — home" className={styles.logoLink}>
              <Logo width={176} height={30} />
            </Link>

            <nav className={styles.nav} aria-label="Order information">
              {FOOTER_LINKS.map((link) => (
                <Link key={link.label} href={link.href} className={styles.link}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className={styles.divider} />

          <div className={styles.bottom}>
            <span className={styles.help}>
              Questions about your order?{' '}
              <Link href="/#contact" className={styles.helpLink}>
                Contact us
              </Link>
            </span>
            <span className={styles.legal}>
              <span className={styles.copyright}>© 2026 Abby&apos;s Table</span>
              <span className={styles.legalDivider} aria-hidden="true" />
              <span className={styles.signoff}>Abby x</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

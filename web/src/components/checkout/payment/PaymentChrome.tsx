'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { Logo } from '@/components/brand/Logo';
import { HelpPanel, type Faq } from '@/components/checkout/HelpPanel';
import { CHECKOUT_FOOTER_LINKS, COOKIE_PREFERENCES_ITEM } from '@/lib/content/navigation';
import { NEW_TAB_NOTE } from '@/lib/legal/checkoutReturn';

import styles from './Payment.module.css';

/**
 * The payment-status pages' chrome (design/CLAUDE.md, "Payment-status pages
 * never carry an ordering CTA"): the wordmark and "Questions?" — the checkout
 * help drawer with this page's own questions — and the simplified checkout
 * footer. No navigation, no My Account, no GET STARTED / VIEW BOX, no
 * purchase bar: an order is already in progress.
 *
 * `inFlight` is Payment Processing: nothing on it navigates away from the
 * payment being confirmed, so the wordmark is not a link and every footer
 * link opens a new tab. Otherwise the wordmark goes home and the footer links
 * open in the same tab.
 */
export function PaymentChrome({
  inFlight,
  faqs,
  children,
}: {
  inFlight: boolean;
  faqs: readonly Faq[];
  children: ReactNode;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const newTab = inFlight ? { target: '_blank', rel: 'noopener' } : {};
  const mark = <Logo width={168} height={29} withRegistered={false} />;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          {inFlight ? (
            <span className={styles.mark}>{mark}</span>
          ) : (
            <Link href="/" className={styles.mark} aria-label="Abby’s Table — home">
              {mark}
            </Link>
          )}
          <button
            type="button"
            className={styles.questions}
            onClick={() => setHelpOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={helpOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brass-ink)" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.7.3-1 .8-1 1.5v.4M12 16.9h.01" />
            </svg>
            <span>Questions?</span>
          </button>
        </div>
        <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} faqs={faqs} />
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footInner}>
          <div className={styles.footTop}>
            {inFlight ? (
              <span className={styles.footLogo}>
                <Logo width={156} height={27} withRegistered={false} />
              </span>
            ) : (
              <Link href="/" className={styles.footLogo} aria-label="Abby’s Table — home">
                <Logo width={156} height={27} withRegistered={false} />
              </Link>
            )}
            <nav className={styles.footNav} aria-label="Legal and help">
              {CHECKOUT_FOOTER_LINKS.map((link) => (
                <Link key={link.label} href={link.href} className={styles.footLink} {...newTab}>
                  {link.label}
                  {inFlight ? <span className="visuallyHidden">{NEW_TAB_NOTE}</span> : null}
                </Link>
              ))}
            </nav>
          </div>
          <div className={styles.footBase}>
            <p className={styles.footLegal}>
              <span>© 2026 Abby’s Table</span>
              <Link href={COOKIE_PREFERENCES_ITEM.href} className={styles.footLink} data-consent-open>
                {COOKIE_PREFERENCES_ITEM.label}
              </Link>
            </p>
            <p className={styles.footSign}>Abby x</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

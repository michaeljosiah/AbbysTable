import Link from 'next/link';

import { Logo } from '@/components/brand/Logo';
import { SOCIAL_LINKS, STATUS_FOOTER_LINKS } from '@/lib/content/navigation';
import { SOCIAL_GLYPHS } from '@/lib/content/socialGlyphs';

import styles from './StatusChrome.module.css';

/**
 * Reduced chrome for the 500 page (design: Something Went Wrong; user
 * decision, option 2, 1 Oct 2026). The page is shown when something has
 * failed, so it carries only what is true and works then: no nav, drawer,
 * account label, GET STARTED / VIEW BOX, purchase bar, newsletter or consent
 * trigger — nothing that sends someone back into a possibly unhealthy order.
 *
 * No session, no data, no hooks: this chrome must render when the layouts
 * that read those are the thing that failed.
 */

/** Matches the site footer. Bump with the brand's copyright line, not the clock. */
const COPYRIGHT_YEAR = 2026;

/** Id of the direct-contact panel the header's "Contact us" jumps to. */
export const SUPPORT_PANEL_ID = 'status-help';

/** Wordmark (home) and, when there is a panel to jump to, "Contact us". */
export function StatusHeader({ contactJump }: { contactJump: boolean }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerRow}>
        <Link href="/" aria-label="Abby's Table — home" className={styles.logo}>
          <Logo withRegistered={false} />
        </Link>

        {contactJump ? (
          // An in-page jump, so it works with no JavaScript and no server.
          <a href={`#${SUPPORT_PANEL_ID}`} className={styles.contact}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="5.5" width="18" height="13" rx="2" />
              <path d="m3.5 7 8.5 6 8.5-6" />
            </svg>
            <span>Contact us</span>
          </a>
        ) : null}
      </div>
    </header>
  );
}

/**
 * The simplified footer with social links (user, 1 Oct 2026): brass rule,
 * wordmark, help and legal links, the four socials, © and "Abby x". No
 * Allergens and no Cookie preferences — no consent manager runs here.
 */
export function StatusFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <Link href="/" aria-label="Abby's Table — home" className={styles.footerLogo}>
          <Logo withRegistered={false} />
        </Link>

        <nav className={styles.footerNav} aria-label="Help and legal">
          {STATUS_FOOTER_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={styles.footerLink}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.socials}>
          {SOCIAL_LINKS.map(({ network, label, href }) => {
            const glyph = SOCIAL_GLYPHS[network];
            return (
              <a
                key={network}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={styles.social}
              >
                <svg width="20" height="20" viewBox={glyph.viewBox} aria-hidden="true">
                  <path d={glyph.path} fill="currentColor" />
                </svg>
              </a>
            );
          })}
        </div>

        <div className={styles.footerBase}>
          <p className={styles.legal}>© {COPYRIGHT_YEAR} Abby&rsquo;s Table</p>
          <p className={styles.signoff}>Abby x</p>
        </div>
      </div>
    </footer>
  );
}

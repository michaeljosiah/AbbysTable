'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { signOutAction } from '@/lib/auth/actions';
import { ACCOUNT_SECTIONS, currentSection } from '@/lib/account/sections';

import styles from './Account.module.css';

const CHEVRON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/**
 * The account menu (design: My Account): one nav, a row per section with the
 * current one marked, and Sign out as the last row — the only place the site
 * offers it (decided 1 Oct 2026; never a loose header link). Sign out is a
 * form posting to a server action: the session cookie is httpOnly, and it
 * works before (and without) hydration.
 */
export function AccountNav() {
  const here = currentSection(usePathname());

  return (
    <nav className={styles.nav} aria-label="Account">
      <div className={styles.navCard}>
        <p className={styles.navHeading}>Your account</p>
        <ul>
          {ACCOUNT_SECTIONS.map((section) => (
            <li key={section.key}>
              <Link
                href={section.href}
                className={styles.navLink}
                aria-current={here?.key === section.key ? 'page' : undefined}
              >
                <span className={styles.navText}>{section.label}</span>
                <span className={styles.navChevron}>{CHEVRON}</span>
              </Link>
            </li>
          ))}
        </ul>
        <form action={signOutAction} className={styles.navOut}>
          <button type="submit" className={styles.navLink}>
            <span className={`${styles.navText} ${styles.navOutText}`}>Sign out</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

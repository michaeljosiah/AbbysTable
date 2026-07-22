import Link from 'next/link';
import type { ReactNode } from 'react';

import { Logo } from '@/components/brand/Logo';

import styles from './layout.module.css';

/**
 * Auth chrome: a quiet page with just the wordmark and a way back. The pages
 * themselves compose the split brand-panel + form shell.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Abby's Table — home" className={styles.logoLink}>
          <Logo className={styles.logo} />
        </Link>
        <Link href="/" className={styles.back}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back to the table
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { ACCOUNT_HOME_HREF, isOverviewPath } from '@/lib/account/sections';

import styles from './Account.module.css';

/**
 * The body grid: the menu beside the section. On a phone the menu IS the
 * overview (design: My Account) — shown on `/account` and hidden inside a
 * section, where a "← Back to My Account" link takes its place; from 1024 the
 * menu is a permanent sidebar and the link is gone. Only the current path is
 * read here; the menu, the section and the help panel arrive as server-rendered
 * nodes.
 */
export function AccountView({ nav, help, children }: { nav: ReactNode; help: ReactNode; children: ReactNode }) {
  const overview = isOverviewPath(usePathname());

  return (
    <div className={styles.layout} data-view={overview ? 'overview' : 'section'}>
      {nav}
      <div className={styles.main}>
        {overview ? null : (
          <Link href={ACCOUNT_HOME_HREF} className={styles.back}>
            <span aria-hidden="true">&larr;</span>
            <span>Back to My Account</span>
          </Link>
        )}
        {children}
        {help}
      </div>
    </div>
  );
}

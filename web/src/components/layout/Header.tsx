'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

import { Logo } from '@/components/brand/Logo';
import { Button, NavLink } from '@/components/ui';
import type { SessionView } from '@/lib/auth/session';
import { NAV_ITEMS } from '@/lib/content/navigation';

import { AccountMenu } from './AccountMenu';
import { MobileDrawer } from './MobileDrawer';
import styles from './Header.module.css';

/**
 * Sticky site header. Below 1040px the nav collapses into the burger-triggered
 * drawer and the Order CTA shrinks to a compact pill.
 *
 * The session arrives as a prop from the layout rather than being read here:
 * this is a Client Component, and the session cookie is httpOnly by design.
 */
export function Header({ session }: { session: SessionView }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.row}>
          <button
            type="button"
            className={styles.burger}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
          >
            <span />
            <span />
            <span />
          </button>

          <Link href="/" aria-label="Abby's Table — home" className={styles.logoLink}>
            <Logo width={186} height={32} />
          </Link>

          <nav className={styles.desktopNav} aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                href={item.href}
                // Only route links can be "current"; on-page anchors never are.
                active={!item.href.startsWith('/#') && pathname === item.href}
                className={styles.navLink}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.actions}>
            <AccountMenu session={session} linkClassName={styles.navLink} />
            <Button variant="primary" size="sm" href="/menu">
              Order
            </Button>
          </div>

          <Link href="/menu" className={styles.basket}>
            Order
          </Link>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}

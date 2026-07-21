'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

import { Logo } from '@/components/brand/Logo';
import { Button, NavLink } from '@/components/ui';
import { LOGIN_ITEM, NAV_ITEMS } from '@/lib/content/navigation';

import { MobileDrawer } from './MobileDrawer';
import styles from './Header.module.css';

/**
 * Sticky site header. Below 1040px the nav collapses into the burger-triggered
 * drawer and the Order CTA shrinks to a compact pill.
 */
export function Header() {
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
            <NavLink href={LOGIN_ITEM.href} className={styles.navLink}>
              {LOGIN_ITEM.label}
            </NavLink>
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

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
 * Sticky site header.
 *
 * Below 1240px the nav collapses into the burger-triggered drawer and the row
 * re-forms around a centred wordmark, with the burger and the Order button
 * pinned to the edges. The threshold is set by the nav itself: seven links plus
 * the wordmark and the Order button need roughly 1225px, so the drawer takes
 * over before they can collide.
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
            {/* Sized from .logoLink, not inline: the mark steps down four
                times on the way to 344px, and an inline value would outrank
                every one of those media queries. */}
            <Logo withRegistered={false} />
            <span className={styles.strapline}>
              Nigerian fusion food{' '}
              <span className={styles.straplineDot} aria-hidden="true">
                ·
              </span>{' '}
              Well made
            </span>
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
            <span className={styles.identity}>
              <AccountMenu session={session} linkClassName={styles.navLink} />
            </span>
            <Button variant="primary" size="sm" href="/menu" className={styles.order}>
              Order
            </Button>
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}

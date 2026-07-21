'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Logo } from '@/components/brand/Logo';
import { SocialIcons } from '@/components/brand/SocialIcons';
import { LOGIN_ITEM, NAV_ITEMS } from '@/lib/content/navigation';

import styles from './MobileDrawer.module.css';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_LINKS = [...NAV_ITEMS, LOGIN_ITEM];

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape and lock the page behind the drawer while it is open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={styles.overlay}
        data-open={open || undefined}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="mobile-drawer"
        className={styles.panel}
        data-open={open || undefined}
        aria-label="Main menu"
        // Keeps the whole subtree out of the tab order and the a11y tree while
        // closed; it stays in the DOM so the panel can transition rather than pop.
        inert={!open}
      >
        <div className={styles.head}>
          <Logo width={150} height={26} withRegistered={false} className={styles.logo} />
          <button ref={closeButtonRef} type="button" onClick={onClose} className={styles.close} aria-label="Close menu">
            ×
          </button>
        </div>

        <nav className={styles.nav}>
          {DRAWER_LINKS.map((item) => (
            <Link key={item.label} href={item.href} className={styles.link} onClick={onClose}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.foot}>
          <SocialIcons className={styles.social} />
        </div>
      </aside>
    </>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Logo } from '@/components/brand/Logo';
import { SocialIcons } from '@/components/brand/SocialIcons';
import type { SessionView } from '@/lib/auth/session';
import { ACCOUNT_ITEM, LOGIN_ITEM, NAV_ITEMS } from '@/lib/content/navigation';
import { OVERLAY_OPEN_ATTR } from '@/lib/dom/documentFlag';
import { useDocumentFlag } from '@/lib/dom/hooks';

import styles from './MobileDrawer.module.css';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The same session the header's account menu reads, handed down by `Header`. */
  session: SessionView;
}

export function MobileDrawer({ open, onClose, session }: MobileDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // The last link is the account slot: "My Account" for a signed-in customer,
  // "Login" otherwise — the drawer's half of what `AccountMenu` does above it.
  const links = [...NAV_ITEMS, session.isSignedIn ? ACCOUNT_ITEM : LOGIN_ITEM];

  // Tells the page an overlay is up, without either side knowing the other:
  // bottom-fixed chrome such as the mobile purchase bar yields to it
  // (globals.css, `data-overlay-yield`).
  useDocumentFlag(OVERLAY_OPEN_ATTR, open);

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
          {links.map((item) => (
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

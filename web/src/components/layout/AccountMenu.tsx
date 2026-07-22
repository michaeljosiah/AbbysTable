'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { signOutAction } from '@/lib/auth/actions';
import type { SessionView } from '@/lib/auth/session';

import styles from './AccountMenu.module.css';

/**
 * The header's identity slot: "Login" when signed out, a small account menu
 * when signed in.
 *
 * Takes a `SessionView`, which carries `isSignedIn` and an optional email and
 * deliberately no token — there is nothing here to leak even though this runs
 * in the browser.
 *
 * Sign-out is a form posting to a server action rather than a fetch: the cookie
 * is httpOnly, so only the server can clear it, and a form works before (and
 * without) hydration.
 */
export function AccountMenu({
  session,
  className,
  linkClassName,
}: {
  session: SessionView;
  className?: string;
  /** So the header can pass its own nav-link styling to the signed-out state. */
  linkClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape — a menu that traps the page is worse
  // than no menu.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!session.isSignedIn) {
    return (
      <Link href="/login" className={linkClassName}>
        Login
      </Link>
    );
  }

  return (
    <div className={`${styles.wrap} ${className ?? ''}`} ref={container}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className={styles.avatar} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.4" />
            <path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" />
          </svg>
        </span>
        <span className={styles.label}>Account</span>
        <svg className={styles.chevron} data-open={open || undefined} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className={styles.menu} role="menu">
          {session.email ? (
            <p className={styles.email} title={session.email}>
              {session.email}
            </p>
          ) : null}

          <Link href="/account/orders" className={styles.item} role="menuitem" onClick={() => setOpen(false)}>
            My orders
          </Link>

          <form action={signOutAction}>
            <button type="submit" className={styles.item} role="menuitem">
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

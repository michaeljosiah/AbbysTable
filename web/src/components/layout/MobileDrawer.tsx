'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Logo } from '@/components/brand/Logo';
import { SocialIcons } from '@/components/brand/SocialIcons';
import type { SessionView } from '@/lib/auth/session';
import { useCart } from '@/lib/cart/CartProvider';
import { NAV_ITEMS } from '@/lib/content/navigation';
import { OVERLAY_OPEN_ATTR } from '@/lib/dom/documentFlag';
import { trapFocus } from '@/lib/dom/focusTrap';
import { useDocumentFlag } from '@/lib/dom/hooks';
import { DESKTOP_QUERY } from '@/lib/site-header/visibility';
import { accountItem, ariaCurrentFor, drawerOrderCta } from '@/lib/site-header/state';

import styles from './MobileDrawer.module.css';

export interface CloseDrawerOptions {
  /** Back to the burger (the default). Off when the burger has gone (desktop). */
  returnFocus?: boolean;
}

interface MobileDrawerProps {
  /** The panel's id — the burger's `aria-controls`. */
  id: string;
  open: boolean;
  onClose: (options?: CloseDrawerOptions) => void;
  /** The same session the header reads, handed down by `Header`. */
  session: SessionView;
  pathname: string | null;
}

/**
 * The v2 mobile drawer (Homepage v2, approved): wordmark + close, Log in / My
 * Account, a hairline, the header's links, a full-width BUILD A BOX pill (VIEW
 * BOX while a box is active), a hairline and the social row.
 *
 * ALWAYS MOUNTED and closed with `display: none` (design/CLAUDE.md), so the
 * burger's `aria-controls` always resolves and a shut drawer is out of the
 * accessibility tree and the tab order; the slide-in replays on each open.
 *
 * A real modal dialog (behaviour guide §A6): focus moves to Close on open,
 * Tab is trapped inside, Escape closes, the page behind does not scroll, and
 * focus returns to the burger. It is a phone and tablet affordance only — at
 * 1024 the burger goes, so the drawer closes itself.
 *
 * While open it holds `data-overlay-open` on <html>: the mobile purchase bar
 * yields to it (globals.css), and the header never hides under it.
 */
export function MobileDrawer({ id, open, onClose, session, pathname }: MobileDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const account = accountItem(session);
  const cta = drawerOrderCta(useCart());

  useDocumentFlag(OVERLAY_OPEN_ATTR, open);

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // The panel left `display: none` in this commit, so Close can take focus
    // now; one more frame covers a browser that has not laid it out yet.
    // Close, not the first link: a fixed position in the panel.
    closeRef.current?.focus();
    const frame = requestAnimationFrame(() => {
      if (!panel.contains(document.activeElement)) closeRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Tab') {
        trapFocus(event, panel);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onBreakpoint = () => {
      if (desktop.matches) onClose({ returnFocus: false });
    };
    desktop.addEventListener('change', onBreakpoint);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onBreakpoint);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const close = () => onClose();

  return (
    <div className={styles.wrap} data-open={open || undefined}>
      <div className={styles.scrim} onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        id={id}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
      >
        <div className={styles.top}>
          <Link href="/" aria-label="Abby's Table — home" className={styles.logo} onClick={close}>
            <Logo withRegistered={false} />
          </Link>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={close}
            aria-label="Close menu"
          >
            {/* An SVG cross, never a text ×: one that strokes and sizes the
                same everywhere (design/CLAUDE.md, "Close controls"). */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* "Log in", or "My Account" once signed in (#7): the session is the
            server's, read in SiteChrome. */}
        <Link
          href={account.href}
          className={`${styles.link} ${styles.account}`}
          aria-current={ariaCurrentFor(pathname, account.href)}
          onClick={close}
        >
          {account.label}
        </Link>
        <span className={styles.rule} aria-hidden="true" />

        <nav className={styles.nav} aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.link}
              aria-current={ariaCurrentFor(pathname, item.href)}
              onClick={close}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* "Build a Box" — never the header's "Get started" (design/CLAUDE.md,
            "Canonical copy") — and VIEW BOX once a box is active, as the
            header pill and the purchase bar switch (`drawerOrderCta`). */}
        <Link
          href={cta.href}
          className={styles.cta}
          data-continuing={cta.continuing || undefined}
          onClick={close}
        >
          {cta.label}
        </Link>

        <div className={styles.foot}>
          <SocialIcons size={20} className={styles.social} />
        </div>
      </div>
    </div>
  );
}

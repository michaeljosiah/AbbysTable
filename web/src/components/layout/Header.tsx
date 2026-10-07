'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { Logo } from '@/components/brand/Logo';
import type { SessionView } from '@/lib/auth/session';
import { useCart } from '@/lib/cart/CartProvider';
import { NAV_ITEMS } from '@/lib/content/navigation';
import { hasKeyboardFocusWithin, isKeyboardFocused } from '@/lib/dom/keyboardFocus';
import { readPageScroll, subscribePageScroll } from '@/lib/dom/pageScroll';
import {
  ANCHOR_JUMP_HOLD_MS,
  ANCHOR_JUMP_TAIL_MS,
  autoHidesOnDesktop,
  DESKTOP_QUERY,
  initialDesktopHeader,
  isHeaderHidden,
  isInPageJump,
  nextDesktopHeader,
} from '@/lib/site-header/visibility';
import { accountItem, ariaCurrentFor, headerOrderCta } from '@/lib/site-header/state';

import { MobileDrawer, type CloseDrawerOptions } from './MobileDrawer';
import styles from './Header.module.css';

/** The drawer's id: the burger's `aria-controls`, which always resolves. */
const DRAWER_ID = 'site-drawer';

/**
 * The v2 marketing header (Homepage v2 — the canonical, approved header).
 *
 * Phone and tablet: burger, centred wordmark, the order pill. From 1024: the
 * wordmark left, the five links centred, then Log in / My Account and the
 * pill. No strapline, no search, no basket, no promo strip.
 *
 * - The order pill reads GET STARTED, and VIEW BOX once a box is active — the
 *   purchase bar's rule (`headerOrderCta`), so the two never disagree.
 * - "Log in" becomes "My Account" for a signed-in customer. The session
 *   arrives as a prop from `SiteChrome`: this is a Client Component, and the
 *   session cookie is httpOnly by design.
 * - The current page is marked in the nav (`aria-current`), styled with ink,
 *   weight and a brass rule — never colour alone.
 * - It hides on scroll (`useHeaderHidden`; the rules are
 *   lib/site-header/visibility.ts): on a phone on every page as the page
 *   scrolls down, and from 1024 only on the marketing pages.
 *
 * `data-site-header` is the scroll tracker's focus guard: the page never counts
 * as scrolling down while keyboard focus is in here.
 */
export function Header({ session }: { session: SessionView }) {
  const pathname = usePathname();
  const cart = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(({ returnFocus = true }: CloseDrawerOptions = {}) => {
    setDrawerOpen(false);
    // Straight back to the control that opened it (behaviour guide §A6).
    if (returnFocus) burgerRef.current?.focus({ preventScroll: true });
  }, []);

  // A route change underneath an open drawer (Back, Forward) closes it, without
  // pulling focus to the burger on the page just arrived at.
  useEffect(() => {
    closeDrawer({ returnFocus: false });
  }, [pathname, closeDrawer]);

  const hidden = useHeaderHidden(headerRef, drawerOpen, autoHidesOnDesktop(pathname));
  useHeaderOffset(headerRef, hidden);
  const account = accountItem(session);
  const cta = headerOrderCta(cart);

  return (
    <>
      <header
        ref={headerRef}
        className={styles.header}
        data-site-header=""
        data-hidden={hidden || undefined}
      >
        <div className={styles.row}>
          <button
            ref={burgerRef}
            type="button"
            className={styles.burger}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls={DRAWER_ID}
          >
            <span className={styles.burgerIcon} aria-hidden="true" />
          </button>

          <Link href="/" aria-label="Abby's Table — home" className={styles.logo}>
            {/* Sized from .logo (`--logo-width`/`--logo-height`), not inline,
                so the clamp can follow the viewport. No ® on the wordmark. */}
            <Logo withRegistered={false} />
          </Link>

          <nav className={styles.nav} aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={styles.navLink}
                aria-current={ariaCurrentFor(pathname, item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href={account.href}
            className={styles.login}
            aria-current={ariaCurrentFor(pathname, account.href)}
          >
            <span>{account.label}</span>
          </Link>

          <Link
            href={cta.href}
            className={styles.cta}
            data-continuing={cta.continuing || undefined}
          >
            {cta.label}
          </Link>
        </div>
      </header>

      <MobileDrawer
        id={DRAWER_ID}
        open={drawerOpen}
        onClose={closeDrawer}
        session={session}
        pathname={pathname}
      />
    </>
  );
}

/**
 * Whether the header is moved out of view, following the page's scroll.
 *
 * Below 1024 it reads the shared scroll direction (`lib/dom/pageScroll.ts`),
 * the same one the mobile purchase bar follows. From 1024 it runs the desktop
 * hysteresis (40px to hide, 64px to reveal, never within its own height of the
 * top) — on the marketing routes only. Keyboard focus inside the header shows
 * it; so does an open drawer. A same-page anchor jump on desktop keeps it out
 * of the way for 450ms so it cannot cover the target.
 */
function useHeaderHidden(
  headerRef: RefObject<HTMLElement | null>,
  drawerOpen: boolean,
  autoHides: boolean,
): boolean {
  const [hidden, setHidden] = useState(false);
  // Read by the long-lived listeners below, so a change re-decides without
  // re-subscribing (which would reset the shared direction under the bar).
  const inputs = useRef({ drawerOpen, autoHides });
  const refresh = useRef<() => void>(() => {});

  useEffect(() => {
    inputs.current = { drawerOpen, autoHides };
    refresh.current();
  }, [drawerOpen, autoHides]);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    let wasDesktop = desktop.matches;
    let desk = initialDesktopHeader(window.scrollY);
    let jumpUntil = 0;

    const decide = (moved: boolean) => {
      const header = headerRef.current;
      const scroll = readPageScroll();
      if (!header || !scroll) return;

      // Keyboard focus only (`hasKeyboardFocusWithin`): a pointer click that
      // leaves focus in the header must not pin it shown.
      const focusInside = hasKeyboardFocusWithin(header);
      if (desktop.matches !== wasDesktop) {
        // Crossing the breakpoint starts the desktop regime afresh.
        wasDesktop = desktop.matches;
        desk = initialDesktopHeader(scroll.y);
      }
      // A smooth anchor jump can outlast the hold: keep it while the page is
      // still moving, and let it lapse a moment after the scroll stops.
      if (moved && Date.now() < jumpUntil) {
        jumpUntil = Math.max(jumpUntil, Date.now() + ANCHOR_JUMP_TAIL_MS);
      }
      if (moved && desktop.matches && inputs.current.autoHides) {
        desk = nextDesktopHeader(desk, scroll.y, {
          headerHeight: header.offsetHeight,
          focusInside,
          jumping: Date.now() < jumpUntil,
        });
      }

      setHidden(
        isHeaderHidden({
          desktop: desktop.matches,
          autoHidesOnDesktop: inputs.current.autoHides,
          desktopHidden: desk.hidden,
          down: scroll.direction.down,
          drawerOpen: inputs.current.drawerOpen,
          focusInside,
        }),
      );
    };

    const unsubscribe = subscribePageScroll((change) => {
      if (change === 'page') decide(true);
    });
    const recheck = () => decide(false);
    refresh.current = recheck;

    // Focus arriving in the header reveals it at desktop (the scroll tracker
    // does the same for the phone direction); leaving it re-decides.
    const onFocus = (event: FocusEvent) => {
      const header = headerRef.current;
      if (!header || !(event.target instanceof Node) || !header.contains(event.target)) return;
      const keyboard = event.type === 'focusin' && event.target instanceof Element && isKeyboardFocused(event.target);
      if (keyboard && desktop.matches) desk = { hidden: false, turn: readPageScroll()?.y ?? window.scrollY };
      recheck();
    };

    // A same-page anchor jump on desktop: keep the header out of the way.
    const onClick = (event: MouseEvent) => {
      if (!desktop.matches || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href*="#"]') : null;
      if (!anchor || headerRef.current?.contains(anchor)) return;
      if (isInPageJump(anchor.getAttribute('href') ?? '', window.location)) {
        jumpUntil = Date.now() + ANCHOR_JUMP_HOLD_MS;
      }
    };
    const onHashChange = () => {
      if (desktop.matches && window.location.hash.length > 1) {
        jumpUntil = Date.now() + ANCHOR_JUMP_HOLD_MS;
      }
    };

    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onFocus);
    document.addEventListener('click', onClick, true);
    window.addEventListener('hashchange', onHashChange);
    desktop.addEventListener('change', recheck);
    recheck();

    return () => {
      unsubscribe();
      refresh.current = () => {};
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onFocus);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('hashchange', onHashChange);
      desktop.removeEventListener('change', recheck);
    };
  }, [headerRef]);

  return hidden;
}

/**
 * Publishes how much of the top of the viewport the header covers right now —
 * its measured height while shown, 0 while it is moved out of view — as
 * `--site-header-offset` on <html>, for anything that sticks under it (the
 * /menu filter band). Measured, not restated: the row is 65px on a phone, 73
 * from 640 and 81 from 1024. Removed with the header.
 */
function useHeaderOffset(headerRef: RefObject<HTMLElement | null>, hidden: boolean) {
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const write = () =>
      root.style.setProperty('--site-header-offset', `${hidden ? 0 : header.offsetHeight}px`);
    write();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(write);
    observer?.observe(header);
    return () => observer?.disconnect();
  }, [headerRef, hidden]);

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty('--site-header-offset');
    },
    [],
  );
}

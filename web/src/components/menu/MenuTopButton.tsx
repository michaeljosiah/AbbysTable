'use client';

import { useEffect, useState } from 'react';

import { readPageScroll, subscribePageScroll } from '@/lib/dom/pageScroll';
import { MENU_BAND_ATTR, MENU_TITLE_ID } from '@/lib/menu/constants';
import { nextTopShown } from '@/lib/menu/topControl';
import { scrollerView, SITE_HEADER_ATTR } from '@/lib/purchase-bar/visibility';
import { DESKTOP_QUERY } from '@/lib/site-header/visibility';

import styles from './MenuTopButton.module.css';

/**
 * "↑ Top" (Menu Landing v3, `.mn-top`) — a navigation utility, not a CTA:
 * cream ground, green ink, a hairline and a restrained shadow, so it stays
 * subordinate to Build a Box.
 *
 * When it shows is `lib/menu/topControl.ts` (scroll position, two thresholds).
 * It returns the reader to the page heading less the sticky header — never
 * `scrollY = 0` — and moves focus to the h1, so Tab resumes from the top
 * rather than at the foot of the page. Reduced motion jumps.
 *
 * z-index 75: above the purchase bar (70), below the drawer, the filter sheet
 * and consent — all of which suppress it (`data-overlay-yield`,
 * `data-consent-yield`). On a phone it floats 14px above the purchase bar
 * while the bar is in (`data-purchase-bar-shown`, `--at-bar-h`) and drops to
 * the viewport edge when the bar retracts.
 */
export function MenuTopButton({ label = 'Back to top of menu' }: { label?: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const desktop = window.matchMedia(DESKTOP_QUERY);

    // Measured against what the reader can see: the window, or the ancestor
    // the shared tracker follows when one holds the page (as the purchase bar).
    const view = () => {
      const scroller = readPageScroll()?.scroller;
      return scroller?.isConnected
        ? scrollerView(scroller.getBoundingClientRect().top + scroller.clientTop, scroller.clientHeight, window.innerHeight)
        : { top: 0, height: window.innerHeight };
    };

    const evaluate = () => {
      frame = 0;
      const band = document.querySelector(`[${MENU_BAND_ATTR}]`);
      const firstCard = document.querySelector('[data-menu-grid] > li');
      const { top, height } = view();
      setShown((was) =>
        nextTopShown(was, {
          desktop: desktop.matches,
          bandTop: band ? band.getBoundingClientRect().top - top : null,
          firstCardBottom: firstCard ? firstCard.getBoundingClientRect().bottom - top : null,
          viewportHeight: height,
        }),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(evaluate);
    };

    const unsubscribe = subscribePageScroll(schedule);
    window.addEventListener('resize', schedule);
    // A reload can restore a deep scroll position: decide now, not on the first scroll.
    schedule();

    return () => {
      unsubscribe();
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  const goTop = () => {
    const title = document.getElementById(MENU_TITLE_ID);
    const hero = title?.closest('section') ?? title;
    const header = document.querySelector<HTMLElement>(`[${SITE_HEADER_ATTR}]`);
    // The header comes back on the way up, so the heading clears its full height.
    const headerHeight = header?.offsetHeight ?? 0;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    // The page may scroll in an ancestor rather than the window (a host
    // preview, an embed): move whichever the shared tracker follows.
    const scroller = readPageScroll()?.scroller;
    if (scroller instanceof HTMLElement) {
      const top = hero
        ? hero.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - headerHeight
        : 0;
      scroller.scrollTo({ top: Math.max(0, top), behavior });
    } else {
      const top = hero ? hero.getBoundingClientRect().top + window.scrollY - headerHeight : 0;
      window.scrollTo({ top: Math.max(0, top), behavior });
    }
    title?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      className={styles.top}
      data-on={shown || undefined}
      data-overlay-yield=""
      data-consent-yield=""
      inert={!shown}
      onClick={goTop}
      aria-label={label}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
      <span>Top</span>
    </button>
  );
}

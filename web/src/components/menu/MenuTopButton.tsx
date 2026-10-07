'use client';

import { useEffect, useState } from 'react';

import { subscribePageScroll } from '@/lib/dom/pageScroll';
import { MENU_BAND_ATTR, MENU_TITLE_ID } from '@/lib/menu/constants';
import { nextTopShown } from '@/lib/menu/topControl';
import { SITE_HEADER_ATTR } from '@/lib/purchase-bar/visibility';
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
export function MenuTopButton() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const desktop = window.matchMedia(DESKTOP_QUERY);

    const evaluate = () => {
      frame = 0;
      const band = document.querySelector(`[${MENU_BAND_ATTR}]`);
      const firstCard = document.querySelector('[data-menu-grid] > li');
      setShown((was) =>
        nextTopShown(was, {
          desktop: desktop.matches,
          bandTop: band ? band.getBoundingClientRect().top : null,
          firstCardBottom: firstCard ? firstCard.getBoundingClientRect().bottom : null,
          viewportHeight: window.innerHeight,
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
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const top = hero ? hero.getBoundingClientRect().top + window.scrollY - headerHeight : 0;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
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
      aria-label="Back to top of menu"
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

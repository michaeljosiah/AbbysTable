'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

import { holdDocumentFlag, PURCHASE_BAR_ATTR } from '@/lib/dom/documentFlag';
import {
  firstStopTop,
  hasScrolledPast,
  initialDirection,
  isSuppressed,
  nextDirection,
  REVEAL_ATTR,
  shouldShowBar,
  SITE_HEADER_ATTR,
  STOP_ATTR,
} from '@/lib/purchase-bar/visibility';

import styles from './PurchaseBar.module.css';

/**
 * The mobile purchase bar's band and behaviour, with the content supplied by
 * the variant: `MobilePurchaseBar` (Build a Box / the active box), the dish
 * page's `DishPurchaseBar`, and Private Table's waitlist bar (#25).
 *
 * A page OPTS IN by rendering a bar — there is no site-wide default, because
 * the design decides per page: Abby's Story, Gifting, Delivery & FAQs,
 * Contact, Allergens and the legal pages carry none, and the checkout and
 * auth routes have their own chrome. The page then marks two things:
 *  - `data-purchase-bar-reveal` on its own purchase CTA (or title band) — the
 *    bar waits until that has been scrolled past;
 *  - `data-purchase-bar-stop` on any band the bar must not sit over, from its
 *    top to the end of the page. The footer always carries one.
 * The rules are `lib/purchase-bar/visibility.ts`.
 *
 * Hidden (scroll-retracted, suppressed, drawer or sheet open, consent
 * unresolved) means gone from the tab order and the accessibility tree, not
 * just moved off-screen: `inert` plus `visibility: hidden` here, and the
 * `data-overlay-yield` / `data-consent-yield` rules in globals.css.
 */
interface PurchaseBarShellProps {
  children: ReactNode;
  /** `split`: text block left, CTA right. `centre`: a lone centred CTA. */
  layout?: 'split' | 'centre';
  /**
   * Whether scroll direction gates the bar (the canonical rule). Dish Landing
   * v2 is the one design whose bar ignores it: once the inline CTA has been
   * scrolled past, its bar stays until the footer.
   */
  followsDirection?: boolean;
}

export function PurchaseBarShell({
  children,
  layout = 'split',
  followsDirection = true,
}: PurchaseBarShellProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const on = useBarVisibility(followsDirection);
  useBarHeight(barRef);

  return (
    <div
      ref={barRef}
      className={styles.bar}
      data-layout={layout}
      data-on={on || undefined}
      data-consent-yield=""
      data-overlay-yield=""
      inert={!on}
    >
      {children}
    </div>
  );
}

/** The page's scroll state through the rules, re-read once per frame. */
function useBarVisibility(followsDirection: boolean): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let direction = initialDirection(window.scrollY);
    let frame = 0;

    // Queried from the document on every pass, never held: a held node can be
    // a detached one after a re-render, and a detached node has no layout.
    const evaluate = () => {
      frame = 0;
      const header = document.querySelector(`[${SITE_HEADER_ATTR}]`);
      direction = nextDirection(direction, window.scrollY, {
        holdDown: Boolean(header?.contains(document.activeElement)),
      });

      const reveal = document.querySelector(`[${REVEAL_ATTR}]`);
      const revealed = hasScrolledPast(
        reveal && reveal.getClientRects().length > 0 ? reveal.getBoundingClientRect() : null,
      );

      const tops: number[] = [];
      document.querySelectorAll(`[${STOP_ATTR}]`).forEach((stop) => {
        if (stop.getClientRects().length > 0) tops.push(stop.getBoundingClientRect().top);
      });
      const suppressed = isSuppressed(firstStopTop(tops), window.innerHeight);

      setOn(shouldShowBar({ revealed, down: direction.down, suppressed, followsDirection }));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(evaluate);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    // Again once images and fonts have settled the layout under the markers.
    const settle = window.setTimeout(schedule, 500);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
    };
  }, [followsDirection]);

  return on;
}

/**
 * Measures the bar into `--at-bar-h` (design/CLAUDE.md, "Measured, not
 * restated"): its height depends on its content and grows when the price label
 * wraps at 320. Deduped and deferred to a frame — writing from inside the
 * observer can change the page height, flip the scrollbar, resize this
 * full-width bar and re-fire the observer. Never writes a zero: from 1024 the
 * bar is `display: none` and the last mobile value simply goes unused.
 *
 * While mounted the bar also holds `data-purchase-bar` on <html>, so focus
 * scrolling keeps clear of it (globals.css); both go when the page does, so a
 * page without a bar never inherits a stale clearance.
 */
function useBarHeight(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const root = document.documentElement;
    let last = 0;
    let frame = 0;

    const write = () => {
      frame = 0;
      const height = bar.offsetHeight;
      if (!height || height === last) return;
      last = height;
      root.style.setProperty('--at-bar-h', `${height}px`);
    };

    write();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(write);
          });
    observer?.observe(bar);
    const release = holdDocumentFlag(PURCHASE_BAR_ATTR);

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      root.style.removeProperty('--at-bar-h');
      release();
    };
  }, [ref]);
}

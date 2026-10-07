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
  const on = useBarVisibility(barRef, followsDirection);
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

/**
 * The page's scroll state through the rules, re-read once per frame.
 *
 * Scroll is heard on the document in the CAPTURE phase, not on window alone
 * (design/CLAUDE.md, Choose Box "Bar suppression"): when an ancestor container
 * does the scrolling — a host preview, an embedded frame — window `scroll`
 * never fires and `window.scrollY` stays 0. The position is then read from
 * that container. Scrolls inside an element that does not hold the bar (a
 * dish rail, a sheet's list) only trigger a re-read: they are not the page
 * moving, so they never count towards the direction. The markers are then
 * measured against that container's visible box rather than the window's, so
 * a CTA it has clipped counts as passed and the footer line sits where the
 * reader can see it.
 */
function useBarVisibility(
  barRef: RefObject<HTMLDivElement | null>,
  followsDirection: boolean,
): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let y = window.scrollY;
    let direction = initialDirection(y);
    let frame = 0;
    /** The ancestor doing the scrolling, or null while the window does. */
    let scroller: Element | null = null;

    /** The visible area the markers are measured against, in viewport terms. */
    const view = () => {
      if (!scroller?.isConnected) return { top: 0, height: window.innerHeight };
      const box = scroller.getBoundingClientRect();
      const top = Math.max(0, box.top + scroller.clientTop);
      const bottom = Math.min(window.innerHeight, box.top + scroller.clientTop + scroller.clientHeight);
      return { top, height: Math.max(0, bottom - top) };
    };

    // Queried from the document on every pass, never held: a held node can be
    // a detached one after a re-render, and a detached node has no layout.
    const evaluate = () => {
      frame = 0;
      const header = document.querySelector(`[${SITE_HEADER_ATTR}]`);
      direction = nextDirection(direction, y, {
        holdDown: Boolean(header?.contains(document.activeElement)),
      });

      const { top: viewTop, height: viewHeight } = view();

      const reveal = document.querySelector(`[${REVEAL_ATTR}]`);
      const revealed = hasScrolledPast(
        reveal && reveal.getClientRects().length > 0
          ? { bottom: reveal.getBoundingClientRect().bottom - viewTop }
          : null,
      );

      const tops: number[] = [];
      document.querySelectorAll(`[${STOP_ATTR}]`).forEach((stop) => {
        if (stop.getClientRects().length > 0) tops.push(stop.getBoundingClientRect().top - viewTop);
      });
      const suppressed = isSuppressed(firstStopTop(tops), viewHeight);

      setOn(shouldShowBar({ revealed, down: direction.down, suppressed, followsDirection }));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(evaluate);
    };

    const onScroll = (event: Event) => {
      const source = event.target;
      if (!(source instanceof Element)) {
        scroller = null;
        y = window.scrollY;
      } else if (barRef.current && source.contains(barRef.current)) {
        scroller = source;
        y = source.scrollTop;
      }
      schedule();
    };

    const listen = { capture: true, passive: true } as const;
    document.addEventListener('scroll', onScroll, listen);
    window.addEventListener('resize', schedule);
    schedule();
    // Again once images and fonts have settled the layout under the markers.
    const settle = window.setTimeout(schedule, 500);

    return () => {
      document.removeEventListener('scroll', onScroll, listen);
      window.removeEventListener('resize', schedule);
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
    };
  }, [barRef, followsDirection]);

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

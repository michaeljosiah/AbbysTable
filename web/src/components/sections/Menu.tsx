'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';

import type { Dish } from '@/lib/aonik/types';

import { DishCard } from './DishCard';
import styles from './Menu.module.css';

/** Smallest the scroll thumb is allowed to get, in px. */
const MIN_THUMB = 28;

interface MenuProps {
  dishes: Dish[];
}

/**
 * "A taste of the table" — the homepage's dish rail (Homepage v2, approved).
 * The dishes are the tenant's featured collection, resolved on the server and
 * handed down, so the list is in the initial HTML; nothing about a dish is
 * written here.
 *
 * The rail is full-bleed so the next card peeks in at the edge, but its first
 * card starts on the page's content line: the gutter on a phone, and the 1280
 * grid line on desktop — exactly where the How it works clip above starts.
 *
 * The bar under it is a progress INDICATOR, not a control: it reports where
 * the rail is and nothing else. Navigation is the rail itself — swipe, drag,
 * trackpad, or Tab through the card links, which scrolls natively.
 */
export function Menu({ dishes }: MenuProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);

  /**
   * Sizes and positions the thumb to mirror the scroller: width tracks the
   * visible fraction, offset tracks progress. Written imperatively so
   * scrolling does not re-render the whole rail.
   */
  const syncThumb = useCallback(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!scroller || !track || !thumb) return;

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    const trackWidth = track.clientWidth;
    const visibleRatio =
      scroller.scrollWidth > 0 ? Math.min(1, scroller.clientWidth / scroller.scrollWidth) : 1;
    const thumbWidth = Math.max(MIN_THUMB, trackWidth * visibleRatio);
    const progress =
      maxScroll > 0 ? Math.min(1, Math.max(0, scroller.scrollLeft / maxScroll)) : 0;

    thumb.style.width = `${thumbWidth}px`;
    thumb.style.transform = `translateX(${progress * (trackWidth - thumbWidth)}px)`;
  }, []);

  // Re-sync on resize, and whenever the number of dishes changes.
  useEffect(() => {
    syncThumb();
    window.addEventListener('resize', syncThumb);
    return () => window.removeEventListener('resize', syncThumb);
  }, [syncThumb, dishes.length]);

  return (
    <section id="menu" className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.heading}>A taste of the table</h2>
        <p className={styles.intro}>
          A few of Abby’s dishes, from everyday favourites to signature upgrades.
        </p>
      </div>

      <div
        ref={scrollerRef}
        onScroll={syncThumb}
        className={`${styles.scroller} noScrollbar`}
        role="region"
        aria-label="Dishes"
        tabIndex={0}
      >
        {dishes.map((dish) => (
          <div key={dish.id} className={styles.slide}>
            <DishCard dish={dish} href={`/menu/${dish.slug}`} />
          </div>
        ))}
      </div>

      <div ref={trackRef} className={styles.progressTrack} aria-hidden="true">
        <span ref={thumbRef} className={styles.progressThumb} />
      </div>

      <div className={styles.ctaWrap}>
        <Link href="/menu" className={styles.cta}>
          View the full menu
        </Link>
      </div>
    </section>
  );
}

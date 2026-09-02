'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef } from 'react';

import { Button, Eyebrow, SectionHeading } from '@/components/ui';
import type { Dish } from '@/lib/aonik/types';

import { DishCard } from './DishCard';
import styles from './Menu.module.css';

/** Smallest the scroll thumb is allowed to get, in px. */
const MIN_THUMB = 28;

interface MenuProps {
  dishes: Dish[];
}

/**
 * The dishes rail. The dishes are resolved on the server and handed down, so
 * the list is in the initial HTML.
 *
 * There is no filter row: the 2026 template dropped it, showing one curated
 * rail and sending anyone who wants to browse to /menu. (The template still
 * carries `.at-filters` styles and builds a `pills` array in its script, but
 * never renders either — dead code, like its unused basket button.)
 */
export function Menu({ dishes }: MenuProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);

  /**
   * Sizes and positions the thumb to mirror the scroller, the way the design
   * template does: width tracks the visible fraction, offset tracks progress.
   * Written imperatively so scrolling does not re-render the whole rail.
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

  /** Clicking the track jumps the rail to that position. */
  const handleTrackClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;

    const bounds = track.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    scroller.scrollTo({ left: fraction * maxScroll, behavior: 'smooth' });
  };

  return (
    <section id="menu" className={styles.section}>
      <div className="band">
        <div className={styles.divider}>
          <span className={styles.rule} />
          <Image
            src="/assets/floral-mark.png"
            alt=""
            width={58}
            height={58}
            aria-hidden="true"
            className={styles.dividerMark}
          />
          <span className={styles.rule} />
        </div>

        <div className={styles.intro}>
          <Eyebrow tone="brass" align="center">
            What&apos;s on the table?
          </Eyebrow>
          <SectionHeading level={1} align="center" className={styles.heading}>
            A taste of the table
          </SectionHeading>
          <p className={styles.introCopy}>
            A few of Abby&apos;s dishes, from everyday favourites to signature upgrades.
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

        {/* Pointer shortcut mirroring the scroller. Hidden from assistive tech:
            the rail itself is focusable and scrolls with the arrow keys. */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className={styles.progressTrack}
          aria-hidden="true"
        >
          <span ref={thumbRef} className={styles.progressThumb} />
        </div>

        <div className={styles.cta}>
          <Button variant="outline" href="/menu">
            View the full menu
          </Button>
        </div>
      </div>
    </section>
  );
}

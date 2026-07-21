'use client';

import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';

import { Eyebrow, FilterPill, SectionHeading } from '@/components/ui';
import { DISH_CATEGORIES, type Dish } from '@/lib/aonik/types';

import { DishCard } from './DishCard';
import styles from './Menu.module.css';

/**
 * The dishes rail. Filtering is client state; the dishes themselves are
 * resolved on the server and handed down, so the list is in the initial HTML.
 */
const FEATURED = 'Featured dishes';

const FILTERS = [FEATURED, ...DISH_CATEGORIES] as const;

interface MenuProps {
  dishes: Dish[];
}

export function Menu({ dishes }: MenuProps) {
  const [filter, setFilter] = useState<string>(FEATURED);
  const [progress, setProgress] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const visibleDishes =
    filter === FEATURED ? dishes : dishes.filter((dish) => dish.category === filter);

  // Drives the thin progress rail beneath the carousel.
  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const scrollable = el.scrollWidth - el.clientWidth;
    setProgress(scrollable > 0 ? el.scrollLeft / scrollable : 0);
  }, []);

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

        <div className={`${styles.filters} noScrollbar`} role="group" aria-label="Filter dishes">
          {FILTERS.map((option) => (
            <FilterPill key={option} active={option === filter} onClick={() => setFilter(option)}>
              {option}
            </FilterPill>
          ))}
        </div>

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className={`${styles.scroller} noScrollbar`}
          role="region"
          aria-label="Dishes"
          tabIndex={0}
        >
          {visibleDishes.map((dish) => (
            <div key={dish.id} className={styles.slide}>
              <DishCard dish={dish} />
            </div>
          ))}
        </div>

        <div className={styles.progressTrack} aria-hidden="true">
          <span
            className={styles.progressThumb}
            style={{ transform: `translateX(${progress * 150}%)` }}
          />
        </div>
      </div>
    </section>
  );
}

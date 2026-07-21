'use client';

import Link from 'next/link';

import { DishCard } from '@/components/sections/DishCard';
import type { Dish } from '@/lib/aonik/types';
import type { ActiveFilter, FacetKey } from '@/lib/menu/filters';

import styles from './MenuGrid.module.css';

interface MenuGridProps {
  /** The visible slice of the filtered catalogue. */
  dishes: Dish[];
  resultLabel: string;
  active: ActiveFilter[];
  onRemoveFilter: (key: FacetKey, value: string) => void;
  onClearAll: () => void;
  showLoadMore: boolean;
  onLoadMore: () => void;
}

export function MenuGrid({
  dishes,
  resultLabel,
  active,
  onRemoveFilter,
  onClearAll,
  showLoadMore,
  onLoadMore,
}: MenuGridProps) {
  return (
    <div>
      <div className={styles.resultBar}>
        {/* Announced so filtering gives non-visual users the new count. */}
        <span className={styles.resultCount} role="status" aria-live="polite">
          {resultLabel}
        </span>

        {active.length > 0 ? (
          <div className={styles.activeRow}>
            {active.map((filter) => (
              <button
                key={`${filter.key}:${filter.value}`}
                type="button"
                className={styles.activeChip}
                onClick={() => onRemoveFilter(filter.key, filter.value)}
              >
                <span>{filter.label}</span>
                <span className={styles.remove} aria-hidden="true">
                  ×
                </span>
                <span className="visuallyHidden">Remove filter</span>
              </button>
            ))}
            <button type="button" className={styles.clearAll} onClick={onClearAll}>
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <p className={styles.guidance}>
        <span className={styles.guidanceLabel}>Not sure where to start?</span>
        <Link href="/#boxes" className={styles.guidanceLink}>
          Explore Abby&apos;s handpicked boxes
        </Link>
      </p>

      {dishes.length > 0 ? (
        <ul className={styles.grid}>
          {dishes.map((dish) => (
            <li key={dish.id} className={styles.cell}>
              <DishCard dish={dish} variant="grid" />
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No dishes match your search or filters.</p>
          <button type="button" className={styles.emptyAction} onClick={onClearAll}>
            Clear search &amp; filters
          </button>
        </div>
      )}

      {showLoadMore ? (
        <div className={styles.more}>
          <button type="button" className={styles.loadMore} onClick={onLoadMore}>
            Load more dishes
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <span className={styles.moreLabel}>{resultLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

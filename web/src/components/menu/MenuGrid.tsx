'use client';
import type { ReactNode } from 'react';

import { DishCard } from '@/components/sections/DishCard';
import type { Dish } from '@/lib/aonik/types';
import { MENU_EMPTY } from '@/lib/content/menu';

import styles from './MenuGrid.module.css';

interface MenuGridProps {
  renderDish?: (dish: Dish) => ReactNode;
  gridClassName?: string;
  /** The visible slice of the filtered catalogue. */
  dishes: Dish[];
  resultLabel: string;
  /** A filter, sort or page change is on its way from the server. */
  pending?: boolean;
  showLoadMore: boolean;
  onLoadMore: () => void;
  onClearAll: () => void;
}

/**
 * The results line, the dish grid (one card per row on a phone, two from 640,
 * three from 1024), Load more and the empty state — Menu Landing v3. The cards
 * are the approved homepage card; their titles are h2, because the menu has
 * no section heading between its h1 and the cards.
 */
export function MenuGrid({
  dishes,
  resultLabel,
  pending = false,
  showLoadMore,
  onLoadMore,
  onClearAll,
  renderDish,
  gridClassName,
}: MenuGridProps) {
  return (
    <div className={styles.results} data-pending={pending || undefined}>
      <div className={styles.resultRow}>
        {/* Announced politely: the count changes under the reader's fingers as
            filters are applied, and nothing else on screen says so. */}
        <span className={styles.count} role="status" aria-live="polite">
          {resultLabel}
        </span>
      </div>

      {dishes.length > 0 ? (
        <ul className={gridClassName ?? styles.grid} role="list" data-menu-grid="">
          {dishes.map((dish) => (
            <li key={dish.id} className={styles.cell}>
              {renderDish ? renderDish(dish) : <DishCard dish={dish} variant="grid" href={`/menu/${dish.slug}`} headingLevel={2} />}
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{MENU_EMPTY.title}</p>
          <button type="button" className={styles.textButton} onClick={onClearAll}>
            <span>{MENU_EMPTY.action}</span>
          </button>
        </div>
      )}

      {showLoadMore ? (
        <div className={styles.moreWrap}>
          <button type="button" className={styles.more} onClick={onLoadMore}>
            Load more dishes
          </button>
        </div>
      ) : null}
    </div>
  );
}

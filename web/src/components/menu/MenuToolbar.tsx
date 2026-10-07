'use client';

import { useCallback, useRef } from 'react';

import type { MappedFacetGroup } from '@/lib/aonik/map';
import type { ActiveFilter, MenuFilters } from '@/lib/menu/filters';
import type { MenuSortKey, MenuSortOption } from '@/lib/menu/sort';

import { MENU_FILTERS_ID, MenuFilterSheet } from './MenuFilterSheet';
import { MenuSort } from './MenuSort';
import styles from './MenuToolbar.module.css';

interface MenuToolbarProps {
  /** The search field's text — held by `MenuBrowser`, ahead of the URL. */
  text: string;
  onTextChange: (text: string) => void;
  onClearSearch: () => void;
  /** Tenant-authored filter groups, in Aonik's order. */
  facetGroups: MappedFacetGroup[];
  filters: MenuFilters;
  active: ActiveFilter[];
  onToggleFilter: (key: string, value: string) => void;
  onClearGroup: (key: string) => void;
  onClearFilters: () => void;
  onClearAll: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalCount: number;
  sort: MenuSortKey;
  /** The orders the source can apply; fewer than two draws no Sort control. */
  sortOptions: MenuSortOption[];
  onSort: (next: MenuSortKey) => void;
}

/**
 * The filter card (Menu Landing v3, `.mn-tools`): search, Filters and Sort,
 * the active filters as removable pills, and the filter groups — a bottom
 * sheet below 1024, an inline panel inside this card from 1024.
 *
 * Deliberately NOT sticky: the header auto-hides on downward scroll, and a
 * second sticky band moving under it fought that rule on the old page.
 *
 * The groups are DATA, from Aonik's facets read: a tenant can add, rename or
 * retire a filter with no deploy. No groups (none authored, or the read
 * failed) means no Filters button — never a button that opens nothing.
 */
export function MenuToolbar({
  text,
  onTextChange,
  onClearSearch,
  facetGroups,
  filters,
  active,
  onToggleFilter,
  onClearGroup,
  onClearFilters,
  onClearAll,
  open,
  onOpenChange,
  totalCount,
  sort,
  sortOptions,
  onSort,
}: MenuToolbarProps) {
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const closePanel = useCallback(() => onOpenChange(false), [onOpenChange]);
  const hasGroups = facetGroups.length > 0;
  const hasSort = sortOptions.length > 1;
  const controls = Number(hasGroups) + Number(hasSort);

  return (
    <div className={styles.card}>
      <div className={styles.toolRow} data-controls={controls}>
        <div className={styles.search}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--brown)"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
            className={styles.searchIcon}
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
          {/* type="text", not "search": WebKit adds its own clear control to a
              search input, which would sit beside ours. */}
          <input
            type="text"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="Search dishes"
            aria-label="Search the menu"
            autoComplete="off"
            enterKeyHint="search"
            className={styles.input}
          />
          {text ? (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className={styles.clearSearch}
            >
              ×
            </button>
          ) : null}
        </div>

        {controls > 0 ? (
          <div className={styles.controls}>
            {hasGroups ? (
              <button
                ref={filtersButtonRef}
                type="button"
                className={`${styles.btn} ${styles.btnFill}`}
                onClick={() => onOpenChange(!open)}
                aria-expanded={open}
                aria-controls={MENU_FILTERS_ID}
              >
                <span>Filters</span>
                {active.length > 0 ? (
                  <span className={styles.countPill}>
                    <span className="visuallyHidden">, </span>
                    {active.length}
                    <span className="visuallyHidden"> selected</span>
                  </span>
                ) : null}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--blush)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={styles.chevron}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            ) : null}
            {hasSort ? <MenuSort value={sort} options={sortOptions} onChange={onSort} /> : null}
          </div>
        ) : null}
      </div>

      {active.length > 0 ? (
        <div className={styles.active}>
          {active.map((filter) => (
            <button
              key={`${filter.key}:${filter.value}`}
              type="button"
              className={styles.activeChip}
              onClick={() => onToggleFilter(filter.key, filter.value)}
              aria-label={`Remove filter: ${filter.label}`}
            >
              <span>{filter.label}</span>
              <span className={styles.activeChipX} aria-hidden="true">
                ×
              </span>
            </button>
          ))}
          <button type="button" className={styles.textButton} onClick={onClearAll}>
            <span>Clear all</span>
          </button>
        </div>
      ) : null}

      {hasGroups ? (
        <MenuFilterSheet
          open={open}
          onClose={closePanel}
          returnFocusRef={filtersButtonRef}
          groups={facetGroups}
          filters={filters}
          onToggle={onToggleFilter}
          onClearGroup={onClearGroup}
          onClearFilters={onClearFilters}
          totalCount={totalCount}
        />
      ) : null}
    </div>
  );
}

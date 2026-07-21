'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui';
import {
  FACET_GROUPS,
  SPICE_STEPS,
  type FacetKey,
  type MenuFilters,
} from '@/lib/menu/filters';

import { FilterChip } from './FilterChip';
import styles from './MenuToolbar.module.css';

/**
 * Search box plus the facet panel. The panel expands inline on desktop and
 * becomes a bottom sheet below 760px, matching the design template.
 */
const FACET_ICONS: Record<FacetKey, string[]> = {
  protein: ['M6 9v6M4 10.5v3M18 9v6M20 10.5v3M6 12h12'],
  spice: ['M8.5 14.5A2.5 2.5 0 0011 12c0-1.4-.5-2-1-3-1-2-.2-3.8 2-5.5.5 2.3 2 4.6 3.7 6C17 11 18 12.7 18 14.5a6 6 0 11-9.5 0z'],
  wellness: ['M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0016.5 3c-1.7 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4 3 5.5l7 7z'],
  meal: ['M5 11h14', 'M6 11a6 6 0 0012 0'],
  dietary: [
    'M11 20A7 7 0 019.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z',
    'M2 21c0-3 1.85-5.4 5-6',
  ],
  calories: ['M22 12h-4l-3 8L9 4l-3 8H2'],
};

interface MenuToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  filters: MenuFilters;
  onToggleFilter: (key: FacetKey, value: string) => void;
  onClearFacet: (key: FacetKey) => void;
  onClearAll: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultLabel: string;
  totalCount: number;
}

export function MenuToolbar({
  query,
  onQueryChange,
  filters,
  onToggleFilter,
  onClearFacet,
  onClearAll,
  open,
  onOpenChange,
  resultLabel,
  totalCount,
}: MenuToolbarProps) {
  // Escape closes the panel wherever it is; the sheet variant also traps scroll.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  return (
    <div className={styles.sticky}>
      <div className={styles.card}>
        <div className={styles.bar}>
          <div className={styles.search}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search dishes, proteins or goals"
              aria-label="Search the menu"
              className={styles.input}
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Clear search"
                className={styles.clear}
              >
                ×
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className={styles.toggle}
            onClick={() => onOpenChange(!open)}
            aria-expanded={open}
            aria-controls="menu-filters"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--green-forest)"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 5h18l-7 8v5l-4 2v-7z" />
            </svg>
            <span>Filters</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--taupe)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.chevron}
              data-open={open || undefined}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <span className={styles.showing}>{resultLabel}</span>
        </div>

        {open ? (
          <>
            <div className={styles.backdrop} onClick={() => onOpenChange(false)} aria-hidden="true" />

            <div className={styles.panel} id="menu-filters">
              <div className={styles.sheetHead}>
                <span className={styles.sheetTitle}>Filters</span>
                <button
                  type="button"
                  className={styles.clear}
                  onClick={() => onOpenChange(false)}
                  aria-label="Close filters"
                >
                  ×
                </button>
              </div>

              <div className={styles.sheetBody}>
                <div className={styles.columns}>
                  {FACET_GROUPS.map((group) => {
                    const selected = filters[group.key];
                    return (
                      <fieldset key={group.key} className={styles.column}>
                        <legend className={styles.columnHead}>
                          <span className={styles.icon} aria-hidden="true">
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="var(--green-forest)"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              {FACET_ICONS[group.key].map((d) => (
                                <path key={d} d={d} />
                              ))}
                            </svg>
                          </span>
                          <span className={styles.columnTitle}>{group.title}</span>
                        </legend>

                        <div className={styles.chips}>
                          <FilterChip
                            label="All"
                            selected={selected.length === 0}
                            onClick={() => onClearFacet(group.key)}
                          />
                          {group.options.map((option) => (
                            <FilterChip
                              key={option}
                              label={option}
                              selected={selected.includes(option)}
                              onClick={() => onToggleFilter(group.key, option)}
                              pips={group.key === 'spice' ? SPICE_STEPS[option] : 0}
                            />
                          ))}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
              </div>

              <div className={styles.sheetFoot}>
                <button type="button" className={styles.clearAll} onClick={onClearAll}>
                  Clear all
                </button>
                <Button
                  variant="dark"
                  className={styles.apply}
                  onClick={() => onOpenChange(false)}
                >
                  Show {totalCount} {totalCount === 1 ? 'dish' : 'dishes'}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

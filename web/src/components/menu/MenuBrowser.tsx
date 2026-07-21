'use client';

import { useCallback, useMemo, useState } from 'react';

import type { Dish } from '@/lib/aonik/types';
import {
  EMPTY_FILTERS,
  activeFilters,
  clearFacet,
  filterDishes,
  resultLabel,
  toggleFilter,
  type FacetKey,
  type MenuFilters,
} from '@/lib/menu/filters';

import { MenuGrid } from './MenuGrid';
import { MenuToolbar } from './MenuToolbar';

/** Dishes revealed per "Load more". */
const PAGE_SIZE = 6;

interface MenuBrowserProps {
  dishes: Dish[];
}

/**
 * Owns all menu interaction state. The catalogue itself is resolved on the
 * server and passed in, so the full grid is present in the initial HTML and
 * filtering never round-trips.
 */
export function MenuBrowser({ dishes }: MenuBrowserProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<MenuFilters>(EMPTY_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [panelOpen, setPanelOpen] = useState(false);

  const filtered = useMemo(() => filterDishes(dishes, filters, query), [dishes, filters, query]);
  const active = useMemo(() => activeFilters(filters), [filters]);

  const visible = filtered.slice(0, visibleCount);

  // Any change to the result set starts paging again from the top.
  const handleQueryChange = useCallback((next: string) => {
    setQuery(next);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleToggleFilter = useCallback((key: FacetKey, value: string) => {
    setFilters((current) => toggleFilter(current, key, value));
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleClearFacet = useCallback((key: FacetKey) => {
    setFilters((current) => clearFacet(current, key));
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleClearAll = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setQuery('');
    setVisibleCount(PAGE_SIZE);
  }, []);

  const label = resultLabel(visible.length, filtered.length);

  return (
    <>
      <MenuToolbar
        query={query}
        onQueryChange={handleQueryChange}
        filters={filters}
        onToggleFilter={handleToggleFilter}
        onClearFacet={handleClearFacet}
        onClearAll={handleClearAll}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        resultLabel={label}
        totalCount={filtered.length}
      />

      <MenuGrid
        dishes={visible}
        resultLabel={label}
        active={active}
        onRemoveFilter={handleToggleFilter}
        onClearAll={handleClearAll}
        showLoadMore={visible.length < filtered.length}
        onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
      />
    </>
  );
}

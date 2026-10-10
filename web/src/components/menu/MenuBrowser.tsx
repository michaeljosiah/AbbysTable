'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';

import type { MappedFacetGroup } from '@/lib/aonik/map';
import type { Dish } from '@/lib/aonik/types';
import { MENU_PAGE_SIZE } from '@/lib/menu/constants';
import { FACET_PARAM_PREFIX } from '@/lib/menu/facets';
import { activeFilters, filterCount, resultLabel, type MenuFilters } from '@/lib/menu/filters';
import { DEFAULT_SORT, SORT_PARAM, sortOptions, type MenuSortKey } from '@/lib/menu/sort';

import { MenuGrid } from './MenuGrid';
import { MenuToolbar } from './MenuToolbar';

/** How long typing pauses before the search reaches the URL (and the server). */
const SEARCH_DEBOUNCE_MS = 250;

/** Drops every `facet.*` parameter. */
function clearFacets(params: URLSearchParams): void {
  for (const name of [...params.keys()]) {
    if (name.startsWith(FACET_PARAM_PREFIX)) params.delete(name);
  }
}

interface MenuBrowserProps {
  renderDish?: (dish: Dish) => ReactNode;
  gridClassName?: string;
  dishes: Dish[];
  /** Matches across the whole catalogue, not just this page. */
  totalCount: number;
  /** How many are currently requested — "Load more" grows this. */
  limit: number;
  facetGroups: MappedFacetGroup[];
  /** The filters the server APPLIED (sanitised against the facets read). */
  filters: MenuFilters;
  query: string;
  sort: MenuSortKey;
  /** The orders the source can apply; fewer than two draws no Sort control. */
  sorts: readonly MenuSortKey[];
}

/**
 * Menu interaction state, held in the URL: `q`, `facet.<key>=a,b`, `sort` and
 * `limit` (Load more). Filtering and sorting are the data source's job, not
 * ours: the browse endpoint pages its results, so filtering or sorting a
 * single page here would quietly give wrong answers as soon as the catalogue
 * outgrows one page. Every change therefore rewrites the query string and the
 * server re-resolves; a filtered, sorted menu is a shareable URL.
 *
 * The trade is a round trip per change, which `useTransition` covers with a
 * pending state rather than a flash of empty grid. Search holds its own text
 * while the round trip runs — a field bound to the URL would drop keystrokes
 * typed before the URL caught up — and reaches the URL after a short pause.
 */
export function MenuBrowser({
  dishes,
  totalCount,
  limit,
  facetGroups,
  filters,
  query,
  sort,
  sorts,
  renderDish,
  gridClassName,
}: MenuBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [panelOpen, setPanelOpen] = useState(false);

  /**
   * The params as last written — ahead of `useSearchParams` until the router
   * catches up — so a change made while another is pending (a filter chosen
   * inside the search's debounce) builds on it instead of on an older URL.
   */
  const latestParams = useRef(new URLSearchParams(searchParams.toString()));
  useEffect(() => {
    latestParams.current = new URLSearchParams(searchParams.toString());
  }, [searchParams]);

  /** Rewrites the URL from a mutated copy of the latest params. */
  const replace = useCallback(
    (mutate: (params: URLSearchParams) => void, { keepLimit = false } = {}) => {
      const params = new URLSearchParams(latestParams.current.toString());
      mutate(params);
      // Any change to the result set starts paging again from the top: a deep
      // page kept after narrowing offers "Load more" for dishes already shown.
      if (!keepLimit) params.delete('limit');
      latestParams.current = params;
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  /* ---- Search ---------------------------------------------------------------- */

  const [text, setText] = useState(query);
  /** The `q` this component last sent, so a URL change it did not make is seen. */
  const sentRef = useRef(query);
  const timerRef = useRef<number | undefined>(undefined);

  // Back / Forward, or Clear all: the URL moved without the field — follow it.
  useEffect(() => {
    if (query === sentRef.current) return;
    sentRef.current = query;
    window.clearTimeout(timerRef.current);
    setText(query);
  }, [query]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const sendQuery = useCallback(
    (next: string) => {
      const value = next.trim() ? next : '';
      sentRef.current = value;
      replace((params) => {
        if (value) params.set('q', value);
        else params.delete('q');
      });
    },
    [replace],
  );

  const handleTextChange = useCallback(
    (next: string) => {
      setText(next);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => sendQuery(next), SEARCH_DEBOUNCE_MS);
    },
    [sendQuery],
  );

  const handleClearSearch = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setText('');
    sendQuery('');
  }, [sendQuery]);

  /* ---- Filters, sort, paging ------------------------------------------------------ */

  const handleToggleFilter = useCallback(
    (key: string, value: string) =>
      replace((params) => {
        const name = `${FACET_PARAM_PREFIX}${key}`;
        const current = (params.get(name) ?? '').split(',').filter(Boolean);
        const next = current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value];
        if (next.length) params.set(name, next.join(','));
        else params.delete(name);
      }),
    [replace],
  );

  const handleClearGroup = useCallback(
    (key: string) => replace((params) => params.delete(`${FACET_PARAM_PREFIX}${key}`)),
    [replace],
  );

  /** The sheet's "Clear all filters": the chips only, the search stays. */
  const handleClearFilters = useCallback(() => replace(clearFacets), [replace]);

  /** "Clear all" and the empty state's "Clear search and filters". */
  const handleClearAll = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setText('');
    sentRef.current = '';
    replace((params) => {
      clearFacets(params);
      params.delete('q');
    });
  }, [replace]);

  const handleSort = useCallback(
    (next: MenuSortKey) =>
      replace((params) => {
        if (next === DEFAULT_SORT) params.delete(SORT_PARAM);
        else params.set(SORT_PARAM, next);
      }),
    [replace],
  );

  const handleLoadMore = useCallback(
    () =>
      replace((params) => params.set('limit', String(limit + MENU_PAGE_SIZE)), { keepLimit: true }),
    [limit, replace],
  );

  const active = useMemo(() => activeFilters(facetGroups, filters), [facetGroups, filters]);
  const narrowed = query.trim() !== '' || filterCount(filters) > 0;
  const label = resultLabel(dishes.length, totalCount, narrowed);
  const options = useMemo(() => sortOptions(sorts), [sorts]);

  return (
    <>
      <MenuToolbar
        text={text}
        onTextChange={handleTextChange}
        onClearSearch={handleClearSearch}
        facetGroups={facetGroups}
        filters={filters}
        active={active}
        onToggleFilter={handleToggleFilter}
        onClearGroup={handleClearGroup}
        onClearFilters={handleClearFilters}
        onClearAll={handleClearAll}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        totalCount={totalCount}
        sort={sort}
        sortOptions={options}
        onSort={handleSort}
      />

      <MenuGrid
        renderDish={renderDish}
        gridClassName={gridClassName}
        dishes={dishes}
        resultLabel={label}
        pending={isPending}
        showLoadMore={dishes.length < totalCount}
        onLoadMore={handleLoadMore}
        onClearAll={handleClearAll}
      />
    </>
  );
}

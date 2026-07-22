'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';

import type { MappedFacetGroup } from '@/lib/aonik/map';
import type { Dish } from '@/lib/aonik/types';
import { resultLabel, type MenuFilters } from '@/lib/menu/filters';

import { MenuGrid } from './MenuGrid';
import { MenuToolbar } from './MenuToolbar';

/** Dishes revealed per "Load more". */
const PAGE_SIZE = 6;

interface MenuBrowserProps {
  dishes: Dish[];
  /** Matches across the whole catalogue, not just this page. */
  totalCount: number;
  /** How many are currently requested — "Load more" grows this. */
  limit: number;
  facetGroups: MappedFacetGroup[];
  filters: MenuFilters;
  query: string;
}

/**
 * Menu interaction state, held in the URL.
 *
 * Filtering is Aonik's job, not ours: the browse endpoint pages its results, so
 * filtering a single page client-side would quietly give wrong answers as soon
 * as the catalogue outgrows one page. Every change therefore rewrites the query
 * string and lets the server re-resolve.
 *
 * The trade is a round-trip per chip, which `useTransition` covers with a
 * pending state rather than a flash of empty grid. What we gain, beyond
 * correctness: a filtered menu is now a shareable URL.
 */
export function MenuBrowser({
  dishes,
  totalCount,
  limit,
  facetGroups,
  filters,
  query,
}: MenuBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [panelOpen, setPanelOpen] = useState(false);

  /** Rewrites the URL from a mutated copy of the current params. */
  const push = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      // Any change to the result set starts paging again from the top.
      params.delete('limit');
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const handleQueryChange = useCallback(
    (next: string) =>
      push((params) => {
        if (next.trim()) params.set('q', next);
        else params.delete('q');
      }),
    [push],
  );

  const handleToggleFilter = useCallback(
    (key: string, value: string) =>
      push((params) => {
        const current = (params.get(`facet.${key}`) ?? '').split(',').filter(Boolean);
        const next = current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value];
        if (next.length) params.set(`facet.${key}`, next.join(','));
        else params.delete(`facet.${key}`);
      }),
    [push],
  );

  const handleClearFacet = useCallback(
    (key: string) => push((params) => params.delete(`facet.${key}`)),
    [push],
  );

  const handleClearAll = useCallback(
    () =>
      push((params) => {
        for (const key of [...params.keys()]) {
          if (key.startsWith('facet.') || key === 'q') params.delete(key);
        }
      }),
    [push],
  );

  const handleLoadMore = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', String(limit + PAGE_SIZE));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [limit, pathname, router, searchParams]);

  /** Selected chips, resolved to their display labels for the removable pills. */
  const active = useMemo(
    () =>
      facetGroups.flatMap((group) =>
        (filters[group.key] ?? []).map((value) => ({
          key: group.key,
          value,
          label: group.options.find((option) => option.value === value)?.label ?? value,
        })),
      ),
    [facetGroups, filters],
  );

  const label = resultLabel(dishes.length, totalCount);

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
        totalCount={totalCount}
        facetGroups={facetGroups}
      />

      <div data-pending={isPending || undefined}>
        <MenuGrid
          dishes={dishes}
          resultLabel={label}
          active={active}
          onRemoveFilter={handleToggleFilter}
          onClearAll={handleClearAll}
          showLoadMore={dishes.length < totalCount}
          onLoadMore={handleLoadMore}
        />
      </div>
    </>
  );
}

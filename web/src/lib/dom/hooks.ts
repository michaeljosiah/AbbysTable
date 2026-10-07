'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { holdDocumentFlag } from './documentFlag';

/** Holds an <html> flag (see `./documentFlag`) for as long as `active` is true. */
export function useDocumentFlag(name: string, active: boolean): void {
  useEffect(() => (active ? holdDocumentFlag(name) : undefined), [name, active]);
}

/**
 * Whether a media query matches, kept current. False on the server and while
 * hydrating, so markup must never depend on it — use it for behaviour
 * (which flag to hold), not for what renders.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

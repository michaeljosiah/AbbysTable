'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { recordPath } from '@/lib/dom/trail';

/**
 * Records the path the router just left (`lib/dom/trail.ts`), so a "Back" can
 * tell whether there is a page of this site behind the current one. Renders
 * nothing. Mounted once, in the root layout.
 */
export function NavigationTrail() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current !== null && last.current !== pathname) {
      try {
        recordPath(window.sessionStorage, last.current);
      } catch {
        // Storage unavailable: Back falls to its link.
      }
    }
    last.current = pathname;
  }, [pathname]);

  return null;
}

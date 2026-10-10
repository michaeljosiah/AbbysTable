'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { clearHop, recordHop } from '@/lib/dom/trail';

/**
 * Records each hop the router makes (`lib/dom/trail.ts`), so a "Back" can tell
 * whether there is a page of this site behind the current one. A full page load
 * starts a trail of its own: the previous hop is forgotten. Renders nothing.
 * Mounted once, in the root layout.
 */
export function NavigationTrail() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    try {
      if (last.current === null) clearHop(window.sessionStorage);
      else if (last.current !== pathname) recordHop(window.sessionStorage, last.current, pathname);
    } catch {
      // Storage unavailable: Back falls to its link.
    }
    last.current = pathname;
  }, [pathname]);

  return null;
}

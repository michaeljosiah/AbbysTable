'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';

import { canGoBackTo, readPreviousPath } from '@/lib/dom/trail';

/**
 * Step 1's "Back" (Choose Box v2): a REAL back — `history.back()` — when the
 * customer came from a page of this site (the menu, a dish page, How it works),
 * so they return to exactly where they were; otherwise a plain link to `href`
 * (the menu). It is a link either way: a modified click, a middle click or no
 * JavaScript still goes to `href`.
 *
 * Decided when it is CLICKED, from the hop the router recorded for the page now
 * showing (`readPreviousPath`) — never at mount, when the trail may not have
 * been written yet.
 */
export function BackLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    let previous: string | null = null;
    try {
      previous = readPreviousPath(window.sessionStorage, window.location.pathname);
    } catch {
      previous = null;
    }
    if (!canGoBackTo(previous, href) || window.history.length <= 1) return;
    event.preventDefault();
    router.back();
  };

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type MouseEvent } from 'react';

import { canGoBackTo, readPreviousPath } from '@/lib/dom/trail';

/**
 * Step 1's "Back" (Choose Box v2): a REAL back — `history.back()` — when the
 * customer came from a page of this site (the menu, a dish page, How it works),
 * so they return to exactly where they were; otherwise a plain link to
 * `href` (the menu). It is a link either way: a modified click, a middle click
 * or no JavaScript still goes to `href`.
 */
export function BackLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    let previous: string | null = null;
    try {
      previous = readPreviousPath(window.sessionStorage);
    } catch {
      previous = null;
    }
    setCanGoBack(canGoBackTo(previous, href) && window.history.length > 1);
  }, [href]);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!canGoBack || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    router.back();
  };

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

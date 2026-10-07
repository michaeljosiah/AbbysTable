'use client';

import type { MouseEvent, ReactNode } from 'react';

interface JumpLinkProps {
  /** The element to scroll to; its CSS `scroll-margin-top` sets the offset. */
  targetId: string;
  className?: string;
  children: ReactNode;
}

/**
 * An in-page jump that scrolls WITHOUT adding a history entry — the design's
 * `goStandards`. A hash link would push one, which would put "Back to dish" on
 * its replace fallback and make the browser's Back step through the page.
 *
 * The href stays a real fragment, so with no JavaScript (or a modified click)
 * it is an ordinary anchor. The offset is the target's own
 * `scroll-margin-top`, so the jump and a plain anchor land in the same place.
 */
export function JumpLink({ targetId, className, children }: JumpLinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const margin = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
    window.scrollTo({
      top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - margin),
      behavior: reduce ? 'instant' : 'smooth',
    });
  };

  return (
    <a href={`#${targetId}`} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

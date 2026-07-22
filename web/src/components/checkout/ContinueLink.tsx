'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';

import { useCart } from '@/lib/cart/CartProvider';

/**
 * A step's forward CTA, which refuses to move while the box is unresolvable.
 *
 * Aonik flags an unavailable line rather than removing it, because deleting
 * someone's dish without asking is worse than stopping. Continue and checkout
 * therefore stay blocked until the customer removes or swaps it — resolution
 * is always their action, never ours.
 *
 * Rendered as an anchor with `aria-disabled` rather than swapped for a button,
 * so the audited markup and styling stay exactly as the templates set them.
 */
export function ContinueLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const { hasUnavailableLine, pending } = useCart();
  const blocked = hasUnavailableLine || pending;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (blocked) {
      event.preventDefault();
      return;
    }
    onClick?.();
  };

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      aria-disabled={blocked || undefined}
      data-blocked={blocked || undefined}
      // Keep it out of the tab order while it cannot act, so keyboard users are
      // not sent to a control that silently does nothing.
      tabIndex={blocked ? -1 : undefined}
    >
      {children}
    </Link>
  );
}

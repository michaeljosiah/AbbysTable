'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';

import { useCart } from '@/lib/cart/CartProvider';

/**
 * A step's forward CTA, which refuses to move while the box is unresolvable.
 *
 * Aonik flags an unavailable line rather than removing it, and Continue and
 * checkout stay blocked while one is in the box. An unavailable DISH is taken
 * out on Step 2 (`ReplacementNotice`, which says how many to choose instead);
 * an unavailable add-on is the customer's to remove on Extras.
 *
 * Rendered as an anchor with `aria-disabled` rather than swapped for a button,
 * so the audited markup and styling stay exactly as the templates set them.
 */
export function ContinueLink({
  href,
  className,
  children,
  onClick,
  disabled = false,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  /** The page's own reason to hold it (Review: the box is still being checked). */
  disabled?: boolean;
}) {
  const { hasUnavailableLine, shopping, pending } = useCart();
  // Step 2 → Extras is held only by a dish that cannot be ordered (an unavailable
  // add-on is mended ON Extras, so it must not hold the way there); every later
  // step is held by any unavailable line.
  const toExtras = href === '/box/extras';
  const blocked = disabled || (toExtras ? shopping.replacements > 0 : hasUnavailableLine) || pending;

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

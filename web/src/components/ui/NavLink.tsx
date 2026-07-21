import Link from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

import { isExternalHref } from '@/lib/links';

import styles from './NavLink.module.css';

/**
 * Header / footer navigation link. `dark` for cream headers, `light` for the
 * green and navy grounds. `active` adds the brass underline.
 */
export type NavLinkTone = 'dark' | 'light' | 'muted';

interface NavLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> {
  children: ReactNode;
  href: string;
  tone?: NavLinkTone;
  active?: boolean;
  className?: string;
}

export function NavLink({
  children,
  href,
  tone = 'dark',
  active = false,
  className,
  ...rest
}: NavLinkProps) {
  const shared = {
    className: [styles.link, className].filter(Boolean).join(' '),
    'data-tone': tone,
    'data-active': active || undefined,
    'aria-current': active ? ('page' as const) : undefined,
  };

  if (isExternalHref(href)) {
    return (
      <a href={href} {...shared} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...shared} {...rest}>
      {children}
    </Link>
  );
}

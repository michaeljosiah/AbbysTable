import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

import { isExternalHref } from '@/lib/links';

import styles from './Button.module.css';

/**
 * Abby's Table pill button. Variants map to the brand's real CTAs:
 *  - primary        terracotta fill, white text ("View the menu", "Order")
 *  - dark           forest-green fill, white text
 *  - outline        forest hairline, no fill ("Build a gift box")
 *  - outline-brass  brass hairline on dark grounds ("Request a consultation")
 *  - outline-light  cream hairline on dark grounds ("Choose your meals")
 *
 * Renders an anchor when `href` is supplied so in-page CTAs stay navigable
 * without JavaScript, and a button otherwise.
 */
export type ButtonVariant = 'primary' | 'dark' | 'outline' | 'outline-brass' | 'outline-light';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CommonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: never };

type LinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & { href: string };

export function Button(props: ButtonProps | LinkProps) {
  const { children, variant = 'primary', size = 'md', className, ...rest } = props;

  const classes = [styles.button, className].filter(Boolean).join(' ');

  if (typeof rest.href === 'string') {
    const { href, ...anchorProps } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
    };
    const shared = { className: classes, 'data-variant': variant, 'data-size': size };

    if (isExternalHref(href)) {
      return (
        <a href={href} {...shared} {...anchorProps}>
          {children}
        </a>
      );
    }

    return (
      <Link href={href} {...shared} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const { type = 'button', ...buttonProps } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={classes} data-variant={variant} data-size={size} type={type} {...buttonProps}>
      {children}
    </button>
  );
}

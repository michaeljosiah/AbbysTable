import type { ElementType, ReactNode } from 'react';

import styles from './Eyebrow.module.css';

/**
 * Small uppercase label above a heading ("MEET THE FOUNDER").
 * Wide letter-tracking is a signature of the brand.
 */
export type EyebrowTone = 'brass' | 'green' | 'blush' | 'muted';

interface EyebrowProps {
  children: ReactNode;
  tone?: EyebrowTone;
  align?: 'left' | 'center' | 'right';
  as?: ElementType;
  className?: string;
}

export function Eyebrow({
  children,
  tone = 'brass',
  align = 'left',
  as: Tag = 'p',
  className,
}: EyebrowProps) {
  return (
    <Tag
      className={[styles.eyebrow, className].filter(Boolean).join(' ')}
      data-tone={tone}
      style={{ textAlign: align }}
    >
      {children}
    </Tag>
  );
}

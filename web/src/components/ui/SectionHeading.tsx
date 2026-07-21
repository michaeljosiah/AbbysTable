import type { ElementType, ReactNode } from 'react';

import styles from './SectionHeading.module.css';

/**
 * Playfair Display section title. Defaults to an `h2`; pass `as` when the
 * document outline needs something else.
 */
export type SectionHeadingLevel = 'hero' | 1 | 2 | 3;
export type SectionHeadingTone = 'green' | 'cream' | 'blush' | 'terracotta' | 'brown';

interface SectionHeadingProps {
  children: ReactNode;
  level?: SectionHeadingLevel;
  tone?: SectionHeadingTone;
  align?: 'left' | 'center' | 'right';
  as?: ElementType;
  id?: string;
  className?: string;
}

export function SectionHeading({
  children,
  level = 1,
  tone = 'green',
  align = 'left',
  as,
  id,
  className,
}: SectionHeadingProps) {
  const Tag: ElementType = as ?? (level === 3 ? 'h3' : 'h2');

  return (
    <Tag
      id={id}
      className={[styles.heading, className].filter(Boolean).join(' ')}
      data-level={String(level)}
      data-tone={tone}
      style={{ textAlign: align }}
    >
      {children}
    </Tag>
  );
}

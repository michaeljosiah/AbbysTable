'use client';

import type { ReactNode } from 'react';

import styles from './FilterPill.module.css';

/**
 * Filter chip in the dishes rail. Fills forest green when active; a hairline
 * outline pill otherwise.
 */
interface FilterPillProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export function FilterPill({ children, active = false, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      className={styles.pill}
      data-active={active || undefined}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

import type { ReactNode } from 'react';

import styles from './NutritionTag.module.css';

/**
 * Coloured dot plus a wide-tracked label, used on dish cards
 * ("Protein 32g", "Fibre 9g").
 */
export type NutritionDot = 'protein' | 'carbs' | 'fat' | 'calories' | 'fibre';

interface NutritionTagProps {
  children: ReactNode;
  dot?: NutritionDot;
}

export function NutritionTag({ children, dot = 'protein' }: NutritionTagProps) {
  return (
    <span className={styles.tag}>
      <span className={styles.dot} data-dot={dot} aria-hidden="true" />
      {children}
    </span>
  );
}

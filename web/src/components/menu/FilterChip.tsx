'use client';

import { CHILLI_BODY_PATH, CHILLI_STEM_PATH, CHILLI_VIEW_BOX } from '@/components/ui/glyphs';

import styles from './FilterChip.module.css';

/**
 * A single facet option. Selected chips fill forest green and gain a × affordance;
 * spice chips additionally render their heat as chilli glyphs.
 */
interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  /** Number of chilli glyphs to draw (spice facet only). */
  pips?: number;
}

export function FilterChip({ label, selected, onClick, pips = 0 }: FilterChipProps) {
  return (
    <button
      type="button"
      className={styles.chip}
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span>{label}</span>

      {pips > 0 ? (
        <span className={styles.pips} aria-hidden="true">
          {Array.from({ length: pips }, (_, index) => (
            <svg key={index} width="13" height="13" viewBox={CHILLI_VIEW_BOX} className={styles.pip}>
              <path className={styles.stem} d={CHILLI_STEM_PATH} />
              <path className={styles.body} d={CHILLI_BODY_PATH} />
            </svg>
          ))}
        </span>
      ) : null}

      {selected ? (
        <span className={styles.remove} aria-hidden="true">
          ×
        </span>
      ) : null}
    </button>
  );
}

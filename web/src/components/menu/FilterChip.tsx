'use client';

import { CHILLI_BODY_PATH, CHILLI_STEM_PATH, CHILLI_VIEW_BOX } from '@/components/ui/glyphs';

import styles from './FilterChip.module.css';

/**
 * One facet option in the filter sheet (Menu Landing v3, `.mn-chip`): a 44px
 * toggle, filled forest green while pressed. A Heat chip above None draws the
 * card's three chillies with its level lit, so the chip and the cards it
 * matches read the same.
 */
interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  /** Lit chillies of three; 0 draws none (the "All" and "None" chips). */
  pips?: number;
}

const PIP_COUNT = 3;

export function FilterChip({ label, selected, onClick, pips = 0 }: FilterChipProps) {
  return (
    <button
      type="button"
      className={styles.chip}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span>{label}</span>

      {pips > 0 ? (
        <span className={styles.pips} aria-hidden="true">
          {Array.from({ length: PIP_COUNT }, (_, index) => (
            <svg
              key={index}
              width="15"
              height="15"
              viewBox={CHILLI_VIEW_BOX}
              className={styles.pip}
              data-lit={index < pips || undefined}
            >
              <path className={styles.stem} d={CHILLI_STEM_PATH} />
              <path className={styles.body} d={CHILLI_BODY_PATH} />
            </svg>
          ))}
        </span>
      ) : null}
    </button>
  );
}

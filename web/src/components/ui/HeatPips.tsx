import { HEAT_LABELS, HEAT_STEPS, type HeatLevel } from '@/lib/aonik/types';

import { CHILLI_BODY_PATH, CHILLI_STEM_PATH, CHILLI_VIEW_BOX } from './glyphs';
import styles from './HeatPips.module.css';

/** Three chilli glyphs, filled to the dish's heat level, plus a text label. */
const PIP_COUNT = 3;

function Chilli({ lit }: { lit: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox={CHILLI_VIEW_BOX}
      className={styles.pip}
      data-lit={lit || undefined}
    >
      <path className={styles.stem} d={CHILLI_STEM_PATH} />
      <path className={styles.body} d={CHILLI_BODY_PATH} />
    </svg>
  );
}

export function HeatPips({ heat }: { heat: HeatLevel }) {
  const steps = HEAT_STEPS[heat];

  return (
    <span className={styles.wrap}>
      <span className={styles.pips} role="img" aria-label={`Heat: ${HEAT_LABELS[heat]}`}>
        {Array.from({ length: PIP_COUNT }, (_, index) => (
          <Chilli key={index} lit={index < steps} />
        ))}
      </span>
      <span className={styles.label} aria-hidden="true">
        {HEAT_LABELS[heat]}
      </span>
    </span>
  );
}

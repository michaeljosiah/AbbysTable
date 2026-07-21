import { FloralMark } from '@/components/ui';

import styles from './FlavourBand.module.css';

/** Closing statement band beneath the menu grid. */
export function FlavourBand() {
  return (
    <section className={styles.band}>
      <FloralMark height={60} />
      <p className={styles.eyebrow}>Where the flavour comes from</p>
      <p className={styles.statement}>
        Stock we simmer ourselves, fried pepper bases, fresh herbs and date sugar — never a cube.
      </p>
    </section>
  );
}

import type { ReactNode } from 'react';

import styles from './LegalDocument.module.css';

/**
 * A value the owner still has to supply, marked rather than hidden so it
 * cannot ship unnoticed: dotted-underline italic, worded as a real state.
 *
 * `data-tbc` records where the value will come from, so the test suite can
 * count them: `copy` for a value written into the document when it is
 * confirmed (the design's marks), `config` for one read from the business's
 * details (`./company`), which disappears on its own once that is set.
 */
export function Tbc({
  children = 'to be confirmed',
  source = 'copy',
}: {
  children?: ReactNode;
  source?: 'copy' | 'config';
}) {
  return (
    <span className={styles.tbc} data-tbc={source}>
      {children}
    </span>
  );
}

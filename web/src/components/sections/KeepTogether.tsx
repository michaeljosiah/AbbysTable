import { Fragment, type ReactNode } from 'react';

import styles from './KeepTogether.module.css';

/**
 * Hyphenated compounds never split across lines ("Chef- / prepared"). The rule
 * is applied at RENDER time to an approved list, never by putting a
 * non-breaking hyphen in the content: that character does not survive a CMS
 * import, a paste or an editor typing an ordinary "-" (design/build-handoff.md
 * §3e).
 *
 * Not blanket-applied: a long compound forced unbreakable can overflow a
 * narrow column, so each entry is one the homepage design itself holds
 * together, and each fits its column at 320px. Add to the list only after
 * checking the new word at that width. "Mediterranean-inspired" and
 * "Fall-off-the-bone" are deliberately NOT on it (handoff §3e): untested at
 * minimum width, and tag labels are held by `nowrap` on the pill instead.
 */
export const KEEP_TOGETHER = [
  // Homepage copy.
  'Chef-prepared',
  'ultra-processed',
  'nutrition-led',
  'High-quality',
  'grass-fed',
  'house-made',
  'UK-certified',
  'Béllé-Full',
  // Private Table (#25), each checked at 320px in its column.
  'in-house',
  'sign-off',
  'one-to-one',
  'day-to-day',
  // Dish names and components lines, as the dish card renders them.
  'Yaji-Crusted',
  'Slow-Braised',
  'Lime-Herb',
  // Menu Landing v3's records hold these (with U+2011 in the prototype), and
  // each fits a 320px card.
  'Slow-Cooked',
  'Slow-cooked',
  'slow-cooked',
  'Suya-Spiced',
  'Melon-Seed',
] as const;

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// One capture group, so `split` puts each match at an odd index.
const PATTERN = new RegExp(`(${KEEP_TOGETHER.map(escape).join('|')})`);

/** One compound, held together: for hand-written prose. */
export function Keep({ children }: { children: ReactNode }) {
  return <span className={styles.keep}>{children}</span>;
}

/** A content string with every approved compound in it held together. */
export function KeepCompounds({ text }: { text: string }) {
  return (
    <>
      {text.split(PATTERN).map((part, index) =>
        index % 2 === 1 ? (
          <Keep key={index}>{part}</Keep>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

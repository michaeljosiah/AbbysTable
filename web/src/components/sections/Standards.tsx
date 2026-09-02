import { Fragment } from 'react';

import { FloralMark } from '@/components/ui';
import { BRAND_STANDARDS } from '@/lib/content/marketing';

import styles from './Standards.module.css';

/**
 * The clean-label claims: four promises strung together with brass lozenges
 * over a Cormorant closing line, set in a raised card with the floral device in
 * two corners.
 *
 * This is a card, not a section. The template folds it into the top of the
 * how-it-works band so the two share one ground and one rhythm, so `HowItWorks`
 * renders it — see the note there.
 *
 * The claims are a real list so assistive tech announces four items; the
 * lozenges are separate list items (they have to be flex children for the
 * mid-list break below 1080px) and are hidden from the accessibility tree.
 * `role="list"` is restated because `list-style: none` drops list semantics in
 * Safari/VoiceOver.
 */
export function Standards() {
  return (
    <div className={styles.card}>
      <FloralMark cssSized className={`${styles.leaf} ${styles.leafLeft}`} />
      <FloralMark cssSized className={`${styles.leaf} ${styles.leafRight}`} />

      <ul className={styles.list} role="list">
        {BRAND_STANDARDS.map((claim, index) => (
          <Fragment key={claim}>
            {index > 0 && (
              <li
                aria-hidden="true"
                className={[styles.separator, index === 2 && styles.separatorBreak]
                  .filter(Boolean)
                  .join(' ')}
              >
                ⬥
              </li>
            )}
            <li className={styles.claim}>{claim}</li>
          </Fragment>
        ))}
      </ul>

      <span className={styles.rule} aria-hidden="true" />

      <p className={styles.tagline}>Flavour built from real food and natural ingredients.</p>
    </div>
  );
}

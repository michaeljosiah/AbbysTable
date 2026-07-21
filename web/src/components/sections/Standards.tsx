import { Fragment } from 'react';

import { BRAND_STANDARDS } from '@/lib/content/marketing';

import styles from './Standards.module.css';

/**
 * The clean-label band directly beneath the hero: four claims strung together
 * with brass lozenges, over a Cormorant closing line.
 *
 * The template renders this as a flat run of <span>s. Here it is a real list so
 * assistive tech announces four items; the lozenges are separate list items
 * (they have to be flex children for the mid-list line break below 620px) and
 * are hidden from the accessibility tree. `role="list"` is restated because
 * `list-style: none` drops list semantics in Safari/VoiceOver.
 */
export function Standards() {
  return (
    <section id="standards" className={styles.section}>
      <div className="band">
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

        <p className={styles.tagline}>Flavour built from real food and natural ingredients.</p>
      </div>
    </section>
  );
}

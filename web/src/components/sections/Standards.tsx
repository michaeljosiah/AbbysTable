import Link from 'next/link';

import { HOMEPAGE_STANDARDS, type HomepageStandardIcon } from '@/lib/content/marketing';

import { KeepCompounds } from './KeepTogether';
import styles from './Standards.module.css';

/**
 * The four glyphs, drawn in-house on a 24px grid (thin 1.6 stroke). The design
 * system ships no icon set, so these are the band's own, not brand assets.
 */
const ICON_PATHS: Record<HomepageStandardIcon, readonly string[]> = {
  sprout: [
    'M12 21.4V11',
    'M12 11c0-3.4 2.4-6.2 6-6.6.4 3.8-2.2 6.6-6 6.6z',
    'M12 12.6C12 9.8 9.8 7.4 6.6 7c-.4 3.2 1.8 5.6 5.4 5.6z',
  ],
  cutlery: [
    'M8 2.8v6.4a2.2 2.2 0 0 0 4.4 0V2.8',
    'M10.2 9.4v11.8',
    'M16.6 2.8v18.4',
    'M16.6 2.8c1.6.8 2.6 2.4 2.6 4.2s-1 3.4-2.6 4.2',
  ],
  document: ['M6 2.8h8.4L18.6 7v14.2H6z', 'M14 2.8V7h4.6', 'M9 12h6.2M9 15.4h6.2M9 18.2h3.4'],
  drop: ['M12 2.6c3.4 4 5.6 6.8 5.6 9.8a5.6 5.6 0 0 1-11.2 0c0-3 2.2-5.8 5.6-9.8z'],
};

/**
 * Our standards — design/Abby's Table - Homepage v2.dc.html (approved) and
 * build-handoff "Our standards — what was settled".
 *
 * The first sanctioned full-bleed coloured band, on `--sage`. Brass is 2.2:1
 * and gold 1.2:1 there, so the marks are `--brass-ink`. The icons are
 * decorative and hidden: every standard is stated in words beside its mark.
 *
 * A stacked list on a phone (mark left, spanning title and description); four
 * columns from 1024, the titles aligned across them by CSS subgrid rather than
 * a min-height, which only ever held at one width.
 */
export function Standards() {
  return (
    <section id="standards" className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>Our standards</h2>
        <p className={styles.intro}>Real food, higher standards.</p>

        {/* `role` restated: `list-style: none` drops list semantics in Safari. */}
        <ul className={styles.grid} role="list">
          {HOMEPAGE_STANDARDS.map((item) => (
            <li key={item.title} className={styles.item}>
              <span className={styles.mark} aria-hidden="true">
                <svg
                  width="27"
                  height="27"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICON_PATHS[item.icon].map((d) => (
                    <path key={d} d={d} />
                  ))}
                </svg>
              </span>
              <h3 className={styles.title}>
                <KeepCompounds text={item.title} />
              </h3>
              <p className={styles.description}>
                <KeepCompounds text={item.description} />
              </p>
            </li>
          ))}
        </ul>

        <div className={styles.ctaWrap}>
          {/* No arrow: the page's filled section CTAs do not carry one. */}
          <Link href="/standards" className={styles.cta}>
            View our standards
          </Link>
        </div>
      </div>
    </section>
  );
}

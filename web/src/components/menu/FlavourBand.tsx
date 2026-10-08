import Image from 'next/image';

import { FLAVOUR_BAND } from '@/lib/content/menu';

import styles from './FlavourBand.module.css';

/**
 * "Where the flavour comes from" — the band under the menu grid (Menu Landing
 * v3, `.fl-sec`). Kept as the old page had it at the user's instruction —
 * blush band, monogram, 12px label, brass hairline, the two facts — with its
 * label moved off brass (2.2:1 on blush) to brown, and the photograph only in
 * the wider composition, where it has a column of its own.
 *
 * Both glyphs are How It Works v2's step 02 marks ("Quality ingredients" leaf,
 * "No shortcuts" slashed circle), decorative beside facts stated in words.
 */
export function FlavourBand() {
  return (
    <section className={styles.band} aria-labelledby="flavour-heading">
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.copy}>
            <Image
              src="/assets/floral-mark.png"
              alt=""
              width={52}
              height={60}
              className={styles.mark}
              aria-hidden="true"
            />
            <p className={styles.label}>{FLAVOUR_BAND.label}</p>
            <h2 id="flavour-heading" className={styles.heading}>
              {FLAVOUR_BAND.heading}
            </h2>
            <span className={styles.rule} aria-hidden="true" />
            <div className={styles.facts}>
              <p className={styles.fact}>
                <svg
                  className={styles.icon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--brass-ink)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" />
                  <path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12" />
                </svg>
                {FLAVOUR_BAND.facts[0]}
              </p>
              <p className={styles.fact}>
                <svg
                  className={styles.icon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--brass-ink)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M6 18 18 6" />
                </svg>
                {FLAVOUR_BAND.facts[1]}
              </p>
            </div>
          </div>

          {/* Content prioritisation, not a duplicate: one element, hidden in
              the base state and shown where it has a column of its own. */}
          <div className={styles.media}>
            <Image
              src={FLAVOUR_BAND.image.src}
              alt={FLAVOUR_BAND.image.alt}
              fill
              sizes="(min-width: 1024px) 592px, 1px"
              className={styles.image}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

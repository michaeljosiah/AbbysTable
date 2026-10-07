import { getImageProps } from 'next/image';
import Link from 'next/link';

import { HERO_FACTS, type HeroFactIcon } from '@/lib/content/marketing';

import { Keep, KeepCompounds } from './KeepTogether';
import styles from './Hero.module.css';

/** The facts' line glyphs, drawn on a 24px grid (Homepage v2 hero). */
const FACT_PATHS: Record<HeroFactIcon, readonly string[]> = {
  leaf: ['M5 19.5C4.6 12 9.4 5.6 19 4.5c.6 8.4-4.4 14-14 15z', 'M5.5 19c3-5.2 7-8.4 12.2-10.4'],
  package: ['M20.5 7.3 12 2.6 3.5 7.3v9.4l8.5 4.7 8.5-4.7z', 'M3.5 7.3 12 12l8.5-4.7', 'M12 12v9.4'],
  bowl: ['M3.6 10.4h16.8a8.4 8.4 0 0 1-16.8 0z', 'M9.4 13.4h.01', 'M14.6 13.4h.01', 'M9.9 16.3a3 3 0 0 0 4.2 0'],
};

/** Describes the photograph, which is the same scene in both crops. */
const HERO_ALT =
  'A ceramic bowl of jollof rice with sliced beef, chilli relish and charred asparagus, on a dark green cloth';

/**
 * The hero — design/Abby's Table - Homepage v2.dc.html (approved), and
 * design/CLAUDE.md "Desktop hero composition".
 *
 * ONE continuous photograph under a feathered left overlay: the 3:4 crop on a
 * phone and the 2:1 from 1024 — never the 3:4 on desktop. That is art
 * direction, which `<Image>` cannot express, so the crops go through
 * `getImageProps` (still next/image's optimiser) into one `<picture>`, and the
 * browser fetches only the crop it shows. It is the page's LCP element: the
 * one image with `fetchpriority="high"`, eager, with no preload competing.
 *
 * The headline and lede carry HARD breaks at every width, as the approved
 * mockup does — their line structure comes from the breaks, not a measure.
 *
 * "View the menu" is the mobile purchase bar's reveal point: the bar appears
 * only once it has been scrolled past (design/CLAUDE.md, "Mobile purchase
 * CTA").
 */
export function Hero() {
  const common = { alt: HERO_ALT, sizes: '100vw', priority: true, fetchPriority: 'high' } as const;
  const {
    props: { srcSet: landscape },
  } = getImageProps({
    ...common,
    src: '/assets/home/hero-landscape-1774.jpg',
    width: 1774,
    height: 887,
  });
  const { props: portrait } = getImageProps({
    ...common,
    src: '/assets/home/hero-portrait-800.jpg',
    width: 800,
    height: 1067,
  });

  return (
    <section id="top" className={styles.hero}>
      <picture className={styles.picture}>
        <source media="(min-width: 1024px)" srcSet={landscape} sizes="100vw" />
        <img {...portrait} alt={HERO_ALT} className={styles.image} />
      </picture>
      <span className={styles.scrim} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 className={styles.title}>
            Nigerian
            <br />
            Fusion Food.
            <br />
            Nutrition
            <br />
            at the Core.
          </h1>

          <p className={styles.lede}>
            <Keep>Chef-prepared</Keep> dishes made from scratch,
            <br />
            with quality ingredients and real flavour.
          </p>

          <ul className={styles.facts} role="list">
            {HERO_FACTS.map((fact) => (
              <li key={fact.icon} className={styles.fact}>
                <span className={styles.factRing} aria-hidden="true">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {FACT_PATHS[fact.icon].map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </svg>
                </span>
                <span className={styles.factLabel}>
                  <KeepCompounds text={fact.label} />
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <Link href="/menu" className={styles.primary} data-purchase-bar-reveal="">
              View the menu
            </Link>
            <Link href="/how-it-works" className={styles.secondary}>
              <span className={styles.secondaryInner}>
                <span className={styles.secondaryLabel}>How it works</span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

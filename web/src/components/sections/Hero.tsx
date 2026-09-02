import Image from 'next/image';
import { Fragment } from 'react';

import { Button, Eyebrow } from '@/components/ui';
import { PROOF_PATHS, PROOF_VIEW_BOX } from '@/components/ui/glyphs';
import { HERO_PROOF_POINTS } from '@/lib/content/marketing';

import styles from './Hero.module.css';

/**
 * Opening full-bleed hero: food photography under a forest-green scrim, with
 * the page's single `<h1>`, three proof points and the primary CTAs.
 *
 * The template art-directs the background rather than simply rescaling it, and
 * it does so four times — a wide letterbox on desktop, the same crop tightened
 * between 861 and 1080, that crop again for small tablets, and a portrait
 * re-frame with its own two-part gradient below 620px. `next/image` has no
 * `<picture media>` equivalent, so both crops are rendered and Hero.module.css
 * swaps them at 620px (the pattern the Next.js docs recommend for art
 * direction). Both carry `priority`: whichever one the breakpoint reveals is
 * above the fold and must not pop in.
 *
 * Below 620px the copy stops being a pinned overlay and joins the flow, so the
 * section height comes from the content and the photograph sits behind it.
 */
export function Hero() {
  return (
    <section id="top" className={styles.hero}>
      <Image
        className={styles.media}
        src="/assets/hero.png"
        alt=""
        width={1959}
        height={803}
        sizes="100vw"
        priority
      />
      <Image
        className={styles.mediaMobile}
        src="/assets/hero-mobile.png"
        alt=""
        width={1122}
        height={1402}
        sizes="100vw"
        priority
      />

      <div className={styles.content}>
        <Eyebrow tone="blush" className={styles.eyebrow}>
          Nutrition-led · No ultra-processed foods
        </Eyebrow>

        {/*
          Three break points, each revealed in a different band, so the headline
          always clears the food in the photograph: two lines on desktop, two
          shorter ones on small tablets, four on a phone.
        */}
        <h1 className={styles.title}>
          Nigerian
          <br className={styles.break2} /> fusion food,
          <br className={styles.break1} /> rooted in
          <br className={styles.break3} /> tradition.
        </h1>

        <ul className={styles.proof}>
          {HERO_PROOF_POINTS.map((point, index) => (
            <Fragment key={point.icon}>
              {index > 0 ? <li className={styles.proofRule} aria-hidden="true" /> : null}
              <li className={styles.proofItem}>
                <span className={styles.proofIcon} aria-hidden="true">
                  <svg
                    width="19"
                    height="19"
                    viewBox={PROOF_VIEW_BOX}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {PROOF_PATHS[point.icon].map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </svg>
                </span>
                <span className={styles.proofText}>
                  {point.lines[0]}
                  <br />
                  {point.lines[1]}
                </span>
              </li>
            </Fragment>
          ))}
        </ul>

        <div className={styles.actions}>
          <Button variant="primary" size="lg" href="/menu">
            View the menu
          </Button>
          <a className={styles.textLink} href="#howitworks">
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}

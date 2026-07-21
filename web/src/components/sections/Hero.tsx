import Image from 'next/image';

import { Button, Eyebrow } from '@/components/ui';

import styles from './Hero.module.css';

/**
 * Opening full-bleed hero: food photography under a forest-green scrim, with
 * the page's single `<h1>` and the two primary CTAs.
 *
 * The template art-directs the background rather than simply rescaling it — the
 * desktop crop is a wide letterbox, the mobile crop is a portrait re-frame with
 * its own gradient. `next/image` has no `<picture media>` equivalent, so both
 * are rendered and Hero.module.css swaps them at 768px (the pattern the Next.js
 * docs recommend for art direction). Both carry `priority`: whichever one the
 * breakpoint reveals is above the fold and must not pop in.
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
        sizes="130vw"
        priority
      />

      <div className={styles.content}>
        <Eyebrow tone="blush" className={styles.eyebrow}>
          Chef-prepared · Personalised · Delivered chilled
        </Eyebrow>

        <h1 className={styles.title}>
          Nigerian food,
          <br className={styles.lineBreak} /> the way it deserves to be made.
        </h1>

        <p className={styles.lede}>
          High-quality ingredients. Flavour built from real food, not additives. Nutrition-led and
          made from scratch for your table.
        </p>

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

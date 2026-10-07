import { getImageProps } from 'next/image';
import Link from 'next/link';

import { homepageSteps } from '@/lib/content/marketing';
import { BOX_BUILDER_PATH } from '@/lib/how-it-works/boxSizes';
import { offerLines, type PurchaseBarOffer } from '@/lib/purchase-bar/offer';

import { HowItWorksClip } from './HowItWorksClip';
import { KeepCompounds } from './KeepTogether';
import styles from './HowItWorks.module.css';

interface HowItWorksProps {
  /**
   * The box plan's offer — the minimum and the price of a box at it — as the
   * page already resolved it for the mobile purchase bar, so the plan is read
   * once. Null when the tenant has no usable plan: step 01 then drops its
   * minimum and the desktop note is not rendered, rather than quoting a
   * number that is not true.
   */
  offer: PurchaseBarOffer | null;
}

/** Describes what the clip shows, which is packaging and delivery. */
const CLIP_LABEL =
  'A tray of jollof rice with grilled chicken and fried plantain, beside stacked Abby’s Table meal boxes and a branded delivery box';

/**
 * The How it works band — design/Abby's Table - Homepage v2.dc.html
 * (approved, mobile + desktop) and build-handoff "How it works band".
 *
 * Four steps as a real `<ol>` (the numerals are decorative), then the looping
 * clip. Desktop puts the heading, intro and actions in a left column with the
 * steps as a 2×2 grid beside them; a phone reads heading → intro → steps →
 * "Learn more" → clip. The actions block is AFTER the copy in the DOM (the
 * desktop order) and moved below the steps on a phone with `order` — safe
 * under the ordering rule because the steps it moves past hold no controls.
 *
 * Build a Box and the "Minimum 6 dishes · From £158" note are desktop only:
 * on a phone the mobile purchase bar carries both, so showing them here too
 * would repeat them on one screen.
 *
 * NO delivery date. The earliest date was built into this band, reviewed and
 * removed; it lives only in the funnel (handoff, behaviour guide §1).
 */
export function HowItWorks({ offer }: HowItWorksProps) {
  const steps = homepageSteps(offer?.minDishes ?? null);
  const note = offer ? offerLines(offer) : null;

  return (
    <section id="howitworks" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.copy}>
            <h2 className={styles.heading}>How Abby’s Table works</h2>
            <p className={styles.intro}>Four simple steps, from our table to yours.</p>
          </div>

          <div className={styles.actions}>
            <div className={styles.pair}>
              <Link href={BOX_BUILDER_PATH} className={styles.cta}>
                Build a Box
              </Link>
              <div className={styles.moreRow}>
                <Link href="/how-it-works" className={styles.more}>
                  <span className={styles.moreInner}>
                    Learn more
                    <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </div>
            </div>

            {note ? (
              <p className={styles.note}>
                {note.minimum}
                {note.from ? ` · ${note.from}` : null}
              </p>
            ) : null}
          </div>

          {/* `role` restated: `list-style: none` drops list semantics in Safari. */}
          <ol className={styles.steps} role="list">
            {steps.map((step) => (
              <li key={step.number} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {step.number}
                </span>
                <span>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span className={styles.stepBody}>
                    <KeepCompounds text={step.body} />
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <HowItWorksClip label={CLIP_LABEL} poster={<ClipPoster />} />
      </div>
    </section>
  );
}

/**
 * The clip's opening frame, art-directed like the clip itself — 3:2 on a
 * phone, 2.4:1 from 1024 — and served through next/image. It is what shows
 * before the clip loads, with no JavaScript, and under reduced motion. Lazy:
 * the band sits below the first screen at both reference viewports.
 *
 * Decorative here: the video over it carries the label.
 *
 * ⚠ PLACEHOLDER — must not ship (#38): AI-generated footage whose sleeve copy
 * is garbled and whose dish is not on the menu (photography-shot-list §2b).
 */
function ClipPoster() {
  const common = { alt: '', sizes: '(min-width: 1280px) 1184px, 100vw', loading: 'lazy' } as const;
  const {
    props: { srcSet: desktop },
  } = getImageProps({
    ...common,
    src: '/assets/home/hiw-poster-desktop.jpg',
    width: 1200,
    height: 500,
  });
  const { props: mobile } = getImageProps({
    ...common,
    src: '/assets/home/hiw-poster-mobile.jpg',
    width: 1080,
    height: 720,
  });

  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={desktop} sizes={common.sizes} />
      <img {...mobile} alt="" className={styles.poster} />
    </picture>
  );
}

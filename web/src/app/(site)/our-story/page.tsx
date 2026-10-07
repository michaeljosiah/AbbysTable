import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import styles from './page.module.css';

/*
 * Abby's Story — ported from design/Abby's Table - Abby's Story v2.dc.html
 * (design/build-handoff.md §3u). Route per the handoff's route table.
 *
 * EVERY WORD IS THE DESIGN'S, VERBATIM. This is the founder's own account of
 * her career, her diagnosis and what she studied: do not reword, extend or
 * "tidy" any claim about her history, health or credentials here. Changes come
 * from the design, never from this file.
 *
 * ALL PHOTOGRAPHY IS PLACEHOLDER (#38) — the design's own files, copied into
 * public/assets/story/ unchanged. Alt text belongs to the photograph on screen
 * (design/CLAUDE.md, "Cards and repeated content"), so it changes when a
 * photograph is reshot.
 *
 * Deliberately absent, by the design:
 * - No eyebrows anywhere on the page (the user's call — the tier is not used).
 * - No mobile purchase bar at all — Abby's Story is the founder narrative, and
 *   a fixed "Build a Box" beside it turns the story into a sales page
 *   (design/CLAUDE.md, "Mobile purchase CTA + header behaviour"). The header
 *   CTA is the route to the box builder at every width.
 * - No film player. "Five questions, five answers" does not exist yet, and a
 *   play button over a still is a live-looking control that does nothing, so it
 *   is a captioned still until the footage arrives.
 *
 * A Server Component with no state: everything here is static copy.
 */

const DESCRIPTION =
  'Before Abby’s Table, there was a career in marketing, over 10 years in the food business, two brands of my own, and a diagnosis that changed everything.';

export const metadata: Metadata = {
  title: "Abby's Story — Abby's Table",
  description: DESCRIPTION,
  // Its own share card; the root one carries the homepage's copy.
  openGraph: { title: "Abby's Story — Abby's Table", description: DESCRIPTION, locale: 'en_GB' },
};

const ASSETS = '/assets/story';

/** The four prints along the foot of the portrait, left to right. */
const PRINTS = [
  {
    src: `${ASSETS}/polaroid-mrsj-menu.jpg`,
    width: 600,
    height: 750,
    alt: 'A Mrs J Foods wedding menu on a place setting',
  },
  {
    src: `${ASSETS}/polaroid-jollof-bowls.jpg`,
    width: 600,
    height: 750,
    alt: 'Bowls of jollof rice served at a catering event',
  },
  {
    src: `${ASSETS}/polaroid-bf-pouches.jpg`,
    width: 600,
    height: 750,
    alt: 'Béllé-Full jollof rice pouches',
  },
  {
    // A different native ratio from the other three — which is why the prints
    // are never cropped (see .print in the stylesheet).
    src: `${ASSETS}/polaroid-bf-boxes.jpg`,
    width: 600,
    height: 696,
    alt: 'Béllé-Full delivery boxes stacked in the warehouse',
  },
];

interface Chapter {
  num: string;
  title: string;
  image: { src: string; alt: string };
  body: string;
}

const CHAPTERS: Chapter[] = [
  {
    num: '01',
    title: 'From marketing to food',
    image: {
      src: `${ASSETS}/story-chapter-01.jpg`,
      alt: 'A desk with a laptop and notebooks, from the marketing years',
    },
    body: 'Food wasn’t the original plan. Tech marketing came first, until I chose to build something around the food I loved.',
  },
  {
    num: '02',
    title: 'Mrs J Foods',
    image: {
      src: `${ASSETS}/story-chapter-02.jpg`,
      alt: 'A plated Nigerian dish from the Mrs J Foods catering years',
    },
    body: 'I founded Mrs J Foods and spent several years working professionally in food, from catering at the Houses of Parliament and venues including The Lanesborough, to consulting on the wedding menu for His Majesty Ogiame Atuwatse III, the Olu of Warri, and Her Majesty Olori Atuwatse III.',
  },
  {
    num: '03',
    title: 'Béllé-Full',
    image: {
      src: `${ASSETS}/story-chapter-03.jpg`,
      alt: 'Béllé-Full meal boxes packed for delivery',
    },
    body: 'I went on to launch Béllé-Full, the UK’s first direct-to-consumer Nigerian prepared-meal brand, which grew into a nationwide business serving customers across the UK.',
  },
];

type StudyIcon = 'leaf' | 'cap' | 'seed';

const STUDIES: { icon: StudyIcon; label: string }[] = [
  { icon: 'leaf', label: 'Health & wellness study' },
  { icon: 'cap', label: 'Harvard Medical School' },
  { icon: 'seed', label: 'College of Naturopathic Medicine' },
];

/** The design's line glyphs, drawn in-house (1.4 stroke). Decorative: every one is named beside it. */
const STUDY_ICON_PATHS: Record<StudyIcon, string[]> = {
  leaf: [
    'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z',
    'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
  ],
  cap: ['M12 3 3 8l9 5 9-5-9-5Z', 'M6 10.5V15c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5', 'M21 9v5'],
  seed: [
    'M12 21a8.5 8.5 0 0 0 8.5-8.5C20.5 8 17 4.5 12 3 7 4.5 3.5 8 3.5 12.5A8.5 8.5 0 0 0 12 21Z',
    'M12 7v8',
    'M8.8 10.2c1 1.4 2.1 2 3.2 1.8 1.1.2 2.2-.4 3.2-1.8',
  ],
};

const CERTIFICATES = [
  {
    src: `${ASSETS}/cert-harvard.jpg`,
    width: 800,
    height: 618,
    alt: 'Harvard Medical School Executive Education certificate: Health and Wellness — Designing a Sustainable Nutrition Plan, June 2025',
  },
  {
    src: `${ASSETS}/cert-cnm.jpg`,
    width: 800,
    height: 566,
    alt: 'CNM Diploma as a Health Coach, awarded to Esther Josiah, July 2026',
  },
];

const PRINCIPLES = [
  'Better ingredients.',
  'Nutrition taken seriously.',
  'No unnecessary shortcuts.',
  'Nigerian flavour at the centre.',
];

/*
 * `sizes` for the three photographs cropped with `object-fit: cover`: the
 * landscape sources (16:9) fill a SQUARE box, so the image is drawn at the
 * box's height × 1.78, not the box's width. Stated as that drawn width, or the
 * browser picks a candidate half the size it paints and the face goes soft.
 */
const HERO_SIZES = '(min-width: 1280px) 1030px, (min-width: 1024px) 91vw, 178vw';
const FILM_SIZES = '(min-width: 1280px) 930px, (min-width: 1024px) 82vw, 178vw';

export default function OurStoryPage() {
  return (
    <>
      {/*
       * Hero. Copy, then the portrait with its collage, then the CTA — the
       * phone order. From 1024 grid placement returns the CTA to the copy
       * column; the only thing it moves past is the photograph, which holds no
       * controls (design/CLAUDE.md allows exactly that case).
       */}
      <section className={`${styles.band} ${styles.heroBand}`}>
        <div className={styles.inner}>
          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <h1 className={styles.title}>The story behind Abby’s Table</h1>
              <p className={styles.lede}>{DESCRIPTION}</p>
              <p className={styles.signature}>— Esther Abby Josiah</p>
            </div>

            {/* Portrait and collage are one figure at every width: the brand
                cards and prints are positioned ON the photograph, against the
                figure rather than the viewport, so the collage reflows. */}
            <div className={styles.heroFigure}>
              <div className={styles.heroMedia}>
                {/* The one fetchpriority="high" on the page: the likely LCP.
                    `priority` alone only preloads it in Next 15. */}
                <Image
                  src={`${ASSETS}/story-hero.jpg`}
                  alt="Abby at her marble kitchen counter in a forest-green dress"
                  fill
                  priority
                  fetchPriority="high"
                  sizes={HERO_SIZES}
                  className={styles.heroImage}
                />
              </div>

              <div className={styles.collage}>
                <div className={styles.logos}>
                  <div className={styles.logoCard}>
                    <Image
                      src={`${ASSETS}/mrsj-logo.png`}
                      alt="Mrs J — luxury Nigerian catering"
                      width={610}
                      height={280}
                      // Inside the first viewport at 390×844 and 1440×900:
                      // eager by position (design/CLAUDE.md, Image production
                      // standards), whatever its place in the DOM.
                      loading="eager"
                      sizes="160px"
                      className={styles.logo}
                    />
                  </div>
                  <div className={styles.logoCard}>
                    <Image
                      src={`${ASSETS}/bellefull-logo-sm.png`}
                      alt="Béllé-Full — freshly cooked Nigerian meals delivered UK-wide"
                      width={700}
                      height={196}
                      loading="eager"
                      sizes="160px"
                      className={styles.logo}
                    />
                  </div>
                </div>

                <div className={styles.prints}>
                  {PRINTS.map((print) => (
                    <Image
                      key={print.src}
                      src={print.src}
                      alt={print.alt}
                      width={print.width}
                      height={print.height}
                      loading="eager"
                      sizes="(min-width: 1024px) 130px, 25vw"
                      className={styles.print}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={`${styles.ctaRow} ${styles.heroCtaRow}`}>
              {/* An in-page jump, not a route: a plain anchor works without JS. */}
              <a className={`${styles.cta} ${styles.ctaHero}`} href="#chapter-01">
                Start at the beginning
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="chapter-01" className={`${styles.band} ${styles.chaptersBand}`}>
        <div className={styles.inner}>
          <h2 className={styles.heading}>More than a decade in food. Two brands.</h2>

          {/* role="list": `list-style: none` drops list semantics in Safari/VoiceOver. */}
          <ol className={styles.chapters} role="list">
            {CHAPTERS.map((chapter) => (
              <li key={chapter.num} className={styles.chapter}>
                {/* The list already numbers the chapters for assistive tech. */}
                <span className={styles.num} aria-hidden="true">
                  {chapter.num}
                </span>
                <h3 className={styles.chapterTitle}>{chapter.title}</h3>
                <div className={styles.chapterMedia}>
                  <Image
                    src={chapter.image.src}
                    alt={chapter.image.alt}
                    fill
                    sizes="(min-width: 1280px) 370px, (min-width: 1024px) 30vw, (min-width: 640px) 260px, 100vw"
                    className={styles.cover}
                  />
                </div>
                <p className={styles.body}>{chapter.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/*
       * The one dark band, and the reason the page exists. Near-black rather
       * than the system's green-deep and a brass accent line rather than gold —
       * both the user's call, so the band reads as its own moment.
       */}
      <section className={`${styles.band} ${styles.diagnosisBand}`}>
        <div className={styles.inner}>
          <div className={styles.diagnosis}>
            <div className={styles.diagnosisCopy}>
              <h2 className={styles.heading}>
                3 days after my 33rd birthday, I was diagnosed with breast cancer.
              </h2>
              <p className={styles.body}>
                That changed everything. After treatment and recovery, I began to think more deeply
                about the relationship between food and health, and how the choices we make around
                food can shape our overall wellbeing. That change in perspective eventually led me
                to close the businesses I had spent years building and step away from food
                professionally.
              </p>
            </div>

            <div className={`${styles.media} ${styles.diagnosisMedia}`}>
              <Image
                src={`${ASSETS}/story-diagnosis.jpg`}
                alt="Abby, photographed in 2017"
                fill
                sizes="(min-width: 1280px) 525px, (min-width: 1024px) 46vw, 100vw"
                className={styles.cover}
              />
            </div>

            {/* Below the photograph on a phone, back under the copy from 1024.
                Text moving past an image: no tab-order consequence. */}
            <p className={styles.remission}>Treatment. Recovery. Remission.</p>
          </div>
        </div>
      </section>

      {/* Three-up from 1024: copy | certificates | quote. DOM order is the
          visual order at every width. */}
      <section className={`${styles.band} ${styles.learnBand}`}>
        <div className={styles.inner}>
          <div className={styles.learn}>
            <div>
              <h2 className={styles.heading}>
                Remission became more than recovery. It became a mission.
              </h2>
              <p className={styles.body}>
                A mission to understand more about the food we eat, the choices we make and the role
                nutrition can play in our health. That curiosity took me back to study health,
                wellness and nutrition, and changed the way I thought about food entirely.
              </p>

              <ul className={styles.studies} role="list">
                {STUDIES.map((study) => (
                  <li key={study.label} className={styles.study}>
                    <span className={styles.studyRing} aria-hidden="true">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={styles.studyIcon}
                      >
                        {STUDY_ICON_PATHS[study.icon].map((d) => (
                          <path key={d} d={d} />
                        ))}
                      </svg>
                    </span>
                    <span className={styles.studyLabel}>{study.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.certsCell}>
              <div className={styles.certs}>
                <h3 className={styles.certsHeading}>What I studied</h3>
                <div className={styles.marks}>
                  {CERTIFICATES.map((cert) => (
                    <Image
                      key={cert.src}
                      src={cert.src}
                      alt={cert.alt}
                      width={cert.width}
                      height={cert.height}
                      sizes="(min-width: 1024px) 260px, (min-width: 640px) 45vw, 90vw"
                      className={styles.mark}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.quoteCell}>
              <blockquote className={styles.quote}>
                <span className={styles.quoteMark} aria-hidden="true">
                  “
                </span>
                <p className={styles.quoteText}>
                  It was no longer only, ‘Does this taste good?’ It was also, ‘What is this doing to
                  the body?’
                </p>
                <span className={styles.quoteRule} aria-hidden="true" />
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.band} ${styles.todayBand}`}>
        <div className={styles.inner}>
          <div className={styles.today}>
            <div>
              <h2 className={styles.heading}>Nigerian food, from a different perspective.</h2>
              <p className={styles.body}>
                Abby’s Table takes everything I know about Nigerian food and combines it with
                everything I went back to learn about ingredients, nutrition and health.
              </p>
              <ul className={styles.principles} role="list">
                {PRINCIPLES.map((principle) => (
                  <li key={principle} className={styles.principle}>
                    <span className={styles.lozenge} aria-hidden="true">
                      ⬥
                    </span>
                    {principle}
                  </li>
                ))}
              </ul>
              <div className={styles.ctaRow}>
                <Link className={`${styles.cta} ${styles.ctaSection}`} href="/menu">
                  See what’s on the table
                </Link>
              </div>
            </div>

            {/*
             * The film is a captioned still: the footage does not exist yet, and
             * a play button over a still is a live-looking control that does
             * nothing (design/CLAUDE.md, "Working practice"). When the film
             * arrives it follows "Motion and video" there; until then there is
             * nothing to press. The caption is the panel heading tier, not a
             * heading — the mockup's COMING SOON eyebrow and rule are dropped.
             */}
            <figure className={styles.film}>
              <div className={styles.filmMedia}>
                <Image
                  src={`${ASSETS}/story-video-still.jpg`}
                  alt="Abby in her kitchen, talking to camera"
                  fill
                  sizes={FILM_SIZES}
                  className={styles.cover}
                />
              </div>
              <figcaption className={styles.filmCaption}>
                <span className={styles.filmTitle}>Five questions, five answers</span>
                <span className={styles.filmLine}>A short film with Abby.</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>
    </>
  );
}

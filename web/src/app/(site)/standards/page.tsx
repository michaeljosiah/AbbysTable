import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import { BackToDish } from '@/components/standards/BackToDish';
import { ExampleDishPanel } from '@/components/standards/ExampleDishPanel';
import { JumpLink } from '@/components/standards/JumpLink';
import { MobilePurchaseBar } from '@/components/purchase-bar/MobilePurchaseBar';
import { ProhibitionMark } from '@/components/standards/ProhibitionMark';
import { getStandardsPageData } from '@/lib/aonik/client';
import type { Dish } from '@/lib/aonik/types';
import { BRAND_STANDARDS } from '@/lib/content/marketing';
import {
  PROHIBITION_GLYPHS,
  STANDARD_BANDS,
  STANDARDS_EXAMPLE_DISH_SLUG,
  STANDARDS_HERO_IMAGE,
  type StandardBand,
} from '@/lib/content/standards';
import { readDishReturnSlug, resolveDishReturn } from '@/lib/dish-return';
import { formatCountInWords } from '@/lib/format';
import { getPurchaseBarData } from '@/lib/purchase-bar/data';

import styles from './page.module.css';

/*
 * Our Standards — ported from design/Abby's Table - Standards v2.dc.html
 * (approved), behaviour from the page behaviour guide §5.
 *
 * A sage hero with the four prohibitions, a "What goes in" chapter opener with
 * an index of the five standards, bands 01–05 alternating cream and blush,
 * then the closing CTA on the hero's ground. Copy lives in
 * `lib/content/standards.ts`; the only commerce data — the example dish and
 * the box minimum — is fetched here, once, and passed down.
 *
 * Rendered per request: it reads its query to decide whether to offer "Back to
 * dish" (`lib/dish-return.ts`), and validates that dish against the catalogue
 * on the server.
 *
 * The mobile purchase bar (#12) waits for the hero's "See what goes in" and is
 * suppressed from the closing CTA through the footer. Out of scope here,
 * deliberately: the "↑ Top" control, and the header's desktop auto-hide (the
 * chrome overhaul, #10).
 */

const DESCRIPTION =
  'Nigerian fusion food made properly. With carefully chosen ingredients, nutrition at the core, bold flavour and complete transparency.';

export const metadata: Metadata = {
  title: "Our standards — Abby's Table",
  description: DESCRIPTION,
  openGraph: { title: "Our standards — Abby's Table", description: DESCRIPTION, locale: 'en_GB' },
};

const BUILD_A_BOX_HREF = '/box';

/**
 * Hyphenated compounds never split across lines (design/CLAUDE.md): the data
 * keeps an ordinary hyphen and the compound is protected where it renders.
 */
const NO_BREAK_COMPOUNDS = /(ultra-processed)/;

function keepCompounds(text: string): ReactNode {
  return text.split(NO_BREAK_COMPOUNDS).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className={styles.nowrap}>
        {part}
      </span>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/** The tick beside each fact: a status mark, so brass-ink rather than type. */
function Tick() {
  return (
    <svg
      className={styles.tick}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

/**
 * One standard: lead copy, then the visual, then the fact list — the phone's
 * order, and the DOM order at every width. From 1024 the visual takes its own
 * column on alternating sides; nothing interactive moves past anything else
 * (band 05's panel holds the page's only in-band link, and it is the band's
 * only control), so focus order and reading order stay together.
 */
function StandardRow({
  band,
  flip,
  exampleDish,
}: {
  band: StandardBand;
  flip: boolean;
  exampleDish: Dish | null;
}) {
  const panel = !band.image && exampleDish ? exampleDish : null;
  const hasVisual = Boolean(band.image || panel);

  return (
    <div
      id={band.id}
      className={[styles.row, flip && styles.rowFlip, !hasVisual && styles.rowSolo]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.lead}>
        <span className={styles.num} aria-hidden="true">
          {band.number}
        </span>
        <h3 className={styles.bandTitle}>{band.title}</h3>
        <p className={styles.bandLede}>{band.lede}</p>
      </div>

      {band.image ? (
        <figure className={`${styles.figure} ${styles.bandFigure}`}>
          <Image
            src={band.image.src}
            alt={band.image.alt}
            fill
            sizes="(min-width: 1280px) 568px, (min-width: 1024px) 44vw, (min-width: 640px) calc(100vw - 68px), calc(100vw - 44px)"
            className={styles.image}
          />
        </figure>
      ) : panel ? (
        <ExampleDishPanel dish={panel} className={styles.panelFigure} />
      ) : null}

      <div className={styles.facts}>
        {band.facts.map((fact) => (
          <div key={fact.title} className={styles.fact}>
            <Tick />
            <p className={styles.factTitle}>{fact.title}</p>
            <p className={styles.factBody}>{fact.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function StandardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const returnSlug = readDishReturnSlug(await searchParams);

  // Each piece is optional and degrades on its own (see getStandardsPageData
  // and getPurchaseBarData).
  const [{ exampleDish, minDishes, returnDish }, purchaseBar] = await Promise.all([
    getStandardsPageData({ exampleDishSlug: STANDARDS_EXAMPLE_DISH_SLUG, returnSlug }),
    getPurchaseBarData(),
  ]);

  // Null unless the query names a dish the catalogue actually has.
  const dishReturn = resolveDishReturn(returnSlug, returnDish);

  const [firstBand, ...laterBands] = STANDARD_BANDS;

  return (
    <>
      {/* HERO on --sage: the homepage's sanctioned "Our standards" ground —
          this page is that band expanded. Brass is only 2.2:1 on sage, so the
          marks use brass-ink (on their own cream cards). */}
      <section className={styles.hero}>
        <div className={styles.inner}>
          {dishReturn ? <BackToDish slug={dishReturn.slug} href={dishReturn.href} /> : null}

          <div className={styles.heroGrid}>
            <div className={styles.heroLead}>
              {/* A three-line title with hard breaks: art direction from the
                  approved copy, kept at every width. Do not replace them with
                  a measure and do not remove them. The spaces keep the words
                  apart for anything that reads the text without layout. */}
              <h1 className={styles.title}>
                Great food{' '}
                <br />
                Starts with{' '}
                <br />
                Higher Standards
              </h1>
              <p className={styles.heroLede}>{DESCRIPTION}</p>
            </div>

            <figure className={`${styles.figure} ${styles.heroFigure}`}>
              <Image
                src={STANDARDS_HERO_IMAGE.src}
                alt={STANDARDS_HERO_IMAGE.alt}
                fill
                priority
                fetchPriority="high"
                sizes="(min-width: 1280px) 576px, (min-width: 1024px) 45vw, (min-width: 640px) calc(100vw - 68px), calc(100vw - 44px)"
                className={styles.image}
              />
            </figure>

            <div className={styles.heroTail}>
              {/* The brand's signature device: the standard stated as what is
                  left out. role="list": list-style none drops list semantics
                  in Safari/VoiceOver. */}
              <ul className={styles.nos} role="list">
                {BRAND_STANDARDS.map((claim) => (
                  <li key={claim} className={styles.no}>
                    <ProhibitionMark glyph={PROHIBITION_GLYPHS[claim]} className={styles.noMark} />
                    <span>{keepCompounds(claim)}</span>
                  </li>
                ))}
              </ul>

              {/* 54px hero CTA. Green-forest, not terracotta: a named
                  departure approved for this page only (design/CLAUDE.md,
                  Standards page). An in-page jump that adds no history
                  entry, as the design's goStandards does. Also what the
                  mobile purchase bar waits to lose sight of. */}
              <JumpLink
                targetId="standards"
                className={`${styles.cta} ${styles.heroCta}`}
                data-purchase-bar-reveal=""
              >
                See what goes in
              </JumpLink>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter opener for the whole 01–05 run, then band 01 on the same
          cream: between the two the transition is carried by the heading and
          the brass rule, never a second cream. */}
      <section id="standards" className={`${styles.band} ${styles.cream}`}>
        <div className={styles.inner}>
          <div className={styles.head}>
            <h2 className={styles.sectionTitle}>
              What goes in
            </h2>
            <p className={styles.headLede}>
              Five simple standards guide everything we make, from the ingredients we choose to the
              way we cook, so every meal is delicious, nutritious and made with integrity.
            </p>

            {/* The index: anchors to the five bands — numeral and hover
                colour carry it, no underline. A list of rows on a phone (five
                columns at 390 would break every label over three lines),
                five across from 1024. */}
            <nav className={styles.index} aria-label="The five standards">
              {STANDARD_BANDS.map((band) => (
                <a key={band.id} href={`#${band.id}`} className={styles.indexItem}>
                  <span className={styles.indexNum} aria-hidden="true">
                    {band.number}
                  </span>
                  <span className={styles.indexLabel}>{band.title}</span>
                  <svg
                    className={styles.indexChevron}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </a>
              ))}
            </nav>

            {/* The footer's 2px brass divider, used mid-page: a named
                departure approved for this page only. */}
            <div className={styles.headRule} aria-hidden="true" />
          </div>

          <StandardRow band={firstBand} flip={false} exampleDish={exampleDish} />
        </div>
      </section>

      {laterBands.map((band, index) => (
        <section
          key={band.id}
          className={`${styles.band} ${band.ground === 'blush' ? styles.blush : styles.cream}`}
        >
          <div className={styles.inner}>
            {/* Photographs alternate sides from 1024: right on 02 and 04. */}
            <StandardRow band={band} flip={index % 2 === 0} exampleDish={exampleDish} />
          </div>
        </section>
      ))}

      {/* Closing CTA on the hero's ground, so the page opens and closes on the
          same colour. Green-forest by role: terracotta is reserved for the
          header pill, the hero CTA and the drawer CTA. The purchase bar is
          suppressed from here through the footer: this band has its own
          Build a Box. */}
      <section
        className={`${styles.band} ${styles.sage} ${styles.closing}`}
        data-purchase-bar-stop=""
      >
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>
            Ready to fill your box?
          </h2>
          <p className={styles.closingLede}>
            {/* The minimum is data (in words, as the design sets it); without
                it the line names no number rather than guessing one. */}
            {minDishes !== null
              ? `Choose at least ${formatCountInWords(minDishes)} dishes`
              : 'Choose your dishes'}
            , personalise where available, and pick your delivery date.
          </p>
          <div className={styles.closingActions}>
            <Link href={BUILD_A_BOX_HREF} className={`${styles.cta} ${styles.closingCta}`}>
              Build a Box
            </Link>
          </div>
        </div>
      </section>

      <MobilePurchaseBar data={purchaseBar} />
    </>
  );
}

import { Button, SectionHeading } from '@/components/ui';
import type { BoxOffer } from '@/lib/aonik/types';
import { formatPrice } from '@/lib/format';

import styles from './BoxesPromo.module.css';

/**
 * The copy spells small box sizes out ("Six chef-prepared dishes") rather than
 * printing digits, so the count from Aonik is worded here. Twelve is the top of
 * the range any box realistically reaches; past that the numeral is a sane
 * fallback.
 */
const NUMBER_WORDS: readonly string[] = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

function spellCount(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

/** "six" -> "Six", for the word that opens the heading. */
function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

interface BoxesPromoProps {
  /**
   * The box the band leads with — the smallest, which is also the minimum
   * order. Its price is quoted as a floor ("from £…"), because larger boxes
   * cost more in total.
   */
  entryBox: BoxOffer;
}

/**
 * Forest-green promo band: the entry box, what it costs and where it goes.
 *
 * Every number on screen — the dish count, the price, the minimum — arrives as
 * a prop, so a change in Aonik lands without touching this file.
 */
export function BoxesPromo({ entryBox }: BoxesPromoProps) {
  return (
    <section id="boxes" className={styles.section}>
      <div className="band">
        <SectionHeading level={2} tone="cream" align="center">
          {capitalise(spellCount(entryBox.dishCount))} chef-prepared dishes
          <br />
          from <span className={styles.price}>{formatPrice(entryBox.pricePence)}</span>
        </SectionHeading>

        <p className={styles.blurb}>
          Nigerian fusion, made from scratch with quality ingredients and nutrition at the core.
        </p>

        <p className={styles.terms}>
          {entryBox.dishCount}-dish minimum order
          <span className={styles.dot} aria-hidden="true">
            •
          </span>
          Mainland UK delivery
        </p>

        <div className={styles.cta}>
          <Button variant="outline-brass" href="/menu">
            Choose your dishes
          </Button>
        </div>
      </div>
    </section>
  );
}

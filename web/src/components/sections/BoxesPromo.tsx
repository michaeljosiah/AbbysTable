import { Button, SectionHeading } from '@/components/ui';
import type { BoxOffer } from '@/lib/aonik/types';
import { formatPrice } from '@/lib/format';

import styles from './BoxesPromo.module.css';

/**
 * The copy spells small box sizes out ("Eight chef-prepared dishes", "four
 * dishes") rather than printing digits, so the count from Aonik is worded here.
 * Twelve is the top of the range any box realistically reaches; past that the
 * numeral is a sane fallback.
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

/** "eight" -> "Eight", for the word that opens the heading. */
function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

interface BoxesPromoProps {
  mainBox: BoxOffer;
  tasterBox: BoxOffer;
  /** Already formatted for display, e.g. "6 August". */
  earliestDeliveryLabel: string;
}

/**
 * Forest-green promo band: the headline box, the earliest delivery date and a
 * nudge towards the smaller taster box.
 *
 * Every number on screen — dish counts, prices, the delivery date — arrives as
 * a prop, so a change in Aonik lands without touching this file.
 */
export function BoxesPromo({ mainBox, tasterBox, earliestDeliveryLabel }: BoxesPromoProps) {
  return (
    <section id="boxes" className={styles.section}>
      <div className="band">
        <SectionHeading level={2} tone="cream" align="center">
          {capitalise(spellCount(mainBox.dishCount))} chef-prepared dishes.{' '}
          <span className={styles.price}>{formatPrice(mainBox.pricePence)}</span>
        </SectionHeading>

        {mainBox.blurb ? <p className={styles.blurb}>{mainBox.blurb}</p> : null}

        <p className={styles.delivery}>
          Earliest UK-wide delivery:{' '}
          <strong className={styles.deliveryDate}>{earliestDeliveryLabel}</strong> · Choose your
          date at checkout
        </p>

        <div className={styles.ctaRow}>
          <Button variant="outline-light" href="/menu">
            Choose your meals
          </Button>
          <span className={styles.taster}>
            New here?{' '}
            <a className={styles.tasterLink} href="/menu">
              Try the Taster Box — {spellCount(tasterBox.dishCount)} dishes,{' '}
              {formatPrice(tasterBox.pricePence)}
            </a>
          </span>
        </div>
      </div>
    </section>
  );
}

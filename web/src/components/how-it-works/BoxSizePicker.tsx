'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useId } from 'react';

import {
  BOX_BUILDER_PATH,
  DISHES_PARAM,
  priceReadout,
  selectedOption,
  type BoxSizeModel,
  type PriceReadout,
} from '@/lib/how-it-works/boxSizes';

import { useBoxSize } from './BoxSizeProvider';
import styles from './BoxSizePicker.module.css';

/** "From", the figure and any saving — nothing at all when it cannot be priced. */
function PriceLines({ price, saving }: PriceReadout) {
  if (!price) return null;
  return (
    <>
      <span className={styles.priceFrom}>From</span>{' '}
      <span className={styles.priceValue}>{price}</span>
      {saving ? (
        <>
          {' '}
          <span className={styles.saving}>{saving}</span>
        </>
      ) : null}
    </>
  );
}

/**
 * How it works step 1: "Choose a size" — design/Abby's Table - How It Works
 * v2.dc.html (`.hw-panel`), build-handoff §3v, contract §4c.
 *
 * Semantics: native radio inputs, one `name`, in a labelled `radiogroup`. That
 * gives the platform's own keyboard model for free — Tab enters the group at
 * the checked size, the arrow keys move and select, Space selects — and it
 * keeps working without JavaScript. (The prototype used `aria-pressed` toggle
 * buttons; a single-choice set is a radio group.)
 *
 * No JavaScript: the panel is a GET form to Choose Box, so the radios still
 * choose and "Start building" still submits `?dishes=<choice>` — the same URL
 * the links build. With JavaScript, `next/form` makes that a client-side
 * navigation, and the choice is shared with the page's other purchase links.
 */
export function BoxSizePicker({ model }: { model: BoxSizeModel }) {
  const { selectedId, select } = useBoxSize();
  const labelId = useId();

  const current = selectedOption(model, selectedId);

  // No plan: nothing to choose between, so the panel is just the way in.
  if (!current) {
    return (
      <div className={styles.panel}>
        <div className={styles.body}>
          <div className={styles.ctaRow}>
            <Link href={BOX_BUILDER_PATH} className={styles.cta}>
              Start building
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Form action={BOX_BUILDER_PATH} className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.label} id={labelId}>
          Choose a size
        </span>

        {/* Announced politely and only on change: the server renders the same
            text the first client render does, so loading the page is silent;
            choosing a size with a different figure is not. Atomic, so "From",
            the figure and the saving are read as one phrase. */}
        <p className={styles.price} aria-live="polite" aria-atomic="true">
          <PriceLines {...priceReadout(current)} />
        </p>

        {/* No JavaScript: every option's figure, and CSS shows the one whose
            radio is checked, so the read-out still follows the choice. With
            scripting on, a <noscript>'s content is inert text, so this never
            duplicates the live region above. */}
        <noscript>
          <span className={`${styles.price} ${styles.priceStatic}`}>
            {model.options.map((option) => (
              <span key={option.id} className={styles.priceOption}>
                <PriceLines {...priceReadout(option)} />
              </span>
            ))}
          </span>
        </noscript>

        <div className={styles.sizes} role="radiogroup" aria-labelledby={labelId}>
          {model.options.map((option) => (
            <label key={option.id} className={styles.size}>
              <input
                className={styles.input}
                type="radio"
                name={DISHES_PARAM}
                value={option.id}
                checked={option.id === current.id}
                onChange={() => select(option.id)}
              />
              <span className={styles.face}>
                <span className={styles.figure}>{option.label}</span>
                {option.subLabel ? (
                  <span className={styles.sub}>{` ${option.subLabel}`}</span>
                ) : null}
                <span className="visuallyHidden">{option.srSuffix}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        {model.minDishes !== null ? (
          <p className={styles.note}>Minimum {model.minDishes} dishes.</p>
        ) : null}
        <div className={styles.ctaRow}>
          <button type="submit" className={styles.cta}>
            Start building
          </button>
        </div>
      </div>
    </Form>
  );
}

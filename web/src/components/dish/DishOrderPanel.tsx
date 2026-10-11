'use client';

import { useEffect } from 'react';
import {
  linePortion,
  portionModel,
  portionSelection,
  type PortionKey,
} from '@/lib/dish/portions';

import { PortionCard, PortionMacros } from './PortionCard';
import { useDishOrder } from './DishOrderProvider';
import { StandardsLink } from './StandardsLink';
import { useDishReturn } from './useDishReturn';
import styles from './DishOrderPanel.module.css';

/**
 * Joins the portion card to the cart through `DishOrderProvider`, which owns
 * the current choice and the add-to-box action this button shares with the
 * mobile purchase bar.
 *
 * It also holds both dish-side ends of the Our Standards round trip
 * (`lib/dish-return.ts`), because it is what knows the current choice: "See
 * our standards" records the whole selection, and on a genuine return
 * `useDishReturn` hands it back for the portion card to restore.
 */
export function DishOrderPanel() {
  const {
    dish,
    optionGroups,
    choice,
    setChoice,
    addToBox,
    pending,
    handingOff,
    error,
  } = useDishOrder();
  const { selection: restoredSelection, discard: discardReturn } =
    useDishReturn(dish.slug, optionGroups);
  const model = portionModel(optionGroups);
  const portion = linePortion(choice.personalisation) ?? 'light';
  const select = (key: PortionKey) => {
    discardReturn();
    setChoice({
      personalisation: portionSelection(key),
      complete: { portion: key },
      surchargePence: model?.choices.find((item) => item.key === key)
        ?.pricePence,
    });
  };
  useEffect(() => {
    const key = restoredSelection?.portion?.[0];
    if (key !== 'light' && key !== 'full') return;
    const restored = portionModel(optionGroups)?.choices.find(
      (item) => item.key === key,
    );
    if (restored)
      setChoice({
        personalisation: portionSelection(key),
        complete: { portion: key },
        surchargePence: restored.pricePence,
      });
  }, [restoredSelection, optionGroups, setChoice]);

  return (
    <>
      <StandardsLink slug={dish.slug} selection={choice.complete} />

      <PortionCard
        groups={optionGroups}
        value={portion}
        onChange={select}
        disabled={pending || handingOff}
      >
        <PortionMacros dish={dish} portion={portion} />
      </PortionCard>

      {/* Scrolling past this button is what reveals the mobile bar's "Add to
          box" — one add control on screen at a time (Dish Landing v2). */}
      <button
        type="button"
        className={styles.cta}
        onClick={addToBox}
        disabled={pending || handingOff || !model}
        aria-disabled={handingOff || undefined}
        data-purchase-bar-reveal=""
      >
        Add to your box
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </button>
      {error ? <p role="alert">{error.message} Please try again.</p> : null}
    </>
  );
}

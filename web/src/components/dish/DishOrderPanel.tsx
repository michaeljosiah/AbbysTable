'use client';

import { hasOptionChoices } from '@/lib/aonik/personalisation';

import { DishPersonaliser } from './DishPersonaliser';
import { useDishOrder } from './DishOrderProvider';
import styles from './DishOrderPanel.module.css';

/**
 * Joins the personaliser to the cart through `DishOrderProvider`, which owns
 * the current choice and the add-to-box action this button shares with the
 * mobile purchase bar.
 */
export function DishOrderPanel() {
  const { dish, optionGroups, setChoice, addToBox, pending, error } = useDishOrder();

  return (
    <>
      {hasOptionChoices(optionGroups) ? (
        <DishPersonaliser dish={dish} optionGroups={optionGroups} onChange={setChoice} />
      ) : null}

      {/* Scrolling past this button is what reveals the mobile bar's "Add to
          box" — one add control on screen at a time (Dish Landing v2). */}
      <button
        type="button"
        className={styles.cta}
        onClick={addToBox}
        disabled={pending}
        data-purchase-bar-reveal=""
      >
        Add this dish to your box
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

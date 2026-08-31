'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import type { MappedOptionGroup, PersonalisationSelection } from '@/lib/aonik/map';
import { hasOptionChoices } from '@/lib/aonik/personalisation';
import type { Dish } from '@/lib/aonik/types';
import { useCart } from '@/lib/cart/CartProvider';

import { DishPersonaliser } from './DishPersonaliser';
import styles from './DishOrderPanel.module.css';

/**
 * Joins the personaliser to the cart: owns the current choice so "Add this dish
 * to your box" can write a complete line, then hands off to Step 1.
 */
interface DishOrderPanelProps {
  dish: Dish;
  optionGroups: MappedOptionGroup[];
}

interface Choice {
  personalisation?: PersonalisationSelection;
  surchargePence: number | undefined;
}

export function DishOrderPanel({ dish, optionGroups }: DishOrderPanelProps) {
  const router = useRouter();
  const { addLine, boxSize, pending, error } = useCart();
  const [choice, setChoice] = useState<Choice>({ surchargePence: 0 });

  const handleChange = useCallback((next: Choice) => setChoice(next), []);

  const addToBox = async () => {
    if (pending) return;
    try {
      await addLine({
        dishId: dish.id,
        slug: dish.slug,
        title: dish.title,
        imageUrl: dish.imageUrl,
        quantity: 1,
        personalisation: choice.personalisation,
        // Signature dishes carry their upgrade as part of the per-unit surcharge.
        surchargePence:
          choice.surchargePence === undefined
            ? undefined
            : choice.surchargePence + (dish.upgradePence ?? 0),
      });

      // Navigate only after the authoritative cart has been adopted.
      router.push(boxSize === null ? '/box' : '/box/dishes');
    } catch {
      // The inline provider error below is the actionable failure state.
    }
  };

  return (
    <>
      {hasOptionChoices(optionGroups) ? (
        <DishPersonaliser dish={dish} optionGroups={optionGroups} onChange={handleChange} />
      ) : null}

      <button type="button" className={styles.cta} onClick={addToBox} disabled={pending}>
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

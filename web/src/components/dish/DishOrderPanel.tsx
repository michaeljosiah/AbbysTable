'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import type { Dish, PersonalisationOptions } from '@/lib/aonik/types';
import { useCart, type CartPersonalisation } from '@/lib/cart/CartProvider';

import { DishPersonaliser } from './DishPersonaliser';
import styles from './DishOrderPanel.module.css';

/**
 * Joins the personaliser to the cart: owns the current choice so "Add this dish
 * to your box" can write a complete line, then hands off to Step 1.
 */
interface DishOrderPanelProps {
  dish: Dish;
  options: PersonalisationOptions;
}

interface Choice {
  personalisation?: CartPersonalisation;
  surchargePence: number;
}

export function DishOrderPanel({ dish, options }: DishOrderPanelProps) {
  const router = useRouter();
  const { addLine, boxSize } = useCart();
  const [choice, setChoice] = useState<Choice>({ surchargePence: 0 });

  const handleChange = useCallback((next: Choice) => setChoice(next), []);

  const addToBox = () => {
    addLine({
      dishId: dish.id,
      slug: dish.slug,
      title: dish.title,
      imageUrl: dish.imageUrl,
      quantity: 1,
      personalisation: choice.personalisation,
      // Signature dishes carry their upgrade as part of the per-unit surcharge.
      surchargePence: choice.surchargePence + (dish.upgradePence ?? 0),
    });

    // Straight to the dish picker if a box size already exists, otherwise Step 1.
    router.push(boxSize === null ? '/box' : '/box/dishes');
  };

  return (
    <>
      {dish.personalisation.length > 0 ? (
        <DishPersonaliser dish={dish} options={options} onChange={handleChange} />
      ) : null}

      <button type="button" className={styles.cta} onClick={addToBox}>
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
    </>
  );
}

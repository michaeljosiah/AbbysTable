'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { MappedOptionGroup, PersonalisationSelection } from '@/lib/aonik/map';
import type { Dish } from '@/lib/aonik/types';
import { useCart } from '@/lib/cart/CartProvider';
import type { CartRequestError } from '@/lib/cart/transport';
import { boxResumeHref } from '@/lib/purchase-bar/activeBox';

import styles from './DishOrderPanel.module.css';

/**
 * The dish page's ONE add-to-box action, shared by the two controls that
 * trigger it: the inline "Add this dish to your box" (`DishOrderPanel`) and
 * the mobile bar's "Add to box" (`DishPurchaseBar`). Owns the customer's
 * current choice so either writes the same complete line, then hands off to
 * the box flow — Step 1 while no size is chosen, Step 2 once one is.
 *
 * Also owns the confirmation toast (Dish Landing v2's flash: a green-forest
 * pill rising from the bottom edge), outside the bar so it shows at every
 * width and whichever control was used.
 */
interface DishChoice {
  personalisation?: PersonalisationSelection;
  /** The whole selection while personalising — what the Our Standards trip carries. */
  complete?: PersonalisationSelection;
  surchargePence: number | undefined;
}

interface DishOrderState {
  dish: Dish;
  optionGroups: MappedOptionGroup[];
  choice: DishChoice;
  setChoice: (choice: DishChoice) => void;
  /** Adds the dish as currently chosen, confirms it, then goes to the box. */
  addToBox: () => Promise<void>;
  pending: boolean;
  error: CartRequestError | null;
}

const DishOrderContext = createContext<DishOrderState | null>(null);

/** How long the toast stays up — Dish Landing v2's `flash`. */
const TOAST_MS = 2400;

export function DishOrderProvider({
  dish,
  optionGroups,
  children,
}: {
  dish: Dish;
  optionGroups: MappedOptionGroup[];
  children: ReactNode;
}) {
  const router = useRouter();
  const { addLine, boxSize, pending, error } = useCart();
  const [choice, setChoice] = useState<DishChoice>({ surchargePence: 0 });
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const addToBox = useCallback(async () => {
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
    } catch (cause) {
      // The panel's inline alert carries the failure too; the toast is for
      // whoever tapped the bar with the panel scrolled out of sight.
      const message = cause instanceof Error ? cause.message : 'The box could not be updated.';
      flash(`${message} Please try again.`);
      return;
    }

    // Only after the authoritative cart has adopted the line.
    flash('Added to your box');
    router.push(boxResumeHref(boxSize));
  }, [pending, addLine, dish, choice, flash, router, boxSize]);

  const value = useMemo<DishOrderState>(
    () => ({ dish, optionGroups, choice, setChoice, addToBox, pending, error }),
    [dish, optionGroups, choice, addToBox, pending, error],
  );

  return (
    <DishOrderContext.Provider value={value}>
      {children}
      {/* Always mounted, so the live region exists before it has anything to say. */}
      <div className={styles.toast} role="status" data-show={toast ? '' : undefined}>
        {toast}
      </div>
    </DishOrderContext.Provider>
  );
}

export function useDishOrder(): DishOrderState {
  const state = useContext(DishOrderContext);
  if (!state) throw new Error('useDishOrder must be used inside <DishOrderProvider>.');
  return state;
}

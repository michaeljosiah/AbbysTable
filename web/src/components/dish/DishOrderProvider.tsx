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
import { CartRequestError } from '@/lib/cart/transport';
import { swallowClicksFor } from '@/lib/dom/ghostClicks';
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
  /** Added, and on the way to the box: both buttons ignore taps meanwhile. */
  handingOff: boolean;
  error: CartRequestError | null;
}

const DishOrderContext = createContext<DishOrderState | null>(null);

/** How long the toast stays up — Dish Landing v2's `flash`. */
const TOAST_MS = 2400;

/**
 * After the hand-off, clicks are ignored for this long: the box flow's own
 * fixed Continue sits where the bar's ADD TO BOX was, and the second tap of a
 * double tap would otherwise land on it (`swallowClicksFor`).
 */
const GHOST_TAP_MS = 500;

/** How long a successful add holds both buttons while the box flow loads. */
const HANDOFF_RELEASE_MS = 10_000;

interface Toast {
  message: string;
  /**
   * Already announced by the panel's inline alert (a failure the cart reports
   * as its `error`): the toast then only shows it to whoever tapped the bar
   * with the panel out of sight.
   */
  heardElsewhere: boolean;
}

/** The cart's own admission rejection: refused before the cart sets an error. */
const IN_FLIGHT_CODE = 'cart.request_in_flight';

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
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `pending` is a render behind (and always false in demo): two activations
  // in one frame both read it as false. This is read synchronously, and stays
  // set once the add has succeeded: the page is on its way out, and a tap on
  // the still-visible button during a slow route change must not add again.
  const inFlight = useRef(false);
  const [handingOff, setHandingOff] = useState(false);
  const handOffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string, heardElsewhere = false) => {
    setToast({ message, heardElsewhere });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (handOffTimer.current) clearTimeout(handOffTimer.current);
    },
    [],
  );

  const addToBox = useCallback(async () => {
    if (pending || inFlight.current) return;
    inFlight.current = true;
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
      const heardElsewhere = !(cause instanceof CartRequestError && cause.code === IN_FLIGHT_CODE);
      flash(`${message} Please try again.`, heardElsewhere);
      inFlight.current = false;
      return;
    }

    // Only after the authoritative cart has adopted the line.
    flash('Added to your box');
    swallowClicksFor(GHOST_TAP_MS);
    setHandingOff(true);
    // Adding a dish goes to Step 2 (or Step 1 with no size yet) — deliberately not
    // VIEW BOX's furthest-step resume, which is the chrome's job (`resumeHrefFor`).
    router.push(boxResumeHref(boxSize));
    // Should the hand-off never land (the customer goes Back mid-route, say),
    // the buttons come back rather than staying dead.
    handOffTimer.current = setTimeout(() => {
      inFlight.current = false;
      setHandingOff(false);
    }, HANDOFF_RELEASE_MS);
  }, [pending, addLine, dish, choice, flash, router, boxSize]);

  const value = useMemo<DishOrderState>(
    () => ({ dish, optionGroups, choice, setChoice, addToBox, pending, handingOff, error }),
    [dish, optionGroups, choice, addToBox, pending, handingOff, error],
  );

  return (
    <DishOrderContext.Provider value={value}>
      {children}
      {/* Always mounted, so the live region exists before it has anything to say. */}
      <div className={styles.toast} role="status" data-show={toast ? '' : undefined}>
        {/* A failure the panel's alert carries is seen here but heard once, there. */}
        {toast?.heardElsewhere ? <span aria-hidden="true">{toast.message}</span> : toast?.message}
      </div>
    </DishOrderContext.Provider>
  );
}

/** The dish page's order state where there is one (the panels read the customer's choices), else null. */
export function useOptionalDishOrder(): DishOrderState | null {
  return useContext(DishOrderContext);
}

export function useDishOrder(): DishOrderState {
  const state = useContext(DishOrderContext);
  if (!state) throw new Error('useDishOrder must be used inside <DishOrderProvider>.');
  return state;
}

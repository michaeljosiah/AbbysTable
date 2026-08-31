'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type {
  BoxCart,
  BoxChange,
  BoxQuote,
  CheckoutResult,
  PersonalisationSelection,
} from '@/lib/aonik/map';
import { localSurcharge, selectionDraft } from '@/lib/aonik/personalisation';
import type { BoxPricing, Extra } from '@/lib/aonik/types';

import {
  projectAddOnLines,
  type ProjectedExtraLine,
} from './convergence';
import {
  decodeDemoCart,
  extraLinePersonalisation,
  type DemoCartLine,
  type DemoCartState,
} from './demoStorage';
import { deleteExtra, patchDishPersonalisation, patchExtra, postExtra } from './mutations';
import { useServerCart } from './serverEngine';
import type { CartRequestError } from './transport';

/**
 * The box a customer is building.
 *
 * TWO ENGINES, ONE CONTRACT. Which one runs is decided by the data mode:
 *
 *  - **demo** — client state persisted to localStorage, priced by the helpers
 *    at the bottom of this file. Deterministic and offline.
 *  - **live** — an Aonik server cart reached through `/api/cart/*`, priced by
 *    the authoritative quote that rides every response. Nothing here re-derives
 *    that money.
 *
 * `useCart()` looks the same either way, which is what keeps Steps 1–4 and the
 * mobile sheet from caring. Operations return promises in both modes so callers
 * can put navigation and success copy strictly after confirmation.
 */

export type CartLine = DemoCartLine;

/** An à-la-carte extra in the box: one line per item + option combination. */
export type ExtraLine = ProjectedExtraLine;

export type CartState = DemoCartState;

const EMPTY: CartState = { boxSize: null, isCustom: false, lines: [], extras: [] };

const STORAGE_KEY = 'abbys-table:box:v2';
const LEGACY_STORAGE_KEY = 'abbys-table:box:v1';

interface CartContextValue extends CartState {
  /** False during the first client render, before storage or the server answered. */
  hydrated: boolean;
  dishCount: number;
  setBoxSize: (size: number, isCustom?: boolean) => Promise<void>;
  addLine: (line: Omit<CartLine, 'lineId'> & { lineId?: string }) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  setQuantity: (lineId: string, quantity: number) => Promise<void>;
  updateLinePersonalisation: (
    lineId: string,
    input: {
      personalisation: PersonalisationSelection;
      applyToUnits?: number;
      surchargePence: number | undefined;
    },
  ) => Promise<void>;
  addExtra: (
    variantId: string,
    quantity: number,
    personalisation?: PersonalisationSelection,
  ) => Promise<void>;
  updateExtra: (
    lineId: string,
    patch: { quantity?: number; personalisation?: PersonalisationSelection },
  ) => Promise<void>;
  removeExtra: (lineId: string) => Promise<void>;
  clear: () => Promise<void>;

  /* ---- Live-mode surface. Null/empty in demo, where there is no server. ---- */

  /**
   * The authoritative quote. When present it is the ONLY price: render
   * `components` in order and `totalPence` verbatim — never sum them, never
   * recompute. Null in demo mode, where the helpers below stand in.
   */
  quote: BoxQuote | null;
  /** Catalogue drift Aonik repaired. Surface every entry; see the notice UI. */
  changes: BoxChange[];
  /** Any line Aonik flagged unavailable blocks continue and checkout. */
  hasUnavailableLine: boolean;
  /** A mutation is in flight — disable controls rather than double-firing. */
  pending: boolean;
  /** The last cart failure, for inline messages. */
  error: CartRequestError | null;
  /** True when this cart is server-backed, for surfaces that must know. */
  isServerCart: boolean;
  /**
   * Re-validates the box against the live catalogue (the continue gate).
   * Resolves to the surfaced changes, which may be empty. In demo mode there
   * is nothing to validate against, so it resolves to none.
   */
  revalidate: () => Promise<BoxChange[]>;
  /**
   * Places the order and resolves with it.
   *
   * REJECTS on drift with a `CartRequestError` whose `drift` is the refreshed
   * box — which the provider has already adopted, so the UI re-renders server
   * truth on its own. Nothing was ordered; the customer confirms again. This is
   * never retried automatically: the stop exists so a person sees the change.
   */
  placeOrder: () => Promise<CheckoutResult>;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartState | null {
  try {
    // Demo only: read the current shape first, then the shipped v1 cart. Live
    // mode returns before this function is called and never touches either key.
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return decodeDemoCart(JSON.parse(raw));
  } catch {
    // Corrupt or unavailable storage should never break the page.
    return null;
  }
}

/**
 * Projects a server cart into the line shape the checkout components read.
 *
 * `slug` and `imageUrl` come from the display cache, because Aonik's cart lines
 * carry neither — a miss costs a thumbnail and a link, never correctness, and
 * `name` is always Aonik's.
 */
function projectServerCart(
  cart: BoxCart,
  display: Record<string, { slug: string; imageUrl: string }>,
): CartState {
  const lines: CartLine[] = cart.lines
    .filter((line) => line.kind === 'BoxDish')
    .map((line) => ({
      lineId: line.lineId,
      dishId: line.productId,
      slug: display[line.productId]?.slug ?? '',
      title: line.name,
      imageUrl: display[line.productId]?.imageUrl ?? '',
      quantity: line.quantity,
      personalisation: line.isDefaultPersonalisation ? undefined : line.personalisation,
      surchargePence: line.personalisationAdjustmentPence + line.unitSurchargePence,
    }));

  // Keyed by VARIANT id, because that is what `Extra.id` is (`mapExtraRow`
  // reads `productVariantId`) and what `addExtra` sends back. Using the product
  // id here meant every catalogue lookup missed, and the review page — which
  // skips a line it cannot resolve — rendered "0 items" over a box that had
  // extras in it.
  const extras = projectAddOnLines(cart.lines);

  return { boxSize: cart.quote.boxSize, isCustom: false, lines, extras };
}

export function CartProvider({
  mode = 'demo',
  children,
}: {
  /** Resolved server-side; decides which engine runs. */
  mode?: 'demo' | 'live';
  children: ReactNode;
}) {
  const isServerCart = mode === 'live';

  const [state, setState] = useState<CartState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const server = useServerCart(isServerCart);

  // Read storage after mount so server and first client render agree. Skipped
  // entirely in live mode, where the server cart is the truth.
  useEffect(() => {
    if (isServerCart) return;
    setState(readStorage() ?? EMPTY);
    setHydrated(true);
  }, [isServerCart]);

  useEffect(() => {
    if (isServerCart || !hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode or quota exceeded — the cart simply won't persist.
    }
  }, [state, hydrated, isServerCart]);

  const setBoxSize = useCallback(
    async (size: number, isCustom = false) => {
      if (isServerCart) {
        // A size change is a server operation: the price delta is the plan's
        // marginal cost, which may bend around preset price points.
        await server.request('/size', { method: 'PATCH', body: { size } });
        return;
      }
      setState((current) => ({ ...current, boxSize: size, isCustom }));
    },
    [isServerCart, server],
  );

  const addLineLocal = useCallback((line: Omit<CartLine, 'lineId'> & { lineId?: string }) => {
    setState((current) => {
      // Same dish with identical personalisation merges into one line.
      const signature = JSON.stringify(line.personalisation ?? null);
      const existing = current.lines.find(
        (candidate) =>
          candidate.dishId === line.dishId &&
          JSON.stringify(candidate.personalisation ?? null) === signature,
      );

      if (existing) {
        return {
          ...current,
          lines: current.lines.map((candidate) =>
            candidate.lineId === existing.lineId
              ? { ...candidate, quantity: candidate.quantity + line.quantity }
              : candidate,
          ),
        };
      }

      const lineId = line.lineId ?? `${line.dishId}-${current.lines.length + 1}`;
      return { ...current, lines: [...current.lines, { ...line, lineId }] };
    });
  }, []);


  const addLine = useCallback(
    async (line: Omit<CartLine, 'lineId'> & { lineId?: string }) => {
      if (isServerCart) {
        // Remember how to render this dish before the server answers with a
        // line that knows only its name.
        server.rememberDisplay(line.dishId, { slug: line.slug, imageUrl: line.imageUrl });
        await server.request('/lines', {
          method: 'POST',
          // The slug, not `dishId`: that is a PRODUCT id, and Aonik's cart
          // wants a variant. The route resolves one from the other, and
          // encodes `choices` once it has the product's option groups.
          body: {
            slug: line.slug,
            quantity: line.quantity,
            choices: line.personalisation,
          },
        });
        return;
      }
      addLineLocal(line);
    },
    [isServerCart, server, addLineLocal],
  );

  const removeLine = useCallback(
    async (lineId: string) => {
      if (isServerCart) {
        await server.request(`/lines/${lineId}`, { method: 'DELETE' });
        return;
      }
      setState((current) => ({
        ...current,
        lines: current.lines.filter((line) => line.lineId !== lineId),
      }));
    },
    [isServerCart, server],
  );

  const setQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      if (isServerCart) {
        // Quantity 0 deletes the line server-side, so one route covers both.
        await server.request(`/lines/${lineId}`, { method: 'PATCH', body: { quantity } });
        return;
      }
      setState((current) => ({
        ...current,
        lines:
          quantity <= 0
            ? current.lines.filter((line) => line.lineId !== lineId)
            : current.lines.map((line) => (line.lineId === lineId ? { ...line, quantity } : line)),
      }));
    },
    [isServerCart, server],
  );

  const updateLinePersonalisation = useCallback(
    async (
      lineId: string,
      input: {
        personalisation: PersonalisationSelection;
        applyToUnits?: number;
        surchargePence: number | undefined;
      },
    ) => {
      if (isServerCart) {
        await patchDishPersonalisation(
          server.request,
          lineId,
          input.personalisation,
          input.applyToUnits,
        );
        return;
      }

      setState((current) => {
        const source = current.lines.find((line) => line.lineId === lineId);
        if (!source) return current;
        const units = Math.min(source.quantity, Math.max(1, input.applyToUnits ?? source.quantity));
        const updated = {
          ...source,
          quantity: units,
          personalisation: input.personalisation,
          surchargePence: input.surchargePence,
        };

        if (units === source.quantity) {
          return {
            ...current,
            lines: current.lines.map((line) => (line.lineId === lineId ? updated : line)),
          };
        }

        return {
          ...current,
          lines: [
            ...current.lines.map((line) =>
              line.lineId === lineId ? { ...line, quantity: line.quantity - units } : line,
            ),
            { ...updated, lineId: `${source.dishId}-${current.lines.length + 1}` },
          ],
        };
      });
    },
    [isServerCart, server],
  );

  const addExtraLocal = useCallback(
    (variantId: string, quantity: number, personalisation?: PersonalisationSelection) => {
      setState((current) => {
        const signature = JSON.stringify(personalisation ?? null);
        const existing = current.extras.find(
          (line) =>
            line.variantId === variantId &&
            JSON.stringify(line.personalisation ?? null) === signature,
        );
        if (existing) {
          return {
            ...current,
            extras: current.extras.map((line) =>
              line.lineId === existing.lineId
                ? { ...line, quantity: line.quantity + quantity }
                : line,
            ),
          };
        }
        return {
          ...current,
          extras: [
            ...current.extras,
            {
              lineId: `${variantId}-${current.extras.length + 1}`,
              variantId,
              quantity,
              personalisation,
            },
          ],
        };
      });
    },
    [],
  );

  const addExtra = useCallback(
    async (
      variantId: string,
      quantity: number,
      personalisation?: PersonalisationSelection,
    ) => {
      if (isServerCart) {
        // Add-ons consume no box space; their money lands in the `addOns`
        // quote component and `spacesLeft` never moves.
        await postExtra(server.request, variantId, quantity, personalisation);
        return;
      }
      addExtraLocal(variantId, quantity, personalisation);
    },
    [isServerCart, server, addExtraLocal],
  );

  const updateExtra = useCallback(
    async (
      lineId: string,
      patch: { quantity?: number; personalisation?: PersonalisationSelection },
    ) => {
      if (isServerCart) {
        await patchExtra(server.request, lineId, patch);
        return;
      }
      setState((current) => ({
        ...current,
        extras: current.extras.map((line) =>
          line.lineId === lineId ? { ...line, ...patch } : line,
        ),
      }));
    },
    [isServerCart, server],
  );

  const removeExtra = useCallback(
    async (lineId: string) => {
      if (isServerCart) {
        await deleteExtra(server.request, lineId);
        return;
      }
      setState((current) => ({
        ...current,
        extras: current.extras.filter((line) => line.lineId !== lineId),
      }));
    },
    [isServerCart, server],
  );

  /**
   * Demo only. Aonik has no "empty the cart" route — a server cart ends by
   * being checked out, adopted, or swept as abandoned. Rather than fake it by
   * blanking local state (which the next server response would immediately
   * contradict), this is a no-op in live mode.
   */
  const clear = useCallback(async () => {
    if (isServerCart) return;
    setState(EMPTY);
  }, [isServerCart]);

  /**
   * The continue gate. Review calls this on load so the page renders what the
   * server says is true now, not what navigation carried across from Step 3.
   */
  const revalidate = useCallback(async (): Promise<BoxChange[]> => {
    if (!isServerCart) return [];
    const cart = await server.request('/continue', { method: 'POST' });
    return cart?.changes ?? [];
  }, [isServerCart, server]);

  /** Terminal. See the contract above for why drift propagates rather than retries. */
  const placeOrder = useCallback(async (): Promise<CheckoutResult> => {
    if (!isServerCart) {
      throw new Error(
        'Checkout requires a server cart. This build is running on demo data, where the box ' +
          'is held client-side and no order can be placed.',
      );
    }
    return server.checkout();
  }, [isServerCart, server]);

  /* In live mode the projected server cart IS the state; demo uses its own. */
  const effectiveState = useMemo<CartState>(
    () => (isServerCart ? (server.cart ? projectServerCart(server.cart, server.display) : EMPTY) : state),
    [isServerCart, server.cart, server.display, state],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      ...effectiveState,
      hydrated: isServerCart ? server.hydrated : hydrated,
      // Live: BoxDish units only, straight from the quote — add-ons never
      // count. Demo: the same sum over local lines.
      dishCount: isServerCart
        ? (server.cart?.quote.unitsSelected ?? 0)
        : effectiveState.lines.reduce((total, line) => total + line.quantity, 0),
      setBoxSize,
      addLine,
      removeLine,
      setQuantity,
      updateLinePersonalisation,
      addExtra,
      updateExtra,
      removeExtra,
      clear,
      quote: server.cart?.quote ?? null,
      changes: server.cart?.changes ?? [],
      hasUnavailableLine: server.cart?.lines.some((line) => line.isUnavailable) ?? false,
      pending: server.pending,
      error: server.error,
      isServerCart,
      revalidate,
      placeOrder,
    }),
    [
      effectiveState,
      hydrated,
      isServerCart,
      server.cart,
      server.hydrated,
      server.pending,
      server.error,
      setBoxSize,
      addLine,
      removeLine,
      setQuantity,
      updateLinePersonalisation,
      addExtra,
      updateExtra,
      removeExtra,
      clear,
      revalidate,
      placeOrder,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}

/**
 * Aonik's custom-size formula: `basePence + (size - baseDishes) * perSpacePence`.
 *
 * The first `baseDishes` are covered by `basePence` — they are NOT billed at the
 * marginal rate. `size * perSpacePence` reads plausibly and is wrong at every
 * size, over-quoting by `baseDishes * perSpacePence - basePence` (£7 on the
 * seeded plan: 6 × £17 = £102 against a £95 base).
 *
 * Clamped at zero so a size below `baseDishes` cannot produce a negative box.
 */
export function customBoxPricePence(pricing: BoxPricing, size: number): number {
  const { baseDishes, basePence, perSpacePence } = pricing.custom;
  return Math.max(0, basePence + (size - baseDishes) * perSpacePence);
}

/** Price of the box itself, before personalisation surcharges. */
export function boxPricePence(
  size: number | null,
  isCustom: boolean,
  pricing: BoxPricing,
): number {
  if (size === null) return 0;
  if (!isCustom) {
    const preset = pricing.presets.find((offer) => offer.dishCount === size);
    if (preset) return preset.pricePence;
  }
  return customBoxPricePence(pricing, size);
}

/** Box price, personalisation surcharges, and any dishes beyond the box size. */
export function cartTotals(
  state: Pick<CartState, 'boxSize' | 'isCustom' | 'lines'>,
  pricing: BoxPricing,
) {
  const box = boxPricePence(state.boxSize, state.isCustom, pricing);
  const surcharges = state.lines.every((line) => line.surchargePence !== undefined)
    ? state.lines.reduce((total, line) => total + line.surchargePence! * line.quantity, 0)
    : undefined;
  const dishCount = state.lines.reduce((total, line) => total + line.quantity, 0);
  const overflow = state.boxSize === null ? 0 : Math.max(0, dishCount - state.boxSize);
  const extras = overflow * pricing.extraDishPence;

  return {
    dishCount,
    boxPence: box,
    surchargePence: surcharges,
    extraDishes: overflow,
    extraPence: extras,
    totalPence: surcharges === undefined ? undefined : box + surcharges + extras,
  };
}

/** Unit price of one extra line: base price plus its chosen option. */
export function extraUnitPence(line: ExtraLine, extra: Extra): number | undefined {
  const add = localSurcharge(
    extra.optionGroups,
    selectionDraft(extra.optionGroups, extraLinePersonalisation(line, extra.optionGroups)),
  );
  return add === undefined ? undefined : extra.pricePence + add;
}

/** Total for the extras lines, resolved against the catalogue. */
export function extrasTotals(extraLines: ExtraLine[], catalogue: Extra[]) {
  const byId = new Map(catalogue.map((extra) => [extra.id, extra]));
  let quantity = 0;
  let totalPence: number | undefined = 0;
  for (const line of extraLines) {
    const extra = byId.get(line.variantId);
    if (!extra) continue;
    quantity += line.quantity;
    const unitPence = extraUnitPence(line, extra);
    totalPence =
      totalPence === undefined || unitPence === undefined
        ? undefined
        : totalPence + unitPence * line.quantity;
  }
  return { quantity, totalPence };
}

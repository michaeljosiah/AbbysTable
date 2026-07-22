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

import type { BoxCart, BoxChange, BoxQuote, CheckoutResult } from '@/lib/aonik/map';
import type { BoxPricing, Extra } from '@/lib/aonik/types';

import { useServerCart, type CartRequestError } from './serverEngine';

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
 * mobile sheet from caring. Operations are async because the live engine is;
 * demo resolves immediately, so callers that fire-and-forget still behave as
 * they always did.
 */

export interface CartPersonalisation {
  portion: string;
  protein: string;
  side: string;
  heatStep: number;
}

export interface CartLine {
  /** Stable id for this line — the same dish can appear twice, personalised differently. */
  lineId: string;
  dishId: string;
  slug: string;
  title: string;
  imageUrl: string;
  quantity: number;
  personalisation?: CartPersonalisation;
  /** Personalisation surcharge for ONE unit of this line, in pence. */
  surchargePence: number;
}

/** An à-la-carte extra in the box: one line per item + option combination. */
export interface ExtraLine {
  extraId: string;
  quantity: number;
  /** Selected option choice key ("lg", "12", "hot"), when the extra has one. */
  optionKey?: string;
}

export interface CartState {
  /** Chosen box size, or null before Step 1. */
  boxSize: number | null;
  /** True when the size came from "build your own" rather than a preset. */
  isCustom: boolean;
  lines: CartLine[];
  extras: ExtraLine[];
}

const EMPTY: CartState = { boxSize: null, isCustom: false, lines: [], extras: [] };

const STORAGE_KEY = 'abbys-table:box:v1';

interface CartContextValue extends CartState {
  /** False during the first client render, before storage or the server answered. */
  hydrated: boolean;
  dishCount: number;
  setBoxSize: (size: number, isCustom?: boolean) => void | Promise<void>;
  addLine: (line: Omit<CartLine, 'lineId'> & { lineId?: string }) => void | Promise<void>;
  removeLine: (lineId: string) => void | Promise<void>;
  setQuantity: (lineId: string, quantity: number) => void | Promise<void>;
  /** Adds one of an extra (or bumps its quantity). */
  addExtra: (extraId: string, optionKey?: string) => void | Promise<void>;
  /** Quantity ≤ 0 removes the line. */
  setExtraQuantity: (extraId: string, quantity: number) => void | Promise<void>;
  /** Updates an extra's chosen option (one line per extra, as the template keys them). */
  setExtraOption: (extraId: string, optionKey: string) => void | Promise<void>;
  removeExtra: (extraId: string) => void | Promise<void>;
  clear: () => void | Promise<void>;

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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartState;
    if (!Array.isArray(parsed.lines)) return null;
    // Carts saved before extras existed simply have none.
    if (!Array.isArray(parsed.extras)) parsed.extras = [];
    return parsed;
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
      // Aonik's own summary; the canonical selection lives on the server line.
      personalisation: line.isDefaultPersonalisation
        ? undefined
        : ({
            portion: line.personalisationSummary,
            protein: '',
            side: '',
            heatStep: 0,
          } as CartPersonalisation),
      surchargePence: line.personalisationAdjustmentPence + line.unitSurchargePence,
    }));

  const extras: ExtraLine[] = cart.lines
    .filter((line) => line.kind === 'AddOn')
    .map((line) => ({ extraId: line.productId, quantity: line.quantity }));

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
        await server.request('/size', { method: 'PATCH', body: { size } }).catch(() => undefined);
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
        await server
          .request('/lines', {
            method: 'POST',
            body: { productVariantId: line.dishId, quantity: line.quantity },
          })
          .catch(() => undefined);
        return;
      }
      addLineLocal(line);
    },
    [isServerCart, server, addLineLocal],
  );

  const removeLine = useCallback(
    async (lineId: string) => {
      if (isServerCart) {
        await server.request(`/lines/${lineId}`, { method: 'DELETE' }).catch(() => undefined);
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
        await server
          .request(`/lines/${lineId}`, { method: 'PATCH', body: { quantity } })
          .catch(() => undefined);
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

  const addExtraLocal = useCallback((extraId: string, optionKey?: string) => {
    setState((current) => {
      const existing = current.extras.find((line) => line.extraId === extraId);
      if (existing) {
        return {
          ...current,
          extras: current.extras.map((line) =>
            line.extraId === extraId ? { ...line, quantity: line.quantity + 1 } : line,
          ),
        };
      }
      return { ...current, extras: [...current.extras, { extraId, quantity: 1, optionKey }] };
    });
  }, []);


  const addExtra = useCallback(
    async (extraId: string, optionKey?: string) => {
      if (isServerCart) {
        // Add-ons consume no box space; their money lands in the `addOns`
        // quote component and `spacesLeft` never moves.
        await server
          .request('/extras', {
            method: 'POST',
            body: { productVariantId: extraId, quantity: 1 },
          })
          .catch(() => undefined);
        return;
      }
      addExtraLocal(extraId, optionKey);
    },
    [isServerCart, server, addExtraLocal],
  );

  const setExtraQuantity = useCallback((extraId: string, quantity: number) => {
    setState((current) => ({
      ...current,
      extras:
        quantity <= 0
          ? current.extras.filter((line) => line.extraId !== extraId)
          : current.extras.map((line) =>
              line.extraId === extraId ? { ...line, quantity } : line,
            ),
    }));
  }, []);

  const setExtraOption = useCallback((extraId: string, optionKey: string) => {
    setState((current) => ({
      ...current,
      extras: current.extras.map((line) =>
        line.extraId === extraId ? { ...line, optionKey } : line,
      ),
    }));
  }, []);

  const removeExtra = useCallback((extraId: string) => {
    setState((current) => ({
      ...current,
      extras: current.extras.filter((line) => line.extraId !== extraId),
    }));
  }, []);

  /**
   * Demo only. Aonik has no "empty the cart" route — a server cart ends by
   * being checked out, adopted, or swept as abandoned. Rather than fake it by
   * blanking local state (which the next server response would immediately
   * contradict), this is a no-op in live mode.
   */
  const clear = useCallback(() => {
    if (isServerCart) return;
    setState(EMPTY);
  }, [isServerCart]);

  /**
   * The continue gate. Review calls this on load so the page renders what the
   * server says is true now, not what navigation carried across from Step 3.
   */
  const revalidate = useCallback(async (): Promise<BoxChange[]> => {
    if (!isServerCart) return [];
    const cart = await server.request('/continue', { method: 'POST' }).catch(() => null);
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
      addExtra,
      setExtraQuantity,
      setExtraOption,
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
      addExtra,
      setExtraQuantity,
      setExtraOption,
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
  return size * pricing.custom.perDishPence;
}

/** Box price, personalisation surcharges, and any dishes beyond the box size. */
export function cartTotals(
  state: Pick<CartState, 'boxSize' | 'isCustom' | 'lines'>,
  pricing: BoxPricing,
) {
  const box = boxPricePence(state.boxSize, state.isCustom, pricing);
  const surcharges = state.lines.reduce(
    (total, line) => total + line.surchargePence * line.quantity,
    0,
  );
  const dishCount = state.lines.reduce((total, line) => total + line.quantity, 0);
  const overflow = state.boxSize === null ? 0 : Math.max(0, dishCount - state.boxSize);
  const extras = overflow * pricing.extraDishPence;

  return {
    dishCount,
    boxPence: box,
    surchargePence: surcharges,
    extraDishes: overflow,
    extraPence: extras,
    totalPence: box + surcharges + extras,
  };
}

/** Unit price of one extra line: base price plus its chosen option. */
export function extraUnitPence(line: ExtraLine, extra: Extra): number {
  const add = extra.option?.choices.find((choice) => choice.key === line.optionKey)?.addPence ?? 0;
  return extra.pricePence + add;
}

/** Total for the extras lines, resolved against the catalogue. */
export function extrasTotals(extraLines: ExtraLine[], catalogue: Extra[]) {
  const byId = new Map(catalogue.map((extra) => [extra.id, extra]));
  let quantity = 0;
  let totalPence = 0;
  for (const line of extraLines) {
    const extra = byId.get(line.extraId);
    if (!extra) continue;
    quantity += line.quantity;
    totalPence += extraUnitPence(line, extra) * line.quantity;
  }
  return { quantity, totalPence };
}

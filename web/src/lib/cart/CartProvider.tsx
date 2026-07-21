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

import type { BoxPricing, Extra } from '@/lib/aonik/types';

/**
 * The box a customer is building, held client-side until Aonik provides a cart.
 *
 * Persisted to localStorage so it survives refresh and back-navigation. The
 * provider is the only thing that touches storage; everything else goes through
 * `useCart()`, so moving to a server cart later is contained to this file.
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
  /** False during the first client render, before storage has been read. */
  hydrated: boolean;
  dishCount: number;
  setBoxSize: (size: number, isCustom?: boolean) => void;
  addLine: (line: Omit<CartLine, 'lineId'> & { lineId?: string }) => void;
  removeLine: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  /** Adds one of an extra (or bumps its quantity). */
  addExtra: (extraId: string, optionKey?: string) => void;
  /** Quantity ≤ 0 removes the line. */
  setExtraQuantity: (extraId: string, quantity: number) => void;
  /** Updates an extra's chosen option (one line per extra, as the template keys them). */
  setExtraOption: (extraId: string, optionKey: string) => void;
  removeExtra: (extraId: string) => void;
  clear: () => void;
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  // Read storage after mount so server and first client render agree.
  useEffect(() => {
    setState(readStorage() ?? EMPTY);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode or quota exceeded — the cart simply won't persist.
    }
  }, [state, hydrated]);

  const setBoxSize = useCallback((size: number, isCustom = false) => {
    setState((current) => ({ ...current, boxSize: size, isCustom }));
  }, []);

  const addLine = useCallback((line: Omit<CartLine, 'lineId'> & { lineId?: string }) => {
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

  const removeLine = useCallback((lineId: string) => {
    setState((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.lineId !== lineId),
    }));
  }, []);

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setState((current) => ({
      ...current,
      lines:
        quantity <= 0
          ? current.lines.filter((line) => line.lineId !== lineId)
          : current.lines.map((line) => (line.lineId === lineId ? { ...line, quantity } : line)),
    }));
  }, []);

  const addExtra = useCallback((extraId: string, optionKey?: string) => {
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

  const clear = useCallback(() => setState(EMPTY), []);

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      hydrated,
      dishCount: state.lines.reduce((total, line) => total + line.quantity, 0),
      setBoxSize,
      addLine,
      removeLine,
      setQuantity,
      addExtra,
      setExtraQuantity,
      setExtraOption,
      removeExtra,
      clear,
    }),
    [
      state,
      hydrated,
      setBoxSize,
      addLine,
      removeLine,
      setQuantity,
      addExtra,
      setExtraQuantity,
      setExtraOption,
      removeExtra,
      clear,
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

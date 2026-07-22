'use client';

/**
 * The live cart engine: a thin client of `/api/cart/*`.
 *
 * It holds no pricing logic and no merge logic. Every mutation returns the
 * whole `{ box, quote, changes }` and this replaces its state wholesale — which
 * is why two tabs self-correct on their next action instead of drifting.
 *
 * It also never sees the cart token. That lives in an httpOnly cookie the route
 * handlers own; from here the calls are just same-origin fetches.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { BoxCart, CheckoutResult, PersonalisationSelection } from '@/lib/aonik/map';

/**
 * Display-only cache of productId → { slug, imageUrl }.
 *
 * Aonik's cart lines carry `name` but not a slug or hero image, and the box
 * summary links to dish pages and shows thumbnails. Rather than refetch the
 * catalogue on every cart render, we remember what the caller already knew when
 * it added the line.
 *
 * This is PRESENTATION ONLY. It never affects pricing, identity or what is
 * ordered — a cache miss degrades to no thumbnail and no link, never to a wrong
 * dish. Aonik's `name` is always the source of truth for what the line is.
 */
const DISPLAY_KEY = 'abbys-table:line-display:v1';

export interface LineDisplay {
  slug: string;
  imageUrl: string;
}

function readDisplayIndex(): Record<string, LineDisplay> {
  try {
    const raw = window.localStorage.getItem(DISPLAY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LineDisplay>) : {};
  } catch {
    return {};
  }
}

function writeDisplayIndex(index: Record<string, LineDisplay>): void {
  try {
    window.localStorage.setItem(DISPLAY_KEY, JSON.stringify(index));
  } catch {
    // A full or blocked store costs us thumbnails, nothing more.
  }
}

/** An `/api/cart` failure, carrying whatever the handler could tell us. */
export class CartRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  /** The refreshed box on a 409 drift, already mapped by the route. */
  readonly drift?: BoxCart;

  constructor(status: number, message: string, code?: string, drift?: BoxCart) {
    super(message);
    this.name = 'CartRequestError';
    this.status = status;
    this.code = code;
    this.drift = drift;
  }
}

interface CartResponse {
  /**
   * Present on every cart response — and ALSO on a 409 drift, where it is the
   * refreshed box the route mapped out of the error body. Absent (undefined)
   * when the failure carried no box at all, which is not the same as null.
   */
  cart?: BoxCart | null;
  order?: CheckoutResult;
  error?: string;
  code?: string;
}

export interface ServerCartEngine {
  cart: BoxCart | null;
  hydrated: boolean;
  /** True while a mutation is in flight, so the UI can disable and not double-fire. */
  pending: boolean;
  /** The last failure, for inline messages. Cleared on the next success. */
  error: CartRequestError | null;
  display: Record<string, LineDisplay>;
  rememberDisplay: (productId: string, display: LineDisplay) => void;
  request: (path: string, init?: { method?: string; body?: unknown }) => Promise<BoxCart | null>;
  /**
   * Places the order. Resolves with the order on success; on drift it has
   * already replaced the box with the refreshed one and then throws, so the
   * caller re-renders and the customer confirms the change. Never retried.
   */
  checkout: (body?: { discountCode?: string }) => Promise<CheckoutResult>;
}

export function useServerCart(enabled: boolean): ServerCartEngine {
  const [cart, setCart] = useState<BoxCart | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<CartRequestError | null>(null);
  const [display, setDisplay] = useState<Record<string, LineDisplay>>({});

  /** Serialises mutations so a fast double-click cannot interleave two writes. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  /**
   * One `/api/cart` round trip, queued behind any in-flight mutation.
   *
   * Adopting `payload.cart` happens on failure as well as success, because a
   * 409 drift is a failure that nonetheless carries the authoritative box —
   * Aonik persisted the repair before refusing. Showing the customer the box
   * they no longer have, next to a notice saying it changed, is the one
   * outcome worse than either.
   */
  const send = useCallback(
    async (path: string, init?: { method?: string; body?: unknown }): Promise<CartResponse> => {
      const run = async () => {
        setPending(true);
        try {
          const response = await fetch(`/api/cart${path}`, {
            method: init?.method ?? 'GET',
            headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
            body: init?.body ? JSON.stringify(init.body) : undefined,
          });

          const payload = (await response.json().catch(() => ({}))) as CartResponse;

          // `cart: null` is a real state: the cookie was dropped because the
          // cart is gone or was never ours. The UI resets to an empty box.
          // `cart: undefined` means this response carried no box — leave the
          // current one alone.
          if (payload.cart !== undefined) setCart(payload.cart);

          if (!response.ok) {
            const failure = new CartRequestError(
              response.status,
              payload.error ?? 'The box could not be updated.',
              payload.code,
              payload.cart ?? undefined,
            );
            setError(failure);
            throw failure;
          }

          setError(null);
          return payload;
        } finally {
          setPending(false);
        }
      };

      const next = queue.current.then(run, run);
      // Keep the chain alive even when a link in it rejected.
      queue.current = next.catch(() => undefined);
      return next;
    },
    [],
  );

  const request = useCallback(
    async (path: string, init?: { method?: string; body?: unknown }): Promise<BoxCart | null> =>
      (await send(path, init)).cart ?? null,
    [send],
  );

  const checkout = useCallback(
    async (body?: { discountCode?: string }): Promise<CheckoutResult> => {
      const payload = await send('/checkout', { method: 'POST', body: body ?? {} });
      if (!payload.order) {
        throw new CartRequestError(500, 'The order was placed but could not be read back.');
      }
      return payload.order;
    },
    [send],
  );

  // Hydrate from the server once, after mount.
  useEffect(() => {
    if (!enabled) {
      setHydrated(true);
      return;
    }
    setDisplay(readDisplayIndex());
    void request('')
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, [enabled, request]);

  const rememberDisplay = useCallback((productId: string, value: LineDisplay) => {
    setDisplay((current) => {
      if (current[productId]?.slug === value.slug) return current;
      const next = { ...current, [productId]: value };
      writeDisplayIndex(next);
      return next;
    });
  }, []);

  return { cart, hydrated, pending, error, display, rememberDisplay, request, checkout };
}

export type { PersonalisationSelection };

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

import {
  admitCartRequest,
  adoptCartResponse,
  CartRequestError,
  processCartResponse,
  type CartResponse,
} from './transport';

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

export interface ServerCartEngine {
  cart: BoxCart | null;
  hydrated: boolean;
  /** True while a request is in flight; UI disabling is defense-in-depth. */
  pending: boolean;
  /** The last failure, for inline messages. Cleared on the next success. */
  error: CartRequestError | null;
  display: Record<string, LineDisplay>;
  rememberDisplay: (productId: string, display: LineDisplay) => void;
  request: (
    path: string,
    init?: { method?: string; body?: unknown },
  ) => Promise<BoxCart | null | undefined>;
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

  /** Retains activation order for admitted requests, including after rejection. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  /** Synchronous admission; unlike React state, this changes before the next click. */
  const inFlight = useRef(false);

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
    (path: string, init?: { method?: string; body?: unknown }): Promise<CartResponse> => {
      const run = async () => {
        setPending(true);
        try {
          const response = await fetch(`/api/cart${path}`, {
            method: init?.method ?? 'GET',
            headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
            body: init?.body ? JSON.stringify(init.body) : undefined,
          });

          const payload = (await response.json().catch(() => ({}))) as CartResponse;

          processCartResponse(response, payload, (authoritative) => {
            // Null is an authoritative empty cart. Absence carries no cart
            // information and therefore preserves the confirmed projection.
            setCart((current) => adoptCartResponse(current, authoritative));
          });

          setError(null);
          return payload;
        } catch (cause) {
          const failure =
            cause instanceof CartRequestError
              ? cause
              : new CartRequestError(
                  0,
                  cause instanceof Error ? cause.message : 'The box could not be updated.',
                );
          setError(failure);
          throw failure;
        } finally {
          setPending(false);
        }
      };

      return admitCartRequest(queue, inFlight, run);
    },
    [],
  );

  const request = useCallback(
    async (
      path: string,
      init?: { method?: string; body?: unknown },
    ): Promise<BoxCart | null | undefined> => (await send(path, init)).cart,
    [send],
  );

  const checkout = useCallback(
    async (body?: { discountCode?: string }): Promise<CheckoutResult> => {
      const payload = await send('/checkout', { method: 'POST', body: body ?? {} });
      if (!payload.order) {
        const failure = new CartRequestError(500, 'The order was placed but could not be read back.');
        setError(failure);
        throw failure;
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

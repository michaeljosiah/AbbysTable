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

import { CART_ORDERED_CODE } from './cartMissing';
import { ORDERING_DISABLED_CODE } from './ordering';
import {
  admitCartRequest,
  adoptCartResponse,
  adoptCartVersion,
  enqueueCartRequest,
  CART_REQUEST_IN_FLIGHT_CODE,
  CART_VERSION_HEADER,
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
  /**
   * One `/api/checkout` call (`/box/checkout`), QUEUED behind any other box
   * request rather than turned away — a draft save may follow a date choice —
   * and sent with the version this tab holds (or the caller's own `version`:
   * checkout writes are based on the box its form was read with). Whatever box
   * or version comes back is adopted, refusals included: a conflict carries the
   * box as it is. Never throws: a network failure is a `checkout.unavailable`
   * answer.
   *
   * `init` may be a function, called when the request's turn comes — so a
   * write queued behind another sends what is current THEN (the form after a
   * merge, the version the previous write moved the box to). Returning null
   * sends nothing: the answer is `skipped`.
   */
  checkoutRequest: <T>(path: string, init?: CheckoutInit | (() => CheckoutInit | null)) => Promise<CheckoutCall<T>>;
}

export interface CheckoutInit {
  method?: string;
  body?: unknown;
  /** The box version the write is based on; the engine's own when absent. */
  version?: string;
  /** Outlives the page (a save flushed as it is left). */
  keepalive?: boolean;
}

export interface CheckoutCall<T> {
  ok: boolean;
  status: number;
  payload: T & CartResponse;
  /** Nothing was sent: the caller found, at its turn, that there was nothing to send. */
  skipped?: boolean;
}

/**
 * `identity` is anything that changes when whose box this is changes (the
 * signed-in flag): the box is read again then, with the version it now has.
 */
export function useServerCart(enabled: boolean, identity: unknown = null): ServerCartEngine {
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
   * The version of the box this tab last adopted, sent with every request so
   * Aonik can refuse a change based on a box that has since moved on (another
   * tab, another device). A ref, not state: requests run one at a time, and the
   * next one must read what the previous response set, not a render's copy.
   */
  const version = useRef<string | undefined>(undefined);

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
    (
      path: string,
      init?: {
        method?: string;
        body?: unknown;
        /**
         * False when the caller reports the failure itself (placing the order:
         * the button says whether anything was ordered), so the cart-wide alert
         * never says the same thing a second time.
         */
        reportError?: boolean;
      },
    ): Promise<CartResponse> => {
      const run = async () => {
        setPending(true);
        try {
          const headers: Record<string, string> = {};
          if (init?.body) headers['Content-Type'] = 'application/json';
          if (version.current) headers[CART_VERSION_HEADER] = version.current;

          const response = await fetch(`/api/cart${path}`, {
            method: init?.method ?? 'GET',
            headers,
            body: init?.body ? JSON.stringify(init.body) : undefined,
          });

          const payload = (await response.json().catch(() => ({}))) as CartResponse;

          processCartResponse(response, payload, (authoritative) => {
            // Null is an authoritative empty cart. Absence carries no cart
            // information and therefore preserves the confirmed projection.
            version.current = adoptCartVersion(version.current, authoritative);
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
          // Closed ordering says nothing about the box, and the Place order
          // button reports it itself. As the cart-wide error it would surface as
          // a "try again" alert on every cart surface, where retrying can't help.
          // A failure that took the box away is reported whoever asked: the
          // caller's own message goes with the box it sat beside.
          const boxGone = failure.code === CART_ORDERED_CODE || failure.code === 'cart.missing';
          if (failure.code !== ORDERING_DISABLED_CODE && (init?.reportError !== false || boxGone)) {
            setError(failure);
          }
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

  const checkoutRequest = useCallback(
    <T,>(path: string, prepare?: CheckoutInit | (() => CheckoutInit | null)): Promise<CheckoutCall<T>> =>
      enqueueCartRequest(queue, async () => {
        const init = typeof prepare === 'function' ? prepare() : prepare;
        if (init === null) return { ok: true, status: 204, payload: {} as T & CartResponse, skipped: true };
        try {
          const headers: Record<string, string> = {};
          if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
          const based = init?.version ?? version.current;
          if (based) headers[CART_VERSION_HEADER] = based;
          const response = await fetch(`/api/checkout${path}`, {
            method: init?.method ?? 'GET',
            headers,
            body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
            keepalive: init?.keepalive,
          });
          const payload = (await response.json().catch(() => ({}))) as T & CartResponse;
          version.current = adoptCartVersion(version.current, payload);
          if (payload.cart !== undefined) setCart((current) => adoptCartResponse(current, payload));
          return { ok: response.ok, status: response.status, payload };
        } catch {
          return {
            ok: false,
            status: 0,
            payload: { code: 'checkout.unavailable', error: 'Checkout could not be reached.' } as T & CartResponse,
          };
        }
      }),
    [],
  );

  const checkout = useCallback(
    async (body?: { discountCode?: string }): Promise<CheckoutResult> => {
      const payload = await send('/checkout', { method: 'POST', body: body ?? {}, reportError: false });
      if (!payload.order) {
        const failure = new CartRequestError(500, 'The order was placed but could not be read back.');
        setError(failure);
        throw failure;
      }
      return payload.order;
    },
    [send],
  );

  // Hydrate from the server after mount, and again whenever the identity the
  // box belongs to changes (sign-in adopts it, which moves its version).
  useEffect(() => {
    if (!enabled) {
      setHydrated(true);
      return;
    }
    setDisplay(readDisplayIndex());
    // A change still in flight (sign-in landing mid-click) turns a read away
    // rather than queueing it; read once that change has settled, or the tab
    // would keep the version from before the identity changed.
    const read = (): Promise<unknown> =>
      request('').catch((failure: unknown) =>
        (failure as { code?: string } | null)?.code === CART_REQUEST_IN_FLIGHT_CODE
          ? queue.current.catch(() => undefined).then(read)
          : undefined,
      );
    void read().finally(() => setHydrated(true));
  }, [enabled, request, identity]);

  const rememberDisplay = useCallback((productId: string, value: LineDisplay) => {
    setDisplay((current) => {
      if (current[productId]?.slug === value.slug) return current;
      const next = { ...current, [productId]: value };
      writeDisplayIndex(next);
      return next;
    });
  }, []);

  return { cart, hydrated, pending, error, display, rememberDisplay, request, checkout, checkoutRequest };
}

export type { PersonalisationSelection };

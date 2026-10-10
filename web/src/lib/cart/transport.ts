import type { BoxCart, CheckoutResult } from '../aonik/map';

/**
 * The header a tab sends to `/api/cart` naming the box version its change is
 * based on — the `version` of the last cart it adopted. The route forwards it
 * to Aonik as the same header (#347). Same-origin, so no CORS preflight.
 */
export const CART_VERSION_HEADER = 'X-Cart-Version';

/**
 * The route's answers when Aonik refused a write because the box is not the
 * one the tab was looking at, or cannot be changed now. Either way nothing
 * changed, and the response carries the box as it really is.
 */
export const CART_CONFLICT_CODE = 'cart.conflict';
export const CART_LOCKED_CODE = 'cart.locked';
/**
 * A conflict whose box could not be re-read: the tab still holds the old
 * version, so trying again would only conflict again — it needs a reload.
 */
export const CART_RELOAD_CODE = 'cart.reload';

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

export interface CartResponse {
  cart?: BoxCart | null;
  order?: CheckoutResult;
  error?: string;
  code?: string;
}

/**
 * The version the next write is based on, after this response: the adopted
 * box's own, none once the box is gone, unchanged when the response carried no
 * box. Mirrors `adoptCartResponse`, so the version always belongs to the box on
 * screen.
 */
export function adoptCartVersion(
  current: string | undefined,
  payload: Pick<CartResponse, 'cart'>,
): string | undefined {
  return payload.cart === undefined ? current : (payload.cart?.version ?? undefined);
}

/** Object/null replace server truth; an absent cart preserves it. */
export function adoptCartResponse(
  current: BoxCart | null,
  payload: Pick<CartResponse, 'cart'>,
): BoxCart | null {
  return payload.cart === undefined ? current : payload.cart;
}

/** Adopts response truth before turning a non-2xx transport result into a rejection. */
export function processCartResponse(
  response: { ok: boolean; status: number },
  payload: CartResponse,
  adopt: (payload: Pick<CartResponse, 'cart'>) => void,
): CartResponse {
  adopt(payload);
  if (!response.ok) {
    throw new CartRequestError(
      response.status,
      payload.error ?? 'The box could not be updated.',
      payload.code,
      payload.cart ?? undefined,
    );
  }
  return payload;
}

/** Promise tail retained so every admitted request settles before the next starts. */
function enqueueCartRequest<T>(
  queue: { current: Promise<unknown> },
  operation: () => Promise<T>,
): Promise<T> {
  const next = queue.current.then(operation, operation);
  queue.current = next.catch(() => undefined);
  return next;
}

/** Another request is still running; this one was turned away, not queued. */
export const CART_REQUEST_IN_FLIGHT_CODE = 'cart.request_in_flight';

/**
 * Synchronous admission closes the React-state timing gap: a second activation
 * is rejected before it can enter the queue or issue a fetch.
 */
export function admitCartRequest<T>(
  queue: { current: Promise<unknown> },
  inFlight: { current: boolean },
  operation: () => Promise<T>,
): Promise<T> {
  if (inFlight.current) {
    return Promise.reject(
      new CartRequestError(409, 'A box update is already in progress.', CART_REQUEST_IN_FLIGHT_CODE),
    );
  }

  inFlight.current = true;
  try {
    return enqueueCartRequest(queue, operation).finally(() => {
      inFlight.current = false;
    });
  } catch (error) {
    inFlight.current = false;
    throw error;
  }
}

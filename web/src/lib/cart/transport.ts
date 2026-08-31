import type { BoxCart, CheckoutResult } from '../aonik/map';

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
      new CartRequestError(409, 'A box update is already in progress.', 'cart.request_in_flight'),
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

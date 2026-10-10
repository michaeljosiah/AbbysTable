/** A request required a cart, and the authoritative cart state is empty. */
export class CartMissingError extends Error {
  readonly status: number;
  readonly code: string;
  readonly cart = null;

  constructor(
    message = 'There is no box to update. Start a new box and try again.',
    code = 'cart.missing',
    status = 404,
  ) {
    super(message);
    this.name = 'CartMissingError';
    this.code = code;
    this.status = status;
  }
}

/**
 * The box became an order — in another tab, or at a checkout whose answer
 * never arrived — so nothing can change it now. The cookie is cleared and the
 * tab starts afresh; the wording is SHOPPING-STATE §53's.
 */
export const CART_ORDERED_CODE = 'cart.ordered';
export const CART_ORDERED_MESSAGE = 'This order has already been completed.';

export function cartOrderedError(): CartMissingError {
  return new CartMissingError(CART_ORDERED_MESSAGE, CART_ORDERED_CODE, 409);
}

/** Dependency-free HTTP mapping; the route only supplies the NextResponse wrapper. */
export function mapCartMissingError(error: CartMissingError): {
  status: number;
  payload: { cart: null; error: string; code: string };
} {
  return {
    status: error.status,
    payload: { cart: error.cart, error: error.message, code: error.code },
  };
}

/** A request required a cart, and the authoritative cart state is empty. */
export class CartMissingError extends Error {
  readonly status = 404;
  readonly code = 'cart.missing';
  readonly cart = null;

  constructor(message = 'There is no box to update. Start a new box and try again.') {
    super(message);
    this.name = 'CartMissingError';
  }
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

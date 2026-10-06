/**
 * The live-ordering switch: what a customer is told when it is off.
 *
 * Live checkout is closed until Checkout v2 (pay before order) ships. Today
 * `POST /commerce/carts/{id}/checkout` creates a real order, invoice and
 * PaymentIntent but takes no payment (the gateway is simulated), and stores no
 * delivery address, delivery date or customer email. Placing one would tell a
 * customer their box is booked when nothing can be delivered or charged.
 *
 * The switch itself is `liveOrderingEnabled()` in `@/lib/aonik/dataMode`, which
 * reads server-only configuration. This module holds only what both sides of
 * the seam need, so the Review page and the `/api/cart/checkout` refusal say
 * the same thing.
 */

/** The code `/api/cart/checkout` answers with while ordering is closed. */
export const ORDERING_DISABLED_CODE = 'ordering.disabled';

/** Shown in place of an order. Says plainly that nothing happened. */
export const ORDERING_DISABLED_MESSAGE =
  "Online ordering isn't open yet. Nothing has been ordered and you haven't been charged.";

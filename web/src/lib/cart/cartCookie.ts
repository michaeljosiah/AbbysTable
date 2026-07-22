/**
 * The cart cookie — `{ cartId, cartToken }`, httpOnly.
 *
 * Aonik's two security invariants for guest carts drive this whole design:
 *
 *  1. The token is disclosed EXACTLY ONCE, when the cart is created, and proves
 *     possession on every later call. It must never reach client JavaScript, a
 *     page prop or a URL — so it lives in an httpOnly cookie that only the
 *     route handlers can read.
 *  2. A cart id alone authorizes NOTHING. Aonik treats possession of the id as
 *     public knowledge, which is why the id being in the same cookie is not a
 *     weakening: the token is the secret.
 *
 * Losing the cookie means the guest cart is simply gone. That is a designed
 * outcome, not an error — render the empty box.
 *
 * SERVER-ONLY.
 */

import { cookies } from 'next/headers';

export const CART_COOKIE = 'abbys-table:cart';

export interface CartCookie {
  cartId: string;
  /**
   * Absent once the cart has been adopted by a signed-in customer: adoption
   * kills the guest token and the session bearer authorizes instead
   * (SPEC-2026-07-22-customer-identity).
   */
  cartToken?: string;
}

export async function readCartCookie(): Promise<CartCookie | null> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { cartId, cartToken } = parsed as Partial<CartCookie>;
    if (typeof cartId !== 'string' || !cartId) return null;
    return { cartId, cartToken: typeof cartToken === 'string' ? cartToken : undefined };
  } catch {
    return null;
  }
}

export async function writeCartCookie(value: CartCookie): Promise<void> {
  (await cookies()).set(CART_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: 'lax',
    // Lax + httpOnly is the pairing that keeps this out of JS and off
    // cross-site requests. Secure is skipped on http://localhost only, since
    // a Secure cookie is never stored there and dev would silently lose carts.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // A guest cart is a session-length thing; Aonik sweeps abandoned carts too.
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCartCookie(): Promise<void> {
  (await cookies()).delete(CART_COOKIE);
}

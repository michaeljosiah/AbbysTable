'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { AONIK_CODES } from '@/lib/aonik/errors';
import { useCart } from '@/lib/cart/CartProvider';

import styles from './PlaceOrderButton.module.css';

/**
 * The confirm action: the one control in the journey that creates an order.
 *
 * Three outcomes, and the difference between them is the whole design:
 *
 *  1. **Success** — Aonik has the order, the cart cookie is gone, the snapshot
 *     is written. Navigate to the confirmation and never come back.
 *  2. **409 drift** — the box changed between render and confirm. NOTHING was
 *     ordered. The provider has already adopted the refreshed box, so the page
 *     re-renders itself with `DriftNotices` explaining what moved; this only
 *     has to say "look again, then confirm". It must never auto-retry: the stop
 *     exists so a person agrees to the change (Spec 068 A18).
 *  3. **Validation** — e.g. an unavailable line raced in. Show it inline; the
 *     blocked-line UI already shows which line.
 *
 * It is a `<button>`, not the `<Link>` the templates drew, because it performs
 * an action rather than navigating. The CTA classes already zero the border and
 * set the font, so the two render identically.
 */
export function PlaceOrderButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { hasUnavailableLine, pending, placeOrder, isServerCart } = useCart();
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const blocked = hasUnavailableLine || pending || placing;

  const confirm = async () => {
    if (blocked) return;

    if (!isServerCart) {
      // Demo data has no server cart and therefore no order. Say so plainly
      // rather than failing in a way that reads like a bug.
      setMessage(
        'Ordering is turned off on demo data. Switch to live mode to place a real order.',
      );
      return;
    }

    setPlacing(true);
    setMessage(null);
    try {
      await placeOrder();
      router.push('/box/confirmation');
    } catch (error) {
      const code = (error as { code?: string })?.code;

      if (code === AONIK_CODES.boxDrift) {
        // The refreshed box is already on screen — the notices say what moved.
        setMessage('Your box changed while you were reviewing it. Nothing has been ordered — check the changes above, then confirm again.');
      } else if (code === AONIK_CODES.storefrontValidation) {
        setMessage((error as Error).message);
      } else {
        setMessage(
          (error as Error)?.message ?? 'The order could not be placed. Please try again.',
        );
      }
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={confirm}
        aria-disabled={blocked || undefined}
        data-blocked={blocked || undefined}
        disabled={placing}
      >
        {children}
      </button>
      {message ? (
        <p className={styles.message} role="alert">
          {message}
        </p>
      ) : null}
    </>
  );
}

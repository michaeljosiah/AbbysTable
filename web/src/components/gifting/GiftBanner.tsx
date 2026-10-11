'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/lib/cart/CartProvider';
import { GiftDialog } from './GiftDialog';
import styles from './GiftBanner.module.css';
export function GiftBanner({ first = false }: { first?: boolean }) {
  const cart = useCart();
  const search = useSearchParams();
  const applied = useRef(false);
  const [prompt, setPrompt] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (
      !first ||
      !cart.hydrated ||
      applied.current ||
      search.get('gift') !== '1'
    )
      return;
    applied.current = true;
    if (cart.gift?.giftIntent) return;
    if (cart.shopping.active) setPrompt(true);
    else
      void cart.setGiftIntent(true).catch((error) => setError(error.message));
  }, [first, cart, search]);
  return (
    <>
      {cart.gift?.giftIntent ? (
        <p className={styles.banner}>
          {first
            ? 'Sending this as a gift? Choose their box and dishes first. At checkout you can send it to their address, hide prices and add a personalised greeting card (+£3).'
            : 'You’re building a gift food box. Add their address, hide prices and include a personalised greeting card (+£3) at checkout.'}
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {prompt ? (
        <GiftDialog
          title="You already have a box in progress."
          onClose={() => setPrompt(false)}
        >
          <button
            className={styles.primary}
            disabled={cart.pending}
            onClick={async () => {
              try {
                await cart.setGiftIntent(true);
                setPrompt(false);
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : 'Your gift could not be saved.',
                );
              }
            }}
          >
            Use my current box as a gift
          </button>
          <button className={styles.secondary} onClick={() => setPrompt(false)}>
            Keep my current box
          </button>
        </GiftDialog>
      ) : null}
    </>
  );
}

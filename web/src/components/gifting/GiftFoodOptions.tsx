'use client';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart/CartProvider';
import styles from './GiftFoodOptions.module.css';
export function GiftFoodOptions() {
  const cart = useCart();
  const [message, setMessage] = useState(cart.gift?.greetingCardMessage ?? '');
  const [error, setError] = useState('');
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setMessage(cart.gift?.greetingCardMessage ?? '');
  }, [cart.gift?.greetingCardMessage]);
  const gift = cart.gift ?? {
    giftIntent: false,
    hidePrices: true,
    includeGreetingCard: false,
    greetingCardMessage: null,
  };
  const change = async (patch: Partial<typeof gift>) => {
    setError('');
    try {
      await cart.setGift({ ...gift, ...patch });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Your gift options could not be saved.',
      );
    }
  };
  return (
    <div className={styles.gift}>
      <span className={styles.icon} aria-hidden="true">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M4 11h16v9H4zM3 7.5h18V11H3zM12 7.5V20" />
          <path d="M12 7.5S10.8 4 8.6 4a2.3 2.3 0 0 0 0 3.5zM12 7.5S13.2 4 15.4 4a2.3 2.3 0 0 1 0 3.5z" />
        </svg>
      </span>
      <div>
        <label className={styles.heading}>
          <input
            type="checkbox"
            checked={gift.giftIntent}
            disabled={cart.pending}
            onChange={(event) =>
              void change({
                giftIntent: event.target.checked,
                hidePrices: true,
                includeGreetingCard: false,
                greetingCardMessage: null,
              })
            }
          />
          Is this box a gift?
        </label>
        {gift.giftIntent ? (
          <div className={styles.body}>
            <p>
              We’ll send it straight to their door. Add their details below.
            </p>
            <label>
              <input
                type="checkbox"
                checked={gift.hidePrices}
                disabled={cart.pending}
                onChange={(event) =>
                  void change({ hidePrices: event.target.checked })
                }
              />
              Hide prices on the packing slip
            </label>
            <label>
              <input
                type="checkbox"
                checked={gift.includeGreetingCard}
                disabled={cart.pending}
                onChange={(event) =>
                  void change({
                    includeGreetingCard: event.target.checked,
                    greetingCardMessage: event.target.checked ? message : null,
                  })
                }
              />
              Add a personalised greeting card (+£3)
            </label>
            {gift.includeGreetingCard ? (
              <>
                <label htmlFor="food-gift-message">Your personal message</label>
                <textarea
                  id="food-gift-message"
                  rows={4}
                  maxLength={240}
                  value={message}
                  disabled={cart.pending}
                  onChange={(event) => {
                    dirty.current = true;
                    setMessage(event.target.value);
                  }}
                  onBlur={() => {
                    dirty.current = false;
                    void change({ greetingCardMessage: message });
                  }}
                />
                <span>{message.length}/240</span>
              </>
            ) : null}
          </div>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </div>
  );
}

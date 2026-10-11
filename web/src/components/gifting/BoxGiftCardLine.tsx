'use client';
import { useCart } from '@/lib/cart/CartProvider';
import { useFlowActions } from '@/components/checkout/FlowActions';
import { giftMoney } from '@/lib/gifting/model';
import { GiftIcon } from './GiftIcons';
import styles from './BoxGiftCardLine.module.css';
export function BoxGiftCardLine() {
  const cart = useCart();
  const actions = useFlowActions();
  const card = cart.giftCard;
  if (!card) return null;
  return (
    <section className={styles.card} aria-labelledby="review-gift">
      <h2 id="review-gift">Gift</h2>
      <div className={styles.line}>
        <span className={styles.icon}>
          <GiftIcon size={26} />
        </span>
        <div className={styles.content}>
          <div className={styles.top}>
            <span>Gift card</span>
            <strong>{giftMoney(card.value * card.quantity * 100)}</strong>
          </div>
          {card.includeGreetingCard ? <p>Greeting card +£3</p> : null}
          <div className={styles.status}>
            <span>✓ Added to this box</span>
            <a href="/gifting?edit=box#gift-card" aria-label="Edit gift card">
              Edit
            </a>
          </div>
          <p className={styles.delivery}>Delivered inside this box</p>
          <div className={styles.controls}>
            <span role="group" aria-label="Gift card quantity">
              <button
                disabled={actions.busy || card.quantity <= 1}
                aria-label="Fewer gift cards"
                onClick={() =>
                  void actions.run(() =>
                    cart.setBoxGiftCard({
                      ...card,
                      quantity: card.quantity - 1,
                    }),
                  )
                }
              >
                −
              </button>
              <span role="status">{card.quantity}</span>
              <button
                disabled={actions.busy || card.quantity >= 10}
                aria-label="More gift cards"
                onClick={() =>
                  void actions.run(() =>
                    cart.setBoxGiftCard({
                      ...card,
                      quantity: card.quantity + 1,
                    }),
                  )
                }
              >
                +
              </button>
            </span>
            <button
              className={styles.remove}
              data-flow-key="gift-card"
              disabled={actions.busy}
              onClick={() =>
                void actions.run(() => cart.setBoxGiftCard(null), {
                  kind: 'gift-card',
                  label: 'Gift card',
                  focusKey: 'gift-card',
                  restore: () => cart.setBoxGiftCard(card),
                })
              }
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

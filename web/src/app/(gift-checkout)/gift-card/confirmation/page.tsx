import { PaymentChrome } from '@/components/checkout/payment/PaymentChrome';
import {
  CopyOrderNumber,
  FocusOnArrival,
  PointsRow,
} from '@/components/checkout/confirmation/ConfirmationParts';
import { GiftIcon } from '@/components/gifting/GiftIcons';
import { giftOrder } from '@/lib/gifting/server';
import { giftMoney } from '@/lib/gifting/model';
import { redirect } from 'next/navigation';
import styles from '@/components/checkout/confirmation/Confirmation.module.css';
export const metadata = { title: 'Gift confirmation | Abby’s Table' };
export const dynamic = 'force-dynamic';
export default async function Page() {
  const order = await giftOrder().catch(() => null);
  if (!order || order.paymentStatus !== 'Captured')
    redirect('/gift-card/payment');
  return (
    <PaymentChrome inFlight={false} faqs={[]}>
      <div className={styles.page}>
        <FocusOnArrival targetId="gift-confirmed" />
        <section className={styles.hero}>
          <div className={styles.in}>
            <h1 className={styles.h1} id="gift-confirmed" tabIndex={-1}>
              <span>Order confirmed</span>
              <span className={styles.tick} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
            </h1>
            <p className={styles.lede}>
              Thank you. Your gift-card payment is confirmed and we’ll send your
              order confirmation by email.
            </p>
            {order.orderNumber ? (
              <div className={styles.num}>
                <span>
                  <span className={styles.numLabel}>Order number</span>
                  <span className={styles.numValue}>{order.orderNumber}</span>
                </span>
                <CopyOrderNumber value={order.orderNumber} />
              </div>
            ) : null}
            <div className={styles.grid}>
              <section className={styles.card} aria-labelledby="gift-summary">
                <h2 className={styles.cardH} id="gift-summary">
                  <span
                    className={styles.disc}
                    style={{
                      background: 'var(--green-forest)',
                      color: 'var(--cream)',
                    }}
                  >
                    <GiftIcon />
                  </span>
                  Order summary
                </h2>
                <dl className={styles.rows}>
                  {order.items.map((item, index) => (
                    <div key={item.itemIndex ?? index}>
                      <dt>
                        {item.name ??
                          (item.itemType === 'GiftCardValue'
                            ? 'Gift card'
                            : item.itemType === 'GiftCardPostage'
                              ? 'Postage'
                              : item.itemType === 'GiftCardGreetingCard'
                                ? 'Greeting card'
                                : item.itemType)}
                      </dt>
                      <dd>{giftMoney(Math.round(item.amountIn * 100))}</dd>
                    </div>
                  ))}
                </dl>
                <div className={styles.total}>
                  <span>Total</span>
                  <span>{giftMoney(Math.round(order.total * 100))}</span>
                </div>
                {order.loyalty?.earningStatus === 'AccountSetupRequired' ? (
                  <div className={styles.acc}>
                    <span>
                      <span className={styles.accH}>
                        Check your email to finish setting up or access your
                        account.
                      </span>
                      <span className={styles.accS}>
                        Your points will be available once setup is complete.
                      </span>
                    </span>
                  </div>
                ) : order.loyalty?.earningStatus === 'Earned' &&
                  order.loyalty.earnedPoints !== null ? (
                  <div className={styles.acc}>
                    <PointsRow
                      points={order.loyalty.earnedPoints}
                      member
                      line="Added to your Abby’s Table account."
                    />
                  </div>
                ) : null}
              </section>
            </div>
            <p>
              <a href="/gifting" style={{ color: 'var(--green-forest)' }}>
                Back to gifting →
              </a>
            </p>
          </div>
        </section>
      </div>
    </PaymentChrome>
  );
}

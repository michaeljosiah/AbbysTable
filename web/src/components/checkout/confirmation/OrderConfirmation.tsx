import Link from 'next/link';

import type { ConfirmedOrder } from '@/lib/checkout/confirmation';
import { PRIVATE_TABLE_HREF, PRIVATE_TABLE_CREDENTIALS } from '@/lib/content/marketing';
import { CONFIRMATION_COPY as COPY, CONFIRMATION_PRIVATE_TABLE as PT } from '@/lib/content/orderConfirmation';
import { WAITLIST_SERVICES } from '@/lib/content/privateTable';
import { formatDeliveryDateLong } from '@/lib/format';

import styles from './Confirmation.module.css';
import { CopyOrderNumber, FocusOnArrival, PointsRow } from './ConfirmationParts';

/**
 * Order Confirmation v2 — a PAID order, read back from Aonik
 * (`readConfirmation`). Three states: Logged in (points added), Account set
 * up (a secure link was emailed; points appear once it is done) and Guest
 * (nothing after Total — no account wording, no points claim).
 */
export function OrderConfirmation({ order }: { order: ConfirmedOrder }) {
  const showNext = order.variant !== 'guest';
  const date = formatDeliveryDateLong(order.deliveryDate);
  const year = order.deliveryDate?.slice(0, 4);

  return (
    <div className={styles.page}>
      <FocusOnArrival targetId="oc-h" />
      <section className={styles.hero}>
        <div className={styles.in}>
          <h1 className={styles.h1} id="oc-h" tabIndex={-1}>
            <span>{COPY.title}</span>
            <span className={styles.tick} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          </h1>
          <p className={styles.lede}>{COPY.lede}</p>

          {order.orderNumber ? (
            <div className={styles.num}>
              <span>
                <span className={styles.numLabel}>{COPY.orderNumber}</span>
                <span className={styles.numValue}>{order.orderNumber}</span>
              </span>
              <CopyOrderNumber value={order.orderNumber} />
            </div>
          ) : null}

          <div className={styles.grid}>
            <section className={styles.card} aria-labelledby="oc-del-h">
              <h2 className={styles.cardH} id="oc-del-h">
                <span className={styles.disc} style={{ background: 'var(--green-forest)' }} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6.5h11v9H3z" />
                    <path d="M14 9.5h4l3 3v3h-7" />
                    <circle cx="7" cy="17.5" r="1.8" />
                    <circle cx="17" cy="17.5" r="1.8" />
                  </svg>
                </span>
                <span>{COPY.delivery}</span>
              </h2>
              <ul className={styles.list}>
                {date ? (
                  <li>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                      <path d="M3.5 10h17" />
                      <path d="M8 3v4" />
                      <path d="M16 3v4" />
                    </svg>
                    <span>
                      <strong>
                        {date} {year}
                      </strong>
                    </span>
                  </li>
                ) : null}
                {order.address.length > 0 ? (
                  <li>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                      <circle cx="12" cy="9.5" r="2.5" />
                    </svg>
                    <span>
                      {order.address.map((line, index) => (
                        <span key={index}>
                          {index > 0 ? <br /> : null}
                          {line}
                        </span>
                      ))}
                    </span>
                  </li>
                ) : null}
              </ul>
              {showNext ? (
                <div className={styles.next}>
                  <h3 className={styles.nextH}>{COPY.nextTitle}</h3>
                  <ol className={styles.steps}>
                    {COPY.next.map((line, index) => (
                      <li key={line}>
                        <span className={styles.n} aria-hidden="true">
                          {index + 1}
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </section>

            <section className={styles.card} aria-labelledby="oc-sum-h">
              <h2 className={styles.cardH} id="oc-sum-h">
                <span className={styles.disc} style={{ background: 'var(--brass-ink)' }} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.5 7.3 12 2.6 3.5 7.3v9.4l8.5 4.7 8.5-4.7z" />
                    <path d="M3.5 7.3 12 12l8.5-4.7" />
                    <path d="M12 12v9.4" />
                  </svg>
                </span>
                <span>{COPY.summary}</span>
              </h2>
              <dl className={styles.rows}>
                {order.rows.map((row) => (
                  <div key={row.key} data-tone={row.tone}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
              <div className={styles.total}>
                <span>Total</span>
                <span>{order.total}</span>
              </div>

              {order.variant === 'setup' ? (
                <div className={styles.acc}>
                  <span className={styles.accIcon}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="8.5" r="3.5" />
                      <path d="M5 20c1.2-3.5 3.8-5.2 7-5.2s5.8 1.7 7 5.2" />
                    </svg>
                  </span>
                  <span>
                    <span className={styles.accH}>{COPY.setupTitle}</span>
                    <span className={styles.accS}>{COPY.setupText}</span>
                  </span>
                  {order.points ? <PointsRow points={order.points} member={false} line={COPY.setupPoints} /> : null}
                </div>
              ) : order.variant === 'member' && order.points ? (
                <div className={styles.acc}>
                  <PointsRow points={order.points} member line={COPY.memberPoints} />
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </section>

      <section className={styles.ptSection} aria-labelledby="oc-pt-h">
        <div className={styles.in}>
          <div className={styles.pt}>
            <div className={styles.ptImg}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 1120×1084 JPEG, below the fold */}
              <img src={PT.image} alt={PT.imageAlt} width={1120} height={1084} loading="lazy" decoding="async" />
            </div>
            <div className={styles.ptText}>
              <span className={styles.ptSoon}>{PT.soon}</span>
              <h2 className={styles.ptH} id="oc-pt-h">
                {PT.title}
              </h2>
              <p className={styles.ptP}>{PT.text}</p>
              <ul className={styles.ptRoutes}>
                {WAITLIST_SERVICES.filter((service) => service.note).map((service) => (
                  <li key={service.id}>
                    <span className={styles.ptIcon} aria-hidden="true">
                      {service.note === 'Worldwide' ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brass-lift)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="8.5" />
                          <path d="M3.5 12h17" />
                          <path d="M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5z" />
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brass-lift)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                          <circle cx="12" cy="9.5" r="2.5" />
                        </svg>
                      )}
                    </span>
                    <span>
                      <span className={styles.ptLabel}>{service.note}</span>
                      <span className={styles.ptValue}>{service.label}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <ul className={styles.ptCreds}>
                {PRIVATE_TABLE_CREDENTIALS.map((credential) => (
                  <li key={credential.role}>
                    <span className={styles.ptLabel}>{credential.role}</span>
                    <span className={styles.ptValue}>{credential.name}</span>
                  </li>
                ))}
              </ul>
              <Link href={PRIVATE_TABLE_HREF} className={styles.ptCta}>
                {PT.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

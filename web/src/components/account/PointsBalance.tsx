'use client';
import { useEffect } from 'react';
import type { LoyaltyBalance } from '@/lib/aonik/loyalty';
import { pointsMilestone } from '@/lib/account/benefits';
import { seePointsMilestone } from '@/lib/account/benefitsActions';
import { formatPrice } from '@/lib/format';
import styles from './Benefits.module.css';
export function PointsBalance({ balance }: { balance: LoyaltyBalance }) {
  const m = pointsMilestone(
    balance.balancePoints,
    balance.highestFivePoundMarkSeen,
  );
  useEffect(() => {
    if (m.reached) void seePointsMilestone(m.mark).catch(() => {});
  }, [m.reached, m.mark]);
  return (
    <div className={styles.ptsBal}>
      <div className={styles.ptsTop}>
        <span className={styles.ptsIc}>
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="var(--brass)"
            aria-hidden="true"
          >
            <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" />
          </svg>
        </span>
        <span className={styles.ptsN}>
          {balance.balancePoints.toLocaleString('en-GB')} points
        </span>
        <span className={styles.ptsL}>
          <b className={styles.ptsV}>Worth {formatPrice(balance.valuePence)}</b>{' '}
          off your next order. Use any amount at checkout, up to 20% of an
          order.
        </span>
      </div>
      {m.reached ? (
        <p className={styles.msHit} role="status">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--brass-ink)"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9.5" />
            <path d="M7.5 12.3l3 3 6-6.3" />
          </svg>
          <span>Your points are now worth {formatPrice(m.mark * 500)}</span>
        </p>
      ) : (
        <div className={styles.ms}>
          <div className={styles.msTrack} aria-hidden="true">
            <span
              className={styles.msFill}
              style={{ width: `${m.percent}%` }}
            />
          </div>
          <div className={styles.msRow}>
            <span>
              <b>{m.toGo} points</b> until your points are worth{' '}
              {formatPrice(m.nextPence)}
            </span>
            <span aria-hidden="true">{formatPrice(m.nextPence)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** The source overview’s quiet milestone line shares the same acknowledgement contract. */
export function PointsMilestoneLine({ balance }: { balance: LoyaltyBalance }) {
  const m = pointsMilestone(
    balance.balancePoints,
    balance.highestFivePoundMarkSeen,
  );
  useEffect(() => {
    if (m.reached) void seePointsMilestone(m.mark).catch(() => {});
  }, [m.reached, m.mark]);
  return m.reached ? (
    <span className={styles.msHit} style={{ margin: '0 0 4px' }} role="status">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--brass-ink)"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9.5" />
        <path d="M7.5 12.3l3 3 6-6.3" />
      </svg>
      <span>Your points are now worth {formatPrice(m.mark * 500)}</span>
    </span>
  ) : null;
}

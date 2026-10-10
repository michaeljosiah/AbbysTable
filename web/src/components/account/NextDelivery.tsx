import Link from 'next/link';

import type { DeliveryTracker } from '@/lib/account/tracker';

import styles from './Account.module.css';

export interface NextDeliveryData {
  tracker: DeliveryTracker;
  /** "Thursday 8 October". */
  day?: string;
  /** "Order AT-10517 · 12 High Street, Dartford DA1 1AA", whatever of it is known. */
  line?: string;
  href: string;
}

/**
 * The forest-green Next delivery card (design: My Account, overview only): the
 * order's headline, the day, and Aonik's four fulfilment steps with the current
 * one marked. The delivery window is left out — Aonik rejects windows — and so
 * is "Need to change this delivery?": confirmed orders are read-only.
 */
export function NextDelivery({ data }: { data: NextDeliveryData }) {
  return (
    <div className={styles.next} role="group" aria-labelledby="next-delivery-l">
      <p className={styles.nextLabel} id="next-delivery-l">
        Next delivery
      </p>
      <p className={styles.nextHeadline}>{data.tracker.headline}</p>
      {data.day ? <p className={styles.nextDay}>{data.day}</p> : null}
      {data.line ? <p className={styles.nextLine}>{data.line}</p> : null}
      <ol className={styles.track} aria-label="Delivery progress">
        {data.tracker.steps.map((step) => (
          <li key={step.label} data-s={step.state} aria-current={step.state === 'now' ? 'step' : undefined}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.trackLabel}>
              {step.state === 'done' ? <span className="visuallyHidden">Completed: </span> : null}
              {step.state === 'now' ? <span className="visuallyHidden">Current: </span> : null}
              {step.label}
            </span>
          </li>
        ))}
      </ol>
      <Link href={data.href} className={styles.nextLink}>
        <span>View order details</span>
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </div>
  );
}

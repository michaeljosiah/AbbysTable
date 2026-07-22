import { SocialIcons } from '@/components/brand/SocialIcons';

import styles from './AnnouncementBar.module.css';

/**
 * Thin brass-topped bar above the header. The delivery date is commerce data —
 * it arrives as a prop rather than being baked into the markup.
 */
interface AnnouncementBarProps {
  /**
   * Pre-formatted delivery date, e.g. "6 August", or null when the tenant
   * publishes no promise — in which case the line is not rendered at all. A
   * wrong date is worse than no date, so nothing is invented here.
   */
  earliestDeliveryLabel: string | null;
}

export function AnnouncementBar({ earliestDeliveryLabel }: AnnouncementBarProps) {
  return (
    <div className={styles.bar}>
      <p className={styles.message}>
        Cooked to order in small batches
        {earliestDeliveryLabel ? (
          <>
            <span className={styles.dot} aria-hidden="true">
              •
            </span>
            <strong className={styles.delivery}>
              Earliest UK-wide delivery: {earliestDeliveryLabel}
            </strong>
          </>
        ) : null}
      </p>
      <SocialIcons className={styles.social} />
    </div>
  );
}

import { SocialIcons } from '@/components/brand/SocialIcons';

import styles from './AnnouncementBar.module.css';

/**
 * Thin brass-topped bar above the header. The delivery date is commerce data —
 * it arrives as a prop rather than being baked into the markup.
 */
interface AnnouncementBarProps {
  earliestDeliveryLabel: string;
}

export function AnnouncementBar({ earliestDeliveryLabel }: AnnouncementBarProps) {
  return (
    <div className={styles.bar}>
      <p className={styles.message}>
        Cooked to order in small batches
        <span className={styles.dot} aria-hidden="true">
          •
        </span>
        <strong className={styles.delivery}>
          Earliest UK-wide delivery: {earliestDeliveryLabel}
        </strong>
      </p>
      <SocialIcons className={styles.social} />
    </div>
  );
}

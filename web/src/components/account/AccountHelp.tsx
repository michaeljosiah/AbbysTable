import Link from 'next/link';

import { CONTACT_HREF } from '@/lib/content/navigation';

import styles from './Account.module.css';

/**
 * "Need help with an order?" — the only thing My Account offers about a placed
 * order. Confirmed orders are read-only: there is no self-service change or
 * cancellation (decided 5 Oct 2026), so every route out is a person.
 */
export function AccountHelp() {
  return (
    <div className={styles.help}>
      <h2 className={styles.cardTitle}>Need help with an order?</h2>
      <p className={styles.p}>Contact us.</p>
      <Link href={CONTACT_HREF} className={styles.submit}>
        Contact us
      </Link>
    </div>
  );
}

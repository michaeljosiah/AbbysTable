import type { SupportContact } from '@/lib/content/contact';

import { SUPPORT_PANEL_ID } from './StatusChrome';
import styles from './SupportPanel.module.css';

/**
 * "Need help with an order?" — direct email and phone, the one route that
 * works in a full outage: mailto: and tel: need nothing from our servers.
 *
 * Takes the contact as a prop and renders nothing without one, so the page
 * never shows a panel that promises help and offers no way to get it. See
 * `SUPPORT_CONTACT` for why there is none yet.
 */
export function SupportPanel({ contact }: { contact: SupportContact | null }) {
  if (!contact) return null;

  return (
    <section id={SUPPORT_PANEL_ID} className={styles.panel} aria-labelledby="status-help-heading">
      <h2 id="status-help-heading" className={styles.heading}>
        Need help with an order?
      </h2>
      <p className={styles.copy}>Contact us directly and we&rsquo;ll help.</p>

      <div className={styles.ways}>
        <a href={`mailto:${contact.email}`} className={styles.way}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5.5" width="18" height="13" rx="2" />
            <path d="m3.5 7 8.5 6 8.5-6" />
          </svg>
          <span>{contact.email}</span>
        </a>

        <a href={`tel:${contact.phone.e164}`} className={styles.way}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 4h3.5l1.6 4.2-2.1 1.4a11 11 0 0 0 6.4 6.4l1.4-2.1L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />
          </svg>
          <span>{contact.phone.display}</span>
        </a>
      </div>
    </section>
  );
}

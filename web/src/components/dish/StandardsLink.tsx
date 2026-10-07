'use client';

import Link from 'next/link';

import type { PersonalisationSelection } from '@/lib/aonik/map';
import { createDishReturnRecord, standardsHref } from '@/lib/dish-return';
import { saveDishReturn, stampDishEntry } from '@/lib/dish-return-storage';

import styles from './StandardsLink.module.css';

interface StandardsLinkProps {
  slug: string;
  /**
   * The customer's whole personalisation, canonically encoded (every group),
   * or undefined when the dish is as Abby designed it.
   */
  selection?: PersonalisationSelection;
}

/**
 * "See our standards →" on a dish page: the dish end of the round trip in
 * `lib/dish-return.ts`.
 *
 * On click — before next/link navigates — it records this visit in the tab's
 * sessionStorage: the dish, `history.length`, the scroll position, the whole
 * selection and a one-off token, and stamps THIS history entry with the same
 * token. The record is what lets Our Standards show "Back to dish" (a pasted
 * link carries none) and what the dish page restores from; the stamp is how
 * the dish page tells a return to this very entry from a fresh visit. The
 * choice itself never goes in a URL. A storage failure just means no back
 * link; it never blocks the navigation.
 *
 * Takes the selection as a prop so it does not care what renders the choice:
 * today the personaliser, after issue #22 the portion card.
 */
export function StandardsLink({ slug, selection }: StandardsLinkProps) {
  const onClick = () => {
    const now = Date.now();
    const entry = now.toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    saveDishReturn(
      createDishReturnRecord({
        slug,
        now,
        historyLength: window.history.length,
        scrollY: window.scrollY,
        entry,
        selection,
      }),
    );
    stampDishEntry(entry);
  };

  return (
    <Link href={standardsHref(slug)} className={styles.link} onClick={onClick}>
      <span className={styles.label}>
        See our standards
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" y1="12" x2="19" y2="12" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

'use client';

import Link from 'next/link';

import {
  DISH_RETURN_STORAGE_KEY,
  PORTION_PARAM,
  createDishReturnRecord,
  standardsHref,
} from '@/lib/dish-return';

import styles from './StandardsLink.module.css';

interface StandardsLinkProps {
  slug: string;
  /** The portion to restore on return — omitted when it is the dish's default. */
  portion?: string;
}

/**
 * "See our standards →" on a dish page: the dish end of the round trip in
 * `lib/dish-return.ts`.
 *
 * On click — before next/link navigates — it
 *  1. records this visit in the tab's sessionStorage, which is what lets Our
 *     Standards show "Back to dish" (a pasted link carries no record), and
 *  2. rewrites THIS history entry to carry the chosen portion, so a return to
 *     it by any route — "Back to dish", the browser's Back button, a reload —
 *     lands on the dish with that portion restored.
 * Neither step can block the navigation: storage failure just means no back
 * link on Our Standards.
 *
 * Takes the portion as a prop so it does not care what renders the choice:
 * today the personaliser, after issue #22 the portion card.
 */
export function StandardsLink({ slug, portion }: StandardsLinkProps) {
  const onClick = () => {
    try {
      window.sessionStorage.setItem(
        DISH_RETURN_STORAGE_KEY,
        JSON.stringify(createDishReturnRecord(slug, Date.now(), window.history.length)),
      );
    } catch {
      // Storage blocked: Our Standards simply shows no back link.
    }

    const here = new URL(window.location.href);
    if (portion) here.searchParams.set(PORTION_PARAM, portion);
    else here.searchParams.delete(PORTION_PARAM);
    if (here.href !== window.location.href) {
      // Next.js syncs its router with a native replaceState (and keeps its
      // own history state), so this is safe mid-navigation.
      window.history.replaceState(null, '', here.href);
    }
  };

  return (
    <Link href={standardsHref(slug, portion)} className={styles.link} onClick={onClick}>
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

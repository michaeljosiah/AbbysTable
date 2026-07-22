'use client';

import { useState } from 'react';

import type { BoxChange } from '@/lib/aonik/map';
import { useCart } from '@/lib/cart/CartProvider';
import { formatPrice } from '@/lib/format';

import styles from './DriftNotices.module.css';

/**
 * Tells the customer what Aonik changed under their box, and why.
 *
 * The catalogue can move while a box is being built — an option retired, a
 * group removed, an add-on repriced, a dish become unavailable. Aonik repairs
 * the cart and reports every repair in `changes[]`; our whole job is to surface
 * them rather than let the box silently differ from what was chosen.
 *
 * Notices are dismissible per render but come back if the next response still
 * reports them: dismissing is "I've read this", not "make it stop".
 */

/**
 * Copy per reason. Seven are known today — the three box-cart ones plus the
 * four Spec 066 selection-drift reasons that pass straight through.
 *
 * An unknown reason still renders, with a generic line. A change the customer
 * cannot see is worse than one that is plainly worded.
 */
function describe(change: BoxChange): { title: string; detail?: string } {
  const moved =
    change.from && change.to
      ? `${change.from} → ${change.to}`
      : (change.to ?? change.from ?? undefined);

  switch (change.reason) {
    case 'unavailable':
      return {
        title: 'A dish is no longer available',
        detail: 'Remove it or swap it for something else to carry on.',
      };
    case 'line-merged':
      return {
        title: 'Two identical dishes were combined',
        detail: 'They ended up with the same choices, so they now share one line.',
      };
    case 'price-changed':
      return {
        title: 'An extra changed price',
        detail:
          change.priceDeltaPence !== undefined
            ? `${change.priceDeltaPence > 0 ? '+' : ''}${formatPrice(change.priceDeltaPence)} — your total has been updated.`
            : 'Your total has been updated.',
      };
    case 'option-retired':
      return {
        title: 'A choice is no longer offered',
        detail: change.group
          ? `${change.group}: ${moved ?? 'we moved you to the closest option.'}`
          : (moved ?? 'We moved you to the closest option.'),
      };
    case 'group-removed':
      return {
        title: 'An option was withdrawn',
        detail: change.group
          ? `${change.group} is no longer part of this dish.`
          : 'It is no longer part of this dish.',
      };
    case 'group-added':
      return {
        title: 'A new option is available',
        detail: change.group
          ? `${change.group} was set to Abby's choice — change it any time.`
          : "It was set to Abby's choice — change it any time.",
      };
    case 'selection-mode-changed':
      return {
        title: 'How you choose an option has changed',
        detail: change.group ? `${change.group} now works differently.` : undefined,
      };
    default:
      return { title: 'Your box was updated', detail: moved };
  }
}

function NoticeIcon({ blocking }: { blocking: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {blocking ? (
        <>
          <path d="M10.3 4.3 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4.5" />
          <path d="M12 16h.01" />
        </>
      )}
    </svg>
  );
}

export function DriftNotices() {
  const { changes, hasUnavailableLine } = useCart();
  const [dismissed, setDismissed] = useState<string[]>([]);

  if (changes.length === 0) return null;

  /** Identity for dismissal: same line + reason + move is the same notice. */
  const keyFor = (change: BoxChange, index: number) =>
    `${change.lineId ?? 'box'}:${change.reason}:${change.group ?? ''}:${change.to ?? ''}:${index}`;

  const visible = changes
    .map((change, index) => ({ change, key: keyFor(change, index) }))
    .filter(({ key }) => !dismissed.includes(key));

  if (visible.length === 0) return null;

  return (
    <ul className={styles.list} aria-live="polite">
      {visible.map(({ change, key }) => {
        const { title, detail } = describe(change);
        const blocking = change.reason === 'unavailable' && hasUnavailableLine;

        return (
          <li key={key} className={styles.notice} data-blocking={blocking || undefined}>
            <span className={styles.icon} aria-hidden="true">
              <NoticeIcon blocking={blocking} />
            </span>
            <span className={styles.body}>
              <span className={styles.title}>{title}</span>
              {detail ? <span className={styles.detail}>{detail}</span> : null}
            </span>
            <button
              type="button"
              className={styles.dismiss}
              onClick={() => setDismissed((current) => [...current, key])}
              aria-label="Dismiss"
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}

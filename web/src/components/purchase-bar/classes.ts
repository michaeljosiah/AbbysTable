import styles from './PurchaseBar.module.css';

/**
 * The bar's class names, for a page that composes its own bar content.
 *
 * A plain module, deliberately not `'use client'`: a Server Component that
 * imports a value from a client module receives a client reference, not the
 * string. With this a page can hand the bar a CTA built from its own pieces —
 * How it works passes its size-carrying `BoxSizeLink`, and Private Table v2
 * (#25) will pass "Join the waitlist" — and still get the canonical pill.
 */
export const purchaseBarClasses = {
  /** The 48px green-forest pill. */
  cta: styles.cta,
  /** The two-line text block on the left. */
  text: styles.text,
  /** Its first line ("Minimum 6 dishes", "Add to your box"). */
  textLead: styles.textLead,
  /** Its second, heavier line ("From £158"). */
  textStrong: styles.textStrong,
} as const;

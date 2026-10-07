'use client';

import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import { useCart } from '@/lib/cart/CartProvider';
import { activeBoxSummary } from '@/lib/purchase-bar/activeBox';
import type { PurchaseBarData } from '@/lib/purchase-bar/data';
import { offerLines } from '@/lib/purchase-bar/offer';
import { BOX_BUILDER_PATH } from '@/lib/how-it-works/boxSizes';

import { PurchaseBarShell } from './PurchaseBarShell';
import styles from './PurchaseBar.module.css';

/**
 * The canonical mobile purchase bar (Homepage v2): "Minimum 6 dishes / From
 * £158" with BUILD A BOX — and, once a box is active, the box summary with
 * VIEW BOX instead (design/at-order-state.js `applyBar`). Only what the bar
 * SAYS changes; band, height and pill stay the same.
 *
 * Rendered by the pages that carry it — Homepage, Menu and How it works, and
 * Our standards (#54) — with data the page resolved (`getPurchaseBarData`).
 * Visibility is `PurchaseBarShell`'s.
 */
interface MobilePurchaseBarProps {
  data: PurchaseBarData;
  /**
   * Replaces the default Build a Box link. How it works passes its
   * `BoxSizeLink` so the bar carries the chosen size (contract §4c); build it
   * with `purchaseBarClasses.cta`. Ignored while a box is active — VIEW BOX
   * then takes its place.
   */
  cta?: ReactNode;
}

export function MobilePurchaseBar({ data, cta }: MobilePurchaseBarProps) {
  const cart = useCart();
  const summary = activeBoxSummary(cart, data.pricing, data.offer);

  if (summary) {
    return (
      <PurchaseBarShell>
        <span className={styles.summary}>
          <span className={styles.summaryDisc} aria-hidden="true">
            <BoxGlyph />
          </span>
          <span className={styles.summaryText}>
            <span className={styles.summaryLabel}>{summary.label}</span>
            {summary.total ? <span className={styles.summaryTotal}>{summary.total}</span> : null}
          </span>
        </span>
        {/* Caps, no arrow — the header's label, so one order reads as one
            thing wherever the customer meets it. */}
        <Link href={summary.href} className={styles.cta}>
          View box
        </Link>
      </PurchaseBarShell>
    );
  }

  const lines = data.offer ? offerLines(data.offer) : null;

  return (
    <PurchaseBarShell layout={lines ? 'split' : 'centre'}>
      {lines ? (
        <span className={styles.text}>
          <span className={styles.textLead}>{lines.minimum}</span>
          {lines.from ? <span className={styles.textStrong}>{lines.from}</span> : null}
        </span>
      ) : null}
      {/* Keyed: a CTA built by a Server Component arrives as an element React
          has not validated, and beside the text block it would otherwise be
          reported as an unkeyed list child. */}
      <Fragment key="cta">
        {cta ?? (
          <Link href={BOX_BUILDER_PATH} className={styles.cta}>
            Build a Box
          </Link>
        )}
      </Fragment>
    </PurchaseBarShell>
  );
}

/** The box glyph from design/at-order-state.js, in the disc's ink. */
function BoxGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8l9-4 9 4-9 4-9-4z" />
      <path d="M3 8v8l9 4 9-4V8" />
      <path d="M12 12v8" />
    </svg>
  );
}

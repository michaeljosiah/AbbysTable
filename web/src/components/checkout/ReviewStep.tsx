'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { personalisationSummary } from '@/components/checkout/DishPicker';
import type { BoxPricing, Dish, Extra, PersonalisationOptions } from '@/lib/aonik/types';
import {
  cartTotals,
  extraUnitPence,
  extrasTotals,
  useCart,
} from '@/lib/cart/CartProvider';
import { formatPrice, formatPriceExact } from '@/lib/format';

import styles from './ReviewStep.module.css';

/**
 * Step 4: the whole order in review — box dishes, extras, and the summary
 * with reconciliation lines, exactly as the template lays them out.
 *
 * "Edit personalisation" returns to Step 2, where the personaliser lives; the
 * template's in-place dish modal is a known follow-up.
 */
interface ReviewStepProps {
  dishes: Dish[];
  extras: Extra[];
  pricing: BoxPricing;
  personalisation: PersonalisationOptions;
  earliestDeliveryLabel: string;
  heading: ReactNode;
}

export function ReviewStep({
  dishes,
  extras,
  pricing,
  personalisation,
  earliestDeliveryLabel,
  heading,
}: ReviewStepProps) {
  const {
    boxSize,
    isCustom,
    lines,
    extras: extraLines,
    hydrated,
    setExtraQuantity,
    setExtraOption,
    removeExtra,
  } = useCart();

  const [boxOpen, setBoxOpen] = useState(true);
  const [extrasOpen, setExtrasOpen] = useState(true);
  const [openOption, setOpenOption] = useState<string | null>(null);
  /** The mobile bar's order-summary sheet. */
  const [sheetOpen, setSheetOpen] = useState(false);

  const dishById = useMemo(() => new Map(dishes.map((dish) => [dish.id, dish])), [dishes]);
  const extraById = useMemo(() => new Map(extras.map((extra) => [extra.id, extra])), [extras]);

  const totals = useMemo(
    () => cartTotals({ boxSize, isCustom, lines }, pricing),
    [boxSize, isCustom, lines, pricing],
  );
  const extrasSum = useMemo(() => extrasTotals(extraLines, extras), [extraLines, extras]);
  const totalLabel = formatPrice(totals.totalPence + extrasSum.totalPence);

  // Signature upgrades vs other personalisation, with per-dish reconciliation.
  const split = useMemo(() => {
    let signaturePence = 0;
    let personalisationPence = 0;
    const signatureItems: { name: string; pence: number }[] = [];
    const personalisedItems: { name: string; pence: number }[] = [];

    for (const line of lines) {
      const dish = dishById.get(line.dishId);
      const upgrade = dish?.isSignature ? (dish.upgradePence ?? 0) : 0;
      const perUnit = Math.max(0, line.surchargePence - upgrade);
      if (upgrade > 0) {
        signaturePence += upgrade * line.quantity;
        signatureItems.push({ name: line.title, pence: upgrade });
      }
      if (perUnit > 0) {
        personalisationPence += perUnit * line.quantity;
        personalisedItems.push({ name: line.title, pence: perUnit });
      }
    }
    return { signaturePence, personalisationPence, signatureItems, personalisedItems };
  }, [lines, dishById]);

  useEffect(() => {
    if (openOption === null) return;
    const close = () => setOpenOption(null);
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openOption]);

  // The sheet locks the page behind it and closes on Escape, as on steps 2-3.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);

  if (hydrated && boxSize === null) {
    return (
      <div className={styles.noBox}>
        <p className={styles.noBoxTitle}>Choose your box size first</p>
        <Link href="/box" className={styles.noBoxLink}>
          Choose a box
        </Link>
      </div>
    );
  }

  const boxLabel = `${boxSize ?? pricing.custom.minDishes}-dish box`;
  const dishCount = lines.reduce((total, line) => total + line.quantity, 0);
  const boxCountLabel = `${boxLabel} · ${Math.min(dishCount, boxSize ?? 0)} of ${boxSize ?? 0}`;
  const barCountLabel =
    `${dishCount} ${dishCount === 1 ? 'dish' : 'dishes'}` +
    (extrasSum.quantity > 0
      ? ` · ${extrasSum.quantity} ${extrasSum.quantity === 1 ? 'extra' : 'extras'}`
      : '');

  // The summary rows render twice: in the sidebar card and the mobile sheet.
  const summaryRowsJsx = (
    <>
      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>{boxLabel}</span>
        <span className={styles.summaryValue}>{formatPriceExact(totals.boxPence)}</span>
      </div>
      <div className={styles.summaryRule} />

      {split.signaturePence > 0 ? (
        <>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Signature upgrades</span>
            <span className={styles.summaryValue}>+{formatPriceExact(split.signaturePence)}</span>
          </div>
          <div className={styles.summaryRecon}>
            {split.signatureItems
              .map((item) => `${item.name} +${formatPrice(item.pence)}`)
              .join('  ·  ')}
          </div>
          <div className={styles.summaryRule} />
        </>
      ) : null}

      {split.personalisationPence > 0 ? (
        <>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Personalisation</span>
            <span className={styles.summaryValue}>
              +{formatPriceExact(split.personalisationPence)}
            </span>
          </div>
          <div className={styles.summaryRecon}>
            {split.personalisedItems
              .map((item) => `${item.name} +${formatPrice(item.pence)}`)
              .join('  ·  ')}
          </div>
          <div className={styles.summaryRule} />
        </>
      ) : null}

      {totals.extraDishes > 0 ? (
        <>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Extra dishes</span>
            <span className={styles.summaryValue}>+{formatPriceExact(totals.extraPence)}</span>
          </div>
          <div className={styles.summaryRule} />
        </>
      ) : null}

      {extrasSum.quantity > 0 ? (
        <>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Extras</span>
            <span className={styles.summaryValue}>+{formatPriceExact(extrasSum.totalPence)}</span>
          </div>
          <div className={styles.summaryRecon}>
            {extrasSum.quantity} {extrasSum.quantity === 1 ? 'item' : 'items'}
          </div>
          <div className={styles.summaryRule} />
        </>
      ) : null}

      {pricing.delivery ? (
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Delivery</span>
          <span className={styles.summaryDelivery}>
            <span className={styles.summaryWas}>{formatPrice(pricing.delivery.listPence)}</span>
            <span className={styles.summaryNow}>
              {pricing.delivery.pricePence === 0
                ? 'Free'
                : formatPrice(pricing.delivery.pricePence)}
            </span>
          </span>
        </div>
      ) : null}
    </>
  );

  return (
    <div className={styles.shell}>
      <div className={styles.mainColumn}>
        {heading}

        {/* ---- Your box ------------------------------------------------------ */}
        <section className={styles.groupCard}>
          <button
            type="button"
            className={styles.groupHead}
            onClick={() => setBoxOpen((open) => !open)}
            aria-expanded={boxOpen}
          >
            <span className={styles.groupHeadLeft}>
              <span className={styles.groupTitle}>Your box</span>
              <span className={styles.countPill}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </svg>
                {boxCountLabel}
              </span>
            </span>
            <span className={styles.groupChevron}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron} data-open={boxOpen || undefined} aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>

          {boxOpen ? (
            <>
              <div className={styles.groupBody}>
                {lines.map((line, index) => {
                  const dish = dishById.get(line.dishId);
                  return (
                    <div key={line.lineId}>
                      <div className={styles.orderRow}>
                        <Link
                          href={`/menu/${line.slug}`}
                          className={styles.orderThumb}
                          aria-label={`View ${line.title}`}
                        >
                          <Image src={line.imageUrl} alt="" width={74} height={74} />
                        </Link>
                        <div className={styles.orderBody}>
                          <div className={styles.orderTitleRow}>
                            <Link href={`/menu/${line.slug}`} className={styles.orderName}>
                              {line.title}
                            </Link>
                            {dish?.isSignature ? (
                              <span className={styles.sigChip}>
                                <span aria-hidden="true">⬥</span>Signature
                              </span>
                            ) : null}
                            {line.surchargePence > 0 ? (
                              <span className={styles.orderDelta}>
                                +{formatPrice(line.surchargePence * line.quantity)}
                              </span>
                            ) : null}
                          </div>
                          <div className={styles.orderOpts}>
                            {line.quantity > 1 ? `${line.quantity} × ` : ''}
                            {line.personalisation
                              ? personalisationSummary(line.personalisation, personalisation)
                              : "Abby's choice"}
                          </div>
                          <div className={styles.orderActions}>
                            <Link href="/box/dishes" className={styles.editLink}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                                <line x1="4" y1="8" x2="20" y2="8" />
                                <circle cx="10" cy="8" r="2.4" fill="var(--surface-bright)" />
                                <line x1="4" y1="16" x2="20" y2="16" />
                                <circle cx="15" cy="16" r="2.4" fill="var(--surface-bright)" />
                              </svg>
                              Edit personalisation
                            </Link>
                          </div>
                        </div>
                      </div>
                      {index < lines.length - 1 ? <div className={styles.rowRule} /> : null}
                    </div>
                  );
                })}
              </div>
              <div className={styles.groupFootNote}>
                Need to add or remove a dish?{' '}
                <Link href="/box/dishes" className={styles.footNoteLink}>
                  Back to add dishes
                </Link>
              </div>
            </>
          ) : null}
        </section>

        {/* ---- Your extras ---------------------------------------------------- */}
        {extraLines.length > 0 ? (
          <section className={styles.groupCard} data-variant="extras">
            <button
              type="button"
              className={styles.groupHead}
              onClick={() => setExtrasOpen((open) => !open)}
              aria-expanded={extrasOpen}
            >
              <span className={styles.groupHeadLeft}>
                <span className={styles.groupTitle}>Your extras</span>
                <span className={styles.groupCount}>
                  {extrasSum.quantity} {extrasSum.quantity === 1 ? 'item' : 'items'}
                </span>
              </span>
              <span className={styles.groupChevron}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron} data-open={extrasOpen || undefined} aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>

            {extrasOpen ? (
              <>
                <div className={styles.groupBody}>
                  {extraLines.map((line, index) => {
                    const extra = extraById.get(line.extraId);
                    if (!extra) return null;
                    const chosen = extra.option?.choices.find((c) => c.key === line.optionKey);
                    return (
                      <div key={line.extraId}>
                        <div className={styles.orderRow}>
                          <span className={styles.orderThumb}>
                            <Image src={extra.imageUrl} alt="" width={74} height={74} />
                          </span>
                          <div className={styles.orderBody}>
                            <div className={styles.orderTitleRow}>
                              <span className={styles.orderName}>{extra.name}</span>
                              <span className={styles.orderDelta} data-tone="price">
                                {formatPriceExact(extraUnitPence(line, extra) * line.quantity)}
                              </span>
                            </div>
                            <div className={styles.orderActions}>
                              {extra.option ? (
                                <span className={styles.optWrap}>
                                  <span className={styles.optKind}>{extra.option.kind}</span>
                                  <span className={styles.optAnchor}>
                                    <button
                                      type="button"
                                      className={styles.optToken}
                                      onClick={() =>
                                        setOpenOption((open) =>
                                          open === extra.id ? null : extra.id,
                                        )
                                      }
                                      aria-expanded={openOption === extra.id}
                                    >
                                      {chosen?.label ?? extra.option.kind}
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron} data-open={openOption === extra.id || undefined} aria-hidden="true">
                                        <path d="M6 9l6 6 6-6" />
                                      </svg>
                                    </button>
                                    {openOption === extra.id ? (
                                      <div className={styles.optMenu}>
                                        {extra.option.choices.map((choice) => (
                                          <button
                                            key={choice.key}
                                            type="button"
                                            className={styles.optMenuRow}
                                            data-selected={
                                              choice.key === line.optionKey || undefined
                                            }
                                            onClick={() => {
                                              setExtraOption(extra.id, choice.key);
                                              setOpenOption(null);
                                            }}
                                          >
                                            <span>{choice.label}</span>
                                            {choice.key === line.optionKey ? (
                                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M5 12.5l4.5 4.5L19 7" />
                                              </svg>
                                            ) : null}
                                          </button>
                                        ))}
                                      </div>
                                    ) : null}
                                  </span>
                                </span>
                              ) : null}
                              <span className={styles.stepGroup} role="group" aria-label="Quantity">
                                <button
                                  type="button"
                                  className={styles.cstep}
                                  onClick={() =>
                                    setExtraQuantity(extra.id, line.quantity - 1)
                                  }
                                  aria-label="Fewer"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                                    <path d="M5 12h14" />
                                  </svg>
                                </button>
                                <span className={styles.stepQty}>{line.quantity}</span>
                                <button
                                  type="button"
                                  className={styles.cstep}
                                  onClick={() =>
                                    setExtraQuantity(extra.id, line.quantity + 1)
                                  }
                                  aria-label="More"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                                    <path d="M12 5v14" />
                                    <path d="M5 12h14" />
                                  </svg>
                                </button>
                              </span>
                              <button
                                type="button"
                                className={styles.removeButton}
                                onClick={() => removeExtra(extra.id)}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M4 7h16" />
                                  <path d="M9 7V5h6v2" />
                                  <path d="M6 7l1 12h10l1-12" />
                                </svg>
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                        {index < extraLines.length - 1 ? (
                          <div className={styles.rowRule} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className={styles.groupFootNote}>
                  Looking for something else?{' '}
                  <Link href="/box/extras" className={styles.footNoteLink}>
                    Back to add extras
                  </Link>
                </div>
              </>
            ) : null}
          </section>
        ) : null}
      </div>

      {/* ---- Order summary ---------------------------------------------------- */}
      <aside className={styles.summaryColumn} aria-label="Order summary">
        <div className={styles.summaryCard}>
          <div className={styles.summaryHead}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 8l9-4 9 4-9 4-9-4z" />
              <path d="M3 8v8l9 4 9-4V8" />
              <path d="M12 12v8" />
            </svg>
            <span>Order summary</span>
          </div>

          <div className={styles.summaryBody}>{summaryRowsJsx}</div>

          <div className={styles.summaryFoot}>
            <div className={styles.totalRow}>
              <span>Total</span>
              <span className={styles.totalValue}>{totalLabel}</span>
            </div>
            <Link href="/box/checkout" className={styles.cta}>
              <span className={styles.ctaMain}>
                Continue to checkout
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="4" y1="12" x2="19" y2="12" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </span>
              <span className={styles.ctaSub}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6z" />
                  <path d="M9.5 12l1.8 1.8L15 10" />
                </svg>
                Secure checkout
              </span>
            </Link>
            <p className={styles.deliveryNote}>
              Earliest UK-wide delivery: <strong>{earliestDeliveryLabel}</strong>
            </p>
          </div>
        </div>
      </aside>

      {/* ---- Mobile bar + order-summary sheet -------------------------------- */}
      <div className={styles.mobileBar}>
        <button
          type="button"
          className={styles.barSummary}
          onClick={() => setSheetOpen(true)}
          aria-label="View order summary"
        >
          <span className={styles.barIcon} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8l9-4 9 4-9 4-9-4z" />
              <path d="M3 8v8l9 4 9-4V8" />
              <path d="M12 12v8" />
            </svg>
          </span>
          <span className={styles.barText}>
            <span className={styles.barTitle}>Order summary</span>
            <span className={styles.barCount}>{barCountLabel}</span>
            <span className={styles.barTotal}>{totalLabel}</span>
          </span>
          <span className={styles.barChevron} data-open={sheetOpen || undefined} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </span>
        </button>
        <span className={styles.barDivider} aria-hidden="true" />
        <Link href="/box/checkout" className={styles.barCta}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="12" x2="19" y2="12" />
            <path d="M13 6l6 6-6 6" />
          </svg>
          Continue
        </Link>
      </div>

      {sheetOpen ? (
        <>
          <div className={styles.sheetOverlay} onClick={() => setSheetOpen(false)} />
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Order summary">
            <div className={styles.sheetTop}>
              <div className={styles.sheetHandle} aria-hidden="true" />
              <div className={styles.sheetHeadRow}>
                <span className={styles.sheetTitle}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 8l9-4 9 4-9 4-9-4z" />
                    <path d="M3 8v8l9 4 9-4V8" />
                    <path d="M12 12v8" />
                  </svg>
                  Order summary
                </span>
                <button
                  type="button"
                  className={styles.sheetClose}
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>
            <div className={styles.sheetScroll}>{summaryRowsJsx}</div>
            <div className={styles.sheetFoot}>
              <div className={styles.sheetTotalRow}>
                <span>Total</span>
                <span className={styles.sheetTotalValue}>{totalLabel}</span>
              </div>
              <Link href="/box/checkout" className={`${styles.cta} ${styles.sheetCta}`}>
                <span className={styles.ctaMain}>
                  Continue to checkout
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="4" y1="12" x2="19" y2="12" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                </span>
                <span className={styles.ctaSub}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6z" />
                    <path d="M9.5 12l1.8 1.8L15 10" />
                  </svg>
                  Secure checkout
                </span>
              </Link>
              <p className={styles.sheetDeliveryNote}>
                Earliest UK-wide delivery: <strong>{earliestDeliveryLabel}</strong>
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

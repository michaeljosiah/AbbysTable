'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { encodeSelection } from '@/lib/aonik/map';
import {
  localSurcharge,
  selectionDraft,
  selectionSummary,
  type PersonalisationDraft,
} from '@/lib/aonik/personalisation';
import { EXTRA_CATEGORIES, type BoxPricing, type Extra } from '@/lib/aonik/types';
import {
  cartTotals,
  extraUnitPence,
  extrasTotals,
  useCart,
  type ExtraLine,
} from '@/lib/cart/CartProvider';
import { afterCartMutation } from '@/lib/cart/convergence';
import { extraLinePersonalisation } from '@/lib/cart/demoStorage';
import { quoteComponentLabel } from '@/lib/cart/quote';
import { formatPrice, formatPriceExact, formatSignedPrice } from '@/lib/format';

import { ContinueLink } from './ContinueLink';
import { DriftNotices } from './DriftNotices';
import styles from './ExtrasStep.module.css';

/**
 * Step 3: à-la-carte extras.
 *
 * Everything on this page is optional — the CTA continues to review whether or
 * not anything was added. Prices always show two decimals here, as the
 * template's extras pricing does.
 */
interface ExtrasStepProps {
  extras: Extra[];
  pricing: BoxPricing;
  /**
   * Pre-formatted delivery date, e.g. "6 August", or null when the tenant
   * publishes no promise — in which case the line is not rendered at all. A
   * wrong date is worse than no date, so nothing is invented here.
   */
  earliestDeliveryLabel: string | null;
  heading: ReactNode;
}

type ModalState = {
  variantId: string;
  lineId?: string;
  quantity: number;
  draft: PersonalisationDraft;
};

const ALL = 'All';

export function ExtrasStep({
  extras,
  pricing,
  earliestDeliveryLabel,
  heading,
}: ExtrasStepProps) {
  const {
    boxSize,
    isCustom,
    lines,
    extras: extraLines,
    hydrated,
    addExtra,
    updateExtra,
    removeExtra,
    pending,
    isServerCart,
    quote,
  } = useCart();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dishesOpen, setDishesOpen] = useState(false);
  const [estOpen, setEstOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);

  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4200);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const extraById = useMemo(() => new Map(extras.map((extra) => [extra.id, extra])), [extras]);
  const lineFor = useCallback(
    (variantId: string): ExtraLine | undefined =>
      extraLines.find((line) => line.variantId === variantId),
    [extraLines],
  );

  const boxTotals = useMemo(
    () => (isServerCart ? null : cartTotals({ boxSize, isCustom, lines }, pricing)),
    [isServerCart, boxSize, isCustom, lines, pricing],
  );
  const extrasSum: { quantity: number; totalPence?: number } = useMemo(
    () =>
      isServerCart
        ? { quantity: extraLines.reduce((total, line) => total + line.quantity, 0) }
        : extrasTotals(extraLines, extras),
    [isServerCart, extraLines, extras],
  );
  const grandTotalPence = isServerCart
    ? quote?.totalPence
    : boxTotals?.totalPence === undefined || extrasSum.totalPence === undefined
      ? undefined
      : boxTotals.totalPence + extrasSum.totalPence;
  const totalLabel =
    grandTotalPence === undefined
      ? isServerCart
        ? ''
        : 'Price unavailable'
      : formatPrice(grandTotalPence);

  /* ---- Filtering ------------------------------------------------------------ */

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return extras.filter((extra) => {
      if (category !== ALL && extra.category !== category) return false;
      if (needle) {
        const corpus = `${extra.name} ${extra.description} ${extra.category}`.toLowerCase();
        if (!corpus.includes(needle)) return false;
      }
      return true;
    });
  }, [extras, query, category]);

  const resultLabel = `Showing ${filtered.length} ${filtered.length === 1 ? 'extra' : 'extras'}`;

  /* ---- Card actions --------------------------------------------------------- */

  const addFromCard = async (extra: Extra) => {
    if (pending) return;
    if (extra.optionGroups.length > 0) {
      openModal(extra);
      return;
    }
    try {
      await afterCartMutation(
        () => addExtra(extra.id, 1),
        () => flash(`${extra.name} added to your box`),
      );
    } catch {
      // The provider has recorded the actionable error; do not announce success.
    }
  };

  const step = async (extra: Extra, delta: number) => {
    if (pending) return;
    const line = lineFor(extra.id);
    if (!line) {
      if (delta > 0) await addFromCard(extra);
      return;
    }
    const quantity = line.quantity + delta;
    try {
      if (quantity <= 0) await removeExtra(line.lineId);
      else await updateExtra(line.lineId, { quantity });
    } catch {
      // The provider owns the visible error and retains server truth.
    }
  };

  const changeExtraLine = async (line: ExtraLine, quantity: number) => {
    if (pending) return;
    try {
      if (quantity <= 0) await removeExtra(line.lineId);
      else await updateExtra(line.lineId, { quantity });
    } catch {
      // The provider owns the visible error and retains server truth.
    }
  };

  const removeExtraLine = async (line: ExtraLine, name: string) => {
    if (pending) return;
    try {
      await afterCartMutation(
        () => removeExtra(line.lineId),
        () => flash(`${name} removed`),
      );
    } catch {
      // Do not announce removal until the server confirms it.
    }
  };

  /* ---- Modal ---------------------------------------------------------------- */

  const openModal = (extra: Extra, selectedLine = lineFor(extra.id)) => {
    setModal({
      variantId: extra.id,
      lineId: selectedLine?.lineId,
      quantity: selectedLine?.quantity ?? 1,
      draft: selectionDraft(
        extra.optionGroups,
        selectedLine ? extraLinePersonalisation(selectedLine, extra.optionGroups) : undefined,
      ),
    });
  };

  const commitModal = async () => {
    if (!modal || pending) return;
    const extra = extraById.get(modal.variantId);
    if (!extra) return;
    const personalisation = encodeSelection(extra.optionGroups, modal.draft, !modal.lineId);
    try {
      await afterCartMutation(
        () =>
          modal.lineId
            ? updateExtra(modal.lineId, {
                quantity: modal.quantity,
                ...(extra.optionGroups.length > 0
                  ? { personalisation: personalisation ?? {} }
                  : {}),
              })
            : addExtra(extra.id, modal.quantity, personalisation),
        () => {
          flash(`${extra.name} ${modal.lineId ? 'updated' : 'added to your box'}`);
          setModal(null);
        },
      );
    } catch {
      // Keep the modal open with the confirmed values when the write fails.
    }
  };

  // One owner for Escape and the body scroll lock across the step's overlays.
  useEffect(() => {
    const anyOpen = modal !== null || sheetOpen;
    if (!anyOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (modal) setModal(null);
      else if (sheetOpen) setSheetOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    if (anyOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [modal, sheetOpen]);

  if (hydrated && boxSize === null) {
    return (
      <div className={styles.noBox}>
        <p className={styles.noBoxTitle}>Choose your box size first</p>
        <p className={styles.noBoxCopy}>
          Pick how many dishes you would like, add them, then round out your table here.
        </p>
        <Link href="/box" className={styles.noBoxLink}>
          Choose a box
        </Link>
      </div>
    );
  }

  const boxLabel = `${boxSize ?? pricing.custom.minDishes}-dish box`;
  const mobileCountLabel = `${boxSize ?? 0} dishes${
    extrasSum.quantity > 0
      ? ` · ${extrasSum.quantity} ${extrasSum.quantity === 1 ? 'extra' : 'extras'}`
      : ''
  }`;

  const modalExtra = modal ? extraById.get(modal.variantId) : undefined;
  const modalSurcharge = modalExtra && modal
    ? localSurcharge(modalExtra.optionGroups, modal.draft)
    : 0;
  const modalUnitPence =
    modalExtra && modalSurcharge !== undefined
      ? modalExtra.pricePence + modalSurcharge
      : undefined;
  const modalInBox = Boolean(modal?.lineId);
  const modalCommitLabel = modalExtra
    ? `${modalInBox ? 'Update' : 'Add to box'}${
        modalUnitPence === undefined
          ? ''
          : ` · ${formatPriceExact(modalUnitPence * (modal?.quantity ?? 1))}`
      }`
    : '';

  /* ---- Shared fragments ------------------------------------------------------ */

  const chips = (
    <>
      {[ALL, ...EXTRA_CATEGORIES].map((label) => {
        const selected = category === label;
        return (
          <button
            key={label}
            type="button"
            className={styles.chip}
            data-selected={selected || undefined}
            aria-pressed={selected}
            onClick={() => {
              setCategory(label);
              setFiltersOpen(false);
            }}
          >
            {label}
            {selected && label !== ALL ? (
              <span className={styles.chipX} aria-hidden="true">
                ×
              </span>
            ) : null}
          </button>
        );
      })}
    </>
  );

  const extrasList = (context: 'summary' | 'sheet') => (
    <>
      {extraLines.map((line) => {
        const extra = extraById.get(line.variantId);
        if (!extra) return null;
        const unitPence = isServerCart ? line.unitPricePence : extraUnitPence(line, extra);
        return (
          <div key={line.lineId} className={styles.boxRow}>
            <button
              type="button"
              className={styles.rowThumb}
              onClick={() => openModal(extra, line)}
              aria-label={`View ${extra.name}`}
            >
              <Image src={extra.imageUrl} alt="" width={52} height={52} />
            </button>
            <div className={styles.rowBody}>
              <div className={styles.rowTop}>
                <button
                  type="button"
                  className={styles.rowName}
                  onClick={() => openModal(extra, line)}
                >
                  {extra.name}
                </button>
                <span className={styles.rowPrice}>
                  {unitPence === undefined
                    ? 'Price unavailable'
                    : formatPriceExact(isServerCart ? unitPence : unitPence * line.quantity)}
                </span>
              </div>
              {extra.optionGroups.length > 0 ? (
                <div className={styles.rowOpt}>
                  {selectionSummary(
                    extra.optionGroups,
                    extraLinePersonalisation(line, extra.optionGroups),
                  )}
                </div>
              ) : null}
              <div className={styles.rowControls}>
                <span className={styles.stepGroup}>
                  <button
                    type="button"
                    className={styles.cstep}
                    onClick={() => void changeExtraLine(line, line.quantity - 1)}
                    disabled={pending}
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
                    onClick={() => void changeExtraLine(line, line.quantity + 1)}
                    disabled={pending}
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
                  className={styles.rowRemove}
                  onClick={() => void removeExtraLine(line, extra.name)}
                  disabled={pending}
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
        );
      })}
      {extraLines.length === 0 ? (
        <div className={styles.emptyExtras} data-context={context}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v18" />
            <path d="M3 12h18" />
          </svg>
          <div>
            <div className={styles.emptyTitle}>No extras yet</div>
            <div className={styles.emptyCopy}>
              Add sides, drinks or small chops to round out your table — or skip straight to
              review.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  const estRows = isServerCart ? (
    quote ? (
      <>
        {quote.components.map((component, index) => (
          <div key={`${component.key}:${index}`} className={styles.estRow}>
            <span>{quoteComponentLabel(component.key)}</span>
            <span className={styles.estStrong}>{formatPriceExact(component.amountPence)}</span>
          </div>
        ))}
        <span className={styles.estRule} aria-hidden="true" />
        <div className={styles.estTotalRow}>
          <span>Total</span>
          <span className={styles.estTotalValue}>{formatPrice(quote.totalPence)}</span>
        </div>
      </>
    ) : null
  ) : (
    <>
      <div className={styles.estRow}>
        <span>{boxLabel}</span>
        <span className={styles.estStrong}>
          {boxTotals?.totalPence === undefined
            ? 'Price unavailable'
            : formatPrice(boxTotals.totalPence)}
        </span>
      </div>
      {extrasSum.quantity > 0 ? (
        <div className={styles.estRow}>
          <span>
            {extrasSum.quantity} {extrasSum.quantity === 1 ? 'extra' : 'extras'}
          </span>
          <span className={styles.estStrong}>
            {extrasSum.totalPence === undefined
              ? 'Price unavailable'
              : formatSignedPrice(extrasSum.totalPence, true)}
          </span>
        </div>
      ) : null}
      {pricing.delivery ? (
        <div className={styles.estRow}>
          <span>Delivery</span>
          <span className={styles.estDelivery}>
            <span className={styles.estWas}>{formatPrice(pricing.delivery.listPence)}</span>
            <span className={styles.estNow}>
              {pricing.delivery.pricePence === 0
                ? 'Free'
                : formatPrice(pricing.delivery.pricePence)}
            </span>
          </span>
        </div>
      ) : null}
      <span className={styles.estRule} aria-hidden="true" />
      <div className={styles.estTotalRow}>
        <span>Total</span>
        <span className={styles.estTotalValue}>{totalLabel}</span>
      </div>
    </>
  );

  const cta = (
    <div className={styles.ctaWrap}>
      <ContinueLink href="/box/review" className={styles.cta} onClick={() => setSheetOpen(false)}>
        <span className={styles.ctaMain}>
          Continue to review
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
      </ContinueLink>
      {earliestDeliveryLabel ? (
        <p className={styles.deliveryNote}>
          Earliest UK-wide delivery: <strong>{earliestDeliveryLabel}</strong>
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      <div className={styles.shell}>
        <div className={styles.mainColumn}>
          {heading}

          <DriftNotices />

          <div className={styles.filterSticky}>
            {/* Desktop: bare search + always-visible category chips. */}
            <div className={styles.desktopFilters}>
              <div className={styles.search}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.5" y2="16.5" />
                </svg>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search sides, drinks, small chops..."
                  aria-label="Search extras"
                />
                {query ? (
                  <button
                    type="button"
                    className={styles.clear}
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <div className={styles.chipRow}>{chips}</div>
            </div>

            {/* Mobile: search + Options toggle inside a filter card. */}
            <div className={styles.mobileFilters}>
              <div className={styles.mobileBarRow}>
                <div className={styles.search} data-context="mobile">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.5" y2="16.5" />
                  </svg>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search extras"
                    aria-label="Search extras"
                  />
                  {query ? (
                    <button
                      type="button"
                      className={styles.clear}
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={styles.filterToggle}
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 5h18l-7 8v5l-4 2v-7z" />
                  </svg>
                  <span className={styles.filterWordDesktop}>Categories</span>
                  <span className={styles.filterWordMobile}>Options</span>
                  {category !== ALL ? <span className={styles.filterCount}>1</span> : null}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.filterChevron} data-open={filtersOpen || undefined} aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
              {filtersOpen ? <div className={styles.mobilePanel}>{chips}</div> : null}
            </div>
          </div>

          <div className={styles.resultBar}>
            <span className={styles.resultCount}>{resultLabel}</span>
            {category !== ALL ? (
              <button
                type="button"
                className={styles.activeChip}
                onClick={() => setCategory(ALL)}
              >
                <span>{category}</span>
                <span className={styles.activeX} aria-hidden="true">
                  ×
                </span>
              </button>
            ) : null}
          </div>

          <div className={styles.grid}>
            {filtered.map((extra) => {
              const line = lineFor(extra.id);
              return (
                <article
                  key={extra.id}
                  className={styles.card}
                  data-selected={line ? '' : undefined}
                >
                  <div
                    className={styles.media}
                    onClick={() => openModal(extra)}
                    aria-hidden="true"
                  >
                    <Image
                      src={extra.imageUrl}
                      alt={extra.name}
                      width={720}
                      height={576}
                      className={styles.mediaImage}
                      sizes="(max-width: 860px) 100vw, 33vw"
                    />
                    {line ? (
                      <span className={styles.inBox}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12.5l4.5 4.5L19 7" />
                        </svg>
                        In your box
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTop}>
                      <h3 className={styles.cardName} onClick={() => openModal(extra)}>
                        {extra.name}
                      </h3>
                      <span className={styles.cardPrice}>
                        {formatPriceExact(extra.pricePence)}
                      </span>
                    </div>
                    <p className={styles.cardDesc}>{extra.description}</p>

                    <div className={styles.cardActions}>
                      {extra.optionGroups.length > 0 ? (
                        <div className={styles.optDrop}>
                          <button
                            type="button"
                            className={styles.optTrigger}
                            onClick={() => openModal(extra)}
                          >
                            <span data-chosen={line ? '' : undefined}>
                              {line
                                ? selectionSummary(
                                    extra.optionGroups,
                                    extraLinePersonalisation(line, extra.optionGroups),
                                  )
                                : 'Choose options'}
                            </span>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </button>
                        </div>
                      ) : null}

                      <div className={styles.cardCta}>
                        <button
                          type="button"
                          className={styles.view}
                          onClick={() => openModal(extra)}
                        >
                          View
                        </button>
                        {line ? (
                          <span className={styles.cardStep} role="group" aria-label="Quantity">
                            <button
                              type="button"
                              onClick={() => void step(extra, -1)}
                              disabled={pending}
                              aria-label="Remove one"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                                <path d="M5 12h14" />
                              </svg>
                            </button>
                            <span className={styles.cardStepQty}>{line.quantity}</span>
                            <button
                              type="button"
                              onClick={() => void step(extra, 1)}
                              disabled={pending}
                              aria-label="Add one"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                                <path d="M12 5v14" />
                                <path d="M5 12h14" />
                              </svg>
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={styles.add}
                            onClick={() => void addFromCard(extra)}
                            disabled={pending}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                              <path d="M12 5v14" />
                              <path d="M5 12h14" />
                            </svg>
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className={styles.noResults}>
              <p className={styles.noResultsTitle}>No extras match your search.</p>
              <button
                type="button"
                className={styles.noResultsAction}
                onClick={() => {
                  setQuery('');
                  setCategory(ALL);
                }}
              >
                Clear search &amp; filters
              </button>
            </div>
          ) : null}
        </div>

        {/* ---- Sidebar --------------------------------------------------------- */}
        <aside className={styles.summaryColumn} aria-label="Your box">
          <div className={styles.summaryCard}>
            <div className={styles.summaryHead}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 8l9-4 9 4-9 4-9-4z" />
                <path d="M3 8v8l9 4 9-4V8" />
                <path d="M12 12v8" />
              </svg>
              <span>Your box</span>
            </div>

            <div className={styles.summaryTop}>
              <div className={styles.dishesBox}>
                <div className={styles.dishesLabel}>{boxLabel}</div>
                <button
                  type="button"
                  className={styles.dishesToggle}
                  onClick={() => setDishesOpen((open) => !open)}
                  aria-expanded={dishesOpen}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" fill="var(--green-forest)" />
                    <path d="M8 12.3l2.6 2.6 5-5.4" fill="none" stroke="var(--blush)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className={styles.dishesTitle}>Your {boxSize} dishes</span>
                  <span className={styles.dishesComplete}>Complete</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.filterChevron} data-open={dishesOpen || undefined} aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {dishesOpen ? (
                  <>
                    <div className={styles.dishesEditRow}>
                      <Link href="/box/dishes" className={styles.dishesEdit}>
                        Edit dishes
                      </Link>
                    </div>
                    <div className={styles.dishesList}>
                      {lines.map((line, index) => (
                        <div key={line.lineId} className={styles.dishRow}>
                          <span className={styles.dishNum}>{index + 1}</span>
                          <div className={styles.dishText}>
                            <div className={styles.dishName}>{line.title}</div>
                            <div className={styles.dishPers}>
                              {line.personalisation
                                ? 'Personalised'
                                : "Abby's choice"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              <div className={styles.extrasHead}>Your extras</div>
            </div>

            <div className={styles.summaryScroll}>{extrasList('summary')}</div>

            <div className={styles.summaryFoot}>
              <div className={styles.estHead}>
                <span className={styles.estLeft}>
                  <button
                    type="button"
                    className={styles.estToggle}
                    onClick={() => setEstOpen((open) => !open)}
                    aria-expanded={estOpen}
                  >
                    Estimated total
                  </button>
                  <button
                    type="button"
                    className={styles.infoButton}
                    onClick={() => setTipOpen((open) => !open)}
                    aria-expanded={tipOpen}
                    aria-label="About pricing"
                  >
                    i
                  </button>
                </span>
                <button
                  type="button"
                  className={styles.estValueButton}
                  onClick={() => setEstOpen((open) => !open)}
                  aria-expanded={estOpen}
                >
                  <span className={styles.estValue}>{totalLabel}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.filterChevron} data-open={estOpen || undefined} aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>

              {tipOpen ? (
                <div className={styles.infoCard}>
                  Your box price is fixed. Extras are added on top and confirmed at checkout.
                  <button
                    type="button"
                    className={styles.infoClose}
                    onClick={() => setTipOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              ) : null}

              {estOpen ? <div className={styles.estPanel}>{estRows}</div> : null}

              {cta}
            </div>
          </div>
        </aside>
      </div>

      {/* ---- Mobile bar + sheet ------------------------------------------------ */}
      <div className={styles.mobileBar}>
        <button
          type="button"
          className={styles.barSummary}
          onClick={() => setSheetOpen(true)}
          aria-label="View your box"
          aria-expanded={sheetOpen}
        >
          <span className={styles.barIcon} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8l9-4 9 4-9 4-9-4z" />
              <path d="M3 8v8l9 4 9-4V8" />
              <path d="M12 12v8" />
            </svg>
          </span>
          <span className={styles.barText}>
            <span className={styles.barTitle}>Your box</span>
            <span className={styles.barCount}>{mobileCountLabel}</span>
            <span className={styles.barTotal}>{totalLabel}</span>
          </span>
          <span className={styles.barChevron} data-open={sheetOpen || undefined} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </span>
        </button>
        <span className={styles.barDivider} aria-hidden="true" />
        <ContinueLink href="/box/review" className={styles.barCta}>
          Continue
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="12" x2="19" y2="12" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </ContinueLink>
      </div>

      {sheetOpen ? (
        <>
          <div className={styles.sheetOverlay} onClick={() => setSheetOpen(false)} />
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Your box">
            <div className={styles.sheetTop}>
              <div className={styles.sheetHandle} aria-hidden="true" />
              <div className={styles.sheetHeadRow}>
                <span className={styles.sheetTitle}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 8l9-4 9 4-9 4-9-4z" />
                    <path d="M3 8v8l9 4 9-4V8" />
                    <path d="M12 12v8" />
                  </svg>
                  Your box
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
              <div className={styles.sheetBoxBlock}>
                <div className={styles.dishesBox}>
                  <div className={styles.dishesLabel}>{boxLabel}</div>
                  <button
                    type="button"
                    className={styles.dishesToggle}
                    onClick={() => setDishesOpen((open) => !open)}
                    aria-expanded={dishesOpen}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" fill="var(--green-forest)" />
                      <path d="M8 12.3l2.6 2.6 5-5.4" fill="none" stroke="var(--blush)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className={styles.dishesTitle}>Your {boxSize} dishes</span>
                    <span className={styles.dishesComplete}>Complete</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.filterChevron} data-open={dishesOpen || undefined} aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {dishesOpen ? (
                    <div className={styles.dishesList}>
                      {lines.map((line, index) => (
                        <div key={line.lineId} className={styles.dishRow}>
                          <span className={styles.dishNum}>{index + 1}</span>
                          <div className={styles.dishText}>
                            <div className={styles.dishName}>{line.title}</div>
                            <div className={styles.dishPers}>
                              {line.personalisation
                                ? 'Personalised'
                                : "Abby's choice"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className={styles.extrasHead} data-context="sheet">
                  Your extras
                </div>
              </div>
            </div>

            <div className={styles.sheetScroll}>
              {extrasList('sheet')}
              <div className={styles.estPanel} data-context="sheet">
                {estRows}
              </div>
            </div>

            <div className={styles.sheetFoot}>{cta}</div>
          </div>
        </>
      ) : null}

      {/* ---- Extra detail modal ------------------------------------------------ */}
      {modal && modalExtra ? (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={modalExtra.name}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <span className={styles.modalThumb}>
                <Image src={modalExtra.imageUrl} alt="" width={46} height={46} />
              </span>
              <span className={styles.modalHeadName}>{modalExtra.name}</span>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setModal(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalHero}>
                <Image
                  src={modalExtra.imageUrl}
                  alt={modalExtra.name}
                  width={860}
                  height={484}
                  className={styles.modalHeroImage}
                />
              </div>
              <div className={styles.modalTitleRow}>
                <span className={styles.modalName}>{modalExtra.name}</span>
                <span className={styles.modalPrice}>
                  {formatPriceExact(modalExtra.pricePence)}
                </span>
              </div>
              <p className={styles.modalLong}>{modalExtra.longDescription}</p>

              <div className={styles.modalJumps}>
                {[
                  { label: 'Nutrition', target: 'extra-nutrition' },
                  { label: 'Ingredients & allergens', target: 'extra-ingredients' },
                  { label: 'How to heat', target: 'extra-heating' },
                ].map((jump, index) => (
                  <span key={jump.target} className={styles.modalJumpWrap}>
                    {index > 0 ? (
                      <span className={styles.modalJumpSep} aria-hidden="true">
                        ·
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className={styles.modalJump}
                      onClick={() =>
                        document
                          .getElementById(jump.target)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    >
                      {jump.label}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 5v14" />
                        <path d="M6 13l6 6 6-6" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>

              {modalExtra.optionGroups.map((group) => (
                <div key={group.key} className={styles.modalOpt}>
                  <label className={styles.modalOptLabel} htmlFor={`extra-option-${group.key}`}>
                    {group.label}
                    {group.helpText ? ` — ${group.helpText}` : ''}
                  </label>
                  <div className={styles.modalSelectWrap}>
                    <select
                      id={`extra-option-${group.key}`}
                      multiple={group.selectionMode === 'Multi'}
                      value={
                        group.selectionMode === 'Multi'
                          ? (modal.draft[group.key] ?? [])
                          : (modal.draft[group.key]?.[0] ?? '')
                      }
                      onChange={(event) => {
                        const values =
                          group.selectionMode === 'Multi'
                            ? Array.from(event.currentTarget.selectedOptions, (option) => option.value)
                            : [event.currentTarget.value];
                        if (values.length === 0) return;
                        setModal((current) =>
                          current
                            ? { ...current, draft: { ...current.draft, [group.key]: values } }
                            : current,
                        );
                      }}
                    >
                      {group.choices.map((choice) => (
                        <option key={choice.key} value={choice.key}>
                          {choice.label}
                          {choice.pricePence !== 0
                            ? ` (${formatSignedPrice(choice.pricePence, true)})`
                            : ''}
                        </option>
                      ))}
                    </select>
                    {group.selectionMode === 'One' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    ) : null}
                  </div>
                </div>
              ))}
              {modalExtra.optionGroups.length > 0 ? (
                <button
                  type="button"
                  className={styles.view}
                  onClick={() =>
                    setModal((current) =>
                      current
                        ? {
                            ...current,
                            draft: selectionDraft(modalExtra.optionGroups),
                          }
                        : current,
                    )
                  }
                >
                  Reset to defaults
                </button>
              ) : null}

              <div className={styles.modalQtyRow}>
                <span>Quantity</span>
                <span className={styles.cardStep} role="group" aria-label="Quantity">
                  <button
                    type="button"
                    onClick={() =>
                      setModal((current) =>
                        current
                          ? { ...current, quantity: Math.max(1, current.quantity - 1) }
                          : current,
                      )
                    }
                    disabled={modal.quantity <= 1}
                    aria-label="Fewer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                  <span className={styles.cardStepQty}>{modal.quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setModal((current) =>
                        current ? { ...current, quantity: current.quantity + 1 } : current,
                      )
                    }
                    aria-label="More"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                </span>
              </div>

              <ExtraInfoSection id="extra-nutrition" title="Full nutrition" icon="chart">
                <div className={styles.nutCaption}>Per serving</div>
                <div className={styles.nutRule} />
                <div className={styles.nutGrid}>
                  {[
                    { label: 'kcal', value: modalExtra.nutrition.calories },
                    { label: 'Protein', value: `${modalExtra.nutrition.proteinGrams}g` },
                    { label: 'Carbs', value: `${modalExtra.nutrition.carbsGrams}g` },
                    { label: 'Fat', value: `${modalExtra.nutrition.fatGrams}g` },
                  ].map((cell) => (
                    <div key={cell.label} className={styles.nutCell}>
                      <div className={styles.nutLabel}>{cell.label}</div>
                      <div className={styles.nutValue}>{cell.value}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.nutRule} />
                <div className={styles.nutGrid}>
                  {[
                    { label: 'Fibre', value: `${modalExtra.nutrition.fibreGrams}g` },
                    { label: 'Sugars', value: `${modalExtra.nutrition.sugarsGrams}g` },
                    { label: 'Salt', value: `${modalExtra.nutrition.saltGrams}g` },
                  ].map((cell) => (
                    <div key={cell.label} className={styles.nutCell}>
                      <div className={styles.nutLabel}>{cell.label}</div>
                      <div className={styles.nutValue}>{cell.value}</div>
                    </div>
                  ))}
                </div>
              </ExtraInfoSection>

              <ExtraInfoSection id="extra-ingredients" title="Ingredients & allergens" icon="leaf">
                {modalExtra.ingredients ? (
                  <p className={styles.ingredients}>{modalExtra.ingredients}</p>
                ) : null}
                <div className={styles.allergenCard}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10.3 4.3 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  {/* SAFETY: an absent declaration is NOT "None". Saying "None"
                      when nobody has declared would tell someone with an
                      allergy that this is safe for them. */}
                  {modalExtra.allergens ? (
                    <span>
                      <strong>Allergens:</strong>{' '}
                      {modalExtra.allergens.length > 0 ? modalExtra.allergens.join(', ') : 'None'}
                    </span>
                  ) : (
                    <span>
                      <strong>Allergens:</strong> not yet published for this item. Please contact
                      us before ordering if you have an allergy.
                    </span>
                  )}
                </div>
              </ExtraInfoSection>

              <ExtraInfoSection id="extra-heating" title="How to heat" icon="steam">
                <div className={styles.heatCard}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2.5" y="5" width="19" height="14" rx="1.5" />
                    <rect x="5" y="8" width="9.5" height="8" rx="1" />
                    <path d="M18 8.5v7" />
                  </svg>
                  <div>
                    <div className={styles.heatTitle}>
                      {modalExtra.serveStyle === 'hot'
                        ? 'Serve hot'
                        : modalExtra.serveStyle === 'chilled'
                          ? 'Serve chilled'
                          : 'Ready to serve'}
                    </div>
                    <p className={styles.heatText}>{modalExtra.heating}</p>
                  </div>
                </div>
              </ExtraInfoSection>
            </div>

            <div className={styles.modalFoot}>
              <div className={styles.modalFootRow}>
                <span className={styles.modalFootNote}>Added on top of your box price</span>
                <span className={styles.modalFootTotal}>
                  {modalUnitPence === undefined
                    ? 'Price unavailable'
                    : formatPriceExact(modalUnitPence * modal.quantity)}
                </span>
              </div>
              <button
                type="button"
                className={styles.modalCommit}
                onClick={commitModal}
                disabled={pending}
              >
                {modalCommitLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.toast} data-shown={toast ? '' : undefined} role="status">
        {toast}
      </div>
    </>
  );
}

/** Accordion section in the extra modal; open by default, as the template's. */
function ExtraInfoSection({
  id,
  title,
  icon,
  children,
}: {
  /** Anchor for the modal's jump links. */
  id?: string;
  title: string;
  icon: 'chart' | 'leaf' | 'steam';
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.infoSection} id={id}>
      <button
        type="button"
        className={styles.infoSectionHead}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        {icon === 'chart' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 20h18" />
            <path d="M6 20v-6" />
            <path d="M12 20V5" />
            <path d="M18 20v-9" />
          </svg>
        ) : icon === 'leaf' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21V8" />
            <path d="M12 8c0-2.2-1.4-4-3.2-4C8.8 6.2 10.2 8 12 8z" />
            <path d="M12 8c0-2.2 1.4-4 3.2-4C15.2 6.2 13.8 8 12 8z" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 15c-1-1-1-2.4 0-3.4C9 10.6 9 9.2 8 8.2" />
            <path d="M12 15c-1-1-1-2.4 0-3.4 1-1 1-2.4 0-3.4" />
            <path d="M16 15c-1-1-1-2.4 0-3.4 1-1 1-2.4 0-3.4" />
          </svg>
        )}
        <span className={styles.infoSectionTitle}>{title}</span>
        <span className={styles.infoSectionChevron}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.filterChevron} data-open={open || undefined} aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open ? <div className={styles.infoSectionBody}>{children}</div> : null}
    </div>
  );
}

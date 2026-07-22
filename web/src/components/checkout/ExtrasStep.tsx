'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { personalisationSummary } from '@/components/checkout/DishPicker';
import { EXTRA_CATEGORIES, type BoxPricing, type Extra, type PersonalisationOptions } from '@/lib/aonik/types';
import {
  cartTotals,
  extraUnitPence,
  extrasTotals,
  useCart,
  type ExtraLine,
} from '@/lib/cart/CartProvider';
import { formatPrice, formatPriceExact } from '@/lib/format';

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
  personalisation: PersonalisationOptions;
  earliestDeliveryLabel: string;
  heading: ReactNode;
}

type ModalState = { id: string; quantity: number; optionKey: string | null };

const ALL = 'All';

export function ExtrasStep({
  extras,
  pricing,
  personalisation,
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
    setExtraQuantity,
    setExtraOption,
    removeExtra,
  } = useCart();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  /** Option picked on a card before the item is in the box, per extra id. */
  const [cardOption, setCardOption] = useState<Record<string, string>>({});
  /** Which card's option dropdown is open. */
  const [openOption, setOpenOption] = useState<string | null>(null);
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
    (extraId: string): ExtraLine | undefined =>
      extraLines.find((line) => line.extraId === extraId),
    [extraLines],
  );

  const boxTotals = useMemo(
    () => cartTotals({ boxSize, isCustom, lines }, pricing),
    [boxSize, isCustom, lines, pricing],
  );
  const extrasSum = useMemo(() => extrasTotals(extraLines, extras), [extraLines, extras]);
  const grandTotalPence = boxTotals.totalPence + extrasSum.totalPence;
  const totalLabel = formatPrice(grandTotalPence);

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

  const chosenKeyFor = (extra: Extra): string | null => {
    const line = lineFor(extra.id);
    return line?.optionKey ?? cardOption[extra.id] ?? null;
  };

  const addFromCard = (extra: Extra) => {
    const chosen = chosenKeyFor(extra);
    if (extra.option && !chosen) {
      setOpenOption(extra.id);
      flash(`Please choose a ${extra.option.kind.toLowerCase()} before adding ${extra.name}`);
      return;
    }
    addExtra(extra.id, chosen ?? undefined);
    flash(`${extra.name} added to your box`);
  };

  const pickCardOption = (extra: Extra, key: string) => {
    setCardOption((current) => ({ ...current, [extra.id]: key }));
    if (lineFor(extra.id)) setExtraOption(extra.id, key);
    setOpenOption(null);
  };

  const step = (extra: Extra, delta: number) => {
    const line = lineFor(extra.id);
    if (!line) {
      if (delta > 0) addFromCard(extra);
      return;
    }
    setExtraQuantity(extra.id, line.quantity + delta);
  };

  /* ---- Modal ---------------------------------------------------------------- */

  const openModal = (extra: Extra) => {
    const line = lineFor(extra.id);
    setModal({
      id: extra.id,
      quantity: line?.quantity ?? 1,
      optionKey: line?.optionKey ?? cardOption[extra.id] ?? null,
    });
  };

  const commitModal = () => {
    if (!modal) return;
    const extra = extraById.get(modal.id);
    if (!extra) return;
    const line = lineFor(extra.id);
    if (line) {
      setExtraQuantity(extra.id, modal.quantity);
      if (modal.optionKey) setExtraOption(extra.id, modal.optionKey);
      flash(`${extra.name} updated`);
    } else {
      addExtra(extra.id, modal.optionKey ?? undefined);
      if (modal.quantity > 1) setExtraQuantity(extra.id, modal.quantity);
      flash(`${extra.name} added to your box`);
    }
    setModal(null);
  };

  // One owner for Escape and the body scroll lock across the step's overlays.
  useEffect(() => {
    const anyOpen = modal !== null || sheetOpen;
    if (!anyOpen && openOption === null) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (modal) setModal(null);
      else if (sheetOpen) setSheetOpen(false);
      else setOpenOption(null);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    if (anyOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [modal, sheetOpen, openOption]);

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

  const modalExtra = modal ? extraById.get(modal.id) : undefined;
  const modalChosen = modalExtra?.option?.choices.find((c) => c.key === modal?.optionKey);
  const modalUnitPence = modalExtra
    ? modalExtra.pricePence + (modalChosen?.addPence ?? 0)
    : 0;
  const modalInBox = modal ? Boolean(lineFor(modal.id)) : false;
  const modalNeedsOption = Boolean(modalExtra?.option) && !modal?.optionKey;
  const modalCommitLabel = modalExtra
    ? modalNeedsOption
      ? `Select a ${modalExtra.option!.kind.toLowerCase()}`
      : `${modalInBox ? 'Update' : 'Add to box'} · ${formatPriceExact(
          modalUnitPence * (modal?.quantity ?? 1),
        )}`
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
        const extra = extraById.get(line.extraId);
        if (!extra) return null;
        const chosen = extra.option?.choices.find((c) => c.key === line.optionKey);
        return (
          <div key={line.extraId} className={styles.boxRow}>
            <button
              type="button"
              className={styles.rowThumb}
              onClick={() => openModal(extra)}
              aria-label={`View ${extra.name}`}
            >
              <Image src={extra.imageUrl} alt="" width={52} height={52} />
            </button>
            <div className={styles.rowBody}>
              <div className={styles.rowTop}>
                <button
                  type="button"
                  className={styles.rowName}
                  onClick={() => openModal(extra)}
                >
                  {extra.name}
                </button>
                <span className={styles.rowPrice}>
                  {formatPriceExact(extraUnitPence(line, extra) * line.quantity)}
                </span>
              </div>
              {extra.option && chosen ? (
                <div className={styles.rowOpt}>
                  {extra.option.kind}: {chosen.label}
                </div>
              ) : null}
              <div className={styles.rowControls}>
                <span className={styles.stepGroup}>
                  <button
                    type="button"
                    className={styles.cstep}
                    onClick={() => setExtraQuantity(extra.id, line.quantity - 1)}
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
                    onClick={() => setExtraQuantity(extra.id, line.quantity + 1)}
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
                  onClick={() => {
                    removeExtra(extra.id);
                    flash(`${extra.name} removed`);
                  }}
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

  const estRows = (
    <>
      <div className={styles.estRow}>
        <span>{boxLabel}</span>
        <span className={styles.estStrong}>{formatPrice(boxTotals.totalPence)}</span>
      </div>
      {extrasSum.quantity > 0 ? (
        <div className={styles.estRow}>
          <span>
            {extrasSum.quantity} {extrasSum.quantity === 1 ? 'extra' : 'extras'}
          </span>
          <span className={styles.estStrong}>+{formatPriceExact(extrasSum.totalPence)}</span>
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
      <p className={styles.deliveryNote}>
        Earliest UK-wide delivery: <strong>{earliestDeliveryLabel}</strong>
      </p>
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
              const chosenKey = chosenKeyFor(extra);
              const chosen = extra.option?.choices.find((c) => c.key === chosenKey);
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
                      {extra.option ? (
                        <div className={styles.optDrop}>
                          <button
                            type="button"
                            className={styles.optTrigger}
                            onClick={() =>
                              setOpenOption((open) => (open === extra.id ? null : extra.id))
                            }
                            aria-haspopup="listbox"
                            aria-expanded={openOption === extra.id}
                          >
                            <span data-chosen={chosen ? '' : undefined}>
                              {chosen ? `${extra.option.kind}: ${chosen.label}` : extra.option.kind}
                            </span>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.filterChevron} data-open={openOption === extra.id || undefined} aria-hidden="true">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                          {openOption === extra.id ? (
                            <div className={styles.optMenu} role="listbox">
                              {extra.option.choices.map((choice) => (
                                <button
                                  key={choice.key}
                                  type="button"
                                  role="option"
                                  aria-selected={choice.key === chosenKey}
                                  data-selected={choice.key === chosenKey || undefined}
                                  className={styles.optRow}
                                  onClick={() => pickCardOption(extra, choice.key)}
                                >
                                  <span>{choice.label}</span>
                                  <span className={styles.optRowEnd}>
                                    {choice.addPence > 0 ? (
                                      <span className={styles.optAdd}>
                                        +{formatPriceExact(choice.addPence)}
                                      </span>
                                    ) : null}
                                    {choice.key === chosenKey ? (
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M5 12.5l4.5 4.5L19 7" />
                                      </svg>
                                    ) : null}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : null}
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
                              onClick={() => step(extra, -1)}
                              aria-label="Remove one"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                                <path d="M5 12h14" />
                              </svg>
                            </button>
                            <span className={styles.cardStepQty}>{line.quantity}</span>
                            <button
                              type="button"
                              onClick={() => step(extra, 1)}
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
                            onClick={() => addFromCard(extra)}
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
                                ? personalisationSummary(line.personalisation, personalisation)
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
                                ? personalisationSummary(line.personalisation, personalisation)
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

              {modalExtra.option ? (
                <div className={styles.modalOpt}>
                  <label className={styles.modalOptLabel} htmlFor="extra-option">
                    {modalExtra.option.kind}
                  </label>
                  <div className={styles.modalSelectWrap}>
                    <select
                      id="extra-option"
                      value={modal.optionKey ?? ''}
                      onChange={(event) =>
                        setModal((current) =>
                          current ? { ...current, optionKey: event.target.value || null } : current,
                        )
                      }
                    >
                      <option value="" disabled>
                        Choose a {modalExtra.option.kind.toLowerCase()}
                      </option>
                      {modalExtra.option.choices.map((choice) => (
                        <option key={choice.key} value={choice.key}>
                          {choice.label}
                          {choice.addPence > 0 ? ` (+${formatPriceExact(choice.addPence)})` : ''}
                        </option>
                      ))}
                    </select>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
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
                <p className={styles.ingredients}>{modalExtra.ingredients}</p>
                <div className={styles.allergenCard}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10.3 4.3 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  <span>
                    <strong>Allergens:</strong>{' '}
                    {modalExtra.allergens.length > 0 ? modalExtra.allergens.join(', ') : 'None'}
                  </span>
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
                  {formatPriceExact(modalUnitPence * modal.quantity)}
                </span>
              </div>
              <button
                type="button"
                className={styles.modalCommit}
                onClick={commitModal}
                disabled={modalNeedsOption}
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

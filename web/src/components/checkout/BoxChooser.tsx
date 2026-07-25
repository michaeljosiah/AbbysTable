'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

import {
  HEAT_LABELS,
  HEAT_STEPS,
  type BoxOffer,
  type BoxPricing,
  type HeatLevel,
} from '@/lib/aonik/types';
import {
  boxPricePence,
  cartTotals,
  customBoxPricePence,
  useCart,
  type CartLine,
} from '@/lib/cart/CartProvider';
import { formatPrice } from '@/lib/format';

import styles from './BoxChooser.module.css';

/**
 * Step 1: choose a set box or build your own.
 *
 * Every figure shown here is derived from `BoxPricing` — preset prices and
 * savings come off the offer, build-your-own comes off the per-dish scale — so
 * nothing has to be edited when Aonik changes the catalogue.
 *
 * The size is only written to the cart when the customer continues, so backing
 * out of this step leaves an earlier choice intact.
 */
interface BoxChooserProps {
  pricing: BoxPricing;
  /**
   * Pre-formatted delivery date, e.g. "6 August", or null when the tenant
   * publishes no promise — in which case the line is not rendered at all. A
   * wrong date is worse than no date, so nothing is invented here.
   */
  earliestDeliveryLabel: string | null;
  /** Step eyebrow, title and intro, rendered by the page. */
  heading: ReactNode;
}

/** Which card is lit. A custom box takes its size from the stepper. */
type Selection = { source: 'preset'; size: number } | { source: 'custom' };

function presetFor(pricing: BoxPricing, size: number): BoxOffer | undefined {
  return pricing.presets.find((offer) => offer.dishCount === size);
}

/**
 * What a box of `size` dishes costs, what it would have cost at list price, and
 * the difference. A custom count that happens to land on a preset is priced as
 * that preset — nobody should pay the per-dish rate for a box we already sell.
 */
function offerFor(pricing: BoxPricing, size: number) {
  const preset = presetFor(pricing, size);

  if (preset) {
    const savingPence = preset.savingPence ?? 0;
    return {
      pricePence: preset.pricePence,
      // Only a preset with an AUTHORED saving has a list price. Without one,
      // `pricePence + 0` would strike through the very number being charged.
      listPence: savingPence > 0 ? preset.pricePence + savingPence : undefined,
      savingPence,
    };
  }

  /*
   * A custom size has no list price to strike through. Aonik's box plan carries
   * an authored `savingAmount` on PRESETS only — there is no `listPrice`,
   * `wasPrice` or plan-level saving anywhere — and a saving this storefront
   * computed itself would be a number nobody authored. So a non-preset size
   * shows its price alone. See SPEC-2026-07-22-catalog-browse FR-6.
   */
  return { pricePence: customBoxPricePence(pricing, size), listPence: undefined, savingPence: 0 };
}

const HEAT_LEVELS = Object.keys(HEAT_STEPS) as HeatLevel[];

/**
 * "Full Table · Beef · Rice · Medium".
 *
 * The stored values are display labels: the dish page resolves its options
 * before writing the line, so this page never needs the options catalogue.
 */
function personalisationSummary(line: CartLine): string | null {
  const chosen = line.personalisation;
  if (!chosen) return null;

  const heat = HEAT_LEVELS.find((level) => HEAT_STEPS[level] === chosen.heatStep);
  const summary = [chosen.portion, chosen.protein, chosen.side, heat ? HEAT_LABELS[heat] : null]
    .filter(Boolean)
    .join(' · ');

  return summary.length > 0 ? summary : null;
}

export function BoxChooser({ pricing, earliestDeliveryLabel, heading }: BoxChooserProps) {
  const {
    boxSize,
    isCustom: cartIsCustom,
    lines,
    hydrated,
    addLine,
    removeLine,
    setQuantity,
    setBoxSize,
  } = useCart();
  const { minDishes, maxDishes } = pricing.custom;
  const summaryTitleId = useId();
  const sheetTitleId = useId();

  // The template preselects the entry box rather than starting empty.
  const [selection, setSelection] = useState<Selection>({
    source: 'preset',
    size: pricing.presets[0]?.dishCount ?? minDishes,
  });
  const [customQty, setCustomQty] = useState(minDishes);

  const [estOpen, setEstOpen] = useState(true);
  const [tipOpen, setTipOpen] = useState(false);
  const [sheetTipOpen, setSheetTipOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  /** Last line taken out, so "Add back" can restore it. */
  const [removed, setRemoved] = useState<CartLine | null>(null);

  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showMore, setShowMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Adopt a size chosen on an earlier visit, once storage has been read.
  useEffect(() => {
    if (!hydrated || boxSize === null) return;
    setSelection(cartIsCustom ? { source: 'custom' } : { source: 'preset', size: boxSize });
    if (cartIsCustom) setCustomQty(boxSize);
  }, [hydrated, boxSize, cartIsCustom]);

  const customSelected = selection.source === 'custom';
  const size = selection.source === 'custom' ? customQty : selection.size;
  const isCustom = presetFor(pricing, size) === undefined;

  const totals = cartTotals({ boxSize: size, isCustom, lines }, pricing);
  const offer = offerFor(pricing, size);
  const customOffer = offerFor(pricing, customQty);

  // Before hydration the cart is always empty, so gate on it rather than render
  // a banner on the server that the client would immediately drop.
  const carried = hydrated ? (lines[0] ?? null) : null;
  const carriedNote = carried ? personalisationSummary(carried) : null;

  const filled = Math.min(totals.dishCount, size);
  const remaining = size - filled;
  const boxLabel = `${size}-dish box`;
  const totalLabel = formatPrice(totals.totalPence);

  const selectCustom = () => setSelection({ source: 'custom' });

  const selectPreset = (preset: BoxOffer) => () =>
    setSelection({ source: 'preset', size: preset.dishCount });

  const stepCustom = (delta: number) => (event: MouseEvent<HTMLButtonElement>) => {
    // The stepper sits inside a card that is itself a button.
    event.stopPropagation();
    const next = Math.min(maxDishes, Math.max(minDishes, customQty + delta));
    setCustomQty(next);
    // The template's stepper re-selects the matching preset card when the
    // count lands on one, so 6/12/18 always light their own tier.
    setSelection(
      presetFor(pricing, next) ? { source: 'preset', size: next } : { source: 'custom' },
    );
  };

  const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, select: () => void) => {
    // Ignore keys that belong to the stepper buttons inside the card.
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    event.preventDefault();
    select();
  };

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4200);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const removeCarried = (line: CartLine) => {
    setRemoved(line);
    removeLine(line.lineId);
    flash(`${line.title} removed`);
  };

  const restoreCarried = useCallback(() => {
    if (!removed) return;
    addLine({ ...removed, quantity: 1 });
    setRemoved(null);
    setToast('');
  }, [removed, addLine]);

  const stepLine = (line: CartLine, delta: number) =>
    setQuantity(line.lineId, Math.min(maxDishes, Math.max(1, line.quantity + delta)));

  const commit = () => setBoxSize(size, isCustom);

  // "Scroll for more": visible while the summary body overflows and hasn't
  // been scrolled yet — the template hides it as soon as scrolling starts.
  const updateShowMore = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowMore(el.scrollHeight - el.clientHeight > 8 && el.scrollTop <= 4);
  }, []);

  useEffect(() => {
    updateShowMore();
    window.addEventListener('resize', updateShowMore);
    return () => window.removeEventListener('resize', updateShowMore);
  }, [updateShowMore, estOpen, tipOpen, carried, removed, size]);

  const scrollForMore = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: Math.round(el.clientHeight * 0.8), behavior: 'smooth' });
  };

  // One owner for the sheet's Escape key and the body scroll lock, so closing
  // always unwinds cleanly.
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

  /** Itemised rows shared by the desktop panel and the sheet. */
  const breakdownRows = (
    <>
      <div className={styles.estRow}>
        <span>{boxLabel}</span>
        <span className={styles.estStrong}>
          {formatPrice(offer.listPence ?? offer.pricePence)}
        </span>
      </div>

      {offer.savingPence > 0 ? (
        <div className={styles.estRow} data-tone="saving">
          <span>Box discount</span>
          <span>−{formatPrice(offer.savingPence)}</span>
        </div>
      ) : null}

      {totals.surchargePence > 0 ? (
        <div className={styles.estRow}>
          <span>Personalisation</span>
          <span className={styles.estAccent}>+{formatPrice(totals.surchargePence)}</span>
        </div>
      ) : null}

      {totals.extraDishes > 0 ? (
        <div className={styles.estRow}>
          <span>Extra dishes</span>
          <span className={styles.estAccent}>+{formatPrice(totals.extraPence)}</span>
        </div>
      ) : null}

      {pricing.delivery ? (
        <div className={styles.estRow}>
          <span>Delivery</span>
          <span className={styles.estDelivery}>
            <span className={styles.estWas}>{formatPrice(pricing.delivery.listPence)}</span>
            <span className={styles.estNow}>
              {pricing.delivery.pricePence === 0 ? 'Free' : formatPrice(pricing.delivery.pricePence)}
            </span>
          </span>
        </div>
      ) : null}
    </>
  );

  /** The carried line's remove-then-restore card. */
  const removedCard =
    !carried && removed ? (
      <div className={styles.removedCard}>
        <div className={styles.removedText}>
          <div className={styles.removedTitle}>{removed.title} removed</div>
          <div className={styles.removedBody}>
            Your box is empty — add dishes next, or put it back.
          </div>
        </div>
        <button type="button" className={styles.textLink} onClick={restoreCarried}>
          Add back
        </button>
      </div>
    ) : null;

  return (
    <>
      <div className={styles.shell}>
        <div className={styles.mainColumn}>
          {heading}

          {carried ? (
            <>
              {/* Compact banner, ≤860px. */}
              <div className={styles.carry}>
                <Image
                  src={carried.imageUrl}
                  alt={carried.title}
                  width={44}
                  height={44}
                  className={styles.carryImage}
                />
                <div className={styles.carryMain}>
                  <div className={styles.carryTitle}>
                    <span className={styles.carryTick} aria-hidden="true">
                      <CheckIcon size={11} strokeWidth={3} />
                    </span>
                    <span>
                      <strong>{carried.title}</strong> will be added to your box
                    </span>
                  </div>
                  {carriedNote ? (
                    <div className={styles.carryNote}>
                      <SlidersIcon size={15} />
                      <span>{carriedNote}</span>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`${styles.lineRemove} ${styles.carryRemove}`}
                  onClick={() => removeCarried(carried)}
                  aria-label={`Remove ${carried.title}`}
                >
                  <TrashIcon size={14} />
                  Remove
                </button>
              </div>

              {/* Full banner, desktop. */}
              <div className={styles.banner}>
                <div className={styles.bannerTop}>
                  <Image
                    src={carried.imageUrl}
                    alt={carried.title}
                    width={108}
                    height={92}
                    className={styles.bannerImage}
                  />
                  <div className={styles.bannerMain}>
                    <span className={styles.bannerTick} aria-hidden="true">
                      <CheckIcon size={17} strokeWidth={2.4} />
                    </span>
                    <div className={styles.bannerText}>
                      <h2 className={styles.bannerTitle}>
                        {carried.title} will be added to your box
                      </h2>
                      <p className={styles.bannerBody}>
                        Choose your box size first. You won&apos;t need to add this dish again.
                      </p>
                      {carriedNote ? (
                        <div className={styles.bannerNote}>
                          <SlidersIcon size={17} />
                          <span>Personalised on the dish page — {carriedNote}.</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {/* Desktop / tablet cards. */}
          <div className={styles.grid}>
            {pricing.presets.map((preset, index) => {
              const selected = selection.source === 'preset' && selection.size === preset.dishCount;
              const savingPence = preset.savingPence ?? 0;
              const isTop = index === pricing.presets.length - 1;

              return (
                <div
                  key={preset.id}
                  className={styles.card}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  data-selected={selected || undefined}
                  onClick={selectPreset(preset)}
                  onKeyDown={(event) => onCardKeyDown(event, selectPreset(preset))}
                >
                  <span className={styles.tick} aria-hidden="true">
                    <CheckIcon size={15} strokeWidth={2.6} />
                  </span>

                  {preset.badge ? (
                    <span className={styles.badge} data-emphasis={isTop ? 'strong' : 'soft'}>
                      {preset.badge}
                    </span>
                  ) : null}

                  <span className={styles.cardIcon} aria-hidden="true">
                    {isTop ? <StackGlyph size={54} /> : <BoxGlyph size={52} />}
                  </span>

                  <span className={styles.cardTitle}>{preset.dishCount} dishes</span>

                  <span className={styles.priceRow}>
                    {savingPence > 0 ? (
                      <span className={styles.listPrice}>
                        {formatPrice(preset.pricePence + savingPence)}
                      </span>
                    ) : null}
                    <span className={styles.price}>{formatPrice(preset.pricePence)}</span>
                  </span>

                  {savingPence > 0 ? (
                    <span className={styles.saving}>Save {formatPrice(savingPence)}</span>
                  ) : null}

                  <span
                    className={styles.cardRule}
                    data-solo={savingPence > 0 ? undefined : ''}
                    aria-hidden="true"
                  />

                  {preset.blurb ? <span className={styles.cardBlurb}>{preset.blurb}</span> : null}
                </div>
              );
            })}

            <div
              className={styles.card}
              role="button"
              tabIndex={0}
              aria-pressed={customSelected}
              data-selected={customSelected || undefined}
              onClick={selectCustom}
              onKeyDown={(event) => onCardKeyDown(event, selectCustom)}
            >
              <span className={styles.tick} aria-hidden="true">
                <CheckIcon size={15} strokeWidth={2.6} />
              </span>

              <span className={styles.cardIcon} aria-hidden="true">
                <BuildGlyph size={52} />
              </span>

              <span className={styles.cardTitle}>Build your own</span>

              {customSelected ? (
                <>
                  <span className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.stepButton}
                      onClick={stepCustom(-1)}
                      disabled={customQty <= minDishes}
                      aria-label="Fewer dishes"
                    >
                      −
                    </button>
                    <span className={styles.stepValue} aria-live="polite">
                      {customQty}
                    </span>
                    <button
                      type="button"
                      className={styles.stepButton}
                      onClick={stepCustom(1)}
                      disabled={customQty >= maxDishes}
                      aria-label="More dishes"
                    >
                      +
                    </button>
                  </span>

                  <span className={styles.priceRow} data-variant="open">
                    {customOffer.listPence !== undefined ? (
                      <span className={styles.listPrice}>
                        {formatPrice(customOffer.listPence)}
                      </span>
                    ) : null}
                    <span className={styles.price}>{formatPrice(customOffer.pricePence)}</span>
                  </span>

                  {customOffer.savingPence > 0 ? (
                    <span className={styles.saving} data-variant="open">
                      Save {formatPrice(customOffer.savingPence)}
                    </span>
                  ) : null}

                  <span className={styles.cardBlurb} data-variant="open">
                    Savings update as you add
                  </span>
                </>
              ) : (
                <>
                  <span className={styles.priceRow}>
                    <span className={styles.price}>
                      From {formatPrice(boxPricePence(minDishes, true, pricing))}
                    </span>
                  </span>

                  {/* Invisible "Save" line so all four cards align. */}
                  <span className={styles.savingGhost} aria-hidden="true">
                    &nbsp;
                  </span>

                  <span className={styles.cardRule} aria-hidden="true" />

                  <span className={styles.cardBlurb}>Savings update as you add dishes</span>
                </>
              )}
            </div>
          </div>

          {/* Compact rows, ≤860px. */}
          <div className={styles.boxlist}>
            {pricing.presets.map((preset, index) => {
              const selected = selection.source === 'preset' && selection.size === preset.dishCount;
              const savingPence = preset.savingPence ?? 0;
              const isTop = index === pricing.presets.length - 1;

              return (
                <div
                  key={preset.id}
                  className={styles.row}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  data-selected={selected || undefined}
                  onClick={selectPreset(preset)}
                  onKeyDown={(event) => onCardKeyDown(event, selectPreset(preset))}
                >
                  <span className={styles.rowIcon} aria-hidden="true">
                    {isTop ? <StackGlyph size={30} /> : <BoxGlyph size={30} />}
                  </span>

                  <span className={styles.rowMain}>
                    <span className={styles.rowTitleLine}>
                      <span className={styles.rowTitle}>{preset.dishCount} dishes</span>
                      {preset.badge ? (
                        <span
                          className={styles.rowBadge}
                          data-emphasis={isTop ? 'strong' : 'soft'}
                        >
                          {preset.badge}
                        </span>
                      ) : null}
                    </span>
                    {preset.blurb ? <span className={styles.rowBlurb}>{preset.blurb}</span> : null}
                  </span>

                  <span className={styles.rowEnd}>
                    <span className={styles.rowPriceCol}>
                      {savingPence > 0 ? (
                        <>
                          <span className={styles.rowPriceLine}>
                            <span className={styles.rowWas}>
                              {formatPrice(preset.pricePence + savingPence)}
                            </span>
                            <span className={styles.rowPrice}>
                              {formatPrice(preset.pricePence)}
                            </span>
                          </span>
                          <span className={styles.rowSave}>Save {formatPrice(savingPence)}</span>
                        </>
                      ) : (
                        <>
                          <span className={styles.rowPrice}>{formatPrice(preset.pricePence)}</span>
                          <span className={styles.rowFull}>Full price</span>
                        </>
                      )}
                    </span>
                    <span className={styles.radio} aria-hidden="true">
                      <span className={styles.radioRing} />
                      <span className={styles.radioFill}>
                        <CheckIcon size={13} strokeWidth={2.8} />
                      </span>
                    </span>
                  </span>
                </div>
              );
            })}

            <div
              className={styles.rowWrap}
              data-selected={customSelected || undefined}
            >
              <div
                className={styles.row}
                data-bare=""
                role="button"
                tabIndex={0}
                aria-pressed={customSelected}
                onClick={selectCustom}
                onKeyDown={(event) => onCardKeyDown(event, selectCustom)}
              >
                <span className={styles.rowIcon} aria-hidden="true">
                  <BuildGlyph size={30} />
                </span>

                <span className={styles.rowMain}>
                  <span className={styles.rowTitle}>Build your own</span>
                  <span className={styles.rowBlurb}>Savings update as you add dishes</span>
                </span>

                <span className={styles.rowEnd}>
                  <span className={styles.rowFrom}>
                    From {formatPrice(boxPricePence(minDishes, true, pricing))}
                  </span>
                  <span className={styles.radio} aria-hidden="true">
                    <span className={styles.radioRing} />
                    <span className={styles.radioFill}>
                      <CheckIcon size={13} strokeWidth={2.8} />
                    </span>
                  </span>
                </span>
              </div>

              {customSelected ? (
                <div className={styles.rowStepper}>
                  <span className={styles.rowStepGroup}>
                    <button
                      type="button"
                      className={styles.stepButton}
                      data-size="sm"
                      onClick={stepCustom(-1)}
                      disabled={customQty <= minDishes}
                      aria-label="Fewer dishes"
                    >
                      −
                    </button>
                    <span className={styles.rowStepValue} aria-live="polite">
                      {customQty}
                    </span>
                    <button
                      type="button"
                      className={styles.stepButton}
                      data-size="sm"
                      onClick={stepCustom(1)}
                      disabled={customQty >= maxDishes}
                      aria-label="More dishes"
                    >
                      +
                    </button>
                  </span>
                  <span className={styles.rowPriceCol}>
                    <span className={styles.rowPriceLine}>
                      {customOffer.listPence !== undefined ? (
                        <span className={styles.rowWas}>
                          {formatPrice(customOffer.listPence)}
                        </span>
                      ) : null}
                      <span className={styles.rowPrice}>
                        {formatPrice(customOffer.pricePence)}
                      </span>
                    </span>
                    {customOffer.savingPence > 0 ? (
                      <span className={styles.rowSave}>
                        Save {formatPrice(customOffer.savingPence)}
                      </span>
                    ) : null}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Desktop summary. */}
        <aside className={styles.summaryColumn} aria-labelledby={summaryTitleId}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHead}>
              <CubeIcon size={24} />
              <h2 id={summaryTitleId} className={styles.summaryTitle}>
                Your box
              </h2>
            </div>

            <div className={styles.summaryViewport}>
              <div className={styles.summaryScroll} ref={scrollRef} onScroll={updateShowMore}>
                <p className={styles.boxLabel}>{boxLabel}</p>
                <p className={styles.filledLabel}>
                  {filled} of {size} dishes selected
                </p>
                <span className={styles.progress} aria-hidden="true">
                  <span
                    className={styles.progressFill}
                    style={{ width: `${((filled / size) * 100).toFixed(1)}%` }}
                  />
                </span>
                <p className={styles.remaining}>
                  {remaining} {remaining === 1 ? 'space' : 'spaces'} left to fill
                </p>

                <span className={styles.rule} aria-hidden="true" />

                {carried ? (
                  <>
                    <div className={styles.line}>
                      <Image
                        src={carried.imageUrl}
                        alt=""
                        width={58}
                        height={58}
                        className={styles.lineThumb}
                      />
                      <div className={styles.lineText}>
                        <div className={styles.lineTop}>
                          <span className={styles.lineTitle}>{carried.title}</span>
                          {carried.surchargePence > 0 ? (
                            <span className={styles.linePrice}>
                              +{formatPrice(carried.surchargePence * carried.quantity)}
                            </span>
                          ) : null}
                        </div>
                        {carriedNote ? (
                          <div className={styles.lineNote}>
                            <SlidersIcon size={15} />
                            <span>{carriedNote}</span>
                          </div>
                        ) : null}
                        <div className={styles.lineControls}>
                          <span className={styles.lineStepGroup}>
                            <button
                              type="button"
                              className={styles.stepButton}
                              data-size="xs"
                              onClick={() => stepLine(carried, -1)}
                              disabled={carried.quantity <= 1}
                              aria-label="Fewer"
                            >
                              −
                            </button>
                            <span className={styles.lineQty} aria-live="polite">
                              {carried.quantity}
                            </span>
                            <button
                              type="button"
                              className={styles.stepButton}
                              data-size="xs"
                              onClick={() => stepLine(carried, 1)}
                              disabled={carried.quantity >= maxDishes}
                              aria-label="More"
                            >
                              +
                            </button>
                          </span>
                          <button
                            type="button"
                            className={styles.lineRemove}
                            onClick={() => removeCarried(carried)}
                          >
                            <TrashIcon size={13} />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                    <span className={styles.rule} aria-hidden="true" />
                  </>
                ) : removedCard ? (
                  <>
                    {removedCard}
                    <span className={styles.rule} aria-hidden="true" />
                  </>
                ) : null}

                <div className={styles.nextUp}>
                  <BookIcon size={22} />
                  <div>
                    <p className={styles.nextUpTitle}>Next up</p>
                    <p className={styles.nextUpBody}>
                      Choose your remaining dishes from the menu and personalise to your table as
                      required.
                    </p>
                  </div>
                </div>

                <span className={styles.rule} data-variant="tight" aria-hidden="true" />

                <div className={styles.estHead}>
                  <span className={styles.estHeadLeft}>
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
                    <ChevronIcon size={18} className={styles.estChevron} data-open={estOpen} />
                  </button>
                </div>

                {tipOpen ? (
                  <div className={styles.infoCard}>
                    Price changes may apply based on your personalisation.
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

                {estOpen ? (
                  <div className={styles.estPanel}>
                    {breakdownRows}
                    <span className={styles.rule} data-variant="total" aria-hidden="true" />
                    <div className={styles.totalRow}>
                      <span className={styles.totalLabel}>Total</span>
                      <span className={styles.totalValue}>{totalLabel}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className={styles.scrollMore}
                data-shown={showMore || undefined}
                onClick={scrollForMore}
                aria-label="Scroll for more"
                tabIndex={showMore ? 0 : -1}
              >
                Scroll for more
                <ChevronIcon size={16} />
              </button>
            </div>

            <div className={styles.summaryFoot}>
              <ContinueCta onCommit={commit} className={styles.cta}>
                <span className={styles.ctaMain}>
                  Continue to dishes
                  <ArrowIcon size={20} />
                </span>
                <span className={styles.ctaSub}>
                  <ShieldIcon />
                  Secure checkout
                </span>
              </ContinueCta>

              {earliestDeliveryLabel ? (
                <p className={styles.deliveryNote}>
                  Earliest UK-wide delivery: <strong>{earliestDeliveryLabel}</strong>
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky action bar, ≤860px. */}
      <div className={styles.mobileBar}>
        <button
          type="button"
          className={styles.barSummary}
          onClick={() => setSheetOpen(true)}
          aria-label="View your box"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <span className={styles.barIcon} aria-hidden="true">
            <CubeIcon size={22} />
          </span>
          <span className={styles.barText}>
            <span className={styles.barLabel}>{boxLabel}</span>
            <span className={styles.barTotalLine}>
              <span className={styles.barTotal}>{totalLabel}</span>
              <ChevronUpIcon size={15} />
            </span>
          </span>
        </button>

        <ContinueCta onCommit={commit} className={styles.mobileCta}>
          Continue
          <ArrowIcon size={18} />
        </ContinueCta>
      </div>

      {/* "Your box" bottom sheet, opened from the bar. */}
      {sheetOpen ? (
        <>
          <div className={styles.sheetOverlay} onClick={() => setSheetOpen(false)} />
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby={sheetTitleId}
          >
            <div className={styles.sheetTop}>
              <div className={styles.sheetHandle} aria-hidden="true" />
              <div className={styles.sheetHeadRow}>
                <span className={styles.sheetHead}>
                  <CubeIcon size={22} />
                  <span id={sheetTitleId} className={styles.sheetTitle}>
                    Your box
                  </span>
                </span>
                <button
                  type="button"
                  className={styles.sheetClose}
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close"
                >
                  <ChevronIcon size={18} />
                </button>
              </div>
            </div>

            <div className={styles.sheetProgress}>
              <div className={styles.sheetBoxLabel}>{boxLabel}</div>
              <div className={styles.sheetCount}>
                {filled} of {size} dishes selected
              </div>
              <span className={styles.progress} aria-hidden="true">
                <span
                  className={styles.progressFill}
                  style={{ width: `${((filled / size) * 100).toFixed(1)}%` }}
                />
              </span>
              <p className={styles.remaining}>
                {remaining} {remaining === 1 ? 'space' : 'spaces'} left to fill
              </p>
            </div>

            <div className={styles.sheetScroll}>
              {carried ? (
                <div className={styles.line} data-context="sheet">
                  <Image
                    src={carried.imageUrl}
                    alt=""
                    width={58}
                    height={58}
                    className={styles.lineThumb}
                  />
                  <div className={styles.lineText}>
                    <div className={styles.lineTop}>
                      <span className={styles.lineTitle}>{carried.title}</span>
                      {carried.surchargePence > 0 ? (
                        <span className={styles.linePrice}>
                          +{formatPrice(carried.surchargePence * carried.quantity)}
                        </span>
                      ) : null}
                    </div>
                    {carriedNote ? (
                      <div className={styles.lineNote}>
                        <SlidersIcon size={15} />
                        <span>{carriedNote}</span>
                      </div>
                    ) : null}
                    <div className={styles.lineControls}>
                      <span className={styles.lineStepGroup}>
                        <button
                          type="button"
                          className={styles.stepButton}
                          data-size="sheet"
                          onClick={() => stepLine(carried, -1)}
                          disabled={carried.quantity <= 1}
                          aria-label="Fewer"
                        >
                          −
                        </button>
                        <span className={styles.lineQty} data-context="sheet" aria-live="polite">
                          {carried.quantity}
                        </span>
                        <button
                          type="button"
                          className={styles.stepButton}
                          data-size="sheet"
                          onClick={() => stepLine(carried, 1)}
                          disabled={carried.quantity >= maxDishes}
                          aria-label="More"
                        >
                          +
                        </button>
                      </span>
                      <button
                        type="button"
                        className={styles.lineRemove}
                        data-context="sheet"
                        onClick={() => removeCarried(carried)}
                      >
                        <TrashIcon size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                removedCard
              )}

              <div className={styles.nextUp} data-context="sheet">
                <BookIcon size={22} />
                <div>
                  <p className={styles.nextUpTitle}>Next up</p>
                  <p className={styles.nextUpBody}>
                    Choose your remaining dishes from the menu and personalise to your table as
                    required.
                  </p>
                </div>
              </div>

              <span className={styles.rule} data-variant="sheet" aria-hidden="true" />

              {breakdownRows}
            </div>

            <div className={styles.sheetFoot}>
              <div className={styles.sheetTotalRow}>
                <span className={styles.sheetTotalLeft}>
                  <span className={styles.sheetTotalLabel}>Estimated total</span>
                  <button
                    type="button"
                    className={styles.infoButton}
                    onClick={() => setSheetTipOpen((open) => !open)}
                    aria-expanded={sheetTipOpen}
                    aria-label="About pricing"
                  >
                    i
                  </button>
                </span>
                <span className={styles.sheetTotalValue}>{totalLabel}</span>
              </div>

              {sheetTipOpen ? (
                <div className={styles.infoCard} data-context="sheet">
                  Price changes may apply based on your personalisation.
                  <button
                    type="button"
                    className={styles.infoClose}
                    onClick={() => setSheetTipOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              ) : null}

              <ContinueCta onCommit={commit} className={styles.cta} data-context="sheet">
                <span className={styles.ctaMain} data-context="sheet">
                  Continue to dishes
                  <ArrowIcon size={18} />
                </span>
                <span className={styles.ctaSub}>
                  <ShieldIcon />
                  Secure checkout
                </span>
              </ContinueCta>

              {earliestDeliveryLabel ? (
                <p className={styles.deliveryNote} data-context="sheet">
                  Earliest UK-wide delivery: <strong>{earliestDeliveryLabel}</strong>
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {/* Toast with undo, mirroring the template's remove flow. */}
      <div className={styles.toast} data-shown={toast ? '' : undefined} role="status">
        <span>{toast}</span>
        {removed ? (
          <button type="button" className={styles.toastUndo} onClick={restoreCarried}>
            Undo
          </button>
        ) : null}
      </div>
    </>
  );
}

/**
 * The continue control: a link that records the chosen size as it navigates.
 * A box size is always selected (the template preselects the entry box), so
 * this never needs a disabled state.
 */
function ContinueCta({
  onCommit,
  className,
  children,
  ...rest
}: {
  onCommit: () => void;
  className: string;
  children: ReactNode;
} & Record<`data-${string}`, string | undefined>) {
  return (
    <Link href="/box/dishes" className={className} onClick={onCommit} {...rest}>
      {children}
    </Link>
  );
}

/* ---- Glyphs -------------------------------------------------------------------
   Stroked with `currentColor` so every colour decision stays in the stylesheet. */

function CheckIcon({ size, strokeWidth = 2.6 }: { size: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function BoxGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 17h24l-2.4 18.4a1.6 1.6 0 0 1-1.6 1.4H14a1.6 1.6 0 0 1-1.6-1.4L10 17z" />
      <rect x="7.5" y="10.5" width="29" height="6.5" rx="2.2" />
      <line x1="22" y1="10.5" x2="22" y2="17" />
    </svg>
  );
}

function StackGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="15" y="4.5" width="14" height="4.6" rx="1.6" />
      <path d="M16 9.1h12l-1 5.4H17z" />
      <rect x="4" y="15" width="16" height="4.4" rx="1.6" />
      <path d="M5 19.4h14l-1.4 15.1a1.3 1.3 0 0 1-1.3 1.2H7.7a1.3 1.3 0 0 1-1.3-1.2L5 19.4z" />
      <rect x="24" y="15" width="16" height="4.4" rx="1.6" />
      <path d="M25 19.4h14l-1.4 15.1a1.3 1.3 0 0 1-1.3 1.2H27.7a1.3 1.3 0 0 1-1.3-1.2L25 19.4z" />
    </svg>
  );
}

function BuildGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 17h19l-1.6 12.8a1.5 1.5 0 0 1-1.5 1.3H12.1a1.5 1.5 0 0 1-1.5-1.3L9 17z" />
      <rect x="6.5" y="10.5" width="24" height="6.5" rx="2.2" />
      <path d="M27 27.5l7.6-7.6a2.1 2.1 0 0 1 3 3L30 30.5l-4.2 1.2 1.2-4.2z" />
    </svg>
  );
}

/** Knobs are filled with the card ground so the rails don't run through them. */
function SlidersIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="8" x2="20" y2="8" />
      <circle cx="10" cy="8" r="2.4" fill="var(--surface-bright)" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="15" cy="16" r="2.4" fill="var(--surface-bright)" />
    </svg>
  );
}

function TrashIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6 7l1 12h10l1-12" />
    </svg>
  );
}

function CubeIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8l9-4 9 4-9 4-9-4z" />
      <path d="M3 8v8l9 4 9-4V8" />
      <path d="M12 12v8" />
    </svg>
  );
}

function BookIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 6.4C10.4 5.3 8.4 4.8 5.6 5v12.2c2.8-.2 4.8.3 6.4 1.5" />
      <path d="M12 6.4c1.6-1.1 3.6-1.6 6.4-1.4v12.2c-2.8-.2-4.8.3-6.4 1.5" />
      <line x1="12" y1="6.4" x2="12" y2="18.7" />
    </svg>
  );
}

function ArrowIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}

function ShieldIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  );
}

/** Chevron pointing down; rotated via CSS where needed. */
function ChevronIcon({
  size,
  className,
  ...rest
}: {
  size: number;
  className?: string;
} & Record<`data-${string}`, string | boolean | undefined>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ChevronUpIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

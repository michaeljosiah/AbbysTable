'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { personalisationSummary } from '@/components/checkout/DishPicker';
import type { BoxPricing, Dish, PersonalisationOptions } from '@/lib/aonik/types';
import { boxPricePence, cartTotals, useCart, type CartLine } from '@/lib/cart/CartProvider';
import { formatPrice } from '@/lib/format';

import { ContinueLink } from './ContinueLink';

import styles from './BoxSummary.module.css';

/**
 * The box being built: progress against the chosen size, every line with its
 * personalisation and quantity, and the estimated total.
 *
 * Sticks beside the dish grid on desktop; below 1040px the card is replaced by a
 * fixed bar that opens the same content as a bottom sheet.
 */
interface BoxSummaryProps {
  dishes: Dish[];
  pricing: BoxPricing;
  personalisation: PersonalisationOptions;
  earliestDeliveryLabel: string;
}

/** One line, split into the units inside the box and those beyond it. */
interface BoxRow {
  line: CartLine;
  extra: number;
}

function BoxIcon({ size = 24 }: { size?: number }) {
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

export function BoxSummary({
  dishes,
  pricing,
  personalisation,
  earliestDeliveryLabel,
}: BoxSummaryProps) {
  const { boxSize, isCustom, lines, dishCount, hydrated, setBoxSize, removeLine, setQuantity } =
    useCart();

  const [breakdownOpen, setBreakdownOpen] = useState(false);
  /** The ⓘ "About pricing" card next to the estimated total. */
  const [tipOpen, setTipOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  /** The size field is held as text so the box can be typed as well as stepped. */
  const [sizeInput, setSizeInput] = useState('');
  const [scrollMore, setScrollMore] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const sheetCloseRef = useRef<HTMLButtonElement>(null);
  const changeCloseRef = useRef<HTMLButtonElement>(null);
  /** Whatever opened each overlay, so focus can be handed back on close. */
  const sheetOpenerRef = useRef<HTMLElement | null>(null);
  const changeOpenerRef = useRef<HTMLElement | null>(null);
  const lastLinesRef = useRef<string | null>(null);

  const dishById = useMemo(() => new Map(dishes.map((dish) => [dish.id, dish])), [dishes]);

  const totals = useMemo(
    () => cartTotals({ boxSize, isCustom, lines }, pricing),
    [boxSize, isCustom, lines, pricing],
  );

  /** Units are filled in order, so anything past the box size is an extra. */
  const rows = useMemo<BoxRow[]>(() => {
    let running = 0;
    return lines.map((line) => {
      const inside =
        boxSize === null ? line.quantity : Math.max(0, Math.min(boxSize - running, line.quantity));
      running += line.quantity;
      return { line, extra: line.quantity - inside };
    });
  }, [lines, boxSize]);

  /**
   * The template's step-2 itemisation splits `surchargePence` back out:
   * signature upgrades ride the whole line; other personalisation splits the
   * way the box does, so surcharges on units past the box size count as
   * "extra-dish personalisation". The parts re-sum to `totals.surchargePence`.
   */
  const split = useMemo(() => {
    let signaturePence = 0;
    let signatureCount = 0;
    let personalisationPence = 0;
    let extraPersonalisationPence = 0;

    for (const { line, extra } of rows) {
      const dish = dishById.get(line.dishId);
      const upgrade = dish?.isSignature ? (dish.upgradePence ?? 0) : 0;
      const perUnit = Math.max(0, line.surchargePence - upgrade);

      signaturePence += upgrade * line.quantity;
      if (upgrade > 0) signatureCount += line.quantity;
      personalisationPence += perUnit * (line.quantity - extra);
      extraPersonalisationPence += perUnit * extra;
    }

    return { signaturePence, signatureCount, personalisationPence, extraPersonalisationPence };
  }, [rows, dishById]);

  const openSheet = useCallback(() => {
    sheetOpenerRef.current = document.activeElement as HTMLElement | null;
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    sheetOpenerRef.current?.focus();
    sheetOpenerRef.current = null;
  }, []);

  const openChange = useCallback(() => {
    changeOpenerRef.current = document.activeElement as HTMLElement | null;
    setSizeInput(String(boxSize ?? pricing.custom.minDishes));
    setChangeOpen(true);
  }, [boxSize, pricing.custom.minDishes]);

  const closeChange = useCallback(() => {
    setChangeOpen(false);
    changeOpenerRef.current?.focus();
    changeOpenerRef.current = null;
  }, []);

  /*
   * The sheet and the change dialog can be open together — the dialog is reached
   * from inside the sheet — so a single effect owns Escape and the scroll lock.
   * Two effects would both answer the same keypress (closing the sheet out from
   * under the dialog) and would unwind the lock in the wrong order, leaving the
   * page unscrollable.
   */
  useEffect(() => {
    if (!sheetOpen && !changeOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Only the topmost overlay closes.
      if (changeOpen) closeChange();
      else closeSheet();
    };

    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [sheetOpen, changeOpen, closeSheet, closeChange]);

  // Focus follows whichever overlay just opened; closing hands it back.
  useEffect(() => {
    if (sheetOpen) sheetCloseRef.current?.focus();
  }, [sheetOpen]);

  useEffect(() => {
    if (changeOpen) changeCloseRef.current?.focus();
  }, [changeOpen]);

  // "Scroll for more" is offered while the list overflows and is still at the top.
  useEffect(() => {
    const element = listRef.current;
    if (!element) return;

    const update = () =>
      setScrollMore(element.scrollHeight - element.clientHeight > 8 && element.scrollTop <= 4);

    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      element.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [hydrated, boxSize, lines]);

  /** Identity of the box's contents, so an edit can be told from a re-render. */
  const linesSignature = useMemo(
    () => lines.map((line) => `${line.lineId}:${line.quantity}`).join('|'),
    [lines],
  );

  useEffect(() => {
    if (!hydrated) return;
    // The first value after hydration is the restored box, not an edit.
    if (lastLinesRef.current === null) {
      lastLinesRef.current = linesSignature;
      return;
    }
    if (lastLinesRef.current === linesSignature) return;
    lastLinesRef.current = linesSignature;

    setToastOpen(true);
    const timer = window.setTimeout(() => setToastOpen(false), 2600);
    return () => window.clearTimeout(timer);
  }, [hydrated, linesSignature]);

  const changeQuantity = useCallback(
    (lineId: string, quantity: number) => setQuantity(lineId, quantity),
    [setQuantity],
  );

  const scrollListDown = useCallback(() => {
    const element = listRef.current;
    element?.scrollTo({ top: Math.round(element.clientHeight * 0.8), behavior: 'smooth' });
  }, []);

  // Nothing cart-dependent may render before storage has been read.
  if (!hydrated) {
    return (
      <div className={styles.card} aria-hidden="true">
        <div className={styles.head}>
          <BoxIcon />
          <span>Your box</span>
        </div>
      </div>
    );
  }

  if (boxSize === null) return null;

  const preset = pricing.presets.find((offer) => offer.dishCount === boxSize);
  const boxLabel = preset?.name ?? `${boxSize}-dish box`;
  const inBox = Math.min(dishCount, boxSize);
  const isFull = inBox >= boxSize;
  const spacesLeft = Math.max(0, boxSize - dishCount);
  const progress = Math.min(100, (inBox / boxSize) * 100);

  const countLabel =
    totals.extraDishes > 0
      ? `${dishCount} dishes selected`
      : `${inBox} of ${boxSize} dishes selected`;

  // When the box is full AND carrying extras, the breakdown line above says it
  // all — the template drops this note entirely in that state.
  const slotsLabel = isFull
    ? totals.extraDishes > 0
      ? ''
      : `Your ${boxLabel} is complete. Continue to Extras, or change box size to add more.`
    : `${spacesLeft} ${spacesLeft === 1 ? 'space left to fill' : 'spaces left to fill'}`;

  // Turning the extras into box spaces: priced from the catalogue, never assumed.
  const largerSize = dishCount;
  const largerPreset = pricing.presets.find((offer) => offer.dishCount === largerSize);
  const largerPence = boxPricePence(largerSize, !largerPreset, pricing);
  const canGrow = totals.extraDishes > 0 && largerSize <= pricing.custom.maxDishes;

  const totalLabel = formatPrice(totals.totalPence);

  /* ---- Change box size ------------------------------------------------------- */

  // Every bound below comes from `pricing`; nothing here assumes a box shape.
  const minDishes = pricing.custom.minDishes;
  const maxDishes = pricing.custom.maxDishes;
  const typedSize = Number.parseInt(sizeInput, 10);
  const nextSize = Number.isFinite(typedSize)
    ? Math.max(minDishes, Math.min(maxDishes, typedSize))
    : minDishes;
  const nextPreset = pricing.presets.find((offer) => offer.dishCount === nextSize);
  const nextBoxPence = boxPricePence(nextSize, !nextPreset, pricing);
  // Shrinking below what is already chosen never drops lines silently: the
  // customer is told what to remove and the box is left as it is.
  const overBy = Math.max(0, dishCount - nextSize);
  const sizeChanged = nextSize !== boxSize;

  const changeCta =
    overBy > 0
      ? `Choose ${overBy} ${overBy === 1 ? 'dish' : 'dishes'} to remove`
      : sizeChanged
        ? 'Save changes'
        : 'No changes to save';

  const applyChange = () => {
    // With too many dishes chosen there is nothing to save yet — close so the
    // customer can remove some.
    if (overBy > 0 || !sizeChanged) {
      closeChange();
      return;
    }
    setBoxSize(nextSize, !nextPreset);
    closeChange();
  };

  const stepSize = (delta: number) =>
    setSizeInput(String(Math.max(minDishes, Math.min(maxDishes, nextSize + delta))));

  /* ---- Shared fragments ------------------------------------------------------ */

  const header = (
    <div className={styles.top}>
      <div className={styles.topRow}>
        <span className={styles.boxLabel}>{boxLabel}</span>
        <button type="button" className={styles.change} onClick={openChange}>
          Change box size
        </button>
      </div>

      <div className={styles.countRow}>
        <span className={styles.count}>{countLabel}</span>
        {isFull ? (
          <span className={styles.complete}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="var(--green-forest)" />
              <path
                d="M8 12.3l2.6 2.6 5-5.4"
                fill="none"
                stroke="var(--blush)"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Complete
          </span>
        ) : null}
      </div>

      {totals.extraDishes > 0 ? (
        <p className={styles.breakdownLine}>
          {inBox} included in your box · {totals.extraDishes}{' '}
          {totals.extraDishes === 1 ? 'added as an extra' : 'added as extras'}
        </p>
      ) : null}

      <div className={styles.track}>
        {/* Width is the one genuinely dynamic value here. */}
        <span className={styles.fill} style={{ width: `${progress}%` }} />
      </div>

      {slotsLabel ? <p className={styles.slots}>{slotsLabel}</p> : null}

      <p className={styles.listHead}>Your selected dishes</p>
    </div>
  );

  const lineList =
    rows.length > 0 ? (
      <ul className={styles.lines}>
        {rows.map(({ line, extra }) => {
          const dish = dishById.get(line.dishId);
          const addPence = extra * pricing.extraDishPence + line.quantity * line.surchargePence;

          return (
            <li key={line.lineId} className={styles.line}>
              <Link href={`/menu/${line.slug}`} className={styles.thumbLink} title={line.title}>
                <Image
                  src={line.imageUrl}
                  alt=""
                  width={58}
                  height={58}
                  className={styles.thumb}
                />
              </Link>

              <div className={styles.lineBody}>
                <div className={styles.lineTop}>
                  <Link href={`/menu/${line.slug}`} className={styles.lineName}>
                    {line.title}
                  </Link>
                  {addPence > 0 ? (
                    <span className={styles.lineAdd}>+{formatPrice(addPence)}</span>
                  ) : null}
                </div>

                <div className={styles.lineTags}>
                  {extra > 0 ? (
                    <span className={styles.extraTag}>
                      {extra === line.quantity ? 'Extra dish' : `${extra} extra`}
                    </span>
                  ) : null}
                  {dish?.isSignature ? (
                    <span className={styles.signatureTag}>
                      <span aria-hidden="true">⬥</span> Signature
                    </span>
                  ) : null}
                </div>

                <p className={styles.linePers}>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--brass)"
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
                  <span>{personalisationSummary(line.personalisation, personalisation)}</span>
                </p>

                <div className={styles.lineActions}>
                  <span className={styles.stepper} role="group" aria-label="Quantity">
                    <button
                      type="button"
                      className={styles.stepButton}
                      onClick={() => changeQuantity(line.lineId, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                      aria-label={`Fewer ${line.title}`}
                    >
                      −
                    </button>
                    <span className={styles.quantity}>{line.quantity}</span>
                    <button
                      type="button"
                      className={styles.stepButton}
                      onClick={() => changeQuantity(line.lineId, line.quantity + 1)}
                      aria-label={`More ${line.title}`}
                    >
                      +
                    </button>
                  </span>

                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => removeLine(line.lineId)}
                  >
                    <svg
                      width="13"
                      height="13"
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
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    ) : (
      <div className={styles.empty}>
        <BoxIcon />
        <div>
          <p className={styles.emptyTitle}>Your box is empty</p>
          <p className={styles.emptyCopy}>Add dishes from the menu — your choices appear here.</p>
        </div>
      </div>
    );

  const grow = canGrow ? (
    <div className={styles.grow}>
      <p className={styles.growTitle}>Make your box larger?</p>
      <p className={styles.growCopy}>Add more dish spaces to continue.</p>
      <div className={styles.growRow}>
        <span className={styles.growLabel}>Current box</span>
        <span className={styles.growValue}>
          {boxLabel} · {formatPrice(totals.boxPence + totals.extraPence)}
        </span>
      </div>
      <button
        type="button"
        className={styles.growButton}
        onClick={() => setBoxSize(largerSize, !largerPreset)}
      >
        <span>Make it a {largerSize}-dish box</span>
        <span className={styles.growPrice}>{formatPrice(largerPence)}</span>
      </button>
      <p className={styles.growNote}>Boxes start from {pricing.custom.minDishes} dishes.</p>
    </div>
  ) : null;

  // The template's step-2 rows: box at its paid price (no discount line here —
  // that's step 1's breakdown), then the itemised additions, then delivery.
  const breakdown = (
    <div className={styles.rows}>
      <div className={styles.row}>
        <span>{boxLabel}</span>
        <span className={styles.rowStrong}>{formatPrice(totals.boxPence)}</span>
      </div>
      {split.signaturePence > 0 ? (
        <div className={styles.row}>
          <span>
            {split.signatureCount}{' '}
            {split.signatureCount === 1 ? 'signature upgrade' : 'signature upgrades'}
          </span>
          <span className={styles.rowAccent}>+{formatPrice(split.signaturePence)}</span>
        </div>
      ) : null}
      {split.personalisationPence > 0 ? (
        <div className={styles.row}>
          <span>Personalisation</span>
          <span className={styles.rowAccent}>+{formatPrice(split.personalisationPence)}</span>
        </div>
      ) : null}
      {totals.extraDishes > 0 ? (
        <div className={styles.row}>
          <span>
            {totals.extraDishes} {totals.extraDishes === 1 ? 'extra dish' : 'extra dishes'}
          </span>
          <span className={styles.rowStrong}>{formatPrice(totals.extraPence)}</span>
        </div>
      ) : null}
      {split.extraPersonalisationPence > 0 ? (
        <div className={styles.row}>
          <span>Extra-dish personalisation</span>
          <span className={styles.rowAccent}>
            +{formatPrice(split.extraPersonalisationPence)}
          </span>
        </div>
      ) : null}
      {pricing.delivery ? (
        <div className={styles.row}>
          <span>Delivery</span>
          <span className={styles.rowDelivery}>
            <span className={styles.rowWas}>{formatPrice(pricing.delivery.listPence)}</span>
            <span className={styles.rowNow}>
              {pricing.delivery.pricePence === 0
                ? 'Free'
                : formatPrice(pricing.delivery.pricePence)}
            </span>
          </span>
        </div>
      ) : null}
      <span className={styles.rowsRule} aria-hidden="true" />
      <div className={styles.rowTotal}>
        <span>Total</span>
        <span>{totalLabel}</span>
      </div>
    </div>
  );

  const continueLabel = isFull
    ? 'Continue to extras'
    : `Add ${spacesLeft} more ${spacesLeft === 1 ? 'dish' : 'dishes'}`;

  const ctaInner = (
    <>
      <span className={styles.ctaMain}>
        {continueLabel}
        {isFull ? (
          <svg
            width="20"
            height="20"
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
        ) : null}
      </span>
      <span className={styles.ctaSub}>
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
        Secure checkout
      </span>
    </>
  );

  const foot = (
    <div className={styles.foot}>
      <div className={styles.estRow}>
        <span className={styles.estLeft}>
          <button
            type="button"
            className={styles.estToggle}
            onClick={() => setBreakdownOpen(!breakdownOpen)}
            aria-expanded={breakdownOpen}
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
          onClick={() => setBreakdownOpen(!breakdownOpen)}
          aria-expanded={breakdownOpen}
        >
          <span className={styles.estValue}>{totalLabel}</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.estChevron}
            data-open={breakdownOpen || undefined}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
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

      <div className={styles.ctaWrap}>
        {isFull ? (
          <ContinueLink href="/box/extras" className={styles.cta}>
            {ctaInner}
          </ContinueLink>
        ) : (
          <button type="button" className={styles.cta} disabled>
            {ctaInner}
          </button>
        )}

        <p className={styles.delivery}>
          Earliest UK-wide delivery: <strong>{earliestDeliveryLabel}</strong>
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* ---- Desktop card ---------------------------------------------------- */}
      <div className={styles.card}>
        <div className={styles.head}>
          <BoxIcon />
          <span>Your box</span>
        </div>

        {header}

        <div className={styles.scrollWrap}>
          <div className={styles.scroll} ref={listRef}>
            {lineList}
            {grow}
            {/* The template expands the itemisation at the tail of the list,
                where it scrolls with the dishes; the foot stays fixed. */}
            {breakdownOpen ? breakdown : null}
          </div>

          {/* Kept mounted so it can fade in and out with the list's overflow. */}
          <button
            type="button"
            className={styles.scrollMore}
            data-show={scrollMore || undefined}
            onClick={scrollListDown}
            tabIndex={scrollMore ? undefined : -1}
          >
            Scroll for more
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        {foot}
      </div>

      {/* ---- Compact bar + sheet -------------------------------------------- */}
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.barSummary}
          onClick={openSheet}
          aria-label="View your box"
          aria-expanded={sheetOpen}
        >
          <span className={styles.barIcon} aria-hidden="true">
            <BoxIcon size={22} />
          </span>
          <span className={styles.barText}>
            <span className={styles.barTitle}>Your box</span>
            <span className={styles.barCount}>{countLabel}</span>
            <span className={styles.barTotal}>{totalLabel}</span>
          </span>
          <span className={styles.barChevron} data-open={sheetOpen || undefined} aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </span>
        </button>

        <span className={styles.barDivider} aria-hidden="true" />

        {isFull ? (
          <ContinueLink href="/box/extras" className={styles.barCta}>
            Continue
            <svg
              width="18"
              height="18"
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
          </ContinueLink>
        ) : (
          <button type="button" className={styles.barCta} disabled>
            Add {spacesLeft} more
          </button>
        )}
      </div>

      {sheetOpen ? (
        <>
          <div className={styles.sheetBackdrop} onClick={closeSheet} aria-hidden="true" />
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Your box">
            <div className={styles.sheetTop}>
              <div className={styles.sheetHandle} aria-hidden="true" />
              <div className={styles.sheetHead}>
                <span className={styles.sheetTitle}>
                  <BoxIcon size={22} />
                  Your box
                </span>
                <button
                  ref={sheetCloseRef}
                  type="button"
                  className={styles.sheetClose}
                  onClick={closeSheet}
                  aria-label="Close"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={styles.sheetBody}>
              {header}
              {lineList}
              {grow}
              {/* Always itemised here — the sheet has no separate expand state. */}
              {breakdown}
            </div>

            <div className={styles.sheetFoot}>{foot}</div>
          </div>
        </>
      ) : null}

      {/* ---- Change box size ------------------------------------------------- */}

      {changeOpen ? (
        <div className={styles.changeOverlay} onClick={closeChange}>
          <div
            className={styles.changeDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-box-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              ref={changeCloseRef}
              type="button"
              className={styles.changeClose}
              onClick={closeChange}
              aria-label="Close"
            >
              ×
            </button>

            <h2 id="change-box-title" className={styles.changeTitle}>
              Change your box size
            </h2>
            <p className={styles.changeIntro}>
              Choose a smaller or larger box. Your estimated total updates immediately.
            </p>

            <div className={styles.current}>
              <span className={styles.currentIcon} aria-hidden="true">
                <BoxIcon size={30} />
              </span>
              <span className={styles.currentText}>
                <span className={styles.currentTitle}>Current box</span>
                <span className={styles.currentSub}>
                  {boxLabel} · {dishCount} {dishCount === 1 ? 'dish' : 'dishes'} selected
                </span>
              </span>
              <span className={styles.currentPrice}>{formatPrice(totals.boxPence)}</span>
            </div>

            <p className={styles.sizeHead}>Box size</p>

            <div className={styles.sizeRow}>
              <button
                type="button"
                className={styles.sizeStep}
                onClick={() => stepSize(-1)}
                disabled={nextSize <= minDishes}
                aria-label="Fewer dishes"
              >
                −
              </button>
              <span className={styles.sizeField}>
                <input
                  className={styles.sizeInput}
                  value={sizeInput}
                  onChange={(event) => setSizeInput(event.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => setSizeInput(String(nextSize))}
                  inputMode="numeric"
                  aria-label="Box size"
                />
              </span>
              <button
                type="button"
                className={styles.sizeStep}
                onClick={() => stepSize(1)}
                disabled={nextSize >= maxDishes}
                aria-label="More dishes"
              >
                +
              </button>
            </div>

            <p className={styles.sizeNote}>Boxes start from {minDishes} dishes.</p>
            <p className={styles.sizeNote}>Type a number or use + and −</p>

            <p className={styles.presetHead}>
              <span className={styles.presetRule} aria-hidden="true" />
              <span>Prefer a preset box?</span>
              <span className={styles.presetRule} aria-hidden="true" />
            </p>

            <div className={styles.presets}>
              {pricing.presets.map((offer) => (
                <button
                  key={offer.dishCount}
                  type="button"
                  className={styles.presetChip}
                  data-selected={offer.dishCount === nextSize || undefined}
                  aria-pressed={offer.dishCount === nextSize}
                  onClick={() => setSizeInput(String(offer.dishCount))}
                >
                  {offer.dishCount}
                </button>
              ))}
            </div>

            {overBy > 0 ? (
              <>
                <div className={styles.changeError} role="alert">
                  <span className={styles.changeErrorTitle}>
                    You need to remove {overBy} {overBy === 1 ? 'dish' : 'dishes'}
                  </span>
                  <span className={styles.changeErrorBody}>
                    You have {dishCount} dishes selected. To move to a {nextSize}-dish box, choose{' '}
                    {overBy} {overBy === 1 ? 'dish' : 'dishes'} to remove first.
                  </span>
                </div>

                <div className={styles.changeRows}>
                  <div className={styles.changeRow}>
                    <span>Box size</span>
                    <span className={styles.changeRowValue}>{nextSize} dishes</span>
                  </div>
                  <div className={styles.changeRow}>
                    <span>New box price</span>
                    <span className={styles.changeRowValue}>{formatPrice(nextBoxPence)}</span>
                  </div>
                  <div className={styles.changeRow}>
                    <span>Estimated total</span>
                    <span className={styles.changeRowNote}>Updates after dish removal</span>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.changeRows}>
                <div className={styles.changeRow}>
                  <span>Box size</span>
                  <span className={styles.changeRowValue}>{nextSize} dishes</span>
                </div>
                <div className={styles.changeRow}>
                  <span className={styles.changeRowLabel}>Estimated total</span>
                  <span className={styles.changeTotal}>
                    <span className={styles.changeTotalValue}>
                      {/* No dish sits outside the box at this size, so the estimate
                          is the new box plus the surcharges already chosen. */}
                      {formatPrice(nextBoxPence + totals.surchargePence)}
                    </span>
                    <span className={styles.changeRowNote}>Includes current personalisation</span>
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              className={styles.changeCta}
              onClick={applyChange}
              disabled={overBy === 0 && !sizeChanged}
            >
              {changeCta}
            </button>

            <button type="button" className={styles.keepLink} onClick={closeChange}>
              Keep my current box
            </button>
          </div>
        </div>
      ) : null}

      {/* Announced politely and dismissed on its own; never traps focus. */}
      <div className={styles.toast} role="status" data-show={toastOpen || undefined}>
        {toastOpen ? 'Box updated' : ''}
      </div>
    </>
  );
}

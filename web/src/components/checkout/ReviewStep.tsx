'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  CARD_HEAT_LABELS,
  Nutrition,
} from '@/components/checkout/DishPicker';
import {
  OptionGroupsControl,
  type OptionGroupControlClasses,
} from '@/components/personalisation/OptionGroupsControl';
import { DishInfoPanels } from '@/components/dish/DishInfoPanels';
import { HeatPips } from '@/components/ui';
import { encodeSelection, type MappedOptionGroup } from '@/lib/aonik/map';
import {
  defaultSelection,
  hasOptionChoices,
  localSurcharge,
  sameSelection,
  selectionDraft,
  selectionSummary,
  type PersonalisationDraft,
} from '@/lib/aonik/personalisation';
import {
  HEAT_STEPS,
  type BoxPricing,
  type Dish,
  type Extra,
  type HeatingInstruction,
} from '@/lib/aonik/types';
import {
  cartTotals,
  extraUnitPence,
  extrasTotals,
  useCart,
  type CartLine,
  type ExtraLine,
} from '@/lib/cart/CartProvider';
import { afterCartMutation } from '@/lib/cart/convergence';
import { extraLinePersonalisation } from '@/lib/cart/demoStorage';
import { quoteComponentLabel, useCartQuote } from '@/lib/cart/quote';
import { formatPrice, formatPriceExact, formatSignedPrice } from '@/lib/format';

import { DriftNotices } from './DriftNotices';
import { PlaceOrderButton } from './PlaceOrderButton';
import dmStyles from './DishPicker.module.css';
import styles from './ReviewStep.module.css';

const OPTION_GROUP_CLASSES: OptionGroupControlClasses = {
  group: `${dmStyles.group} ${dmStyles.groupRuled}`,
  title: dmStyles.groupTitle,
  caption: dmStyles.groupCaption,
  choices: dmStyles.groupChips,
  choice: dmStyles.optionChip,
  choiceLabel: dmStyles.optionLabel,
  choiceDetail: dmStyles.optionDetail,
  choicePrice: dmStyles.optionPrice,
  defaultNote: dmStyles.abbysNote,
};

/**
 * Step 4: the whole order in review — box dishes, extras, and the summary
 * with reconciliation lines, exactly as the template lays them out. Dish rows
 * and "Edit personalisation" open the template's in-place dish modal.
 */
interface ReviewStepProps {
  dishes: Dish[];
  extras: Extra[];
  pricing: BoxPricing;
  optionGroupsBySlug: Record<string, MappedOptionGroup[]>;
  /** Reheating guidance for the modal's shared info panels. */
  heating: HeatingInstruction[];
  /**
   * Pre-formatted delivery date, e.g. "6 August", or null when the tenant
   * publishes no promise — in which case the line is not rendered at all. A
   * wrong date is worse than no date, so nothing is invented here.
   */
  earliestDeliveryLabel: string | null;
  heading: ReactNode;
}

export function ReviewStep({
  dishes,
  extras,
  pricing,
  optionGroupsBySlug,
  heating,
  earliestDeliveryLabel,
  heading,
}: ReviewStepProps) {
  const {
    boxSize,
    isCustom,
    lines,
    extras: extraLines,
    hydrated,
    updateLinePersonalisation,
    updateExtra,
    removeExtra,
    revalidate,
    isServerCart,
    pending,
  } = useCart();

  /** This dish's own effective groups. */
  const optionsFor = useCallback(
    (dish: Dish): MappedOptionGroup[] => optionGroupsBySlug[dish.slug] ?? [],
    [optionGroupsBySlug],
  );

  /**
   * The continue gate (SPEC review-checkout FR-2).
   *
   * Aonik re-validates the box against the live catalogue and returns the
   * repaired truth, which the provider adopts — so the page below renders what
   * is actually orderable, and `DriftNotices` explains anything that moved. It
   * runs ONCE per visit: it is a POST that can repair the cart, not a poll.
   */
  const gateRun = useRef(false);
  const [gateStatus, setGateStatus] = useState<'idle' | 'pending' | 'ready' | 'failed'>(
    isServerCart ? 'idle' : 'ready',
  );
  const runGate = useCallback(async () => {
    if (!isServerCart || pending) return;
    setGateStatus('pending');
    try {
      await revalidate();
      setGateStatus('ready');
    } catch {
      setGateStatus('failed');
    }
  }, [isServerCart, pending, revalidate]);

  useEffect(() => {
    if (!isServerCart || !hydrated || gateRun.current) return;
    gateRun.current = true;
    void runGate();
  }, [isServerCart, hydrated, runGate]);

  const [boxOpen, setBoxOpen] = useState(true);
  const [extrasOpen, setExtrasOpen] = useState(true);
  /** The mobile bar's order-summary sheet. */
  const [sheetOpen, setSheetOpen] = useState(false);
  /** The in-place edit-personalisation modal, seeded from a cart line. */
  const [editor, setEditor] = useState<{
    line: CartLine;
    dish: Dish;
    draft: PersonalisationDraft;
  } | null>(null);
  /** The template's flash toast ("Personalisation updated"). */
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorOpenerRef = useRef<HTMLElement | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const dishById = useMemo(() => new Map(dishes.map((dish) => [dish.id, dish])), [dishes]);
  const extraById = useMemo(() => new Map(extras.map((extra) => [extra.id, extra])), [extras]);

  const demoTotals = useMemo(
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

  /*
   * The total is the QUOTE's, never a sum taken here.
   *
   * This is the last number a customer reads before "Place order", so it has to
   * be the number Aonik will charge. Adding the local box and extras figures
   * instead meant the page showed whatever the client could work out — £95 over
   * a £104 box while the extras lookup was broken, and silently wrong by any
   * amount Aonik prices differently. `useCartQuote` returns Aonik's quote live
   * and the demo equivalent otherwise, so both engines render one authority.
   */
  const quote = useCartQuote(pricing, { extrasCatalogue: extras });
  const totalLabel = quote ? formatPrice(quote.totalPence) : 'Price unavailable';

  // Signature upgrades vs other personalisation, with per-dish reconciliation.
  const split = useMemo(() => {
    let signaturePence = 0;
    let personalisationPence = 0;
    const signatureItems: { name: string; pence: number }[] = [];
    const personalisedItems: { name: string; pence: number }[] = [];

    if (isServerCart) {
      return { signaturePence, personalisationPence, signatureItems, personalisedItems };
    }

    for (const line of lines) {
      const dish = dishById.get(line.dishId);
      const upgrade = dish?.isSignature ? (dish.upgradePence ?? 0) : 0;
      if (upgrade > 0) {
        signaturePence += upgrade * line.quantity;
        signatureItems.push({ name: line.title, pence: upgrade });
      }
      if (line.surchargePence === undefined) continue;
      const perUnit = line.surchargePence - upgrade;
      if (perUnit !== 0) {
        const linePence = perUnit * line.quantity;
        personalisationPence += linePence;
        personalisedItems.push({ name: line.title, pence: linePence });
      }
    }
    return { signaturePence, personalisationPence, signatureItems, personalisedItems };
  }, [isServerCart, lines, dishById]);

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

  /* ---- Edit-personalisation modal ------------------------------------------- */

  const openEditor = useCallback(
    (line: CartLine) => {
      const dish = dishById.get(line.dishId);
      if (!dish) return;
      editorOpenerRef.current = document.activeElement as HTMLElement | null;
      setEditor({
        line,
        dish,
        draft: selectionDraft(optionsFor(dish), line.personalisation),
      });
    },
    [dishById, optionsFor],
  );

  const closeEditor = useCallback(() => {
    setEditor(null);
    editorOpenerRef.current?.focus();
    editorOpenerRef.current = null;
  }, []);

  const setDraft = useCallback((draft: PersonalisationDraft) => {
    setEditor((current) => (current ? { ...current, draft } : current));
  }, []);

  const saveEditor = useCallback(async () => {
    if (!editor || pending) return;
    const { line, dish, draft } = editor;
    const groups = optionsFor(dish);
    const custom = !sameSelection(groups, draft, defaultSelection(groups));
    const personalisationSurcharge = custom ? localSurcharge(groups, draft) : 0;
    const personalisation = encodeSelection(groups, draft, false);
    if (!personalisation) return;
    try {
      await afterCartMutation(
        () =>
          updateLinePersonalisation(line.lineId, {
            personalisation,
            surchargePence:
              personalisationSurcharge === undefined
                ? undefined
                : (dish.upgradePence ?? 0) + personalisationSurcharge,
          }),
        () => {
          setEditor(null);
          flash('Personalisation updated');
        },
      );
    } catch {
      // Keep the editor open on the last confirmed line.
    }
  }, [editor, pending, optionsFor, updateLinePersonalisation, flash]);

  const changeExtraQuantity = useCallback(
    async (line: ExtraLine, quantity: number) => {
      if (pending) return;
      try {
        if (quantity <= 0) await removeExtra(line.lineId);
        else await updateExtra(line.lineId, { quantity });
      } catch {
        // The provider exposes the failure and retains the confirmed cart.
      }
    },
    [pending, removeExtra, updateExtra],
  );

  const deleteExtra = useCallback(
    async (line: ExtraLine) => {
      if (pending) return;
      try {
        await removeExtra(line.lineId);
      } catch {
        // The provider exposes the failure and retains the confirmed cart.
      }
    },
    [pending, removeExtra],
  );

  // Escape closes the modal and the page behind it must not scroll.
  useEffect(() => {
    if (!editor) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeEditor();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [editor, closeEditor]);

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

  // Edit-modal derivations (template step 4's `footTitle`/`footSub`).
  const editorOptions = editor ? optionsFor(editor.dish) : [];
  const editorHasOptions = hasOptionChoices(editorOptions);
  const editorAbbys = editor ? defaultSelection(editorOptions) : null;
  const editorCustom = Boolean(
    editor && editorAbbys && !sameSelection(editorOptions, editor.draft, editorAbbys),
  );
  const editorChangePence = editor ? localSurcharge(editorOptions, editor.draft) : 0;
  const editorSigUp = editor?.dish.isSignature ? (editor.dish.upgradePence ?? 0) : 0;
  const editorFootTitle = editor
    ? editor.dish.isSignature
      ? 'Abby’s Signature'
      : editorCustom
        ? 'Personalised your way'
        : 'As Abby designed it'
    : '';
  const editorFootSub = editor
    ? editorSigUp
      ? `+${formatPrice(editorSigUp)} signature upgrade${
          editorChangePence !== undefined && editorChangePence !== 0
            ? ` · ${formatSignedPrice(editorChangePence)} personalisation`
            : ''
        }`
      : editorChangePence === undefined
        ? 'Price confirmed in your cart'
        : editorChangePence !== 0
          ? `${formatSignedPrice(editorChangePence)} personalisation`
          : 'No extra cost'
    : '';

  const boxLabel = `${boxSize ?? pricing.custom.minDishes}-dish box`;
  const dishCount = lines.reduce((total, line) => total + line.quantity, 0);
  const boxCountLabel = `${boxLabel} · ${Math.min(dishCount, boxSize ?? 0)} of ${boxSize ?? 0}`;
  const barCountLabel =
    `${dishCount} ${dishCount === 1 ? 'dish' : 'dishes'}` +
    (extrasSum.quantity > 0
      ? ` · ${extrasSum.quantity} ${extrasSum.quantity === 1 ? 'extra' : 'extras'}`
      : '');

  // The summary rows render twice: in the sidebar card and the mobile sheet.
  const summaryRowsJsx = isServerCart ? (
    quote ? (
      <>
        {quote.components.map((component, index) => (
          <div key={`${component.key}:${index}`}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{quoteComponentLabel(component.key)}</span>
              <span className={styles.summaryValue}>
                {formatPriceExact(component.amountPence)}
              </span>
            </div>
            <div className={styles.summaryRule} />
          </div>
        ))}
      </>
    ) : null
  ) : (
    <>
      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>{boxLabel}</span>
        <span className={styles.summaryValue}>{formatPriceExact(demoTotals!.boxPence)}</span>
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

      {split.personalisationPence !== 0 ? (
        <>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Personalisation</span>
            <span className={styles.summaryValue}>
              {formatSignedPrice(split.personalisationPence, true)}
            </span>
          </div>
          <div className={styles.summaryRecon}>
            {split.personalisedItems
              .map((item) => `${item.name} ${formatSignedPrice(item.pence)}`)
              .join('  ·  ')}
          </div>
          <div className={styles.summaryRule} />
        </>
      ) : null}

      {demoTotals!.extraDishes > 0 ? (
        <>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Extra dishes</span>
            <span className={styles.summaryValue}>
              +{formatPriceExact(demoTotals!.extraPence)}
            </span>
          </div>
          <div className={styles.summaryRule} />
        </>
      ) : null}

      {extrasSum.quantity > 0 ? (
        <>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Extras</span>
            <span className={styles.summaryValue}>
              {extrasSum.totalPence === undefined
                ? 'Price unavailable'
                : formatSignedPrice(extrasSum.totalPence, true)}
            </span>
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

        <DriftNotices />
        {gateStatus === 'failed' ? (
          <div role="alert" className={styles.groupFootNote}>
            Your box could not be checked against the latest catalogue.{' '}
            <button
              type="button"
              className={styles.footNoteLink}
              onClick={() => void runGate()}
              disabled={pending}
            >
              Retry validation
            </button>
          </div>
        ) : null}

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
                        <button
                          type="button"
                          className={styles.orderThumb}
                          onClick={() => openEditor(line)}
                          aria-label={`View ${line.title}`}
                        >
                          <Image src={line.imageUrl} alt="" width={74} height={74} />
                        </button>
                        <div className={styles.orderBody}>
                          <div className={styles.orderTitleRow}>
                            <button
                              type="button"
                              className={styles.orderName}
                              onClick={() => openEditor(line)}
                            >
                              {line.title}
                            </button>
                            {dish?.isSignature ? (
                              <span className={styles.sigChip}>
                                <span aria-hidden="true">⬥</span>Signature
                              </span>
                            ) : null}
                            {isServerCart ? null : line.surchargePence === undefined ? (
                              <span className={styles.orderDelta}>Price unavailable</span>
                            ) : line.surchargePence !== 0 ? (
                              <span className={styles.orderDelta}>
                                {formatSignedPrice(line.surchargePence * line.quantity)}
                              </span>
                            ) : null}
                          </div>
                          <div className={styles.orderOpts}>
                            {line.quantity > 1 ? `${line.quantity} × ` : ''}
                            {line.personalisation
                              ? selectionSummary(
                                  dish ? optionsFor(dish) : [],
                                  line.personalisation,
                                )
                              : "Abby's choice"}
                          </div>
                          <div className={styles.orderActions}>
                            {/* Same rule as Step 2: never offer an edit with
                                nothing to change. A dish Aonik gives no option
                                groups is served one way. */}
                            {dish && hasOptionChoices(optionsFor(dish)) ? (
                            <button
                              type="button"
                              className={styles.editLink}
                              onClick={() => openEditor(line)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                                <line x1="4" y1="8" x2="20" y2="8" />
                                <circle cx="10" cy="8" r="2.4" fill="var(--surface-bright)" />
                                <line x1="4" y1="16" x2="20" y2="16" />
                                <circle cx="15" cy="16" r="2.4" fill="var(--surface-bright)" />
                              </svg>
                              Edit personalisation
                            </button>
                            ) : null}
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
                    const extra = extraById.get(line.variantId);
                    if (!extra) return null;
                    const unitPence = isServerCart ? line.unitPricePence : extraUnitPence(line, extra);
                    return (
                      <div key={line.lineId}>
                        <div className={styles.orderRow}>
                          <span className={styles.orderThumb}>
                            <Image src={extra.imageUrl} alt="" width={74} height={74} />
                          </span>
                          <div className={styles.orderBody}>
                            <div className={styles.orderTitleRow}>
                              <span className={styles.orderName}>{extra.name}</span>
                              <span className={styles.orderDelta} data-tone="price">
                                {unitPence === undefined
                                  ? 'Price unavailable'
                                  : formatPriceExact(
                                      isServerCart ? unitPence : unitPence * line.quantity,
                                    )}
                              </span>
                            </div>
                            <div className={styles.orderActions}>
                              {extra.optionGroups.length > 0 ? (
                                <span className={styles.optWrap}>
                                  {selectionSummary(
                                    extra.optionGroups,
                                    extraLinePersonalisation(line, extra.optionGroups),
                                  )}
                                </span>
                              ) : null}
                              <span className={styles.stepGroup} role="group" aria-label="Quantity">
                                <button
                                  type="button"
                                  className={styles.cstep}
                                  onClick={() =>
                                    void changeExtraQuantity(line, line.quantity - 1)
                                  }
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
                                  onClick={() =>
                                    void changeExtraQuantity(line, line.quantity + 1)
                                  }
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
                                className={styles.removeButton}
                                onClick={() => void deleteExtra(line)}
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
            <PlaceOrderButton className={styles.cta} disabled={gateStatus !== 'ready'}>
              <span className={styles.ctaMain}>
                Place order
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
            </PlaceOrderButton>
            {earliestDeliveryLabel ? (
              <p className={styles.deliveryNote}>
                Earliest UK-wide delivery: <strong>{earliestDeliveryLabel}</strong>
              </p>
            ) : null}
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
        <PlaceOrderButton className={styles.barCta} disabled={gateStatus !== 'ready'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="12" x2="19" y2="12" />
            <path d="M13 6l6 6-6 6" />
          </svg>
          Place order
        </PlaceOrderButton>
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
              <PlaceOrderButton
                className={`${styles.cta} ${styles.sheetCta}`}
                disabled={gateStatus !== 'ready'}
              >
                <span className={styles.ctaMain}>
                  Place order
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
              </PlaceOrderButton>
              {earliestDeliveryLabel ? (
                <p className={styles.sheetDeliveryNote}>
                  Earliest UK-wide delivery: <strong>{earliestDeliveryLabel}</strong>
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {/* ---- Edit personalisation modal (template step 4's dish modal) ------- */}
      {editor && editorAbbys ? (
        <div className={dmStyles.overlay} onClick={closeEditor}>
          <div
            className={dmStyles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-dm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={dmStyles.dialogHead}>
              <Image
                src={editor.dish.imageUrl}
                alt=""
                width={46}
                height={46}
                className={dmStyles.dialogThumb}
              />
              <span id="review-dm-title" className={dmStyles.dialogName}>
                {editor.dish.title}
              </span>
              <button
                type="button"
                className={dmStyles.dialogClose}
                onClick={closeEditor}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={dmStyles.dialogBody} id="review-dm-body">
              <div className={dmStyles.dmCols}>
                {/* ---- Left: the dish itself ------------------------------- */}
                <div className={dmStyles.dmLeft}>
                  <div className={dmStyles.dmHero}>
                    <Image
                      src={editor.dish.imageUrl}
                      alt={editor.dish.title}
                      width={860}
                      height={688}
                      className={dmStyles.dmHeroImage}
                      sizes="(max-width: 860px) 100vw, 45vw"
                    />
                    {editor.dish.tags.length ? (
                      <div className={dmStyles.dmBadges}>
                        {editor.dish.tags.map((tag) => (
                          <span
                            key={tag}
                            className={dmStyles.mediaBadge}
                            data-tone={tag === 'Under 500 kcal' ? 'light' : 'dark'}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {editor.dish.isSignature ? (
                      <div className={dmStyles.sigBanner}>
                        <Image src="/assets/floral-mark.png" alt="" width={14} height={14} />
                        <span>Abby&apos;s Signature</span>
                        <Image src="/assets/floral-mark.png" alt="" width={14} height={14} />
                      </div>
                    ) : null}
                  </div>

                  <p className={dmStyles.dmLong}>{editor.dish.description}</p>
                  {editor.dish.isSignature ? (
                    <p className={dmStyles.dmSigNote}>
                      <strong className={dmStyles.dmSigNavy}>Abby&apos;s Signature</strong> —
                      counts as one of your box dishes
                      {editor.dish.upgradePence ? (
                        <>
                          , with the{' '}
                          <strong className={dmStyles.dmSigForest}>
                            +{formatPrice(editor.dish.upgradePence)} upgrade
                          </strong>{' '}
                          added on top
                        </>
                      ) : null}
                      .
                    </p>
                  ) : null}

                  {editorHasOptions ? (
                    <button
                      type="button"
                      className={dmStyles.dmShortcut}
                      onClick={() =>
                        document
                          .getElementById('review-dm-personalise')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                        <line x1="4" y1="8" x2="20" y2="8" />
                        <circle cx="10" cy="8" r="2.4" fill="var(--surface-bright)" />
                        <line x1="4" y1="16" x2="20" y2="16" />
                        <circle cx="15" cy="16" r="2.4" fill="var(--surface-bright)" />
                      </svg>
                      <span className={dmStyles.dmShortcutText}>
                        <span className={dmStyles.dmShortcutTitle}>Personalise this dish</span>
                        <span className={dmStyles.dmShortcutSub}>
                          Portion, protein, side &amp; heat — your way.
                        </span>
                      </span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--taupe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  ) : null}

                  <div className={dmStyles.dmJumps}>
                    {[
                      { label: 'Nutrition', target: 'dish-nutrition' },
                      { label: 'Ingredients & allergens', target: 'dish-ingredients' },
                      { label: 'How to heat', target: 'dish-heating' },
                    ].map((jump, index) => (
                      <span key={jump.target} className={dmStyles.dmJumpWrap}>
                        {index > 0 ? (
                          <span className={dmStyles.dmJumpSep} aria-hidden="true">
                            ·
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className={dmStyles.dmJump}
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

                  <div className={dmStyles.dmDetails}>
                    <p className={dmStyles.dmDetailsTitle}>At a glance</p>
                    <div className={dmStyles.dmHlGrid}>
                      {(
                        [
                          editor.dish.nutrition.calories !== undefined
                            ? { label: 'kcal', value: String(editor.dish.nutrition.calories) }
                            : null,
                          { label: 'Protein', value: `${editor.dish.nutrition.proteinGrams}g` },
                          editor.dish.nutrition.carbsGrams !== undefined
                            ? { label: 'Carbs', value: `${editor.dish.nutrition.carbsGrams}g` }
                            : null,
                          editor.dish.nutrition.fatGrams !== undefined
                            ? { label: 'Fat', value: `${editor.dish.nutrition.fatGrams}g` }
                            : null,
                        ].filter(Boolean) as { label: string; value: string }[]
                      ).map((cell) => (
                        <div key={cell.label} className={dmStyles.dmHlCell}>
                          <span className={dmStyles.dmHlLabel}>{cell.label}</span>
                          <span className={dmStyles.dmHlValue}>{cell.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className={dmStyles.dmMetaRow}>
                      <div className={dmStyles.dmCatPills}>
                        {editor.dish.dietary.map((tag) => (
                          <span key={tag} className={dmStyles.dmCatPill}>
                            {tag}
                          </span>
                        ))}
                        {editor.dish.nutrition.calories !== undefined &&
                        editor.dish.nutrition.calories < 500 ? (
                          <span className={dmStyles.dmCatPill}>Under 500 kcal</span>
                        ) : null}
                      </div>
                      <div className={dmStyles.dmHeatRow}>
                        <span className={dmStyles.dmHeatLabel}>Heat</span>
                        <HeatPips heat={editor.dish.heat} />
                        <span className={dmStyles.dmSpiceLabel}>
                          {CARD_HEAT_LABELS[HEAT_STEPS[editor.dish.heat]] ?? ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DishInfoPanels
                    dish={editor.dish}
                    heating={heating}
                    compact
                    onBackToTop={() =>
                      document
                        .getElementById('review-dm-body')
                        ?.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  />
                </div>

                {/* ---- Right: personalise (only when effective choices exist) */}
                {editorHasOptions ? <div className={dmStyles.dmRight}>
                  <div className={dmStyles.persPanel} id="review-dm-personalise">
                    <div className={styles.persHeadStatic}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                        <line x1="4" y1="8" x2="20" y2="8" />
                        <circle cx="10" cy="8" r="2.4" fill="var(--surface-card)" />
                        <line x1="4" y1="16" x2="20" y2="16" />
                        <circle cx="15" cy="16" r="2.4" fill="var(--surface-card)" />
                      </svg>
                      <span className={dmStyles.persPanelTitle}>Personalise this dish</span>
                    </div>

                    <div className={styles.persBodyStatic}>
                      <p className={dmStyles.dialogIntro}>
                        Choose your portion size, swap proteins, change sides or adjust heat.{' '}
                        <span className={dmStyles.dialogIntroSoft}>
                          Nutrition updates as you personalise; your cart confirms the final price.
                        </span>
                      </p>

                      <div className={dmStyles.optionsCard}>
                        <OptionGroupsControl
                          groups={editorOptions}
                          selection={editor.draft}
                          onChange={(groupKey, selected) =>
                            setDraft({ ...editor.draft, [groupKey]: selected })
                          }
                          classes={OPTION_GROUP_CLASSES}
                        />

                        <div className={dmStyles.readout}>
                          {editorChangePence !== undefined ? (
                            <div>
                              <span className={dmStyles.readoutTitle}>Price change</span>
                              <span className={dmStyles.readoutPriceRow}>
                                <span className={dmStyles.readoutValue}>
                                  {editorChangePence === 0
                                    ? '£0'
                                    : formatSignedPrice(editorChangePence)}
                                </span>
                                <span className={dmStyles.readoutValueSub}>
                                  {editorChangePence === 0
                                    ? 'Abby’s choice — no extra cost'
                                    : editorChangePence > 0
                                      ? 'Added to base price'
                                      : 'Below base price'}
                                </span>
                              </span>
                            </div>
                          ) : null}
                          {editorChangePence !== undefined ? (
                            <div className={dmStyles.readoutRule} aria-hidden="true" />
                          ) : null}
                          <div>
                            <span className={dmStyles.readoutTitle}>Nutritional highlights</span>
                            {/* Per-dish, so the portion scaling has real
                                grams to work from — see the Step 2 note. */}
                            <Nutrition
                              dish={editor.dish}
                              choice={editor.draft}
                              optionGroups={editorOptions}
                            />
                          </div>
                        </div>

                        <p className={dmStyles.readoutNote}>
                          Choice prices are shown above; your cart confirms the final total.
                        </p>

                        <div className={dmStyles.resetRule} aria-hidden="true" />
                        <button
                          type="button"
                          className={dmStyles.reset}
                          onClick={() => setDraft(editorAbbys)}
                          disabled={pending || sameSelection(editorOptions, editor.draft, editorAbbys)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 8h9" />
                            <path d="M17 8h3" />
                            <circle cx="15" cy="8" r="2.2" fill="var(--surface-raised)" />
                            <path d="M4 16h3" />
                            <path d="M11 16h9" />
                            <circle cx="9" cy="16" r="2.2" fill="var(--surface-raised)" />
                          </svg>
                          Reset to defaults
                        </button>
                      </div>
                    </div>
                  </div>
                </div> : null}
              </div>
            </div>

            {editorHasOptions ? <div className={styles.dmFootStatic}>
              <div className={dmStyles.dmCtaRow}>
                <div className={dmStyles.footNote}>
                  <span className={dmStyles.footTitle}>{editorFootTitle}</span>
                  <span className={dmStyles.footSub}>{editorFootSub}</span>
                </div>
                <span className={dmStyles.footDivider} aria-hidden="true" />
                <span className={dmStyles.dmCtaWrap}>
                    <button
                      type="button"
                      className={dmStyles.dmCta}
                      onClick={saveEditor}
                      disabled={pending}
                    >
                    Save changes
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  </button>
                </span>
              </div>
            </div> : null}
          </div>
        </div>
      ) : null}

      {/* The template's flash toast. */}
      <div className={dmStyles.toast} data-show={toast || undefined} role="status">
        {toast}
      </div>
    </div>
  );
}

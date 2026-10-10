'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { MappedOptionGroup } from '@/lib/aonik/map';
import type { BoxPricing, Dish, Extra } from '@/lib/aonik/types';
import { useCart } from '@/lib/cart/CartProvider';
import { useCartQuote } from '@/lib/cart/quote';
import { summaryRows } from '@/lib/checkout/summary';
import { expandedBoxPrice, linePortion } from '@/lib/dish/portions';
import { formatPrice } from '@/lib/format';
import { holdDocumentFlag } from '@/lib/dom/documentFlag';
import { subscribePageScroll } from '@/lib/dom/pageScroll';
import { ContinueLink } from './ContinueLink';
import { DriftNotices } from './DriftNotices';
import { FlowDialog } from './FlowDialog';
import { useFlowActions } from './FlowActions';
import { DishLines, ExtraLines } from './FlowLines';
import { ReturnLink, ReviewChangeLink, useReviewReturn } from './ReviewReturn';
import { GiftBanner } from '@/components/gifting/GiftBanner';
import styles from './Flow.module.css';

export function FlowShell({
  step,
  pricing,
  dishes = [],
  extras = [],
  groups = {},
  children,
  blocked = false,
  earliestDeliveryLabel,
}: {
  step: 'dishes' | 'extras' | 'review';
  pricing: BoxPricing;
  dishes?: Dish[];
  extras?: Extra[];
  groups?: Record<string, MappedOptionGroup[]>;
  children: ReactNode;
  blocked?: boolean;
  earliestDeliveryLabel?: string | null;
}) {
  const cart = useCart();
  const actions = useFlowActions();
  const editing = useReviewReturn();
  const signature = useCallback(
    (id: string) => dishes.find((dish) => dish.id === id)?.upgradePence ?? 0,
    [dishes],
  );
  const quote = useCartQuote(pricing, {
    extrasCatalogue: extras,
    signatureUpgradeFor: signature,
  });
  const [sheet, setSheet] = useState(false);
  const [resize, setResize] = useState(false);
  const [size, setSize] = useState(cart.boxSize ?? pricing.custom.minDishes);
  const [hideBar, setHideBar] = useState(false);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!hideBar) return holdDocumentFlag('data-purchase-bar-shown');
  }, [hideBar]);
  const legacy = cart.lines.some(
    (line) => linePortion(line.personalisation) === null,
  );
  const missing = Math.max(
    0,
    (cart.boxSize ?? 0) -
      cart.lines
        .filter(
          (line) => !line.unavailable && linePortion(line.personalisation),
        )
        .reduce((n, line) => n + line.quantity, 0),
  );
  const disabled =
    blocked ||
    actions.busy ||
    cart.readFailed ||
    !quote ||
    !cart.hydrated ||
    !cart.boxSize ||
    cart.dishCount !== cart.boxSize ||
    missing > 0 ||
    legacy ||
    (step !== 'dishes' && cart.hasUnavailableLine);
  const target =
    step === 'dishes'
      ? '/box/extras'
      : step === 'extras'
        ? '/box/review'
        : '/box/checkout';
  const label =
    editing && step !== 'review'
      ? 'Return to review'
      : step === 'dishes'
        ? 'Continue'
        : step === 'extras'
          ? 'Review'
          : 'Checkout';
  const cta = (mobile = false) =>
    editing && step !== 'review' ? (
      <ReturnLink section={step} className={styles.cta} disabled={disabled}>
        {mobile ? 'Review' : label}
      </ReturnLink>
    ) : (
      <ContinueLink href={target} className={styles.cta} disabled={disabled}>
        {label}
        {!mobile && ' →'}
      </ContinueLink>
    );
  useEffect(() => {
    const measure = () => {
      const footer = document
        .querySelector('[data-purchase-bar-stop]')
        ?.getBoundingClientRect();
      const card = summary.current?.getBoundingClientRect();
      setHideBar(
        Boolean(footer && footer.top < window.innerHeight * 0.75) ||
          Boolean(
            step === 'review' &&
              card &&
              card.top < window.innerHeight &&
              card.bottom > 0,
          ),
      );
    };
    measure();
    const unsubscribe = subscribePageScroll(measure);
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    if (summary.current) observer.observe(summary.current);
    return () => {
      unsubscribe();
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [step]);
  const priceRows = (
    <>
      <dl className={styles.totals}>
        {quote ? (
          summaryRows(quote, { deliveryDate: null }).map((row) => (
            <div key={row.key}>
              <dt>{row.label}</dt>
              <dd>
                {row.was && <del>{row.was}</del>} {row.value}
              </dd>
            </div>
          ))
        ) : (
          <div>
            <dt>Price unavailable</dt>
            <dd>—</dd>
          </div>
        )}
      </dl>
    </>
  );
  const total = (
    <div className={styles.total}>
      <strong>{step === 'review' ? 'Total' : 'Estimated total'}</strong>
      <strong>{quote ? formatPrice(quote.totalPence) : '—'}</strong>
    </div>
  );
  const contents = (inSheet = false) => (
    <>
      {step === 'dishes' ? (
        <DishLines dishes={dishes} groups={groups} />
      ) : step === 'extras' || inSheet ? (
        <details className={styles.complete}>
          <summary>
            ✓ Your {cart.dishCount} dishes <span>Complete</span>
          </summary>
          <DishLines dishes={dishes} groups={groups} readOnly />
          {step === 'review' ? (
            <ReviewChangeLink section="dishes">Edit dishes</ReviewChangeLink>
          ) : (
            <Link href="/box/dishes">Edit dishes</Link>
          )}
        </details>
      ) : null}
      {(step !== 'review' || inSheet) && cart.extras.length > 0 && (
        <>
          <h3>
            Extras ({cart.extras.reduce((n, line) => n + line.quantity, 0)})
          </h3>
          <ExtraLines extras={extras} />
        </>
      )}
    </>
  );
  const guidance =
    missing > 0 ? (
      <p className={styles.notice}>
        Add {missing} more {missing === 1 ? 'dish' : 'dishes'} to continue.
      </p>
    ) : legacy ? (
      <p className={styles.notice}>
        Replace dishes with previous choices before continuing.
      </p>
    ) : null;
  return (
    <>
      <DriftNotices />
      {cart.readFailed && (
        <p className={styles.notice} role="alert">
          We couldn’t read your latest box.{' '}
          <button
            className={styles.textButton}
            disabled={actions.busy}
            onClick={() => void actions.run(cart.refresh)}
          >
            Try again
          </button>
        </p>
      )}
      <GiftBanner />
      <div className={styles.shell} aria-busy={actions.busy || undefined}>
        <div
          className={styles.main}
          data-menu-band={step === 'dishes' ? '' : undefined}
        >
          {children}
        </div>
        <aside
          className={styles.rail}
          data-review={step === 'review' || undefined}
          ref={summary}
          aria-label={step === 'review' ? 'Order summary' : 'Your box'}
        >
          <div className={styles.railHead}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 5 9-5M12 12v9" />
            </svg>
            <h2>{step === 'review' ? 'Order summary' : 'Your box'}</h2>
            {step !== 'review' && (
              <button
                type="button"
                className={styles.textButton}
                disabled={actions.busy}
                onClick={() => {
                  setSize(cart.boxSize ?? pricing.custom.minDishes);
                  setResize(true);
                }}
              >
                Change box size
              </button>
            )}
          </div>
          <div className={styles.railList}>
            {step === 'dishes' && (
              <div className={styles.boxStatus}>
                <strong>
                  {cart.boxSize ?? pricing.custom.minDishes}-dish box
                </strong>
                <p>
                  {cart.dishCount} of {cart.boxSize ?? 0} dishes selected
                </p>
                <progress
                  aria-label="Dishes selected"
                  value={cart.dishCount}
                  max={cart.boxSize ?? pricing.custom.minDishes}
                />
                <span>
                  {missing
                    ? `${missing} spaces left to fill`
                    : 'Your box is complete'}
                </span>
              </div>
            )}
            {step === 'dishes' && !cart.lines.length && (
              <p className={styles.empty}>
                <strong>No dishes yet</strong>
                <br />
                Add dishes from the menu. Your choices appear here.
              </p>
            )}
            {contents()}
            {priceRows}
          </div>
          {total}
          {guidance}
          {cta()}
          {step === 'review' && (
            <p className={styles.secure}>Secure checkout</p>
          )}
          {earliestDeliveryLabel && step !== 'review' && (
            <p className={styles.secure}>
              Next deliveries: <strong>{earliestDeliveryLabel}</strong>
            </p>
          )}
        </aside>
      </div>
      <div
        className={styles.mobileBar}
        data-consent-yield=""
        data-hidden={hideBar || undefined}
      >
        <button type="button" onClick={() => setSheet(true)}>
          <span className={styles.barIcon} aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 5 9-5M12 12v9" />
            </svg>
          </span>
          <span>
            <small>{cart.boxSize}-dish box</small>
            <span className={styles.barPrice}>
              <strong>
                {quote ? formatPrice(quote.totalPence) : 'Your box'}
              </strong>
              <span>View box ⌃</span>
            </span>
          </span>
        </button>
        {cta(true)}
      </div>
      {sheet && (
        <FlowDialog
          title={step === 'review' ? 'Order summary' : 'Your box'}
          onClose={() => setSheet(false)}
        >
          {contents(true)}
          {priceRows}
          {total}
          {guidance}
          {cta()}
        </FlowDialog>
      )}
      {resize && (
        <FlowDialog
          title="Change box size"
          short
          onClose={() => setResize(false)}
        >
          <p>Your current dishes will be kept.</p>
          <label className={styles.field}>
            Number of dishes
            <input
              type="number"
              min={Math.max(pricing.custom.minDishes, cart.dishCount)}
              max={pricing.custom.maxDishes}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            />
          </label>
          <p>
            {expandedBoxPrice(pricing, size) !== null
              ? `${formatPrice(expandedBoxPrice(pricing, size)!)} box price, before upgrades and extras.`
              : `Choose ${pricing.custom.minDishes}–${pricing.custom.maxDishes} dishes.`}
          </p>
          <button
            type="button"
            className={styles.cta}
            disabled={
              actions.busy ||
              expandedBoxPrice(pricing, size) === null ||
              size < cart.dishCount
            }
            onClick={async () => {
              if (
                await actions.run(() =>
                  cart.setBoxSize(
                    size,
                    !pricing.presets.some((offer) => offer.dishCount === size),
                  ),
                )
              )
                setResize(false);
            }}
          >
            Update box size
          </button>
        </FlowDialog>
      )}
    </>
  );
}

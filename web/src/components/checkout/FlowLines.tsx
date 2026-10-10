'use client';

import Image from 'next/image';
import type { MappedOptionGroup } from '@/lib/aonik/map';
import { selectionSummary } from '@/lib/aonik/personalisation';
import type { Dish, Extra } from '@/lib/aonik/types';
import {
  extraUnitPence,
  useCart,
  type CartLine,
  type ExtraLine,
} from '@/lib/cart/CartProvider';
import {
  linePortion,
  portionDescription,
  selectionIdentity,
} from '@/lib/dish/portions';
import { formatPrice, formatSignedPrice } from '@/lib/format';
import { useFlowActions } from './FlowActions';
import styles from './Flow.module.css';

export function Stepper({
  quantity,
  label,
  disabled,
  onChange,
  focusKey,
}: {
  quantity: number;
  label: string;
  disabled: boolean;
  onChange: (quantity: number) => void;
  focusKey: string;
}) {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        disabled={disabled}
        data-flow-key={focusKey}
        aria-label={`${quantity === 1 ? 'Remove' : 'Decrease'} ${label}`}
        onClick={() => onChange(quantity - 1)}
      >
        {quantity === 1 ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M4 6h16M9 6V3h6v3M7 6l1 15h8l1-15M10 10v7M14 10v7" />
          </svg>
        ) : (
          '−'
        )}
      </button>
      <span aria-label={`${quantity} selected`}>{quantity}</span>
      <button
        type="button"
        disabled={disabled}
        data-flow-increase={focusKey}
        aria-label={`Increase ${label}`}
        onClick={() => onChange(quantity + 1)}
      >
        +
      </button>
    </div>
  );
}

export function useDishLineActions() {
  const cart = useCart();
  const latest = useLatest(cart);
  const actions = useFlowActions();
  const change = (line: CartLine, quantity: number) => {
    if (quantity > line.quantity) actions.commitDishUndo();
    void actions.run(
      async () => {
        if (
          quantity > line.quantity &&
          cart.boxSize !== null &&
          cart.dishCount + quantity - line.quantity > cart.boxSize
        )
          throw new Error(
            'Your box is full. Change your box size to add more dishes.',
          );
        await cart.setQuantity(line.lineId, quantity);
      },
      quantity === 0
        ? {
            kind: 'dish',
            label: line.title,
            focusKey: `dish-${line.dishId}-${linePortion(line.personalisation)}`,
            restore: async () => {
              const now = latest.current;
              if (
                now.boxSize !== null &&
                now.dishCount + line.quantity > now.boxSize
              )
                throw new Error(
                  'Your box is now full. The dish could not be restored.',
                );
              await now.addLine({ ...line, lineId: undefined });
            },
          }
        : undefined,
    );
  };
  return { change, busy: actions.busy };
}

import { useEffect, useRef } from 'react';
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

// A restore may receive a new server line ID. Retain the semantic line's
// position for this view's lifetime without rewriting the authoritative cart.
function useLineOrder<T>(items: T[], key: (item: T) => string): T[] {
  const order = useRef(new Map<string, number>());
  for (const item of items)
    if (!order.current.has(key(item)))
      order.current.set(key(item), order.current.size);
  return [...items].sort(
    (a, b) => order.current.get(key(a))! - order.current.get(key(b))!,
  );
}

export function DishLines({
  dishes,
  groups,
  readOnly = false,
}: {
  dishes: Dish[];
  groups: Record<string, MappedOptionGroup[]>;
  readOnly?: boolean;
}) {
  const cart = useCart();
  const { change, busy } = useDishLineActions();
  const lines = useLineOrder(
    cart.lines,
    (line) => `${line.dishId}:${selectionIdentity(line.personalisation)}`,
  );
  return (
    <ul className={styles.lines}>
      {lines.map((line) => {
        const dish = dishes.find(
          (item) => item.id === line.dishId || item.slug === line.slug,
        );
        const portion = linePortion(line.personalisation);
        const label = portionDescription(
          groups[dish?.slug ?? line.slug] ?? [],
          line.personalisation,
        );
        const image = dish?.imageUrl || line.imageUrl;
        const upgrade = dish?.upgradePence ?? 0;
        const full =
          portion === 'full' && line.surchargePence !== undefined
            ? line.surchargePence - upgrade
            : 0;
        return (
          <li key={line.lineId} className={styles.line}>
            {image && (
              <Image
                src={image}
                alt=""
                width={64}
                height={64}
                className={styles.thumb}
              />
            )}
            <div className={styles.lineBody}>
              <strong>{line.title}</strong>
              <p>
                {line.quantity} × {label}
              </p>
              {dish?.isSignature && (
                <small>
                  Signature {upgrade > 0 ? formatSignedPrice(upgrade) : ''}
                </small>
              )}
              {full !== 0 && (
                <small>Full Table {formatSignedPrice(full)} each</small>
              )}
              {(!portion || line.unavailable) && (
                <p role="status">
                  {line.unavailable
                    ? 'Unavailable'
                    : 'This dish needs a new choice.'}
                </p>
              )}
            </div>
            {!readOnly && (
              <Stepper
                quantity={line.quantity}
                label={`${line.title}, ${label}`}
                disabled={busy}
                focusKey={`dish-${line.dishId}-${portion}`}
                onChange={(quantity) => change(line, quantity)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function useExtraLineActions() {
  const cart = useCart();
  const { run, busy } = useFlowActions();
  return {
    busy,
    change: (line: ExtraLine, quantity: number, name: string) =>
      void run(
        () =>
          quantity === 0
            ? cart.removeExtra(line.lineId)
            : cart.updateExtra(line.lineId, { quantity }),
        quantity === 0
          ? {
              kind: 'extra',
              label: name,
              focusKey: `extra-${line.variantId}-${JSON.stringify(line.personalisation ?? {})}`,
              restore: () =>
                cart.addExtra(
                  line.variantId,
                  line.quantity,
                  line.personalisation,
                ),
            }
          : undefined,
      ),
  };
}

export function ExtraLines({ extras }: { extras: Extra[] }) {
  const cart = useCart();
  const { change, busy } = useExtraLineActions();
  const ordered = useLineOrder(
    cart.extras,
    (line) => `${line.variantId}:${selectionIdentity(line.personalisation)}`,
  );
  const ids = [...new Set(ordered.map((line) => line.variantId))];
  return (
    <div>
      {ids.map((id) => {
        const extra = extras.find((item) => item.id === id);
        const lines = ordered.filter((line) => line.variantId === id);
        const name = extra?.name ?? lines[0]?.name ?? 'Extra';
        return (
          <section className={styles.extraGroup} key={id}>
            <div className={styles.extraName}>
              {extra?.imageUrl && (
                <Image
                  className={styles.thumb}
                  src={extra.imageUrl}
                  alt=""
                  width={72}
                  height={72}
                />
              )}
              <h3>{name}</h3>
            </div>
            {lines.map((line) => {
              const label = extra?.optionGroups.length
                ? selectionSummary(
                    extra.optionGroups,
                    line.personalisation ?? {},
                  )
                : '';
              const unit = cart.isServerCart
                ? line.unitPricePence
                : extra
                  ? extraUnitPence(line, extra)
                  : undefined;
              return (
                <div className={styles.extraRow} key={line.lineId}>
                  <div>
                    {label && <strong>{label}</strong>}
                    <p>
                      {unit === undefined
                        ? 'Price unavailable'
                        : formatPrice(unit * line.quantity)}
                      {line.quantity > 1 && unit !== undefined && (
                        <small> · {formatPrice(unit)} each</small>
                      )}
                    </p>
                    {line.unavailable && (
                      <p>Unavailable — please remove this extra.</p>
                    )}
                  </div>
                  <Stepper
                    quantity={line.quantity}
                    label={[name, label].filter(Boolean).join(', ')}
                    disabled={busy}
                    focusKey={`extra-${id}-${JSON.stringify(line.personalisation ?? {})}`}
                    onChange={(quantity) => change(line, quantity, name)}
                  />
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

'use client';

import { useId, type ReactNode } from 'react';
import type { MappedOptionGroup } from '@/lib/aonik/map';
import type { Dish } from '@/lib/aonik/types';
import {
  portionModel,
  portionSelection,
  type PortionKey,
} from '@/lib/dish/portions';
import { formatSignedPrice } from '@/lib/format';
import { useSelectionContent } from './useSelectionContent';
import styles from './PortionCard.module.css';

export function PortionCard({
  groups,
  value,
  onChange,
  disabled = false,
  children,
}: {
  groups: MappedOptionGroup[];
  value: PortionKey;
  onChange: (value: PortionKey) => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const name = useId();
  const model = portionModel(groups);
  if (!model)
    return (
      <p role="status">
        Portion options are currently unavailable. Please try again later.
      </p>
    );
  return (
    <fieldset className={styles.card} disabled={disabled}>
      <legend>Choose your portion</legend>
      <div className={styles.choices}>
        {model.choices.map((choice) => (
          <label
            key={choice.key}
            className={styles.choice}
            data-selected={value === choice.key || undefined}
          >
            <input
              type="radio"
              name={name}
              value={choice.key}
              checked={value === choice.key}
              onChange={() => onChange(choice.key as PortionKey)}
            />
            <span>
              <strong>{choice.label}</strong>
              {choice.detail && <small>{choice.detail}</small>}
            </span>
            <span>
              {choice.pricePence === 0
                ? 'Included'
                : formatSignedPrice(choice.pricePence)}
            </span>
          </label>
        ))}
      </div>
      {children}
    </fieldset>
  );
}

export function PortionMacros({
  dish,
  portion,
}: {
  dish: Dish;
  portion: PortionKey;
}) {
  const view = useSelectionContent(dish, [], portionSelection(portion) ?? null);
  const state = view.dish.contentState;
  const exact =
    !state?.figuresAreStale &&
    (view.state === 'standard' ||
      (view.state === 'resolved' && !state?.figuresAreStandardPreparation));
  const nutrition = exact ? view.dish.nutrition : {};
  const figures = [
    { label: 'kcal', value: nutrition.calories },
    { label: 'Protein', value: nutrition.proteinGrams, unit: 'g' },
    { label: 'Fibre', value: nutrition.fibreGrams, unit: 'g' },
  ].filter((figure) => figure.value !== undefined);
  return figures.length ? (
    <dl className={styles.macros}>
      {figures.map((figure) => (
        <div key={figure.label}>
          <dt>{figure.label}</dt>
          <dd>
            {figure.value}
            {figure.unit}
          </dd>
        </div>
      ))}
    </dl>
  ) : (
    <p className={styles.note}>
      {view.state === 'pending'
        ? 'Checking nutrition…'
        : 'Nutrition for this portion is not yet available.'}
    </p>
  );
}

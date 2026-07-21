'use client';

import { useEffect, useMemo, useState } from 'react';

import { HEAT_LABELS, HEAT_STEPS, type Dish, type DishOption, type PersonalisationOptions } from '@/lib/aonik/types';
import { formatPrice } from '@/lib/format';

import styles from './DishPersonaliser.module.css';

/**
 * The dish configurator: portion, protein, side and heat.
 *
 * Options render inline on desktop and as a bottom sheet below 640px, matching
 * the design template. Surcharges are summed in pence and formatted at the edge.
 */
interface DishPersonaliserProps {
  dish: Dish;
  options: PersonalisationOptions;
  /**
   * Reports the current choice so a parent can put it in the cart. Labels are
   * emitted rather than option keys, because the cart is read by pages that have
   * no access to the options catalogue.
   */
  onChange?: (selection: {
    personalisation?: { portion: string; protein: string; side: string; heatStep: number };
    surchargePence: number;
  }) => void;
}

interface Selection {
  portion: string;
  protein: string;
  side: string;
  heatStep: number;
}

/** Abby's pick per group, falling back to the first option. */
function defaultKey(group: DishOption[]): string {
  return (group.find((option) => option.isAbbysChoice) ?? group[0])?.key ?? '';
}

function findOption(group: DishOption[], key: string): DishOption | undefined {
  return group.find((option) => option.key === key);
}

export function DishPersonaliser({ dish, options, onChange }: DishPersonaliserProps) {
  const initial: Selection = useMemo(
    () => ({
      portion: defaultKey(options.portions),
      protein: defaultKey(options.proteins),
      side: defaultKey(options.sides),
      heatStep: HEAT_STEPS[dish.heat],
    }),
    [options, dish.heat],
  );

  const [enabled, setEnabled] = useState(false);
  const [selection, setSelection] = useState<Selection>(initial);
  const [sheetOpen, setSheetOpen] = useState(false);

  const surchargePence = useMemo(() => {
    if (!enabled) return 0;
    return (
      (findOption(options.portions, selection.portion)?.pricePence ?? 0) +
      (findOption(options.proteins, selection.protein)?.pricePence ?? 0) +
      (findOption(options.sides, selection.side)?.pricePence ?? 0)
    );
  }, [enabled, options, selection]);

  // Publish the choice upward whenever it changes.
  useEffect(() => {
    if (!onChange) return;
    if (!enabled) {
      onChange({ surchargePence: 0 });
      return;
    }
    onChange({
      personalisation: {
        portion: findOption(options.portions, selection.portion)?.label ?? '',
        protein: findOption(options.proteins, selection.protein)?.label ?? '',
        side: findOption(options.sides, selection.side)?.label ?? '',
        heatStep: selection.heatStep,
      },
      surchargePence,
    });
  }, [onChange, enabled, options, selection, surchargePence]);

  const summary = enabled
    ? [
        findOption(options.portions, selection.portion)?.label,
        findOption(options.proteins, selection.protein)?.label,
        findOption(options.sides, selection.side)?.label,
        options.heatLevels.find((level) => level.step === selection.heatStep)?.label,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Kept as Abby designed it';

  const renderGroup = (
    legend: string,
    group: DishOption[],
    selected: string,
    onSelect: (key: string) => void,
    columns: 2 | 4,
  ) => (
    <fieldset className={styles.group}>
      <legend className={styles.groupTitle}>{legend}</legend>
      <div className={styles.chips} data-columns={columns}>
        {group.map((option) => {
          const isSelected = option.key === selected;
          return (
            <span key={option.key} className={styles.chipCell}>
              <button
                type="button"
                className={styles.chip}
                data-selected={isSelected || undefined}
                aria-pressed={isSelected}
                onClick={() => onSelect(option.key)}
              >
                <span className={styles.chipLabel}>{option.label}</span>
                {option.detail ? <span className={styles.chipDetail}>{option.detail}</span> : null}
                {option.pricePence > 0 ? (
                  <span className={styles.chipPrice}>+{formatPrice(option.pricePence)}</span>
                ) : null}
              </button>
              {option.isAbbysChoice ? (
                <span className={styles.abbysChoice}>Abby&apos;s choice</span>
              ) : null}
            </span>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <section className={styles.panel} aria-labelledby="personalise-heading">
      <h2 id="personalise-heading" className={styles.heading}>
        Would you like to personalise this dish?
      </h2>
      <p className={styles.intro}>
        You can choose your portion size, swap proteins, change sides or adjust heat levels.{' '}
        <span className={styles.introMuted}>
          Price and nutritional information update as you personalise.
        </span>
      </p>

      <div className={styles.choice}>
        <button
          type="button"
          className={styles.choiceButton}
          data-selected={enabled || undefined}
          aria-pressed={enabled}
          onClick={() => {
            setEnabled(true);
            setSheetOpen(true);
          }}
        >
          <span className={styles.choiceCheck} aria-hidden="true">
            {enabled ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            ) : null}
          </span>
          <span className={styles.choiceText}>
            <span className={styles.choiceLabel}>Yes, I&apos;d like to personalise this dish</span>
            {enabled ? <span className={styles.choiceSummary}>{summary}</span> : null}
          </span>
        </button>

        <button
          type="button"
          className={styles.choiceButton}
          data-selected={!enabled || undefined}
          aria-pressed={!enabled}
          onClick={() => {
            setEnabled(false);
            setSheetOpen(false);
            setSelection(initial);
          }}
        >
          <span className={styles.choiceCheck} aria-hidden="true">
            {!enabled ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            ) : null}
          </span>
          <span className={styles.choiceText}>
            <span className={styles.choiceLabel}>No, keep as Abby designed it</span>
          </span>
        </button>
      </div>

      {enabled ? (
        <>
          <div
            className={styles.backdrop}
            data-open={sheetOpen || undefined}
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />

          <div className={styles.sheet} data-open={sheetOpen || undefined}>
            <div className={styles.sheetHead}>
              <span className={styles.sheetTitle}>Personalise this dish</span>
              <button
                type="button"
                className={styles.sheetClose}
                onClick={() => setSheetOpen(false)}
                aria-label="Close options"
              >
                ×
              </button>
            </div>

            <div className={styles.sheetBody}>
              {renderGroup(
                'Choose your portion size',
                options.portions,
                selection.portion,
                (portion) => setSelection((s) => ({ ...s, portion })),
                2,
              )}
              {renderGroup(
                'Choose your protein',
                options.proteins,
                selection.protein,
                (protein) => setSelection((s) => ({ ...s, protein })),
                4,
              )}
              {renderGroup(
                'Choose your side',
                options.sides,
                selection.side,
                (side) => setSelection((s) => ({ ...s, side })),
                4,
              )}

              <fieldset className={styles.group}>
                <legend className={styles.groupTitle}>Choose your heat level</legend>
                <div className={styles.chips} data-columns={4}>
                  {options.heatLevels.map((level) => {
                    const isSelected = level.step === selection.heatStep;
                    return (
                      <span key={level.label} className={styles.chipCell}>
                        <button
                          type="button"
                          className={styles.chip}
                          data-selected={isSelected || undefined}
                          aria-pressed={isSelected}
                          onClick={() => setSelection((s) => ({ ...s, heatStep: level.step }))}
                        >
                          <span className={styles.chipLabel}>{level.label}</span>
                        </button>
                        {HEAT_STEPS[dish.heat] === level.step ? (
                          <span className={styles.abbysChoice}>Abby&apos;s choice</span>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            <div className={styles.sheetFoot}>
              <button type="button" className={styles.save} onClick={() => setSheetOpen(false)}>
                Save changes
              </button>
            </div>
          </div>

          {!sheetOpen ? (
            <button type="button" className={styles.reopen} onClick={() => setSheetOpen(true)}>
              Change options
            </button>
          ) : null}
        </>
      ) : null}

      <p className={styles.total}>
        {surchargePence > 0 ? (
          <>
            Personalisation adds <strong>{formatPrice(surchargePence)}</strong> to this dish.
          </>
        ) : (
          <>
            Served {enabled ? 'as selected' : `at ${HEAT_LABELS[dish.heat].toLowerCase()} heat`} with
            no surcharge.
          </>
        )}
      </p>
    </section>
  );
}

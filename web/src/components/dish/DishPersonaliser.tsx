'use client';

import { useEffect, useMemo, useState } from 'react';

import { Nutrition } from '@/components/checkout/DishPicker';
import {
  encodeSelection,
  type MappedOptionGroup,
  type PersonalisationSelection,
} from '@/lib/aonik/map';
import {
  localSurcharge,
  sameSelection,
  selectChoice,
  selectionDraft,
  selectionSummary,
  type PersonalisationDraft,
} from '@/lib/aonik/personalisation';
import { HEAT_LABELS, type Dish } from '@/lib/aonik/types';
import { formatPrice, formatSignedPrice } from '@/lib/format';

import styles from './DishPersonaliser.module.css';

function DishReadout({
  dish,
  optionGroups,
  selection,
  surchargePence,
}: {
  dish: Dish;
  optionGroups: MappedOptionGroup[];
  selection: PersonalisationDraft;
  surchargePence: number | undefined;
}) {
  const label =
    surchargePence === undefined
      ? null
      : surchargePence === 0
        ? '+£0'
        : formatSignedPrice(surchargePence);

  return (
    <div className={styles.readout}>
      {label && surchargePence !== undefined ? (
        <>
          <div>
            <span className={styles.readoutTitle}>Price change</span>
            <span className={styles.readoutValue}>{label}</span>
            <span className={styles.readoutSub}>
              {surchargePence === 0
                ? 'No change'
                : surchargePence > 0
                  ? 'Added to base price'
                  : 'Below base price'}
            </span>
          </div>
          <div className={styles.readoutRule} aria-hidden="true" />
        </>
      ) : null}
      <div>
        <span className={styles.readoutTitle}>Nutritional highlights</span>
        <Nutrition dish={dish} choice={selection} optionGroups={optionGroups} />
      </div>
    </div>
  );
}

interface DishPersonaliserProps {
  dish: Dish;
  optionGroups: MappedOptionGroup[];
  /** Choice keys are emitted in Aonik's canonical One/Multi shape. */
  onChange?: (selection: {
    personalisation?: PersonalisationSelection;
    surchargePence: number | undefined;
  }) => void;
}

export function DishPersonaliser({ dish, optionGroups, onChange }: DishPersonaliserProps) {
  const initial = useMemo(() => selectionDraft(optionGroups), [optionGroups]);
  const [enabled, setEnabled] = useState(false);
  const [selection, setSelection] = useState<PersonalisationDraft>(initial);
  const [sheetOpen, setSheetOpen] = useState(false);

  const surchargePence = useMemo(
    () => (enabled ? localSurcharge(optionGroups, selection) : 0),
    [enabled, optionGroups, selection],
  );

  useEffect(() => {
    if (!onChange) return;
    if (!enabled) {
      onChange({ surchargePence: 0 });
      return;
    }
    onChange({
      personalisation: encodeSelection(optionGroups, selection, true),
      surchargePence,
    });
  }, [onChange, enabled, optionGroups, selection, surchargePence]);

  const updateGroup = (group: MappedOptionGroup, key: string) =>
    setSelection((current) => ({
      ...current,
      [group.key]: selectChoice(group, current[group.key] ?? [], key),
    }));

  return (
    <section className={styles.panel} aria-labelledby="personalise-heading">
      <h2 id="personalise-heading" className={styles.heading}>
        Would you like to personalise this dish?
      </h2>
      <p className={styles.intro}>
        Choose from the options Abby has prepared for this dish.{' '}
        <span className={styles.introMuted}>
          Price and nutritional information update where they can be resolved locally.
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
            {enabled ? (
              <span className={styles.choiceSummary}>
                {selectionSummary(optionGroups, selection)}
              </span>
            ) : null}
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
              {optionGroups.map((group) => (
                <fieldset key={group.key} className={styles.group}>
                  <legend className={styles.groupTitle}>{group.label}</legend>
                  {group.helpText ? <p className={styles.introMuted}>{group.helpText}</p> : null}
                  <div className={styles.chips} data-columns={group.choices.length <= 2 ? 2 : 4}>
                    {group.choices.map((option) => {
                      const selected = selection[group.key]?.includes(option.key) ?? false;
                      return (
                        <span key={option.key} className={styles.chipCell}>
                          <button
                            type="button"
                            className={styles.chip}
                            data-selected={selected || undefined}
                            aria-pressed={selected}
                            onClick={() => updateGroup(group, option.key)}
                          >
                            <span className={styles.chipLabel}>{option.label}</span>
                            {option.detail ? (
                              <span className={styles.chipDetail}>{option.detail}</span>
                            ) : null}
                            {option.pricePence !== 0 ? (
                              <span className={styles.chipPrice}>
                                {formatSignedPrice(option.pricePence)}
                              </span>
                            ) : null}
                          </button>
                          {option.key === group.defaultChoiceKey ? (
                            <span className={styles.abbysChoice}>Abby&apos;s choice</span>
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                </fieldset>
              ))}

              <button
                type="button"
                className={styles.reopen}
                onClick={() => setSelection(initial)}
                disabled={sameSelection(optionGroups, selection, initial)}
              >
                Reset to defaults
              </button>

              <DishReadout
                dish={dish}
                optionGroups={optionGroups}
                selection={selection}
                surchargePence={surchargePence}
              />
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
        {surchargePence === undefined ? (
          <>Your selected combination will be priced when it is added to the cart.</>
        ) : surchargePence > 0 ? (
          <>Personalisation adds <strong>{formatPrice(surchargePence)}</strong> to this dish.</>
        ) : surchargePence < 0 ? (
          <>Personalisation reduces this dish by <strong>{formatPrice(Math.abs(surchargePence))}</strong>.</>
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

'use client';

import Link from 'next/link';
import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import {
  encodeSelection,
  type MappedOptionGroup,
  type PersonalisationSelection,
} from '@/lib/aonik/map';
import {
  linePortion,
  portionModel,
  portionSelection,
  type PortionKey,
} from '@/lib/dish/portions';
import type { Dish, HeatingInstruction } from '@/lib/aonik/types';
import { CONTACT_HREF } from '@/lib/content/navigation';

import styles from './DishInfoPanels.module.css';
import { useOptionalDishOrder } from './DishOrderProvider';
import { useSelectionContent, type SelectionView } from './useSelectionContent';

/**
 * The three expandable panels beneath the CTA: full nutrition, ingredients and
 * allergens, and reheating guidance.
 */
interface DishInfoPanelsProps {
  afterNutrition?: ReactNode;
  dish: Dish;
  heating: HeatingInstruction[];
  /**
   * The step-2 dish modal renders the same three panels at the template's
   * compact scale (19px titles, ringed chevrons, 4-column nutrition rows).
   */
  compact?: boolean;
  optionGroups?: MappedOptionGroup[];
  /** Where "Back to top" should scroll — the modal passes its own scroller. */
  onBackToTop?: () => void;
  /**
   * The customer's choices (Add Dishes, Review): `null` for the standard
   * preparation; left out, read from the dish page's order state. For other
   * choices the panels describe THOSE choices (`useSelectionContent`), never
   * the standard recipe's declaration.
   */
  selection?: PersonalisationSelection | null;
}

type PanelId = 'nutrition' | 'ingredients' | 'heating';

const PANEL_IDS: PanelId[] = ['nutrition', 'ingredients', 'heating'];

/** The template's 22px warning triangle beside the allergen statement. */
function AllergenIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green-forest)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 4.3 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

const PANEL_ICONS: Record<PanelId, ReactNode> = {
  nutrition: (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green-forest)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 20h18" />
      <path d="M6 20v-6" />
      <path d="M12 20V5" />
      <path d="M18 20v-9" />
    </svg>
  ),
  ingredients: (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green-forest)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21V8" />
      <path d="M12 8c0-2.2-1.4-4-3.2-4C8.8 6.2 10.2 8 12 8z" />
      <path d="M12 8c0-2.2 1.4-4 3.2-4C15.2 6.2 13.8 8 12 8z" />
    </svg>
  ),
  heating: (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green-forest)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 15c-1-1-1-2.4 0-3.4C9 10.6 9 9.2 8 8.2" />
      <path d="M12 15c-1-1-1-2.4 0-3.4 1-1 1-2.4 0-3.4" />
      <path d="M16 15c-1-1-1-2.4 0-3.4 1-1 1-2.4 0-3.4" />
    </svg>
  ),
};

function Panel({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: PanelId;
  title: string;
  open: boolean;
  onToggle: () => void;
  onBackToTop?: () => void;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel} id={`dish-${id}`}>
      <h2 className={styles.headingWrap}>
        <button
          type="button"
          className={styles.head}
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`dish-${id}-body`}
        >
          <span className={styles.icon} aria-hidden="true">
            {PANEL_ICONS[id]}
          </span>
          <span className={styles.title}>{title}</span>
          <svg
            className={styles.chevron}
            data-open={open || undefined}
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h2>
      {open ? (
        <div className={styles.body} id={`dish-${id}-body`}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function DishInfoPanels({
  dish: standard,
  heating: standardHeating,
  compact,
  onBackToTop,
  selection,
  optionGroups,
  afterNutrition,
}: DishInfoPanelsProps) {
  const order = useOptionalDishOrder();
  const chosen =
    selection === undefined
      ? (order?.choice.personalisation ?? null)
      : selection;
  const groups = optionGroups ?? order?.optionGroups ?? [];
  const model = portionModel(groups);
  const controlName = useId();
  const extraGroup =
    !model && groups.length === 1 && groups[0].selectionMode === 'One'
      ? groups[0]
      : null;
  const purchaseKey = JSON.stringify(chosen);
  const [extraPreview, setExtraPreview] = useState<{
    purchaseKey: string;
    choice: string;
  } | null>(null);
  const extraChoice =
    extraPreview?.purchaseKey === purchaseKey
      ? extraPreview.choice
      : extraGroup
        ? String(chosen?.[extraGroup.key] ?? extraGroup.defaultChoiceKey)
        : '';
  const purchased = linePortion(chosen ?? undefined) ?? 'light';
  const [preview, setPreview] = useState<{
    purchase: PortionKey;
    portion: PortionKey;
  } | null>(null);
  const portion = preview?.purchase === purchased ? preview.portion : purchased;
  const view = useSelectionContent(standard, standardHeating, chosen);
  const nutritionView = useSelectionContent(
    standard,
    standardHeating,
    model
      ? (portionSelection(portion) ?? null)
      : extraGroup
        ? (encodeSelection(groups, { [extraGroup.key]: [extraChoice] }) ?? null)
        : chosen,
  );
  const controls = model ? (
    <fieldset className={styles.nutritionSwitch}>
      <legend>Nutrition per portion</legend>
      {model.choices.map((choice) => (
        <label key={choice.key}>
          <input
            type="radio"
            name={controlName}
            checked={portion === choice.key}
            onChange={() =>
              setPreview({
                purchase: purchased,
                portion: choice.key as PortionKey,
              })
            }
          />
          {choice.label}
        </label>
      ))}
    </fieldset>
  ) : extraGroup ? (
    <fieldset className={styles.nutritionSwitch}>
      <legend>Compare nutrition</legend>
      {extraGroup.choices.map((choice) => (
        <label key={choice.key}>
          <input
            type="radio"
            name={controlName}
            checked={extraChoice === choice.key}
            onChange={() =>
              setExtraPreview({ purchaseKey, choice: choice.key })
            }
          />
          {choice.label}
        </label>
      ))}
    </fieldset>
  ) : undefined;
  return (
    <DishInfoPanelsView
      view={view}
      compact={compact}
      onBackToTop={onBackToTop}
      nutritionView={model || extraGroup ? nutritionView : undefined}
      nutritionControls={controls}
      afterNutrition={afterNutrition}
    />
  );
}

/** The panels for one view of the dish (`useSelectionContent`): what they say in each state. */
export function DishInfoPanelsView({
  view: { dish, heating, forSelection, state: selectionState },
  compact,
  onBackToTop,
  nutritionView,
  nutritionControls,
  afterNutrition,
}: {
  afterNutrition?: ReactNode;
  nutritionView?: SelectionView;
  nutritionControls?: ReactNode;
  view: SelectionView;
  compact?: boolean;
  onBackToTop?: () => void;
}) {
  const checking = selectionState === 'pending';
  const unchecked = selectionState === 'unavailable';
  const [open, setOpen] = useState<Record<PanelId, boolean>>({
    nutrition: true,
    ingredients: true,
    heating: true,
  });

  const toggle = (id: PanelId) =>
    setOpen((current) => ({ ...current, [id]: !current[id] }));

  /*
   * SAFETY (Aonik Spec 067). Declarations are gated on the resolution FLAG, not
   * on whether a string arrived. Aonik sets `declarationsWithheld` whenever
   * either half is unauthored while still returning the half that IS — so a
   * presence check would print the ingredients and silently drop the allergen
   * line. `mapResolvedContent` already strips both, and this is the second
   * guard: a `Dish` assembled by any other route is still handled correctly.
   *
   * Fixture dishes carry no `contentState`, so they fall back to presence,
   * which is exactly right for data that was never a resolution.
   */
  const state = dish.contentState;
  const withheld = state?.declarationsWithheld ?? false;
  const ingredients = withheld ? undefined : dish.ingredients;
  const allergens = withheld ? undefined : dish.allergens;
  const precaution = withheld ? undefined : dish.precautionaryStatement;

  /*
   * Figures fall back to the default block; declarations never do. Either flag
   * alone is sufficient to caption — `isStale` matters most, because it is the
   * case where `isStandardPreparation` is false yet the figures are no longer
   * current, and it would otherwise pass as fact.
   */
  const figuresCaption =
    [
      state?.figuresAreStandardPreparation
        ? 'These figures are for the standard preparation.'
        : '',
      // Both when both hold: the standard block standing in for other choices
      // can itself be under review, and that must not be lost.
      state?.figuresAreStale
        ? 'These figures are under review and may not reflect the current recipe.'
        : '',
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  const servingCaption =
    state?.servingLabel ?? 'Per serving, as Abby designed it.';

  /* Heating withheld (or never authored) means the caller passed the generic
     catalogue-wide steps, which must be framed as such. */
  const isGenericHeating = state?.heatingWithheld ?? false;

  /* Once the panels have described other choices, going back to the standard
     recipe is a change to announce too; on arrival there is nothing to say. */
  const [describedChoices, setDescribedChoices] = useState(false);
  useEffect(() => {
    if (forSelection) setDescribedChoices(true);
  }, [forSelection]);

  /* What the panels now say about the customer's choices, for a screen reader:
     the region is always rendered, so a change of choice is announced. */
  const announcement = !forSelection
    ? describedChoices
      ? 'Showing the ingredients and allergens for the standard recipe.'
      : ''
    : checking
      ? 'Checking the ingredients and allergens for your choices…'
      : unchecked
        ? 'We couldn’t check the ingredients and allergens for your choices just now.'
        : allergens
          ? 'Ingredients and allergens updated for your choices.'
          : 'Allergen information for the choices you’ve made is not yet published.';

  const nutritionDish = nutritionView?.dish ?? dish;
  const exact =
    !nutritionView ||
    (!nutritionDish.contentState?.figuresAreStale &&
      (nutritionView.state === 'standard' ||
        (nutritionView.state === 'resolved' &&
          !nutritionDish.contentState?.figuresAreStandardPreparation)));
  const nutrition = exact ? nutritionDish.nutrition : {};
  const cells: { label: string; value: string }[] = [
    nutrition.calories !== undefined && {
      label: 'kcal',
      value: String(nutrition.calories),
    },
    nutrition.proteinGrams !== undefined && {
      label: 'Protein',
      value: `${nutrition.proteinGrams}g`,
    },
    nutrition.carbsGrams !== undefined && {
      label: 'Carbs',
      value: `${nutrition.carbsGrams}g`,
    },
    nutrition.fatGrams !== undefined && {
      label: 'Fat',
      value: `${nutrition.fatGrams}g`,
    },
    nutrition.fibreGrams !== undefined && {
      label: 'Fibre',
      value: `${nutrition.fibreGrams}g`,
    },
    nutrition.sugarsGrams !== undefined && {
      label: 'Sugars',
      value: `${nutrition.sugarsGrams}g`,
    },
    nutrition.saltGrams !== undefined && {
      label: 'Salt',
      value: `${nutrition.saltGrams}g`,
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className={styles.panels} data-compact={compact || undefined}>
      <p className="visuallyHidden" role="status">
        {announcement}
      </p>
      <Panel
        id={PANEL_IDS[0]}
        title="Nutrition"
        open={open.nutrition}
        onToggle={() => toggle('nutrition')}
        onBackToTop={onBackToTop}
      >
        <>
          {nutritionControls}
          <p className={styles.caption}>
            {nutritionView?.dish.contentState?.servingLabel ?? servingCaption}
          </p>
          {cells.length === 0 && (
            <p>Nutrition for this portion is not yet available.</p>
          )}
        </>
        <dl
          className={styles.nutritionGrid}
          style={{ '--cells': cells.length } as CSSProperties}
        >
          {cells.map((cell) => (
            <div key={cell.label} className={styles.nutritionCell}>
              <dt className={styles.nutritionLabel}>{cell.label}</dt>
              <dd className={styles.nutritionValue}>{cell.value}</dd>
            </div>
          ))}
        </dl>
        {!nutritionView && figuresCaption ? (
          <p className={styles.figuresNote}>{figuresCaption}</p>
        ) : null}
      </Panel>
      {afterNutrition}
      <Panel
        id={PANEL_IDS[1]}
        title="Ingredients & allergens"
        open={open.ingredients}
        onToggle={() => toggle('ingredients')}
        onBackToTop={onBackToTop}
      >
        {ingredients ? (
          <p className={styles.ingredients}>{ingredients}</p>
        ) : (
          <p className={styles.ingredients}>
            {checking
              ? 'Checking the ingredients for your choices…'
              : unchecked
                ? 'We couldn’t check the ingredient list for the choices you’ve made just now.'
                : forSelection
                  ? 'The ingredient list for the choices you’ve made has not been published yet.'
                  : 'The ingredient list for this dish has not been published yet.'}
          </p>
        )}

        {allergens ? (
          <div className={styles.allergens}>
            <AllergenIcon />
            <span>
              <strong>Allergens:</strong> {allergens}
              {/* The kitchen's own statement, as authored (aonik#351). */}
              {precaution ? (
                <span className={styles.precaution}>{precaution}</span>
              ) : null}
            </span>
          </div>
        ) : checking ? (
          /* Neither the standard declaration nor "not published" while the
             answer for these choices is on its way. */
          <div className={styles.allergens}>
            <AllergenIcon />
            <span>
              <strong>Checking the allergens for your choices…</strong>
            </span>
          </div>
        ) : (
          /* Never guess allergens. Absent data is stated plainly and routed to a
             human: "please contact us" means ask a person (Contact), not the
             general Allergens page, which says nothing about this dish. */
          <div className={styles.allergens} role="note">
            <AllergenIcon />
            <span>
              <strong>
                {unchecked
                  ? 'We couldn’t check the allergens for the choices you’ve made just now.'
                  : forSelection
                    ? 'Allergen information for the choices you’ve made is not yet published.'
                    : 'Allergen information is not yet published for this dish.'}
              </strong>{' '}
              If you have an allergy or intolerance, please{' '}
              <Link href={CONTACT_HREF} className={styles.allergensLink}>
                contact us
              </Link>{' '}
              before ordering.
            </span>
          </div>
        )}
      </Panel>

      <Panel
        id={PANEL_IDS[2]}
        title="Heating & storage"
        open={open.heating}
        onToggle={() => toggle('heating')}
        onBackToTop={onBackToTop}
      >
        {heating.length > 0 ? (
          <ul className={styles.heating}>
            {heating.map((instruction) => (
              <li key={instruction.method} className={styles.heatingItem}>
                <span className={styles.heatingMethod}>
                  {instruction.method}
                </span>
                <p className={styles.heatingBody}>{instruction.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          /* Never the standard preparation's timings for other choices. */
          <p className={styles.ingredients}>
            {checking
              ? 'Checking how to heat your choices…'
              : unchecked
                ? 'We couldn’t check how to heat the choices you’ve made just now.'
                : forSelection
                  ? 'Heating instructions for the choices you’ve made have not been published yet.'
                  : 'Heating instructions for this dish have not been published yet.'}
          </p>
        )}
        {/* Generic guidance is allowed here — unlike allergens, reheating has a
            safe default — but it is framed so it is never mistaken for
            dish-specific instructions the kitchen actually authored. */}
        {/* Only ever the standard preparation's: other choices get their own
            authored steps or none (`useSelectionContent`). */}
        {isGenericHeating && heating.length > 0 && !forSelection ? (
          <p className={styles.heatingNote}>
            General guidance — specific instructions for this dish have not been
            published yet.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}

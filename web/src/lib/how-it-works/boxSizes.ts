/**
 * The How it works size picker, as data — deliberately free of React so the
 * rules are unit-tested on their own (tests/how-it-works.test.tsx).
 *
 * Sources: design/Abby's Table - How It Works v2.dc.html (step 1),
 * design/build-handoff.md §3v and design/frontend-backend-contract.md §4c.
 *
 * Everything priced here comes from the tenant's box plan
 * (`StorefrontConfig.box`). Nothing is computed that the plan does not
 * publish: a preset's saving is shown only when it is AUTHORED, and the custom
 * option's "From" figure is the price of a box at the plan's minimum size only
 * when a preset sits exactly at that size — the embedded plan carries no base
 * price, so any other figure would be invented.
 */

import type { StorefrontBoxPlan } from '@/lib/aonik/types';
import { formatPrice, joinWithOr } from '@/lib/format';

/** Where every purchase link on the page goes: Choose Box, step 1. */
export const BOX_BUILDER_PATH = '/box';

/**
 * The query parameter that carries the choice (contract §4c):
 * `?dishes=6|12|18|custom`. Choose Box reading it is #28, not this page.
 */
export const DISHES_PARAM = 'dishes';

/** The parameter value for "Set your own". Never a count — see contract §4c. */
export const CUSTOM_SIZE_ID = 'custom';

/** `formatPrice` is sterling-only; a plan in any other currency is not priced. */
const PRICED_CURRENCY = 'GBP';

export interface BoxSizeOption {
  /** The `?dishes=` value: a preset's size ("6", "12", "18") or "custom". */
  id: string;
  kind: 'preset' | 'custom';
  /** The preset's size, or the plan's minimum for the custom option. */
  dishes: number;
  /** The large figure on the button: "12", or "6+" for the custom option. */
  label: string;
  /** The small caps line under the figure — "Custom" on the custom option only. */
  subLabel: string | null;
  /**
   * Appended to the visible label for assistive tech, so "12" is announced as
   * "12 dishes". The visible text stays first in the name (WCAG 2.5.3).
   */
  srSuffix: string;
  /** The "From" figure in pence, or null when the plan cannot express one. */
  pricePence: number | null;
  /** The authored display saving in pence; null when there is none to show. */
  savingPence: number | null;
}

export interface BoxSizeModel {
  options: BoxSizeOption[];
  /** The option selected on first render (and with no JavaScript). */
  defaultId: string | null;
  /** The plan's minimum box size, or null when the tenant has no plan. */
  minDishes: number | null;
}

const EMPTY_MODEL: BoxSizeModel = { options: [], defaultId: null, minDishes: null };

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const isPence = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/**
 * Turns the tenant's box plan into the picker's options: the presets in size
 * order, then "Set your own".
 *
 * Defensive about the plan's shape because it is tenant-authored: a preset
 * outside the plan's own range, a duplicated size or a non-integer price is
 * dropped or left unpriced rather than shown as though it were real.
 */
export function buildBoxSizeModel(plan: StorefrontBoxPlan | null | undefined): BoxSizeModel {
  if (!plan || !isCount(plan.minSize) || !isCount(plan.maxSize) || plan.maxSize < plan.minSize) {
    return EMPTY_MODEL;
  }

  const { minSize, maxSize } = plan;
  const priced = plan.currency?.toUpperCase() === PRICED_CURRENCY;

  const presets = (plan.presets ?? [])
    .filter((preset) => isCount(preset.size) && preset.size >= minSize && preset.size <= maxSize)
    .sort((a, b) => a.size - b.size)
    // One button per size: a duplicated preset keeps its first authored entry.
    .filter((preset, index, sorted) => index === 0 || sorted[index - 1].size !== preset.size);

  const options: BoxSizeOption[] = presets.map((preset) => {
    const pricePence = priced && isPence(preset.pricePence) ? preset.pricePence : null;
    const saving = preset.savingPence;
    return {
      id: String(preset.size),
      kind: 'preset',
      dishes: preset.size,
      label: String(preset.size),
      subLabel: null,
      srSuffix: ' dishes',
      pricePence,
      // A saving beside no price would be meaningless, so it needs both.
      savingPence: pricePence !== null && isPence(saving) && saving > 0 ? saving : null,
    };
  });

  /*
   * "Set your own" needs a range to set it in AND a way to price what is set:
   * the plan's marginal rate. `StorefrontBoxPlan.perSpacePence` absent means
   * "presets only" (types.ts), so such a plan offers no custom option and no
   * `?dishes=custom` link exists anywhere on the page.
   */
  if (maxSize > minSize && isPence(plan.perSpacePence)) {
    const atMinimum = options.find((option) => option.dishes === minSize);
    options.push({
      id: CUSTOM_SIZE_ID,
      kind: 'custom',
      dishes: minSize,
      label: `${minSize}+`,
      subLabel: 'Custom',
      srSuffix: ` (set your own quantity, from ${minSize} dishes)`,
      // The minimum box's price — "From" means exactly that. Never a saving:
      // the quantity is not known until the box is built (handoff §3v).
      pricePence: atMinimum?.pricePence ?? null,
      savingPence: null,
    });
  }

  if (options.length === 0) return { ...EMPTY_MODEL, minDishes: minSize };

  const defaultOption =
    options.find((option) => option.kind === 'preset' && option.dishes === minSize) ?? options[0];

  return { options, defaultId: defaultOption.id, minDishes: minSize };
}

/**
 * The href every purchase link on the page carries (contract §4c). An unknown
 * or absent choice sends the customer to Choose Box with no parameter, which
 * falls back to that page's own default.
 */
export function boxBuilderHref(optionId: string | null | undefined): string {
  if (!optionId) return BOX_BUILDER_PATH;
  const params = new URLSearchParams({ [DISHES_PARAM]: optionId });
  return `${BOX_BUILDER_PATH}?${params.toString()}`;
}

/** The selected option, falling back to the model's default. */
export function selectedOption(
  model: Pick<BoxSizeModel, 'options' | 'defaultId'>,
  selectedId: string | null | undefined,
): BoxSizeOption | null {
  const { options, defaultId } = model;
  return (
    options.find((option) => option.id === selectedId) ??
    options.find((option) => option.id === defaultId) ??
    options[0] ??
    null
  );
}

export interface PriceReadout {
  /** "£158", or null when the option cannot be priced from the data. */
  price: string | null;
  /** "Save £10", or null when the option carries no authored saving. */
  saving: string | null;
}

/** The "From £x" read-out's strings for one option, formatted at the edge. */
export function priceReadout(option: BoxSizeOption | null): PriceReadout {
  if (!option || option.pricePence === null) return { price: null, saving: null };
  return {
    price: formatPrice(option.pricePence),
    saving: option.savingPence !== null ? `Save ${formatPrice(option.savingPence)}` : null,
  };
}

const SMALL_COUNTS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** "six" for running copy, as the design writes it; figures from 10 up. */
export function countInWords(count: number): string {
  return SMALL_COUNTS[count - 1] ?? String(count);
}

/**
 * Step 1's opening sentence, with its counts taken from the plan:
 * "Start with 6, 12 or 18 dishes, or set your own quantity from six upwards."
 */
export function sizesSentence(model: BoxSizeModel): string {
  const presets = model.options.filter((option) => option.kind === 'preset');
  const hasCustom = model.options.some((option) => option.kind === 'custom');
  const sizes = joinWithOr(presets.map((option) => option.label));
  const fromMinimum =
    model.minDishes !== null ? ` from ${countInWords(model.minDishes)} upwards` : '';

  if (presets.length > 0 && hasCustom) {
    return `Start with ${sizes} dishes, or set your own quantity${fromMinimum}.`;
  }
  if (presets.length > 0) return `Start with ${sizes} dishes.`;
  if (hasCustom) return `Set your own quantity${fromMinimum}.`;
  return 'Start by choosing your box size.';
}

/** The closing band's lede: "Choose at least six dishes, select your portion size, …". */
export function closingSentence(minDishes: number | null): string {
  const dishes =
    minDishes !== null ? `Choose at least ${countInWords(minDishes)} dishes` : 'Choose your dishes';
  return `${dishes}, select your portion size, and pick your delivery date.`;
}

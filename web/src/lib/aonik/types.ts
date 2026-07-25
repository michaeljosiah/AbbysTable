/**
 * Domain models for commerce data served by the Aonik admin API.
 *
 * These types are the contract between the storefront and Aonik. Until the API
 * exists, `MockAonikClient` satisfies them from static fixtures — so swapping in
 * the real transport is a one-line change in `getAonikClient()` and nothing in
 * the component tree moves.
 *
 * Money is always in minor units (pence) to keep arithmetic exact; format at the
 * edge with `formatPrice()`.
 */

export type HeatLevel = 'low' | 'medium' | 'high';

/** Heat as a 0-3 step, so the menu's spice facet can compare numerically. */
export const HEAT_STEPS: Record<HeatLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/**
 * Card labels. The homepage template called step 1 "Low" and the menu template
 * calls it "Mild"; "Mild" is used throughout so the card label matches the
 * vocabulary of the menu's spice filter.
 */
export const HEAT_LABELS: Record<HeatLevel, string> = {
  low: 'Mild',
  medium: 'Medium',
  high: 'High',
};

/**
 * Homepage merchandising category, driving the "A taste of the table" rail.
 *
 * NOTE: this overlaps with `WellnessGoal` below — three of its four values are
 * also wellness goals. The two taxonomies come from two different design
 * templates; Aonik should reconcile them into one. Neither is derived from the
 * other here, because the mapping for "Everyday balance" is not knowable.
 */
export const DISH_CATEGORIES = [
  'Carb-conscious',
  'Protein-led',
  'Plant-led',
  'Everyday balance',
] as const;

export type DishCategory = (typeof DISH_CATEGORIES)[number];

/** Menu facet: the dish's primary protein. */
export const PROTEIN_TYPES = [
  'Chicken',
  'Beef',
  'Lamb',
  'Fish',
  'Turkey',
  'Plant-based',
] as const;

export type ProteinType = (typeof PROTEIN_TYPES)[number];

/** Menu facet: nutrition positioning. */
export const WELLNESS_GOALS = [
  'Carb-conscious',
  'Protein-led',
  'Mediterranean-inspired',
  'DASH',
  'Plant-led',
] as const;

export type WellnessGoal = (typeof WELLNESS_GOALS)[number];

/** Menu facet: format of the dish. */
export const MEAL_TYPES = ['Bowl', 'Soup', 'Stew', 'Salad'] as const;

export type MealType = (typeof MEAL_TYPES)[number];

/** Menu facet: dietary suitability. */
export const DIETARY_TAGS = ['Gluten-free', 'Dairy-free', 'High-fibre'] as const;

export type DietaryTag = (typeof DIETARY_TAGS)[number];

/** Attributes a customer may change on a dish when building a box. */
export type PersonalisationOption = 'portion' | 'protein' | 'sides' | 'heat';

export interface DishNutrition {
  /**
   * Every figure is optional because every figure can genuinely be unpublished,
   * and a nutrition panel is a factual claim about food.
   *
   * These two were once required, which made "not published" inexpressible and
   * forced the mappers to write 0 — so a browse row, whose summary DTO carries
   * no fibre at all, rendered "Fibre 0g" over a dish with 9g. A zero is a claim;
   * absence is the truth. Callers omit the figure rather than default it.
   */
  proteinGrams?: number;
  fibreGrams?: number;
  /** Full macros come from the menu catalogue; older fixtures may omit them. */
  carbsGrams?: number;
  fatGrams?: number;
  calories?: number;
  /** Only published for dishes with a full nutrition panel. */
  sugarsGrams?: number;
  saltGrams?: number;
}

/**
 * Reheating guidance. Generic across the catalogue in the design template, so it
 * is served once by the client rather than stored per dish.
 */
export interface HeatingInstruction {
  method: string;
  body: string;
}

/**
 * One selectable value in the dish personaliser (a portion size, a protein swap,
 * a side). `pricePence` is the surcharge on top of the dish.
 */
export interface DishOption {
  key: string;
  label: string;
  pricePence: number;
  /** Rendered as a secondary line, e.g. a portion weight. */
  detail?: string;
  /** Abby's recommended default for this group. */
  isAbbysChoice?: boolean;
}

export interface PersonalisationOptions {
  portions: DishOption[];
  proteins: DishOption[];
  sides: DishOption[];
  /** Selectable heat, including "None". Steps match `HEAT_STEPS`. */
  heatLevels: { label: string; step: number }[];
}

export interface Dish {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  heat: HeatLevel;
  /** Merchandising badges, e.g. "New", "Under 500 kcal". */
  tags: string[];
  /** One of Abby's specials: adds a badge and an upgrade charge. */
  isSignature: boolean;
  /** Surcharge in pence, set only when `isSignature`. */
  upgradePence?: number;
  nutrition: DishNutrition;
  personalisation: PersonalisationOption[];
  /** Shown in the homepage's curated rail. */
  isFeatured: boolean;

  /** Homepage rail category. Absent for dishes that only appear on the menu. */
  category?: DishCategory;

  // Menu facets. Absent on dishes carried over from the homepage design, which
  // never specified them — those dishes simply do not match those filters.
  proteinType?: ProteinType;
  mealType?: MealType;
  wellness: WellnessGoal[];
  dietary: DietaryTag[];

  /**
   * Ingredient list and allergen declaration, shown on the dish page.
   *
   * SAFETY: these are deliberately optional and are NEVER inferred. Only dishes
   * whose data the source templates actually published carry them; every other
   * dish renders an explicit "not yet published" state instead. Do not populate
   * these from anything but the real catalogue.
   *
   * When they come from Aonik, `mapResolvedContent` clears BOTH the moment
   * `declarationsWithheld` is set — including the half Aonik still returns — so
   * a component that checks presence alone is safe. `contentState` carries the
   * flags for the captions that presence cannot express.
   */
  ingredients?: string;
  allergens?: string;

  /** Present only on dishes resolved from Aonik content. See `DishContentState`. */
  contentState?: DishContentState;
}

/**
 * Aonik's content-resolution flags, carried so the dish page can caption
 * correctly. Absent on fixture dishes, which have no resolution behind them.
 *
 * SAFETY: `figuresAreStandardPreparation` and `figuresAreStale` are separate on
 * purpose. Aonik withholds declarations when content is stale but still serves
 * the nutrition figures, and `isStandardPreparation` is FALSE when the customer
 * is viewing the standard preparation itself — so without the stale flag those
 * figures would render as current fact with no caption.
 */
export interface DishContentState {
  /** e.g. "Per serving — Light table 225g". */
  servingLabel: string;
  /** Declarations were withheld; the panel shows its "not yet published" state. */
  declarationsWithheld: boolean;
  /** Figures are the default block's because this combination has no variant. */
  figuresAreStandardPreparation: boolean;
  /** The default block no longer describes the current standard preparation. */
  figuresAreStale: boolean;
  /** Reheating guidance was withheld; show the framed generic fallback. */
  heatingWithheld: boolean;
  /**
   * Authored reheating steps from this same resolution. Empty when withheld or
   * unauthored — carried here so the dish page needs no second round trip.
   */
  heating: HeatingInstruction[];
  /** Pass back verbatim as `v` when re-resolving for a selection. */
  contentVersion: number;
}

export interface BoxOffer {
  id: string;
  name: string;
  dishCount: number;
  pricePence: number;
  /** Short supporting line rendered under the price. */
  blurb?: string;
  /** Card flag, e.g. "Most popular", "Best value", "Minimum order". */
  badge?: string;
  /** Saving against the per-dish list price, in pence. */
  savingPence?: number;
}

/**
 * Build-your-own box: any count in range, priced off Aonik's plan formula
 * `basePence + (size - baseDishes) * perSpacePence`.
 *
 * NOT a per-dish rate. This carried only the marginal rate under the name
 * `perDishPence`, so both callers reached for `size * perDishPence` — which
 * quoted every custom box £7 over what Aonik charges, because it billed the
 * first `baseDishes` at the marginal rate instead of at `basePence`. The base
 * pair is here so the real formula is expressible, and the rate is named for
 * what it is so the wrong multiplication no longer reads as correct.
 *
 * Use `customBoxPricePence` rather than doing the arithmetic at the call site.
 */
export interface CustomBoxPricing {
  minDishes: number;
  maxDishes: number;
  /** Dishes included in `basePence` before the marginal rate applies. */
  baseDishes: number;
  /** Price of a box of exactly `baseDishes`. */
  basePence: number;
  /** What each space ABOVE `baseDishes` adds. */
  perSpacePence: number;
}

/** Delivery charge line: struck-through list price and what is charged now. */
export interface DeliveryPricing {
  listPence: number;
  pricePence: number;
}

/**
 * The full box catalogue used by the builder. Preset tiers plus the
 * build-your-own scale, and the surcharge for dishes added beyond the box.
 */
export interface BoxPricing {
  presets: BoxOffer[];
  custom: CustomBoxPricing;
  /** Cost of one dish added on top of the chosen box size. */
  extraDishPence: number;
  /**
   * Optional so the row disappears rather than showing an invented price when
   * Aonik doesn't return one. The checkout templates publish £10 → Free.
   */
  delivery?: DeliveryPricing;
}

/**
 * The earliest-delivery promise.
 *
 * A CALENDAR DATE plus the timezone whose calendar it belongs to — never an
 * instant. Aonik answers 404 when the tenant has no resolvable fulfilment
 * calendar, which means "no promise", not an error: `getDeliveryWindow()`
 * returns null and every surface that would show a date shows nothing instead.
 */
export interface DeliveryWindow {
  /** ISO-8601 date (YYYY-MM-DD) of the earliest dispatch slot. */
  earliestDeliveryDate: string;
  /** IANA id, e.g. "Europe/London" — the calendar the date is expressed in. */
  timezone: string;
}

/* ---- Storefront config ----------------------------------------------------
   Aonik's `GET /commerce/config/storefront`: the tenant-authored settings the
   storefront must not hard-code. Money arrives in pence like everything else.
   The endpoint never 404s — an unconfigured tenant gets a defaults document. */

/** One authored size point in the box plan. */
export interface StorefrontBoxPreset {
  size: number;
  pricePence: number;
  badge?: string;
  blurb?: string;
  /**
   * Authored display saving — never computed. Only presets can carry one:
   * there is no list price for a custom size anywhere in the plan.
   */
  savingPence?: number;
}

/** The default box bundle's embedded size plan, or absent when unset. */
export interface StorefrontBoxPlan {
  minSize: number;
  maxSize: number;
  /** The plan's OWN currency, which may differ from the document's. */
  currency: string;
  /** Marginal price per space; absent means "presets only". */
  perSpacePence?: number;
  presets: StorefrontBoxPreset[];
}

export interface StorefrontConfig {
  /** Canonical tenant currency. */
  currency: string;
  /** Label for the recommended choice — today "Abby's choice". */
  recommendedChoiceLabel: string;
  resultsPageSize: number;
  /** Storefront-defined JSON, served and stored verbatim. */
  backToTopTrigger: unknown;
  /** Display amounts: struck-through list vs charged now. 0 renders as free. */
  delivery: { listPence: number; chargedPence: number };
  /** Which bundle product the box builder uses. */
  defaultBoxSlug?: string;
  /** The collection whose members are the Step 3 extras rail. */
  extrasCollectionSlug?: string;
  box?: StorefrontBoxPlan;
}

/* ---- Extras (Step 3) ------------------------------------------------------ */

export const EXTRA_CATEGORIES = ['Small chops', 'Sides', 'Snacks', 'Drinks', 'Sauces'] as const;
export type ExtraCategory = (typeof EXTRA_CATEGORIES)[number];

export interface ExtraOptionChoice {
  key: string;
  label: string;
  /** Added to the base price when this choice is selected. */
  addPence: number;
}

/** A single option group ("Size", "Heat") on an extra. */
export interface ExtraOption {
  kind: string;
  choices: ExtraOptionChoice[];
}

export type ExtraServeStyle = 'hot' | 'chilled' | 'ambient';

/**
 * À-la-carte item sold alongside the box. Unlike dishes, the extras template
 * publishes complete nutrition, ingredients and allergens for every item.
 */
export interface Extra {
  id: string;
  name: string;
  category: ExtraCategory;
  pricePence: number;
  /** Card copy (2-line clamp). */
  description: string;
  /** Detail-modal copy. */
  longDescription: string;
  imageUrl: string;
  option?: ExtraOption;
  nutrition: DishNutrition;
  /**
   * SAFETY: optional and NEVER inferred, exactly as on `Dish`.
   *
   * The extras design template published these for every item, so the fixtures
   * always carry them — but Aonik withholds declarations whenever resolved
   * content is stale, and an extra with withheld declarations must render its
   * "not yet published" state. An EMPTY allergen list means "declared, and
   * there are none"; ABSENT means "we do not know". Rendering the second as the
   * first would tell someone a food is safe for them when nobody has said so.
   */
  ingredients?: string;
  allergens?: string[];
  serveStyle: ExtraServeStyle;
  /** Reheating / serving guidance from the catalogue. */
  heating: string;
}

/** Everything the homepage needs, resolved in one pass. */
export interface HomepageData {
  dishes: Dish[];
  boxes: BoxOffer[];
  /** Null when the tenant publishes no promise. */
  delivery: DeliveryWindow | null;
}

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
  proteinGrams: number;
  fibreGrams: number;
  /** Full macros come from the menu catalogue; older fixtures may omit them. */
  carbsGrams?: number;
  fatGrams?: number;
  calories?: number;
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
}

export interface BoxOffer {
  id: string;
  name: string;
  dishCount: number;
  pricePence: number;
  /** Short supporting line rendered under the price. */
  blurb?: string;
}

export interface DeliveryWindow {
  /** ISO-8601 date (YYYY-MM-DD) of the earliest dispatch slot. */
  earliestDeliveryDate: string;
}

/** Everything the homepage needs, resolved in one pass. */
export interface HomepageData {
  dishes: Dish[];
  boxes: BoxOffer[];
  delivery: DeliveryWindow;
}

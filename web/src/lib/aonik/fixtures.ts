/**
 * Static fixtures standing in for the Aonik admin API.
 *
 * Values are lifted from the two design templates so the storefront renders
 * exactly what was designed. Replace by pointing `AONIK_API_URL` at the real API
 * — nothing here is imported outside `MockAonikClient`.
 *
 * The catalogue is the union of both templates' dish lists:
 *  - The menu template supplies eight dishes with full facet data.
 *  - The homepage template adds two more ("Suya ribeye", "Slow-braised egusi")
 *    that the menu design never listed, so they carry no protein/wellness/meal/
 *    dietary attributes and no full macros. Those were not invented; the dishes
 *    simply drop out when a facet filter is applied. Aonik should fill them in.
 *
 * `isFeatured` marks the six dishes the homepage rail was designed to show.
 *
 * NOTE: "Wild rice, goat efo" carries an "Under 500 kcal" badge but 520 kcal.
 * That contradiction is in the source template and is preserved here rather than
 * silently corrected — worth confirming with the real catalogue.
 *
 * NOTE: the ten dishes share three photographs; that is how the templates ship.
 *
 * Demo personalisation starts in Aonik's absolute-price DTO shape and is mapped
 * through the same adapter as live data. Components never receive a
 * fixture-only option shape.
 */

import type { EffectiveOptionGroupDto } from './dto';
import type {
  BoxOffer,
  BoxPricing,
  DeliveryWindow,
  Dish,
  HeatingInstruction,
  StorefrontConfig,
} from './types';

export const DISH_FIXTURES: Dish[] = [
  {
    id: 'dish-wild-rice-goat-efo',
    slug: 'wild-rice-goat-efo',
    title: 'Wild rice, goat efo',
    description: 'Slow-cooked goat in a rich spinach efo, over nutty wild rice.',
    imageUrl: '/assets/dish-goat-efo.png',
    heat: 'medium',
    tags: ['New', 'Under 500 kcal'],
    isSignature: false,
    nutrition: { proteinGrams: 32, carbsGrams: 31, fatGrams: 11, calories: 520, fibreGrams: 9 },
    isFeatured: true,
    category: 'Protein-led',
    proteinType: 'Beef',
    mealType: 'Stew',
    wellness: ['Protein-led'],
    dietary: ['Gluten-free', 'High-fibre'],
  },
  {
    id: 'dish-ata-dindin-lamb-shank',
    slug: 'ata-dindin-lamb-shank',
    title: 'Ata Dindin Lamb Shank',
    description:
      'Fall-off-the-bone lamb shank slow-cooked in a bold, peppery Ata Dindin sauce with native spices.',
    imageUrl: '/assets/dish-lamb-shank.png',
    heat: 'high',
    tags: [],
    isSignature: true,
    upgradePence: 400,
    nutrition: { proteinGrams: 38, carbsGrams: 20, fatGrams: 22, calories: 620, fibreGrams: 8 },
    isFeatured: true,
    category: 'Protein-led',
    proteinType: 'Lamb',
    mealType: 'Stew',
    wellness: ['Protein-led'],
    dietary: ['Gluten-free'],
    ingredients:
      'Lamb shank, tomatoes, red peppers, onions, ata dindin spice blend, garlic, ginger, scotch bonnet, jollof rice, greens, herbs, olive oil, sea salt.',
    allergens:
      'Celery, sulphites. Made in a kitchen that also handles gluten, nuts, shellfish and dairy.',
  },
  {
    id: 'dish-fish-peppersoup-bone-broth',
    slug: 'fish-peppersoup-bone-broth',
    title: 'Fish peppersoup bone broth',
    description: 'A fragrant, deeply spiced bone broth with tender fish and native aromatics.',
    imageUrl: '/assets/dish-fish-peppersoup.png',
    heat: 'high',
    tags: [],
    isSignature: false,
    nutrition: { proteinGrams: 27, carbsGrams: 31, fatGrams: 11, calories: 520, fibreGrams: 9 },
    isFeatured: true,
    category: 'Everyday balance',
    proteinType: 'Fish',
    mealType: 'Soup',
    wellness: ['DASH'],
    dietary: ['Gluten-free', 'Dairy-free'],
  },
  {
    id: 'dish-royal-seafood-okra',
    slug: 'royal-seafood-okra',
    title: 'Royal seafood okra',
    description: 'King prawns, snapper and blue crab in a rich palm-and-okra stew.',
    imageUrl: '/assets/dish-fish-peppersoup.png',
    heat: 'medium',
    tags: [],
    isSignature: true,
    upgradePence: 500,
    nutrition: { proteinGrams: 40, carbsGrams: 14, fatGrams: 19, calories: 560, fibreGrams: 7 },
    isFeatured: false,
    proteinType: 'Fish',
    mealType: 'Stew',
    wellness: ['Protein-led', 'DASH'],
    dietary: ['Gluten-free', 'Dairy-free'],
    ingredients:
      'King prawns, crab, okra, tomatoes, red peppers, onions, native spices, garlic, herbs, chicken stock, olive oil, sea salt.',
    allergens: 'Shellfish (prawns, crab), mustard, nuts (peanuts, almonds, pistachio), gluten.',
  },
  {
    id: 'dish-suya-salmon-kale-quinoa',
    slug: 'suya-salmon-kale-quinoa',
    title: 'Suya salmon, kale, quinoa',
    description: 'Suya-spiced salmon with massaged kale and fluffy quinoa.',
    imageUrl: '/assets/dish-goat-efo.png',
    heat: 'low',
    tags: ['Under 500 kcal', 'Protein-led'],
    isSignature: false,
    nutrition: { proteinGrams: 32, carbsGrams: 16, fatGrams: 18, calories: 520, fibreGrams: 9 },
    isFeatured: true,
    category: 'Plant-led',
    proteinType: 'Fish',
    mealType: 'Bowl',
    wellness: ['Protein-led', 'Mediterranean-inspired'],
    dietary: ['Gluten-free', 'Dairy-free', 'High-fibre'],
  },
  {
    id: 'dish-jollof-quinoa-bowl',
    slug: 'jollof-quinoa-bowl',
    title: 'Jollof quinoa bowl',
    description: 'Smoky party-style jollof made with quinoa and roasted vegetables.',
    imageUrl: '/assets/dish-goat-efo.png',
    heat: 'medium',
    tags: ['New'],
    isSignature: false,
    nutrition: { proteinGrams: 24, carbsGrams: 24, fatGrams: 18, calories: 510, fibreGrams: 9 },
    isFeatured: false,
    proteinType: 'Plant-based',
    mealType: 'Bowl',
    wellness: ['Plant-led', 'Carb-conscious'],
    dietary: ['Dairy-free', 'High-fibre'],
  },
  {
    id: 'dish-turkey-ayamase-greens',
    slug: 'turkey-ayamase-greens',
    title: 'Turkey ayamase with greens',
    description: 'Peppery ayamase stew with lean turkey and steamed greens.',
    imageUrl: '/assets/dish-fish-peppersoup.png',
    heat: 'medium',
    tags: ['Protein-led'],
    isSignature: false,
    nutrition: { proteinGrams: 30, carbsGrams: 18, fatGrams: 16, calories: 500, fibreGrams: 9 },
    isFeatured: false,
    proteinType: 'Turkey',
    mealType: 'Stew',
    wellness: ['Protein-led'],
    dietary: ['Gluten-free'],
  },
  {
    id: 'dish-chicken-egusi-cauliflower-rice',
    slug: 'chicken-egusi-cauliflower-rice',
    title: 'Chicken egusi with cauliflower rice, spinach & pepper sauce',
    description:
      'Melon-seed egusi with chicken, spinach and scotch-bonnet sauce over cauliflower rice.',
    imageUrl: '/assets/dish-goat-efo.png',
    heat: 'low',
    tags: ['Under 500 kcal'],
    isSignature: false,
    nutrition: { proteinGrams: 31, carbsGrams: 16, fatGrams: 17, calories: 480, fibreGrams: 9 },
    isFeatured: false,
    proteinType: 'Chicken',
    mealType: 'Bowl',
    wellness: ['Carb-conscious', 'Protein-led'],
    dietary: ['Gluten-free'],
  },

  // --- Homepage-only dishes: no facet data exists for these in either template.
  {
    id: 'dish-suya-ribeye-jollof-asparagus',
    slug: 'suya-ribeye-jollof-asparagus',
    title: 'Suya ribeye, jollof, asparagus',
    description: 'Suya-rubbed ribeye with smoky jollof and charred asparagus.',
    imageUrl: '/assets/dish-fish-peppersoup.png',
    heat: 'high',
    tags: ['New'],
    isSignature: false,
    nutrition: { proteinGrams: 32, fibreGrams: 9 },
    isFeatured: true,
    category: 'Protein-led',
    wellness: [],
    dietary: [],
  },
  {
    id: 'dish-slow-braised-egusi',
    slug: 'slow-braised-egusi',
    title: 'Slow-braised egusi with spinach, wild rice and sweet plantain',
    description: 'Melon-seed egusi slow-braised with spinach, wild rice and sweet plantain.',
    imageUrl: '/assets/dish-goat-efo.png',
    heat: 'medium',
    tags: [],
    isSignature: false,
    nutrition: { proteinGrams: 32, fibreGrams: 9 },
    isFeatured: true,
    category: 'Everyday balance',
    wellness: [],
    dietary: [],
  },
];

/**
 * Box catalogue, taken from the checkout templates (Step 1 / Step 2).
 *
 * These supersede the homepage template's "8 dishes for £150" and "£78 Taster",
 * which do not reconcile with the builder and are treated as stale marketing
 * copy. The homepage promo now derives its numbers from these tiers.
 */
export const BOX_FIXTURES: BoxOffer[] = [
  {
    id: 'box-6',
    name: '6-dish box',
    dishCount: 6,
    pricePence: 9500,
    // The template gives this card no badge; "Minimum order" is its blurb.
    blurb: 'Minimum order',
  },
  {
    id: 'box-12',
    name: '12-dish box',
    dishCount: 12,
    pricePence: 17000,
    badge: 'Most popular',
    savingPence: 1000,
    blurb: 'A balanced weekly selection',
  },
  {
    id: 'box-18',
    name: '18-dish box',
    dishCount: 18,
    pricePence: 24000,
    badge: 'Best value',
    savingPence: 2500,
    blurb: 'Ideal for larger tables',
  },
];

export const BOX_PRICING_FIXTURE: BoxPricing = {
  presets: BOX_FIXTURES,
  custom: {
    minDishes: 6,
    maxDishes: 30,
    // Mirrors the seeded Aonik plan, so demo mode quotes what live mode charges.
    baseDishes: 6,
    basePence: 9500,
    perSpacePence: 1700,
  },
  extraDishPence: 1500,
  // Both checkout templates show delivery as £10 struck through → Free.
  delivery: { listPence: 1000, pricePence: 0 },
};

export const DELIVERY_FIXTURE: DeliveryWindow = {
  earliestDeliveryDate: '2026-08-06',
  timezone: 'Europe/London',
};

/** Aonik-shaped source prices are absolute major units, never UI deltas. */
export const PERSONALISATION_GROUP_SOURCE: EffectiveOptionGroupDto[] = [
  {
    key: 'portion',
    label: 'Choose your portion size',
    helpText: null,
    selectionMode: 'One',
    currency: 'GBP',
    sortOrder: 0,
    defaultChoiceKey: 'light',
    choices: [
      { key: 'light', label: 'Light table', note: '225g', price: 0, sortOrder: 0 },
      { key: 'full', label: 'Full table', note: '450g', price: 10, sortOrder: 1 },
    ],
  },
  {
    key: 'protein',
    label: 'Choose your protein',
    helpText: 'Choose 1 or more',
    selectionMode: 'Multi',
    currency: 'GBP',
    sortOrder: 1,
    defaultChoiceKey: 'chicken',
    choices: [
      { key: 'prawns', label: 'King prawns', note: null, price: 0, sortOrder: 0 },
      { key: 'chicken', label: 'Chicken', note: null, price: 0, sortOrder: 1 },
      { key: 'salmon', label: 'Salmon', note: null, price: 3, sortOrder: 2 },
      {
        key: 'mixed',
        label: 'Mixed meats (chicken, beef, goat meat, tripe, cow foot)',
        note: null,
        price: 4,
        sortOrder: 3,
      },
    ],
  },
  {
    key: 'side',
    label: 'Choose your side',
    helpText: null,
    selectionMode: 'One',
    currency: 'GBP',
    sortOrder: 2,
    defaultChoiceKey: 'wildrice',
    choices: [
      { key: 'none', label: 'No side', note: null, price: 0, sortOrder: 0 },
      { key: 'wildrice', label: 'Wild rice', note: null, price: 2, sortOrder: 1 },
      { key: 'quinoa', label: 'Quinoa', note: null, price: 2, sortOrder: 2 },
      { key: 'plantain', label: 'Plantain', note: null, price: 2, sortOrder: 3 },
    ],
  },
  {
    key: 'heat',
    label: 'Choose your heat level',
    helpText: null,
    selectionMode: 'One',
    currency: 'GBP',
    sortOrder: 3,
    defaultChoiceKey: '2',
    choices: [
      { key: '0', label: 'None', note: null, price: 0, sortOrder: 0 },
      { key: '1', label: 'Low', note: null, price: 0, sortOrder: 1 },
      { key: '2', label: 'Medium', note: null, price: 0, sortOrder: 2 },
      { key: '3', label: 'High', note: null, price: 0, sortOrder: 3 },
    ],
  },
];

/**
 * Stands in for `GET /commerce/config/storefront`.
 *
 * Values mirror what the design templates already hard-code, so demo mode and
 * a correctly-authored tenant render identically: "Abby's choice" as the
 * recommended label, delivery shown as £10 struck through to free, and the
 * three preset box sizes.
 *
 * Note the box plan carries no list price — matching Aonik, where only presets
 * may author a `saving` and custom sizes have no anchor at all.
 */
export const STOREFRONT_CONFIG_FIXTURE: StorefrontConfig = {
  currency: 'GBP',
  recommendedChoiceLabel: "Abby's choice",
  resultsPageSize: 8,
  backToTopTrigger: { type: 'cardIndex', value: 10 },
  delivery: { listPence: 1000, chargedPence: 0 },
  defaultBoxSlug: 'abbys-box',
  extrasCollectionSlug: 'extras',
  box: {
    minSize: 6,
    maxSize: 30,
    currency: 'GBP',
    perSpacePence: 1700,
    presets: BOX_FIXTURES.map((offer) => ({
      size: offer.dishCount,
      pricePence: offer.pricePence,
      badge: offer.badge,
      blurb: offer.blurb,
      savingPence: offer.savingPence,
    })),
  },
};

/** Generic reheating guidance — identical across dishes in the template. */
export const HEATING_FIXTURE: HeatingInstruction[] = [
  {
    method: 'Microwave',
    body: 'Pierce film and heat on high for 4–5 mins. Stir halfway through and serve hot.',
  },
  {
    method: 'Hob / stovetop',
    body: 'Empty into a pan and heat on medium for 6–7 mins. Stir halfway through and serve hot.',
  },
  {
    method: 'Oven',
    body: 'Empty into an ovenproof dish and heat at 180°C for 15–18 mins. Stir halfway through and serve hot.',
  },
];

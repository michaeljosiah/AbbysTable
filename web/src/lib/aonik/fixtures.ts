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
 */

import type { BoxOffer, DeliveryWindow, Dish } from './types';

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
    personalisation: ['portion', 'protein', 'sides', 'heat'],
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
    personalisation: ['portion', 'protein', 'sides', 'heat'],
    isFeatured: true,
    category: 'Protein-led',
    proteinType: 'Lamb',
    mealType: 'Stew',
    wellness: ['Protein-led'],
    dietary: ['Gluten-free'],
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
    personalisation: [],
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
    personalisation: ['portion', 'sides', 'heat'],
    isFeatured: false,
    proteinType: 'Fish',
    mealType: 'Stew',
    wellness: ['Protein-led', 'DASH'],
    dietary: ['Gluten-free', 'Dairy-free'],
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
    personalisation: ['sides', 'heat'],
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
    personalisation: ['portion'],
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
    personalisation: [],
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
    personalisation: ['portion', 'protein', 'heat'],
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
    personalisation: [],
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
    personalisation: ['portion', 'sides', 'heat'],
    isFeatured: true,
    category: 'Everyday balance',
    wellness: [],
    dietary: [],
  },
];

export const BOX_FIXTURES: BoxOffer[] = [
  {
    id: 'box-signature-eight',
    name: "Abby's Box",
    dishCount: 8,
    pricePence: 15000,
    blurb: 'Quality ingredients, traditional flavour and nothing unnecessary.',
  },
  {
    id: 'box-taster-four',
    name: 'Taster Box',
    dishCount: 4,
    pricePence: 7800,
    blurb: 'New here? Start with four dishes.',
  },
];

export const DELIVERY_FIXTURE: DeliveryWindow = {
  earliestDeliveryDate: '2026-08-06',
};

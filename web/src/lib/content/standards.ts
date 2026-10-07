/**
 * Our Standards — editorial copy, ported verbatim from
 * design/Abby's Table - Standards v2.dc.html (approved).
 *
 * Editorial structure, not commerce data: nothing here comes from Aonik. The
 * one commerce value on the page — the example dish — is named by slug below
 * and resolved through the Aonik client, so its figures are never copy.
 *
 * PHOTOGRAPHY: all five images are the design's AI-generated placeholders
 * (design/assets/std2-*.jpg, copied into public/assets/standards/), to be
 * reshot before launch (#38). Alt text describes what is in each photograph,
 * not the band it sits in.
 */

import { BRAND_STANDARDS } from './marketing';

/**
 * The hero's four prohibitions. The claims are the site's one list
 * (`BRAND_STANDARDS`); this only pairs each with its glyph.
 */
export type ProhibitionGlyph = 'oil' | 'package' | 'flask' | 'sprout';

export const PROHIBITION_GLYPHS: Record<(typeof BRAND_STANDARDS)[number], ProhibitionGlyph> = {
  'No seed oils': 'oil',
  'No ultra-processed foods': 'package',
  'No added MSG': 'flask',
  'No refined sugars': 'sprout',
};

export interface StandardsImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export const STANDARDS_HERO_IMAGE: StandardsImage = {
  src: '/assets/standards/std2-hero.jpg',
  width: 1200,
  height: 895,
  alt: 'Yam, black-eyed beans, ofada rice, grains, scotch bonnets, red onion and greens on a dark tray',
};

export interface StandardFact {
  title: string;
  body: string;
}

export interface StandardBand {
  /** Anchor id — the index links to it. */
  id: string;
  /** Two-digit numeral, as printed. */
  number: string;
  title: string;
  lede: string;
  /** Bands alternate cream and blush, starting on cream. */
  ground: 'cream' | 'blush';
  /**
   * Photograph on the other side of the band. Band 05 has none: its visual is
   * the example dish panel, because the claim is transparency.
   */
  image?: StandardsImage;
  facts: StandardFact[];
}

export const STANDARD_BANDS: StandardBand[] = [
  {
    id: 'std-01',
    number: '01',
    title: 'Quality ingredients',
    lede: 'We start with ingredients chosen for quality, flavour and nutrition.',
    ground: 'cream',
    image: {
      src: '/assets/standards/std2-ingredients.jpg',
      width: 1200,
      height: 900,
      alt: 'Salmon, beef shin, eggs, olive and avocado oils, coconut, avocado, red palm fruit, wild rice, quinoa and basmati on a dark tray',
    },
    facts: [
      {
        title: 'Carefully sourced proteins',
        body: 'Including wild-caught seafood, grass-fed meat and organic eggs.',
      },
      {
        title: 'Better cooking oils',
        body: 'Extra virgin olive oil, avocado oil, coconut oil and certified sustainable organic red palm oil. Never seed oils.',
      },
      {
        title: 'Whole grains & traditional staples',
        body: 'From traditional ofada rice to quinoa and wholegrain basmati, offering more choice beyond standard white rice.',
      },
    ],
  },
  {
    id: 'std-02',
    number: '02',
    title: 'Flavour built naturally',
    lede: 'Whole spices, fresh aromatics and slow-simmered stocks, used to build deep, layered flavour.',
    ground: 'blush',
    image: {
      src: '/assets/standards/std2-spices.jpg',
      width: 1200,
      height: 960,
      alt: 'Whole spices ground by hand in a mortar and pestle',
    },
    facts: [
      {
        title: 'Marinades, stocks & herbs',
        body: 'Flavour built with house-made marinades, slow-simmered stocks, fresh herbs and aromatics.',
      },
      {
        title: 'No commercial seasoning blends',
        body: 'No bouillon cubes or powders, added MSG or commercial seasoning mixes used to build flavour.',
      },
      {
        title: 'Traditional techniques',
        body: 'From cooked-down pepper bases to richly cooked stews, flavour is developed patiently and properly.',
      },
    ],
  },
  {
    id: 'std-03',
    number: '03',
    title: 'Nutrition built in',
    lede: 'Nutrition considered from the start, through balanced plates, varied ingredients and thoughtful portioning.',
    ground: 'cream',
    image: {
      src: '/assets/standards/std2-nutrition.jpg',
      width: 1200,
      height: 906,
      alt: 'Three plated dishes: goat efo with wild rice, lamb shank with jollof and greens, and fish peppersoup',
    },
    facts: [
      {
        title: 'Balanced by design',
        body: 'Protein, vegetables and quality carbohydrates brought together in considered proportions.',
      },
      {
        title: 'Variety across the menu',
        body: 'A broad mix of proteins, vegetables, whole grains and traditional staples keeps meals varied.',
      },
      {
        title: 'Portions with purpose',
        body: 'Serving sizes are designed to feel satisfying while keeping the overall plate in balance.',
      },
    ],
  },
  {
    id: 'std-04',
    number: '04',
    title: 'Cooked with care',
    lede: 'Prepared in small batches, with attention given to every stage from cooking to packing.',
    ground: 'blush',
    image: {
      src: '/assets/standards/std2-delivery.jpg',
      width: 1200,
      height: 960,
      alt: 'An Abby’s Table box packed with chilled dishes',
    },
    facts: [
      {
        title: 'Small-batch cooking',
        body: 'We cook in limited quantities, giving each dish the time and attention it needs.',
      },
      {
        title: 'Cooked for your order',
        body: 'Food is prepared for scheduled cooking runs rather than produced in large volumes and stockpiled.',
      },
      {
        title: 'Handled properly',
        body: 'Dishes are blast chilled, carefully packed and shipped to preserve quality from our kitchen to yours.',
      },
    ],
  },
  {
    id: 'std-05',
    number: '05',
    title: 'Always transparent',
    lede: 'Clear ingredients, straightforward labelling and honest information about what goes into every dish.',
    ground: 'cream',
    facts: [
      {
        title: 'Full ingredient information',
        body: 'Ingredients and allergens are clearly listed, so you know exactly what you’re ordering.',
      },
      {
        title: 'Nutrition made clear',
        body: 'Nutritional information is provided for every dish in a simple, easy-to-understand format.',
      },
      {
        title: 'Clear from kitchen to customer',
        body: 'No vague claims, hidden shortcuts or confusing language, just clear information about our food.',
      },
    ],
  },
];

/**
 * The dish band 05 shows as "Example dish information". An editorial pointer,
 * not data: the figures and allergens are read from the catalogue for this
 * slug. Royal Seafood Okra is the one dish whose source template published an
 * allergen declaration and full macros, so it shows the most of what the band
 * promises. The design's own example ("Grilled wild salmon, dirty ofada rice
 * with kale") is not on the menu, and its figures were never confirmed — they
 * are not used. If the slug is missing from the catalogue the panel is left
 * out rather than filled from anywhere else.
 */
export const STANDARDS_EXAMPLE_DISH_SLUG = 'royal-seafood-okra';

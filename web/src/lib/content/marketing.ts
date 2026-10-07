/**
 * Editorial copy that is structured enough to be data: the homepage's hero
 * facts, How it works steps, Our standards items and Private Table content,
 * plus the site's one list of brand prohibitions. Prose that only ever appears
 * once stays inline in its section component.
 *
 * Homepage copy is verbatim from design/Abby's Table - Homepage v2.dc.html.
 * Hyphenated compounds keep ORDINARY hyphens here: the components protect the
 * approved ones from splitting at render time (`KeepCompounds`), never the
 * content (design/build-handoff.md §3e).
 *
 * Nothing here is commerce data. The box's minimum and its "From" price come
 * from the tenant's box plan (`lib/purchase-bar/offer.ts`), so they are
 * passed in where the copy names them rather than written into it.
 */

/**
 * The four clean-label prohibitions, as Our Standards' hero names them (the
 * /standards page pairs each with its glyph in `./standards`).
 */
export const BRAND_STANDARDS = [
  'No seed oils',
  'No ultra-processed foods',
  'No added MSG',
  'No refined sugars',
] as const;

/* ---- Hero ------------------------------------------------------------------ */

/** Line glyph in the gold ring beside a hero fact. */
export type HeroFactIcon = 'leaf' | 'package' | 'bowl';

export interface HeroFact {
  icon: HeroFactIcon;
  label: string;
}

/** The three facts under the hero lede, stacked below 1280 and in a row from it. */
export const HERO_FACTS: HeroFact[] = [
  { icon: 'leaf', label: 'Rooted in tradition' },
  { icon: 'package', label: 'No ultra-processed foods' },
  { icon: 'bowl', label: 'Real ingredients. Real flavour.' },
];

/* ---- How it works band ----------------------------------------------------- */

export interface HomepageStep {
  /** Two-digit numeral, as printed (decorative — the list carries the order). */
  number: string;
  title: string;
  body: string;
}

/**
 * Steps 01–04 (build-handoff "How it works band"). Step 01 names the box's
 * minimum, which is the tenant's box plan and not copy, so it is passed in;
 * with no usable plan the sentence is left out rather than guessed.
 *
 * "Mainland UK" is deliberate and implies exclusions that are still open — do
 * not soften it to "UK". The earliest-delivery date is NOT on the homepage
 * (handoff: built, reviewed and removed); it belongs to the funnel.
 */
export function homepageSteps(minDishes: number | null): HomepageStep[] {
  const minimum =
    minDishes !== null
      ? `Minimum order: ${minDishes} ${minDishes === 1 ? 'dish' : 'dishes'}. `
      : '';

  return [
    {
      number: '01',
      title: 'Build a box',
      body: `${minimum}Choose your meals and preferred portion size.`,
    },
    {
      number: '02',
      title: 'We cook from scratch',
      body: 'Chef-prepared, nutrition-led, made for flavour with quality ingredients.',
    },
    {
      number: '03',
      title: 'Delivered chilled',
      body: 'Choose your Mainland UK delivery date.',
    },
    {
      // No ampersand: the Playfair "&" was louder than the words round it.
      number: '04',
      title: 'Heat, enjoy, live well',
      // The real reheat time is an open item (build-handoff, awaiting client).
      body: 'Ready in minutes.',
    },
  ];
}

/* ---- Our standards band ---------------------------------------------------- */

/** In-house line glyphs from the band's fixed set (frontend-backend-contract §6). */
export type HomepageStandardIcon = 'sprout' | 'cutlery' | 'document' | 'drop';

export interface HomepageStandard {
  title: string;
  description: string;
  icon: HomepageStandardIcon;
}

/**
 * The homepage's four standards. The order is deliberate (build-handoff, "Our
 * standards"). These are the band's own items — not `BRAND_STANDARDS`, which
 * are the four prohibitions the /standards hero lists; this band summarises
 * the page it links to rather than repeating its hero.
 */
export const HOMEPAGE_STANDARDS: HomepageStandard[] = [
  {
    title: 'High-quality ingredients',
    description:
      'From wild salmon to grass-fed meats and butter, ingredients are chosen with care.',
    icon: 'sprout',
  },
  {
    title: 'No commercial seasoning blends',
    description: 'Flavour built with herbs, spices, aromatics and house-made stocks.',
    icon: 'cutlery',
  },
  {
    title: 'Full nutritional information',
    description: 'Full nutrition shared for every dish, so you can make informed choices.',
    icon: 'document',
  },
  {
    title: 'No seed oils',
    description: 'We choose our cooking oils deliberately for quality and flavour.',
    icon: 'drop',
  },
];

/* ---- Abby's Private Table -------------------------------------------------- */

/**
 * The three tiers of oversight behind Abby's Private Table. Regulated claims:
 * they must be substantiated before launch (build-handoff open items, #38).
 */
export interface PrivateTableCredential {
  /** "Guided by", "Overseen by", … */
  role: string;
  name: string;
}

export const PRIVATE_TABLE_CREDENTIALS: PrivateTableCredential[] = [
  { role: 'Guided by', name: 'A UK-certified health coach' },
  { role: 'Overseen by', name: 'A registered nutritionist' },
  { role: 'In collaboration with', name: 'Your clinical team' },
];

export type PrivateTableReachIcon = 'globe' | 'pin';

export interface PrivateTableReach {
  icon: PrivateTableReachIcon;
  label: string;
  value: string;
}

/** Where the service reaches — the band's two icon rows. */
export const PRIVATE_TABLE_REACH: PrivateTableReach[] = [
  { icon: 'globe', label: 'Worldwide', value: 'Bespoke recipes created for you' },
  { icon: 'pin', label: 'UK-wide', value: 'Bespoke recipes created and prepared for you' },
];

/**
 * Private Table's starting price, in pence: "Private Table from £1,500".
 *
 * Content, not commerce: Private Table is a waitlist, not a product Aonik
 * sells, and the design carries the figure as copy ("Copy is unchanged …
 * including 'Private Table from £1,500'"). Kept here, once, so it is never a
 * literal in markup — and so the homepage band and the Private Table page
 * (#25, which also quotes it) can share it. Still to be confirmed (#25, #37).
 */
export const PRIVATE_TABLE_FROM_PENCE = 150_000;

/**
 * Where the band's "Find out more" goes: the Private Table page, once it
 * exists. It does not yet (#25), and a link to a 404 is never acceptable, so
 * this is null and the band renders no CTA until then. When #25 lands, set it
 * to '/private-table' — the CTA appears with no other change.
 *
 * Not the footer contact placeholder (`CONTACT_HREF`): Private Table is a
 * waitlist, and "Find out more" landing on the newsletter sign-up would
 * promise information that is not there.
 */
export const PRIVATE_TABLE_HREF: string | null = null;

/* ---- Dish cards ------------------------------------------------------------ */

/**
 * The Signature note on a dish card — canonical copy, the same on every page
 * that shows the card (Homepage v2, Menu Landing v3, Add Dishes v2, Extras v2).
 */
export const SIGNATURE_EXPLAINER =
  'One of Abby’s specials. This dish takes a little more time or uses premium cuts, so there’s a small upgrade.';

/* ---- How it works page ----------------------------------------------------- */

/**
 * The dish the /how-it-works page uses as its worked example: the photograph
 * and caption in the hero, and the "Example dish" nutrition card. An editorial
 * choice, so it lives here; every value the card shows still comes from the
 * dish's own record.
 *
 * The design names "Grilled wild salmon, dirty ofada rice with kale", which is
 * not in the catalogue. This is the catalogue dish whose record publishes the
 * full set the card shows — all five figures, ingredients and an allergen
 * declaration — so the example demonstrates what "shown on every dish" means.
 * When the slug does not resolve (a live tenant without it) the page falls back
 * to the first dish of the featured rail. Owner to confirm the choice.
 */
export const HOW_IT_WORKS_EXAMPLE_DISH_SLUG = 'royal-seafood-okra';

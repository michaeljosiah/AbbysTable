/**
 * The menu page's copy (Menu Landing v3, #21), verbatim from
 * `design/Abby's Table - Menu Landing v3.dc.html` except where a comment says
 * otherwise. Figures are never written here: the box minimum and the delivery
 * date are values the page resolves from Aonik.
 */

export const MENU_HEADING = 'What’s on the table?';

/**
 * The lede. A phone reads the first clause alone; from 640 the rest follows
 * (one element revealed, not a second copy of the sentence).
 *
 * DEPARTURE (marketing-pages FR-01, SPEC-2026-10-07-menu Known gaps): the
 * design says "delivered chilled across the UK". Delivery is to mainland UK
 * while non-mainland exclusions are open (CLAUDE.md), so the page says that,
 * as How It Works does.
 */
export const MENU_LEDE = {
  lead: 'Chef-prepared Nigerian fusion dishes, cooked in small batches',
  more: 'and delivered chilled to mainland UK.',
  /** "Choose six or more dishes to build your box." — the count is the plan's minimum. */
  choose: (minimumInWords: string) => `Choose ${minimumInWords} or more dishes to build your box.`,
};

/** "Next deliveries from {date}" — the wording is fixed, the date is a value (contract §4). */
export const NEXT_DELIVERIES_PREFIX = 'Next deliveries from';

/**
 * The cooking-run note. Five instances across four designs (Menu Landing v3,
 * both dish pages, Choose Box v2 twice) that must stay identical
 * (design/CLAUDE.md, "Delivery note copy is settled") — the last sentence is
 * set bold.
 */
export const DELIVERY_NOTE = {
  title: 'About delivery dates',
  body: 'We take a limited number of orders for each cooking run, so we can give every dish the care it deserves. The date shown is our next available run.',
  caveat: 'Availability can change if a run fills before you complete checkout.',
};

/**
 * "What do these mean?" — the Eating style definitions, keyed by the chip's
 * label. A note shows only the styles its group actually offers, so a chip is
 * never defined that is not there and a definition never names a missing one.
 */
export const EATING_STYLE_NOTE_HEAD = 'What do these mean?';

export const EATING_STYLE_DEFINITIONS: Record<string, string> = {
  'Protein-led': 'Dishes where protein is a key focus of the meal.',
  'Carb-conscious': 'Dishes designed with a lighter carbohydrate emphasis.',
  'Plant-led':
    'Dishes where vegetables, legumes, grains and other plant ingredients take centre stage.',
  'Mediterranean-inspired':
    'Dishes influenced by Mediterranean-style eating, with an emphasis on vegetables, pulses, whole grains, fish and healthy fats.',
};

export const MENU_EMPTY = {
  title: 'No dishes match your search or filters.',
  action: 'Clear search and filters',
};

/** "Where the flavour comes from" — kept as the design keeps it. */
export const FLAVOUR_BAND = {
  label: 'Where the flavour comes from',
  heading: 'Bold Nigerian flavour, built from real ingredients.',
  facts: [
    'Fresh herbs · Whole spices · Aromatics · House-made stocks',
    'No bouillon cubes or added MSG · No ultra-processed foods',
  ],
  image: {
    src: '/assets/how-it-works/hw-scratch.jpg',
    alt: 'Whole spices and dried chillies ground by hand in a stone mortar',
  },
};

/**
 * Editorial copy that is structured enough to be data: the hero proof points,
 * the standards band and the four how-it-works steps. Prose that only ever
 * appears once stays inline in its section component.
 *
 * Several strings here are broken into lines rather than left to wrap. That is
 * deliberate — the template hard-breaks these headings and captions so they sit
 * against the photography the same way at every width, so the break points are
 * content decisions, not layout accidents.
 */

/** The four clean-label claims in the card beneath the hero. */
export const BRAND_STANDARDS = [
  'No seed oils',
  'No ultra-processed foods',
  'No added MSG',
  'No refined sugars',
] as const;

/** Line-art glyph shown beside a hero proof point. */
export type ProofIcon = 'leaf' | 'cube' | 'bowl';

export interface ProofPoint {
  icon: ProofIcon;
  /** Two lines, hard-broken as the template sets them. */
  lines: [string, string];
}

/**
 * The three claims stacked under the hero headline, each in a brass ring with a
 * hairline rule between. These replace the single supporting paragraph the
 * earlier design used.
 */
export const HERO_PROOF_POINTS: ProofPoint[] = [
  { icon: 'leaf', lines: ['Made from scratch with', 'high-quality ingredients.'] },
  { icon: 'cube', lines: ['No bouillon cubes.', 'No ultra-processed foods.'] },
  { icon: 'bowl', lines: ['Nutrition at the core.', 'Flavour in every bite.'] },
];

export interface HowItWorksStep {
  step: number;
  /** Heading lines, rendered with a break between them. */
  title: string[];
  /** Body lines, rendered with a break between them. */
  body: string[];
  imageUrl: string;
  /** Describes the photograph, which differs from the heading. */
  imageAlt: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    step: 1,
    title: ['Build your box'],
    body: ['Choose your box size,', 'dishes and portion size.'],
    imageUrl: '/assets/how-1-build-your-box.jpg',
    imageAlt: 'Choose your box',
  },
  {
    step: 2,
    title: ['Cooked', 'from scratch'],
    body: ['Nigerian flavours.', 'Nutrition-led.', 'No ultra-processed foods'],
    imageUrl: '/assets/how-2-cooked-from-scratch.jpg',
    imageAlt: 'We prepare your dishes',
  },
  {
    step: 3,
    title: ['Chilled', 'UK-wide delivery'],
    body: ['Choose an upcoming date.', 'Packed chilled, never frozen.'],
    imageUrl: '/assets/how-3-delivered-chilled.png',
    imageAlt: 'Delivered chilled UK-wide',
  },
  {
    step: 4,
    title: ['Heat, eat,', 'live well'],
    body: ['From fridge to plate in', 'minutes, ready when you are.'],
    imageUrl: '/assets/how-4-heat-eat-live-well.jpg',
    imageAlt: 'Heat, eat and live well',
  },
];

/**
 * The three tiers of oversight behind Abby's Private Table. Rendered twice —
 * as a bordered card beside the copy on wide screens, and as a plain centred
 * stack beneath it below 860px — so the list lives here rather than in either
 * block's markup.
 */
export interface PrivateTableCredential {
  /** "Guided by", "Overseen by", … */
  role: string;
  /** Lines as the card sets them; the inline variant joins them with a space. */
  lines: string[];
}

export const PRIVATE_TABLE_CREDENTIALS: PrivateTableCredential[] = [
  { role: 'Guided by', lines: ['A UK-certified', 'health coach'] },
  { role: 'Overseen by', lines: ['A registered', 'nutritionist'] },
  { role: 'In collaboration with', lines: ['Your clinical', 'team'] },
];

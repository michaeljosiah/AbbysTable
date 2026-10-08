/**
 * Abby's Private Table (#25) — the page's structured copy, VERBATIM from
 * design/Abby's Table - Private Table v2.dc.html (approved; behaviour guide
 * §8). Prose that appears once stays in the page (`PrivateTableView`).
 *
 * Health, credential and service copy awaits sign-off (#38) — the
 * credentials are regulated claims to substantiate before launch
 * (build-handoff, open items) — so none of it is reworded here. Prices are
 * never written into the copy: each service names its pence constant
 * (`./marketing`), formatted where it renders.
 *
 * Hyphenated compounds keep ORDINARY hyphens; the page holds the approved
 * ones together at render time (`KeepCompounds`).
 */

import {
  PRIVATE_TABLE_FROM_PENCE,
  PRIVATE_TABLE_MEAL_PREPARATION_FROM_PENCE,
} from './marketing';

/**
 * The label of EVERY waitlist call to action on the page — hero, both service
 * cards, the form's submit and the mobile bar (behaviour guide §8: "Every
 * enquiry/conversion CTA for this service is JOIN THE WAITLIST"). Sentence
 * case here; the pills set it in caps.
 */
export const JOIN_WAITLIST_LABEL = 'Join the waitlist';

/** "Confidential by design · NDA by arrangement" — in the hero and over the services. */
export const PRIVATE_TABLE_CONFIDENTIALITY = 'Confidential by design · NDA by arrangement';

/* ---- Who it's for ------------------------------------------------------------ */

export interface PrivateTableAudience {
  n: string;
  title: string;
  body: string;
}

/**
 * Three, as the approved design has them (the issue's "Who it's for (4)"
 * predates it — the design wins).
 */
export const PRIVATE_TABLE_AUDIENCES: readonly PrivateTableAudience[] = [
  {
    n: '01',
    title: 'Living with a diagnosis',
    body: 'Eating through treatment, recovery or remission, when the guidance changes what can go on the table.',
  },
  {
    n: '02',
    title: 'Fuelling sporting performance',
    body: 'For training, competition and recovery, with food developed around your performance targets.',
  },
  {
    n: '03',
    title: 'Following clinical guidance',
    body: 'When clinical guidance sets nutritional targets or ingredients to avoid, without losing the food you love.',
  },
];

/* ---- What we offer -------------------------------------------------------------- */

/** "Included with both services" — stated once, above the two cards. */
export const PRIVATE_TABLE_ASSURANCES: readonly string[] = [
  'Clinical team collaboration',
  'UK-certified health coach guidance',
  'Registered nutritionist oversight',
];

/**
 * The services the waitlist form offers, in the design's order and words —
 * a FIXED list: the server action refuses anything else. "Not sure yet" is a
 * real answer, not a missing one.
 */
export const WAITLIST_SERVICES = [
  { id: 'recipe-development', label: 'Recipe development', note: 'Worldwide' },
  {
    id: 'recipe-development-and-meal-preparation',
    label: 'Recipe development & meal preparation',
    note: 'UK-wide',
  },
  { id: 'not-sure', label: 'Not sure yet', note: null },
] as const;

export type WaitlistServiceId = (typeof WAITLIST_SERVICES)[number]['id'];

export function isWaitlistService(value: string): value is WaitlistServiceId {
  return WAITLIST_SERVICES.some((service) => service.id === value);
}

export interface PrivateTableService {
  /** The waitlist choice the card's "Join the waitlist" preselects. */
  service: WaitlistServiceId;
  label: string;
  region: string;
  title: string;
  /** "From £…", in pence — formatted where it renders, never written here. */
  fromPence: number;
  body: string;
  points: readonly string[];
  supportLabel: string;
  support: string;
  /** The second card sits on `--green-forest`. */
  tone: 'light' | 'dark';
}

export const PRIVATE_TABLE_SERVICES: readonly PrivateTableService[] = [
  {
    service: 'recipe-development',
    label: 'Recipes for your kitchen',
    region: 'Worldwide',
    title: 'Bespoke Recipe Development',
    fromPence: PRIVATE_TABLE_FROM_PENCE,
    body: 'A personalised digital recipe programme developed specifically around your needs: your goals, diet, preferences and lifestyle.',
    points: [
      'Tailored to your nutritional needs',
      'Professionally developed recipes',
      'Precise methods and nutritional detail',
      'Written for you or your in-house chef',
      'Clinical or performance team sign-off',
    ],
    supportLabel: 'Ongoing optional support',
    support: 'Household chef training, pantry audits and recipe updates.',
    tone: 'light',
  },
  {
    service: 'recipe-development-and-meal-preparation',
    label: 'Your recipes, cooked for you',
    region: 'UK-wide',
    title: 'Recipe Development & Meal Preparation',
    fromPence: PRIVATE_TABLE_MEAL_PREPARATION_FROM_PENCE,
    body: 'A fully managed food programme built around your nutritional needs. From bespoke recipe development through to cooking, portioning and delivery.',
    points: [
      'Tailored to your nutritional needs',
      'Professionally developed and prepared for you',
      'Portioned with nutritional detail managed for you',
      'Prepared, chilled and delivered across the UK',
      'Clinical or performance team sign-off',
    ],
    supportLabel: 'Ongoing optional support',
    support: 'Menu check-ins, menu adaptations and priority deliveries.',
    tone: 'dark',
  },
];

/* ---- How it works ------------------------------------------------------------------ */

export interface PrivateTableStep {
  n: string;
  title: string;
  points: readonly string[];
}

/** Four steps, three short points each — the same at every width. */
export const PRIVATE_TABLE_STEPS: readonly PrivateTableStep[] = [
  {
    n: '01',
    title: 'Private Consultation',
    points: [
      'Begin with a one-to-one consultation',
      'Share your goals, dietary needs and day-to-day routine',
      'Align programme with your clinical guidance',
    ],
  },
  {
    n: '02',
    title: 'Bespoke Recipe Development',
    points: [
      'Recipes developed around your nutritional needs',
      'Health coach guidance and nutritionist oversight',
      'Portions, methods and nutritional detail refined',
    ],
  },
  {
    n: '03',
    title: 'Review & sign-off',
    points: [
      'Review the programme together',
      'Refine any final details',
      'Coordinate clinical or performance sign-off',
    ],
  },
  {
    n: '04',
    title: 'Your programme begins',
    points: [
      'Receive your personalised recipe programme',
      'UK clients can add preparation, portioning and delivery',
      'Ongoing support available as your needs evolve',
    ],
  },
];

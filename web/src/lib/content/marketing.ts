/**
 * Editorial copy that is structured enough to be data: the standards band and
 * the four how-it-works steps. Prose that only ever appears once stays inline in
 * its section component.
 */

/** The four clean-label claims in the band beneath the hero. */
export const BRAND_STANDARDS = [
  'No seed oils',
  'No bouillon or cubes',
  'No MSG',
  'No refined sugars',
] as const;

export interface HowItWorksStep {
  step: number;
  /** Full-width heading. */
  title: string;
  /** Shorter heading substituted below 620px. */
  titleCompact?: string;
  body: string;
  imageUrl: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    step: 1,
    title: 'Build your box',
    body: 'Personalise your dishes — portion, protein, side or heat.',
    imageUrl: '/assets/how-1-build-your-box.jpg',
  },
  {
    step: 2,
    title: 'Cooked from scratch',
    body: 'Small batches, simmered stocks, real spices and no cubes.',
    imageUrl: '/assets/how-2-cooked-from-scratch.jpg',
  },
  {
    step: 3,
    title: 'Delivered chilled UK-wide',
    titleCompact: 'Chilled UK-wide delivery',
    body: 'Choose an upcoming date. Packed chilled, never frozen.',
    imageUrl: '/assets/how-3-delivered-chilled.png',
  },
  {
    step: 4,
    title: 'Heat, eat and live well',
    titleCompact: 'Heat, eat, live well',
    body: 'From fridge to plate in minutes, ready when you are.',
    imageUrl: '/assets/how-4-heat-eat-live-well.jpg',
  },
];

/** Human labels for the personalisation options Aonik returns per dish. */
export const PERSONALISATION_LABELS: Record<string, string> = {
  portion: 'portion size',
  protein: 'protein',
  sides: 'sides',
  heat: 'heat level',
};

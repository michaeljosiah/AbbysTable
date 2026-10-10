/**
 * The shared shopping state, React-free (`tests/shopping-state.test.tsx`;
 * issue #14; design: SHOPPING-STATE §1, §5–8, §60).
 *
 * ONE reading of "where is this customer's box", consumed by the header pill,
 * the drawer, the purchase bar, VIEW BOX and every step's gate — so no page
 * invents its own definition. It is derived from facts the cart already has;
 * the only thing it adds is the step the customer last reached, which a cart
 * cannot say.
 *
 * Steps run in order: choose → dishes → extras → review → checkout. A step can
 * be entered only if every step before it is satisfied; a box that cannot be
 * completed as it stands (a dish became unavailable, a dish was removed) is
 * sent back to the earliest step that can mend it — Step 2 — with the reason.
 */

export type BoxStep = 'choose' | 'dishes' | 'extras' | 'review' | 'checkout';

const ORDER: readonly BoxStep[] = ['choose', 'dishes', 'extras', 'review', 'checkout'];

export const STEP_HREFS: Record<BoxStep, string> = {
  choose: '/box',
  dishes: '/box/dishes',
  extras: '/box/extras',
  review: '/box/review',
  checkout: '/box/checkout',
};

export function isBoxStep(value: unknown): value is BoxStep {
  return typeof value === 'string' && (ORDER as readonly string[]).includes(value);
}

/** The cart's facts, as far as this reads them. */
export interface ShoppingFacts {
  /** False until the cart has been read: nothing is decided before then. */
  hydrated: boolean;
  /** The size committed at Step 1, or null. */
  boxSize: number | null;
  /** Dishes in the box that can be ordered (an unavailable dish is not counted). */
  dishCount: number;
  /** Units held by dishes that are no longer available. */
  unavailableCount: number;
  /** The box already became an order (here, or in another tab). */
  ordered: boolean;
  /** The furthest step this browser reached for this box, if it remembers one. */
  lastStep: BoxStep | null;
}

export interface ShoppingStatus {
  /** A box is in progress: the pill says VIEW BOX, the bar reports it. */
  active: boolean;
  /** Dishes the box needs to replace (unavailable ones). */
  replacements: number;
  /** Dishes still to add to fill the box. */
  missing: number;
  /** Full, and holding nothing unavailable. */
  complete: boolean;
  /** The furthest step this box may be on right now. */
  maxStep: BoxStep;
  /** Where VIEW BOX goes: the step the customer reached, or the furthest valid one. */
  resumeHref: string;
  ordered: boolean;
}

/**
 * ACTIVE BOX (design/CLAUDE.md): committed (a size chosen at Step 1) OR holding
 * a dish — a dish carried from a dish page included. Never before the cart is
 * read, so the first render always sells.
 */
export function boxStatus(facts: ShoppingFacts): ShoppingStatus {
  const committed = facts.boxSize !== null;
  const active = facts.hydrated && (committed || facts.dishCount > 0 || facts.unavailableCount > 0);
  const missing = committed ? Math.max(0, (facts.boxSize ?? 0) - facts.dishCount) : 0;
  const replacements = facts.unavailableCount;
  const complete = committed && missing === 0 && replacements === 0;

  // The earliest step that can still be satisfied: no size → Step 1; a box that
  // is not complete (short, or holding an unavailable dish) → Step 2.
  const maxStep: BoxStep = !committed ? 'choose' : !complete ? 'dishes' : 'checkout';

  // Resume where the customer got to, never beyond what is valid; a complete box
  // that last stood on Step 1 or 2 resumes on the step after them.
  let resume: BoxStep = maxStep;
  if (committed && complete && facts.lastStep !== null) {
    const reached = ORDER.indexOf(facts.lastStep);
    resume = ORDER[Math.max(Math.min(reached, ORDER.indexOf(maxStep)), ORDER.indexOf('extras'))];
  } else if (committed && complete) {
    resume = 'extras';
  } else if (!committed && facts.dishCount > 0) {
    resume = 'choose';
  }
  return { active, replacements, missing, complete, maxStep, resumeHref: STEP_HREFS[resume], ordered: facts.ordered };
}

/**
 * Where a customer standing on `step` must be sent, or null to let them stay:
 * to the earliest step that can mend what is wrong (the status's `maxStep`).
 */
export function guardRedirect(step: BoxStep, status: ShoppingStatus): string | null {
  if (ORDER.indexOf(step) <= ORDER.indexOf(status.maxStep)) return null;
  return STEP_HREFS[status.maxStep];
}

/* ---- Copy (SHOPPING-STATE §5, verbatim; pending sign-off, #37) -------------------- */

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export function replacementsTitle(count: number): string {
  return `Your box needs ${count} ${plural(count, 'replacement', 'replacements')}`;
}

/**
 * What the panel says. `names` are the unavailable dishes' own names, used
 * only for a single one; `fromCheckout` reassures that the checkout details
 * were kept too.
 */
export function replacementsBody(count: number, names: readonly string[], fromCheckout: boolean): string {
  const gone =
    count === 1
      ? `${names[0] ?? 'A saved dish'} is no longer available.`
      : `${count <= 10 ? WORDS[count] : String(count)} of your saved dishes are no longer available.`;
  const kept = fromCheckout ? 'the rest of your box and your checkout details' : 'everything else in your box';
  const finish = fromCheckout ? 'to complete your box' : 'to complete it';
  return `${gone} We’ve kept ${kept}. Choose any ${count} ${plural(count, 'dish', 'dishes')} below ${finish}.`;
}

/** The rail's second line while the box is short: "Add 1 more dish to continue." */
export function missingLine(missing: number): string {
  return `Add ${missing} more ${plural(missing, 'dish', 'dishes')} to continue.`;
}

/** The rail's first line: "5 of 6 dishes". */
export function progressLine(filled: number, size: number): string {
  return `${filled} of ${size} dishes`;
}

/* ---- The step this browser last reached -------------------------------------------- */

export const LAST_STEP_KEY = 'abbys-table:last-step:v1';

/** Reads the remembered step. Never throws: unreadable storage remembers nothing. */
export function readLastStep(storage: Pick<Storage, 'getItem'> | null | undefined): BoxStep | null {
  try {
    const value = storage?.getItem(LAST_STEP_KEY);
    return isBoxStep(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Remembers `step` if it is further than the one held (a customer who went back
 * to Step 2 to add a dish still resumes where they had got to). Never throws.
 */
export function rememberStep(storage: Pick<Storage, 'getItem' | 'setItem'> | null | undefined, step: BoxStep): void {
  try {
    const held = readLastStep(storage);
    if (held !== null && ORDER.indexOf(held) >= ORDER.indexOf(step)) return;
    storage?.setItem(LAST_STEP_KEY, step);
  } catch {
    // A blocked store costs a resume at the step after the dishes, nothing more.
  }
}

/** Forgets the step (the box is gone or became an order). Never throws. */
export function forgetStep(storage: Pick<Storage, 'removeItem'> | null | undefined): void {
  try {
    storage?.removeItem(LAST_STEP_KEY);
  } catch {
    // Nothing to forget in storage that cannot be reached.
  }
}

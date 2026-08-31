import { AonikError } from '../aonik/errors';
import type { BoxLine, PersonalisationSelection } from '../aonik/map';

export interface ProjectedExtraLine {
  lineId: string;
  variantId: string;
  quantity: number;
  personalisation?: PersonalisationSelection;
  unitPricePence?: number;
  /** Demo-v1 choice, resolved through the catalogue's sole group when rendered. */
  legacyOptionKey?: string;
}

/** Keeps Aonik line identity; variant identity is catalogue lookup only. */
export function projectAddOnLines(lines: BoxLine[]): ProjectedExtraLine[] {
  return lines
    .filter((line) => line.kind === 'AddOn')
    .map((line) => ({
      lineId: line.lineId,
      variantId: line.variantId,
      quantity: line.quantity,
      personalisation: line.personalisation,
      unitPricePence: line.unitPricePence,
    }));
}

/** Success effects run only after the authoritative mutation resolves. */
export async function afterCartMutation(
  mutation: () => void | Promise<void>,
  onSuccess: () => void,
): Promise<void> {
  await mutation();
  onSuccess();
}

/**
 * Answers only the conclusive stale-cart case. A failed probe says nothing
 * about whether the cart exists, so it must propagate and leave the cookie and
 * browser projection alone.
 */
export async function cartExistsAfterProbe(probe: () => Promise<unknown>): Promise<boolean> {
  try {
    await probe();
    return true;
  } catch (error) {
    if (error instanceof AonikError && error.isNotFound) return false;
    throw error;
  }
}

/** Records every authoritative projection, but announces only a clean change. */
export function recordCartProjection(
  last: { current: string | null },
  signature: string,
  failed: boolean,
): 'none' | 'failed' | 'succeeded' {
  const previous = last.current;
  last.current = signature;
  if (previous === null || previous === signature) return 'none';
  return failed ? 'failed' : 'succeeded';
}

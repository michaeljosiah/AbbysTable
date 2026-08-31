import type { PersonalisationSelection } from '../aonik/map';

type MutationInit = { method: 'POST' | 'PATCH' | 'DELETE'; body?: unknown };
export type CartMutationRequest = (path: string, init: MutationInit) => Promise<unknown>;

/** One atomic line edit; canonical One/Multi values pass through unchanged. */
export async function patchDishPersonalisation(
  request: CartMutationRequest,
  lineId: string,
  personalisation: PersonalisationSelection,
  applyToUnits?: number,
): Promise<void> {
  await request(`/lines/${lineId}`, {
    method: 'PATCH',
    body: {
      personalisation,
      ...(applyToUnits === undefined ? {} : { applyToUnits }),
    },
  });
}

export async function postExtra(
  request: CartMutationRequest,
  variantId: string,
  quantity: number,
  personalisation?: PersonalisationSelection,
): Promise<void> {
  await request('/extras', {
    method: 'POST',
    body: { productVariantId: variantId, quantity, personalisation },
  });
}

export async function patchExtra(
  request: CartMutationRequest,
  lineId: string,
  patch: { quantity?: number; personalisation?: PersonalisationSelection },
): Promise<void> {
  await request(`/lines/${lineId}`, { method: 'PATCH', body: patch });
}

export async function deleteExtra(
  request: CartMutationRequest,
  lineId: string,
): Promise<void> {
  await request(`/lines/${lineId}`, { method: 'DELETE' });
}

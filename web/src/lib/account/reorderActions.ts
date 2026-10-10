'use server';

/**
 * Order again's server action. Outcomes are values (a thrown error in a server
 * action reaches the client as an opaque digest). The order id is checked to be
 * a GUID before it goes anywhere near an Aonik path.
 */

import {
  reorderOrder,
  previewReorder,
  type ReorderPreview,
  type ReorderDishChoice,
  type ReorderOutcome,
} from '@/lib/cart/reorder';
import { SessionExpiredError } from '@/lib/auth/server';

export type ReorderActionResult = ReorderOutcome | { status: 'ended' };

export async function reorderAction(
  orderId: string,
  selections?: ReorderDishChoice[],
): Promise<ReorderActionResult> {
  if (typeof orderId !== 'string' || !/^[0-9a-f-]{32,36}$/i.test(orderId))
    return { status: 'not-reorderable' };
  try {
    if (
      selections &&
      (!Array.isArray(selections) ||
        !selections.length ||
        selections.length > 99 ||
        selections.some(
          (x) =>
            typeof x.selectionId !== 'string' ||
            !/^[0-9a-f-]{36}$/i.test(x.selectionId) ||
            !Number.isSafeInteger(x.quantity) ||
            x.quantity < 1 ||
            x.quantity > 99,
        ) ||
        selections.reduce((n, x) => n + x.quantity, 0) > 99)
    )
      return { status: 'not-reorderable' };
    return await reorderOrder(orderId, selections);
  } catch (error) {
    if (error instanceof SessionExpiredError) return { status: 'ended' };
    console.error(
      '[account] a reorder failed unexpectedly',
      error instanceof Error ? error.name : error,
    );
    return { status: 'failed' };
  }
}

export async function previewReorderAction(
  orderId: string,
): Promise<
  { status: 'ready'; preview: ReorderPreview } | { status: 'failed' | 'ended' }
> {
  if (typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId))
    return { status: 'failed' };
  try {
    return { status: 'ready', preview: await previewReorder(orderId) };
  } catch (error) {
    return {
      status: error instanceof SessionExpiredError ? 'ended' : 'failed',
    };
  }
}

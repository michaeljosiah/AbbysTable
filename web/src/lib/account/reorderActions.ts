'use server';

/**
 * Order again's server action. Outcomes are values (a thrown error in a server
 * action reaches the client as an opaque digest). The order id is checked to be
 * a GUID before it goes anywhere near an Aonik path.
 */

import { reorderOrder, type ReorderOutcome } from '@/lib/cart/reorder';
import { SessionExpiredError } from '@/lib/auth/server';

export type ReorderActionResult = ReorderOutcome | { status: 'ended' };

export async function reorderAction(orderId: string): Promise<ReorderActionResult> {
  if (typeof orderId !== 'string' || !/^[0-9a-f-]{32,36}$/i.test(orderId)) return { status: 'not-reorderable' };
  try {
    return await reorderOrder(orderId);
  } catch (error) {
    if (error instanceof SessionExpiredError) return { status: 'ended' };
    console.error('[account] a reorder failed unexpectedly', error instanceof Error ? error.name : error);
    return { status: 'failed' };
  }
}

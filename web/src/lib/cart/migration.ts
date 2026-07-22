'use client';

/**
 * One-shot migration of a pre-existing localStorage box into a server cart.
 *
 * Someone may have been mid-build when this deploy landed. Their box lives in
 * `abbys-table:box:v1`; the live build has no idea about it. This replays it
 * into a real cart once, then deletes the key.
 *
 * Two rules govern the failure cases, and both exist to avoid losing someone's
 * work:
 *
 *  1. The storage key is deleted ONLY after the replay has succeeded. If Aonik
 *     is unreachable the local box stays exactly where it was and we try again
 *     next load — a failed migration must never be a lost box.
 *  2. Individual lines that no longer resolve are dropped from the replay
 *     rather than aborting it, and reported. A retired dish should cost the
 *     customer that dish, not the whole box.
 */

import type { CartState } from './CartProvider';

const STORAGE_KEY = 'abbys-table:box:v1';
/** Marks a completed migration so a re-created key is not replayed twice. */
const DONE_KEY = 'abbys-table:box-migrated:v1';

export interface MigrationOutcome {
  status: 'nothing-to-do' | 'migrated' | 'failed';
  /** Lines Aonik would not take, by title, for the drift notice. */
  dropped: string[];
}

function readLocalBox(): CartState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartState;
    if (!Array.isArray(parsed.lines)) return null;
    if (!Array.isArray(parsed.extras)) parsed.extras = [];
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Replays a stored box into a server cart.
 *
 * `post` is injected so this stays testable and so the caller owns the fetch
 * layer — it should be the provider's `/api/cart` request function.
 */
export async function migrateLocalBox(
  /**
   * Which bundle to build. The stored box never knew this — it predates the
   * server cart entirely — so it comes from the storefront config's
   * `defaultBoxSlug` plan, resolved by the caller.
   */
  bundleProductId: string,
  post: (path: string, body: unknown, method?: string) => Promise<unknown>,
): Promise<MigrationOutcome> {
  if (typeof window === 'undefined') return { status: 'nothing-to-do', dropped: [] };

  // Already done, or nothing stored.
  if (window.localStorage.getItem(DONE_KEY)) return { status: 'nothing-to-do', dropped: [] };

  const box = readLocalBox();
  if (!box || box.boxSize === null) return { status: 'nothing-to-do', dropped: [] };

  const dropped: string[] = [];

  try {
    // The size is the one thing that must land, so it goes first and its
    // failure aborts: a cart of the wrong size is worse than no cart.
    await post('/create', { bundleProductId, size: box.boxSize });

    for (const line of box.lines) {
      try {
        await post('/lines', { productVariantId: line.dishId, quantity: line.quantity });
      } catch {
        dropped.push(line.title);
      }
    }

    for (const extra of box.extras) {
      try {
        await post('/extras', { productVariantId: extra.extraId, quantity: extra.quantity });
      } catch {
        dropped.push(extra.extraId);
      }
    }

    // Destructive only on success.
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.setItem(DONE_KEY, new Date().toISOString());
    return { status: 'migrated', dropped };
  } catch {
    // The local box is untouched; the customer keeps everything and we retry.
    return { status: 'failed', dropped };
  }
}

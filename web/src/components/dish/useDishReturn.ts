'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { MappedOptionGroup } from '@/lib/aonik/map';
import type { PersonalisationDraft } from '@/lib/aonik/personalisation';
import { takeDishReturn, type DishRestore } from '@/lib/dish-return';
import {
  currentEntryStamp,
  discardDishReturnHere,
  loadDishReturn,
  reloadedHere,
  returnStorage,
  saveDishReturn,
  stampDishEntry,
  takeDishEntryStamps,
} from '@/lib/dish-return-storage';

/**
 * The navigation type describes the page a document FIRST rendered, so the
 * reload check belongs to the first dish page this document mounts — never to
 * a later client-side visit in the same document.
 */
let documentDishMounted = false;

/**
 * Settle-then-scroll (design/CLAUDE.md): wait for two consecutive frames with
 * the same document height, scroll, then confirm it landed. Instant, so the
 * global smooth scrolling cannot animate a restore. Returns a cancel.
 */
function settleThenScroll(y: number, onDone: () => void): () => void {
  let frame = 0;
  let last = -1;
  let stable = 0;
  let frames = 0;
  let cancelled = false;

  const scroll = (top: number) => window.scrollTo({ top, behavior: 'instant' });
  const tick = () => {
    if (cancelled) return;
    const height = document.documentElement.scrollHeight;
    stable = height === last ? stable + 1 : 0;
    last = height;
    frames += 1;
    if (stable >= 2 || frames > 90) {
      const top = Math.max(0, Math.min(y, height - window.innerHeight));
      scroll(top);
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        if (Math.abs(window.scrollY - top) > 2) scroll(top);
        onDone();
      });
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}

export interface DishReturnState {
  /** The whole selection to restore, or null. */
  selection: PersonalisationDraft | null;
  /** Call when the customer changes their choice: a record for this entry no longer applies. */
  discard: () => void;
}

/**
 * The dish end of the Our Standards return (`lib/dish-return.ts`).
 *
 * On mount, and only on a GENUINE return — the customer opened Our Standards
 * from this very entry (the record is marked departed) and came back to it,
 * by "Back to dish" or the browser — it hands back the customer's whole
 * selection for the personaliser to restore, puts the scroll position back
 * where the browser cannot, and disarms the record. A reload of this page, a
 * fresh visit, or a record that never departed restores nothing.
 *
 * Decided once per mount and remembered, so React's development double-invoke
 * of effects cannot take the decision twice and then lose the scroll.
 */
export function useDishReturn(slug: string, groups: MappedOptionGroup[]): DishReturnState {
  const [selection, setSelection] = useState<PersonalisationDraft | null>(null);
  const decision = useRef<DishRestore | null | undefined>(undefined);
  const scrolled = useRef(false);

  useLayoutEffect(() => {
    if (decision.current === undefined) {
      const firstMount = !documentDishMounted;
      documentDishMounted = true;

      decision.current = takeDishReturn(returnStorage(), {
        slug,
        groups,
        now: Date.now(),
        entryStamps: takeDishEntryStamps(),
        reloaded: firstMount && reloadedHere(window.location.pathname),
      });
      if (decision.current) {
        // Bind the (disarmed) record to the entry the customer is now on —
        // after a replace that is a new entry — so Forward and Back keep the
        // choice and an edit here drops it.
        stampDishEntry(decision.current.entry);
        if (decision.current.selection) setSelection(decision.current.selection);
      }
    }

    const current = decision.current;
    if (!current || !current.restoreScroll || scrolled.current) return;
    const cancel = settleThenScroll(current.y, () => {
      scrolled.current = true;
    });
    return () => cancel();
  }, [slug, groups]);

  // Restored from the back-forward cache, the page was never torn down: there
  // is nothing to reapply, but a departed record for this entry is spent, so
  // it is disarmed exactly as a restore would leave it.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const record = loadDishReturn(slug);
      if (record?.departed && record.entry === currentEntryStamp()) {
        saveDishReturn({ ...record, departed: false, returning: false });
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [slug]);

  const discard = useCallback(() => discardDishReturnHere(slug), [slug]);

  return { selection, discard };
}

'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { MappedOptionGroup } from '@/lib/aonik/map';
import type { PersonalisationDraft } from '@/lib/aonik/personalisation';
import { takeDishReturn, type DishRestore } from '@/lib/dish-return';
import {
  clearDishReturn,
  loadDishReturn,
  returnStorage,
  takeDishEntryStamps,
} from '@/lib/dish-return-storage';

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

/**
 * The dish end of the Our Standards return (`lib/dish-return.ts`).
 *
 * On mount, and only on a GENUINE return — a live record for this dish that
 * "Back to dish" marked, or a return (by any route) to the very history entry
 * the customer left from — it consumes the record, puts the scroll position
 * back and
 * returns the customer's whole selection for the personaliser to restore
 * (null when there is nothing to restore). A fresh visit returns null and
 * touches nothing.
 *
 * Decided once per mount and remembered, so React's development double-invoke
 * of effects cannot consume the record and then lose the scroll.
 */
export function useDishReturn(
  slug: string,
  groups: MappedOptionGroup[],
): PersonalisationDraft | null {
  const [selection, setSelection] = useState<PersonalisationDraft | null>(null);
  const decision = useRef<DishRestore | null | undefined>(undefined);
  const scrolled = useRef(false);

  useLayoutEffect(() => {
    if (decision.current === undefined) {
      // Consumes the record on a genuine return, so it can never apply twice.
      decision.current = takeDishReturn(returnStorage(), {
        slug,
        groups,
        now: Date.now(),
        entryStamps: takeDishEntryStamps(),
      });
      if (decision.current?.selection) setSelection(decision.current.selection);
    }

    const current = decision.current;
    if (!current || scrolled.current) return;
    const cancel = settleThenScroll(current.y, () => {
      scrolled.current = true;
    });
    return () => cancel();
  }, [slug, groups]);

  // Restored from the back-forward cache, the page was never torn down: there
  // is nothing to reapply, but the return mark is spent all the same.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (loadDishReturn(slug)?.returning) clearDishReturn();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [slug]);

  return selection;
}

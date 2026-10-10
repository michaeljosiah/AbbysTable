'use client';

import { useEffect, useRef, type RefObject } from 'react';

import { holdDocumentFlag, OVERLAY_OPEN_ATTR } from '@/lib/dom/documentFlag';
import { trapFocus } from '@/lib/dom/focusTrap';
import { inertOutside } from '@/lib/dom/inert';

/**
 * One behaviour for checkout's overlays (design/CLAUDE.md, "Bottom sheets are
 * TRUE MODALS"): the ⓘ notes, the calendar and the order sheet.
 *
 * - `modal` (a phone bottom sheet): everything else is inert, the page does
 *   not scroll behind it, Tab and Shift+Tab cycle inside it, and the purchase
 *   chrome yields (`data-overlay-open`).
 * - Not modal (a popover from 640): nothing is trapped; a press outside it —
 *   and outside the control that opened it — closes it.
 * - Either way Escape closes it, and closing returns focus to the exact
 *   control that opened it when that control is still on screen.
 */
export function useOverlay({
  open,
  modal,
  onClose,
  panel,
  scrim,
  opener,
}: {
  open: boolean;
  modal: boolean;
  onClose: () => void;
  panel: RefObject<HTMLElement | null>;
  scrim?: RefObject<HTMLElement | null>;
  /** The control that opened it; focus goes back there on close. */
  opener: RefObject<HTMLElement | null>;
}): void {
  const close = useRef(onClose);
  // Which control opens it can change while it is open (the date's hold
  // ending swaps the button that opened the calendar): the one that opened it
  // is taken as it opens, and the overlay is not set up again for the swap.
  const openerRef = useRef(opener);
  useEffect(() => {
    close.current = onClose;
    openerRef.current = opener;
  });

  useEffect(() => {
    if (!open) return;
    const returnTo = openerRef.current.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close.current();
      } else if (event.key === 'Tab' && modal && panel.current) {
        trapFocus(event, panel.current);
      }
    };
    const onPress = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || panel.current?.contains(target) || openerRef.current.current?.contains(target)) return;
      close.current();
    };
    document.addEventListener('keydown', onKey);
    if (!modal) document.addEventListener('pointerdown', onPress);

    let release: (() => void) | undefined;
    let releaseFlag: (() => void) | undefined;
    let overflow: string | undefined;
    if (modal) {
      release = inertOutside([panel.current, scrim?.current ?? null]);
      releaseFlag = holdDocumentFlag(OVERLAY_OPEN_ATTR);
      overflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPress);
      release?.();
      releaseFlag?.();
      if (overflow !== undefined) document.body.style.overflow = overflow;
      // Back to the opener, if it is still there to take focus.
      if (returnTo && returnTo.isConnected && returnTo.getClientRects().length > 0) {
        returnTo.focus({ preventScroll: false });
      }
    };
  }, [open, modal, panel, scrim]);
}

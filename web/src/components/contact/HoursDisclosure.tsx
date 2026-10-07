'use client';

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

import { useMediaQuery } from '@/lib/dom/hooks';
import { DESKTOP_QUERY } from '@/lib/site-header/visibility';

import { HOURS_HEADING_ID, HOURS_PANEL_ID } from './ids';
import { revealBottom, revealUnderHeader } from './reveal';

/**
 * "See opening hours" — the Phone card's control and the hours block it
 * reveals, which are two cells of the page's one grid (the design's reason
 * for a single 12-column grid: CSS can only move a cell within the SAME grid).
 *
 * Below 1024 the block sits under the Phone card, collapsed, and the control
 * is a disclosure (`aria-expanded`, `aria-controls`). From 1024 the block is
 * the top of the sidebar and always open, so the control stops being a
 * disclosure and becomes a jump: it moves focus to the block's heading and
 * scrolls it clear of the header. Its ARIA follows the width — attributes
 * cannot be swapped in CSS. The provider holds the one open flag the two
 * cells share; the page's sections stay Server Components, passed through.
 */

interface HoursDisclosureState {
  open: boolean;
  setOpen: (open: boolean) => void;
  panelRef: RefObject<HTMLDivElement | null>;
}

const HoursContext = createContext<HoursDisclosureState | null>(null);

export function HoursDisclosureProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ open, setOpen, panelRef }), [open]);
  return <HoursContext.Provider value={value}>{children}</HoursContext.Provider>;
}

function useHours(): HoursDisclosureState {
  const state = useContext(HoursContext);
  if (!state) throw new Error('Opening hours controls must be inside <HoursDisclosureProvider>.');
  return state;
}

export function HoursButton({
  className,
  labelClassName,
  chevronClassName,
}: {
  className?: string;
  labelClassName?: string;
  chevronClassName?: string;
}) {
  const { open, setOpen, panelRef } = useHours();
  // False on the server and while hydrating, so the first render is the
  // phone's disclosure; the desktop semantics follow on the client.
  const desktop = useMediaQuery(DESKTOP_QUERY);

  const onClick = () => {
    if (!desktop) {
      const next = !open;
      setOpen(next);
      if (next) {
        // The block animates open from 0 height; its inner box is never
        // height-constrained, so it is what to measure — after this commit.
        requestAnimationFrame(() => {
          const box = panelRef.current?.querySelector<HTMLElement>('[data-hours-box]');
          if (box) revealBottom(box);
        });
      }
      return;
    }
    const heading = document.getElementById(HOURS_HEADING_ID);
    if (!heading) return;
    // Focus first, without scrolling, then scroll: focusing afterwards makes
    // the browser jump to it and cancels the smooth scroll.
    heading.focus({ preventScroll: true });
    revealUnderHeader(heading, 24);
  };

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-expanded={desktop ? undefined : open}
      aria-controls={desktop ? undefined : HOURS_PANEL_ID}
      data-open={!desktop && open ? 'true' : undefined}
    >
      <span className={labelClassName}>
        {!desktop && open ? 'Hide opening hours' : 'See opening hours'}
      </span>{' '}
      {/* A DOWN arrow: it moves the reader down this page, not away from it. */}
      <span className={chevronClassName} aria-hidden="true">
        ↓
      </span>
    </button>
  );
}

/** The hours block: one cell, collapsed under the Phone card below 1024. */
export function HoursPanel({ className, children }: { className?: string; children: ReactNode }) {
  const { open, panelRef } = useHours();
  return (
    <div ref={panelRef} id={HOURS_PANEL_ID} className={className} data-open={open ? 'true' : undefined}>
      {children}
    </div>
  );
}

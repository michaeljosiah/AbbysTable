'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';

import type { WaitlistServiceId } from '@/lib/content/privateTable';

/**
 * The waitlist's service choice, shared between the form's "Which service"
 * and the service cards' "Join the waitlist" — which picks its own service
 * and takes the customer to the form (the design's `onPick`). The How it
 * works page's `BoxSizeProvider` pattern: one piece of state, everything
 * between the two still server-rendered.
 */
interface WaitlistChoice {
  service: WaitlistServiceId | '';
  choose: (service: WaitlistServiceId | '') => void;
}

const WaitlistChoiceContext = createContext<WaitlistChoice | null>(null);

export function WaitlistChoiceProvider({ children }: { children: ReactNode }) {
  const [service, choose] = useState<WaitlistServiceId | ''>('');
  const value = useMemo(() => ({ service, choose }), [service]);
  return <WaitlistChoiceContext.Provider value={value}>{children}</WaitlistChoiceContext.Provider>;
}

/** The shared choice, or a form-local one when there is no provider. */
export function useWaitlistChoice(): WaitlistChoice {
  const shared = useContext(WaitlistChoiceContext);
  const [service, choose] = useState<WaitlistServiceId | ''>('');
  return shared ?? { service, choose };
}

/**
 * Marks what a jump into a section focuses: the section's heading, or —
 * when the section holds several — the LAST marked element in it, so a
 * confirmation that has replaced the form wins over the heading above it.
 */
export const JUMP_FOCUS_ATTR = 'data-jump-focus';

interface SectionJumpProps {
  /** The section to go to; its CSS `scroll-margin-top` sets the offset. */
  targetId: string;
  /** Picks this waitlist service on the way (a service card's CTA). */
  service?: WaitlistServiceId;
  className?: string;
  children: ReactNode;
}

/**
 * An in-page jump that takes FOCUS with it (the design's `_jumpTo`): it
 * scrolls the section clear of the header and moves focus to its heading, so a
 * keyboard user lands where they were sent rather than back at the top of the
 * document. No history entry — the design's jump adds none.
 *
 * The href stays a real fragment, so with no JavaScript (or a modified click)
 * it is an ordinary anchor and still lands; it only cannot pick a service.
 */
export function SectionJump({ targetId, service, className, children }: SectionJumpProps) {
  const { choose } = useWaitlistChoice();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    if (service) choose(service);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const margin = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
    window.scrollTo({
      top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - margin),
      behavior: reduce ? 'instant' : 'smooth',
    });

    const marked = target.querySelectorAll<HTMLElement>(`[${JUMP_FOCUS_ATTR}]`);
    marked[marked.length - 1]?.focus({ preventScroll: true });
  };

  return (
    <a href={`#${targetId}`} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

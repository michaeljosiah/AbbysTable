'use client';

import Link from 'next/link';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { boxBuilderHref } from '@/lib/how-it-works/boxSizes';

/**
 * The size chosen on How it works step 1, shared with every purchase link on
 * the page.
 *
 * Contract §4c: the hero CTA, the panel CTA and the closing CTA all carry the
 * choice as `?dishes=`, so a customer who picks 18, scrolls back up and taps
 * the hero's Build a Box does not lose it. The provider holds only the id; the
 * page's sections stay Server Components, passed through as `children`.
 */
interface BoxSizeState {
  selectedId: string | null;
  select: (id: string) => void;
}

const BoxSizeContext = createContext<BoxSizeState | null>(null);

export function BoxSizeProvider({
  defaultId,
  children,
}: {
  /** Server-chosen default, so the first render (and no-JS) links match it. */
  defaultId: string | null;
  children: ReactNode;
}) {
  const [selectedId, select] = useState(defaultId);
  const value = useMemo(() => ({ selectedId, select }), [selectedId]);
  return <BoxSizeContext.Provider value={value}>{children}</BoxSizeContext.Provider>;
}

export function useBoxSize(): BoxSizeState {
  const state = useContext(BoxSizeContext);
  if (!state) throw new Error('useBoxSize must be used inside <BoxSizeProvider>.');
  return state;
}

/**
 * A purchase link to Choose Box carrying the current choice. Server-rendered
 * with the default, so without JavaScript it still lands on a valid size.
 */
export function BoxSizeLink({ className, children }: { className?: string; children: ReactNode }) {
  const { selectedId } = useBoxSize();
  return (
    <Link href={boxBuilderHref(selectedId)} className={className}>
      {children}
    </Link>
  );
}

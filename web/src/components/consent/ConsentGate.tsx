'use client';

import type { ReactNode } from 'react';

import type { ConsentCategory } from '@/lib/consent/consent';
import { useConsentGranted } from '@/lib/consent/useConsent';

interface ConsentGateProps {
  category: ConsentCategory;
  children: ReactNode;
}

/**
 * The React gate for a non-essential technology. Every preference, analytics
 * or advertising tag rendered by a component MUST sit inside one — see the
 * rule at the top of `@/lib/consent/consent`:
 *
 *   <ConsentGate category="analytics">
 *     <SomeAnalytics />
 *   </ConsentGate>
 *
 * Children mount only while the category is granted by a valid stored choice,
 * and unmount the moment it is withdrawn — no reload — so a tag component
 * stops its processing in its effect cleanup.
 *
 * Nothing renders on the server or before the consent manager has read the
 * stored choice, so a tag never reaches the HTML and nothing runs without
 * JavaScript. That is also why a `<noscript>` fallback must never go in here.
 */
export function ConsentGate({ category, children }: ConsentGateProps) {
  return useConsentGranted(category) ? <>{children}</> : null;
}

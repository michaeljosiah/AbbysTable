'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useCart } from '@/lib/cart/CartProvider';
import { guardRedirect, type BoxStep } from '@/lib/shopping-state';

/**
 * One gate for every box step (#14; SHOPPING-STATE §6–7): a step can be entered
 * only when every step before it is satisfied. A box that cannot be taken
 * further as it stands — no size yet, short of dishes, a dish no longer
 * available — is sent back to the earliest step that can mend it, from any of
 * them. The rule is `guardRedirect` over the shared shopping state, the same
 * reading the header's VIEW BOX uses, so the two can never disagree.
 *
 * Once the step is allowed it is remembered, so VIEW BOX resumes here.
 *
 * A box the cart could not READ is not a box that is gone: only an answer moves
 * the page (a failed read leaves the customer where they are). A failed CHANGE
 * is not a failed read: the box it answered with is the box.
 *
 * Returns `blocked` while the customer is being sent back, so the page can say
 * so rather than flash a step they cannot use. Nothing is decided before the
 * cart has been read.
 */
export function useStepGuard(step: BoxStep): { blocked: boolean } {
  const router = useRouter();
  const { hydrated, shopping, rememberStep, readFailed } = useCart();
  const redirect = hydrated && !shopping.ordered && !readFailed ? guardRedirect(step, shopping) : null;

  useEffect(() => {
    if (!hydrated || shopping.ordered || readFailed) return;
    if (redirect !== null) router.replace(redirect);
    else if (shopping.active) rememberStep(step);
  }, [hydrated, shopping.ordered, shopping.active, readFailed, redirect, router, rememberStep, step]);

  return { blocked: redirect !== null };
}

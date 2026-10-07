/**
 * Bringing something the Contact page just moved focus to into view, clear of
 * the sticky header. Browser-only helpers for the page's client components.
 *
 * The header's FULL height is the clearance, not `--site-header-offset`: a
 * scroll back up the page brings a hidden header back, and it would land over
 * the very field being shown.
 */

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function headerClearance(): number {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  return header ? header.offsetHeight : 0;
}

/**
 * Scrolls `element` to sit `gap`px under the header — only when it is not
 * already fully in view, so a field on screen never jumps.
 */
export function revealUnderHeader(element: HTMLElement, gap = 20): void {
  const clearance = headerClearance();
  const rect = element.getBoundingClientRect();
  const visible = rect.top >= clearance && rect.bottom <= window.innerHeight;
  if (visible) return;
  window.scrollTo({
    top: Math.max(0, window.scrollY + rect.top - clearance - gap),
    behavior: reducedMotion() ? 'auto' : 'smooth',
  });
}

/**
 * Nudges the page down by the least that brings `element`'s bottom edge into
 * view, plus `gap` — for a panel that opened below the fold. Never scrolls up.
 */
export function revealBottom(element: HTMLElement, gap = 16): void {
  const overshoot = element.getBoundingClientRect().bottom + gap - window.innerHeight;
  if (overshoot <= 0) return;
  window.scrollTo({
    top: window.scrollY + overshoot,
    behavior: reducedMotion() ? 'auto' : 'smooth',
  });
}

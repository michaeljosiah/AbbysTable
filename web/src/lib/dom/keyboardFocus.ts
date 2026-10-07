/**
 * Whether `container` holds KEYBOARD focus — the active element is inside it
 * and the browser shows it a focus ring (`:focus-visible`).
 *
 * The header's guards (never "down", never hidden while focus is inside) exist
 * for someone tabbing through it. A pointer click that merely leaves focus
 * behind — the wordmark, a nav link that survives client navigation, the
 * burger refocused after Close or the scrim — must not pin the header shown
 * and freeze the shared scroll direction. Browsers without `:focus-visible`
 * fall back to treating any focus as keyboard focus.
 */
export function hasKeyboardFocusWithin(container: Element | null | undefined): boolean {
  const active = document.activeElement;
  if (!container || !active || !container.contains(active)) return false;
  return isKeyboardFocused(active);
}

/** Whether `element` was focused in a way that shows a focus ring. */
export function isKeyboardFocused(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

/**
 * Keeps Tab and Shift+Tab inside an open modal (design/abbys-table-page-
 * behaviour-guide.md §A6): from the last control to the first and back, and
 * pulled in from wherever focus has wandered (the dialog itself, the page).
 * Only rendered controls count — a hidden one has no box.
 *
 * Call from a `keydown` listener when `event.key === 'Tab'`.
 */
export function trapFocus(event: KeyboardEvent, container: HTMLElement): void {
  const controls = Array.from(
    container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea'),
  ).filter((element) => element.getClientRects().length > 0);

  if (controls.length === 0) {
    event.preventDefault();
    return;
  }

  const first = controls[0];
  const last = controls[controls.length - 1];
  const active = document.activeElement;

  if (active === container || !container.contains(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

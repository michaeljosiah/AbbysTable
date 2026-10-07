/**
 * Swallows every click on the page for `ms`: the guard against a GHOST TAP.
 *
 * A control that navigates the moment it is tapped can land the customer on a
 * page with another fixed control in the same spot — the dish page's mobile
 * bar ADD TO BOX and Step 1's Continue (or Step 2's) share the bottom edge, so
 * a double tap became a box size the customer never chose. Capture phase on
 * the document: it runs before any React handler, stops the click reaching
 * one and cancels a link's navigation, and it outlives the client-side
 * navigation in between because the document does.
 */
export function swallowClicksFor(ms: number): void {
  const swallow = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const capture = { capture: true } as const;
  document.addEventListener('click', swallow, capture);
  window.setTimeout(() => document.removeEventListener('click', swallow, capture), ms);
}

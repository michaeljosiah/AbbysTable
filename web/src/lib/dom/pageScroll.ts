/**
 * The page's scroll position and direction, tracked ONCE for everything that
 * follows it — the marketing header (it hides going down) and the mobile
 * purchase bar (it shows going down). One tracker, one direction: the two can
 * never disagree, so there is one order CTA on screen at a time
 * (design/CLAUDE.md "Mobile purchase CTA + header behaviour").
 *
 * The rules are `nextDirection` (lib/purchase-bar/visibility.ts: 8px
 * threshold, 120px floor, header focus guard); this module is only the DOM
 * glue, started by the first subscriber and stopped with the last.
 *
 * Scroll is heard on the document in the CAPTURE phase, not on window alone
 * (design/CLAUDE.md, Choose Box "Bar suppression"): when an ancestor container
 * does the scrolling — a host preview, an embedded frame — window `scroll`
 * never fires and `window.scrollY` stays 0. The position is then read from
 * that container. A scroll inside something that does not hold the page (a
 * dish rail, a sheet's list) is passed on as `other`: it is not the page
 * moving, so it never counts towards the direction, but a subscriber that
 * measures markers may still want to look again.
 *
 * Focus moving INTO the header while the page reads "down" turns it to "not
 * down": the header comes back for the keyboard user, and the bar — which
 * follows the same direction — steps aside for it.
 */

import {
  initialDirection,
  nextDirection,
  SITE_HEADER_ATTR,
  type ScrollDirection,
} from '@/lib/purchase-bar/visibility';

export interface PageScroll {
  /** The page's scroll position. */
  y: number;
  direction: ScrollDirection;
  /** The ancestor doing the scrolling, or null while the window does. */
  scroller: Element | null;
}

/** `page`: the page moved (or its direction changed). `other`: something inside it scrolled. */
export type PageScrollChange = 'page' | 'other';

type Listener = (change: PageScrollChange) => void;

const listeners = new Set<Listener>();
let current: PageScroll | null = null;

function siteHeader(): Element | null {
  return document.querySelector(`[${SITE_HEADER_ATTR}]`);
}

/** Something that holds the page: the header or the main content. */
function holdsPage(element: Element): boolean {
  const anchor = siteHeader() ?? document.querySelector('main');
  return Boolean(anchor && element.contains(anchor));
}

function notify(change: PageScrollChange) {
  for (const listener of Array.from(listeners)) listener(change);
}

function onScroll(event: Event) {
  if (!current) return;
  const source = event.target;
  let y: number;
  let scroller: Element | null;

  if (!(source instanceof Element)) {
    scroller = null;
    y = window.scrollY;
  } else if (
    holdsPage(source) &&
    // A container that only scrolls sideways is not the page moving.
    source.scrollHeight > source.clientHeight
  ) {
    scroller = source;
    y = source.scrollTop;
  } else {
    notify('other');
    return;
  }

  const header = siteHeader();
  current = {
    y,
    scroller,
    direction: nextDirection(current.direction, y, {
      holdDown: Boolean(header?.contains(document.activeElement)),
    }),
  };
  notify('page');
}

function onFocusIn(event: FocusEvent) {
  if (!current?.direction.down) return;
  const header = siteHeader();
  if (!header || !(event.target instanceof Node) || !header.contains(event.target)) return;
  current = { ...current, direction: { lastY: current.y, down: false } };
  notify('page');
}

const LISTEN = { capture: true, passive: true } as const;

function start() {
  const y = window.scrollY;
  current = { y, scroller: null, direction: initialDirection(y) };
  document.addEventListener('scroll', onScroll, LISTEN);
  document.addEventListener('focusin', onFocusIn);
}

function stop() {
  document.removeEventListener('scroll', onScroll, LISTEN);
  document.removeEventListener('focusin', onFocusIn);
  current = null;
}

/** Follows the page's scroll. Returns the unsubscribe. Browser only. */
export function subscribePageScroll(listener: Listener): () => void {
  if (listeners.size === 0) start();
  listeners.add(listener);
  return () => {
    if (!listeners.delete(listener)) return;
    if (listeners.size === 0) stop();
  };
}

/** The latest reading, or null while nothing is subscribed. */
export function readPageScroll(): PageScroll | null {
  return current;
}

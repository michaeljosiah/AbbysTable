import { BOX_BUILDER_PATH } from '@/lib/how-it-works/boxSizes';

/*
 * Legal pages opened from checkout (site-chrome spec FR-22;
 * design/SHOPPING-STATE.md §40; design/CLAUDE.md, "Legal line").
 *
 * 1. Checkout's legal line — "By continuing, you agree to our Terms of Sale
 *    and acknowledge our Privacy Policy." — opens both documents in a NEW TAB
 *    (`CHECKOUT_LEGAL_LINK`, a visually hidden `NEW_TAB_NOTE`) at
 *    `checkoutLegalHref(...)`, which adds checkout's origin marker
 *    `?from=checkout`. Checkout itself is never navigated, so its state stays
 *    in its own tab. The line belongs to Checkout v2, which is not built yet:
 *    Checkout (#31) wires it. Checkout's FOOTER legal links are untouched —
 *    same tab, no marker, no return link.
 *
 * 2. A legal page shows "← Back to checkout" above its h1 only while its URL
 *    carries the marker (`isFromCheckout`). No opener or referrer is needed to
 *    SHOW it: browsers sever openers and strip referrers, and a real visit from
 *    checkout must not lose the control. The page is static, so the server
 *    renders the control hidden and the browser reveals it — an inline script
 *    before first paint (`checkoutReturnGateScript`), a layout effect after a
 *    client-side navigation. Without JavaScript it never shows: it could not
 *    switch tabs anyway, and the checkout is still in its tab.
 *
 * 3. Pressing it MAY focus the checkout tab where the browser allows — only
 *    through an opener that is still open, on this origin and still in the
 *    purchase journey (`reachableCheckout`). It never depends on that: it
 *    never closes the legal tab and never navigates, so it can never open a
 *    second checkout. When it cannot switch, the page stays and says so
 *    (`CHECKOUT_STILL_OPEN`).
 *
 * The marker survives the legal pages' own URL writes (`fragmentUrl` keeps the
 * query), and a link to the same document without it — the footer's "Privacy
 * Policy", the cookie panel's "section 7" — is a jump within the page, not a
 * new visit that would drop it (`documentQuery`).
 */

/** Checkout's origin marker: `?from=checkout`. */
export const CHECKOUT_ORIGIN_PARAM = 'from';
export const CHECKOUT_ORIGIN_VALUE = 'checkout';

/**
 * How checkout's legal line opens a document: a new tab, keeping the opener so
 * the legal page can focus checkout again where the browser allows (the
 * design's `rel="opener"`; browsers default `_blank` to `noopener`). Both
 * documents are this origin's own pages.
 */
export const CHECKOUT_LEGAL_LINK = { target: '_blank', rel: 'opener' } as const;

/** Visually hidden after each link text in checkout's legal line. */
export const NEW_TAB_NOTE = ' (opens in a new tab)';

/** What the legal page says when it cannot switch back (design/CLAUDE.md, verbatim). */
export const CHECKOUT_STILL_OPEN =
  'Your checkout is still open in your previous tab. Switch back to it to carry on.';

/**
 * Where checkout's legal line links: the document with the origin marker, before
 * any fragment (`/privacy#cookies` → `/privacy?from=checkout#cookies`).
 */
export function checkoutLegalHref(href: string): string {
  const hashAt = href.indexOf('#');
  const path = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : href.slice(hashAt);
  const queryAt = path.indexOf('?');
  if (queryAt !== -1 && isFromCheckout(path.slice(queryAt))) return href;
  const marker = `${CHECKOUT_ORIGIN_PARAM}=${CHECKOUT_ORIGIN_VALUE}`;
  return `${path}${queryAt === -1 ? '?' : '&'}${marker}${hash}`;
}

/** Whether a URL's query (`location.search`) carries checkout's origin marker. */
export function isFromCheckout(search: string): boolean {
  return new URLSearchParams(search).get(CHECKOUT_ORIGIN_PARAM) === CHECKOUT_ORIGIN_VALUE;
}

/**
 * The part of a query that names the DOCUMENT: the query without checkout's
 * marker, normalised. The marker says how this tab was opened, not which page
 * it shows, so `/privacy?from=checkout` and `/privacy` are one document.
 */
export function documentQuery(search: string): string {
  const params = new URLSearchParams(search);
  if (params.get(CHECKOUT_ORIGIN_PARAM) === CHECKOUT_ORIGIN_VALUE) params.delete(CHECKOUT_ORIGIN_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

/**
 * The purchase journey's routes: the box builder and, when it lands, Checkout
 * (#31) — keep it under this path or add its own here. An opener that has
 * since left the journey no longer holds a checkout to go back to.
 */
export const CHECKOUT_JOURNEY_PATH = BOX_BUILDER_PATH;

/** The parts of a window `reachableCheckout` reads; any of them may throw cross-origin. */
export interface OpenerLike {
  readonly closed: boolean;
  readonly location: { readonly origin: string; readonly pathname: string };
  focus(): void;
}

/**
 * The checkout tab this one could focus, or `null`. Only an opener that is
 * still open, on this origin (reading a cross-origin `location` throws) and
 * still in the purchase journey. `null` is the ordinary case — a severed
 * opener, a closed or navigated checkout tab — and is never an error.
 */
export function reachableCheckout(opener: OpenerLike | null | undefined, origin: string): OpenerLike | null {
  try {
    if (!opener || opener.closed) return null;
    if (opener.location.origin !== origin) return null;
    const path = opener.location.pathname;
    const inJourney = path === CHECKOUT_JOURNEY_PATH || path.startsWith(`${CHECKOUT_JOURNEY_PATH}/`);
    return inJourney ? opener : null;
  } catch {
    return null;
  }
}

/**
 * The inline gate: reveals the server-rendered (hidden) control before first
 * paint when the URL carries the marker. Mirrors `isFromCheckout` — change one,
 * change both (the tests run the same cases through each).
 */
export function checkoutReturnGateScript(elementId: string): string {
  const args = [CHECKOUT_ORIGIN_PARAM, CHECKOUT_ORIGIN_VALUE, elementId]
    .map((value) => JSON.stringify(value).replace(/</g, '\\u003c'))
    .join(',');
  return (
    '(function(p,v,id){try{' +
    'if(new URLSearchParams(window.location.search).get(p)===v){' +
    'var el=document.getElementById(id);if(el)el.hidden=false}' +
    `}catch(e){}})(${args})`
  );
}

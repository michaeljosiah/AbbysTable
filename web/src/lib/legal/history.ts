import { documentQuery } from './checkoutReturn';
import { resolveLegalAnchor, type LegalDocument, type LegalSection } from './document';

/*
 * The URL rules for a legal document's navigation, kept free of the DOM so
 * they can be tested. The component (`LegalNavigation`) supplies `location`.
 */

/** The parts of `window.location` these rules read. */
export interface LocationLike {
  readonly origin: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}

/**
 * The URL to write so the address bar carries `slug` (or no fragment, for the
 * top of the document), or `null` when nothing may be written:
 *
 * - The reader has LEFT the document. Next pushes the next page's URL before
 *   it swaps the page out, so for a moment the outgoing document is still
 *   mounted and still scrolling; a write then would land on the new page's
 *   URL and strip its fragment (`/#standards` → `/`). Only the pathname the
 *   document was mounted under is ever written to.
 * - The URL already says so. A rewrite would cost a history call for nothing
 *   — WebKit throttles them — and a push would add a duplicate entry.
 */
export function fragmentUrl(location: LocationLike, documentPath: string, slug: string | null): string | null {
  if (location.pathname !== documentPath) return null;
  if (location.hash.replace(/^#/, '') === (slug ?? '')) return null;
  const base = `${location.pathname}${location.search}`;
  return slug ? `${base}#${slug}` : base;
}

/**
 * What a followed link means for this document: `'top'` for its "Back to top"
 * fragment or its own bare address, a section for any of its anchors — slug
 * or legacy number — and `null` for anywhere else. It must be this very
 * document: same origin, path and query. A link from the header or the cookie panel to
 * `/privacy#cookies`, followed while already on it, counts.
 *
 * Checkout's origin marker (`?from=checkout`) is not part of the document's
 * address (`documentQuery`): on `/privacy?from=checkout` those same links are
 * jumps within the page, so the URL keeps the marker and the page keeps
 * "← Back to checkout", instead of a navigation to the bare address losing both.
 */
export function linkTarget(
  doc: LegalDocument,
  href: string,
  location: LocationLike,
  topId: string,
): 'top' | LegalSection | null {
  let url: URL;
  try {
    url = new URL(href, `${location.origin}${location.pathname}${location.search}`);
  } catch {
    return null;
  }
  if (
    url.origin !== location.origin ||
    url.pathname !== location.pathname ||
    documentQuery(url.search) !== documentQuery(location.search)
  ) {
    return null;
  }
  // The page's own bare address (the footer's "Privacy Policy" on /privacy)
  // is a jump to the top, so focus goes with it rather than staying in the
  // footer thirty screens down.
  if (url.hash === '' || url.hash === `#${topId}`) return 'top';
  return resolveLegalAnchor(doc, url.hash)?.section ?? null;
}

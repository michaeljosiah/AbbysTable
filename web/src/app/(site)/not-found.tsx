import type { Metadata } from 'next';

import { NotFoundMessage } from '@/components/status/NotFoundMessage';
import { NOT_FOUND_COPY } from '@/lib/content/status';

export const metadata: Metadata = {
  title: NOT_FOUND_COPY.title,
};

/**
 * The 404 for `notFound()` thrown by a (site) page — an unknown dish slug, or
 * an order that is not yours — rendered inside the (site) layout, so the
 * header, footer and session state stay as they were. HTTP 404.
 *
 * Unmatched URLs never reach this boundary; the root `app/not-found.tsx`
 * answers them with the same message in the same chrome.
 *
 * Unlike that one, this page does not arrive server-rendered: Next answers the
 * document request with 404 and an empty `__next_error__` shell, and this
 * renders once JavaScript runs. That is Next's behaviour for `notFound()`
 * thrown from a page, and why unmatched URLs are not routed through here.
 */
export default function SiteNotFound() {
  return <NotFoundMessage />;
}

import type { Metadata } from 'next';

import { NotFoundMessage } from '@/components/status/NotFoundMessage';

export const metadata: Metadata = {
  title: 'Page not found — Abby’s Table',
};

/**
 * The 404 for `notFound()` thrown by a (site) page — an unknown dish slug, or
 * an order that is not yours — rendered inside the (site) layout, so the
 * header, footer and session state stay as they were. HTTP 404.
 *
 * Unmatched URLs never reach this boundary; the root `app/not-found.tsx`
 * answers them with the same message in the same chrome.
 */
export default function SiteNotFound() {
  return <NotFoundMessage />;
}

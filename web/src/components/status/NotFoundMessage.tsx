import { NOT_FOUND_COPY } from '@/lib/content/status';

import { StatusMessage } from './StatusMessage';

/**
 * The 404 band, copy verbatim from the design (Page Not Found;
 * design/SHOPPING-STATE.md §55). Shared by both not-found boundaries.
 *
 * The copy never speculates about whether something exists: the most likely
 * way a signed-in customer lands here is their own stale link to an order that
 * is not theirs, and Aonik answers that with 404 rather than 403 precisely so
 * there is no existence oracle.
 */
export function NotFoundMessage() {
  return (
    <StatusMessage
      kind="notFound"
      eyebrow={NOT_FOUND_COPY.eyebrow}
      title={NOT_FOUND_COPY.heading}
      lede={NOT_FOUND_COPY.lede}
      primary={{ label: NOT_FOUND_COPY.home, href: '/' }}
      secondary={{ label: NOT_FOUND_COPY.menu, href: '/menu' }}
    />
  );
}

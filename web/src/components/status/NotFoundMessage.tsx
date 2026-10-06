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
      eyebrow="Error 404"
      title="We couldn’t find that page."
      lede="The page may have moved, or the link may no longer be available."
      primary={{ label: 'Go to homepage', href: '/' }}
      secondary={{ label: 'View the menu', href: '/menu' }}
    />
  );
}

import { SUPPORT_CONTACT } from '@/lib/content/contact';
import { SERVER_ERROR_COPY } from '@/lib/content/status';

import { StatusFooter, StatusHeader } from './StatusChrome';
import { StatusMessage } from './StatusMessage';
import { SupportPanel } from './SupportPanel';

/**
 * The in-app "Something went wrong" page (design: Something Went Wrong;
 * design/SHOPPING-STATE.md §56), rendered by `app/error.tsx` and
 * `app/global-error.tsx`.
 *
 * Copy is the design's, verbatim, from `@/lib/content/status` — shared with
 * the static `public/500.html` that `lib/status-pages/render.ts` generates.
 * Reduced chrome by decision: when the system may be unhealthy, offer TRY
 * AGAIN and the homepage, not ordering or account actions. Every link is a
 * full page load; see `fullPageLinks`.
 */
export function ServerErrorPage({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <StatusHeader contactJump={SUPPORT_CONTACT !== null} />
      <main>
        <StatusMessage
          kind="error"
          mark="error"
          eyebrow={SERVER_ERROR_COPY.eyebrow}
          title={SERVER_ERROR_COPY.heading}
          lede={SERVER_ERROR_COPY.lede}
          primary={{ label: SERVER_ERROR_COPY.retry, onClick: onRetry }}
          secondary={{ label: SERVER_ERROR_COPY.home, href: '/' }}
          fullPageLinks
        >
          <SupportPanel contact={SUPPORT_CONTACT} />
        </StatusMessage>
      </main>
      <StatusFooter />
    </>
  );
}

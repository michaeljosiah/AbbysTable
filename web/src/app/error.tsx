'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { ServerErrorPage } from '@/components/status/ServerErrorPage';
import { SERVER_ERROR_COPY } from '@/lib/content/status';

/**
 * The in-app 500: any error thrown below the root layout — a page, or the
 * `(site)` / `(checkout)` / `(auth)` layouts themselves (Aonik unreachable,
 * say). Next answers the document request with HTTP 500 and an error shell
 * that renders this page once JavaScript runs.
 *
 * When the app cannot answer at all, nothing covers the customer yet: the
 * static `public/500.html` is generated for that case, but serving it needs a
 * CDN / Front Door rule that Azure Static Web Apps alone cannot express — an
 * owner decision (#13).
 *
 * It lives at the root rather than in `(site)` on purpose: the design's 500
 * carries reduced chrome of its own (design/build-handoff.md §3ah), and a
 * boundary here still renders when a route group's layout is what failed.
 *
 * TRY AGAIN refetches the route from the server and then resets the boundary
 * — `reset()` alone would re-render the same failed server payload.
 *
 * When the root layout itself fails, `global-error.tsx` takes over.
 */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <>
      {/* No metadata export from an error boundary; React 19 hoists this, and
          it replaces the failed page's title for as long as the boundary shows. */}
      <title>{SERVER_ERROR_COPY.title}</title>
      <ServerErrorPage onRetry={retry} />
    </>
  );
}

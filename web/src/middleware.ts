import { NextResponse } from 'next/server';

import { renderStatusPage } from '@/lib/status-pages/render';

/**
 * Maintenance mode: with `MAINTENANCE_MODE=true` in the server's environment,
 * EVERY request — pages, `/api/*`, assets — is answered with the "We'll be back
 * shortly" page, HTTP 503 and a Retry-After header (design/build-handoff.md
 * §3ai). 503 rather than 200 so search engines keep the real pages; never a
 * redirect. Unset, or anything but `true`, and this does nothing.
 *
 * The body is the same page as `public/maintenance.html`, rendered from the
 * same source, so it needs nothing from the app.
 *
 * The flag is read per request rather than at module scope, so `next start`
 * picks up a change on restart without a rebuild.
 *
 * `/.swa/*` is excluded: Azure Static Web Apps checks `/.swa/health.html` to
 * validate a deployment, and middleware must not touch it (SWA docs,
 * "Configure routing and middleware for deployment").
 */

/** A hint, not a promise: the page itself names no return time, by decision. */
const RETRY_AFTER_SECONDS = 3600;

let maintenancePage: string | undefined;

export function middleware(): NextResponse {
  if (process.env.MAINTENANCE_MODE !== 'true') return NextResponse.next();

  maintenancePage ??= renderStatusPage('maintenance');

  return new NextResponse(maintenancePage, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': String(RETRY_AFTER_SECONDS),
      // Nothing between here and the customer may keep this page once the
      // site is back.
      'Cache-Control': 'no-store',
    },
  });
}

export const config = {
  matcher: ['/((?!\\.swa(?:/|$)).*)'],
};

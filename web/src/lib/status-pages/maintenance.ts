/**
 * The maintenance answer — "We'll be back shortly", HTTP 503 and a
 * Retry-After header (design/build-handoff.md §3ai) — for the middleware and
 * for any route the middleware deliberately does not run on
 * (`/api/enquiries`, which takes bodies larger than middleware buffers).
 *
 * The body is the same page as `public/maintenance.html`, rendered from the
 * same source, so it needs nothing from the app. The flag is read per request
 * rather than at module scope, so `next start` picks up a change on restart
 * without a rebuild.
 */

import { renderStatusPage } from './render';

/** A hint, not a promise: the page itself names no return time, by decision. */
const RETRY_AFTER_SECONDS = 3600;

let maintenancePage: string | undefined;

export function inMaintenance(): boolean {
  return process.env.MAINTENANCE_MODE === 'true';
}

export function maintenanceResponse(): Response {
  maintenancePage ??= renderStatusPage('maintenance');
  return new Response(maintenancePage, {
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

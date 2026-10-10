import { NextResponse } from 'next/server';

import { inMaintenance, maintenanceResponse } from '@/lib/status-pages/maintenance';

/**
 * Maintenance mode: with `MAINTENANCE_MODE=true` in the server's environment,
 * every page and `/api/*` request is answered with the "We'll be back shortly"
 * page, HTTP 503 and a Retry-After header (design/build-handoff.md §3ai). 503
 * rather than 200 so search engines keep the real pages; never a redirect.
 * Unset, or anything but `true`, and this does nothing.
 *
 * The body is the same page as `public/maintenance.html`, rendered from the
 * same source, so it needs nothing from the app.
 *
 * The flag is read per request rather than at module scope, so `next start`
 * picks up a change on restart without a rebuild.
 *
 * Not matched at all, so this never runs for them:
 *  - `/.swa/*`: Azure Static Web Apps checks `/.swa/health.html` to validate a
 *    deployment, and middleware must not touch it (SWA docs, "Configure
 *    routing and middleware for deployment").
 *  - Static files — `/_next/static`, `/_next/image`, `public/assets`,
 *    `public/fonts` and the icons. The maintenance page loads none of them,
 *    and answering each with 120 kB of HTML (or running Edge code for each
 *    while the flag is off) helps no one. Any other root-level file in
 *    `public/` is still matched: add it here if it must load during
 *    maintenance.
 *  - `/api/enquiries`: the Contact form's photos (up to 30MB) are larger than
 *    the request body middleware buffers (10MB), so the route is left out and
 *    answers maintenance itself (`maintenanceResponse`).
 */

export function middleware(): NextResponse {
  if (!inMaintenance()) return NextResponse.next();
  const answer = maintenanceResponse();
  return new NextResponse(answer.body, { status: answer.status, headers: answer.headers });
}

export const config = {
  matcher: [
    '/((?!\\.swa(?:/|$)|_next/static/|_next/image(?:/|$)|api/enquiries(?:/|$)|assets/|fonts/|favicon\\.ico$|icon\\.svg$|apple-icon\\.png$).*)',
  ],
};

/**
 * `POST /api/enquiries` — the Contact form's door when JavaScript runs, and
 * the only one that can carry its photos: a server action takes 1MB, and the
 * form allows three images of up to 10MB each. Multipart, in the form's own
 * field names; answers the same `EnquiryState` the server action does
 * (`@/lib/contact/send`), as JSON.
 *
 * Left out of the middleware matcher, because middleware buffers request
 * bodies only up to 10MB — so it answers maintenance mode itself. Its own cap
 * is Aonik's: a request over 32MiB is refused before it is read, and one that
 * does not say how large it is is refused too (a browser's `fetch` of a
 * `FormData` always does).
 *
 * Unlike a server action, a route handler has no built-in origin check: a
 * post that names another site as its origin is refused, so no other page can
 * send enquiries through a visitor's browser.
 */

import { NextResponse } from 'next/server';

import { IMAGE_MESSAGES, type EnquiryState } from '@/lib/contact/enquiry';
import { sendEnquiryForm } from '@/lib/contact/send';
import { inMaintenance, maintenanceResponse } from '@/lib/status-pages/maintenance';

/** Never cached: every answer is about one post. */
export const dynamic = 'force-dynamic';

/** Aonik's limit for a whole enquiry (`SubmitContactEnquiryEndpoint.MaxRequestBytes`). */
const MAX_ENQUIRY_REQUEST_BYTES = 32 * 1024 * 1024;

const NO_STORE = { 'Cache-Control': 'no-store' };

function answer(state: EnquiryState, status = 200) {
  return NextResponse.json(state, { status, headers: NO_STORE });
}

/**
 * True when the request names an origin other than the host it was sent to —
 * the comparison Next makes for server actions: the `Origin` header against
 * `X-Forwarded-Host` (behind a proxy) or `Host`. Not `request.url`, which
 * Next rebuilds from its own configured hostname.
 */
function crossSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');
  if (!host) return true;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function POST(request: Request) {
  if (inMaintenance()) return maintenanceResponse();
  if (crossSite(request)) return answer({ status: 'error' }, 403);

  const length = Number(request.headers.get('content-length'));
  if (!Number.isFinite(length) || length <= 0) return answer({ status: 'error' }, 411);
  if (length > MAX_ENQUIRY_REQUEST_BYTES) {
    return answer({ status: 'invalid', imageError: IMAGE_MESSAGES.together }, 413);
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data')) {
    return answer({ status: 'error' }, 415);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return answer({ status: 'error' }, 400);
  }
  // The outcome is in the body: the form reads `status`, whatever the HTTP status.
  return answer(await sendEnquiryForm(form));
}

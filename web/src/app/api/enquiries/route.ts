/**
 * `POST /api/enquiries` — the Contact form's door when JavaScript runs, and
 * the only one that can carry its photos: a server action takes 1MB, and the
 * form allows three images of up to 10MB each. Multipart, in the form's own
 * field names; answers the same `EnquiryState` the server action does
 * (`@/lib/contact/send`), as JSON.
 *
 * Left out of the middleware matcher, because middleware buffers request
 * bodies only up to 10MB — so it answers maintenance mode itself.
 *
 * Reading a body costs memory (about three times its size, parsed), and this
 * process serves every page, so nothing is read until it must be: not in
 * demo, not past this address's limit (`admitEnquiry`), not over three full
 * images' worth, not without a declared length (a browser's `fetch` of a
 * `FormData` always declares one), and not while `MAX_IN_FLIGHT` others are
 * being read and sent — that one is told to try again.
 *
 * Unlike a server action, a route handler has no built-in origin check: a
 * post that names another site as its origin is refused, so no other page can
 * send enquiries through a visitor's browser.
 */

import { NextResponse } from 'next/server';

import { enquiriesAvailable } from '@/lib/aonik/enquiries';
import {
  IMAGE_MESSAGES,
  MAX_ENQUIRY_IMAGE_BYTES,
  MAX_ENQUIRY_IMAGES,
  type EnquiryState,
} from '@/lib/contact/enquiry';
import { admitEnquiry, ENQUIRY_LIMITED, sendEnquiryForm } from '@/lib/contact/send';
import { inMaintenance, maintenanceResponse } from '@/lib/status-pages/maintenance';

/** Never cached: every answer is about one post. */
export const dynamic = 'force-dynamic';

/**
 * The largest post the form can make: three full images and the text, with
 * room for the multipart framing. Under Aonik's own 32MiB for the request.
 */
const MAX_ENQUIRY_REQUEST_BYTES = MAX_ENQUIRY_IMAGES * MAX_ENQUIRY_IMAGE_BYTES + 256 * 1024;

/** Enquiries being read and sent at once, in this process (Aonik takes four at a time). */
const MAX_IN_FLIGHT = 4;
let inFlight = 0;

const NO_STORE = { 'Cache-Control': 'no-store' };

function answer(state: EnquiryState, status = 200) {
  return NextResponse.json(state, { status, headers: NO_STORE });
}

/**
 * True when the request names an origin other than the host it was sent to —
 * the comparison Next makes for server actions: the `Origin` header against
 * `X-Forwarded-Host` (behind a proxy) OR `Host`, either matching. Not
 * `request.url`, which Next rebuilds from its own configured hostname.
 */
function crossSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return true;
  }
  const hosts = [request.headers.get('x-forwarded-host')?.split(',')[0]?.trim(), request.headers.get('host')];
  return !hosts.some((host) => host && host === originHost);
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
  if (!(await enquiriesAvailable())) return answer({ status: 'unavailable' });
  if (!(await admitEnquiry())) return answer(ENQUIRY_LIMITED, 429);
  if (inFlight >= MAX_IN_FLIGHT) return answer({ status: 'error' }, 503);

  inFlight += 1;
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return answer({ status: 'error' }, 400);
    }
    // The outcome is in the body: the form reads `status`, whatever the HTTP status.
    return answer(await sendEnquiryForm(form, { admitted: true }));
  } finally {
    inFlight -= 1;
  }
}

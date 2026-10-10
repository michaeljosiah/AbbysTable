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
 * demo, not over three full images' worth, not without a declared length (a
 * browser's `fetch` of a `FormData` always declares one), not while
 * `MAX_IN_FLIGHT` others are being read and sent or this address is already
 * sending one (those are told to try again, and cost no attempt), and not past
 * this address's limit (`admitEnquiry`). A body that stalls for `STALL_MS`, or
 * is not all in after `READ_DEADLINE_MS`, is abandoned: a post trickled in a
 * byte at a time would otherwise hold its slot for as long as the server
 * allows.
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
import { clientAddress } from '@/lib/request/clientAddress';
import { addressKey } from '@/lib/request/rateLimit';
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
/** The addresses with one in flight: one at a time each. */
const sending = new Set<string>();

/** No bytes for this long and the post is abandoned. */
const STALL_MS = 15_000;
/** All of the body within this — three full photos on a slow phone connection. */
const READ_DEADLINE_MS = 180_000;

/**
 * The body, read under the stall and overall deadlines and the size cap — or
 * null, the read abandoned. `request.formData()` has no deadline of its own.
 */
async function readBody(request: Request): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  const deadline = Date.now() + READ_DEADLINE_MS;
  try {
    for (;;) {
      const wait = Math.min(STALL_MS, deadline - Date.now());
      if (wait <= 0) throw new Error('enquiry body too slow');
      let timer: ReturnType<typeof setTimeout> | undefined;
      const stalled = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('enquiry body stalled')), wait);
      });
      const chunk = await Promise.race([reader.read(), stalled]).finally(() => clearTimeout(timer));
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > MAX_ENQUIRY_REQUEST_BYTES) throw new Error('enquiry body over its cap');
      chunks.push(chunk.value);
    }
  } catch (error) {
    console.warn('[contact] enquiry body abandoned', error instanceof Error ? error.message : error);
    await reader.cancel().catch(() => undefined);
    return null;
  }
  const body = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

function answer(state: EnquiryState, status = 200) {
  return NextResponse.json(state, { status, headers: NO_STORE });
}

/**
 * True when the request names an origin other than the host it was sent to:
 * the `Origin` header against `X-Forwarded-Host` (behind a proxy) or `Host`,
 * either matching — a little wider than Next's own check for server actions,
 * which reads `X-Forwarded-Host` when present. Still safe: a page on another
 * site cannot set either header without a preflight it would fail. Not
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

  // Busy: try again, and it costs no attempt.
  const address = await clientAddress();
  const key = address ? addressKey(address) : null;
  if (inFlight >= MAX_IN_FLIGHT || (key !== null && sending.has(key))) return answer({ status: 'error' }, 503);
  if (!(await admitEnquiry())) return answer(ENQUIRY_LIMITED, 429);
  // Checked again: the limit's read of the address yielded.
  if (inFlight >= MAX_IN_FLIGHT || (key !== null && sending.has(key))) return answer({ status: 'error' }, 503);

  inFlight += 1;
  if (key !== null) sending.add(key);
  try {
    const body = await readBody(request);
    if (!body) return answer({ status: 'error' }, 400);
    let form: FormData;
    try {
      form = await new Response(body, { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData();
    } catch {
      return answer({ status: 'error' }, 400);
    }
    // The outcome is in the body: the form reads `status`, whatever the HTTP status.
    return answer(await sendEnquiryForm(form, { admitted: true }));
  } finally {
    inFlight -= 1;
    if (key !== null) sending.delete(key);
  }
}

/**
 * `/account/refresh?next=…` — renews an expired session and sends the customer
 * on to `next`. Never linked: an account page redirects here when the session
 * cookie holds an expired access token that a refresh could renew, because a
 * Server Component render cannot write the renewed cookie.
 *
 * A session that cannot be renewed is cleared by `currentSession`, so the page
 * `next` names then redirects to Log in: no loop. Without a session at all the
 * answer is Log in directly. Relative 303s, like every redirect route here.
 */

import { loginPathFor, safePostAuthPath } from '@/lib/auth/redirect';
import { currentSession } from '@/lib/auth/server';
import { clearSession, isExpired } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function onwards(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const next = safePostAuthPath(params.get('next'));
  // A page found its session dead mid-render (Aonik refused the token) and
  // could not clear the cookie itself: end it here, so the header stops saying
  // "My Account" and a revisit is not bounced again.
  if (params.has('ended')) {
    await clearSession();
    return onwards(loginPathFor(next));
  }
  const session = await currentSession();
  // A renewed session that is already inside the expiry skew (very short-lived
  // tokens) would send the page straight back here, spending a refresh token
  // each time: treat it as signed out.
  return onwards(session && !isExpired(session) ? next : loginPathFor(next));
}

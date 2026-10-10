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

export const dynamic = 'force-dynamic';

function onwards(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

export async function GET(request: Request) {
  const next = safePostAuthPath(new URL(request.url).searchParams.get('next'));
  const session = await currentSession();
  return onwards(session ? next : loginPathFor(next));
}

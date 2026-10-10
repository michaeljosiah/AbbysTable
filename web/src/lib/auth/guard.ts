/**
 * Keeps signed-out visitors out of the account area.
 *
 * The server session is the only source of truth for signed-in (design: build
 * handoff, "Signed-in state"): a request for an account page without one is
 * redirected to Log in with a return URL, rather than shown a signed-out panel.
 *
 * SERVER-ONLY.
 */

import { redirect } from 'next/navigation';

import { loginPathFor, sessionRefreshPath } from './redirect';
import { sessionNeedsRefresh } from './server';
import { readSessionView, type SessionView } from './session';

/**
 * The signed-in customer, or a redirect (never returns signed-out).
 *
 * An expired access token with a refresh token is not signed out: it goes via
 * `/account/refresh`, which renews the cookie and comes straight back.
 */
export async function requireSignedIn(returnTo: string): Promise<SessionView & { isSignedIn: true }> {
  const session = await readSessionView();
  if (session.isSignedIn) return { ...session, isSignedIn: true };
  if (await sessionNeedsRefresh()) redirect(sessionRefreshPath(returnTo));
  redirect(loginPathFor(returnTo));
}

/** Where a session that died mid-render goes: Log in, back to this page after. */
export function redirectToLogin(returnTo: string): never {
  redirect(loginPathFor(returnTo));
}

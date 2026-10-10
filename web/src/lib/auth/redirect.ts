/**
 * Where a customer lands after signing in.
 *
 * Its own module because it is a security control and belongs under direct
 * test - `actions.ts` is a `'use server'` file and can export only async
 * functions, which a validator has no business being.
 */

/** Where sign-in goes when no destination was carried. */
export const DEFAULT_POST_AUTH_PATH = '/account/orders';

/**
 * CR, LF and friends. Checked by codepoint rather than by a regex character
 * class, because a class written with literal control bytes is unreadable in a
 * diff and trivial to get subtly wrong.
 */
function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Accepts only a same-origin path.
 *
 * The whole point is that this value arrives from a query string, so an
 * attacker chooses it. Anything absolute turns our own sign-in form into an
 * open redirect - and `//evil.example` is absolute to a browser even though it
 * looks like a path, which is exactly the case a naive `startsWith('/')` check
 * lets through. `/\\evil.example` is rejected for the same reason: browsers
 * normalise the backslash, so it escapes the origin too. A control character
 * can split or truncate the value inside a Location header.
 */
export function safePostAuthPath(value: string | undefined | null): string {
  if (!value) return DEFAULT_POST_AUTH_PATH;

  const path = value.trim();
  if (!path.startsWith('/')) return DEFAULT_POST_AUTH_PATH;
  if (path.startsWith('//') || path.startsWith('/\\')) return DEFAULT_POST_AUTH_PATH;
  if (hasControlCharacter(path)) return DEFAULT_POST_AUTH_PATH;

  return path;
}

/**
 * Where a signed-out request for `returnTo` is sent: Log in, carrying the path
 * so the customer lands back on it. Only a safe same-origin path is carried;
 * anything else (and the default landing) leaves the address bare.
 */
export function loginPathFor(returnTo: string): string {
  const path = safePostAuthPath(returnTo);
  return path === DEFAULT_POST_AUTH_PATH && returnTo !== DEFAULT_POST_AUTH_PATH
    ? '/login'
    : `/login?next=${encodeURIComponent(path)}`;
}

/**
 * The route that renews an expired-but-refreshable session and sends the
 * customer on. A Server Component render cannot write the renewed cookie, so
 * an account page hands the request to this route handler first.
 */
export function sessionRefreshPath(returnTo: string): string {
  return `/account/refresh?next=${encodeURIComponent(safePostAuthPath(returnTo))}`;
}

/**
 * An in-memory stand-in for `next/headers`, resolved by `./runtime`.
 *
 * One jar stands in for one browser: a `set` with `maxAge: 0` deletes, as the
 * browser would, and every write is recorded so a test can assert what the
 * response would have carried.
 *
 * Writable by default, as in a route handler or server action. `renderMode()`
 * seals it the way Next does during a Server Component render, where `set`
 * throws — so code that runs in pages is tested where it really runs.
 */

export interface CookieWrite {
  name: string;
  value: string;
  maxAge?: number;
  httpOnly?: boolean;
  path?: string;
}

interface CookieOptions {
  maxAge?: number;
  httpOnly?: boolean;
  path?: string;
}

const jar = new Map<string, string>();
let sealed = false;

function assertWritable() {
  // Next's own message, which the app recognises.
  if (sealed) {
    throw new Error(
      'Cookies can only be modified in a Server Action or Route Handler. Read more: ' +
        'https://nextjs.org/docs/app/api-reference/functions/cookies#options',
    );
  }
}

/** Every `set` since the last reset, in order. */
export const cookieWrites: CookieWrite[] = [];

const store = {
  get(name: string) {
    const value = jar.get(name);
    return value === undefined ? undefined : { name, value };
  },
  has(name: string) {
    return jar.has(name);
  },
  getAll() {
    return [...jar].map(([name, value]) => ({ name, value }));
  },
  set(name: string, value: string, options: CookieOptions = {}) {
    assertWritable();
    cookieWrites.push({
      name,
      value,
      maxAge: options.maxAge,
      httpOnly: options.httpOnly,
      path: options.path,
    });
    if (options.maxAge === 0) jar.delete(name);
    else jar.set(name, value);
    return store;
  },
  delete(name: string) {
    assertWritable();
    jar.delete(name);
    return store;
  },
};

export async function cookies() {
  return store;
}

let requestHeaders = new Headers();

export async function headers() {
  return requestHeaders;
}

/** The request's headers, as the platform would send them (e.g. `X-Forwarded-For`). */
export function setRequestHeaders(init: Record<string, string>): void {
  requestHeaders = new Headers(init);
}

/** Starts a fresh browser, optionally already holding some cookies. */
export function resetCookies(initial: Record<string, string> = {}): void {
  requestHeaders = new Headers();
  jar.clear();
  cookieWrites.length = 0;
  sealed = false;
  for (const [name, value] of Object.entries(initial)) jar.set(name, value);
}

/** Seals the store, as a Server Component render does. Undone by `resetCookies`. */
export function renderMode(): void {
  sealed = true;
}

export function cookieValue(name: string): string | undefined {
  return jar.get(name);
}

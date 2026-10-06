/**
 * An in-memory stand-in for `next/headers`, resolved by `./runtime`.
 *
 * One jar stands in for one browser: a `set` with `maxAge: 0` deletes, as the
 * browser would, and every write is recorded so a test can assert what the
 * response would have carried.
 */

export interface CookieWrite {
  name: string;
  value: string;
  maxAge?: number;
  httpOnly?: boolean;
}

interface CookieOptions {
  maxAge?: number;
  httpOnly?: boolean;
}

const jar = new Map<string, string>();

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
    cookieWrites.push({ name, value, maxAge: options.maxAge, httpOnly: options.httpOnly });
    if (options.maxAge === 0) jar.delete(name);
    else jar.set(name, value);
    return store;
  },
  delete(name: string) {
    jar.delete(name);
    return store;
  },
};

export async function cookies() {
  return store;
}

export async function headers() {
  return new Headers();
}

/** Starts a fresh browser, optionally already holding some cookies. */
export function resetCookies(initial: Record<string, string> = {}): void {
  jar.clear();
  cookieWrites.length = 0;
  for (const [name, value] of Object.entries(initial)) jar.set(name, value);
}

export function cookieValue(name: string): string | undefined {
  return jar.get(name);
}

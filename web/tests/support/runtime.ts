/**
 * Test-only module resolution. Import this FIRST in any test that loads route
 * handlers or server modules.
 *
 * The suite compiles with plain `tsc` to CommonJS and runs under `node --test`,
 * so two things Next normally provides are missing:
 *  - the `@/` alias, which tsc type-checks but leaves in the emitted `require`
 *    calls; it is pointed at the compiled `src/` here;
 *  - `next/headers`, whose `cookies()` throws outside a Next request; it is
 *    swapped for the in-memory jar in `./next-headers`.
 * Everything else (route handlers, `NextResponse`, the cart and session
 * modules) is the real code.
 */
import Module from 'node:module';
import path from 'node:path';

type Resolve = (this: unknown, request: string, ...rest: unknown[]) => string;

const resolver = Module as unknown as { _resolveFilename: Resolve };
const original = resolver._resolveFilename;

// `.test-dist/tests/support` → `.test-dist`
const distRoot = path.resolve(__dirname, '..', '..');
const fakeHeaders = path.join(__dirname, 'next-headers.js');

resolver._resolveFilename = function resolve(request, ...rest) {
  if (request === 'next/headers') return fakeHeaders;
  if (request.startsWith('@/')) {
    return original.call(this, path.join(distRoot, 'src', request.slice(2)), ...rest);
  }
  return original.call(this, request, ...rest);
};

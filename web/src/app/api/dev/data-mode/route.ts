/**
 * Development-only data-mode switch.
 *
 * Sets the cookie `resolveDataMode()` reads. Guarded twice: this handler 404s
 * outside development, and the resolver ignores the cookie outside development
 * too. Either guard alone would be enough; both together mean neither a stray
 * deploy of this route nor a forged cookie can change what production serves.
 */

import { NextResponse } from 'next/server';

import { DATA_MODE_COOKIE, type DataMode } from '@/lib/aonik/dataMode';

function notFound() {
  return new NextResponse('Not found', { status: 404 });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') return notFound();

  const body: unknown = await request.json().catch(() => null);
  const mode = (body as { mode?: string } | null)?.mode;

  if (mode !== 'demo' && mode !== 'live') {
    return NextResponse.json({ error: "mode must be 'demo' or 'live'" }, { status: 400 });
  }

  const response = NextResponse.json({ mode: mode satisfies DataMode });
  response.cookies.set(DATA_MODE_COOKIE, mode, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Session cookie: closing the browser drops back to the configured default,
    // so a forgotten override can't quietly persist across days of work.
    maxAge: undefined,
  });
  return response;
}

/** Clears the override, returning to whatever configuration says. */
export async function DELETE() {
  if (process.env.NODE_ENV === 'production') return notFound();

  const response = NextResponse.json({ cleared: true });
  response.cookies.delete(DATA_MODE_COOKIE);
  return response;
}

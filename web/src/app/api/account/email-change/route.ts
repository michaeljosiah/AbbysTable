import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { aonikAuthedFetch, SessionExpiredError } from '@/lib/auth/server';
import { usableAccessToken } from '@/lib/auth/accountAccess';
import { clientAddress } from '@/lib/request/clientAddress';
import { AttemptLimiter, addressKey } from '@/lib/request/rateLimit';
const COOKIE = 'abbys-table-email-change';
const limit = new AttemptLimiter(10, 10 * 60_000);
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin)
    return json({ state: 'failed' }, 403);
  const address = await clientAddress();
  if (address && !limit.admit(addressKey(address)))
    return json({ state: 'failed' }, 429);
  const body = (await request.json().catch(() => null)) as {
      token?: unknown;
      confirm?: unknown;
    } | null,
    jar = await cookies();
  if (body?.token !== undefined) {
    if (!usableAccessToken(body.token)) return json({ state: 'gone' }, 410);
    jar.set(COOKIE, body.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 600,
    });
    return json({ state: 'ready' });
  }
  if (body?.confirm !== true) return json({ state: 'failed' }, 400);
  const token = jar.get(COOKIE)?.value;
  if (!usableAccessToken(token)) return json({ state: 'gone' }, 410);
  try {
    await aonikAuthedFetch('/identity/email-change/complete', {
      method: 'POST',
      body: { token },
    });
    jar.set(COOKIE, 'deleted', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return json({ state: 'complete' });
  } catch (error) {
    return json(
      { state: error instanceof SessionExpiredError ? 'sign-in' : 'failed' },
      error instanceof SessionExpiredError ? 401 : 409,
    );
  }
}

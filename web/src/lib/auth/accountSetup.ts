/** Server-only OAuth handoff. Aonik, not an unverified ID token, proves identity. */
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { readAonikConfig } from '@/lib/aonik/dataMode';
import { AonikError } from '@/lib/aonik/errors';
import { clientAddress } from '@/lib/request/clientAddress';
import { addressKey, AttemptLimiter } from '@/lib/request/rateLimit';
import { identityFetch } from './server';
import { resolveAccessLink, usableAccessToken } from './accountAccess';
import { sessionFromToken, writeSession } from './session';

export const SETUP_COOKIE = '__Host-abbys-table-setup';
export const SETUP_CALLBACK = '/account/setup/callback';
export const setupByAddress = new AttemptLimiter(5, 10 * 60_000);
const LIFETIME = 10 * 60;
const PURPOSE = 'abbys-table-account-setup-v1';

function httpsUrl(raw: string | undefined): URL {
  const url = new URL(raw ?? '');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw new Error('Account setup requires a configured HTTPS URL.');
  return url;
}

function config() {
  const connection = readAonikConfig();
  const issuer = httpsUrl(process.env.AONIK_OIDC_ISSUER).href.replace(/\/$/, '');
  const originUrl = httpsUrl(process.env.STOREFRONT_ORIGIN);
  const clientId = process.env.AONIK_AUTH_CLIENT_ID?.trim();
  const rawKey = process.env.ACCOUNT_SETUP_COOKIE_KEY ?? '';
  if (!connection || !clientId || originUrl.pathname !== '/' || !/^[a-fA-F0-9]{64}$/.test(rawKey))
    throw new Error('Account setup is not configured.');
  const origin = originUrl.origin;
  const audience = process.env.AONIK_OIDC_AUDIENCE?.trim() || '';
  const binding = createHash('sha256').update(JSON.stringify({
    ...connection, issuer, clientId, origin, audience,
  })).digest('hex');
  return { issuer, clientId, origin, audience, binding, key: Buffer.from(rawKey, 'hex') };
}
export function accountSetupAvailable(): boolean {
  try { config(); return true; } catch { return false; }
}

type Flow = { token: string; state: string; verifier: string; expires: number; binding: string };
function seal(flow: Flow, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(PURPOSE));
  return Buffer.concat([iv, cipher.update(JSON.stringify(flow), 'utf8'), cipher.final(), cipher.getAuthTag()]).toString('base64url');
}
function open(raw: string, key: Buffer): Flow {
  if (raw.length > 3800) throw new Error('Invalid setup cookie.');
  const bytes = Buffer.from(raw, 'base64url');
  const cipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  cipher.setAAD(Buffer.from(PURPOSE));
  cipher.setAuthTag(bytes.subarray(-16));
  return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(12, -16)), cipher.final()]).toString('utf8')) as Flow;
}

async function discovery(issuer: string): Promise<{ authorization: string; token: string }> {
  const response = await fetch(issuer + '/.well-known/openid-configuration', {
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Identity provider is unavailable.');
  const data = await response.json();
  if (typeof data.issuer !== 'string' || data.issuer.replace(/\/$/, '') !== issuer)
    throw new Error('Unexpected identity provider.');
  const authorization = httpsUrl(data.authorization_endpoint);
  const token = httpsUrl(data.token_endpoint);
  // This storefront supports providers whose endpoints share their issuer's origin.
  // Never follow discovery to a different recipient with a code or verifier.
  if (authorization.origin !== new URL(issuer).origin || token.origin !== authorization.origin)
    throw new Error('Unexpected identity endpoint.');
  return { authorization: authorization.href, token: token.href };
}

export type SetupStart = { status: 'redirect'; url: string } | { status: 'gone' | 'failed' | 'unavailable' };
export async function startAccountSetup(token: string): Promise<SetupStart> {
  if (!accountSetupAvailable()) return { status: 'unavailable' };
  const address = await clientAddress();
  if (address && !setupByAddress.admit(addressKey(address))) return { status: 'failed' };
  const verdict = await resolveAccessLink(token, address ?? undefined);
  if (verdict !== 'ready') return { status: verdict === 'gone' ? 'gone' : verdict === 'unavailable' ? 'unavailable' : 'failed' };
  try {
    const settings = config();
    const endpoints = await discovery(settings.issuer);
    const flow: Flow = {
      token, state: randomBytes(32).toString('base64url'),
      verifier: randomBytes(32).toString('base64url'),
      expires: Date.now() + LIFETIME * 1000, binding: settings.binding,
    };
    const url = new URL(endpoints.authorization);
    url.search = new URLSearchParams({
      client_id: settings.clientId, response_type: 'code',
      redirect_uri: settings.origin + SETUP_CALLBACK,
      scope: 'openid profile email', state: flow.state,
      code_challenge: createHash('sha256').update(flow.verifier).digest('base64url'),
      code_challenge_method: 'S256', max_age: '0', prompt: 'login',
      ...(settings.audience ? { audience: settings.audience } : {}),
    }).toString();
    const value = seal(flow, settings.key);
    if (value.length > 3800) return { status: 'failed' };
    (await cookies()).set(SETUP_COOKIE, value, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: LIFETIME,
    });
    return { status: 'redirect', url: url.href };
  } catch {
    // No OAuth URLs, codes, email-link tokens or upstream bodies in logs.
    return { status: 'failed' };
  }
}

export async function completeAccountSetup(params: URLSearchParams): Promise<'complete' | 'gone' | 'failed'> {
  const jar = await cookies();
  const raw = jar.get(SETUP_COOKIE)?.value;
  // A callback consumes this browser's attempt, including provider cancellation.
  jar.set(SETUP_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  if (!raw) return 'gone';
  try {
    const settings = config();
    const flow = open(raw, settings.key);
    const state = params.get('state') ?? '';
    if (params.getAll('state').length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(state)
      || typeof flow.state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(flow.state)
      || !timingSafeEqual(Buffer.from(state), Buffer.from(flow.state))
      || !Number.isFinite(flow.expires) || flow.expires <= Date.now()
      || flow.binding !== settings.binding || !usableAccessToken(flow.token)
      || !/^[A-Za-z0-9_-]{43}$/.test(flow.verifier)) return 'gone';
    // Reject an issuer mismatch when the provider supplies RFC 9207's iss parameter.
    if (params.has('iss') && (params.getAll('iss').length !== 1
      || params.get('iss')?.replace(/\/$/, '') !== settings.issuer)) return 'gone';
    const code = params.get('code');
    if (params.has('error') || params.getAll('code').length !== 1 || !code || code.length > 4096)
      return 'failed';
    const endpoints = await discovery(settings.issuer);
    const response = await fetch(endpoints.token, {
      method: 'POST', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', code, client_id: settings.clientId,
        redirect_uri: settings.origin + SETUP_CALLBACK, code_verifier: flow.verifier,
      }).toString(),
    });
    if (!response.ok) return 'failed';
    const tokens = await response.json();
    if (typeof tokens.access_token !== 'string' || !tokens.access_token
      || typeof tokens.token_type !== 'string' || tokens.token_type.toLowerCase() !== 'bearer'
      || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0) return 'failed';
    const completed = await identityFetch<{ status: string }>('/identity/account-access/complete', {
      method: 'POST', body: { token: flow.token }, accessToken: tokens.access_token,
      signal: AbortSignal.timeout(8000),
    });
    if (completed?.status !== 'complete') return 'failed';
    // The backend validates issuer, tenant, verified email, fresh authentication
    // and one-use paid link before we create a storefront session.
    let email: string | undefined;
    try {
      const profile = await identityFetch<{ email?: unknown }>('/profiles/customers/me', {
        accessToken: tokens.access_token, signal: AbortSignal.timeout(8000),
      });
      if (typeof profile.email === 'string') email = profile.email;
    } catch { /* A profile read must not undo a completed, one-use setup. */ }
    await writeSession(sessionFromToken({
      accessToken: tokens.access_token, expiresIn: tokens.expires_in,
      refreshToken: typeof tokens.refresh_token === 'string' ? tokens.refresh_token : null,
    }, email));
    return 'complete';
  } catch (error) {
    return error instanceof AonikError && error.status === 410 ? 'gone' : 'failed';
  }
}

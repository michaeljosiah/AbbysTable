/**
 * A recording stand-in for Aonik behind the global `fetch`.
 *
 * Each test supplies a responder; every request is recorded (method, path,
 * headers, parsed body) so tests can assert on what was sent. A request the
 * responder does not answer fails the test loudly rather than hanging.
 */

export const AONIK_BASE = 'https://aonik.test';
export const TENANT_ID = 'tenant-test';

export interface AonikRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface AonikReply {
  status: number;
  body?: unknown;
}

export const aonikRequests: AonikRequest[] = [];

export function useAonik(responder: (request: AonikRequest) => AonikReply | undefined): void {
  aonikRequests.length = 0;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input : input.url);
    if (url.origin !== AONIK_BASE) throw new Error(`Unexpected request to ${url.href}`);

    const request: AonikRequest = {
      method: init?.method ?? 'GET',
      path: `${url.pathname}${url.search}`,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    aonikRequests.push(request);

    const reply = responder(request);
    if (!reply) throw new Error(`No stubbed Aonik reply for ${request.method} ${request.path}`);

    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

/** Points the server modules at the stub. */
export function configureAonik(extra: Record<string, string> = {}): void {
  process.env.AONIK_API_URL = AONIK_BASE;
  process.env.AONIK_TENANT_ID = TENANT_ID;
  Object.assign(process.env, extra);
}

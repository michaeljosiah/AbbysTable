/**
 * `aonikFetch` — the one function that talks to Aonik.
 *
 * It owns base-URL joining, the tenant header, the per-endpoint cache policy
 * and error mapping. Nothing above it constructs a URL or reads a status code;
 * nothing below it exists. Keeping this single-file is what makes the
 * "reconciliation is confined to lib/aonik/" promise in `client.ts` true.
 *
 * SERVER-ONLY.
 */

import { toAonikError } from './errors';

/**
 * How each class of endpoint is cached, per SPEC-2026-07-22-aonik-transport.
 *
 * - `catalog`  matches Aonik's own `public, max-age=300` on catalog + config
 * - `volatile` cart, checkout, identity — never cached, ever
 */
export type CachePolicy = 'catalog' | 'volatile';

/** Aonik's catalog cache window, in seconds. Matches its `max-age`. */
export const CATALOG_REVALIDATE_SECONDS = 300;

export interface AonikFetchOptions {
  baseUrl: string;
  tenantId: string;
  policy: CachePolicy;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** JSON request body. Encoded here so no caller hand-rolls it. */
  body?: unknown;
  /** Per-cart possession proof (`server-box-cart`). */
  cartToken?: string;
  /** Signed-in customer's access token (`customer-identity`). */
  accessToken?: string;
  /** Query parameters; undefined and null values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query: AonikFetchOptions['query'],
): string {
  // Deliberately NOT `new URL(path, base)`: that discards any path prefix on
  // the base URL (a base of https://host/api would silently become
  // https://host/commerce/...). Simple concatenation preserves it.
  const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    search.append(key, String(value));
  }

  const qs = search.toString();
  if (!qs) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${qs}`;
}

function cacheInit(policy: CachePolicy): RequestInit {
  // A mutation is never cacheable regardless of its endpoint class.
  return policy === 'catalog'
    ? { next: { revalidate: CATALOG_REVALIDATE_SECONDS } }
    : { cache: 'no-store' };
}

/**
 * Performs one Aonik request and returns the parsed JSON body.
 *
 * Throws `AonikError` on any non-2xx, with the drift payload attached when the
 * response carries one.
 */
export async function aonikFetch<T>(path: string, options: AonikFetchOptions): Promise<T> {
  const {
    baseUrl,
    tenantId,
    policy,
    method = 'GET',
    body,
    cartToken,
    accessToken,
    query,
    signal,
  } = options;

  const url = buildUrl(baseUrl, path, query);

  const headers: Record<string, string> = {
    // Aonik partitions every storefront read by tenant and varies its shared
    // caches on this header. Always sent, never inferred from the host.
    'X-Tenant-Id': tenantId,
    Accept: 'application/json',
  };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // Possession (cart) and identity (session) are separate proofs and can both
  // be absent: the catalogue is anonymous.
  if (cartToken) headers['X-Cart-Token'] = cartToken;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
    ...cacheInit(method === 'GET' ? policy : 'volatile'),
  });

  if (!response.ok) {
    // Error bodies are JSON by contract, but a proxy or gateway can still put
    // HTML in front of us — never let a parse failure mask the real status.
    const errorBody = await response.json().catch(() => null);
    throw toAonikError(response.status, path, errorBody);
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

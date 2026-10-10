/**
 * The customer's address as the platform reports it (`X-Forwarded-For`'s
 * first entry, or `X-Real-IP`), for the per-address limits: our own on the
 * sign-up lists (`@/lib/signup/rateLimit`), and Aonik's on enquiries, which it
 * can only apply per customer when the storefront passes the address on and
 * Aonik trusts the storefront as a proxy (`ForwardedHeaders:KnownProxies`).
 *
 * Only an IP-shaped value is returned — never arbitrary header text passed on
 * to another request. Null when there is none (local development).
 *
 * SERVER-ONLY.
 */

import { headers } from 'next/headers';

const IP_SHAPED = /^[0-9a-fA-F:.]{2,45}$/;

export async function clientAddress(): Promise<string | null> {
  try {
    const list = await headers();
    const candidate = list.get('x-forwarded-for')?.split(',')[0]?.trim() || list.get('x-real-ip')?.trim() || '';
    return IP_SHAPED.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

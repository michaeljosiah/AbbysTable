/**
 * The customer's address as the platform reports it, for the storefront's own
 * per-address limits (`@/lib/request/rateLimit`: the sign-up lists, the
 * Contact form) and passed on to Aonik with an enquiry.
 *
 * The LAST `X-Forwarded-For` entry — the one the platform's proxy appended
 * for the connection it accepted. Every entry before it is whatever the
 * client sent, so the first one is the client's to choose and would let one
 * script rotate past every limit. This assumes one proxy in front of Next
 * (Azure Static Web Apps); behind a second, the last entry is that proxy's and
 * the limits become per proxy — coarser, never spoofable. A port the proxy
 * includes (`203.0.113.9:51234`, `[2001:db8::1]:443`) is dropped, or every
 * connection would be an address of its own.
 *
 * Aonik's own enquiry limit cannot use it today: Aonik reads only the last hop
 * its ingress appended (`ForwardLimit = 1`), which is the storefront's address
 * — so ours are the limits that hold per customer.
 *
 * Only an IP address is returned — never arbitrary header text passed on to
 * another request. Null when there is none (local development).
 *
 * SERVER-ONLY.
 */

import { isIP } from 'node:net';

import { headers } from 'next/headers';

/** An address without the port a proxy may append to it, or null when it is not one. */
export function addressOf(entry: string): string | null {
  let value = entry.trim();
  const bracketed = /^\[([0-9a-fA-F:.]+)\](?::\d{1,5})?$/.exec(value);
  if (bracketed) value = bracketed[1];
  else if (/^[\d.]+:\d{1,5}$/.test(value)) value = value.slice(0, value.lastIndexOf(':'));
  return isIP(value) ? value : null;
}

/** The address from the request's headers (exported for tests). */
export function addressFromHeaders(list: Pick<Headers, 'get'>): string | null {
  const forwarded = list.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  if (forwarded) return addressOf(forwarded);
  const real = list.get('x-real-ip');
  return real ? addressOf(real) : null;
}

export async function clientAddress(): Promise<string | null> {
  try {
    return addressFromHeaders(await headers());
  } catch {
    return null;
  }
}

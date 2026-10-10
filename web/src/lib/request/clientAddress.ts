/**
 * The customer's address as the platform reports it, for the storefront's own
 * per-address limits (`@/lib/request/rateLimit`: the sign-up lists, the
 * Contact form) and passed on to Aonik with an enquiry.
 *
 * The entry the platform's proxies appended to `X-Forwarded-For`, counted
 * from the right: each proxy appends the address that connected to it, so with
 * `TRUSTED_PROXY_HOPS` proxies in front of Next (1, Azure Static Web Apps, by
 * default) the customer is that many entries from the end. Every entry before
 * it is whatever the client sent — the first one is the client's to choose and
 * would let one script rotate past every limit. Too few hops configured and the
 * limits become per proxy (every customer in one bucket); too many and they are
 * spoofable — so confirm the count on the deployed slot, and change it when a
 * CDN (Front Door) is put in front. A port a proxy includes
 * (`203.0.113.9:51234`, `[2001:db8::1]:443`) is dropped, or every connection
 * would be an address of its own.
 *
 * Aonik's own enquiry limit cannot use it today: Aonik reads only the last hop
 * its ingress appended (`ForwardLimit = 1`), which is the storefront's address
 * — so ours are the limits that hold per customer.
 *
 * Only an IP address is returned — never arbitrary header text passed on to
 * another request. Null when the platform reported none that reads as one
 * (logged once). Next fills the header from the socket when nothing in front of
 * it did, so local development has one (`::1`).
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

/** Proxies that append to `X-Forwarded-For` in front of Next (`TRUSTED_PROXY_HOPS`, default 1). */
export function trustedProxyHops(): number {
  const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  return Number.isInteger(hops) && hops >= 1 && hops <= 5 ? hops : 1;
}

let warned = false;

/** The address from the request's headers (exported for tests). */
export function addressFromHeaders(list: Pick<Headers, 'get'>): string | null {
  const header = list.get('x-forwarded-for');
  if (header) {
    const entries = header.split(',').map((entry) => entry.trim());
    const hops = trustedProxyHops();
    // Fewer entries than proxies: not every proxy saw it, so none is trusted.
    const address = entries.length >= hops ? addressOf(entries[entries.length - hops]) : null;
    if (!address && !warned) {
      warned = true;
      console.warn('[request] X-Forwarded-For has no readable customer address; per-address limits are off for such requests');
    }
    return address;
  }
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

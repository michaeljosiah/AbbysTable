/**
 * Internal links route through `next/link` for client-side navigation; anything
 * with a scheme leaves the app and stays a plain anchor.
 */
export function isExternalHref(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}

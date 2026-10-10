/**
 * The account area's sections: one definition, read by the nav. A section that
 * is designed but not built is not listed — the nav never links to a page that
 * 404s (the same rule as `lib/content/navigation.ts`).
 */

export interface AccountSection {
  key: 'orders';
  label: string;
  href: string;
}

export const ACCOUNT_SECTIONS: readonly AccountSection[] = [
  { key: 'orders', label: 'Orders', href: '/account/orders' },
];

/** The section a path is in (an order's own page is in Orders), if any. */
export function currentSection(pathname: string | null | undefined): AccountSection | undefined {
  if (!pathname) return undefined;
  return ACCOUNT_SECTIONS.find((section) => pathname === section.href || pathname.startsWith(`${section.href}/`));
}

/**
 * The account area's sections: one definition, read by the nav. A section that
 * is designed but not built is not listed — the nav never links to a page that
 * 404s (the same rule as `lib/content/navigation.ts`).
 */

export interface AccountSection {
  key: 'overview' | 'orders' | 'addresses' | 'details';
  label: string;
  href: string;
  /**
   * Overview is the mobile menu itself, so its own row is for the desktop
   * sidebar only (a phone is already looking at it).
   */
  desktopOnly?: boolean;
}

export const ACCOUNT_HOME_HREF = '/account';

export const ACCOUNT_SECTIONS: readonly AccountSection[] = [
  { key: 'overview', label: 'Overview', href: ACCOUNT_HOME_HREF, desktopOnly: true },
  { key: 'orders', label: 'Orders', href: '/account/orders' },
  { key: 'addresses', label: 'Addresses', href: '/account/addresses' },
  { key: 'details', label: 'Details & preferences', href: '/account/details' },
];

/** The section a path is in (an order's own page is in Orders), if any. */
export function currentSection(pathname: string | null | undefined): AccountSection | undefined {
  if (!pathname) return undefined;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === ACCOUNT_HOME_HREF) return ACCOUNT_SECTIONS[0];
  return ACCOUNT_SECTIONS.slice(1).find((section) => path === section.href || path.startsWith(`${section.href}/`));
}

/** Whether a path is the overview itself (the mobile menu), as opposed to a section. */
export function isOverviewPath(pathname: string | null | undefined): boolean {
  return currentSection(pathname)?.key === 'overview';
}

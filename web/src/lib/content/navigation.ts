/**
 * Site chrome: navigation, footer and social links.
 *
 * This is editorial structure, not commerce data — it does not come from Aonik.
 *
 * Anchors are root-relative (`/#founder`) rather than bare (`#founder`) so they
 * resolve from any route, not just the homepage. As real routes land, swap the
 * `href` values here and the header, drawer and footer all follow.
 */

import { PRIVACY_COOKIES_SLUG } from '@/lib/legal/privacy';

export const SECTION_IDS = [
  'top',
  'standards',
  'howitworks',
  'menu',
  'founder',
  'boxes',
  'gifting',
  'private',
  'contact',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export interface NavItem {
  label: string;
  href: string;
}

/**
 * Seven links, not eight: the template drops "Abby's Boxes". That removal is
 * load-bearing — eight links plus the wordmark and the Order button need about
 * 1225px, which is why the header falls back to the drawer below 1240px.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Menu', href: '/menu' },
  { label: 'How it works', href: '/#howitworks' },
  { label: 'Gifting', href: '/#gifting' },
  { label: 'Private Table', href: '/#private' },
  { label: 'Our Standards', href: '/#standards' },
  { label: "Abby's Story", href: '/#founder' },
  { label: 'Contact', href: '/#contact' },
];

export const LOGIN_ITEM: NavItem = { label: 'Login', href: '/login' };

/**
 * Takes `LOGIN_ITEM`'s place in the drawer once the customer is signed in
 * (behaviour guide §A2): same slot, new label and destination. The order
 * history is the account area's only page so far.
 */
export const ACCOUNT_ITEM: NavItem = { label: 'My Account', href: '/account/orders' };

/**
 * The two legal documents (#20). Named by the newsletter consent line, the 500
 * page's footer and the checkout footer. The footer label stays "Privacy
 * Policy" in full; Terms of Sale's footer label is the short "Terms", while the
 * page's own h1 keeps the defined term (design/CLAUDE.md, footer).
 */
export const PRIVACY_ITEM: NavItem = { label: 'Privacy Policy', href: '/privacy' };

export const TERMS_ITEM: NavItem = { label: 'Terms', href: '/terms-of-sale' };

/**
 * Contact us. The Contact page is designed but not built yet, so this is the
 * site's placeholder (the footer) rather than a route that would 404 — swap it
 * when the page lands.
 */
export const CONTACT_HREF = '/#contact';

/**
 * The simplified footer on the 500 page — help and legal only, by design
 * (design/build-handoff.md §3ah). Delivery & FAQs and Contact do not exist yet,
 * so like the site footer they resolve to the closest real destination until
 * they land.
 *
 * The static host copy of that page (`public/500.html`) is generated from this
 * list: regenerate it after a change (`UPDATE_STATUS_PAGES=1 npm test`).
 */
export const STATUS_FOOTER_LINKS: NavItem[] = [
  { label: 'Delivery & FAQs', href: '/#contact' },
  { label: 'Contact us', href: '/#contact' },
  PRIVACY_ITEM,
  TERMS_ITEM,
];

/**
 * The Privacy Policy's cookie section: `/privacy#cookies`, a named routing
 * requirement (design/build-handoff.md §3s). `cookies` is a committed slug
 * (`PRIVACY_COOKIES_SLUG`), so this never changes.
 */
export const PRIVACY_COOKIES_HREF = `${PRIVACY_ITEM.href}#${PRIVACY_COOKIES_SLUG}`;

/**
 * The footer's consent trigger. Rendered as a real link carrying
 * `data-consent-open`: the consent manager turns a plain click into the
 * preferences panel, and with no JS, a manager that failed, or a cmd/ctrl-click
 * into a new tab, it simply goes to the Privacy cookie section.
 */
export const COOKIE_PREFERENCES_ITEM: NavItem = {
  label: 'Cookie preferences',
  href: PRIVACY_COOKIES_HREF,
};

export interface FooterColumn {
  heading: string;
  links: NavItem[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Shop',
    links: [
      { label: 'Menu', href: '/menu' },
      { label: 'Gifting', href: '/#gifting' },
      { label: 'Discovery Box', href: '/menu' },
      { label: 'Private Table', href: '/#private' },
    ],
  },
  {
    heading: 'Learn',
    links: [
      { label: "Abby's Story", href: '/#founder' },
      { label: 'Our Standards', href: '/#standards' },
      { label: 'Journal', href: '/#contact' },
    ],
  },
  {
    heading: 'Information',
    links: [
      { label: 'Delivery & FAQs', href: '/#contact' },
      { label: 'Contact Us', href: '/#contact' },
      { label: 'Allergens', href: '/allergens' },
    ],
  },
];

export type SocialNetwork = 'instagram' | 'tiktok' | 'facebook' | 'x';

export interface SocialLink {
  network: SocialNetwork;
  label: string;
  href: string;
}

export const SOCIAL_HANDLE = '@FromAbbysTable';

/**
 * Also printed into the static status pages (`public/500.html`,
 * `public/maintenance.html`): regenerate them after a change here
 * (`UPDATE_STATUS_PAGES=1 npm test`).
 */
export const SOCIAL_LINKS: SocialLink[] = [
  { network: 'instagram', label: 'Instagram', href: 'https://instagram.com' },
  { network: 'tiktok', label: 'TikTok', href: 'https://tiktok.com' },
  { network: 'facebook', label: 'Facebook', href: 'https://facebook.com' },
  { network: 'x', label: 'X', href: 'https://x.com' },
];

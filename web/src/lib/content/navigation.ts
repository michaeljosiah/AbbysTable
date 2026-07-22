/**
 * Site chrome: navigation, footer and social links.
 *
 * This is editorial structure, not commerce data — it does not come from Aonik.
 *
 * Anchors are root-relative (`/#founder`) rather than bare (`#founder`) so they
 * resolve from any route, not just the homepage. As real routes land, swap the
 * `href` values here and the header, drawer and footer all follow.
 */

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

export const NAV_ITEMS: NavItem[] = [
  { label: 'Menu', href: '/menu' },
  { label: 'How it works', href: '/#howitworks' },
  { label: "Abby's Boxes", href: '/#boxes' },
  { label: 'Gifting', href: '/#gifting' },
  { label: 'Private Table', href: '/#private' },
  { label: 'Our Standards', href: '/#standards' },
  { label: "Abby's Story", href: '/#founder' },
  { label: 'Contact', href: '/#contact' },
];

export const LOGIN_ITEM: NavItem = { label: 'Login', href: '/login' };

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
      { label: 'Allergens', href: '/#contact' },
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

export const SOCIAL_LINKS: SocialLink[] = [
  { network: 'instagram', label: 'Instagram', href: 'https://instagram.com' },
  { network: 'tiktok', label: 'TikTok', href: 'https://tiktok.com' },
  { network: 'facebook', label: 'Facebook', href: 'https://facebook.com' },
  { network: 'x', label: 'X', href: 'https://x.com' },
];

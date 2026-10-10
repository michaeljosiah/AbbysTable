/**
 * Site chrome: navigation, footer and social links.
 *
 * This is editorial structure, not commerce data — it does not come from Aonik.
 *
 * EVERY destination is defined once, here, and the header, drawer and footer
 * read it. A page that is designed but not built yet never gets a link that
 * would 404, nor an anchor that does not exist: it either resolves to the
 * closest real destination (stated beside it) or stays out of the chrome
 * behind its own flag. When its route lands, change the one line here and the
 * header, drawer and footer all follow.
 *
 * Anchors are root-relative (`/#founder`) rather than bare (`#founder`) so they
 * resolve from any route, not just the homepage.
 */

import { BOX_BUILDER_PATH } from '@/lib/how-it-works/boxSizes';
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

/* ---- Destinations ------------------------------------------------------------ */

export const MENU_ITEM: NavItem = { label: 'Menu', href: '/menu' };

export const HOW_IT_WORKS_ITEM: NavItem = { label: 'How it works', href: '/how-it-works' };

export const OUR_STORY_ITEM: NavItem = { label: 'Abby’s Story', href: '/our-story' };

/** Footer label is sentence case, as in the v2 footer ("Our standards"). */
export const STANDARDS_ITEM: NavItem = { label: 'Our standards', href: '/standards' };

export const ALLERGENS_ITEM: NavItem = { label: 'Allergens', href: '/allergens' };

/**
 * Gifting (#26, `/gifting`) is designed but not built, and the homepage's
 * `#gifting` section is gone from the v2 homepage (#15) — so there is no honest
 * destination for it yet. It stays OUT of the header, drawer and footer until
 * its page lands: flip this flag in the same change that adds the route. A
 * link to `/gifting` today would 404, and `/#gifting` would be a dead anchor
 * the moment #15 merges.
 */
export const GIFTING_LIVE = false;

export const GIFTING_ITEM: NavItem = { label: 'Gifting', href: '/gifting' };

/**
 * Private Table (#25) — its page. Until it was built the chrome went to the
 * homepage band's `#private` anchor; nothing links there now. The Terms of Sale
 * waitlist clause, the Delivery & FAQs answer and the homepage band's "Find
 * out more" (`PRIVATE_TABLE_HREF`) all read this.
 */
export const PRIVATE_TABLE_ITEM: NavItem = { label: 'Private Table', href: '/private-table' };

/**
 * Contact us (#24). EVERY "contact us" in the site reads this — the chrome,
 * checkout's help line, Log in's "Forgotten it?", the confirmation and order
 * pages, the dish allergen fallback, the Allergens page and the legal
 * documents — so none is ever written as a literal (FR-21, pinned by
 * `tests/information-links.test.ts`). It went to the site footer until the
 * page was built; nothing points there now.
 */
export const CONTACT_HREF: string = '/contact';

/**
 * Delivery & FAQs (#23) — its page. Every Delivery & FAQs link in the site
 * reads this (FR-21, pinned by `tests/information-links.test.ts`).
 */
export const DELIVERY_FAQS_HREF: string = '/delivery-and-faqs';

/** "Contact us" in sentence case, as every v2 footer sets it — checkout's too. */
export const CONTACT_ITEM: NavItem = { label: 'Contact us', href: CONTACT_HREF };

export const DELIVERY_FAQS_ITEM: NavItem = { label: 'Delivery & FAQs', href: DELIVERY_FAQS_HREF };

/** The box builder, Choose Box (step 1). */
export const BOX_HREF = BOX_BUILDER_PATH;

/**
 * The header's account slot when signed out (behaviour guide §A2). The label
 * is "Log in" — two words, as the v2 header, drawer and Log in page set it.
 */
export const LOGIN_ITEM: NavItem = { label: 'Log in', href: '/login' };

/** Where "Forgot your password?" goes: asks Aonik to email a reset link. */
export const FORGOT_PASSWORD_HREF: string = '/forgot-password';

/**
 * Takes `LOGIN_ITEM`'s place in the header and drawer once the customer is
 * signed in (behaviour guide §A2): same slot, new label and destination. The
 * order history is the account area's only page so far (My Account v2 is #35).
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

/* ---- Header and drawer -------------------------------------------------------- */

/**
 * The v2 marketing header's links (design/CLAUDE.md, "Canonical shared
 * components"): Menu / How it works / Abby's Story / Gifting / Private Table —
 * the same five, in the same order, in the drawer. Gifting joins when its page
 * does (`GIFTING_LIVE`).
 */
export const NAV_ITEMS: NavItem[] = [
  MENU_ITEM,
  HOW_IT_WORKS_ITEM,
  OUR_STORY_ITEM,
  ...(GIFTING_LIVE ? [GIFTING_ITEM] : []),
  PRIVATE_TABLE_ITEM,
];

/* ---- Footer ------------------------------------------------------------------- */

/**
 * The checkout footer (Choose Box v2 to Checkout v2), in the design's order.
 * These open in the SAME tab and carry no `?from=checkout`: only checkout's own
 * legal line opens the legal pages in a new tab with a way back (FR-22;
 * design/CLAUDE.md, "Legal line").
 */
export const CHECKOUT_FOOTER_LINKS: NavItem[] = [
  DELIVERY_FAQS_ITEM,
  ALLERGENS_ITEM,
  CONTACT_ITEM,
  PRIVACY_ITEM,
  TERMS_ITEM,
];

/**
 * The simplified footer on the 500 page — help and legal only, by design
 * (design/build-handoff.md §3ah). Like the site footer, a destination not
 * built yet resolves to the closest real one until it lands.
 *
 * The static host copy of that page (`public/500.html`) is generated from this
 * list: regenerate it after a change (`UPDATE_STATUS_PAGES=1 npm test`).
 */
export const STATUS_FOOTER_LINKS: NavItem[] = [
  DELIVERY_FAQS_ITEM,
  CONTACT_ITEM,
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

/**
 * The v2 footer's three columns (Homepage v2; design/build-handoff.md,
 * "Footer — what was settled"). Discovery Box and Journal are gone — there are
 * no such pages — and Learn gains How it works and Our standards.
 */
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Shop',
    links: [MENU_ITEM, ...(GIFTING_LIVE ? [GIFTING_ITEM] : []), PRIVATE_TABLE_ITEM],
  },
  {
    heading: 'Learn',
    links: [OUR_STORY_ITEM, HOW_IT_WORKS_ITEM, STANDARDS_ITEM],
  },
  {
    heading: 'Information',
    links: [DELIVERY_FAQS_ITEM, ALLERGENS_ITEM, CONTACT_ITEM],
  },
];

/* ---- Social ------------------------------------------------------------------- */

export type SocialNetwork = 'instagram' | 'tiktok' | 'facebook' | 'x';

export interface SocialLink {
  network: SocialNetwork;
  label: string;
  href: string;
}

/** Printed as plain text in the footer — the icons already reach the accounts. */
export const SOCIAL_HANDLE = '@FromAbbysTable';

/**
 * The four accounts, exactly as every v2 page publishes them (Homepage v2's
 * footer and drawer, and the other rebuilt pages — one set of URLs throughout
 * design/). Confirm they are the live accounts before launch.
 *
 * Also printed into the static status pages (`public/500.html`,
 * `public/maintenance.html`): regenerate them after a change here
 * (`UPDATE_STATUS_PAGES=1 npm test`).
 */
export const SOCIAL_LINKS: SocialLink[] = [
  { network: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/fromabbystable' },
  { network: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@fromabbystable' },
  { network: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/fromabbystable/' },
  { network: 'x', label: 'X', href: 'https://x.com/fromabbystable' },
];

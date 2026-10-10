/**
 * When the marketing header hides on scroll — the rules, deliberately free of
 * React and the DOM so they are unit-tested on their own
 * (tests/site-header.test.ts). The header (`components/layout/Header.tsx`)
 * reads the page and feeds the numbers through these functions.
 *
 * Two regimes, split at the 1024 breakpoint:
 *
 * MOBILE (< 1024) — every page that carries the marketing header. Scroll
 * direction owns it (design/CLAUDE.md "Mobile purchase CTA + header
 * behaviour"; build-handoff §3j): hidden while the page is scrolling DOWN,
 * back on the way up. The direction is the purchase bar's own
 * (`nextDirection`: 8px threshold, 120px floor, header focus guard), read from
 * one shared tracker (`lib/dom/pageScroll.ts`), so the header and the bar can
 * never disagree — one order CTA on screen at a time.
 *
 * DESKTOP (>= 1024) — only the marketing/editorial pages (build-handoff §3v,
 * design/at-desktop-header.js). Hysteresis measured from the turning point:
 * hidden after 40px of travel down, back after 64px of travel up, never hidden
 * while the page is within the header's own height of the top. Everything
 * else — dish pages, Allergens, legal, account, error pages, ordering and
 * checkout — keeps a plain sticky header at desktop. Which pages is a property
 * of the route (`autoHidesOnDesktop`), not of the page's markup.
 *
 * On both: never hidden while the drawer is open, nor while keyboard focus is
 * inside the header.
 */

import {
  ALLERGENS_ITEM,
  CONTACT_ITEM,
  DELIVERY_FAQS_ITEM,
  FORGOT_PASSWORD_HREF,
  HOW_IT_WORKS_ITEM,
  GIFTING_ITEM,
  MENU_ITEM,
  OUR_STORY_ITEM,
  PRIVATE_TABLE_ITEM,
  STANDARDS_ITEM,
} from '@/lib/content/navigation';

/** The site's desktop breakpoint. Below it the mobile rules apply. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/** Desktop: travel down from the highest point since shown before hiding. */
export const DESKTOP_HIDE_PX = 40;

/** Desktop: travel up from the lowest point since hidden before revealing. */
export const DESKTOP_REVEAL_PX = 64;

/** Desktop: how long an in-page anchor jump keeps the header out of the way. */
export const ANCHOR_JUMP_HOLD_MS = 450;

/**
 * Desktop: the hold outlasts a jump still in motion by this much. The site
 * scrolls smoothly, and a long jump takes longer than the hold itself.
 */
export const ANCHOR_JUMP_TAIL_MS = 150;

/**
 * The routes whose desktop header auto-hides — the design's opted-in list
 * (build-handoff §3v): Homepage, Menu, How it works, Gifting, Private Table,
 * Standards, Abby's Story, Delivery & FAQs, Contact. Only the BUILT ones are
 * named: Gifting (#26) adds its own route here when it lands. Listing an
 * unbuilt path would give its 404 the marketing behaviour, and error pages
 * are on the "never" list.
 *
 * Exact paths: `/menu` is here, a dish page (`/menu/<slug>`) is not.
 */
export const DESKTOP_AUTO_HIDE_PATHS: readonly string[] = [
  '/',
  MENU_ITEM.href,
  HOW_IT_WORKS_ITEM.href,
  OUR_STORY_ITEM.href,
  GIFTING_ITEM.href,
  STANDARDS_ITEM.href,
  CONTACT_ITEM.href,
  DELIVERY_FAQS_ITEM.href,
  PRIVATE_TABLE_ITEM.href,
];

/**
 * Pages that deliberately keep a static desktop header (build-handoff §3v),
 * named so a test can pin that none of them ever slips into the list above.
 */
export const DESKTOP_STATIC_EXAMPLES: readonly string[] = [
  '/menu/jollof-rice',
  ALLERGENS_ITEM.href,
  '/privacy',
  '/terms-of-sale',
  '/login',
  FORGOT_PASSWORD_HREF,
  '/account',
  '/account/orders',
  '/account/addresses',
  '/account/details',
  '/account/access',
  '/box',
];

/** Trailing slash and query/hash ignored: `/menu/` and `/menu?q=x` are `/menu`. */
export function normalisePath(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] || '/';
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
}

/** Whether the desktop header auto-hides on this route (a shell property). */
export function autoHidesOnDesktop(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return DESKTOP_AUTO_HIDE_PATHS.includes(normalisePath(pathname));
}

/** The desktop hysteresis state: hidden or not, and the turning point. */
export interface DesktopHeaderState {
  hidden: boolean;
  /**
   * While shown: the highest point (smallest scrollY) since it was shown.
   * While hidden: the lowest point (largest scrollY) since it was hidden.
   */
  turn: number;
}

export function initialDesktopHeader(y: number): DesktopHeaderState {
  return { hidden: false, turn: Math.max(0, y) };
}

export interface DesktopHeaderInputs {
  /** The header's own height: within it of the top, the header is always shown. */
  headerHeight: number;
  /** Keyboard focus is inside the header — it is shown. */
  focusInside?: boolean;
  /** An in-page anchor jump is under way — it stays out of the way. */
  jumping?: boolean;
}

/** The desktop state after a scroll to `y` — `tick()` in at-desktop-header.js. */
export function nextDesktopHeader(
  state: DesktopHeaderState,
  rawY: number,
  { headerHeight, focusInside = false, jumping = false }: DesktopHeaderInputs,
): DesktopHeaderState {
  const y = Math.max(0, rawY);
  if (y <= headerHeight) return { hidden: false, turn: y };
  if (jumping) return { hidden: true, turn: y };
  if (focusInside) return { hidden: false, turn: y };

  if (state.hidden) {
    if (y > state.turn) return { hidden: true, turn: y };
    return state.turn - y >= DESKTOP_REVEAL_PX ? { hidden: false, turn: y } : state;
  }
  if (y < state.turn) return { hidden: false, turn: y };
  return y - state.turn >= DESKTOP_HIDE_PX ? { hidden: true, turn: y } : state;
}

export interface HeaderHiddenInputs {
  /** At or above the 1024 breakpoint. */
  desktop: boolean;
  /** This route's desktop header auto-hides (`autoHidesOnDesktop`). */
  autoHidesOnDesktop: boolean;
  /** The desktop hysteresis says hidden (`nextDesktopHeader`). */
  desktopHidden: boolean;
  /** The page is scrolling down (the shared `nextDirection`). */
  down: boolean;
  drawerOpen: boolean;
  focusInside: boolean;
}

/** The whole decision: whether the header is moved out of view. */
export function isHeaderHidden({
  desktop,
  autoHidesOnDesktop: autoHides,
  desktopHidden,
  down,
  drawerOpen,
  focusInside,
}: HeaderHiddenInputs): boolean {
  if (drawerOpen || focusInside) return false;
  if (desktop) return autoHides && desktopHidden;
  return down;
}

/**
 * Whether following `href` from `current` is a jump within the same page: the
 * same document (path and query) with a fragment. Root-relative anchors
 * (`/#founder` on the homepage) count, as bare ones (`#founder`) do.
 */
export function isInPageJump(
  href: string,
  current: { origin: string; pathname: string; search: string },
): boolean {
  let target: URL;
  try {
    target = new URL(href, `${current.origin}${current.pathname}${current.search}`);
  } catch {
    return false;
  }
  return (
    target.hash.length > 1 &&
    target.origin === current.origin &&
    normalisePath(target.pathname) === normalisePath(current.pathname) &&
    target.search === current.search
  );
}

/**
 * What the marketing chrome SAYS — the current page in the nav, the account
 * slot and the order pill — as pure functions of the route, the session and
 * the cart, so they are unit-tested on their own (tests/site-header.test.ts).
 */

import {
  ACCOUNT_ITEM,
  BOX_HREF,
  LOGIN_ITEM,
  MENU_ITEM,
  type NavItem,
} from '@/lib/content/navigation';
import { boxResumeHref, isBoxActive, type BarCart } from '@/lib/purchase-bar/activeBox';

import { normalisePath } from './visibility';

/**
 * Sections whose descendants still count as being "in" them: a dish page
 * (`/menu/<slug>`) shows Menu as current, as Dish Landing v2's header does,
 * and every account page shows My Account.
 */
const SECTION_ROOTS: readonly string[] = [MENU_ITEM.href, '/account'];

/**
 * `aria-current` for a chrome link: `page` when it is the page being shown,
 * `true` when the page sits inside the section it leads to, otherwise none.
 *
 * Anchors (`/#private`, the homepage band, until #25) are never current — they are a place on another page, not this one — and
 * neither is anything with a scheme.
 */
export function ariaCurrentFor(
  pathname: string | null | undefined,
  href: string,
): 'page' | 'true' | undefined {
  if (!pathname || href.includes('#') || !href.startsWith('/')) return undefined;
  const here = normalisePath(pathname);
  const target = normalisePath(href);
  if (here === target) return 'page';
  const section = SECTION_ROOTS.find((root) => target === root || target.startsWith(`${root}/`));
  if (section && here.startsWith(`${section}/`)) return 'true';
  return undefined;
}

/**
 * The header and drawer's account slot (behaviour guide §A2): "Log in" signed
 * out, "My Account" signed in — label AND destination change, the slot stays.
 * The session comes from the server (an httpOnly cookie read in `SiteChrome`),
 * never from the browser.
 */
export function accountItem(session: { isSignedIn: boolean }): NavItem {
  return session.isSignedIn ? ACCOUNT_ITEM : LOGIN_ITEM;
}

export interface OrderCta<StartLabel extends string> {
  /** Sentence case; the pills set it in caps. */
  label: StartLabel | 'View box';
  href: string;
  /** VIEW BOX: green-forest, not terracotta — it continues an order. */
  continuing: boolean;
}

type OrderCart = Pick<BarCart, 'hydrated' | 'boxSize' | 'dishCount'>;

function orderCta<StartLabel extends string>(cart: OrderCart, start: StartLabel): OrderCta<StartLabel> {
  if (isBoxActive(cart)) {
    return { label: 'View box', href: boxResumeHref(cart.boxSize), continuing: true };
  }
  return { label: start, href: BOX_HREF, continuing: false };
}

/**
 * The header pill (design/CLAUDE.md "Order in progress"; behaviour guide §A3):
 * GET STARTED to Choose Box, or VIEW BOX back to the box once one is ACTIVE.
 * The rule is the purchase bar's (`isBoxActive`, `boxResumeHref`) — one
 * definition of an active box, so the pill and the bar always agree. Never
 * active before the cart has hydrated, so the first render always sells.
 */
export function headerOrderCta(cart: OrderCart): OrderCta<'Get started'> {
  return orderCta(cart, 'Get started');
}

/**
 * The drawer's full-width pill: BUILD A BOX, and — once a box is active —
 * VIEW BOX, exactly as the header pill and the mobile purchase bar switch.
 *
 * The design is silent here (at-order-state.js swaps the header pill and the
 * bar, and skips the drawer). The drawer opens from the header, so a pill that
 * still offered to build a box under a header that says VIEW BOX would read as
 * a second, parallel order. Following the same rule keeps one order reading as
 * one thing wherever the customer meets it. An owner question on the PR.
 */
export function drawerOrderCta(cart: OrderCart): OrderCta<'Build a Box'> {
  return orderCta(cart, 'Build a Box');
}

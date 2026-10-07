/**
 * The dish → Our Standards → dish round trip (design/CLAUDE.md, "Contextual
 * 'Back to dish'"; behaviour guide §3 and §5).
 *
 * Deliberately free of React so the rules can be tested on their own.
 *
 * HOW IT WORKS
 *
 *  1. The dish page's "See our standards" link (`StandardsLink`) goes to
 *     `/standards?from=dish&dish=<slug>[&portion=<key>]`. On click it
 *       - writes a short-lived record to this tab's sessionStorage
 *         (`at-dish-return-v1`: slug, time, `history.length`), and
 *       - rewrites the dish page's OWN history entry to carry the chosen
 *         portion (`/menu/<slug>?portion=full`) before navigating, so however
 *         the customer comes back to that entry — our link, the browser's Back
 *         button, the back-forward cache — the dish page reads the portion
 *         from its URL and restores it. (The same move as the design's Step 2,
 *         which rewrites its entry to `?qv=1` before leaving.)
 *
 *  2. Our Standards shows "Back to dish" only when BOTH signals hold
 *     (design: "Two signals, both required"):
 *       - the query names a dish the catalogue actually has — checked on the
 *         server against real dish data, so `?from=dish` alone, or with a
 *         made-up slug, renders nothing at all; and
 *       - this tab holds a live record for that same dish — the query alone, a
 *         pasted or shared link, is not enough. The record is read before
 *         first paint (`dishReturnGateScript`) on a full load and in a layout
 *         effect on a client navigation, so the link never shifts the page.
 *
 *  3. A primary click on "Back to dish" is a TRUE return: `history.back()`
 *     when the entry behind this one is the dish, otherwise it replaces this
 *     entry with the dish — never a forward push, so Dish → Standards → Dish
 *     can never loop. The href is the real dish URL (portion included) for
 *     no-JS, new-tab and modified clicks.
 *
 * WHAT "THE CHOSEN PORTION" IS TODAY: the dish personaliser's `portion` option
 * group (Light table / Full table) — the same group `DishPicker` reads. Only a
 * portion that differs from the dish's default travels; the default needs no
 * restoring. Issue #22 replaces the personaliser with a portion card: that card
 * only needs to pass its choice to `StandardsLink` and seed itself from
 * `returnedPortion(location.search, groups)` — nothing here changes.
 */

import { decodeSelection, type MappedOptionGroup, type PersonalisationSelection } from './aonik/map';

/** sessionStorage key — the design's own name, so the prototype and the build agree. */
export const DISH_RETURN_STORAGE_KEY = 'at-dish-return-v1';

/** A return record older than this is stale (design: 6h expiry). */
export const DISH_RETURN_TTL_MS = 6 * 60 * 60 * 1000;

/** The option group that holds a dish's portion. */
export const PORTION_GROUP_KEY = 'portion';

/** Query parameter names, shared by both ends. */
export const FROM_PARAM = 'from';
export const FROM_DISH = 'dish';
export const DISH_PARAM = 'dish';
export const PORTION_PARAM = 'portion';

/** Catalogue slugs: lower-case words joined by single hyphens. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 120;
/** Option choice keys are opaque tenant tokens; this only keeps them URL-tame. */
const CHOICE_KEY = /^[A-Za-z0-9_-]{1,64}$/;

export function isDishSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= SLUG_MAX && SLUG.test(value);
}

function isChoiceKey(value: unknown): value is string {
  return typeof value === 'string' && CHOICE_KEY.test(value);
}

/** The dish page's path. */
export function dishPath(slug: string): string {
  return `/menu/${slug}`;
}

/** The dish page, carrying the portion to restore when there is one. */
export function dishHref(slug: string, portion?: string): string {
  return portion ? `${dishPath(slug)}?${PORTION_PARAM}=${encodeURIComponent(portion)}` : dishPath(slug);
}

/** Our Standards, opened from a dish page. */
export function standardsHref(slug: string, portion?: string): string {
  const query = new URLSearchParams({ [FROM_PARAM]: FROM_DISH, [DISH_PARAM]: slug });
  if (portion) query.set(PORTION_PARAM, portion);
  return `/standards?${query.toString()}`;
}

export interface DishReturnParams {
  slug: string;
  portion?: string;
}

type SearchParams = Record<string, string | string[] | undefined>;

/** A single string value, or undefined — a repeated parameter is not trusted. */
function single(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * The SHAPE check on Our Standards' query: `from=dish` and a well-formed slug.
 * Says nothing about whether the dish exists — `resolveDishReturn` does that
 * against real dish data. A malformed portion is dropped, not fatal: the
 * customer still gets back to the dish.
 */
export function readDishReturnParams(params: SearchParams): DishReturnParams | null {
  if (single(params, FROM_PARAM) !== FROM_DISH) return null;

  const slug = single(params, DISH_PARAM);
  if (!isDishSlug(slug)) return null;

  const portion = single(params, PORTION_PARAM);
  return isChoiceKey(portion) ? { slug, portion } : { slug };
}

export interface DishReturn {
  slug: string;
  /** The real dish URL, with the portion when the dish actually offers it. */
  href: string;
}

/**
 * The back link's destination, validated against REAL dish data: `dish` is the
 * catalogue's answer for the slug (null when there is no such dish), `groups`
 * its option groups. No dish, no link — whatever the query says.
 */
export function resolveDishReturn(
  params: DishReturnParams | null,
  dish: { slug: string } | null,
  groups: MappedOptionGroup[],
): DishReturn | null {
  if (!params || !dish || dish.slug !== params.slug) return null;
  const portion = validPortion(groups, params.portion);
  return { slug: dish.slug, href: dishHref(dish.slug, portion) };
}

/** A portion worth restoring: one this dish offers, and not its default. */
function validPortion(groups: MappedOptionGroup[], key: string | undefined): string | undefined {
  if (!isChoiceKey(key)) return undefined;
  const group = groups.find((candidate) => candidate.key === PORTION_GROUP_KEY);
  if (!group || key === group.defaultChoiceKey) return undefined;
  return group.choices.some((choice) => choice.key === key) ? key : undefined;
}

/**
 * The portion to carry to Our Standards from the dish's current selection —
 * undefined when the customer has not moved off the default.
 */
export function chosenPortion(
  groups: MappedOptionGroup[],
  selection: PersonalisationSelection | undefined,
): string | undefined {
  const values = decodeSelection(selection)[PORTION_GROUP_KEY] ?? [];
  return validPortion(groups, values[0]);
}

/**
 * The portion the dish page should restore, read from its own URL search
 * (`location.search`). Validated against the dish's groups, because a URL can
 * say anything.
 */
export function returnedPortion(search: string, groups: MappedOptionGroup[]): string | undefined {
  let value: string | null = null;
  try {
    value = new URLSearchParams(search).get(PORTION_PARAM);
  } catch {
    return undefined;
  }
  return validPortion(groups, value ?? undefined);
}

/* ---- The session record ------------------------------------------------- */

export interface DishReturnRecord {
  v: 1;
  /** When "See our standards" was clicked, ms since the epoch. */
  t: number;
  slug: string;
  /** `history.length` on the dish page at that moment. */
  hl: number;
}

export function createDishReturnRecord(
  slug: string,
  now: number,
  historyLength: number,
): DishReturnRecord {
  return { v: 1, t: now, slug, hl: historyLength };
}

/**
 * The live record for `slug`, or null. Anything unreadable, for another dish,
 * or older than the TTL is no record — the state only ever ADDS a link.
 *
 * Mirrored by `dishReturnGateScript` below: change one, change both (the tests
 * run the same cases through each).
 */
export function readDishReturnRecord(
  raw: string | null,
  slug: string,
  now: number,
): DishReturnRecord | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<DishReturnRecord>;
  if (record.v !== 1 || record.slug !== slug) return null;
  if (typeof record.hl !== 'number' || typeof record.t !== 'number' || !Number.isFinite(record.t)) {
    return null;
  }
  if (!(now - record.t < DISH_RETURN_TTL_MS)) return null;
  return { v: 1, t: record.t, slug: record.slug, hl: record.hl };
}

/**
 * Is the entry behind this one the dish? Only when exactly one entry has been
 * pushed since the dish recorded `history.length`. Anything else — in-page
 * anchor jumps on Our Standards, a history that was cut and regrown — falls
 * back to replacing this entry with the dish, which is always safe.
 *
 * (The prototype also trusts `document.referrer`. Here it is not used: a
 * client-side navigation never updates it, and after an in-page jump it would
 * send `history.back()` to Our Standards' own previous entry.)
 */
export function returnsByHistory(record: DishReturnRecord, historyLength: number): boolean {
  return historyLength === record.hl + 1;
}

/**
 * The inline script that gates the back link before first paint on a FULL
 * page load: if this tab holds no live record for `slug`, it hides the element
 * the server rendered. The same checks as `readDishReturnRecord`, in ES5 so it
 * runs as written, and with no `<` anywhere in it (`ttl > age`, not `age < ttl`).
 *
 * Every argument is JSON-encoded with `<` escaped, so no value can close the
 * script element. The slug has already been validated against the catalogue.
 */
export function dishReturnGateScript(slug: string, elementId: string): string {
  const args = [DISH_RETURN_STORAGE_KEY, slug, DISH_RETURN_TTL_MS, elementId]
    .map((value) => JSON.stringify(value).replace(/</g, '\\u003c'))
    .join(',');

  return (
    '(function(k,s,ttl,id){' +
    'try{var r=JSON.parse(window.sessionStorage.getItem(k)||"null");' +
    'if(r&&typeof r==="object"&&r.v===1&&r.slug===s&&typeof r.hl==="number"' +
    '&&typeof r.t==="number"&&isFinite(r.t)&&ttl>Date.now()-r.t)return}catch(e){}' +
    'var el=document.getElementById(id);if(el)el.hidden=true' +
    `})(${args})`
  );
}

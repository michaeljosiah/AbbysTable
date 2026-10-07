/**
 * The dish → Our Standards → dish round trip (design/CLAUDE.md, "Contextual
 * 'Back to dish'"; behaviour guide §3 and §5).
 *
 * Deliberately free of React so the rules can be tested on their own.
 *
 * HOW IT WORKS
 *
 *  1. The dish page's "See our standards" link (`StandardsLink`) goes to
 *     `/standards?from=dish&dish=<slug>`. On click it writes ONE record to
 *     this tab's sessionStorage (`at-dish-return-v1`): the dish, the time,
 *     `history.length`, the scroll position, the customer's WHOLE
 *     personalisation (every group, canonically encoded — the design's
 *     `s: {…}`) and a one-off `entry` token, with `returning: false`. It also
 *     stamps the dish page's OWN history entry with that token (in
 *     `history.state`, never the URL). Nothing about the choice ever goes in a
 *     URL, so no link can carry one dish's choices to whoever opens it.
 *
 *  2. Our Standards shows "Back to dish" only when BOTH signals hold
 *     (design: "Two signals, both required"):
 *       - the query names a dish the catalogue actually has — checked on the
 *         server against real dish data, so `?from=dish` alone, or with a
 *         made-up slug, renders nothing at all; and
 *       - this tab holds a live record for that same dish — a pasted or
 *         shared link has none.
 *     The server renders the control HIDDEN; only the browser can see the
 *     record, so it is revealed there — by an inline script before first paint
 *     on a full load (`dishReturnGateScript`), by a layout effect on a
 *     client-side navigation. With JavaScript off it never shows.
 *
 *  3. "Back to dish" marks the record `returning: true`, then makes a TRUE
 *     return: `history.back()` when the entry behind is the dish, otherwise it
 *     replaces this entry with the dish — never a forward push, so Dish →
 *     Standards → Dish can never loop.
 *
 *  4. The dish page restores ONLY on a genuine return (`isGenuineReturn`): a
 *     live record for this dish AND either the `returning` mark, or this being
 *     the very history entry the customer left from (its stamp matches the
 *     record's token). The stamp is the back/forward signal: it holds for the
 *     browser's Back button within the app (where the document's navigation
 *     type never changes) and for a back/forward document load alike, and no
 *     other entry carries it. Then the page restores the whole selection or
 *     nothing (`restorableSelection`), puts the scroll position back, and
 *     consumes the record so it can never apply twice. A fresh visit — a link,
 *     a bookmark, a reload after returning — never inherits an old selection.
 *
 * WHAT "THE CHOSEN PORTION" IS TODAY: the dish personaliser's `portion` option
 * group (Light table / Full table), carried with the rest of the selection.
 * Issue #22 replaces the personaliser with a portion card: that card passes its
 * selection (`{ portion: 'full' }`) to `StandardsLink`, and seeds itself from
 * the `selection` that `useDishReturn` hands back — nothing here changes.
 */

import { decodeSelection, type MappedOptionGroup, type PersonalisationSelection } from './aonik/map';

/** sessionStorage key — the design's own name, so the prototype and the build agree. */
export const DISH_RETURN_STORAGE_KEY = 'at-dish-return-v1';

/** A return record older than this is stale (design: 6h expiry). */
export const DISH_RETURN_TTL_MS = 6 * 60 * 60 * 1000;

/** The `history.state` key that stamps the dish entry the customer left from. */
export const DISH_ENTRY_STATE_KEY = 'atDishReturn';

/** Query parameter names. */
export const FROM_PARAM = 'from';
export const FROM_DISH = 'dish';
export const DISH_PARAM = 'dish';

/** Catalogue slugs: lower-case words joined by single hyphens. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 120;

export function isDishSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= SLUG_MAX && SLUG.test(value);
}

/** The dish page — also the back link's href, for no-JS, new-tab and modified clicks. */
export function dishPath(slug: string): string {
  return `/menu/${slug}`;
}

/** Our Standards, opened from a dish page. */
export function standardsHref(slug: string): string {
  const query = new URLSearchParams({ [FROM_PARAM]: FROM_DISH, [DISH_PARAM]: slug });
  return `/standards?${query.toString()}`;
}

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The SHAPE check on Our Standards' query: `from=dish` and a well-formed slug,
 * each given once. Says nothing about whether the dish exists — the page asks
 * the catalogue — and returns the slug to look up.
 */
export function readDishReturnSlug(params: SearchParams): string | null {
  if (params[FROM_PARAM] !== FROM_DISH) return null;
  const slug = params[DISH_PARAM];
  return isDishSlug(slug) ? slug : null;
}

export interface DishReturn {
  slug: string;
  href: string;
}

/**
 * The back link, validated against REAL dish data: `dish` is the catalogue's
 * answer for the slug (null when there is no such dish, or it could not be
 * read). No dish, no link — whatever the query says.
 */
export function resolveDishReturn(slug: string | null, dish: { slug: string } | null): DishReturn | null {
  if (!slug || !dish || dish.slug !== slug) return null;
  return { slug, href: dishPath(slug) };
}

/* ---- The session record ------------------------------------------------- */

export interface DishReturnRecord {
  v: 1;
  /** When "See our standards" was clicked, ms since the epoch. */
  t: number;
  slug: string;
  /** `history.length` on the dish page at that moment. */
  hl: number;
  /** The dish page's scroll position at that moment. */
  y: number;
  /**
   * The customer's whole personalisation, canonically encoded (every group).
   * Absent when the dish was left as Abby designed it.
   */
  selection?: PersonalisationSelection;
  /** One-off token, also stamped on the dish's own history entry. */
  entry: string;
  /** Set by "Back to dish". */
  returning: boolean;
}

export function createDishReturnRecord(input: {
  slug: string;
  now: number;
  historyLength: number;
  scrollY: number;
  entry: string;
  selection?: PersonalisationSelection;
}): DishReturnRecord {
  return {
    v: 1,
    t: input.now,
    slug: input.slug,
    hl: input.historyLength,
    y: Math.max(0, Math.round(input.scrollY)),
    ...(input.selection ? { selection: input.selection } : {}),
    entry: input.entry,
    returning: false,
  };
}

/**
 * The live record for `slug`, or null. Anything unreadable, for another dish,
 * or older than the TTL is no record — the state only ever ADDS a link.
 *
 * The selection is passed through unvalidated: `restorableSelection` judges it
 * against the dish's real groups. Mirrored by `dishReturnGateScript` below —
 * change one, change both (the tests run the same cases through each).
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
  if (
    typeof record.hl !== 'number' ||
    typeof record.y !== 'number' ||
    typeof record.entry !== 'string' ||
    typeof record.returning !== 'boolean' ||
    typeof record.t !== 'number' ||
    !Number.isFinite(record.t)
  ) {
    return null;
  }
  if (!(now - record.t < DISH_RETURN_TTL_MS)) return null;
  return {
    v: 1,
    t: record.t,
    slug: record.slug,
    hl: record.hl,
    y: record.y,
    ...(record.selection !== undefined ? { selection: record.selection } : {}),
    entry: record.entry,
    returning: record.returning,
  };
}

/** The record with the customer's return marked. */
export function markReturning(record: DishReturnRecord): DishReturnRecord {
  return { ...record, returning: true };
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
 * Is this mount of the dish page a GENUINE return? Only with a live record for
 * this dish, and then only if "Back to dish" marked it, or this is the very
 * history entry the customer left from — the design's
 * `returning || back_forward`, made exact. `entryStamps` are the stamps the
 * browser reports for the current entry (`history.state`, and the state the
 * last `popstate` arrived with): a new entry — a link, the menu, a bookmark —
 * has none.
 */
export function isGenuineReturn(
  record: DishReturnRecord | null,
  signals: { entryStamps: unknown[] },
): record is DishReturnRecord {
  if (!record) return false;
  return record.returning || signals.entryStamps.includes(record.entry);
}

/**
 * The stored selection as editable state — the WHOLE selection or nothing.
 * Null when there is none, or when any part of it no longer fits the dish:
 * an unknown group, a choice the dish no longer offers, or a `One` group with
 * other than one choice. Restoring part of a selection would silently change
 * what the customer chose (and what they pay). Groups the dish has gained
 * since take their default.
 */
export function restorableSelection(
  groups: MappedOptionGroup[],
  stored: unknown,
): Record<string, string[]> | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;

  const entries = Object.entries(stored as Record<string, unknown>);
  if (entries.length === 0) return null;
  for (const [, value] of entries) {
    const values = Array.isArray(value) ? value : [value];
    if (values.length === 0 || values.some((item) => typeof item !== 'string')) return null;
  }

  const decoded = decodeSelection(stored as PersonalisationSelection);
  for (const [key, values] of Object.entries(decoded)) {
    const group = groups.find((candidate) => candidate.key === key);
    if (!group) return null;
    if (group.selectionMode === 'One' && values.length !== 1) return null;
    const offered = new Set(group.choices.map((choice) => choice.key));
    if (new Set(values).size !== values.length || values.some((value) => !offered.has(value))) {
      return null;
    }
  }

  return Object.fromEntries(
    groups.map((group) => [
      group.key,
      decoded[group.key] ?? (group.defaultChoiceKey ? [group.defaultChoiceKey] : []),
    ]),
  );
}

export interface ReturnStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

export interface DishRestore {
  /** The whole selection to restore, or null to leave the dish as designed. */
  selection: Record<string, string[]> | null;
  /** Scroll position to put back. */
  y: number;
}

/**
 * The dish page's decision on mount: on a genuine return, CONSUME the record
 * (so it can never apply twice) and say what to restore; otherwise touch
 * nothing and return null. Nothing here reads the URL — a link or bookmark
 * can never carry a selection.
 */
export function takeDishReturn(
  storage: ReturnStorage,
  input: {
    slug: string;
    groups: MappedOptionGroup[];
    now: number;
    /** The stamps reported for the current history entry, if any. */
    entryStamps: unknown[];
  },
): DishRestore | null {
  const record = readDishReturnRecord(storage.getItem(DISH_RETURN_STORAGE_KEY), input.slug, input.now);
  if (!isGenuineReturn(record, input)) return null;
  storage.removeItem(DISH_RETURN_STORAGE_KEY);
  return { selection: restorableSelection(input.groups, record.selection), y: record.y };
}

/**
 * The inline script that gates the back link before first paint on a FULL
 * page load: the server renders it hidden, and this reveals it only when the
 * tab holds a live record for `slug`. The same checks as
 * `readDishReturnRecord`, in ES5 so it runs as written, and with no `<`
 * anywhere in it (`ttl > age`, not `age < ttl`).
 *
 * Every argument is JSON-encoded with `<` escaped, so no value can close the
 * script element. The slug has already been validated against the catalogue.
 */
export function dishReturnGateScript(slug: string, elementId: string): string {
  const args = [DISH_RETURN_STORAGE_KEY, slug, DISH_RETURN_TTL_MS, elementId]
    .map((value) => JSON.stringify(value).replace(/</g, '\\u003c'))
    .join(',');

  return (
    '(function(k,s,ttl,id){var ok=false;' +
    'try{var r=JSON.parse(window.sessionStorage.getItem(k)||"null");' +
    'ok=!!(r&&typeof r==="object"&&r.v===1&&r.slug===s&&typeof r.hl==="number"' +
    '&&typeof r.y==="number"&&typeof r.entry==="string"&&typeof r.returning==="boolean"' +
    '&&typeof r.t==="number"&&isFinite(r.t)&&ttl>Date.now()-r.t)}catch(e){}' +
    'if(ok){var el=document.getElementById(id);if(el)el.hidden=false}' +
    `})(${args})`
  );
}

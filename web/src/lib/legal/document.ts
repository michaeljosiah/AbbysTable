/**
 * Long legal documents — Terms of Sale and the Privacy Policy.
 *
 * One continuous document per page, with a grouped index that is navigation
 * over it, never a controller that swaps what the document shows
 * (design/CLAUDE.md, "Long documents"). This module holds the part of that
 * architecture that is a CONTRACT rather than presentation: which sections
 * exist, the order and groups they sit in, and the anchors that reach them.
 * Deliberately free of React so the contract can be tested on its own.
 *
 * ── Anchors are a public contract ─────────────────────────────────────────────
 * A section's `slug` is its durable identifier and its URL fragment:
 * `/terms-of-sale#refunds`, `/privacy#cookies`. FAQ answers, customer-service
 * emails, checkout and confirmation emails link to these, so a slug, once
 * published, never changes (design/build-handoff.md, "Terms of Sale — the
 * document architecture"). Clause NUMBERS are presentation: a clause can be
 * inserted later and every number after it moves, which is exactly why links
 * must not use them. Number-based links already in the wild (`#s30`, `#30`)
 * still resolve through `resolveLegalAnchor`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface LegalSection {
  /** The number printed beside the title. Presentation only — never an anchor. */
  readonly n: number;
  /** The public, durable anchor. Lower-case words joined by hyphens. */
  readonly slug: string;
  /** Verbatim from the design; the index row and the section heading share it. */
  readonly title: string;
}

export interface LegalGroup {
  readonly title: string;
  readonly sections: readonly LegalSection[];
}

export interface LegalDocument {
  /** The index's accessible name, e.g. "Terms of Sale sections". */
  readonly navLabel: string;
  readonly groups: readonly LegalGroup[];
  /** Whether the index divides its groups with a hairline (Terms does; Privacy does not). */
  readonly groupRules?: boolean;
}

/** Every section in document order. */
export function sectionsOf(doc: LegalDocument): LegalSection[] {
  return doc.groups.flatMap((group) => group.sections);
}

/** The group a numbered section belongs to; the first group when it is unknown. */
export function groupIndexOf(doc: LegalDocument, n: number): number {
  const index = doc.groups.findIndex((group) => group.sections.some((section) => section.n === n));
  return index === -1 ? 0 : index;
}

/** The range printed on a group row: "1–12", or "11" for a one-section group. */
export function groupRange(group: LegalGroup): string {
  const first = group.sections[0]?.n;
  const last = group.sections[group.sections.length - 1]?.n;
  if (first === undefined || last === undefined) return '';
  return first === last ? String(first) : `${first}–${last}`;
}

export function sectionBySlug(doc: LegalDocument, slug: string): LegalSection | null {
  return sectionsOf(doc).find((section) => section.slug === slug) ?? null;
}

export function sectionByNumber(doc: LegalDocument, n: number): LegalSection | null {
  return sectionsOf(doc).find((section) => section.n === n) ?? null;
}

/** `#s30` and `#30`: the number-based anchors the design's legacy resolver accepts. */
const LEGACY_ANCHOR = /^s?(\d{1,2})$/;

export interface ResolvedAnchor {
  readonly section: LegalSection;
  /**
   * True for a number-based anchor. The page rewrites it to the section's slug
   * with `replaceState`, so the address bar and anything copied from it carry
   * the durable form.
   */
  readonly legacy: boolean;
}

/**
 * Resolves a URL fragment (with or without its `#`) to a section: a slug
 * first, then a legacy `sN` / `N` number. Anything else — an unknown slug, a
 * number with no section, an empty hash — is `null`.
 */
export function resolveLegalAnchor(doc: LegalDocument, hash: string): ResolvedAnchor | null {
  let fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  try {
    fragment = decodeURIComponent(fragment);
  } catch {
    // A malformed escape is simply not one of ours.
  }
  if (!fragment) return null;

  const bySlug = sectionBySlug(doc, fragment);
  if (bySlug) return { section: bySlug, legacy: false };

  const legacy = LEGACY_ANCHOR.exec(fragment);
  if (legacy) {
    const byNumber = sectionByNumber(doc, Number(legacy[1]));
    if (byNumber) return { section: byNumber, legacy: true };
  }
  return null;
}

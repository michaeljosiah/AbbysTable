/**
 * The "Country or region" typeahead's rules — which countries a query
 * suggests, and which one (if any) a typed name IS — free of React and the DOM,
 * so the combobox and the server action share them and both are unit-tested
 * (tests/private-table.test.tsx).
 *
 * The list is fixed (`@/lib/content/countries`). A name only counts once it
 * resolves to an entry on it, by its name or one of its aliases; the browser's
 * check is a courtesy, and the server action resolves it again.
 *
 * Linear in the input: a query is capped before it is matched, and matching
 * is plain string comparison over a list of ~240 entries — no pattern a
 * crafted value could make backtrack.
 */

import { COUNTRIES, FEATURED_COUNTRY_CODES, type Country } from '@/lib/content/countries';

/** The most suggestions shown at once — the design's list holds eight. */
export const MAX_COUNTRY_SUGGESTIONS = 8;

/**
 * Longer than any country name or alias on the list; anything past it cannot
 * resolve, and is not compared at all.
 */
export const MAX_COUNTRY_TEXT = 100;

/**
 * Case, accents and punctuation do not matter: "cote d'ivoire", "Côte
 * d’Ivoire" and "COTE D IVOIRE" are the same words, and "U.K." is "UK".
 * Diacritics are dropped (NFD, then combining marks), full stops vanish (the
 * abbreviations), and every other run of anything but a letter or digit
 * becomes one space.
 */
export function normaliseCountryText(text: string): string {
  return text
    .slice(0, MAX_COUNTRY_TEXT)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

interface IndexedCountry {
  country: Country;
  name: string;
  aliases: string[];
  /** Position in the design's suggested list, or Infinity. */
  featured: number;
  /** Alphabetical position. */
  order: number;
}

const INDEX: readonly IndexedCountry[] = COUNTRIES.map((country, order) => {
  const featured = FEATURED_COUNTRY_CODES.indexOf(country.code);
  return {
    country,
    name: normaliseCountryText(country.name),
    aliases: (country.aliases ?? []).map(normaliseCountryText),
    featured: featured === -1 ? Number.POSITIVE_INFINITY : featured,
    order,
  };
});

/**
 * The country a typed name IS: its name or an alias, exactly, as
 * `normaliseCountryText` sees them ("uk", "United kingdom", "England" → the
 * United Kingdom). Null for anything else — a partial name ("United") is not
 * a country, and neither is free text.
 */
export function resolveCountry(text: string): Country | null {
  if (text.length > MAX_COUNTRY_TEXT) return null;
  const query = normaliseCountryText(text);
  if (!query) return null;
  const hit = INDEX.find((entry) => entry.name === query || entry.aliases.includes(query));
  return hit ? hit.country : null;
}

/** A country by its code, or null when the code is not on the list. */
export function countryByCode(code: string): Country | null {
  return COUNTRIES.find((country) => country.code === code) ?? null;
}

/**
 * How well an entry matches, lower is better, or null for no match:
 *   0 — the name or an alias, exactly ("uk")
 *   1 — the name starts with the query ("nig" → Nigeria, Niger)
 *   2 — an alias starts with it ("eng" → United Kingdom, by "England")
 *   3 — a later word of the name starts with it ("korea" → North and South Korea)
 *   4 — the name contains it anywhere else
 */
function rank(entry: IndexedCountry, query: string): number | null {
  if (entry.name === query || entry.aliases.includes(query)) return 0;
  if (entry.name.startsWith(query)) return 1;
  if (entry.aliases.some((alias) => alias.startsWith(query))) return 2;
  if (entry.name.includes(` ${query}`)) return 3;
  if (entry.name.includes(query)) return 4;
  return null;
}

/**
 * What the typeahead suggests for `text`, best first, at most `limit`.
 *
 * Nothing typed: the design's own suggestions, in its order (the United
 * Kingdom first). Otherwise every match ranked as `rank` says; within a rank,
 * the design's suggested countries first in their order, then alphabetical —
 * so "united" puts the United Kingdom above the United Arab Emirates, as the
 * design's list does.
 */
export function matchCountries(text: string, limit = MAX_COUNTRY_SUGGESTIONS): Country[] {
  const query = normaliseCountryText(text);
  if (!query) {
    return FEATURED_COUNTRY_CODES.slice(0, limit)
      .map((code) => countryByCode(code))
      .filter((country): country is Country => country !== null);
  }
  return INDEX.flatMap((entry) => {
    const score = rank(entry, query);
    return score === null ? [] : [{ entry, score }];
  })
    .sort(
      (a, b) =>
        a.score - b.score || a.entry.featured - b.entry.featured || a.entry.order - b.entry.order,
    )
    .slice(0, limit)
    .map(({ entry }) => entry.country);
}

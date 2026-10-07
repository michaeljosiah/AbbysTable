/**
 * FAQ search — the rules, free of React and the DOM so they are unit-tested
 * on their own (tests/delivery-faqs.test.tsx). Behaviour from build-handoff
 * §3l and the page behaviour guide §9:
 *
 *   - an empty field is BROWSE: the topic grid and the groups;
 *   - one character is still SEARCH, holding a "Keep typing" line — the topic
 *     grid never comes back while a query is present;
 *   - two or more characters search live;
 *   - EVERY term must appear somewhere in the question or its answer, so
 *     "freeze meals" narrows rather than widens;
 *   - a hit in the question ranks above an answer-only hit (more question
 *     hits first), otherwise the page's own order;
 *   - an exact-duplicate question is indexed once, first in page order wins:
 *     results carry no topic label, so the same question twice would read as
 *     a rendering fault.
 */

/** Below this many characters a query only says "keep typing". */
export const MIN_QUERY_LENGTH = 2;

/** The debounce on live results, so typing is not twitchy (build-handoff §3l). */
export const SEARCH_DEBOUNCE_MS = 180;

export interface FaqSearchSource {
  id: string;
  question: string;
  /** The answer's plain text. */
  answer: string;
}

export interface FaqIndexEntry {
  id: string;
  /** Normalised question text. */
  question: string;
  /** Normalised question + answer text. */
  text: string;
}

export type FaqSearchResult =
  | { state: 'browse' }
  | { state: 'too-short'; query: string }
  | { state: 'results'; query: string; ids: string[] };

/**
 * Text as search compares it: lower case, curly quotes as straight ones (a
 * phone keyboard types "abby's", the copy says "Abby’s"), whitespace
 * collapsed.
 */
export function normaliseSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildFaqIndex(sources: FaqSearchSource[]): FaqIndexEntry[] {
  const seen = new Set<string>();
  const index: FaqIndexEntry[] = [];
  for (const source of sources) {
    const question = normaliseSearchText(source.question);
    if (seen.has(question)) continue;
    seen.add(question);
    index.push({
      id: source.id,
      question,
      text: `${question} ${normaliseSearchText(source.answer)}`,
    });
  }
  return index;
}

export function searchFaqs(index: FaqIndexEntry[], raw: string): FaqSearchResult {
  const query = raw.trim();
  if (!query) return { state: 'browse' };
  if (query.length < MIN_QUERY_LENGTH) return { state: 'too-short', query };

  const terms = normaliseSearchText(query).split(' ').filter(Boolean);
  const ids = index
    .filter((entry) => terms.every((term) => entry.text.includes(term)))
    .map((entry, order) => ({
      id: entry.id,
      order,
      inQuestion: terms.filter((term) => entry.question.includes(term)).length,
    }))
    .sort((a, b) => b.inQuestion - a.inQuestion || a.order - b.order)
    .map((hit) => hit.id);

  return { state: 'results', query, ids };
}

/** "1 question" / "7 questions" — the topic grid's measured counts. */
export function questionCountLabel(count: number): string {
  return count === 1 ? '1 question' : `${count} questions`;
}

/** The status line over the results. */
export function resultLine(count: number, query: string): string {
  return `${count === 1 ? '1 result' : `${count} results`} for “${query}”`;
}

/** The no-results heading. */
export function noResultsLine(query: string): string {
  return `We couldn’t find anything for “${query}”.`;
}

'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';

import type { ResolvedBlock } from '@/lib/content/deliveryFaqs';
import { CONTACT_HREF } from '@/lib/content/navigation';
import { useMediaQuery } from '@/lib/dom/hooks';
import {
  buildFaqIndex,
  noResultsLine,
  resultLine,
  SEARCH_DEBOUNCE_MS,
  searchFaqs,
} from '@/lib/faq/search';
import { DESKTOP_QUERY } from '@/lib/site-header/visibility';

import { FaqAnswer } from './FaqAnswer';
import { TOPICS_HEADING_ID } from './ids';
import styles from './Faq.module.css';

export interface SearchableFaq {
  id: string;
  question: string;
  /** The answer's plain text, for matching. */
  answerText: string;
  /** The answer itself, for showing in results. */
  answer: ResolvedBlock[];
}

const KEEP_TYPING = 'Keep typing to search.';

/**
 * "Search our FAQs" (#23; build-handoff §3l, behaviour guide §9) — a Client
 * Component for the query it holds. The rules are `lib/faq/search.ts`: empty
 * is browse, one character says "Keep typing", two or more search live
 * (debounced), every term must match, question hits first.
 *
 * Results sit directly under the field, each a question that opens in place
 * with its answer rendered from the same content as the groups. The browse
 * view (`children`: topic grid and groups) is hidden while a query is present
 * and "Still need help?" (`help`) while nothing matches; neither is ever
 * unmounted.
 *
 * Changing the query closes any answer that was open (the list is keyed by
 * the query), and Enter is the only path that moves the page.
 */
export function FaqSearch({
  faqs,
  children,
  help,
}: {
  faqs: SearchableFaq[];
  children: ReactNode;
  help: ReactNode;
}) {
  const index = useMemo(
    () => buildFaqIndex(faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answerText }))),
    [faqs],
  );
  const byId = useMemo(() => new Map(faqs.map((faq) => [faq.id, faq])), [faqs]);

  /** The field's value, undebounced: the clear control follows every keystroke. */
  const [typed, setTyped] = useState('');
  /** The value results are for, debounced. */
  const [query, setQuery] = useState('');
  /** Bumped by Enter: bring the results under the header on a phone. */
  const [bring, setBring] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Set by "Browse all topics" on a phone: focus the topic grid once it is back. */
  const focusTopics = useRef(false);
  const id = useId();
  const inputId = `${id}-search`;

  // A placeholder is an attribute, not CSS: below 640 the long prompt clips
  // mid-word and reads as a broken field.
  const wide = useMediaQuery('(min-width: 640px)');

  const search = searchFaqs(index, query);
  const searching = search.state !== 'browse';
  const results = search.state === 'results' ? search.ids : [];
  const noResults = search.state === 'results' && results.length === 0;

  const announcement =
    search.state === 'too-short'
      ? KEEP_TYPING
      : search.state === 'results'
        ? results.length > 0
          ? resultLine(results.length, search.query)
          : noResultsLine(search.query)
        : '';

  useEffect(() => () => clearTimeout(timer.current), []);

  const onInput = () => {
    const value = inputRef.current?.value ?? '';
    setTyped(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setQuery(value), SEARCH_DEBOUNCE_MS);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearTimeout(timer.current);
    const value = inputRef.current?.value ?? '';
    setTyped(value);
    setQuery(value);
    // Dismisses a phone's keyboard, which would cover the results.
    inputRef.current?.blur();
    const submitted = searchFaqs(index, value);
    // No matches is an answer too: the empty panel sits in the same section.
    if (submitted.state === 'results') setBring((n) => n + 1);
  };

  /**
   * Back to browse. The field's clear control unmounts with the value, so it
   * hands focus back to the field (FR-12) rather than dropping it to <body>.
   * "Browse all topics" disappears with the results too: desktop keeps the
   * field, and on a phone — where the keyboard would cover the topic grid it
   * just brought back — focus goes to the topic grid's heading instead.
   */
  const clear = (from: 'field' | 'browse') => {
    clearTimeout(timer.current);
    if (inputRef.current) inputRef.current.value = '';
    setTyped('');
    setQuery('');
    if (from === 'field' || window.matchMedia(DESKTOP_QUERY).matches) inputRef.current?.focus();
    else focusTopics.current = true;
  };

  // Once browse is back on screen (a hidden heading cannot take focus).
  useEffect(() => {
    if (!focusTopics.current || query) return;
    focusTopics.current = false;
    document.getElementById(TOPICS_HEADING_ID)?.focus();
  }, [query]);

  // Below 1024 the results start under the fold, so Enter could look as
  // though nothing happened: land the results just under the header.
  useEffect(() => {
    if (bring === 0) return;
    const results = resultsRef.current;
    if (!results || window.matchMedia(DESKTOP_QUERY).matches) return;
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const target = results.getBoundingClientRect().top + window.scrollY - (header?.offsetHeight ?? 0) - 14;
    if (Math.abs(target - window.scrollY) < 12) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, target), behavior: reduce ? 'instant' : 'smooth' });
  }, [bring]);

  return (
    <>
      <section className={styles.searchSection}>
        <div className={styles.inner}>
          <h2 className={styles.h2}>Search our FAQs</h2>
          {/* No `name` on the field: a submit before hydration sends nothing anywhere. */}
          <form role="search" className={styles.searchForm} onSubmit={onSubmit}>
            <label htmlFor={inputId} className="visuallyHidden">
              Search the FAQs
            </label>
            <div className={styles.searchField}>
              <svg className={styles.searchIcon} width="19" height="19" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="M15.4 15.4L21 21" />
              </svg>
              <input
                ref={inputRef}
                id={inputId}
                className={styles.searchInput}
                type="text"
                autoComplete="off"
                enterKeyHint="search"
                placeholder={wide ? 'Search FAQs (e.g. delivery, allergens, payment…)' : 'Search FAQs…'}
                onInput={onInput}
              />
              {typed ? (
                <button type="button" className={styles.searchClear} onClick={() => clear('field')} aria-label="Clear search">
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
            </div>
          </form>
          {/* Mounted from the start, so every change is announced. */}
          <p className="visuallyHidden" role="status" aria-live="polite">
            {announcement}
          </p>
        </div>
      </section>

      {searching ? (
        <section ref={resultsRef} className={styles.results} data-end={noResults || undefined}>
          <div className={styles.inner}>
            {search.state === 'results' && results.length > 0 ? (
              <>
                <p className={styles.resultLine}>{resultLine(results.length, search.query)}</p>
                <div key={search.query} className={styles.resultList}>
                  {results.map((resultId) => {
                    const faq = byId.get(resultId);
                    if (!faq) return null;
                    return (
                      <details key={faq.id} className={styles.item}>
                        <summary className={styles.summary}>
                          <span>{faq.question}</span>
                          <span className={styles.chevron} aria-hidden="true" />
                        </summary>
                        <div className={`${styles.answer} ${styles.resultAnswer}`}>
                          <FaqAnswer blocks={faq.answer} />
                        </div>
                      </details>
                    );
                  })}
                </div>
              </>
            ) : null}

            {search.state === 'too-short' ? <p className={styles.keepTyping}>{KEEP_TYPING}</p> : null}

            {noResults ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>{noResultsLine(search.query)}</p>
                <p className={styles.emptyBody}>Try another search, or browse the FAQ topics.</p>
                <div className={styles.emptyActions}>
                  <button type="button" className={styles.darkButton} onClick={() => clear('browse')}>
                    Browse all topics
                  </button>
                  <Link href={CONTACT_HREF} className={styles.outlineCta}>
                    Contact us
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <div hidden={searching}>{children}</div>
      <div hidden={noResults}>{help}</div>
    </>
  );
}

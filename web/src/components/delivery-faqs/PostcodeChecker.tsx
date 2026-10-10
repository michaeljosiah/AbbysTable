'use client';

import Link from 'next/link';
import { useEffect, useId, useReducer, useRef, useState, type FormEvent } from 'react';

import type { NotifyMeAction } from '@/lib/aonik/notifyMe';
import { BOX_HREF } from '@/lib/content/navigation';
import { checkPostcode, locatePostcode, type PostcodeCheck } from '@/lib/delivery/actions';
import {
  checkerReducer,
  INITIAL_CHECKER_STATE,
  type CheckerResult,
} from '@/lib/delivery/checker';
import {
  clearCheckedPostcode,
  sessionStore,
  writeCheckedPostcode,
} from '@/lib/delivery/handoff';
import { POSTCODE_MESSAGES, readPostcodeEntry } from '@/lib/delivery/postcode';
import { formatDeliveryDateLong } from '@/lib/format';
import type { SignupConsent } from '@/lib/signup/consent';
import { DESKTOP_QUERY } from '@/lib/site-header/visibility';

import { NotifyMeForm } from './NotifyMeForm';
import styles from './PostcodeChecker.module.css';

/**
 * The Delivery & FAQs postcode checker (#23) — design/Abby's Table - Delivery
 * and FAQs.dc.html, behaviour guide §9, contract §3b.
 *
 * A Client Component for the conversation it holds: the field's corrections,
 * a request in flight, the answer panel, the location lookup and the hand-off
 * to the box builder. The states and their rules are `lib/delivery/checker.ts`;
 * every one is reachable only through real input — the prototype's
 * development-only state override does not exist here (contract §4b).
 *
 * The page renders it only where a coverage lookup exists (demo's placeholder
 * areas; live, Aonik's — michaeljosiah/aonik#352), so it never answers a
 * question it cannot ask. "We deliver" and "not in your area" come only from
 * that lookup.
 *
 * The postcode never enters a URL: the field has no `name`, so a submit before
 * hydration posts nothing, and the check is a server action with the postcode
 * in its body. BUILD A BOX carries it in this tab's session (`lib/delivery/
 * handoff.ts`), not in the query string the prototype used.
 */
export function PostcodeChecker({
  canLocate,
  notify,
}: {
  /** Show "Use my current location": only where a coordinates lookup exists. */
  canLocate: boolean;
  /**
   * The notify-me action and its list's consent, only where the tenant has
   * published that list (contract §3c; aonik#357).
   */
  notify?: { action: NotifyMeAction; consent: SignupConsent };
}) {
  const [state, dispatch] = useReducer(checkerReducer, INITIAL_CHECKER_STATE);
  const [hasValue, setHasValue] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  /** The one source of request numbers, so a late answer can never land. */
  const counter = useRef(0);
  const id = useId();
  const inputId = `${id}-postcode`;
  const messageId = `${id}-message`;
  const headingId = `${id}-heading`;

  const { busy, message, result } = state;
  const locating = busy === 'locating';
  const invalid = message === 'empty' || message === 'invalid';

  /** Ends any request and drops the panel — only when there is something to drop. */
  const reset = () => {
    if (state.busy || state.message || state.result) {
      dispatch({ type: 'reset', request: ++counter.current });
    }
  };

  const focusField = (select: boolean) => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (select) input.select();
  };

  /** Validates the entry, then asks the coverage lookup. */
  const check = async (raw: string) => {
    const entry = readPostcodeEntry(raw);
    if (!entry.ok) {
      // A correction to make in place, not an outcome: the page holds still.
      // Anything still in flight (a location lookup) is abandoned with it.
      ++counter.current;
      dispatch({ type: 'correct', message: entry.reason });
      focusField(entry.reason === 'invalid');
      return;
    }

    const request = ++counter.current;
    dispatch({ type: 'start', busy: 'checking', request });

    let answer: PostcodeCheck;
    try {
      answer = await checkPostcode(entry.postcode);
    } catch {
      // Offline, or the server could not be reached: could not check.
      answer = { status: 'unavailable' };
    }
    if (answer.status === 'invalid') {
      // No such postcode, which only the lookup can tell: corrected in place,
      // as a malformed one is — the field takes focus with its text selected.
      dispatch({ type: 'correct', message: 'invalid', request });
      if (request === counter.current) focusField(true);
      return;
    }

    const next: CheckerResult =
      answer.status === 'serves'
        ? { kind: 'serves', postcode: answer.postcode, earliestDeliveryDate: answer.earliestDeliveryDate }
        : answer.status === 'not-served'
          ? { kind: 'not-served', postcode: answer.postcode }
          : { kind: 'unavailable' };

    // Only for the request still current — a check the customer has moved on
    // from must not change what is carried either.
    if (request !== counter.current) return;
    if (next.kind === 'serves') writeCheckedPostcode(sessionStore(), next.postcode);
    if (next.kind === 'not-served') clearCheckedPostcode(sessionStore());
    dispatch({ type: 'answer', request, result: next });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy === 'checking') return;
    void check(inputRef.current?.value ?? '');
  };

  const onInput = () => {
    // Typing is a fresh question: the last answer is no longer about what is
    // in the field, and a correction clears the moment they start fixing it.
    setHasValue(Boolean(inputRef.current?.value.trim()));
    reset();
  };

  const clearField = () => {
    if (inputRef.current) inputRef.current.value = '';
    setHasValue(false);
    reset();
    // The clear control unmounts with the value; focus must not fall to <body>.
    focusField(false);
  };

  /** Change postcode / Check another postcode: the old value selected, ready to type over. */
  const changePostcode = () => {
    reset();
    focusField(true);
  };

  /**
   * Try again: the same entry, asked again. The failure panel goes while it is
   * asked, so focus moves to Check first rather than falling to <body> — not
   * to the field, which would open a phone's keyboard over the answer.
   */
  const retry = () => {
    checkRef.current?.focus();
    void check(inputRef.current?.value ?? '');
  };

  /**
   * "Use my current location" — only ever on this explicit request, never on
   * load. The browser's own permission prompt decides; a refusal, a timeout,
   * no position or no postcode there all say the same thing beside the field.
   * Focus stays on this control throughout (its label changes in place).
   */
  const locate = () => {
    if (locating) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      // A check still in flight is abandoned too: it must not land, nor write
      // or clear the postcode carried to Build a Box.
      ++counter.current;
      dispatch({ type: 'correct', message: 'location' });
      return;
    }
    const request = ++counter.current;
    dispatch({ type: 'start', busy: 'locating', request });

    // Like the success path: a lookup the customer has moved on from says nothing.
    const failed = () => {
      if (request === counter.current) dispatch({ type: 'correct', message: 'location', request });
    };
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (request !== counter.current) return;
        let postcode: string | null = null;
        try {
          postcode = await locatePostcode(position.coords.latitude, position.coords.longitude);
        } catch {
          postcode = null;
        }
        if (request !== counter.current) return;
        if (!postcode) {
          failed();
          return;
        }
        if (inputRef.current) inputRef.current.value = postcode;
        setHasValue(true);
        void check(postcode);
      },
      failed,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    );
  };

  // After a genuine outcome on a phone, bring the panel into view under the
  // header: below 1024 it lands under the fold and the customer would see
  // nothing change. Never for a correction (those do not bump `revision`).
  useEffect(() => {
    if (state.revision === 0) return;
    const panel = resultRef.current;
    if (!panel || window.matchMedia(DESKTOP_QUERY).matches) return;
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const target = panel.getBoundingClientRect().top + window.scrollY - (header?.offsetHeight ?? 0) - 14;
    if (target - window.scrollY < 12) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, target), behavior: reduce ? 'instant' : 'smooth' });
  }, [state.revision]);

  const earliest =
    result?.kind === 'serves' ? formatDeliveryDateLong(result.earliestDeliveryDate) : null;

  return (
    <>
      <section className={styles.section} aria-labelledby={headingId}>
        <div className={styles.inner}>
          <div className={styles.panel}>
            <div className={styles.grid}>
              <div>
                <h2 id={headingId} className={styles.title}>
                  Check delivery to your postcode
                </h2>
                <p className={styles.intro}>
                  Enter your postcode to see if we deliver to your area and view the next available
                  delivery date.{' '}
                  <strong>Meal delivery is currently available to mainland UK addresses only.</strong>
                </p>
              </div>

              <div>
                {/* Stacked on a phone, one pill from 640. */}
                <form className={styles.form} onSubmit={onSubmit} noValidate aria-busy={busy === 'checking' || undefined}>
                  <label htmlFor={inputId} className="visuallyHidden">
                    Postcode
                  </label>
                  <span className={styles.fieldWrap}>
                    <input
                      ref={inputRef}
                      id={inputId}
                      className={styles.input}
                      type="text"
                      autoComplete="postal-code"
                      autoCapitalize="characters"
                      spellCheck={false}
                      enterKeyHint="go"
                      maxLength={32}
                      placeholder="e.g. DA1 2AB"
                      aria-describedby={messageId}
                      aria-invalid={invalid || undefined}
                      onInput={onInput}
                    />
                    {hasValue ? (
                      <button
                        type="button"
                        className={styles.clear}
                        onClick={clearField}
                        aria-label="Clear postcode"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    ) : null}
                  </span>
                  <button
                    ref={checkRef}
                    type="submit"
                    className={styles.check}
                    data-busy={busy === 'checking' || undefined}
                  >
                    Check
                  </button>
                </form>

                {/* Corrections live beside the field, never in a result panel. */}
                <p id={messageId} className={styles.message} role="status" aria-live="polite">
                  {message ? (
                    <span className={styles.messageInner}>
                      <svg className={styles.messageIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
                        <path d="M12 3.5l8.5 16h-17z" />
                        <path d="M12 10v4M12 16.8h.01" />
                      </svg>
                      <span>{POSTCODE_MESSAGES[message]}</span>
                    </span>
                  ) : null}
                </p>

                {canLocate ? (
                  <>
                    <button
                      type="button"
                      className={styles.locate}
                      onClick={locate}
                      aria-disabled={locating || undefined}
                      data-locating={locating || undefined}
                    >
                      {locating ? (
                        <>
                          <span className={styles.spinner} aria-hidden="true" />
                          <span>Finding your location…</span>
                        </>
                      ) : (
                        <>
                          <svg className={styles.locateIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                            <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                          <span className={styles.locateLabel}>Use my current location</span>
                        </>
                      )}
                    </button>
                    {/* A label change on the focused control is not reliably
                        announced; this is. */}
                    <span className="visuallyHidden" role="status" aria-live="polite">
                      {locating ? 'Finding your location…' : ''}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* One result region, three outcomes, announced as they arrive. */}
      <div role="region" aria-live="polite" aria-label="Delivery result">
        {result?.kind === 'serves' ? (
          <section ref={resultRef} className={styles.resultSection}>
            <div className={styles.inner}>
              <div className={styles.result} data-tone="serves">
                <div className={styles.resultGrid}>
                  <div>
                    <div className={styles.resultHead}>
                      <span className={styles.disc} data-tone="serves" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                          <path d="M5 12.5l4.5 4.5L19 7" />
                        </svg>
                      </span>
                      <h3 className={styles.resultTitle}>Great — we deliver to {result.postcode}</h3>
                    </div>
                    {/* No date is a designed state (DeliveryWindow): the lines go, nothing is guessed. */}
                    {earliest ? (
                      <>
                        <p className={styles.eyebrow}>Earliest delivery</p>
                        <p className={styles.date}>{earliest}</p>
                        <p className={styles.note}>
                          We take a limited number of orders for each cooking run, so we can give
                          every dish the care it deserves. The delivery date shown reflects our next
                          available cooking run.
                        </p>
                      </>
                    ) : null}
                  </div>
                  <div className={styles.side} data-tone="serves">
                    {/* Terracotta at 52px by the owner's decision (design/CLAUDE.md
                        "Fill colour by role") — do not "correct" it to green. */}
                    <Link
                      href={BOX_HREF}
                      className={styles.build}
                      onClick={() => writeCheckedPostcode(sessionStore(), result.postcode)}
                    >
                      Build a Box
                    </Link>
                    <button type="button" className={styles.textAction} onClick={changePostcode}>
                      <span>Change postcode</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {result?.kind === 'not-served' ? (
          <section ref={resultRef} className={styles.resultSection}>
            <div className={styles.inner}>
              <div className={styles.result} data-tone="not-served">
                <div className={styles.resultGrid}>
                  <div>
                    <div className={styles.resultHead}>
                      <span className={styles.disc} data-tone="not-served" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                          <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                      </span>
                      <h3 className={styles.resultTitle}>We’re not in your area yet</h3>
                    </div>
                    <p className={styles.body}>
                      We don’t currently deliver to <strong>{result.postcode}</strong>.
                    </p>
                    <p className={styles.note}>
                      We’re gradually expanding our delivery area. You can try another postcode.
                    </p>
                  </div>
                  {/* No Build a Box: there is nothing to order into. */}
                  <div className={styles.side} data-tone="not-served">
                    <button type="button" className={styles.darkButton} onClick={changePostcode}>
                      Check another postcode
                    </button>
                  </div>
                </div>

                {notify ? (
                  <NotifyMeForm action={notify.action} consent={notify.consent} postcode={result.postcode} />
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* A technical failure, not a delivery outcome: neutral wording, the
            entry kept, and the only action is to retry. */}
        {result?.kind === 'unavailable' ? (
          <section ref={resultRef} className={styles.resultSection}>
            <div className={styles.inner}>
              <div className={styles.failure}>
                <span className={styles.failureDisc} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" focusable="false">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7.5v5.5M12 16.5h.01" />
                  </svg>
                </span>
                <div className={styles.failureText}>
                  <p className={styles.failureTitle}>We couldn’t check that postcode just now.</p>
                  <p className={styles.failureBody}>Please try again in a moment.</p>
                </div>
                <button
                  type="button"
                  className={`${styles.darkButton} ${styles.retry}`}
                  onClick={retry}
                >
                  Try again
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

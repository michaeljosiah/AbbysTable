'use client';

import Link from 'next/link';
import { useEffect, useId, useReducer, useRef, useState, type FormEvent } from 'react';

import { DELIVERY_FAQS_HREF } from '@/lib/content/navigation';
import { checkPostcode, type PostcodeCheck } from '@/lib/delivery/actions';
import { checkerReducer, INITIAL_CHECKER_STATE, type CheckerResult } from '@/lib/delivery/checker';
import { clearCheckedPostcode, readCheckedPostcode, sessionStore, writeCheckedPostcode } from '@/lib/delivery/handoff';
import { POSTCODE_MESSAGES, readPostcodeEntry } from '@/lib/delivery/postcode';

import styles from './BoxPostcodeCheck.module.css';

/**
 * Step 1's delivery check (Choose Box v2, `.dv-band`): "Check delivery to your
 * postcode". Compact, but the SAME answer as Delivery & FAQs: the rules are
 * `lib/delivery/*` (`checkerReducer`, `checkPostcode`, the hand-off) — never a
 * second copy of them — so the two pages cannot disagree about where we
 * deliver. A result is only ever the coverage lookup's answer, and the page
 * renders this only where a lookup exists (`AonikClient.coverage`).
 *
 * A postcode already checked on Delivery & FAQs arrives through the session
 * hand-off into the empty field and is checked again. The postcode is never
 * put in a URL, and a "we deliver" answer is handed on to checkout the same
 * way.
 */
export function BoxPostcodeCheck() {
  const [state, dispatch] = useReducer(checkerReducer, INITIAL_CHECKER_STATE);
  const inputRef = useRef<HTMLInputElement>(null);
  const counter = useRef(0);
  const [value, setValue] = useState('');
  const id = useId();
  const messageId = `${id}-message`;

  const { busy, message, result } = state;

  const check = async (raw: string) => {
    const entry = readPostcodeEntry(raw);
    if (!entry.ok) {
      ++counter.current;
      dispatch({ type: 'correct', message: entry.reason });
      inputRef.current?.focus();
      return;
    }
    const request = ++counter.current;
    dispatch({ type: 'start', busy: 'checking', request });

    let answer: PostcodeCheck;
    try {
      answer = await checkPostcode(entry.postcode);
    } catch {
      answer = { status: 'unavailable' };
    }
    if (request !== counter.current) return;
    if (answer.status === 'invalid') {
      dispatch({ type: 'correct', message: 'invalid', request });
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }
    const next: CheckerResult =
      answer.status === 'serves'
        ? { kind: 'serves', postcode: answer.postcode, earliestDeliveryDate: answer.earliestDeliveryDate }
        : answer.status === 'not-served'
          ? { kind: 'not-served', postcode: answer.postcode }
          : { kind: 'unavailable' };
    if (next.kind === 'serves') writeCheckedPostcode(sessionStore(), next.postcode);
    if (next.kind === 'not-served') clearCheckedPostcode(sessionStore());
    dispatch({ type: 'answer', request, result: next });
  };

  // A postcode checked elsewhere in this tab arrives in the empty field, and is checked again.
  const checkRef = useRef(check);
  checkRef.current = check;
  useEffect(() => {
    const carried = readCheckedPostcode(sessionStore());
    if (!carried || inputRef.current?.value) return;
    setValue(carried);
    void checkRef.current(carried);
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy === 'checking') return;
    void check(value);
  };

  const onChange = (next: string) => {
    setValue(next);
    // Typing is a fresh question: the last answer is no longer about the field.
    if (state.busy || state.message || state.result) dispatch({ type: 'reset', request: ++counter.current });
  };

  const tone = result?.kind === 'serves' ? 'yes' : result?.kind === 'not-served' || message === 'empty' || message === 'invalid' ? 'no' : undefined;
  const line =
    message === 'empty' || message === 'invalid'
      ? POSTCODE_MESSAGES[message]
      : result?.kind === 'serves'
        ? `✓ We deliver to ${result.postcode}.`
        : result?.kind === 'not-served'
          ? `We don’t currently deliver to ${result.postcode}, but we’re gradually expanding. `
          : result?.kind === 'unavailable'
            ? 'We couldn’t check that postcode just now. Please try again in a moment.'
            : busy === 'checking'
              ? 'Checking…'
              : null;

  return (
    <div className={styles.band}>
      <div className={styles.in}>
        <div className={styles.panel}>
          <div className={styles.row}>
            <form className={styles.form} onSubmit={onSubmit} noValidate>
              <span className={styles.lead}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brass-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.6" />
                </svg>
                <label htmlFor={`${id}-pc`}>Check delivery to your postcode</label>
              </span>
              <span className={styles.field}>
                <input
                  ref={inputRef}
                  id={`${id}-pc`}
                  className={styles.input}
                  name="postcode"
                  type="text"
                  autoComplete="postal-code"
                  placeholder="e.g. DA1 2AB"
                  value={value}
                  aria-invalid={message === 'empty' || message === 'invalid' ? true : undefined}
                  aria-describedby={line ? messageId : undefined}
                  onChange={(event) => onChange(event.target.value)}
                />
                {/* Sentence case, as drawn: a named exception to the uppercase buttons. */}
                <button type="submit" className={styles.button} aria-disabled={busy === 'checking' || undefined}>
                  Check
                </button>
              </span>
            </form>
            <span className={styles.rule} aria-hidden="true" />
            <p className={styles.note}>
              Meal delivery is available to <strong>mainland UK addresses only.</strong>
            </p>
          </div>
          {line ? (
            <p className={styles.message} id={messageId} data-tone={tone} role="status" aria-live="polite">
              {line}
              {result?.kind === 'not-served' ? (
                <>
                  See <Link href={DELIVERY_FAQS_HREF}>Delivery &amp; FAQs</Link> for our latest delivery areas.
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

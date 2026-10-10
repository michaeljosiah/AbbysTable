'use client';

import Link from 'next/link';
import { useActionState, useId, useState } from 'react';

import type { NotifyMeAction, NotifyMeState } from '@/lib/aonik/notifyMe';
import { PRIVACY_ITEM } from '@/lib/content/navigation';
import { CONSENT_VERSION_FIELD, type SignupConsent } from '@/lib/signup/consent';

import styles from './PostcodeChecker.module.css';

/**
 * "Want to know when we reach your area?" — the not-in-area panel's notify-me
 * capture (contract §3c): the email and the CHECKED postcode, to a list of its
 * own, never the newsletter.
 *
 * Rendered only when the tenant has published that list in Aonik (its
 * `delivery-availability` sign-up list, michaeljosiah/aonik#357) — never in
 * demo mode, the newsletter's precedent (#6). Its consent line is the list's
 * published wording, exactly, and the post carries that wording's version.
 * It thanks the customer only for `status: 'joined'`.
 *
 * Posts through `useActionState`, so a submit before hydration is still a POST
 * to the server action — the email never lands in a URL.
 */
export function NotifyMeForm({
  action,
  consent,
  postcode,
}: {
  action: NotifyMeAction;
  consent: SignupConsent;
  postcode: string;
}) {
  const [state, formAction, isPending] = useActionState<NotifyMeState, FormData>(action, {
    status: 'idle',
  });
  const id = useId();
  const inputId = `${id}-email`;
  const errorId = `${id}-error`;
  const failed = state.status === 'error';
  // Controlled: a resolved form action resets uncontrolled fields, which would
  // blank the address beside its own error and make the customer type it again.
  const [email, setEmail] = useState('');

  return (
    <div className={styles.notify}>
      <div className={styles.notifyHead}>
        <span className={styles.disc} data-tone="not-served" aria-hidden="true">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 8l9 6 9-6" />
          </svg>
        </span>
        <div>
          <p className={styles.notifyTitle}>Want to know when we reach your area?</p>
          <p className={styles.notifyLede}>
            Leave your email and we’ll let you know when delivery becomes available.
          </p>
        </div>
      </div>

      {state.status === 'joined' ? (
        <p className={styles.notifyThanks} role="status">
          Thank you — we’ll be in touch when we reach you.
        </p>
      ) : (
        <div>
          <form className={styles.form} action={formAction} aria-busy={isPending || undefined}>
            <label htmlFor={inputId} className="visuallyHidden">
              Email address
            </label>
            <input
              id={inputId}
              className={`${styles.input} ${styles.notifyInput}`}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Your email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={failed || undefined}
              aria-describedby={failed ? errorId : undefined}
            />
            {/* The checked postcode is why the record is worth keeping. */}
            <input type="hidden" name="postcode" value={postcode} />
            {/* The wording shown below, by version — what the sign-up agrees to. */}
            <input type="hidden" name={CONSENT_VERSION_FIELD} value={consent.version} />
            <button type="submit" className={styles.check} disabled={isPending}>
              Let me know
            </button>
          </form>
          {failed ? (
            <p id={errorId} className={styles.message} role="alert">
              <span className={styles.messageInner}>
                {state.message ?? 'We couldn’t save your email just now. Please try again.'}
              </span>
            </p>
          ) : null}
          {/* The design's line is "We’ll only use your email to tell you when
              we reach your area. See our Privacy Policy." — its first sentence
              is the list's published wording. */}
          <p className={styles.consent}>
            {consent.text} See our{' '}
            <Link href={PRIVACY_ITEM.href} className={styles.consentLink}>
              {PRIVACY_ITEM.label}
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

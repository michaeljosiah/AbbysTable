'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, type FormEvent } from 'react';

import { requestPasswordResetAction, type AuthActionState } from '@/lib/auth/actions';
import { emailProblem } from '@/lib/auth/messages';
import { CONTACT_HREF } from '@/lib/content/navigation';

import { FieldError } from './FieldError';
import styles from './AuthForm.module.css';

/**
 * Forgot your password? Asks Aonik to email a reset link.
 *
 * The confirmation is the same for every address: Aonik answers 2xx whether or
 * not the email has an account, and this page must not hint either way. The
 * reset itself happens on the identity provider's hosted page.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  /** The client's own message; `''` once the customer edits, which hides a server one too. */
  const [local, setLocal] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    requestPasswordResetAction,
    { status: 'idle' },
  );
  const emailRef = useRef<HTMLInputElement>(null);
  const sentRef = useRef<HTMLHeadingElement>(null);

  const emailError = (local ?? state.fieldErrors?.email) || undefined;

  useEffect(() => {
    if (state.status === 'sent') sentRef.current?.focus();
    else if (state.status === 'error') emailRef.current?.focus();
  }, [state]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const problem = emailProblem(email.trim());
    if (!problem) {
      setLocal(null);
      return;
    }
    event.preventDefault();
    setLocal(problem);
    emailRef.current?.focus();
  };

  if (state.status === 'sent') {
    return (
      <div className={styles.sent} role="status">
        <h2 className={styles.sentTitle} ref={sentRef} tabIndex={-1}>
          Check your email
        </h2>
        <p className={styles.sentBody}>
          If there’s an account for <strong>{state.email}</strong>, we’ve sent a link to choose a new
          password. It can take a few minutes to arrive, so check your junk folder too.
        </p>
        <p className={styles.sentBody}>
          Nothing there? <Link href={CONTACT_HREF}>Contact us</Link> and we’ll help.
        </p>
        <div className={styles.foot}>
          <Link href="/login" className={styles.link}>
            <span>Back to log in</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} action={formAction} onSubmit={onSubmit} noValidate>
      <div>
        <label className={styles.label} htmlFor="forgot-email">
          Email address
        </label>
        <input
          ref={emailRef}
          id="forgot-email"
          className={styles.field}
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setLocal('');
          }}
          aria-invalid={emailError ? 'true' : undefined}
          aria-describedby={emailError ? 'forgot-email-error' : undefined}
        />
        {emailError ? <FieldError id="forgot-email-error">{emailError}</FieldError> : null}
      </div>

      {state.status === 'error' && state.message ? (
        <FieldError role="alert">{state.message}</FieldError>
      ) : null}

      {state.status === 'unavailable' ? (
        <p className={styles.notice} role="status">
          <span>
            <strong>Password reset isn’t available yet.</strong> Nothing was sent.{' '}
            <Link href={CONTACT_HREF}>Contact us</Link> and we’ll help you back in.
          </span>
        </p>
      ) : null}

      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? 'Sending…' : 'Send reset link'}
      </button>

      <div className={styles.foot}>
        <Link href="/login" className={styles.link}>
          <span>Back to log in</span>
        </Link>
      </div>
    </form>
  );
}

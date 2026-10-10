'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, type FormEvent } from 'react';

import { loginAction, type AuthActionState } from '@/lib/auth/actions';
import { LOGIN_MESSAGES, emailProblem } from '@/lib/auth/messages';
import { FORGOT_PASSWORD_HREF } from '@/lib/content/navigation';

import { FieldError } from './FieldError';
import styles from './AuthForm.module.css';

/** Eye / eye-off glyphs for the password reveal. */
function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12s3.6-6.5 9-6.5 9 6.5 9 6.5-3.6 6.5-9 6.5S3 12 3 12z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M4 20 20 4" /> : null}
    </svg>
  );
}

type FieldErrors = NonNullable<AuthActionState['fieldErrors']>;

/**
 * Log in (design: Log in v2).
 *
 * Submits to a SERVER ACTION, which keeps the password out of the browser's
 * world: it is posted same-origin, exchanged for a token on our server, and
 * never touches client JavaScript or an Aonik call from here. Without
 * JavaScript the form still posts; the server's answer is the one that decides.
 *
 * Validation also runs here, on submit, for the design's instant feedback and
 * focus move. The email is controlled so a refused attempt keeps it (React 19
 * clears an uncontrolled field after an action); the password is not kept.
 */
export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [local, setLocal] = useState<FieldErrors | null>(null);
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(loginAction, {
    status: 'idle',
  });
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // The server's field errors win until the customer edits that field.
  const errors: FieldErrors = local ?? state.fieldErrors ?? {};

  // A refused attempt: the password was not kept, so the cursor goes back to it
  // (or to the email when that is what was wrong).
  useEffect(() => {
    if (state.status !== 'error') return;
    if (state.fieldErrors?.email) emailRef.current?.focus();
    else passwordRef.current?.focus();
  }, [state]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const found: FieldErrors = {};
    const emailError = emailProblem(email.trim());
    if (emailError) found.email = emailError;
    if (!passwordRef.current?.value) found.password = LOGIN_MESSAGES.passwordMissing;
    if (!found.email && !found.password) {
      setLocal(null);
      return;
    }
    event.preventDefault();
    setLocal(found);
    (found.email ? emailRef.current : passwordRef.current)?.focus();
  };

  const clear = (field: keyof FieldErrors) => {
    if (!errors[field]) return;
    setLocal({ ...errors, [field]: undefined });
  };

  return (
    <form className={styles.form} action={formAction} onSubmit={onSubmit} noValidate>
      <input type="hidden" name="next" value={next ?? ''} />

      <div>
        <label className={styles.label} htmlFor="login-email">
          Email address
        </label>
        <input
          ref={emailRef}
          id="login-email"
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
            clear('email');
          }}
          aria-invalid={errors.email ? 'true' : undefined}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
        />
        {errors.email ? <FieldError id="login-email-error">{errors.email}</FieldError> : null}
      </div>

      <div>
        <label className={styles.label} htmlFor="login-password">
          Password
        </label>
        <div className={styles.passwordWrap}>
          <input
            ref={passwordRef}
            id="login-password"
            className={styles.field}
            name="password"
            type={revealed ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            onChange={() => clear('password')}
            aria-invalid={errors.password ? 'true' : undefined}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
          />
          {/* aria-pressed carries the state; the label says what the control
              will DO, so it is never read as a description of what is shown. */}
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setRevealed((current) => !current)}
            aria-pressed={revealed}
            aria-controls="login-password"
            aria-label={revealed ? 'Hide password' : 'Show password'}
          >
            <EyeIcon off={revealed} />
          </button>
        </div>
        {errors.password ? <FieldError id="login-password-error">{errors.password}</FieldError> : null}
      </div>

      <div className={styles.forgot}>
        <Link href={FORGOT_PASSWORD_HREF} className={styles.link}>
          <span>Forgot your password?</span>
        </Link>
      </div>

      {state.status === 'error' && state.message ? (
        <FieldError role="alert">{state.message}</FieldError>
      ) : null}

      {state.status === 'unavailable' ? (
        <p className={styles.notice} role="status">
          <svg
            className={styles.noticeGlyph}
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4.5" />
            <path d="M12 16h.01" />
          </svg>
          <span>
            <strong>Log in isn’t available yet.</strong> Nothing was sent. Your box carries on without an
            account.
          </span>
        </p>
      ) : null}

      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? 'Logging you in…' : 'Log in'}
      </button>
    </form>
  );
}

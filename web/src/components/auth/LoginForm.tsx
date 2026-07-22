'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { GoogleMark } from './GoogleMark';
import styles from './AuthForm.module.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Eye / eye-off glyphs for the password toggle. */
function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M4 20 20 4" /> : null}
    </svg>
  );
}

/**
 * Sign-in form. There is no account service yet, so a valid submission lands
 * on an honest notice rather than pretending to start a session — the handler
 * is shaped for the real call to slot in.
 */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [status, setStatus] = useState<'idle' | 'pending' | 'notice'>('idle');
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    },
    [],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus('pending');
    pendingTimer.current = setTimeout(() => setStatus('notice'), 900);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.heading}>Sign in</h1>
      <p className={styles.sub}>Your boxes, personalisations and deliveries, all in one place.</p>

      <button type="button" className={styles.google} onClick={() => setStatus('notice')}>
        <GoogleMark />
        Continue with Google
      </button>

      <div className={styles.switchRow} aria-hidden="true">
        <span className={styles.switchRule} />
        <span className={styles.switchLabel}>or continue with email</span>
        <span className={styles.switchRule} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="login-email">
          Email address
        </label>
        <div className={styles.inputWrap}>
          <input
            id="login-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
          />
        </div>
        {errors.email ? (
          <p className={styles.error} id="login-email-error">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label className={styles.label} htmlFor="login-password">
            Password
          </label>
          <Link href="/#contact" className={styles.quietLink}>
            Forgotten it?
          </Link>
        </div>
        <div className={styles.inputWrap}>
          <input
            id="login-password"
            className={`${styles.input} ${styles.inputWithToggle}`}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? 'true' : undefined}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
          />
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            <EyeIcon off={showPassword} />
          </button>
        </div>
        {errors.password ? (
          <p className={styles.error} id="login-password-error">
            {errors.password}
          </p>
        ) : null}
      </div>

      <div className={styles.betweenRow}>
        <button
          type="button"
          className={styles.check}
          onClick={() => setRemember((current) => !current)}
          aria-pressed={remember}
        >
          <span className={styles.checkBox} aria-hidden="true">
            {remember ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : null}
          </span>
          Keep me signed in
        </button>
      </div>

      {status === 'notice' ? (
        <div className={styles.notice} role="status">
          <span className={styles.noticeIcon} aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4.5" />
              <path d="M12 16h.01" />
            </svg>
          </span>
          <span>
            <span className={styles.noticeTitle}>Online accounts are nearly ready</span>
            <span className={styles.noticeSub}>
              Nothing was sent — sign-in opens with our next release. Your box carries on
              without an account.
            </span>
          </span>
        </div>
      ) : null}

      <button type="submit" className={styles.submit} disabled={status === 'pending'}>
        {status === 'pending' ? 'Signing you in…' : 'Sign in'}
        {status !== 'pending' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="12" x2="19" y2="12" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        ) : null}
      </button>

      <div className={styles.switchRow} aria-hidden="true">
        <span className={styles.switchRule} />
        <span className={styles.switchLabel}>New to Abby&apos;s Table?</span>
        <span className={styles.switchRule} />
      </div>
      <Link href="/register" className={styles.switchLink}>
        Create your account
      </Link>
    </form>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { GoogleMark } from './GoogleMark';
import styles from './AuthForm.module.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

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
 * Registration form. Accounts aren't live yet — a valid submission lands on
 * the same honest notice as sign-in, with the handler shaped for the real
 * call to slot in.
 */
export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
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
    if (!name.trim()) next.name = 'Tell us your first name.';
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < PASSWORD_MIN) next.password = `Use at least ${PASSWORD_MIN} characters.`;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus('pending');
    pendingTimer.current = setTimeout(() => setStatus('notice'), 900);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.heading}>Create your account</h1>
      <p className={styles.sub}>
        Save your boxes, personalisations and delivery details for next time.
      </p>

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
        <label className={styles.label} htmlFor="register-name">
          First name
        </label>
        <div className={styles.inputWrap}>
          <input
            id="register-name"
            className={styles.input}
            type="text"
            autoComplete="given-name"
            placeholder="Your first name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={errors.name ? 'true' : undefined}
            aria-describedby={errors.name ? 'register-name-error' : undefined}
          />
        </div>
        {errors.name ? (
          <p className={styles.error} id="register-name-error">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="register-email">
          Email address
        </label>
        <div className={styles.inputWrap}>
          <input
            id="register-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
          />
        </div>
        {errors.email ? (
          <p className={styles.error} id="register-email-error">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="register-password">
          Choose a password
        </label>
        <div className={styles.inputWrap}>
          <input
            id="register-password"
            className={`${styles.input} ${styles.inputWithToggle}`}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? 'true' : undefined}
            aria-describedby={errors.password ? 'register-password-error' : 'register-password-hint'}
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
          <p className={styles.error} id="register-password-error">
            {errors.password}
          </p>
        ) : (
          <p className={styles.hint} id="register-password-hint">
            At least 8 characters — a short phrase works well.
          </p>
        )}
      </div>

      <div className={styles.betweenRow}>
        <button
          type="button"
          className={styles.check}
          onClick={() => setOptIn((current) => !current)}
          aria-pressed={optIn}
        >
          <span className={styles.checkBox} aria-hidden="true">
            {optIn ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : null}
          </span>
          Send me new menus and seasonal offers
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
              Nothing was sent — registration opens with our next release. Your box carries on
              without an account.
            </span>
          </span>
        </div>
      ) : null}

      <button type="submit" className={styles.submit} disabled={status === 'pending'}>
        {status === 'pending' ? 'Setting your place…' : 'Create your account'}
        {status !== 'pending' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="12" x2="19" y2="12" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        ) : null}
      </button>

      <div className={styles.switchRow} aria-hidden="true">
        <span className={styles.switchRule} />
        <span className={styles.switchLabel}>Already have a place?</span>
        <span className={styles.switchRule} />
      </div>
      <Link href="/login" className={styles.switchLink}>
        Sign in instead
      </Link>
    </form>
  );
}

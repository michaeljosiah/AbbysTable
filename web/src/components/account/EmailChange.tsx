'use client';
import { useEffect, useState, useRef } from 'react';
import { loginPathFor } from '@/lib/auth/redirect';
import a from './Account.module.css';
export function EmailChange() {
  const [state, setState] = useState('loading'),
    busy = useRef(false);
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      'token',
    );
    if (!token) {
      setState('ready');
      return;
    }
    history.replaceState(null, '', window.location.pathname);
    void fetch('/api/account/email-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => setState(r.ok ? 'ready' : 'failed'))
      .catch(() => setState('failed'));
  }, []);
  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setState('loading');
    try {
      const r = await fetch('/api/account/email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const answer = await r.json();
      setState(answer.state ?? 'failed');
    } catch {
      setState('failed');
    } finally {
      busy.current = false;
    }
  }
  return (
    <section className={a.card} aria-labelledby="email-change-h">
      <h1 className={a.h2} id="email-change-h">
        Confirm your email address
      </h1>
      <p className={a.p}>
        Sign in with your current account before confirming your new email
        address.
      </p>
      {state === 'complete' ? (
        <p className={a.ok} role="status">
          Your email address has been changed. Sign in again with your new
          address.
        </p>
      ) : (
        <>
          <a
            className={a.textLink}
            href={loginPathFor('/account/email-change')}
          >
            Sign in again →
          </a>
          <button
            className={a.submit}
            type="button"
            disabled={state === 'loading'}
            onClick={() => void confirm()}
          >
            {state === 'loading' ? 'Please wait…' : 'Confirm new email'}
          </button>
        </>
      )}
      <p className={a.problem} role="status">
        {state === 'failed' || state === 'gone'
          ? 'This link could not be confirmed. It may have expired, or you may need to sign in again. You can request a new change in My Account.'
          : state === 'sign-in'
            ? 'Please sign in again, then return here to confirm.'
            : ''}
      </p>
      {state === 'complete' ? (
        <a href={loginPathFor('/account/details')} className={a.pill}>
          Log in
        </a>
      ) : null}
    </section>
  );
}

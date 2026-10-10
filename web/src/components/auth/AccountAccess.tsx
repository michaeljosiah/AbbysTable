'use client';

import { useEffect, useRef, useState } from 'react';

import { StatusMessage } from '@/components/status/StatusMessage';
import { resendAccessLinkAction, resolveAccessLinkAction } from '@/lib/auth/accessActions';
import { ACCESS_COPY } from '@/lib/content/accountAccess';
import { CONTACT_HREF } from '@/lib/content/navigation';

import styles from './AccountAccess.module.css';

type View = 'checking' | 'gone' | 'ready' | 'unavailable' | 'failed';

/**
 * Where an emailed secure link lands (design: Link Expired).
 *
 * Aonik puts the token in the URL FRAGMENT, which the browser never sends
 * anywhere, so this is the only place it can be read. It is taken out of the
 * address bar at once (`history.replaceState`, so it is not in a screenshot,
 * a shared tab or the history entry) and kept in a ref: never state that is
 * rendered, never a prop, never a URL, never storage.
 *
 * ONE generic page for every emailed link, expired or already used alike, and
 * for a visit with no token at all: it never says which, and never confirms an
 * address or an account.
 */
export function AccountAccess() {
  const [view, setView] = useState<View>('checking');
  const [sent, setSent] = useState<'idle' | 'sending' | 'sent' | 'unavailable' | 'failed'>('idle');
  const token = useRef<string>('');
  const sentRef = useRef<HTMLParagraphElement>(null);

  const check = () => {
    setView('checking');
    void resolveAccessLinkAction(token.current).then(setView, () => setView('failed'));
  };

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    // Strict mode runs this effect twice in development, and the second pass finds
    // the fragment already stripped: it must keep the token the first one took.
    token.current = hash.get('token') || token.current;
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search,
      );
    }
    if (!token.current) {
      setView('gone');
      return;
    }
    check();
    // Read once, on arrival.
  }, []);

  useEffect(() => {
    if (sent === 'sent') sentRef.current?.focus();
  }, [sent]);

  const resend = () => {
    if (sent === 'sending') return;
    setSent('sending');
    void resendAccessLinkAction(token.current).then(
      (outcome) => setSent(outcome === 'requested' ? 'sent' : outcome),
      () => setSent('failed'),
    );
  };

  if (view === 'checking') {
    return (
      <StatusMessage
        kind="notFound"
        mark="link"
        eyebrow={ACCESS_COPY.eyebrow}
        title={ACCESS_COPY.checking}
        lede=""
      >
        <p className="visuallyHidden" role="status">
          {ACCESS_COPY.checking}
        </p>
      </StatusMessage>
    );
  }

  if (view === 'ready') {
    return (
      <StatusMessage
        kind="notFound"
        mark="link"
        eyebrow={ACCESS_COPY.eyebrow}
        title={ACCESS_COPY.ready.heading}
        lede={ACCESS_COPY.ready.lede}
        primary={{ label: ACCESS_COPY.ready.contact, href: CONTACT_HREF }}
        secondary={{ label: ACCESS_COPY.login, href: '/login' }}
      />
    );
  }

  if (view === 'failed' || view === 'unavailable') {
    return (
      <StatusMessage
        kind="notFound"
        mark="link"
        eyebrow={ACCESS_COPY.eyebrow}
        title={view === 'failed' ? ACCESS_COPY.failed.heading : ACCESS_COPY.unavailable.heading}
        lede={view === 'failed' ? ACCESS_COPY.failed.lede : ACCESS_COPY.unavailable.lede}
        primary={view === 'failed' ? { label: ACCESS_COPY.failed.retry, onClick: check } : undefined}
        secondary={{ label: ACCESS_COPY.login, href: '/login' }}
      />
    );
  }

  // 'gone': the design's page.
  return (
    <StatusMessage
      kind="notFound"
      mark="link"
      eyebrow={ACCESS_COPY.eyebrow}
      title={ACCESS_COPY.gone.heading}
      lede={ACCESS_COPY.gone.lede}
      primary={sent === 'sent' ? undefined : { label: ACCESS_COPY.gone.send, onClick: resend }}
      secondary={{ label: ACCESS_COPY.login, href: '/login' }}
      inPlace={
        <>
          {sent === 'sent' ? (
            <div className={styles.sent} role="status">
              <p className={styles.sentHeading} ref={sentRef} tabIndex={-1}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                <span>{ACCESS_COPY.gone.sentHeading}</span>
              </p>
              <p className={styles.sentBody}>{ACCESS_COPY.gone.sentBody}</p>
            </div>
          ) : null}
          {sent === 'failed' || sent === 'unavailable' ? (
            <p className={styles.problem} role="alert">
              {sent === 'failed' ? ACCESS_COPY.gone.sendFailed : ACCESS_COPY.gone.sendUnavailable}
            </p>
          ) : null}
        </>
      }
    />
  );
}

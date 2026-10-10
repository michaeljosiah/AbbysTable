'use client';

import { useState } from 'react';

import { sendPasswordResetLinkAction } from '@/lib/account/detailsActions';
import { DETAILS_COPY, DETAILS_MESSAGES } from '@/lib/account/detailsForm';
import { loginPathFor } from '@/lib/auth/redirect';

import styles from './Account.module.css';

/**
 * "Password": no password is typed or handled here. The button asks Aonik to
 * email a reset link to the address it holds for this session, and the reset
 * happens on the identity provider's own page. "Link sent" is said only once
 * Aonik has taken the request.
 */
export function PasswordCard() {
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ kind: 'ok' | 'problem'; text: string } | null>(null);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setSaid(null);
    try {
      const result = await sendPasswordResetLinkAction();
      if (result.status === 'ended') window.location.assign(loginPathFor('/account/details'));
      else if (result.status === 'sent') setSaid({ kind: 'ok', text: DETAILS_MESSAGES.resetSent(result.email) });
      else setSaid({ kind: 'problem', text: result.message });
    } catch {
      setSaid({ kind: 'problem', text: DETAILS_MESSAGES.resetFailed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${styles.card} ${styles.stack}`}>
      <h3 className={styles.cardTitle}>Password</h3>
      <p className={styles.p}>{DETAILS_COPY.passwordLead}</p>
      <button type="button" className={`${styles.pill} ${styles.pillOutline}`} onClick={send} disabled={busy}>
        {busy ? 'Sending…' : 'Send reset link'}
      </button>
      <div role="status" aria-live="polite">
        {said ? (
          <p className={said.kind === 'ok' ? styles.ok : styles.problem}>
            <span>{said.text}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

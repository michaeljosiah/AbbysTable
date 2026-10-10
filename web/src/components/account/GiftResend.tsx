'use client';
import { useState, useRef } from 'react';
import { resendGiftCardAction } from '@/lib/account/benefitsActions';
import styles from './Account.module.css';
export function GiftResend({ id }: { id: string }) {
  const [busy, setBusy] = useState(false),
    [said, setSaid] = useState('');
  const inFlight = useRef(false);
  async function resend() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      setSaid(await resendGiftCardAction(id));
    } catch {
      setSaid('Please reload this page and try again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.act}
          disabled={busy}
          onClick={() => void resend()}
        >
          {busy ? 'Requesting resend…' : 'Resend email'}
        </button>
      </div>
      <div role="status" aria-live="polite">
        {said ? (
          <p className={styles.ok} style={{ marginTop: 10 }}>
            {said}
          </p>
        ) : null}
      </div>
    </>
  );
}

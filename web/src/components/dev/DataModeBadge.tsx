'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { DataMode, DataModeResolution } from '@/lib/aonik/dataMode';

import styles from './DataModeBadge.module.css';

/**
 * The floating dev indicator: which dataset the page you're looking at was
 * built from, and a one-click switch.
 *
 * Rendered only in development (its parent decides), and it holds no secrets —
 * it receives the already-resolved mode as a prop. Switching posts to the
 * dev-only route handler, which owns the cookie, then refreshes so the Server
 * Components re-resolve and re-fetch.
 */
export function DataModeBadge({ resolution }: { resolution: DataModeResolution }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const { mode, source, unavailableReason } = resolution;
  const next: DataMode = mode === 'demo' ? 'live' : 'demo';

  const switchTo = async () => {
    setBusy(true);
    try {
      await fetch('/api/dev/data-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: next }),
      });
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  // A fallback means live was asked for and can't be served — offering "switch
  // to live" again would just bounce back, so the button explains instead.
  const blocked = source === 'fallback';

  // Why this mode, in a tooltip. The `dev-default` line matters most: without
  // it, a developer whose .env.local points at a real Aonik has no way to tell
  // "demo on purpose" from "my configuration is being ignored".
  const explanation =
    source === 'dev-default'
      ? 'Development defaults to demo data so a dev server never touches a real tenant. ' +
        'Switch here, or set AONIK_DATA_MODE=live.'
      : source === 'dev-override'
        ? 'Set by the switch on this browser, overriding configuration.'
        : source === 'fallback'
          ? `Live was asked for but cannot be served: ${unavailableReason}.`
          : 'Set by AONIK_DATA_MODE.';

  return (
    <div className={styles.badge} role="status" aria-live="polite" title={explanation}>
      <span className={styles.dot} data-mode={mode} aria-hidden="true" />
      <span className={styles.label}>{mode === 'demo' ? 'Demo data' : 'Live Aonik'}</span>

      {blocked ? (
        <span className={styles.reason} title={`Live unavailable: ${unavailableReason}`}>
          live needs {unavailableReason}
        </span>
      ) : (
        <button
          type="button"
          className={styles.switch}
          onClick={switchTo}
          disabled={busy || isPending}
        >
          {busy || isPending ? 'switching…' : `use ${next}`}
        </button>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

import {
  msUntilNextMinute,
  OPEN_STATUS_LABELS,
  openStatus,
  type OpenStatus,
  type OpeningHours,
} from '@/lib/contact/hours';

/**
 * "Open now" / "Closed" — computed in the BROWSER, from the configured hours
 * in Europe/London time (`@/lib/contact/hours`), never on the server: the page
 * is static, and a status baked in at build time would be wrong by the next
 * hour. It re-checks as each minute turns and when a backgrounded tab comes
 * back (timers are throttled there), so a page left open never goes stale.
 *
 * Renders nothing until it has computed — and therefore nothing without
 * JavaScript, and nothing when no hours are configured: no status is better
 * than a guessed one. The words carry the state; colour never does alone.
 */
export function OpenNow({
  hours,
  className,
  dotClassName,
}: {
  hours: OpeningHours;
  className?: string;
  dotClassName?: string;
}) {
  const [status, setStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      clearTimeout(timer);
      const now = new Date();
      setStatus(openStatus(hours, now));
      timer = setTimeout(check, msUntilNextMinute(now));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hours]);

  if (!status) return null;

  return (
    <span className={className} data-open={status === 'open' ? 'true' : undefined}>
      <span className={dotClassName} aria-hidden="true" />
      <span>{OPEN_STATUS_LABELS[status]}</span>
    </span>
  );
}

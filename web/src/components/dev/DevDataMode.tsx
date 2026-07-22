import { resolveDataMode } from '@/lib/aonik/dataMode';

import { DataModeBadge } from './DataModeBadge';

/**
 * Server-side gate for the dev data-mode badge.
 *
 * Returns null in production before touching anything else, so the badge and
 * its resolution never reach a customer build. Mounted once in the root layout.
 */
export async function DevDataMode() {
  if (process.env.NODE_ENV === 'production') return null;

  const resolution = await resolveDataMode();
  return <DataModeBadge resolution={resolution} />;
}

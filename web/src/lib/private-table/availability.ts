/**
 * Whether the Private Table waitlist can really take a name in this request:
 * the data source has a waitlist to store to (`AonikClient.waitlist`). None
 * does until michaeljosiah/aonik#357 — in EITHER data mode, since demo never
 * pretends a write succeeded — so today this is false everywhere, and the
 * Private Table page renders no form, no "Join the waitlist" and no mobile
 * bar, and Contact no Private Table panel.
 *
 * Never throws: a failure to resolve the client answers "closed", which only
 * ever hides a control — never shows one that cannot work.
 *
 * SERVER-ONLY: reads the data mode.
 */

import { getAonikClient } from '@/lib/aonik/client';

export async function waitlistOpen(): Promise<boolean> {
  try {
    return (await getAonikClient()).waitlist !== null;
  } catch (error) {
    console.error('[private-table] Aonik unavailable; the waitlist is shown as not open', error);
    return false;
  }
}

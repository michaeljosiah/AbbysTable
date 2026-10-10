/**
 * Whether the Private Table waitlist can really take a name in this request:
 * the tenant has published its `private-table` sign-up list in Aonik
 * (michaeljosiah/aonik#357), and that list offers every service the form
 * does. None does in demo mode, which never pretends a write succeeded; with
 * none, the Private Table page renders no form, no "Join the waitlist" and no
 * mobile bar, and Contact no Private Table panel.
 *
 * The form's three services (`WAITLIST_SERVICES`) are its own copy, with the
 * design's notes, so the published list must carry all three ids: Aonik
 * refuses a service its list does not offer, and a card whose "Join the
 * waitlist" preselects one would otherwise end in a refusal.
 *
 * Never throws: a failure answers "closed", which only ever hides a control —
 * never shows one that cannot work.
 *
 * SERVER-ONLY: reads the data mode.
 */

import { getAonikClient, type AonikClient } from '@/lib/aonik/client';
import type { SignupList } from '@/lib/aonik/signupLists';
import { WAITLIST_SERVICES } from '@/lib/content/privateTable';
import { publishedSignupList } from '@/lib/signup/server';

/** The published waitlist, or null while it cannot take a name. */
export async function waitlistList(
  client: () => Promise<Pick<AonikClient, 'signupLists'>> = getAonikClient,
): Promise<SignupList | null> {
  const list = await publishedSignupList('private-table', client);
  if (!list) return null;

  const offered = new Set(list.services?.map((service) => service.id));
  const missing = WAITLIST_SERVICES.filter((service) => !offered.has(service.id));
  if (missing.length > 0) {
    console.error(
      `[private-table] the published waitlist does not offer ${missing.map((service) => service.id).join(', ')}; the waitlist is shown as not open`,
    );
    return null;
  }
  return list;
}

export async function waitlistOpen(
  client: () => Promise<Pick<AonikClient, 'signupLists'>> = getAonikClient,
): Promise<boolean> {
  return (await waitlistList(client)) !== null;
}

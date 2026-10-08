/**
 * What the Private Table waitlist's server action does with a post (#25).
 *
 * A public POST endpoint, so it re-runs the form's own rules on what actually
 * arrived — every field capped, the email checked in linear time, the country
 * resolved against the fixed list and the service against the fixed three —
 * before anything is stored anywhere. It answers `joined` only after the
 * waitlist has stored the entry (a 2xx from Aonik); every other path is
 * `invalid`, `unavailable` or `error`, and the form confirms `joined` alone
 * (contract in `./waitlist`).
 *
 * While Aonik has no waitlist (michaeljosiah/aonik#357) the page does not
 * render the form, and the action — reachable by anyone who posts to it —
 * answers `unavailable` without storing.
 *
 * Takes the client as a parameter so the outcomes are unit-tested with a
 * stand-in list (tests/private-table.test.tsx). SERVER-ONLY.
 */

import { getAonikClient, type AonikClient } from '@/lib/aonik/client';

import { draftFromForm, returnedDraft, toWaitlistEntry, type WaitlistState } from './waitlist';

export async function joinWaitlist(
  form: FormData,
  client: () => Promise<Pick<AonikClient, 'waitlist'>> = getAonikClient,
): Promise<WaitlistState> {
  const draft = draftFromForm(form);
  // Handed back on every answer but `joined`, so a no-JavaScript round trip
  // keeps what was entered (the form keeps it itself when scripted).
  const values = returnedDraft(draft);
  const result = toWaitlistEntry(draft);
  if ('errors' in result) return { status: 'invalid', errors: result.errors, values };

  try {
    const { waitlist } = await client();
    if (!waitlist) return { status: 'unavailable', values };
    await waitlist.join(result.entry);
    return { status: 'joined' };
  } catch (error) {
    // Never surface the failure's own text: it can carry internals. The form
    // says the customer was not added and keeps everything entered.
    console.error('[private-table] waitlist entry not stored', error);
    return { status: 'error', values };
  }
}

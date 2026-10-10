/**
 * What the Private Table waitlist's server action does with a post (#25).
 *
 * A public POST endpoint, so it re-runs the form's own rules on what actually
 * arrived — every field capped, the email checked in linear time, the country
 * resolved against the fixed list and the service against the fixed three —
 * before anything is stored anywhere. It answers `joined` only after Aonik's
 * `private-table` sign-up list (michaeljosiah/aonik#357) has stored the entry
 * (its 202); every other path is `invalid`, `changed`, `unavailable` or
 * `error`, and the form confirms `joined` alone (contract in `./waitlist`).
 *
 * The post carries the consent version the form showed; Aonik refuses (422) a
 * version that has since changed, which is `changed` here — as is a post with
 * no version at all. Where there is no list (demo) it answers `unavailable`
 * without storing. Each address may join a few times in a few minutes
 * (`@/lib/signup/rateLimit`), then `limited`.
 *
 * Takes the client as a parameter so the outcomes are unit-tested with a
 * stand-in list (tests/private-table.test.tsx). SERVER-ONLY.
 */

import { getAonikClient, type AonikClient } from '@/lib/aonik/client';
import { readConsentVersion } from '@/lib/aonik/signupLists';
import { admitSignup } from '@/lib/signup/rateLimit';
import { isSignupRefused } from '@/lib/signup/server';

import {
  draftFromForm,
  returnedDraft,
  toWaitlistEntry,
  WAITLIST_FORM_FIELDS,
  type WaitlistEntry,
  type WaitlistState,
} from './waitlist';

/** Aonik's `private-table` sign-up body. The phone only when given. */
export function toWaitlistBody(entry: WaitlistEntry, consentVersion: string): Record<string, string> {
  return {
    email: entry.email,
    consentVersion,
    name: entry.name,
    ...(entry.phone ? { phone: entry.phone } : {}),
    country: entry.country,
    service: entry.service,
  };
}

export async function joinWaitlist(
  form: FormData,
  client: () => Promise<Pick<AonikClient, 'signupLists'>> = getAonikClient,
): Promise<WaitlistState> {
  const draft = draftFromForm(form);
  // Handed back on every answer but `joined`, so a no-JavaScript round trip
  // keeps what was entered (the form keeps it itself when scripted).
  const values = returnedDraft(draft);
  const result = toWaitlistEntry(draft);
  if ('errors' in result) return { status: 'invalid', errors: result.errors, values };

  // The wording the customer saw. Without it nothing can say what they agreed to.
  const consentVersion = readConsentVersion(form.get(WAITLIST_FORM_FIELDS.consentVersion));
  if (!consentVersion) return { status: 'changed', values };
  if (!(await admitSignup('private-table'))) return { status: 'limited', values };

  try {
    const { signupLists } = await client();
    if (!signupLists) return { status: 'unavailable', values };
    await signupLists.join('private-table', toWaitlistBody(result.entry, consentVersion));
    return { status: 'joined' };
  } catch (error) {
    if (isSignupRefused(error)) {
      console.warn('[private-table] waitlist entry refused: the list changed since the page was rendered');
      return { status: 'changed', values };
    }
    // Never surface the failure's own text: it can carry internals. The form
    // says the customer was not added and keeps everything entered.
    console.error('[private-table] waitlist entry not stored', error);
    return { status: 'error', values };
  }
}

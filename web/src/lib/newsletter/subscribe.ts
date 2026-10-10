/**
 * What the footer's "Join the table" action does with a post: the email and
 * the consent version the form showed, to Aonik's `newsletter` sign-up list
 * (michaeljosiah/aonik#357). Separate from notify-me and the Private Table
 * waitlist, always — each form's wording promises one use.
 *
 * Answers `joined` only after Aonik's 202 (a repeat of an email already on the
 * list looks the same, by design). A 422 after the email passed here is the
 * list changing under the page — withdrawn, or new wording — and asks for a
 * reload, never a retry.
 *
 * Takes the client as a parameter so the outcomes are unit-tested with a
 * stand-in list (tests/signup-lists.test.tsx). SERVER-ONLY.
 */

import { getAonikClient, type AonikClient } from '@/lib/aonik/client';
import { readConsentVersion } from '@/lib/aonik/signupLists';
import { isEmailAddress } from '@/lib/email';
import { CONSENT_VERSION_FIELD, SIGNUP_FORM_CHANGED } from '@/lib/signup/consent';
import { isSignupRefused } from '@/lib/signup/server';

import { NEWSLETTER_EMAIL_FIELD, type NewsletterSignupState } from '@/lib/newsletter';

export const NEWSLETTER_MESSAGES = {
  email: 'Please enter a valid email address.',
  unavailable: 'We can’t add you from this page yet.',
} as const;

export async function subscribeNewsletter(
  form: FormData,
  client: () => Promise<Pick<AonikClient, 'signupLists'>> = getAonikClient,
): Promise<NewsletterSignupState> {
  const raw = form.get(NEWSLETTER_EMAIL_FIELD);
  const email = typeof raw === 'string' ? raw.trim() : '';
  if (!isEmailAddress(email)) return { status: 'error', message: NEWSLETTER_MESSAGES.email };

  // The wording the customer saw. Without it nothing can say what they agreed to.
  const consentVersion = readConsentVersion(form.get(CONSENT_VERSION_FIELD));
  if (!consentVersion) return { status: 'error', message: SIGNUP_FORM_CHANGED };

  try {
    const { signupLists } = await client();
    if (!signupLists) return { status: 'error', message: NEWSLETTER_MESSAGES.unavailable };
    await signupLists.join('newsletter', { email, consentVersion });
    return { status: 'joined' };
  } catch (error) {
    if (isSignupRefused(error)) {
      console.warn('[newsletter] sign-up refused: the list changed since the page was rendered');
      return { status: 'error', message: SIGNUP_FORM_CHANGED };
    }
    // Never surface the failure's own text: it can carry internals. The
    // footer's own line says the customer was not added.
    console.error('[newsletter] sign-up not stored', error);
    return { status: 'error' };
  }
}

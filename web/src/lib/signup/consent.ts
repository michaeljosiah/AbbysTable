/**
 * What a sign-up form shows and posts for its list's consent (Aonik's sign-up
 * lists, michaeljosiah/aonik#357) — free of the server, so the forms import it.
 *
 * Each of the three forms (the footer newsletter, Delivery & FAQs' notify-me,
 * the Private Table waitlist) renders only while the tenant has PUBLISHED its
 * list, shows the list's consent wording exactly, and posts back the version
 * of that wording it showed. Aonik records the version as the consent given
 * and refuses one that has since changed — so nobody is signed up to wording
 * they never saw.
 */

export interface SignupConsent {
  /** The tenant's published wording, shown exactly: it is what is recorded. */
  text: string;
  /** Posted back with the sign-up, in `CONSENT_VERSION_FIELD`. */
  version: string;
}

/** The form field that carries the version shown. */
export const CONSENT_VERSION_FIELD = 'consentVersion';

/**
 * Not in the design: Aonik refused the sign-up because the list's wording
 * changed (or the list was withdrawn) after this page was rendered. Nothing
 * was stored, and only a fresh page can show the current wording.
 */
export const SIGNUP_FORM_CHANGED =
  'This form has changed since you opened it, so you haven’t been added. Please reload the page and try again.';

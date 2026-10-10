/**
 * The contract between the footer's "Join the table" signup and its server
 * action (`./actions`), which stores a subscription in Aonik's `newsletter`
 * sign-up list (michaeljosiah/aonik#357).
 *
 * The action RETURNS its outcome rather than throwing, as the auth actions do:
 * a thrown error reaches the client as an opaque digest. The footer thanks the
 * customer only for `status: 'joined'`, so an action that swallows a failure
 * and returns nothing cannot type-check its way into a false "Thank you".
 *
 * The action is a public POST endpoint: it must validate the email itself.
 */
export interface NewsletterSignupState {
  status: 'idle' | 'joined' | 'error';
  /** Shown inline on error. */
  message?: string;
}

export type NewsletterSignupAction = (
  previous: NewsletterSignupState,
  formData: FormData,
) => Promise<NewsletterSignupState>;

/**
 * Where the footer reads the published list's consent (`GET`): `{ consent }`
 * while the tenant has published its newsletter list, 404 otherwise.
 */
export const NEWSLETTER_CONSENT_PATH = '/api/newsletter';

/** The email field's name, shared by the form and the action. */
export const NEWSLETTER_EMAIL_FIELD = 'email';

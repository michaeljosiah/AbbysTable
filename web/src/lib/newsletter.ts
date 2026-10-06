/**
 * The contract between the footer's "Join the table" signup and the server
 * action that will one day store a subscription (michaeljosiah/aonik#357).
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

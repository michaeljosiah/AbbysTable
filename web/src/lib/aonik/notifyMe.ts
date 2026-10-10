/**
 * Notify-me capture — frontend-backend-contract §3c. Offered only in the
 * Delivery & FAQs checker's not-in-area state.
 *
 * It needs the email AND the checked postcode: the postcode is why the record
 * is worth keeping, so coverage demand can be measured by area. The consent
 * wording on the page ("only to tell you when we reach your area") makes this
 * a list of its own, SEPARATE from the newsletter, and it must never be merged
 * into it.
 *
 * Stored in Aonik's `delivery-availability` sign-up list (michaeljosiah/aonik
 * #357, `@/lib/aonik/signupLists`), which the page offers only while the
 * tenant has published it — never in demo mode, the footer newsletter's
 * precedent (#6): a form that thanks someone for leaving their email while
 * saving nothing is a live-looking control that does nothing.
 */

/**
 * The form's contract with its server action, shaped like the newsletter's
 * (`@/lib/newsletter`): the action RETURNS its outcome, and the form thanks
 * the customer only for `status: 'joined'`, so an action that swallows a
 * failure cannot type-check its way into a false "Thank you".
 */
export interface NotifyMeState {
  status: 'idle' | 'joined' | 'error';
  /** Shown inline on error. */
  message?: string;
}

export type NotifyMeAction = (
  previous: NotifyMeState,
  formData: FormData,
) => Promise<NotifyMeState>;

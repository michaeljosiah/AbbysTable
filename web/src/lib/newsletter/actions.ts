'use server';

/**
 * The footer newsletter's server action — `subscribeNewsletter`, with this
 * deployment's Aonik client. The rules and the outcome contract are in
 * `./subscribe` and `@/lib/newsletter`.
 */

import type { NewsletterSignupState } from '@/lib/newsletter';
import { subscribeNewsletter } from './subscribe';

export async function subscribeNewsletterAction(
  _previous: NewsletterSignupState,
  form: FormData,
): Promise<NewsletterSignupState> {
  return subscribeNewsletter(form);
}

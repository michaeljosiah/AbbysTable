/**
 * What /delivery-and-faqs reads from Aonik, each piece OPTIONAL to the page
 * (the How it works pattern, `lib/how-it-works/pageData.ts`): an information
 * page must not become a 500 because Aonik is slow or failing.
 *
 *   - the storefront config: the box plan's minimum and six-dish price, and
 *     the delivery charge, for the FAQ answers that quote them — a question
 *     whose figure is missing is left out (`resolveFaqGroups`);
 *   - whether a coverage lookup exists: the checker renders only then, and
 *     "Use my current location" only where it can place a postcode;
 *   - the published notify-me list (Aonik's `delivery-availability` sign-up
 *     list, aonik#357): the not-in-area panel's form, with its consent
 *     wording — read only where there is a checker to reach that panel.
 *
 * Takes the client as a parameter so the rules are unit-tested with
 * stand-ins (tests/delivery-faqs.test.tsx).
 */

import type { AonikClient } from '@/lib/aonik/client';
import { faqValues, type FaqValues } from '@/lib/content/deliveryFaqs';
import { purchaseBarOffer } from '@/lib/purchase-bar/offer';
import type { SignupConsent } from '@/lib/signup/consent';
import { consentOf, publishedSignupList } from '@/lib/signup/server';

export interface DeliveryFaqsPageData {
  /** The figures the FAQ answers quote. */
  values: FaqValues;
  /** Null: no coverage lookup, so no checker (contract §3b; aonik#352). */
  checker: { canLocate: boolean } | null;
  /**
   * The notify-me list's consent, when the not-in-area panel may offer it
   * (contract §3c; aonik#357). Null: no form.
   */
  notify: SignupConsent | null;
}

export type DeliveryFaqsLog = (message: string, error?: unknown) => void;

const defaultLog: DeliveryFaqsLog = (message, error) => {
  console.error(`[delivery-and-faqs] ${message}`, error ?? '');
};

export async function resolveDeliveryFaqsData(
  client: Pick<AonikClient, 'getStorefrontConfig' | 'coverage' | 'signupLists'>,
  log: DeliveryFaqsLog = defaultLog,
): Promise<DeliveryFaqsPageData> {
  // Never throws (`publishedSignupList`); read alongside the config.
  const notifyList = client.coverage
    ? publishedSignupList('delivery-availability', async () => client)
    : Promise.resolve(null);

  let values = faqValues({});
  try {
    const config = await client.getStorefrontConfig();
    const offer = purchaseBarOffer(config.box);
    values = faqValues({
      minDishes: offer?.minDishes,
      fromPence: offer?.fromPence,
      deliveryChargePence: config.delivery?.chargedPence,
    });
  } catch (error) {
    log('storefront config unavailable; the answers that quote a price are left out', error);
  }

  return {
    values,
    checker: client.coverage ? { canLocate: typeof client.coverage.postcodeAt === 'function' } : null,
    notify: await notifyList.then((list) => (list ? consentOf(list) : null)),
  };
}

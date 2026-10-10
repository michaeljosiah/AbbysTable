/**
 * The limits on the live postcode lookup (#23).
 *
 * Aonik allows 30 coverage checks a minute per tenant and address — a budget
 * it shares with checkout itself (the checkout POST, its recovery and payment
 * state) — and the address it sees is the storefront's, not the customer's (it
 * reads only the hop its ingress appends; see `@/lib/request/clientAddress`).
 * So every customer's checks and every checkout draw on one allowance. Two
 * limits keep the checker from spending it:
 *
 *  - per customer: 10 checks a minute from one address (an IPv6 host by its
 *    /64), a customer's pace;
 *  - per site: 20 checks a minute in all, below Aonik's 30, so however many
 *    addresses a script uses, the checker can never use checkout's share.
 *
 * A check past either is "could not check", with its retry. Per server
 * process: several instances multiply both. The real fix is Aonik's — a policy
 * of its own for checkout, or trusting the storefront's hop — and is a go-live
 * step (docs/specifications/delivery-and-faqs.md FR-02).
 *
 * Only the LIVE lookup is limited (`HttpCoverageLookup`): demo asks nobody.
 *
 * SERVER-ONLY.
 */

import { clientAddress } from '@/lib/request/clientAddress';
import { addressKey, AttemptLimiter } from '@/lib/request/rateLimit';

/** Checks from one address… */
export const COVERAGE_CHECKS = 10;
/** …and from everyone, below Aonik's 30… */
export const SITE_COVERAGE_CHECKS = 20;
/** …within this window. */
export const COVERAGE_WINDOW_MS = 60 * 1000;

const perAddress = new AttemptLimiter(COVERAGE_CHECKS, COVERAGE_WINDOW_MS);
const perSite = new AttemptLimiter(SITE_COVERAGE_CHECKS, COVERAGE_WINDOW_MS);

/** Forgets every check (tests, and nothing else). */
export function clearCoverageChecks(): void {
  perAddress.clear();
  perSite.clear();
}

/**
 * Records a check and answers whether it may go to Aonik: within this
 * address's pace (no address: no per-address limit) and the site's.
 */
export async function admitCoverageCheck(now = Date.now()): Promise<boolean> {
  const address = await clientAddress();
  if (address && !perAddress.admit(addressKey(address), now)) return false;
  return perSite.admit('site', now);
}

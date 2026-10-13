/**
 * The limits on the live postcode lookup (#23).
 *
 * Aonik now gives delivery lookups, checkout/recovery and payment status their
 * own tenant/IP budgets. The BFF still aggregates clients behind its address,
 * so retain the conservative per-customer (10/minute) and per-process (20/minute)
 * coverage limits. Several storefront instances multiply the process allowance;
 * tune the independent API policies against measured traffic before launch.
 *
 * Only the LIVE lookup is limited (`HttpCoverageLookup`): demo asks nobody.
 *
 * SERVER-ONLY.
 */

import { clientAddress } from '@/lib/request/clientAddress';
import { addressKey, AttemptLimiter } from '@/lib/request/rateLimit';

/** Checks from one address… */
export const COVERAGE_CHECKS = 10;
/** …and from everyone, below the default delivery budget of 30… */
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

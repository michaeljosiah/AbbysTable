/**
 * A per-address limit on the postcode checker (#23).
 *
 * Aonik limits coverage checks to 30 a minute per tenant and address, a budget
 * it shares with checkout's own reads — but it sees the storefront's address,
 * not the customer's (it reads only the hop its ingress appends; see
 * `@/lib/request/clientAddress`). Without a limit of ours, one script posting
 * the checker's public action could use up that budget for every customer all
 * day. This keeps each address to a customer's pace; a check past it is
 * "could not check", with its retry.
 *
 * SERVER-ONLY.
 */

import { clientAddress } from '@/lib/request/clientAddress';
import { AttemptLimiter } from '@/lib/request/rateLimit';

/** Checks from one address… */
export const COVERAGE_CHECKS = 10;
/** …within this window. */
export const COVERAGE_WINDOW_MS = 60 * 1000;

const limiter = new AttemptLimiter(COVERAGE_CHECKS, COVERAGE_WINDOW_MS);

/** Forgets every check (tests, and nothing else). */
export function clearCoverageChecks(): void {
  limiter.clear();
}

/** Records a check and answers whether it may go to the lookup. No address: no limit. */
export async function admitCoverageCheck(now = Date.now()): Promise<boolean> {
  const address = await clientAddress();
  return address ? limiter.admit(address, now) : true;
}

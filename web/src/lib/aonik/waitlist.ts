/**
 * The Private Table waitlist (#25) — where "Join the waitlist" stores a name.
 *
 * NOTHING CAN STORE ONE YET (michaeljosiah/aonik#357, the sign-up lists the
 * notify-me capture also waits on). Until it ships `WAITLIST_PATH` is `null`,
 * `AonikClient.waitlist` is null in BOTH data modes, and the Private Table
 * page offers no form and no "Join the waitlist" — the newsletter's precedent
 * (#6): a form that says "you're on the waitlist" while saving nothing is a
 * live-looking control that does nothing, and demo mode does not get to
 * pretend a WRITE succeeded any more than it places orders. A production
 * deployment with no Aonik configured runs on demo data, so a demo "joined"
 * would reach real customers.
 *
 * It is a list of its own: the form's consent line ("We'll only use your
 * details to contact you about Private Table") rules out the newsletter, and
 * the Privacy Policy's lawful basis for it is consent (build-handoff, Privacy
 * Policy) — so it must never be merged into either other list.
 *
 * When aonik#357 ships:
 *  1. set `WAITLIST_PATH` to its path — the page then offers the form, every
 *     "Join the waitlist" and the mobile bar, in live mode, with no other change;
 *  2. reconcile `toWaitlistBody` with its real field names — the ones here are
 *     a PROPOSAL (`name`, `email`, `phone?`, `country` as ISO 3166-1 alpha-2,
 *     `service`), not a shipped DTO;
 *  3. confirm it refuses what the form refuses (lengths, the country and
 *     service lists), de-duplicates a second sign-up with the same email, and
 *     has abuse protection with no visible puzzle.
 *
 * SERVER-ONLY.
 */

import type { WaitlistEntry } from '@/lib/private-table/waitlist';

import type { AonikConfig } from './dataMode';
import { aonikFetch } from './http';

/**
 * The Aonik path that stores a waitlist entry, or `null` while there is none
 * (aonik#357). The ONE switch.
 */
export const WAITLIST_PATH: string | null = null;

export interface Waitlist {
  /** Resolves once stored; throws when it could not be. */
  join(entry: WaitlistEntry): Promise<void>;
}

/** The JSON body, in the proposed field names. The phone only when given. */
export function toWaitlistBody(entry: WaitlistEntry): Record<string, string> {
  return {
    name: entry.name,
    email: entry.email,
    ...(entry.phone ? { phone: entry.phone } : {}),
    country: entry.country,
    service: entry.service,
  };
}

/**
 * The waitlist over Aonik. `join` resolves only when Aonik answered 2xx —
 * that answer is the acceptance the page's "you're on the waitlist" rests on;
 * anything else throws (`AonikError`, or the network's own error). Never
 * cached, never retried: a retry could store the entry twice.
 */
export class HttpWaitlist implements Waitlist {
  constructor(
    private readonly path: string,
    private readonly config: AonikConfig,
  ) {}

  async join(entry: WaitlistEntry): Promise<void> {
    await aonikFetch<void>(this.path, {
      baseUrl: this.config.baseUrl,
      tenantId: this.config.tenantId,
      policy: 'volatile',
      method: 'POST',
      body: toWaitlistBody(entry),
      // The 2xx is the acceptance; an empty 200/201 must not read as a
      // failure and invite a second, duplicate sign-up.
      ignoreBody: true,
    });
  }
}

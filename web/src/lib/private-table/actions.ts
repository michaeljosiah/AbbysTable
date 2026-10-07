'use server';

/**
 * The Private Table waitlist form's server action (#25) — `joinWaitlist`, with
 * this deployment's Aonik client. The rules and the outcome contract are in
 * `./join` and `./waitlist`.
 */

import { joinWaitlist } from './join';
import type { WaitlistState } from './waitlist';

export async function joinWaitlistAction(
  _previous: WaitlistState,
  form: FormData,
): Promise<WaitlistState> {
  return joinWaitlist(form);
}

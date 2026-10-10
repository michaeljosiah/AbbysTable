'use server';

/**
 * The secure-link page's server actions. The token arrives from the page's own
 * script (it lives in the URL fragment, which no server ever sees) and goes
 * straight on to Aonik; it is never logged or echoed back.
 */

import { clientAddress } from '@/lib/request/clientAddress';
import { addressKey } from '@/lib/request/rateLimit';

import {
  checkByAddress,
  resendAccessLink,
  resendByAddress,
  resolveAccessLink,
  type AccessLinkOutcome,
} from './accountAccess';

export async function resolveAccessLinkAction(token: string): Promise<AccessLinkOutcome> {
  const address = await clientAddress();
  if (address && !checkByAddress.admit(addressKey(address))) return 'failed';
  return resolveAccessLink(token, address ?? undefined);
}

export type ResendAccessLinkState = 'requested' | 'unavailable' | 'failed';

export async function resendAccessLinkAction(token: string): Promise<ResendAccessLinkState> {
  const address = await clientAddress();
  // Over the limit answers like a success, as Aonik's own throttle does.
  if (address && !resendByAddress.admit(addressKey(address))) return 'requested';
  return resendAccessLink(token, address ?? undefined);
}

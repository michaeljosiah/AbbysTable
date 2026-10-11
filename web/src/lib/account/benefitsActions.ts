'use server';
import { unstable_rethrow } from 'next/navigation';
import { AonikError } from '@/lib/aonik/errors';
import { markLoyaltySeen } from '@/lib/aonik/loyalty';
import { resendMyGiftCard } from '@/lib/aonik/sentGifts';
import { requireSignedIn } from '@/lib/auth/guard';
export async function seePointsMilestone(mark: number): Promise<void> {
  if (!Number.isSafeInteger(mark) || mark < 1) return;
  await requireSignedIn('/account/points');
  try {
    await markLoyaltySeen(mark);
  } catch (error) {
    unstable_rethrow(error);
  }
}
export async function resendGiftCardAction(id: string): Promise<string> {
  await requireSignedIn('/account/gifts');
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return 'We couldn’t resend that gift card. Please reload this page.';
  try {
    await resendMyGiftCard(id);
    return 'Resend requested. Your gift card will be emailed again.';
  } catch (error) {
    unstable_rethrow(error);
    return error instanceof AonikError && error.status === 429
      ? 'Please wait before requesting another resend.'
      : 'We couldn’t request a resend just now. Please try again later.';
  }
}

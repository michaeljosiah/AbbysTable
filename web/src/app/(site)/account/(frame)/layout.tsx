import type { ReactNode } from 'react';

import { AccountShell } from '@/components/account/AccountShell';
import { getMyProfile } from '@/lib/account/profile';
import { readSessionView } from '@/lib/auth/session';
import { getPurchaseBarData } from '@/lib/purchase-bar/data';

/** One customer's pages, from the session cookie: never cached or prerendered. */
export const dynamic = 'force-dynamic';

/**
 * The account area's frame. A signed-out request gets no frame at all: the page
 * inside redirects it to Log in (`requireSignedIn`), and nothing about an
 * account is drawn for a visitor who has none.
 *
 * The greeting needs the customer's first name; a profile that cannot be read
 * costs the name ("Hello"), never the page.
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await readSessionView();
  if (!session.isSignedIn) return children;

  const [profile, purchaseBar] = await Promise.all([
    getMyProfile().catch(() => null),
    getPurchaseBarData(),
  ]);

  return (
    <AccountShell firstName={profile?.firstName} purchaseBar={purchaseBar}>
      {children}
    </AccountShell>
  );
}

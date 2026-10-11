import { loadAccountOrders } from '@/lib/account/loadOrders';
import { getMyLoyaltyBalance } from '@/lib/aonik/loyalty';
import { getMySentGiftCards } from '@/lib/aonik/sentGifts';
import { getMyAddressBook } from '@/lib/aonik/addresses';
import { formatPrice } from '@/lib/format';
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
 * costs the name ("Hello"), never the page. `hero` is the parallel `@hero`
 * route: the overview's Next delivery card, and nothing anywhere else.
 */
export default async function AccountLayout({
  children,
  hero,
}: {
  children: ReactNode;
  hero: ReactNode;
}) {
  const session = await readSessionView();
  if (!session.isSignedIn) return children;

  const [profile, purchaseBar, points, gifts, addresses, orders] =
    await Promise.all([
      getMyProfile().catch(() => null),
      getPurchaseBarData(),
      getMyLoyaltyBalance().catch(() => null),
      getMySentGiftCards(1).catch(() => null),
      getMyAddressBook().catch(() => null),
      loadAccountOrders(1).catch(() => null),
    ]);

  const next = orders?.upcoming
    .filter((o) => o.deliveryDate)
    .sort((a, b) => a.deliveryDate!.localeCompare(b.deliveryDate!))[0];
  const menuMeta = {
    details: profile?.email,
    points: points
      ? `${points.balancePoints.toLocaleString('en-GB')} points · ${formatPrice(points.valuePence)} to spend`
      : undefined,
    gifts: gifts
      ? gifts.totalCount
        ? `${gifts.totalCount} gift cards sent`
        : 'Send and resend gift cards'
      : undefined,
    addresses: addresses
      ? `${addresses.addresses.length} saved address${addresses.addresses.length === 1 ? '' : 'es'}`
      : undefined,
    orders: next
      ? `Next delivery ${new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' }).format(new Date(`${next.deliveryDate}T12:00:00Z`))}`
      : orders?.history.totalCount === 0
        ? 'No deliveries on the way'
        : undefined,
  };
  return (
    <AccountShell
      menuMeta={menuMeta}
      firstName={profile?.firstName}
      purchaseBar={purchaseBar}
      heroAside={hero}
    >
      {children}
    </AccountShell>
  );
}

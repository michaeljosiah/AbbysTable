import type { Metadata } from 'next';

import { PrivateTableView } from '@/components/private-table/PrivateTableView';
import { joinWaitlistAction } from '@/lib/private-table/actions';
import { waitlistList } from '@/lib/private-table/availability';
import { consentOf } from '@/lib/signup/server';

/*
 * Abby's Private Table (#25) — design/Abby's Table - Private Table v2.dc.html
 * (approved); behaviour guide §8; spec docs/specifications/marketing-pages.md
 * (FR-25–FR-29).
 *
 * A WAITLIST, not a booking. The form, every "Join the waitlist" and the
 * mobile bar are given their action only when the waitlist can really store
 * an entry (`waitlistList`: the tenant's published `private-table` sign-up
 * list in Aonik, michaeljosiah/aonik#357 — never in demo mode). Without it the
 * page states the service, its credentials and prices, and says the waitlist
 * is not open yet, rather than thanking anyone for a name that went nowhere
 * (#6's rule). The form shows the list's consent wording and posts its version.
 *
 * On the desktop header auto-hide list, as the design opts Private Table in
 * (build-handoff §3v).
 */

const DESCRIPTION =
  'We develop a collection of Nigerian fusion recipes around your nutritional needs, wherever you are in the world. If you’re in the UK, your approved dishes can also be prepared and delivered to you.';

export const metadata: Metadata = {
  title: "Abby's Private Table — Abby's Table",
  description: DESCRIPTION,
  openGraph: { title: "Abby's Private Table — Abby's Table", description: DESCRIPTION, locale: 'en_GB' },
};

export default async function PrivateTablePage() {
  const list = await waitlistList();
  return (
    <PrivateTableView
      waitlist={list ? { action: joinWaitlistAction, consent: consentOf(list) } : undefined}
    />
  );
}

import type { Metadata } from 'next';

import { AccountAccess } from '@/components/auth/AccountAccess';
import { ACCESS_COPY } from '@/lib/content/accountAccess';

export const metadata: Metadata = {
  title: ACCESS_COPY.title,
  // A secure link is never indexed. (`next.config.mjs` also sends the header.)
  robots: { index: false, follow: false },
};

/**
 * Where Aonik's emailed secure link lands (#34): `/account/access#token=…`.
 * The token is in the fragment, so this page cannot be a server-rendered 410:
 * it is a 200 shell, served `no-store` with no Referer and `noindex`
 * (`next.config.mjs`), and the browser decides what to show.
 */
export default function AccountAccessPage() {
  return <AccountAccess />;
}

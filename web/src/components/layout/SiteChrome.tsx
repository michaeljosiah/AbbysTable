import type { ReactNode } from 'react';

import { readSessionView } from '@/lib/auth/session';
import { subscribeNewsletterAction } from '@/lib/newsletter/actions';

import { Footer } from './Footer';
import { Header } from './Header';

/**
 * Marketing chrome: header (with its drawer), `<main>`, footer — the v2
 * canonical set. There is no announcement strip: the v2 design dropped the
 * promo strip site-wide, and the homepage must never show the earliest
 * delivery date.
 *
 * Rendered by the `(site)` layout, and by the root `app/not-found.tsx` — the
 * page an unmatched URL gets, which sits outside every route group but should
 * still carry the site's header, footer and session state (design: Page Not
 * Found).
 *
 * It awaits NOTHING but the session cookie, and that is load-bearing (pinned
 * by tests/not-found-chrome.test.ts). Next renders the root 404 into EVERY
 * document request, in every route group, not only when a URL is missing — so
 * anything the chrome awaits, every page awaits, and anything that throws here
 * turns a 404 into a 500. Commerce data (Aonik) must never enter it: a page
 * that needs a price or a date resolves it itself.
 */
export async function SiteChrome({ children }: { children: ReactNode }) {
  // Read here, in a Server Component, and handed down: the session cookie is
  // httpOnly and the header is a Client Component. A cookie read only — it
  // cannot block or fail.
  const session = await readSessionView();

  return (
    <>
      <Header session={session} />
      <main>{children}</main>
      {/* The newsletter's published list is read by the footer itself, from
          the browser — never awaited here. */}
      <Footer subscribeAction={subscribeNewsletterAction} />
    </>
  );
}

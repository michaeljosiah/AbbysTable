import type { Metadata } from 'next';

import { ConsentManager } from '@/components/consent/ConsentManager';
import { DevDataMode } from '@/components/dev/DevDataMode';
import { liveOrderingEnabled, resolveDataMode } from '@/lib/aonik/dataMode';
import { readSessionView } from '@/lib/auth/session';
import { CartProvider } from '@/lib/cart/CartProvider';

import { fontVariables } from './fonts';

import '@/styles/tokens.css';
import './globals.css';

/**
 * Root layout: document, fonts, the cart and the cookie consent manager.
 *
 * Chrome lives in the route groups — `(site)` carries the marketing header and
 * footer, `(checkout)` carries the stepper — so the builder is not wrapped in
 * navigation that would let someone wander out mid-order.
 *
 * Fonts are declared in `./fonts`, shared with `global-error.tsx`.
 */
export const metadata: Metadata = {
  // The v2 homepage's headline, and its "mainland UK" — deliberate wording:
  // non-mainland delivery is still an open question (CLAUDE.md).
  title: "Abby's Table — Nigerian fusion food, nutrition at the core",
  description:
    'Nigerian fusion food, made from scratch and delivered chilled to mainland UK. No seed oils, no ultra-processed foods, no added MSG, no refined sugars.',
  openGraph: {
    title: "Abby's Table",
    description:
      'Nigerian fusion food, made from scratch and delivered chilled to mainland UK. Heat, enjoy, live well.',
    type: 'website',
    locale: 'en_GB',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Which cart engine runs is a server decision — the client is told, never
  // asked, so a browser cannot elect itself onto the live cart.
  const { mode } = await resolveDataMode();
  // Whose box it is can change under a mounted provider: signing in adopts the
  // guest box (a write, which moves its version) and signing out hands it back.
  // A cookie read only — it cannot block or fail.
  const { isSignedIn } = await readSessionView();

  return (
    /*
     * `suppressHydrationWarning` is here for BROWSER EXTENSIONS, not for us.
     *
     * `<html>` is the element extensions decorate before React hydrates — a
     * dev browser here stamps `data-xt-extension-active` on it — and React
     * reports the resulting attribute diff as a hydration mismatch on every
     * page load. Nothing is wrong: the server sends
     * `<html lang="en-GB" class="…">`, and an extension-free browser receives
     * exactly that.
     *
     * The warning is worth silencing rather than living with, because a console
     * that always has a hydration error in it is a console where the next real
     * one goes unnoticed.
     *
     * It suppresses ONE level — this element's own attributes and text. It
     * cannot hide a mismatch anywhere inside the app, so it is not a blanket.
     * The only thing it gives up is a genuine mismatch on `<html>` itself, and
     * both attributes here are constants resolved at build time.
     */
    <html
      lang="en-GB"
      className={fontVariables}
      suppressHydrationWarning
    >
      <body>
        <CartProvider mode={mode} liveOrdering={liveOrderingEnabled()} signedIn={isSignedIn}>
          {children}
        </CartProvider>
        {/* Mounted ONCE, here, so it covers every route group — never per page
            (design/build-handoff.md §3s). Every non-essential tag gates on it
            through ConsentGate / onConsent. */}
        <ConsentManager />
        {/* Renders nothing in production. */}
        <DevDataMode />
      </body>
    </html>
  );
}

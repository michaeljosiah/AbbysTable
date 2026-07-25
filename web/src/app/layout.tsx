import type { Metadata } from 'next';
import { Cormorant_Garamond, Figtree, Playfair_Display } from 'next/font/google';

import { DevDataMode } from '@/components/dev/DevDataMode';
import { resolveDataMode } from '@/lib/aonik/dataMode';
import { CartProvider } from '@/lib/cart/CartProvider';

import '@/styles/tokens.css';
import './globals.css';

/**
 * Root layout: document, fonts and the cart.
 *
 * Chrome lives in the route groups — `(site)` carries the marketing header and
 * footer, `(checkout)` carries the stepper — so the builder is not wrapped in
 * navigation that would let someone wander out mid-order.
 *
 * next/font downloads and self-hosts each family at build time, so there is no
 * runtime request to Google and no layout shift from a late webfont.
 */
const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-playfair',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-cormorant',
});

const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
});

export const metadata: Metadata = {
  title: "Abby's Table — Nigerian food, the way it deserves to be made",
  description:
    'Chef-prepared Nigerian meals, personalised and delivered chilled UK-wide. No seed oils, no bouillon or cubes, no MSG, no refined sugars.',
  openGraph: {
    title: "Abby's Table",
    description:
      'Chef-prepared Nigerian meals, personalised and delivered chilled UK-wide. Heat, eat, live well.',
    type: 'website',
    locale: 'en_GB',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Which cart engine runs is a server decision — the client is told, never
  // asked, so a browser cannot elect itself onto the live cart.
  const { mode } = await resolveDataMode();

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
      className={`${playfair.variable} ${cormorant.variable} ${figtree.variable}`}
      suppressHydrationWarning
    >
      <body>
        <CartProvider mode={mode}>{children}</CartProvider>
        {/* Renders nothing in production. */}
        <DevDataMode />
      </body>
    </html>
  );
}

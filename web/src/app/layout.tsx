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
    <html lang="en-GB" className={`${playfair.variable} ${cormorant.variable} ${figtree.variable}`}>
      <body>
        <CartProvider mode={mode}>{children}</CartProvider>
        {/* Renders nothing in production. */}
        <DevDataMode />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Cormorant_Garamond, Figtree, Playfair_Display } from 'next/font/google';

import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { getAonikClient } from '@/lib/aonik/client';
import { formatDeliveryDate } from '@/lib/format';

import '@/styles/tokens.css';
import './globals.css';

/**
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
  // The announcement bar carries the live delivery date, so the chrome needs
  // commerce data too — resolved here rather than threaded through every page.
  const { earliestDeliveryDate } = await getAonikClient().getDeliveryWindow();

  return (
    <html lang="en-GB" className={`${playfair.variable} ${cormorant.variable} ${figtree.variable}`}>
      <body>
        <AnnouncementBar earliestDeliveryLabel={formatDeliveryDate(earliestDeliveryDate)} />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

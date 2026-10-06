import { Cormorant_Garamond, Figtree, Playfair_Display } from 'next/font/google';

/**
 * The three families, declared once for every document the app renders: the
 * root layout, and `global-error.tsx`, which replaces the root layout when it
 * fails and so has to put the same font variables on its own `<html>`.
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

/** Defines `--font-playfair`, `--font-cormorant` and `--font-figtree`, which tokens.css reads. */
export const fontVariables = `${playfair.variable} ${cormorant.variable} ${figtree.variable}`;

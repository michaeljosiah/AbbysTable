'use client';

import { ServerErrorPage } from '@/components/status/ServerErrorPage';

import { fontVariables } from './fonts';

import '@/styles/tokens.css';
import './globals.css';

/**
 * The last-resort 500: shown when the root layout itself fails (it resolves
 * the data mode and mounts the cart for every page), so nothing from it can be
 * relied on. It replaces that layout, which is why it renders its own
 * `<html>` and `<body>` and imports the tokens, base styles and fonts itself.
 *
 * Same page as `error.tsx`. TRY AGAIN is a full reload: with the root layout
 * gone there is no app state worth keeping, and a reload is what the design's
 * static page does.
 *
 * Check it on a production build (`next build && next start`): in
 * development the error overlay sits on top of it.
 */
export default function GlobalError() {
  return (
    <html lang="en-GB" className={fontVariables}>
      <body>
        {/* No metadata export from an error boundary; React 19 hoists this. */}
        <title>Something went wrong — Abby&rsquo;s Table</title>
        <ServerErrorPage onRetry={() => window.location.reload()} />
      </body>
    </html>
  );
}

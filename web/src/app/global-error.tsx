'use client';

import { ServerErrorPage } from '@/components/status/ServerErrorPage';
import { SERVER_ERROR_COPY } from '@/lib/content/status';

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
    // suppressHydrationWarning as on the root layout: browser extensions edit <html>.
    <html lang="en-GB" className={fontVariables} suppressHydrationWarning>
      <body>
        {/* No metadata export from an error boundary; React 19 hoists this. */}
        <title>{SERVER_ERROR_COPY.title}</title>
        <ServerErrorPage onRetry={() => window.location.reload()} />
      </body>
    </html>
  );
}

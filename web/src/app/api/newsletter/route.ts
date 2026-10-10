/**
 * `GET /api/newsletter` — the footer newsletter's consent, read fresh from
 * Aonik's published sign-up lists (michaeljosiah/aonik#357): `{ consent }`
 * while the tenant has published its `newsletter` list, `{ consent: null }`
 * otherwise — an ordinary answer, never an error in the console.
 *
 * The footer asks for it from the browser because it cannot be asked on the
 * server: the site chrome renders into every document — the root 404
 * included — and must never await Aonik (tests/not-found-chrome.test.ts). So
 * "Join the table" appears once the page has loaded, and only where it can
 * really subscribe; without JavaScript it does not appear at all.
 */

import { NextResponse } from 'next/server';

import { consentOf, publishedSignupList } from '@/lib/signup/server';

/** The list can be withdrawn or reworded at any moment: never cached. */
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET() {
  const list = await publishedSignupList('newsletter');
  return NextResponse.json({ consent: list ? consentOf(list) : null }, { headers: NO_STORE });
}

import { NextResponse } from 'next/server';
export function GET(request: Request) {
  // The Stripe return is navigation only. Aonik remains the proof of capture or cancellation.
  return NextResponse.redirect(new URL('/gift-card/payment', request.url), 303);
}

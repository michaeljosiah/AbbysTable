import type { OpeningHours } from '@/lib/contact/hours';

/**
 * Direct contact details for customers.
 *
 * The Contact page (#24) prints all of them — WhatsApp, email, phone and the
 * opening hours — and marks each one that is still `null` "to be confirmed"
 * there, never linked: no mailto:, tel: or wa.me with no value behind it.
 *
 * The 500 and maintenance pages carry a "Need help with an order?" panel with
 * an email address and a phone number — mailto: and tel: links, the one route
 * that still works in a full outage (design/build-handoff.md §3ah–§3ai). The
 * header's "Contact us" on those pages is an in-page jump to that panel.
 *
 * Deliberately `null` until the owner confirms real details. The values in the
 * designs (020 3875 1234, hello@FromAbbysTable.co.uk) are recorded as
 * UNVERIFIED PLACEHOLDERS that "cannot ship as-is" (build-handoff.md §6), and a
 * wrong number on an outage page is worse than none. While this is `null` the
 * panel and the header jump are left out entirely, never rendered empty.
 *
 * Setting it shows both on the in-app error page at once. The static host
 * pages are generated from it too, so regenerate them afterwards
 * (`UPDATE_STATUS_PAGES=1 npm test`) — the test fails until you do.
 * Production values are to come from Aonik (michaeljosiah/aonik#358, not
 * built yet); until then this module is that configuration.
 */
export interface SupportContact {
  email: string;
  phone: {
    /** As printed: "020 3875 1234". */
    display: string;
    /** E.164 for the tel: link: "+442038751234". */
    e164: string;
  };
}

export const SUPPORT_CONTACT: SupportContact | null = null;

/**
 * The WhatsApp route on the Contact page — the design's highlighted card,
 * "Usually the quickest way to reach us".
 *
 * `null` until the owner confirms the WhatsApp Business number. The design's
 * wa.me link is "a real-looking number that is not ours" (build-handoff, open
 * items) and must never be copied here. While this is `null` the card marks
 * the number "to be confirmed" and links nowhere.
 */
export interface WhatsAppContact {
  /** E.164, the number behind the link: "+447700900123". */
  e164: string;
  /**
   * The QR code beside the card from 1024 (desktop only: a code you would
   * scan with the same phone is no use), as a path under `public/`, or `null`
   * for none. The design's `whatsapp-qr-placeholder.png` IS NOT A SCANNABLE
   * CODE and must never ship. A real one (build-handoff, "Production spec for
   * the real asset"): 96 CSS px, a four-module quiet zone inside the file, dark
   * on white, a short payload — ideally a redirect such as /whatsapp — and
   * tested on real phone cameras at 100%, 125% and 150% zoom.
   */
  qrSrc: string | null;
}

export const WHATSAPP_CONTACT: WhatsAppContact | null = null;

/** The wa.me link: digits only, no prefilled message, nothing about an order. */
export function whatsAppHref(contact: WhatsAppContact): string {
  return `https://wa.me/${contact.e164.replace(/\D/g, '')}`;
}

/**
 * The phone and WhatsApp line's opening hours, in local UK time (contract
 * §3f; shape and rules in `@/lib/contact/hours`). The Contact page prints the
 * table and computes "Open now / Closed" from it.
 *
 * `null` until the owner confirms them. The design's Mon–Fri 9–5, Sat 10–2,
 * Sun closed and its 2026 bank-holiday list are unverified placeholders, and a
 * wrong window produces "a confidently wrong answer on the page"
 * (build-handoff). While `null` the page shows no status at all and marks the
 * hours "to be confirmed". Production needs a maintained bank-holiday source
 * and a way to record exceptional closures (aonik#358).
 */
export const OPENING_HOURS: OpeningHours | null = null;

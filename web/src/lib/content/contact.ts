/**
 * Direct contact details for customers.
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

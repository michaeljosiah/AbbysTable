import type { Metadata } from 'next';

import { ContactView } from '@/components/contact/ContactView';
import { enquiriesAvailable } from '@/lib/aonik/enquiries';
import { sendEnquiryAction } from '@/lib/contact/actions';
import { resolveBusinessDetails } from '@/lib/content/business';
import { PRIVATE_TABLE_WAITLIST_HREF } from '@/lib/content/marketing';
import { CONTACT_HREF, DELIVERY_FAQS_HREF } from '@/lib/content/navigation';
import { waitlistOpen } from '@/lib/private-table/availability';

/*
 * Contact us (#24) — design/Abby's Table - Contact Us.dc.html.
 *
 * PLACEHOLDER DETAILS NEVER SHIP: the design's phone, email, WhatsApp number,
 * QR code, opening hours and bank holidays are all unverified (build-handoff,
 * open items). Everything here is what the tenant has published in Aonik's
 * business profile (aonik#358) over `@/lib/content/contact`, where each is
 * `null` until the owner confirms it (`resolveBusinessDetails`); the page
 * marks what neither knows.
 *
 * The form is given its send action only when an enquiry can really be sent
 * (`enquiriesAvailable`: live data and a configured Aonik, whose enquiry
 * endpoint is aonik#356). In demo the page says the form is not available
 * rather than thanking anyone for a message that went nowhere (#6's rule).
 *
 * The Private Table panel ("Join the waitlist") shows only while that
 * waitlist can really take a name (`waitlistOpen`; aonik#357) — never a
 * "Join the waitlist" with nothing to join.
 *
 * No mobile purchase bar (an information page) — and on the desktop header
 * auto-hide list, as the design opts Contact in.
 */

const DESCRIPTION =
  'Choose the way you’d prefer to get in touch with Abby’s Table. A member of our team will respond as soon as possible.';

export const metadata: Metadata = {
  title: "Contact us — Abby's Table",
  description: DESCRIPTION,
  openGraph: { title: "Contact us — Abby's Table", description: DESCRIPTION, locale: 'en_GB' },
};

export default async function ContactPage() {
  const [canSend, waitlist, details] = await Promise.all([
    enquiriesAvailable(),
    waitlistOpen(),
    resolveBusinessDetails(),
  ]);

  return (
    <ContactView
      email={details.email}
      phone={details.phone}
      whatsapp={details.whatsapp}
      hours={details.hours}
      // Only while Delivery & FAQs has a page of its own (since #23): before,
      // it took Contact's destination and this card would have linked here.
      faqsHref={DELIVERY_FAQS_HREF === CONTACT_HREF ? null : DELIVERY_FAQS_HREF}
      waitlistHref={waitlist ? PRIVATE_TABLE_WAITLIST_HREF : null}
      sendAction={canSend ? sendEnquiryAction : undefined}
    />
  );
}

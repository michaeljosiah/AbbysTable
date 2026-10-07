import type { Metadata } from 'next';

import { ContactView } from '@/components/contact/ContactView';
import { enquiriesAvailable } from '@/lib/aonik/enquiries';
import { sendEnquiryAction } from '@/lib/contact/actions';
import { OPENING_HOURS, SUPPORT_CONTACT, WHATSAPP_CONTACT } from '@/lib/content/contact';
import { PRIVATE_TABLE_WAITLIST_HREF } from '@/lib/content/marketing';
import { CONTACT_HREF, DELIVERY_FAQS_HREF } from '@/lib/content/navigation';

/*
 * Contact us (#24) — design/Abby's Table - Contact Us.dc.html.
 *
 * PLACEHOLDER DETAILS NEVER SHIP: the design's phone, email, WhatsApp number,
 * QR code, opening hours and bank holidays are all unverified (build-handoff,
 * open items). Everything here comes from `@/lib/content/contact`, where each
 * is `null` until the owner confirms it, and the page marks what is missing.
 *
 * The form is given its send action only when an enquiry can really be sent
 * (`enquiriesAvailable`: live data and the Aonik endpoint, aonik#356, which
 * does not exist yet). Until then the page says the form is not available
 * rather than thanking anyone for a message that went nowhere (#6's rule).
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
  const canSend = await enquiriesAvailable();

  return (
    <ContactView
      support={SUPPORT_CONTACT}
      whatsapp={WHATSAPP_CONTACT}
      hours={OPENING_HOURS}
      // Delivery & FAQs takes Contact's destination until its own page lands
      // (#23): until then this card would be a link to this very page.
      faqsHref={DELIVERY_FAQS_HREF === CONTACT_HREF ? null : DELIVERY_FAQS_HREF}
      waitlistHref={PRIVATE_TABLE_WAITLIST_HREF}
      sendAction={canSend ? sendEnquiryAction : undefined}
    />
  );
}

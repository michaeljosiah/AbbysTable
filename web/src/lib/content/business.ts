import type { BusinessProfile } from '@/lib/aonik/businessProfile';
import { getAonikClient } from '@/lib/aonik/client';
import type { OpeningHours } from '@/lib/contact/hours';

import { COMPANY, type CompanyDetails } from './company';
import { OPENING_HOURS, WHATSAPP_CONTACT, type SupportContact, type WhatsAppContact } from './contact';

/**
 * The business's own details as the Contact page and the legal pages print
 * them: what the tenant has PUBLISHED in Aonik's business profile (#358),
 * fact by fact, over this storefront's configuration (`./contact`,
 * `./company`) — so a fact the profile leaves out still shows where it is
 * configured, and one neither knows stays `null`, marked "to be confirmed".
 *
 * Not the 500 and maintenance pages: they must work with Aonik down (the 500
 * page renders when the app has failed; the static pages are generated at build
 * time), so they keep reading `SUPPORT_CONTACT` alone.
 */
export interface BusinessDetails {
  email: string | null;
  phone: SupportContact['phone'] | null;
  whatsapp: WhatsAppContact | null;
  hours: OpeningHours | null;
  company: CompanyDetails;
}

const digits = (e164: string) => e164.replace(/\D/g, '');

/** The profile's facts over the configuration's. */
export function mergeBusinessDetails(profile: BusinessProfile | null): BusinessDetails {
  const email = profile?.contact.email ?? COMPANY.email;
  const phone = profile?.contact.phone ?? COMPANY.phone;

  const whatsAppNumber = profile?.contact.whatsApp ?? WHATSAPP_CONTACT?.e164 ?? null;
  // The QR code encodes a number: it goes with the configured number it was
  // made for, never with a different one the profile publishes.
  const qrSrc =
    whatsAppNumber && WHATSAPP_CONTACT && digits(WHATSAPP_CONTACT.e164) === digits(whatsAppNumber)
      ? WHATSAPP_CONTACT.qrSrc
      : null;

  return {
    email,
    phone,
    whatsapp: whatsAppNumber ? { e164: whatsAppNumber, qrSrc } : null,
    hours: profile?.openingHours ?? OPENING_HOURS,
    company: {
      legalName: profile?.legal.companyName ?? COMPANY.legalName,
      registeredOffice: profile?.legal.registeredOffice ?? COMPANY.registeredOffice,
      companyNumber: profile?.legal.companyNumber ?? COMPANY.companyNumber,
      // Aonik publishes no payment processor: it stays configuration.
      paymentProvider: COMPANY.paymentProvider,
      email,
      phone,
    },
  };
}

/**
 * The details for this request. Never throws: with no profile to read (none
 * published, Aonik slow or down, demo) the pages show the configuration, so
 * an outage marks a detail "to be confirmed" rather than taking the Terms or
 * the Contact page with it.
 */
export async function resolveBusinessDetails(): Promise<BusinessDetails> {
  try {
    return mergeBusinessDetails(await (await getAonikClient()).getBusinessProfile());
  } catch (error) {
    console.error('[business] the business profile could not be read; showing the configured details', error);
    return mergeBusinessDetails(null);
  }
}

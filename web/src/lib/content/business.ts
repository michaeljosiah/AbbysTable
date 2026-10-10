import type { BusinessProfile, ProfileFact } from '@/lib/aonik/businessProfile';
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

/**
 * The profile's facts over the configuration's. A fact the profile published
 * but could not read (`rejected`) is null — "to be confirmed" — and never the
 * configuration's: that could be an old number, or hours no longer kept.
 */
/** The configuration the profile is laid over (`./company`, `./contact`). */
export interface ConfiguredDetails {
  company: CompanyDetails;
  whatsapp: WhatsAppContact | null;
  hours: OpeningHours | null;
}

const CONFIGURED: ConfiguredDetails = { company: COMPANY, whatsapp: WHATSAPP_CONTACT, hours: OPENING_HOURS };

export function mergeBusinessDetails(
  profile: BusinessProfile | null,
  configured: ConfiguredDetails = CONFIGURED,
): BusinessDetails {
  const pick = <T,>(fact: ProfileFact, published: T | null | undefined, fallback: T | null): T | null =>
    profile?.rejected.has(fact) ? null : (published ?? fallback);
  const { company } = configured;

  const email = pick('email', profile?.contact.email, company.email);
  const phone = pick('phone', profile?.contact.phone, company.phone);

  const whatsAppNumber = pick('whatsApp', profile?.contact.whatsApp, configured.whatsapp?.e164 ?? null);
  // The QR code encodes a number: it goes with the configured number it was
  // made for, never with a different one the profile publishes.
  const qrSrc =
    whatsAppNumber && configured.whatsapp && digits(configured.whatsapp.e164) === digits(whatsAppNumber)
      ? configured.whatsapp.qrSrc
      : null;

  return {
    email,
    phone,
    whatsapp: whatsAppNumber ? { e164: whatsAppNumber, qrSrc } : null,
    hours: pick('openingHours', profile?.openingHours, configured.hours),
    company: {
      legalName: pick('companyName', profile?.legal.companyName, company.legalName),
      registeredOffice: pick('registeredOffice', profile?.legal.registeredOffice, company.registeredOffice),
      companyNumber: pick('companyNumber', profile?.legal.companyNumber, company.companyNumber),
      // Aonik publishes no payment processor: it stays configuration.
      paymentProvider: company.paymentProvider,
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

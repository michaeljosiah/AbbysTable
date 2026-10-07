import { SUPPORT_CONTACT, type SupportContact } from './contact';

/**
 * The legal entity behind Abby's Table, as the Terms of Sale and the Privacy
 * Policy state it — in ONE place, so the two documents cannot disagree.
 *
 * Every value is `null` until the owner confirms it. Production values are to
 * come from configuration (michaeljosiah/aonik#358, not available yet); until
 * then this module is that configuration. While a value is `null` the legal
 * pages print the design's dotted-underline italic "to be confirmed" mark in
 * its place, so a missing detail is visible and cannot ship unnoticed
 * (#38, "Company name, number, registered office, phone and email").
 *
 * Do NOT copy the designs' values in here. Every one of them is a placeholder
 * recorded as such (design/build-handoff.md, open items): "Abby's Table Foods
 * Ltd" (Terms) and "Example Foods Ltd" (Privacy) — the two files do not even
 * agree — company number 12345678, "1 Example Street", and the phone number and
 * email shared with the Contact page. A plausible-looking company number in a
 * legal notice is worse than a visible gap.
 */
export interface CompanyDetails {
  /** Registered company name, as it appears at Companies House. */
  legalName: string | null;
  /** Registered office, one line per entry: street, town, postcode. */
  registeredOffice: readonly string[] | null;
  /** Companies House registration number. */
  companyNumber: string | null;
  /**
   * The card-payment processor, named in Terms clause 12 and Privacy section 5.
   * The Terms draft's "such as Stripe" is a placeholder too (build-handoff.md,
   * open items; #38), so it is marked like the rest until it is confirmed.
   */
  paymentProvider: string | null;
  /**
   * Email and telephone. Not a second copy: these are the customer contact
   * details the 500 and maintenance pages print, so setting
   * `SUPPORT_CONTACT` fills both documents and those pages at once.
   */
  contact: SupportContact | null;
}

export const COMPANY: CompanyDetails = {
  legalName: null,
  registeredOffice: null,
  companyNumber: null,
  paymentProvider: null,
  contact: SUPPORT_CONTACT,
};

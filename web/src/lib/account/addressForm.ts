/**
 * The address form's rules — React-free, so the client form and the server
 * action run the SAME ones (tests/account-details.test.tsx). The messages are
 * the design's (My Account, Addresses).
 *
 * Aonik's address is street, optional second line, town, postcode and a country
 * code, plus a free `type` word; so that is all the form asks. The design's
 * name, phone and delivery notes have no field on Aonik and are not collected.
 */

import { normalisePostcode } from '@/lib/delivery/postcode';
import type { AddressWrite } from '@/lib/aonik/addresses';

export interface AddressFormValues {
  /** The design's optional Label ("Home", "Mum's"): Aonik's `type`. */
  label: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
}

export type AddressFormErrors = Partial<Record<'line1' | 'city' | 'postcode', string>>;

export const ADDRESS_MESSAGES = {
  line1: 'Enter the first line of the address.',
  city: 'Enter a town or city.',
  postcodeMissing: 'Enter a postcode.',
  postcodeInvalid: 'Enter a UK postcode, like DA1 1AA.',
  saved: 'Address saved.',
  removed: 'Address removed.',
  defaulted: 'Default address updated.',
  conflict: 'Your addresses changed somewhere else, so we’ve refreshed them. Please check and try again.',
  missing: 'That address has already been removed.',
  refused: 'We couldn’t save that address. Please check it and try again.',
  forbidden: 'We can’t change your addresses right now. Please contact us.',
  unavailable: 'We couldn’t reach your addresses just now. Please try again in a moment.',
} as const;

/** Aonik's `type` is required text up to 32 characters; an empty label is "Home". */
export const DEFAULT_ADDRESS_TYPE = 'Home';
export const MAX_ADDRESS_TYPE = 32;

export const EMPTY_ADDRESS_FORM: AddressFormValues = { label: '', line1: '', line2: '', city: '', postcode: '' };

export function trimmedForm(values: Partial<AddressFormValues>): AddressFormValues {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  return {
    label: text(values.label),
    line1: text(values.line1),
    line2: text(values.line2),
    city: text(values.city),
    postcode: text(values.postcode),
  };
}

/** An ISO 3166-1 alpha-2 country code, else the storefront's own (GB). */
export function readCountry(value: unknown): string {
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value) ? value : 'GB';
}

/**
 * The field errors for a form, empty when it is fine. The UK postcode format is
 * asked only of a UK address: one saved elsewhere (made at checkout, or
 * abroad) is edited in its own country and keeps it.
 */
export function addressFormErrors(values: AddressFormValues, country = 'GB'): AddressFormErrors {
  const errors: AddressFormErrors = {};
  if (!values.line1) errors.line1 = ADDRESS_MESSAGES.line1;
  if (!values.city) errors.city = ADDRESS_MESSAGES.city;
  if (!values.postcode) errors.postcode = ADDRESS_MESSAGES.postcodeMissing;
  else if (country === 'GB' && !normalisePostcode(values.postcode)) errors.postcode = ADDRESS_MESSAGES.postcodeInvalid;
  return errors;
}

/** Control characters Aonik refuses in any address field. */
function hasControl(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * The write for a form that has no errors: postcode normalised ("da12ab" →
 * "DA1 2AB"), an empty label read as "Home". Null when any field carries a
 * control character (Aonik would refuse it).
 */
export function toAddressWrite(values: AddressFormValues, country = 'GB'): AddressWrite | null {
  const form = trimmedForm(values);
  if (Object.values(form).some(hasControl)) return null;
  const postcode = country === 'GB' ? normalisePostcode(form.postcode) : form.postcode.toUpperCase().slice(0, 32);
  if (!postcode) return null;
  return {
    type: (form.label || DEFAULT_ADDRESS_TYPE).slice(0, MAX_ADDRESS_TYPE),
    line1: form.line1.slice(0, 256),
    line2: form.line2 ? form.line2.slice(0, 256) : undefined,
    city: form.city.slice(0, 128),
    postcode,
    country,
  };
}

/** A saved address, as the form starts when editing it. */
export function formFromAddress(address: {
  type: string;
  fields: { line1: string; line2?: string; city: string; postcode: string };
}): AddressFormValues {
  return {
    label: address.type,
    line1: address.fields.line1,
    line2: address.fields.line2 ?? '',
    city: address.fields.city,
    postcode: address.fields.postcode,
  };
}

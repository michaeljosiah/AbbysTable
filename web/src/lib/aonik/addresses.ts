/**
 * The signed-in customer's address book — `GET /profiles/customers/me/addresses`
 * (`CustomerAddressBookDto`). Party-scoped on Aonik's side.
 *
 * Aonik's address has no name, phone or delivery notes: the book is addresses
 * only, and nothing here makes the rest up.
 *
 * SERVER-ONLY — reads the session cookie.
 */

import { aonikAuthedFetch } from '@/lib/auth/server';

export interface CustomerAddressDto {
  id: string;
  type: string;
  line1: string;
  line2?: string | null;
  line3?: string | null;
  city: string;
  state?: string | null;
  postcode: string;
  country: string;
  isDefault: boolean;
}

export interface CustomerAddressBookDto {
  addresses?: CustomerAddressDto[] | null;
  defaultAddressId?: string | null;
  /** The address book's version: every write must name the one it saw. */
  version: string;
}

export interface CustomerAddress {
  id: string;
  /** Aonik's type word (`Home`, `Billing`, …), verbatim. */
  type: string;
  /** One line each, in order, empty lines dropped: street, town, county, postcode. */
  lines: string[];
  country: string;
  isDefault: boolean;
}

export interface AddressBook {
  addresses: CustomerAddress[];
  /** The default address: Aonik's `defaultAddressId`, else the one flagged default. */
  defaultAddress?: CustomerAddress;
  version: string;
}

export function mapAddress(dto: CustomerAddressDto): CustomerAddress {
  return {
    id: dto.id,
    type: dto.type,
    lines: [dto.line1, dto.line2, dto.line3, dto.city, dto.state, dto.postcode]
      .map((line) => line?.trim())
      .filter((line): line is string => Boolean(line)),
    country: dto.country,
    isDefault: dto.isDefault,
  };
}

export function mapAddressBook(dto: CustomerAddressBookDto): AddressBook {
  const addresses = (dto.addresses ?? []).map(mapAddress);
  const defaultAddress =
    addresses.find((address) => address.id === dto.defaultAddressId) ??
    addresses.find((address) => address.isDefault);
  return { addresses, defaultAddress, version: dto.version };
}

export async function getMyAddressBook(): Promise<AddressBook> {
  return mapAddressBook(await aonikAuthedFetch<CustomerAddressBookDto>('/profiles/customers/me/addresses', { forbiddenKeepsSession: true }));
}

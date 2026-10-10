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

import { AONIK_CODES, AonikError } from './errors';

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
  /** The fields as Aonik holds them, for editing. */
  fields: { line1: string; line2?: string; line3?: string; city: string; state?: string; postcode: string };
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
    fields: {
      line1: dto.line1,
      line2: dto.line2?.trim() || undefined,
      line3: dto.line3?.trim() || undefined,
      city: dto.city,
      state: dto.state?.trim() || undefined,
      postcode: dto.postcode,
    },
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

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * What an address write carries (`CustomerAddressWrite`). Aonik's address has a
 * `type` word, three street lines, city, county, postcode and a country code —
 * nothing else — and every write names the address-book `version` the customer
 * saw, so a stale tab is refused rather than allowed to overwrite a newer book.
 */
export interface AddressWrite {
  type: string;
  line1: string;
  line2?: string;
  /** Carried through unchanged when an address that has them is edited. */
  line3?: string;
  city: string;
  /** As `line3`. */
  state?: string;
  postcode: string;
  /** ISO 3166-1 alpha-2. The storefront delivers to the UK. */
  country: string;
}

/** Why a write did not happen. */
export type AddressWriteFailure =
  /** The book changed since the customer loaded it: re-read, then retry. */
  | 'conflict'
  /** The address is no longer there (removed in another tab). */
  | 'missing'
  /** Aonik refused the content. */
  | 'invalid'
  /** This customer may not write addresses (a 403): the session is NOT over. */
  | 'forbidden';

/** Reads Aonik's refusal of an address write, or null when it is not one (rethrow it). */
export function addressWriteFailure(error: unknown): AddressWriteFailure | null {
  if (!(error instanceof AonikError)) return null;
  if (error.status === 409 && error.code === AONIK_CODES.concurrencyConflict) return 'conflict';
  if (error.status === 404) return 'missing';
  if (error.status === 403) return 'forbidden';
  if (error.status === 400 || error.status === 409 || error.status === 422) return 'invalid';
  return null;
}

function body(input: AddressWrite, version: string) {
  return {
    type: input.type,
    line1: input.line1,
    line2: input.line2 ?? null,
    line3: input.line3 ?? null,
    city: input.city,
    state: input.state ?? null,
    postcode: input.postcode,
    country: input.country,
    expectedVersion: version,
  };
}

const BOOK = '/profiles/customers/me/addresses';

export async function createAddress(input: AddressWrite, version: string): Promise<AddressBook> {
  return mapAddressBook(await aonikAuthedFetch<CustomerAddressBookDto>(BOOK, { method: 'POST', body: body(input, version), forbiddenKeepsSession: true }));
}

export async function updateAddress(id: string, input: AddressWrite, version: string): Promise<AddressBook> {
  return mapAddressBook(
    await aonikAuthedFetch<CustomerAddressBookDto>(`${BOOK}/${encodeURIComponent(id)}`, { method: 'PUT', body: body(input, version), forbiddenKeepsSession: true }),
  );
}

export async function removeAddress(id: string, version: string): Promise<AddressBook> {
  return mapAddressBook(
    await aonikAuthedFetch<CustomerAddressBookDto>(`${BOOK}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: { expectedVersion: version },
      forbiddenKeepsSession: true,
    }),
  );
}

export async function setDefaultAddress(id: string, version: string): Promise<AddressBook> {
  return mapAddressBook(
    await aonikAuthedFetch<CustomerAddressBookDto>(`${BOOK}/${encodeURIComponent(id)}/default`, {
      method: 'PUT',
      body: { expectedVersion: version },
      forbiddenKeepsSession: true,
    }),
  );
}

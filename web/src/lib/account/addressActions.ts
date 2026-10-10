'use server';

/**
 * The address book's server actions. Every write names the address-book version
 * the customer's page was showing: a stale tab is refused (409) rather than
 * allowed to overwrite a newer book, and answers with the book as it now is, so
 * the page can show it and the customer can try again knowingly.
 *
 * Outcomes are values (a thrown error in a server action reaches the client as
 * an opaque digest). The rules here are the form's own
 * (`addressForm.ts`), re-run on the server: the browser's check is for speed.
 */

import {
  addressWriteFailure,
  createAddress,
  getMyAddressBook,
  removeAddress,
  setDefaultAddress,
  updateAddress,
  type AddressBook,
  type AddressWrite,
} from '@/lib/aonik/addresses';
import { SessionExpiredError } from '@/lib/auth/server';

import {
  ADDRESS_MESSAGES,
  addressFormErrors,
  readCountry,
  toAddressWrite,
  trimmedForm,
  type AddressFormErrors,
  type AddressFormValues,
} from './addressForm';

export type AddressActionResult =
  /** Done; `book` is the book as it now is, `said` what to tell the customer. */
  | { status: 'ok'; book: AddressBook; said: string }
  /** The form had errors (the server's check agrees with the browser's). */
  | { status: 'invalid'; errors: AddressFormErrors }
  /** Not done. `book` is the current book when it could be re-read. */
  | { status: 'failed'; message: string; book?: AddressBook }
  /** The session is over: the page sends the customer to Log in. */
  | { status: 'ended' };

async function currentBook(): Promise<AddressBook | undefined> {
  try {
    return await getMyAddressBook();
  } catch {
    return undefined;
  }
}

async function failed(error: unknown): Promise<AddressActionResult> {
  if (error instanceof SessionExpiredError) return { status: 'ended' };
  const reason = addressWriteFailure(error);
  if (reason === 'forbidden') {
    return { status: 'failed', message: ADDRESS_MESSAGES.forbidden, book: await currentBook() };
  }
  if (!reason) {
    console.error('[account] an address write failed', error instanceof Error ? error.name : error);
    return { status: 'failed', message: ADDRESS_MESSAGES.unavailable, book: await currentBook() };
  }
  const message =
    reason === 'conflict' ? ADDRESS_MESSAGES.conflict : reason === 'missing' ? ADDRESS_MESSAGES.missing : ADDRESS_MESSAGES.refused;
  // Whatever the reason, the page should show the book as it is now.
  return { status: 'failed', message, book: await currentBook() };
}

export interface SaveAddressInput {
  /** Present when editing. */
  id?: string;
  /** The address-book version the page was showing. */
  version: string;
  values: AddressFormValues;
  makeDefault: boolean;
  /** The ids the page was showing, so a newly created address can be found. */
  knownIds: string[];
  /** An edited address's fields the form does not ask for, carried through unchanged. */
  keep?: { line3?: string; state?: string; country?: string };
}

export async function saveAddressAction(input: SaveAddressInput): Promise<AddressActionResult> {
  const values = trimmedForm(input.values);
  const country = readCountry(input.keep?.country);
  const errors = addressFormErrors(values, country);
  if (Object.keys(errors).length > 0) return { status: 'invalid', errors };
  const write = toAddressWrite(values, country);
  if (!write) return { status: 'failed', message: ADDRESS_MESSAGES.refused };
  // Carried through unchanged, but never trusted as typed: strings, bounded.
  const carried = (value: unknown, max: number) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined);
  const payload: AddressWrite = { ...write, line3: carried(input.keep?.line3, 256), state: carried(input.keep?.state, 128) };

  let book: AddressBook;
  try {
    book = input.id ? await updateAddress(input.id, payload, input.version) : await createAddress(payload, input.version);
  } catch (error) {
    return failed(error);
  }

  // A new address is default only when the customer asked (the first one always
  // is, on Aonik's side). It is a second write, based on the book just returned.
  if (input.makeDefault) {
    const target = input.id ?? book.addresses.find((address) => !input.knownIds.includes(address.id))?.id;
    if (target && book.defaultAddress?.id !== target) {
      try {
        book = await setDefaultAddress(target, book.version);
      } catch (error) {
        if (error instanceof SessionExpiredError) return { status: 'ended' };
        console.error('[account] an address could not be made the default', error instanceof Error ? error.name : error);
        return { status: 'ok', book: (await currentBook()) ?? book, said: `${ADDRESS_MESSAGES.saved} We couldn’t make it your default: use “Set as default”.` };
      }
    }
  }
  return { status: 'ok', book, said: ADDRESS_MESSAGES.saved };
}

export async function removeAddressAction(input: { id: string; version: string }): Promise<AddressActionResult> {
  try {
    return { status: 'ok', book: await removeAddress(input.id, input.version), said: ADDRESS_MESSAGES.removed };
  } catch (error) {
    return failed(error);
  }
}

export async function setDefaultAddressAction(input: { id: string; version: string }): Promise<AddressActionResult> {
  try {
    return { status: 'ok', book: await setDefaultAddress(input.id, input.version), said: ADDRESS_MESSAGES.defaulted };
  } catch (error) {
    return failed(error);
  }
}

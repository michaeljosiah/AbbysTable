/**
 * The signed-in customer's profile, as far as the account area reads it.
 *
 * `GET /profiles/customers/me` — party-scoped on Aonik's side. SERVER-ONLY.
 */

import { cache } from 'react';

import { aonikAuthedFetch } from '@/lib/auth/server';

interface CustomerProfileDto {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  phone?: string | null;
  countryCode?: string | null;
}

export interface CustomerProfile {
  email: string;
  firstName?: string;
  lastName?: string;
  /** Aonik's own, kept so a name or phone change does not clear them. */
  title?: string;
  countryCode?: string;
  /** E.164, as Aonik stores it. */
  phone?: string;
}

export function mapProfile(dto: CustomerProfileDto): CustomerProfile {
  return {
    email: dto.email,
    firstName: dto.firstName?.trim() || undefined,
    lastName: dto.lastName?.trim() || undefined,
    title: dto.title?.trim() || undefined,
    countryCode: dto.countryCode?.trim() || undefined,
    phone: dto.phone?.trim() || undefined,
  };
}

/**
 * One read per request, shared by the layout's greeting and any page that
 * wants the profile. Throws what `aonikAuthedFetch` throws (`SessionExpiredError`
 * included): the caller decides what a missing name is worth.
 */
export const getMyProfile = cache(async (): Promise<CustomerProfile> =>
  mapProfile(await aonikAuthedFetch<CustomerProfileDto>('/profiles/customers/me')),
);

/**
 * Saves the name and phone. Aonik's `PUT /profiles/customers/me` REPLACES the
 * profile's editable fields, so the title and country the customer already has
 * are sent back unchanged. Returns the profile as it now is.
 */
export async function updateMyProfile(
  current: CustomerProfile,
  change: { firstName: string; lastName: string; phone: string | null },
): Promise<CustomerProfile> {
  return mapProfile(
    await aonikAuthedFetch<CustomerProfileDto>('/profiles/customers/me', {
      method: 'PUT',
      body: {
        firstName: change.firstName,
        lastName: change.lastName || null,
        title: current.title ?? null,
        phone: change.phone,
        countryCode: current.countryCode ?? null,
      },
    }),
  );
}

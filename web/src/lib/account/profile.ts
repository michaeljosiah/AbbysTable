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
}

export function mapProfile(dto: CustomerProfileDto): CustomerProfile {
  return {
    email: dto.email,
    firstName: dto.firstName?.trim() || undefined,
    lastName: dto.lastName?.trim() || undefined,
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

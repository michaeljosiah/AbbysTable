/**
 * The signed-in customer's points — `GET /commerce/storefront/loyalty`
 * (`LoyaltyBalance`). Party-scoped on Aonik's side; the rules (2 points per £1,
 * 100 points = £1, never expire) are Aonik's, and `value` is its own figure in
 * pounds, never recomputed here.
 *
 * Aonik answers 200 with zeros both for a customer who has earned nothing and
 * when the programme is not switched on, so a balance of zero cannot be told
 * from "no programme": the overview shows no card for it.
 *
 * SERVER-ONLY — reads the session cookie.
 */

import { aonikAuthedFetch } from '@/lib/auth/server';

import { toPence } from './map';

interface LoyaltyBalanceDto {
  balancePoints: number;
  reservedPoints: number;
  availablePoints: number;
  /** Pounds, decimal. */
  value: number;
  highestFivePoundMarkSeen: number;
}

export interface LoyaltyBalance {
  /** What the customer holds. */
  balancePoints: number;
  /** Held against an order in checkout. */
  reservedPoints: number;
  /** What can be spent now. */
  availablePoints: number;
  /** What `balancePoints` are worth, in pence. */
  valuePence: number;
}

export function mapLoyaltyBalance(dto: LoyaltyBalanceDto): LoyaltyBalance {
  return {
    balancePoints: dto.balancePoints,
    reservedPoints: dto.reservedPoints,
    availablePoints: dto.availablePoints,
    valuePence: toPence(dto.value),
  };
}

export async function getMyLoyaltyBalance(): Promise<LoyaltyBalance> {
  return mapLoyaltyBalance(await aonikAuthedFetch<LoyaltyBalanceDto>('/commerce/storefront/loyalty', { forbiddenKeepsSession: true }));
}

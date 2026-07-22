/**
 * DTO → frontend-type mapping, and the money adapter.
 *
 * The only place allowed to know Aonik's property names. Everything above this
 * file sees the existing frontend types, denominated in integer pence.
 *
 * Money: Aonik serves decimal major units (`95.0` meaning £95.00) while this
 * storefront works in integer pence. Aonik Spec 066 §19 O1 records the public
 * representation as an OPEN decision — "until then DTOs serve decimals and the
 * frontend's client class converts". This pair is that conversion, and the
 * reason it is one pair rather than scattered arithmetic: if Aonik switches to
 * minor units, these become identities and nothing else changes.
 */

import type { StorefrontBoxPlan, StorefrontConfig } from './types';

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Decimal major units → integer pence.
 *
 * `Math.round` rather than truncation so 2.345 → 235 rather than 234, and so
 * negative adjustments round symmetrically about zero (-2.5 → -250).
 */
export function toPence(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Integer pence → decimal major units, for amounts we send back.
 *
 * Rounded to two places to avoid re-introducing binary-float noise
 * (e.g. 1999 / 100 is exactly 19.99, but 0.1 + 0.2 arithmetic upstream is not).
 */
export function toMajor(pence: number): number {
  return Math.round(pence) / 100;
}

/** Optional amounts keep their absence — a null price is "not set", not zero. */
export function toPenceOrUndefined(amount: number | null | undefined): number | undefined {
  return amount === null || amount === undefined ? undefined : toPence(amount);
}

/* -------------------------------------------------------------------------- */
/* Storefront config (Spec 070 §9)                                             */
/* -------------------------------------------------------------------------- */

/** `GET /commerce/config/storefront`, verbatim. */
export interface StorefrontConfigDto {
  currency: string;
  recommendedChoiceLabel: string;
  resultsPageSize: number;
  backToTopTrigger: unknown;
  delivery: { listAmount: number; chargedAmount: number };
  defaultBoxSlug: string | null;
  extrasCollectionSlug: string | null;
  box: StorefrontBoxPlanDto | null;
}

export interface StorefrontBoxPlanDto {
  minSize: number;
  maxSize: number;
  currency: string;
  perSpacePrice: number | null;
  presets: StorefrontBoxPresetDto[];
}

/** Note: `saving`, where the full box-plan read names the same thing `savingAmount`. */
export interface StorefrontBoxPresetDto {
  size: number;
  price: number;
  badge: string | null;
  blurb: string | null;
  saving: number | null;
}

export function mapStorefrontConfig(dto: StorefrontConfigDto): StorefrontConfig {
  return {
    currency: dto.currency,
    recommendedChoiceLabel: dto.recommendedChoiceLabel,
    resultsPageSize: dto.resultsPageSize,
    backToTopTrigger: dto.backToTopTrigger,
    delivery: {
      listPence: toPence(dto.delivery.listAmount),
      chargedPence: toPence(dto.delivery.chargedAmount),
    },
    defaultBoxSlug: dto.defaultBoxSlug ?? undefined,
    extrasCollectionSlug: dto.extrasCollectionSlug ?? undefined,
    box: dto.box ? mapEmbeddedBoxPlan(dto.box) : undefined,
  };
}

/**
 * The config document's trimmed box plan, pence-mapped.
 *
 * Kept as its own shape rather than folded into `BoxOffer`/`CustomBoxPricing`
 * here: converting it into what Step 1 renders is
 * SPEC-2026-07-22-catalog-browse's job, and that conversion also has to retire
 * `listPerDishPence`. This spec's job is to deliver the document faithfully.
 *
 * Note what is NOT here: any list price for a custom size. Only presets may
 * carry a `saving`, and it is authored — never computed.
 */
export function mapEmbeddedBoxPlan(dto: StorefrontBoxPlanDto): StorefrontBoxPlan {
  return {
    minSize: dto.minSize,
    maxSize: dto.maxSize,
    currency: dto.currency,
    perSpacePence: toPenceOrUndefined(dto.perSpacePrice),
    presets: dto.presets.map((preset) => ({
      size: preset.size,
      pricePence: toPence(preset.price),
      badge: preset.badge ?? undefined,
      blurb: preset.blurb ?? undefined,
      savingPence: toPenceOrUndefined(preset.saving),
    })),
  };
}

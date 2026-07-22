/**
 * Order history — the storefront order DTOs, their pence-mapped frontend
 * shapes, and the two authenticated reads behind `/account/orders`.
 *
 * Both endpoints are party-scoped SERVER-SIDE: the query resolves only the
 * signed-in customer's own orders, and a foreign or unknown id answers 404
 * rather than 403 so there is no existence oracle. `getMyOrder` therefore folds
 * 404 into `null` and the page renders not-found — copy must never speculate
 * about which of the two it was.
 *
 * Money crosses this boundary the same way it does everywhere else in
 * `lib/aonik/`: Aonik serves decimal major units, this file converts to integer
 * pence, and nothing above it ever sees a decimal.
 *
 * SERVER-ONLY — every read goes through `aonikAuthedFetch`, which reads the
 * session cookie.
 */

import { aonikAuthedFetch } from '@/lib/auth/server';

import type { PagedResultDto } from './dto';
import { AonikError } from './errors';
import { toPence, toPenceOrUndefined } from './map';

/* -------------------------------------------------------------------------- */
/* Wire contracts                                                              */
/* -------------------------------------------------------------------------- */

/**
 * `StorefrontOrderSummaryDto`, transcribed from
 * `Aonik.Commerce/Services/Checkout/StorefrontOrderService.cs`.
 *
 * Spec 072 documents these endpoints in prose only and names no field
 * contract, so this shape is accurate against shipped code but NOT
 * contract-guaranteed. If Aonik reshapes the DTO without a spec change, this
 * file is where it breaks first.
 */
export interface StorefrontOrderSummaryDto {
  orderId: string;
  placedAtUtc: string;
  status: string;
  currency: string;
  total: number;
  boxSize: number | null;
}

/** `StorefrontOrderItemDto` — a charged retail line. */
export interface StorefrontOrderItemDto {
  itemType: string;
  quantity: number | null;
  unitPrice: number | null;
  amountIn: number;
  sku: string | null;
}

/** `StorefrontOrderSelectionDto` — one dish line of the placed box. */
export interface StorefrontOrderSelectionDto {
  productVariantId: string;
  quantity: number;
  sku: string;
  personalisationSummary: string | null;
}

/** `StorefrontOrderDetailDto`. */
export interface StorefrontOrderDetailDto {
  orderId: string;
  placedAtUtc: string;
  status: string;
  currency: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  boxSize: number | null;
  items: StorefrontOrderItemDto[];
  selections: StorefrontOrderSelectionDto[];
}

/* -------------------------------------------------------------------------- */
/* Frontend shapes                                                             */
/* -------------------------------------------------------------------------- */

/** One row of the history list. */
export interface OrderSummary {
  orderId: string;
  /** A real instant, unlike the delivery promise. See `formatOrderDate`. */
  placedAtUtc: string;
  /** Aonik's own vocabulary, e.g. "Placed". Rendered verbatim, never remapped. */
  status: string;
  currency: string;
  totalPence: number;
  boxSize?: number;
}

/**
 * A charged retail line: the box aggregate, an add-on, or a delivery fee when
 * one was charged. `quantity` and `unitPrice` are genuinely optional on the
 * wire — an aggregate line carries neither — so absence is preserved rather
 * than defaulted to 1 and 0.
 */
export interface OrderItem {
  itemType: string;
  quantity?: number;
  unitPricePence?: number;
  amountPence: number;
  sku?: string;
}

/**
 * One dish line of the placed box, with Aonik's own human-readable
 * personalisation summary.
 *
 * Note there is no product NAME here — only the variant id and the sku. The
 * detail read does not carry one and nothing may invent it from the sku.
 */
export interface OrderSelection {
  productVariantId: string;
  quantity: number;
  sku: string;
  personalisationSummary?: string;
}

export interface OrderDetail {
  orderId: string;
  placedAtUtc: string;
  status: string;
  currency: string;
  subtotalPence: number;
  discountTotalPence: number;
  taxTotalPence: number;
  totalPence: number;
  boxSize?: number;
  /** The charged retail lines. */
  items: OrderItem[];
  /** What is in the box. */
  selections: OrderSelection[];
}

/** One page of history, with the paging maths already done. */
export interface OrderHistoryPage {
  orders: OrderSummary[];
  totalCount: number;
  /** The page actually served, 1-based. */
  page: number;
  pageSize: number;
  /** At least 1, so "page 1 of 1" reads sensibly for an empty history. */
  pageCount: number;
}

/* -------------------------------------------------------------------------- */
/* Mappers                                                                     */
/* -------------------------------------------------------------------------- */

export function mapOrderSummary(dto: StorefrontOrderSummaryDto): OrderSummary {
  return {
    orderId: dto.orderId,
    placedAtUtc: dto.placedAtUtc,
    status: dto.status,
    currency: dto.currency,
    totalPence: toPence(dto.total),
    boxSize: dto.boxSize ?? undefined,
  };
}

export function mapOrderItem(dto: StorefrontOrderItemDto): OrderItem {
  return {
    itemType: dto.itemType,
    quantity: dto.quantity ?? undefined,
    unitPricePence: toPenceOrUndefined(dto.unitPrice),
    amountPence: toPence(dto.amountIn),
    sku: dto.sku ?? undefined,
  };
}

export function mapOrderSelection(dto: StorefrontOrderSelectionDto): OrderSelection {
  return {
    productVariantId: dto.productVariantId,
    quantity: dto.quantity,
    sku: dto.sku,
    personalisationSummary: dto.personalisationSummary ?? undefined,
  };
}

export function mapOrderDetail(dto: StorefrontOrderDetailDto): OrderDetail {
  return {
    orderId: dto.orderId,
    placedAtUtc: dto.placedAtUtc,
    status: dto.status,
    currency: dto.currency,
    subtotalPence: toPence(dto.subtotal),
    discountTotalPence: toPence(dto.discountTotal),
    taxTotalPence: toPence(dto.taxTotal),
    totalPence: toPence(dto.total),
    boxSize: dto.boxSize ?? undefined,
    items: dto.items.map(mapOrderItem),
    selections: dto.selections.map(mapOrderSelection),
  };
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Aonik's own default, sent explicitly.
 *
 * The endpoint defaults to 20 and clamps to 1–100 server-side, but paging
 * arithmetic that relies on an unsent default breaks silently the day the
 * default moves. The page size the UI computes with is the page size the
 * request asked for.
 */
export const ORDERS_PAGE_SIZE = 20;

/**
 * One page of the customer's order history, newest first.
 *
 * Throws `SessionExpiredError` when there is no usable session — callers render
 * the signed-in-required state rather than letting a 401 reach the customer.
 */
export async function listMyOrders(
  page = 1,
  pageSize = ORDERS_PAGE_SIZE,
): Promise<OrderHistoryPage> {
  // A page below 1 is a malformed URL, not a request for the last page.
  const requested = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const size = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : ORDERS_PAGE_SIZE;

  const dto = await aonikAuthedFetch<PagedResultDto<StorefrontOrderSummaryDto>>(
    '/commerce/storefront/orders',
    { query: { page: requested, pageSize: size } },
  );

  const totalCount = Number.isFinite(dto.totalCount) ? dto.totalCount : 0;
  // Trust the echoed page and size when they are sane; a nonsensical echo must
  // not turn the paging controls into nonsense too.
  const served = Number.isFinite(dto.page) && dto.page >= 1 ? dto.page : requested;
  const servedSize = Number.isFinite(dto.pageSize) && dto.pageSize >= 1 ? dto.pageSize : size;

  return {
    orders: (dto.items ?? []).map(mapOrderSummary),
    totalCount,
    page: served,
    pageSize: servedSize,
    pageCount: Math.max(1, Math.ceil(totalCount / servedSize)),
  };
}

/**
 * One order, or `null` when Aonik answered 404.
 *
 * Unknown and foreign are deliberately indistinguishable here because they are
 * indistinguishable on the wire — Aonik returns 404 for both so that a customer
 * cannot probe for the existence of someone else's order. The caller renders
 * not-found; no copy anywhere may guess which case it was.
 */
export async function getMyOrder(orderId: string): Promise<OrderDetail | null> {
  try {
    const dto = await aonikAuthedFetch<StorefrontOrderDetailDto>(
      `/commerce/storefront/orders/${encodeURIComponent(orderId)}`,
    );
    return mapOrderDetail(dto);
  } catch (error) {
    if (error instanceof AonikError && error.isNotFound) return null;
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Presentation                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Formats `placedAtUtc` as "21 July 2026 at 14:32".
 *
 * This belongs in `lib/format.ts` with the other formatters and is here only
 * because that file is owned by another stream; move it when they meet.
 *
 * Two things it gets right that a bare `new Date(x).toLocaleString()` does not:
 *
 *  1. A .NET `DateTime` with `Kind=Unspecified` serialises with NO timezone
 *     designator, and `new Date(...)` then reads it as LOCAL time. The field is
 *     named `...Utc`, so a missing designator means UTC and is made explicit
 *     rather than left to the server's clock.
 *  2. The zone is pinned to Europe/London instead of inherited from whatever
 *     the render host is set to. A UK storefront telling a customer their order
 *     was placed at 02:32 because the box runs on UTC+12 is a bug nobody would
 *     think to look for.
 *
 * Returns null for a missing or unparseable value so callers render nothing
 * rather than "Invalid Date" — the same rule `formatDeliveryDate` follows.
 */
export function formatOrderDate(placedAtUtc: string | null | undefined): string | null {
  const date = parseInstant(placedAtUtc);
  return date ? PLACED_AT.format(date) : null;
}

const PLACED_AT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/London',
});

function parseInstant(value: string | null | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const hasDesignator = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const date = new Date(hasDesignator ? trimmed : `${trimmed}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

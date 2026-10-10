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
  /** The booked delivery day, `YYYY-MM-DD`. Null on an order with none. */
  deliveryDate?: string | null;
  isGift?: boolean;
  /** The customer-facing number (`AT-10517`); null on an old order. */
  orderNumber?: string | null;
  paymentStatus?: string | null;
  discountCode?: string | null;
  discountTotal?: number;
  /** The dishes of the box, named as purchased. Absent on an older Aonik. */
  selections?: StorefrontOrderSelectionDto[] | null;
  /** `Confirmed | Cooking | OutForDelivery | Delivered | Cancelled`; null until paid. */
  fulfilmentStatus?: string | null;
  /** `Upcoming | Past | PendingPayment`. */
  historyGroup?: string | null;
  pointsAppliedValue?: number;
}

/** `StorefrontOrderItemDto` — a charged retail line. */
export interface StorefrontOrderItemDto {
  itemType: string;
  quantity: number | null;
  unitPrice: number | null;
  amountIn: number;
  sku: string | null;
  /** The name as purchased. */
  name?: string | null;
  itemIndex?: number;
}

/** `StorefrontOrderSelectionDto` — one dish line of the placed box. */
export interface StorefrontOrderSelectionDto {
  productVariantId: string;
  quantity: number;
  sku: string;
  personalisationSummary: string | null;
  /** Which order item this dish sits under (an order may carry several boxes). */
  orderItemIndex?: number;
  /** The name as purchased, never refreshed from today's catalogue; null on a legacy snapshot. */
  name?: string | null;
  isSignature?: boolean | null;
}

/** `OrderDeliveryDto` (the parts the account reads). */
export interface StorefrontOrderDeliveryDto {
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postcode: string;
    countryCode: string;
  };
  deliveryDate: string;
  recipient?: { name: string; phone: string } | null;
  gift?: { hidePrices: boolean; includeGreetingCard: boolean; greetingCardMessage?: string | null } | null;
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
  paymentStatus?: string | null;
  delivery?: StorefrontOrderDeliveryDto | null;
  orderNumber?: string | null;
  discountCode?: string | null;
  fulfilmentStatus?: string | null;
  loyalty?: { redeemedPoints: number; appliedValue: number; earnedPoints: number | null; earningStatus: string } | null;
  giftCardPaid?: number;
  cardAmount?: number | null;
  refund?: { status: string; cashReturned: number; giftRestored: number; totalReturned: number } | null;
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
  /** The booked delivery day, `YYYY-MM-DD`. */
  deliveryDate?: string;
  isGift: boolean;
  /** `AT-10517`. Absent on an old order: nothing may stand in for it. */
  orderNumber?: string;
  /** Aonik's payment status (`Captured` once paid), when it sent one. */
  paymentStatus?: string;
  /** Aonik's own history grouping, when it sent one. */
  historyGroup?: 'Upcoming' | 'Past' | 'PendingPayment';
  /** Aonik's fulfilment status: `Confirmed | Cooking | OutForDelivery | Delivered | Cancelled`. */
  fulfilmentStatus?: string;
  /** The dishes, named as purchased. Empty when Aonik did not send them. */
  dishes: OrderDish[];
}

/** One dish of a placed box. */
export interface OrderDish {
  name: string;
  quantity: number;
  isSignature: boolean;
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
  /** The name as purchased. */
  name?: string;
  itemIndex?: number;
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
  orderItemIndex?: number;
  /** As purchased; absent on a legacy snapshot (nothing may be made up from the sku). */
  name?: string;
  isSignature?: boolean;
}

/** Where and when an order is delivered. */
export interface OrderDelivery {
  /** One line each, in order: `12 High Street`, `Dartford`, `DA1 1AA`. */
  addressLines: string[];
  deliveryDate: string;
  recipientName?: string;
  gift?: { hidePrices: boolean; includeGreetingCard: boolean; greetingCardMessage?: string };
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
  orderNumber?: string;
  paymentStatus?: string;
  fulfilmentStatus?: string;
  delivery?: OrderDelivery;
  discountCode?: string;
  /** Points redeemed on this order, and what they were worth. */
  loyalty?: { redeemedPoints: number; appliedValuePence: number; earnedPoints?: number; earningStatus: string };
  giftCardPaidPence: number;
  refund?: { status: string; totalReturnedPence: number };
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

const HISTORY_GROUPS = ['Upcoming', 'Past', 'PendingPayment'] as const;

export function mapOrderSummary(dto: StorefrontOrderSummaryDto): OrderSummary {
  return {
    orderId: dto.orderId,
    placedAtUtc: dto.placedAtUtc,
    status: dto.status,
    currency: dto.currency,
    totalPence: toPence(dto.total),
    boxSize: dto.boxSize ?? undefined,
    deliveryDate: dto.deliveryDate ?? undefined,
    isGift: dto.isGift === true,
    orderNumber: dto.orderNumber?.trim() || undefined,
    paymentStatus: dto.paymentStatus ?? undefined,
    historyGroup: HISTORY_GROUPS.find((group) => group === dto.historyGroup),
    fulfilmentStatus: dto.fulfilmentStatus ?? undefined,
    dishes: (dto.selections ?? []).flatMap(mapOrderDish),
  };
}

/** A selection with no purchased name is left out: a dish is never named from its sku. */
function mapOrderDish(dto: StorefrontOrderSelectionDto): OrderDish[] {
  const name = dto.name?.trim();
  return name ? [{ name, quantity: dto.quantity, isSignature: dto.isSignature === true }] : [];
}

export function mapOrderItem(dto: StorefrontOrderItemDto): OrderItem {
  return {
    itemType: dto.itemType,
    quantity: dto.quantity ?? undefined,
    unitPricePence: toPenceOrUndefined(dto.unitPrice),
    amountPence: toPence(dto.amountIn),
    sku: dto.sku ?? undefined,
    name: dto.name?.trim() || undefined,
    itemIndex: dto.itemIndex,
  };
}

export function mapOrderSelection(dto: StorefrontOrderSelectionDto): OrderSelection {
  return {
    productVariantId: dto.productVariantId,
    quantity: dto.quantity,
    sku: dto.sku,
    personalisationSummary: dto.personalisationSummary ?? undefined,
    orderItemIndex: dto.orderItemIndex,
    name: dto.name?.trim() || undefined,
    isSignature: dto.isSignature ?? undefined,
  };
}

function mapOrderDelivery(dto: StorefrontOrderDeliveryDto): OrderDelivery {
  const { address } = dto;
  return {
    addressLines: [address.line1, address.line2, address.city, address.region, address.postcode]
      .map((line) => line?.trim())
      .filter((line): line is string => Boolean(line)),
    deliveryDate: dto.deliveryDate,
    recipientName: dto.recipient?.name?.trim() || undefined,
    gift: dto.gift
      ? {
          hidePrices: dto.gift.hidePrices,
          includeGreetingCard: dto.gift.includeGreetingCard,
          greetingCardMessage: dto.gift.greetingCardMessage?.trim() || undefined,
        }
      : undefined,
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
    orderNumber: dto.orderNumber?.trim() || undefined,
    paymentStatus: dto.paymentStatus ?? undefined,
    fulfilmentStatus: dto.fulfilmentStatus ?? undefined,
    delivery: dto.delivery ? mapOrderDelivery(dto.delivery) : undefined,
    discountCode: dto.discountCode ?? undefined,
    loyalty: dto.loyalty
      ? {
          redeemedPoints: dto.loyalty.redeemedPoints,
          appliedValuePence: toPence(dto.loyalty.appliedValue),
          earnedPoints: dto.loyalty.earnedPoints ?? undefined,
          earningStatus: dto.loyalty.earningStatus,
        }
      : undefined,
    giftCardPaidPence: toPence(dto.giftCardPaid ?? 0),
    refund: dto.refund
      ? { status: dto.refund.status, totalReturnedPence: toPence(dto.refund.totalReturned) }
      : undefined,
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

export { formatOrderDate } from '@/lib/format';

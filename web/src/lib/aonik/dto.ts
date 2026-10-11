/**
 * Aonik commerce DTOs, exactly as the wire serves them.
 *
 * Transcribed from `Aonik.Commerce/Contracts/Models/Catalog/*` — the C# records
 * are the contract, and these mirror them field for field in camelCase (the API
 * registers no naming-policy override, so PascalCase records serialise camel).
 *
 * These types exist so `map.ts` can be type-checked against the real shapes
 * rather than against optimistic guesses. Nothing outside `lib/aonik/` imports
 * them: components see the frontend types.
 */

/* ---- Paging ---------------------------------------------------------------- */

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/* ---- Products -------------------------------------------------------------- */

/**
 * Browse row. Deliberately carries NO retail price — the brand rule "dishes
 * never show a standalone price" is enforced by the API shape itself.
 * `unitSurcharge` is the one price-like field: an on-top-of-the-box delta.
 */
export interface ProductSummaryDto {
  id: string;
  slug: string;
  name: string;
  status: string;
  kind: string;
  categoryId: string | null;
  variantCount: number;
  heroImageUrl: string | null;
  /** Already parsed by Aonik on this shape (unlike the detail read). */
  tags: string[];
  /** Raw JSON string — tenant-authored, no Aonik-enforced schema. */
  attributesJson: string;
  unitSurcharge: number | null;
  /*
   * Typed dish facts (michaeljosiah/aonik#359). Optional here because an
   * older Aonik does not send them; where a member is present it is
   * authoritative over `attributesJson`, and null means unknown — never a
   * cue to fall back to an attribute (Aonik withholds a stale figure as null).
   */
  description?: string;
  categoryName?: string | null;
  categorySlug?: string | null;
  /** 0–3: none, mild, medium, hot. */
  heat?: number | null;
  componentsLine?: string | null;
  lowSugar?: boolean | null;
  isPlaceholder?: boolean;
  heroImageAltText?: string | null;
  kcal?: number | null;
  proteinGrams?: number | null;
  fibreGrams?: number | null;
  servingLabel?: string | null;
}

export interface ProductMediaDto {
  id: string;
  url: string;
  kind: string;
  sortOrder: number;
  /** Authored alt text (aonik#359); null for older URL-authored media. */
  altText?: string | null;
}

export interface ProductVariantDto {
  id: string;
  productId: string;
  sku: string;
  name: string;
  optionsJson: string;
  weightGrams: number | null;
  isActive: boolean;
}

/** Full product detail. Note `tagsJson` is a STRING here, unlike the summary. */
export interface ProductDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: string;
  kind: string;
  categoryId: string | null;
  tagsJson: string;
  attributesJson: string;
  variants: ProductVariantDto[];
  media: ProductMediaDto[];
  effectiveOptionGroups: EffectiveOptionGroupDto[];
  unitSurcharge: number | null;
  unitSurchargeCurrency: string | null;
  /** Null when no default content block is authored. */
  content: ResolvedContentDto | null;
  /** The cache key to pass back as `v`. Null whenever `content` is null. */
  contentVersion: number | null;
  /* Typed dish facts (aonik#359) — as on `ProductSummaryDto`. */
  heat?: number | null;
  componentsLine?: string | null;
  lowSugar?: boolean | null;
  freezable?: boolean | null;
  shelfLife?: string | null;
  relatedCollectionSlug?: string | null;
  isPlaceholder?: boolean;
  categoryName?: string | null;
}

/* ---- Option groups (Spec 066) ---------------------------------------------- */

/** `"One"` or `"Multi"` — Aonik's own constants, not `single`/`multi`. */
export type OptionSelectionMode = 'One' | 'Multi';

export interface EffectiveOptionChoiceDto {
  key: string;
  label: string;
  note: string | null;
  /** ABSOLUTE price, never a delta. The delta is computed against the default. */
  price: number;
  sortOrder: number;
}

export interface EffectiveOptionGroupDto {
  key: string;
  label: string;
  helpText: string | null;
  selectionMode: OptionSelectionMode;
  currency: string;
  sortOrder: number;
  /** Non-nullable — a group always names its recommended default. */
  defaultChoiceKey: string;
  choices: EffectiveOptionChoiceDto[];
}

/* ---- Resolved content (Spec 067) — SAFETY-CRITICAL -------------------------- */

export interface NutritionDto {
  kcal: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  fibreGrams: number | null;
  sugarsGrams: number | null;
  saltGrams: number | null;
}

export interface HeatingStepDto {
  method: string;
  body: string;
}

/**
 * The resolution of one selection against a product's authored content.
 *
 * The three flags are not interchangeable and each gates something different:
 *
 * - `declarationsWithheld` — ingredients/allergens must NOT render, even if one
 *   of them arrives non-null (Aonik returns the authored half on the
 *   exact-variant path while still flagging the pair).
 * - `isStandardPreparation` — the figures shown are the DEFAULT block's because
 *   no variant was authored for this combination; they need a caption.
 * - `isStale` — the default block no longer describes the current standard
 *   preparation. Declarations are withheld, but figures ARE still served, so
 *   this must independently caption or suppress them.
 */
export interface ResolvedContentDto {
  servingLabel: string;
  nutrition: NutritionDto;
  ingredients: string | null;
  /** A single string, not an array. */
  allergens: string | null;
  declarationsWithheld: boolean;
  /** Never null — an empty list when withheld. */
  heating: HeatingStepDto[];
  heatingWithheld: boolean;
  isStandardPreparation: boolean;
  isStale: boolean;
  canonicalSelectionJson: string;
  matchedVariantSelectionJson: string | null;
  contentVersion: number;
  /**
   * The controlled declaration (aonik#351): the 14 groups by name, `[]` for a
   * reviewed list with none declared, null when unreviewed or withheld. Since
   * then `allergens` is derived from it. Optional: an older Aonik sends none.
   */
  allergensPresent?: string[] | null;
  /** The kitchen's own cross-contamination statement, as authored; null when withheld. */
  precautionaryStatement?: string | null;
}

/* ---- Facets & collections (Spec 070) --------------------------------------- */

export interface FacetOptionDto {
  /** Stable request token — submit this, never the label. */
  value: string;
  label: string;
  /** Range groups only: half-open band [min, max). */
  min: number | null;
  max: number | null;
}

export interface FacetGroupDto {
  id: string;
  key: string;
  label: string;
  matchKind: string;
  sourcePath: string | null;
  sortOrder: number;
  isActive: boolean;
  options: FacetOptionDto[];
}

export interface PublicCollectionDto {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  kind: string;
  sortOrder: number;
  /** Active members only, in curated rank order. */
  products: ProductSummaryDto[];
}

/* ---- Box plan (Spec 068) ---------------------------------------------------- */

export interface BoxPlanPresetDto {
  size: number;
  price: number;
  badge: string | null;
  blurb: string | null;
  /** Authored display saving — never computed. Presets only. */
  savingAmount: number | null;
  sortOrder: number;
}

export interface BoxPlanDto {
  bundleProductId: string;
  minSize: number;
  maxSize: number;
  baseSize: number;
  basePrice: number;
  perSpacePrice: number;
  currency: string;
  presets: BoxPlanPresetDto[];
}

/* ---- Box cart (Spec 068 + 071) ---------------------------------------------- */

/** `BoxDish` fills a slot and counts toward capacity; `AddOn` does neither. */
export type BoxLineKind = 'BoxDish' | 'AddOn';

export interface BoxLineDto {
  lineId: string;
  productId: string;
  variantId: string;
  name: string;
  quantity: number;
  /** The canonical Spec 066 selection — an object, never a string. */
  personalisation: Record<string, string | string[]> | null;
  personalisationSummary: string;
  isDefaultPersonalisation: boolean;
  /** Per unit, signed. */
  personalisationAdjustment: number;
  unitSurcharge: number;
  /** Empty GUID for add-ons — they fill no slot. */
  slotId: string;
  /** Flagged, never silently removed: adds reject, continue/checkout block. */
  isUnavailable: boolean;
  lineKind: BoxLineKind;
  /** Add-ons only: the retail unit price, the deliberate no-price-rule exception. */
  unitPrice: number | null;
}

export interface BoxDto {
  cartId: string;
  bundleProductId: string;
  size: number;
  currency: string;
  lines: BoxLineDto[];
}

export interface QuoteComponentDto {
  key: string;
  amount: number;
}

export interface LoyaltyQuoteDto {
  requestedPoints: number;
  maxRedeemablePoints: number;
  appliedPoints: number;
  appliedValue: number;
  estimatedEarnedPoints: number;
  balancePoints?: number | null;
  availablePoints?: number | null;
  reasonCode?: string | null;
  message?: string | null;
}

export interface GiftCardTenderQuoteDto {
  requestedAmount: number;
  maxRedeemableAmount: number;
  giftAmount: number;
  cardAmount: number;
  maskedCode?: string | null;
  reasonCode?: string | null;
}

export interface BoxQuoteDto {
  /** Ordered and additive — iterate, never reconstruct from known keys. */
  components: QuoteComponentDto[];
  /** Struck-through display value; NOT a component. */
  deliveryList: number;
  /** Guaranteed to equal the sum of components (invariant A24). */
  total: number;
  currency: string;
  /** BoxDish units only — an add-on never changes these three. */
  unitsSelected: number;
  boxSize: number;
  spacesLeft: number;
  isFull: boolean;
  /**
   * The code saved on the cart, its reduction and — when it no longer
   * applies — Aonik's typed reason (aonik#355). Null with no code.
   */
  discount?: DiscountCodeStatusDto | null;
  loyalty?: LoyaltyQuoteDto | null;
  giftCard?: GiftCardTenderQuoteDto | null;
}

export interface BoxChangeDto {
  lineId: string | null;
  group: string | null;
  from: string | null;
  to: string | null;
  reason: string;
  priceDelta: number | null;
  mergedIntoLineId: string | null;
}

export interface BoxCartDto {
  box: BoxDto;
  quote: BoxQuoteDto;
  changes: BoxChangeDto[];
  /** Disclosed EXACTLY ONCE, on creation. Never returned again. */
  cartToken: string | null;
  /**
   * The cart's row version (Aonik #347), on every box response. The next write
   * must send it as `X-Cart-Version`; it changes with every write.
   */
  cartVersion?: string;
  /**
   * `Open` while it can change; `CheckedOut` once it became an order, and
   * `Abandoned` once Aonik's sweeper expired it (an empty box after 24 hours
   * idle, a populated one after 7 days).
   */
  status?: string;
  /** The order it became — set once a checkout created one, paid or not yet. */
  orderId?: string | null;
  /** The saved checkout form (aonik#347): the same document the draft route answers. */
  checkoutDraft?: CheckoutDraftDto | null;
}

/* ---- Checkout (aonik#344–#347, #355) ------------------------------------------ */

export interface CheckoutContactDto {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface DeliveryAddressDto {
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postcode: string;
  countryCode: string;
}

export interface DeliveryRecipientDto {
  name: string;
  phone: string;
}

export interface CartGiftDraftDto {
  giftIntent: boolean;
  hidePrices: boolean;
  includeGreetingCard: boolean;
  greetingCardMessage: string | null;
}

/**
 * The checkout form as Aonik stores it on the cart. A FULL replacement on
 * save: a section left out or null clears what was saved, so a save echoes
 * every section it does not own.
 */
export interface CheckoutDraftDto {
  giftCardDraft?: import('../gifting/model').GiftDraft | null;
  purchaser?: CheckoutContactDto | null;
  address?: DeliveryAddressDto | null;
  recipient?: DeliveryRecipientDto | null;
  /** `YYYY-MM-DD`. Owned by the reservation route: a changed date reserves. */
  deliveryDate?: string | null;
  notes?: string | null;
  gift?: CartGiftDraftDto | null;
  createAccount?: boolean;
  discountCode?: string | null;
  acceptedTermsVersion?: string | null;
  requestedPoints?: number;
}

export interface CheckoutDraftResponseDto {
  cartId: string;
  cartVersion: string;
  status: string;
  orderId: string | null;
  draft: CheckoutDraftDto | null;
}

/** `Held`, `PaymentPending`, `Committed` or `Released`; a lapsed `Held` is expired. */
export interface DeliveryReservationDto {
  id: string;
  deliveryDate: string;
  status: string;
  selectedAtUtc: string;
  expiresAtUtc: string;
  paymentAttemptId: string | null;
  paymentStartedAtUtc: string | null;
  paymentDeadlineUtc: string | null;
  orderId: string | null;
}

export interface CartDeliveryReservationDto {
  cartId: string;
  cartVersion: string;
  serverNowUtc: string;
  reservation: DeliveryReservationDto | null;
}

/** One day of the bookable calendar: `available`, `fully_booked`, `no_delivery` or `unknown`. */
export interface DeliveryDateAvailabilityDto {
  deliveryDate: string;
  status: string;
}

/** `GET /commerce/config/delivery/dates` — a read; it reserves nothing. */
export interface DeliveryDatesDto {
  earliestDeliveryDate: string | null;
  timezone: string;
  fromDate: string;
  toDate: string;
  /** Available dates only. */
  dates: string[];
  availability?: DeliveryDateAvailabilityDto[] | null;
  serverNowUtc?: string | null;
}

export interface DiscountCodeStatusDto {
  code: string;
  amount: number;
  reasonCode?: string | null;
  message?: string | null;
}

/** The discount routes' answer: the cart's totals with the code, and its new version. */
export interface CartDiscountQuoteDto {
  cartId: string;
  cartVersion: string;
  currency: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  deliveryTotal: number;
  total: number;
  discount: DiscountCodeStatusDto | null;
}

/* ---- Extras rail (Spec 071) -------------------------------------------------- */

export interface ExtraRowDto {
  productId: string;
  productVariantId: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  tags: string[];
  attributesJson: string | null;
  /** Real retail price — the deliberate exception to the no-price rule. */
  unitPrice: number;
  unitSurcharge: number | null;
  currency: string;
  content: ResolvedContentDto | null;
  optionGroups: EffectiveOptionGroupDto[];
}

/** `skipped` counts unpriceable rows — an operator signal, never shown to customers. */
export interface ExtrasListDto {
  rows: ExtraRowDto[];
  skipped: number;
}

/* ---- Checkout (Spec 068) ----------------------------------------------------- */

/**
 * `POST /commerce/carts/{cartId}/checkout`.
 *
 * The two required fields are `provider` and `paymentMethodType`. Aonik only
 * checks they are non-empty — the vocabulary is the tenant's payment
 * configuration, not a closed enum this storefront can validate.
 */
export interface CheckoutRequestDto {
  provider: string;
  paymentMethodType: string;
  returnUrl?: string;
  cancelUrl?: string;
  customerAccountId?: string;
  discountCode?: string;
}

/**
 * The order that now exists. `clientSecret` (embedded PSP) and `checkoutUrl`
 * (redirect PSP) are the payment handoff — already on the wire, deliberately
 * unused in this iteration, which is what makes the PSP journey a later
 * addition rather than a reshaping.
 */
export interface CheckoutResultDto {
  orderId: string;
  invoiceId: string | null;
  paymentIntentId: string;
  paymentStatus: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  clientSecret: string | null;
  checkoutUrl: string | null;
  /** A guest's read capability for this order (`X-Order-Token`); null for a party-owned cart. */
  guestOrderToken?: string | null;
}

/** `GET /commerce/carts/{id}/payment` — the recorded attempt, read without side effects. */
export interface CartPaymentStateDto {
  orderId: string | null;
  paymentIntentId: string | null;
  /** `processing`, `requires_action`, `failed`, `cancelled` or `succeeded`. */
  status: string;
  /** Recovery proved the attempt closed unpaid: the box may change and pay again. */
  canEdit: boolean;
  cartVersion: string;
  /** Present only while the attempt can still take payment, before its deadline. */
  checkoutUrl?: string | null;
}

export interface OrderLoyaltyDto {
  redeemedPoints: number;
  appliedValue: number;
  earnedPoints: number | null;
  /** `Earned`, `AccountSetupRequired` or `AccountNotLinked`. */
  earningStatus: string;
}

/** `GET /commerce/storefront/guest-orders/{id}` (X-Order-Token) or `/commerce/storefront/orders/{id}`. */
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
  items: Array<{
    itemType: string;
    quantity: number | null;
    unitPrice: number | null;
    amountIn: number;
    sku: string | null;
    name?: string | null;
    itemIndex?: number;
  }>;
  selections: Array<{
    productVariantId: string;
    quantity: number;
    sku: string;
    personalisationSummary: string | null;
    orderItemIndex?: number;
    name?: string | null;
    isSignature?: boolean | null;
  }>;
  paymentStatus: string;
  delivery?: {
    purchaser: CheckoutContactDto;
    address: DeliveryAddressDto;
    deliveryDate: string;
    timezone: string;
    recipient: DeliveryRecipientDto;
    notes?: string | null;
  } | null;
  orderNumber?: string | null;
  discountCode?: string | null;
  fulfilmentStatus?: string | null;
  loyalty?: OrderLoyaltyDto | null;
}

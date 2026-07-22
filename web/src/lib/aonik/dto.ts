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
}

export interface ProductMediaDto {
  id: string;
  url: string;
  kind: string;
  sortOrder: number;
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
}

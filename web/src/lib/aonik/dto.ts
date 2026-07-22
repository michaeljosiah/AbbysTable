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

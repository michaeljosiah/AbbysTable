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

import type {
  BoxCartDto,
  CheckoutResultDto,
  ExtraRowDto,
  BoxChangeDto,
  BoxLineDto,
  BoxPlanDto,
  BoxQuoteDto,
  EffectiveOptionGroupDto,
  FacetGroupDto,
  NutritionDto,
  ProductDto,
  ProductSummaryDto,
  ResolvedContentDto,
} from './dto';
import { EXTRA_CATEGORIES, HEAT_STEPS } from './types';
import type {
  BoxOffer,
  Dish,
  DishContentState,
  DishNutrition,
  DishOption,
  HeatingInstruction,
  HeatLevel,
  PersonalisationOption,
  PersonalisationOptions,
  StorefrontBoxPlan,
  StorefrontConfig,
  Extra,
  ExtraCategory,
  ExtraServeStyle,
} from './types';

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
/* Tolerant JSON parsing                                                       */
/* -------------------------------------------------------------------------- */

/**
 * `attributesJson` / `tagsJson` are free-form strings with no Aonik-enforced
 * schema. Aonik's own summary mapper degrades a malformed row to empty rather
 * than failing the read, and so do we: one badly-authored product must not take
 * the menu down.
 */
function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Resolved content (Spec 067) — SAFETY-CRITICAL                               */
/* -------------------------------------------------------------------------- */

/**
 * Nutrition figures. A null is "not published" and stays absent — never zero,
 * never inferred.
 *
 * Every figure keeps its absence — none is defaulted to 0, because a nutrition
 * panel is read as a claim about the food and "0g of fibre" is a different
 * statement from "we have not published the fibre figure".
 */
export function mapNutrition(dto: NutritionDto): DishNutrition {
  return {
    proteinGrams: dto.proteinGrams ?? undefined,
    fibreGrams: dto.fibreGrams ?? undefined,
    carbsGrams: dto.carbsGrams ?? undefined,
    fatGrams: dto.fatGrams ?? undefined,
    calories: dto.kcal ?? undefined,
    sugarsGrams: dto.sugarsGrams ?? undefined,
    saltGrams: dto.saltGrams ?? undefined,
  };
}

/**
 * The one place declarations are allowed through.
 *
 * SAFETY — do not "simplify" this into a null check. Aonik sets
 * `declarationsWithheld` whenever EITHER half is unauthored, and on the
 * exact-variant path it still returns the half that IS authored. Gating on
 * presence would render the ingredients and silently drop the allergen line,
 * which Aonik's own source calls "the dangerous half".
 *
 * Clearing both here means every consumer — including one that only checks
 * presence — is safe by construction. That redundancy is the point.
 */
export function mapResolvedContent(dto: ResolvedContentDto): {
  nutrition: DishNutrition;
  ingredients?: string;
  allergens?: string;
  heating: HeatingInstruction[];
  state: DishContentState;
} {
  const withheld = dto.declarationsWithheld;

  return {
    nutrition: mapNutrition(dto.nutrition),
    ingredients: withheld ? undefined : (dto.ingredients ?? undefined),
    allergens: withheld ? undefined : (dto.allergens ?? undefined),
    // Heating is never null on the wire — an empty list when withheld.
    heating: dto.heatingWithheld ? [] : dto.heating.map((step) => ({ ...step })),
    state: {
      servingLabel: dto.servingLabel,
      declarationsWithheld: withheld,
      figuresAreStandardPreparation: dto.isStandardPreparation,
      figuresAreStale: dto.isStale,
      heatingWithheld: dto.heatingWithheld,
      heating: dto.heatingWithheld ? [] : dto.heating.map((step) => ({ ...step })),
      contentVersion: dto.contentVersion,
    },
  };
}

/**
 * Whether the nutrition panel must be captioned rather than presented as
 * current fact, and why. Either flag alone is sufficient.
 */
export function nutritionCaptionKind(
  state: DishContentState | undefined,
): 'standard-preparation' | 'stale' | undefined {
  if (!state) return undefined;
  if (state.figuresAreStandardPreparation) return 'standard-preparation';
  if (state.figuresAreStale) return 'stale';
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Option groups (Spec 066)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One personalisation group, with prices converted to the DELTA the UI shows.
 *
 * Aonik serves absolute choice prices; the storefront displays the difference
 * from the group's `defaultChoiceKey`. For a `Multi` group the committed
 * adjustment subtracts the default ONCE across the whole selection (matching
 * `OptionSelectionService`), so these per-choice deltas are label figures — the
 * authoritative total comes from the selection-quote endpoint.
 */
export interface MappedOptionGroup {
  key: string;
  label: string;
  helpText?: string;
  /** `One` accepts a bare string; `Multi` REQUIRES an array (a string is rejected). */
  selectionMode: 'One' | 'Multi';
  defaultChoiceKey: string;
  choices: DishOption[];
}

/**
 * A dish's own option groups → the shape the personaliser renders.
 *
 * The checkout UI was built against `PersonalisationOptions`, a catalogue-wide
 * set, but Aonik has no such concept: groups are attached per product, with a
 * per-product default. So the storefront asked for catalogue-wide options, got
 * the honest empty answer, and rendered four headings with no choices under
 * them — the personaliser was never connected to the real data.
 *
 * This adapts one to the other, per dish, so the dialog offers exactly what the
 * dish offers. A dish missing a group yields an empty array for it, which the
 * renderer now omits.
 *
 * Heat is keyed by step (`"0"`–`"3"`), matching `HEAT_STEPS` and what
 * `personalisationToSelection` encodes back.
 */
export function optionGroupsToPersonalisation(
  groups: MappedOptionGroup[],
): PersonalisationOptions {
  const choicesFor = (key: string) => groups.find((group) => group.key === key)?.choices ?? [];

  return {
    portions: choicesFor('portion'),
    proteins: choicesFor('protein'),
    // `KNOWN_GROUP_KEYS` accepts either spelling; Aonik's own key is singular.
    sides: choicesFor('side').length > 0 ? choicesFor('side') : choicesFor('sides'),
    heatLevels: choicesFor('heat')
      .map((choice) => ({ label: choice.label, step: Number(choice.key) }))
      .filter((level) => Number.isFinite(level.step)),
  };
}

export function mapOptionGroup(dto: EffectiveOptionGroupDto): MappedOptionGroup {
  const basePrice =
    dto.choices.find((choice) => choice.key === dto.defaultChoiceKey)?.price ?? 0;

  const choices = [...dto.choices]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((choice) => ({
      key: choice.key,
      label: choice.label,
      detail: choice.note ?? undefined,
      pricePence: toPence(choice.price - basePrice),
      isAbbysChoice: choice.key === dto.defaultChoiceKey,
    }));

  return {
    key: dto.key,
    label: dto.label,
    helpText: dto.helpText ?? undefined,
    selectionMode: dto.selectionMode,
    defaultChoiceKey: dto.defaultChoiceKey,
    choices,
  };
}

/** An empty list means "not personalisable" — hide the panel, never render an empty one. */
export function mapOptionGroups(dtos: EffectiveOptionGroupDto[]): MappedOptionGroup[] {
  return [...dtos].sort((a, b) => a.sortOrder - b.sortOrder).map(mapOptionGroup);
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

/* -------------------------------------------------------------------------- */
/* Box plan (Spec 068)                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The full box-plan read. Unlike the config document's embedded copy this
 * carries the formula inputs, so a custom size can be priced as
 * `basePrice + (size - baseSize) * perSpacePrice`, with presets overriding at
 * their own size.
 *
 * Still no list price: `savingAmount` is authored per preset and there is no
 * equivalent for a custom size anywhere in the plan.
 */
export interface MappedBoxPlan {
  bundleProductId: string;
  minSize: number;
  maxSize: number;
  baseSize: number;
  basePence: number;
  perSpacePence: number;
  currency: string;
  offers: BoxOffer[];
}

export function mapBoxPlan(dto: BoxPlanDto): MappedBoxPlan {
  const offers = [...dto.presets]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((preset) => ({
      id: `box-${preset.size}`,
      name: `${preset.size}-dish box`,
      dishCount: preset.size,
      pricePence: toPence(preset.price),
      badge: preset.badge ?? undefined,
      blurb: preset.blurb ?? undefined,
      savingPence: toPenceOrUndefined(preset.savingAmount),
    }));

  return {
    bundleProductId: dto.bundleProductId,
    minSize: dto.minSize,
    maxSize: dto.maxSize,
    baseSize: dto.baseSize,
    basePence: toPence(dto.basePrice),
    perSpacePence: toPence(dto.perSpacePrice),
    currency: dto.currency,
    offers,
  };
}

/** Plan price for any size: the formula, with an authored preset winning at its size. */
export function boxPlanPricePence(plan: MappedBoxPlan, size: number): number {
  const preset = plan.offers.find((offer) => offer.dishCount === size);
  if (preset) return preset.pricePence;
  return plan.basePence + (size - plan.baseSize) * plan.perSpacePence;
}

/* -------------------------------------------------------------------------- */
/* Facets (Spec 070)                                                           */
/* -------------------------------------------------------------------------- */

export interface MappedFacetOption {
  /** Stable token submitted back as `facet.<key>=<value>`. Never the label. */
  value: string;
  label: string;
}

export interface MappedFacetGroup {
  key: string;
  label: string;
  options: MappedFacetOption[];
}

/**
 * Facet groups drive the menu's filter rail, so the tenant can add, rename or
 * retire a filter with no frontend change. Aonik rejects unknown keys/values
 * with a 400, which is why the UI must only ever submit what this read returned.
 */
export function mapFacetGroups(dtos: FacetGroupDto[]): MappedFacetGroup[] {
  return [...dtos]
    .filter((group) => group.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((group) => ({
      key: group.key,
      label: group.label,
      options: group.options.map((option) => ({ value: option.value, label: option.label })),
    }));
}

/* -------------------------------------------------------------------------- */
/* Products → Dish                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The `attributesJson` keys this storefront reads.
 *
 * Aonik enforces NO schema here beyond "must be a JSON object" — these are a
 * tenant convention, documented in SPEC-2026-07-22-catalog-browse § Operator
 * data and nowhere else. A product missing a key simply does not match that
 * filter and renders without that label; nothing is inferred.
 */
interface DishAttributes {
  heatStep?: number;
  protein?: string;
  meal?: string;
  wellness?: string[];
  dietary?: string[];
  /**
   * Browse rows carry no nutrition at all (Aonik's summary DTO has no such
   * field), so the menu card's "… · 520 kcal · 32g protein" meta line can only
   * come from attributes. Absent means the card omits that part rather than
   * showing a zero.
   */
  kcal?: number;
  proteinGrams?: number;
  fibreGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
}

function readAttributes(attributesJson: string): DishAttributes {
  const raw = parseJsonObject(attributesJson);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const strArray = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;

  return {
    heatStep: num(raw.heatStep),
    protein: str(raw.protein),
    meal: str(raw.meal),
    wellness: strArray(raw.wellness),
    dietary: strArray(raw.dietary),
    kcal: num(raw.kcal),
    proteinGrams: num(raw.proteinGrams),
    fibreGrams: num(raw.fibreGrams),
    carbsGrams: num(raw.carbsGrams),
    fatGrams: num(raw.fatGrams),
  };
}

/** `HEAT_STEPS` in reverse: 1→low, 2→medium, 3→high. Anything else is medium. */
function heatFromStep(step: number | undefined): HeatLevel {
  const match = (Object.entries(HEAT_STEPS) as [HeatLevel, number][]).find(
    ([, value]) => value === step,
  );
  return match?.[0] ?? 'medium';
}

/**
 * A browse row → the `Dish` the menu grid renders.
 *
 * LOSSY BY CONSTRUCTION. A summary carries no description, no content and no
 * nutrition — only the detail read has those. Fields that cannot be sourced are
 * left empty rather than invented: `description` is blank, `nutrition` carries
 * only what `attributesJson` published, and `ingredients`/`allergens` are always
 * absent (declarations come exclusively from a content resolution, never from a
 * browse row).
 */
export function mapSummaryToDish(dto: ProductSummaryDto): Dish {
  const attributes = readAttributes(dto.attributesJson);

  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.name,
    description: '',
    imageUrl: dto.heroImageUrl ?? '',
    heat: heatFromStep(attributes.heatStep),
    tags: dto.tags,
    isSignature: dto.unitSurcharge !== null,
    upgradePence: toPenceOrUndefined(dto.unitSurcharge),
    nutrition: {
      proteinGrams: attributes.proteinGrams,
      fibreGrams: attributes.fibreGrams,
      carbsGrams: attributes.carbsGrams,
      fatGrams: attributes.fatGrams,
      calories: attributes.kcal,
    },
    // Which groups a product offers is on the detail read; a card never needs it.
    personalisation: [],
    // Membership of the `featured` collection decides this, not a product flag.
    isFeatured: false,
    proteinType: attributes.protein as Dish['proteinType'],
    mealType: attributes.meal as Dish['mealType'],
    wellness: (attributes.wellness ?? []) as Dish['wellness'],
    dietary: (attributes.dietary ?? []) as Dish['dietary'],
  };
}

/** The four personalisation groups this storefront knows how to render. */
const KNOWN_GROUP_KEYS: Record<string, PersonalisationOption> = {
  portion: 'portion',
  protein: 'protein',
  side: 'sides',
  sides: 'sides',
  heat: 'heat',
};

/**
 * A product detail read → a fully-populated `Dish`.
 *
 * Declarations pass through `mapResolvedContent`, which is the only path that
 * may emit them — see its note. A product with no authored content block
 * (`content: null`) yields a dish with no declarations and no `contentState`,
 * which renders the same explicit "not yet published" state as a withheld one.
 */
export function mapProductToDish(dto: ProductDto): Dish {
  const attributes = readAttributes(dto.attributesJson);
  const content = dto.content ? mapResolvedContent(dto.content) : null;
  const tags = parseJsonStringArray(dto.tagsJson);

  const personalisation = dto.effectiveOptionGroups
    .map((group) => KNOWN_GROUP_KEYS[group.key])
    .filter((value): value is PersonalisationOption => value !== undefined);

  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.name,
    description: dto.description,
    imageUrl: [...dto.media].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? '',
    heat: heatFromStep(attributes.heatStep),
    tags,
    isSignature: dto.unitSurcharge !== null,
    upgradePence: toPenceOrUndefined(dto.unitSurcharge),
    nutrition: content?.nutrition ?? {
      proteinGrams: attributes.proteinGrams,
      fibreGrams: attributes.fibreGrams,
      carbsGrams: attributes.carbsGrams,
      fatGrams: attributes.fatGrams,
      calories: attributes.kcal,
    },
    personalisation: [...new Set(personalisation)],
    isFeatured: false,
    proteinType: attributes.protein as Dish['proteinType'],
    mealType: attributes.meal as Dish['mealType'],
    wellness: (attributes.wellness ?? []) as Dish['wellness'],
    dietary: (attributes.dietary ?? []) as Dish['dietary'],
    ingredients: content?.ingredients,
    allergens: content?.allergens,
    contentState: content?.state,
  };
}

/** Heating for a dish page: authored steps when present, else the caller's fallback. */
export function mapProductHeating(dto: ProductDto): HeatingInstruction[] {
  return dto.content ? mapResolvedContent(dto.content).heating : [];
}

/* -------------------------------------------------------------------------- */
/* Box cart (Spec 068 + 071)                                                   */
/* -------------------------------------------------------------------------- */

/** One line in the box, pence-mapped. */
export interface BoxLine {
  lineId: string;
  productId: string;
  variantId: string;
  name: string;
  quantity: number;
  /** The canonical selection, as Aonik stored it. */
  personalisation?: PersonalisationSelection;
  /** Aonik's own human summary — no need to re-derive it from option labels. */
  personalisationSummary: string;
  isDefaultPersonalisation: boolean;
  /** Per unit, signed. */
  personalisationAdjustmentPence: number;
  unitSurchargePence: number;
  /** Add-ons only. */
  unitPricePence?: number;
  kind: 'BoxDish' | 'AddOn';
  /** Blocks continue and checkout until the customer resolves it. */
  isUnavailable: boolean;
}

export interface BoxQuoteComponent {
  key: string;
  amountPence: number;
}

export interface BoxQuote {
  /** Ordered and additive. Render by iterating; never sum these to show a total. */
  components: BoxQuoteComponent[];
  deliveryListPence: number;
  /** Aonik guarantees this equals Σ components (A24) — display it verbatim. */
  totalPence: number;
  currency: string;
  /** BoxDish units only; add-ons never move these. */
  unitsSelected: number;
  boxSize: number;
  spacesLeft: number;
  isFull: boolean;
}

export interface BoxChange {
  lineId?: string;
  group?: string;
  from?: string;
  to?: string;
  reason: string;
  priceDeltaPence?: number;
  mergedIntoLineId?: string;
}

export interface BoxCart {
  cartId: string;
  bundleProductId: string;
  size: number;
  currency: string;
  lines: BoxLine[];
  quote: BoxQuote;
  changes: BoxChange[];
}

export function mapBoxLine(dto: BoxLineDto): BoxLine {
  return {
    lineId: dto.lineId,
    productId: dto.productId,
    variantId: dto.variantId,
    name: dto.name,
    quantity: dto.quantity,
    personalisation: dto.personalisation ?? undefined,
    personalisationSummary: dto.personalisationSummary,
    isDefaultPersonalisation: dto.isDefaultPersonalisation,
    personalisationAdjustmentPence: toPence(dto.personalisationAdjustment),
    unitSurchargePence: toPence(dto.unitSurcharge),
    unitPricePence: toPenceOrUndefined(dto.unitPrice),
    kind: dto.lineKind,
    isUnavailable: dto.isUnavailable,
  };
}

export function mapBoxQuote(dto: BoxQuoteDto): BoxQuote {
  return {
    // Order is Aonik's and meaningful; do not sort.
    components: dto.components.map((component) => ({
      key: component.key,
      amountPence: toPence(component.amount),
    })),
    deliveryListPence: toPence(dto.deliveryList),
    totalPence: toPence(dto.total),
    currency: dto.currency,
    unitsSelected: dto.unitsSelected,
    boxSize: dto.boxSize,
    spacesLeft: dto.spacesLeft,
    isFull: dto.isFull,
  };
}

export function mapBoxChange(dto: BoxChangeDto): BoxChange {
  return {
    lineId: dto.lineId ?? undefined,
    group: dto.group ?? undefined,
    from: dto.from ?? undefined,
    to: dto.to ?? undefined,
    reason: dto.reason,
    priceDeltaPence: toPenceOrUndefined(dto.priceDelta),
    mergedIntoLineId: dto.mergedIntoLineId ?? undefined,
  };
}

/**
 * Drops an "unavailable" change that the very same payload contradicts.
 *
 * Aonik's add-extra response reports the add-on it just created as unavailable
 * — `changes: [{lineId, reason: "unavailable"}]` with `isUnavailable: true` on
 * the line — while an immediate `GET` of that same cart returns
 * `isUnavailable: false` and no changes, for an extra with ~500 in stock.
 * Verified against a local Aonik: same cart, same second, opposite answers.
 *
 * That contradiction is not information, so it is not surfaced as an alarm. The
 * line's own flag wins because the rest of the UI already trusts it —
 * `hasUnavailableLine` gates continue and checkout off exactly that field — so
 * honouring the change here would have the notices and the blocking logic
 * disagree about the same box.
 *
 * Deliberately narrow: only a change whose line is PRESENT and says it is
 * available is dropped. A change about a line that is gone, or one the box
 * agrees is unavailable, passes through untouched.
 */
function withoutContradictedUnavailability(
  changes: BoxChange[],
  lines: BoxLine[],
): BoxChange[] {
  return changes.filter((change) => {
    if (change.reason !== 'unavailable' || !change.lineId) return true;
    const line = lines.find((candidate) => candidate.lineId === change.lineId);
    return line ? line.isUnavailable : true;
  });
}

/** Every mutation returns the whole box; the provider replaces state wholesale. */
export function mapBoxCart(dto: BoxCartDto): BoxCart {
  const lines = dto.box.lines.map(mapBoxLine);

  return {
    cartId: dto.box.cartId,
    bundleProductId: dto.box.bundleProductId,
    size: dto.box.size,
    currency: dto.box.currency,
    lines,
    quote: mapBoxQuote(dto.quote),
    changes: withoutContradictedUnavailability(dto.changes.map(mapBoxChange), lines),
  };
}

/* -------------------------------------------------------------------------- */
/* Personalisation encoding (Spec 066 §7)                                      */
/* -------------------------------------------------------------------------- */

/**
 * A selection keyed by option-group key.
 *
 * A `One` group's value is a bare string; a `Multi` group's is an ARRAY, and
 * Aonik rejects a bare string on a multi group with rule `V5` rather than
 * wrapping it. That asymmetry is why this is a union rather than `string[]`
 * everywhere.
 */
export type PersonalisationSelection = Record<string, string | string[]>;

/**
 * Encodes a UI selection for the cart, driven by the product's own groups.
 *
 * Rules this enforces so Aonik never has to reject us:
 *  - a `Multi` group always emits an array, even for one choice;
 *  - a `One` group always emits a bare string;
 *  - groups the product does not offer are dropped rather than sent;
 *  - an all-defaults selection encodes to `undefined`, which Aonik reads as
 *    "the defaults" and flags `isDefaultPersonalisation` on the line.
 */
export function encodeSelection(
  groups: MappedOptionGroup[],
  chosen: Record<string, string | string[] | undefined>,
): PersonalisationSelection | undefined {
  const selection: PersonalisationSelection = {};
  let differsFromDefault = false;

  for (const group of groups) {
    const raw = chosen[group.key];
    const values = (Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]).filter(Boolean);
    if (values.length === 0) continue;

    const isDefault = values.length === 1 && values[0] === group.defaultChoiceKey;
    if (!isDefault) differsFromDefault = true;

    selection[group.key] = group.selectionMode === 'Multi' ? values : values[0];
  }

  return differsFromDefault ? selection : undefined;
}

/** Reads a stored selection back into UI state, tolerating either encoding. */
export function decodeSelection(
  selection: PersonalisationSelection | undefined,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(selection ?? {})) {
    out[key] = Array.isArray(value) ? value : [value];
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Checkout (Spec 068)                                                         */
/* -------------------------------------------------------------------------- */

export interface CheckoutResult {
  orderId: string;
  invoiceId?: string;
  paymentIntentId: string;
  /** Aonik's own vocabulary, e.g. "RequiresPaymentMethod" — not branched on here. */
  paymentStatus: string;
  subtotalPence: number;
  discountTotalPence: number;
  taxTotalPence: number;
  totalPence: number;
  currency: string;
  /**
   * The payment handoff, carried through unused. See `CheckoutResultDto`.
   * SECURITY: `clientSecret` authorizes a payment attempt — it must never be
   * logged, stored, or put anywhere a later reader could retrieve it.
   */
  clientSecret?: string;
  checkoutUrl?: string;
}

export function mapCheckoutResult(dto: CheckoutResultDto): CheckoutResult {
  return {
    orderId: dto.orderId,
    invoiceId: dto.invoiceId ?? undefined,
    paymentIntentId: dto.paymentIntentId,
    paymentStatus: dto.paymentStatus,
    subtotalPence: toPence(dto.subtotal),
    discountTotalPence: toPence(dto.discountTotal),
    taxTotalPence: toPence(dto.taxTotal),
    totalPence: toPence(dto.total),
    currency: dto.currency,
    clientSecret: dto.clientSecret ?? undefined,
    checkoutUrl: dto.checkoutUrl ?? undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Extras rail (Spec 071 §4)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Tenant-authored presentation fields on an extra, read out of `attributesJson`.
 *
 * Aonik enforces no schema here, so every field is treated as absent-until-
 * proven and nothing is inferred from another. An unrecognised `category`
 * lands the row in "Sides" rather than dropping it — a mis-filed extra is a
 * merchandising annoyance; a disappearing one is a lost sale nobody can explain.
 */
interface ExtraAttributes {
  category?: string;
  longDescription?: string;
  serveStyle?: string;
  heating?: string;
}

function parseExtraAttributes(json: string | null): ExtraAttributes {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null ? (parsed as ExtraAttributes) : {};
  } catch {
    return {};
  }
}

function extraCategory(value: string | undefined): ExtraCategory {
  return (EXTRA_CATEGORIES as readonly string[]).includes(value ?? '')
    ? (value as ExtraCategory)
    : 'Sides';
}

function extraServeStyle(value: string | undefined): ExtraServeStyle {
  return value === 'hot' || value === 'chilled' || value === 'ambient' ? value : 'ambient';
}

/**
 * Splits an allergen declaration into the chips the modal renders.
 *
 * Returns undefined for an ABSENT declaration and `[]` only for one that was
 * made and listed nothing. The distinction is the whole point: see `Extra`.
 */
function splitAllergens(declaration: string | undefined): string[] | undefined {
  if (declaration === undefined) return undefined;
  const parts = declaration
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
  // "None" is a real declaration of no allergens, not a missing one.
  if (parts.length === 1 && /^none$/i.test(parts[0])) return [];
  return parts;
}

/**
 * One extras-rail row.
 *
 * `id` is the VARIANT id, not the product id, because that is what the cart
 * posts as `productVariantId` when the customer adds it. Getting this wrong
 * fails at add time with a validation error rather than here.
 */
export function mapExtraRow(dto: ExtraRowDto): Extra {
  const attributes = parseExtraAttributes(dto.attributesJson);
  const content = dto.content ? mapResolvedContent(dto.content) : undefined;
  const groups = mapOptionGroups(dto.optionGroups);
  const group = groups[0];

  return {
    id: dto.productVariantId,
    name: dto.name,
    category: extraCategory(attributes.category),
    pricePence: toPence(dto.unitPrice),
    description: dto.description ?? '',
    longDescription: attributes.longDescription ?? dto.description ?? '',
    imageUrl: dto.imageUrl ?? '',
    option: group
      ? {
          kind: group.label,
          choices: group.choices.map((choice) => ({
            key: choice.key,
            label: choice.label,
            addPence: choice.pricePence,
          })),
        }
      : undefined,
    nutrition: content?.nutrition ?? {},
    // SAFETY: `mapResolvedContent` has already cleared both when Aonik withheld
    // them, so absence here always means "not declared".
    ingredients: content?.ingredients,
    allergens: splitAllergens(content?.allergens),
    serveStyle: extraServeStyle(attributes.serveStyle),
    heating: content?.heating.map((step) => step.body).join(' ') || (attributes.heating ?? ''),
  };
}

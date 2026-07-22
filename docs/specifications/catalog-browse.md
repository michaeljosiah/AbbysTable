---
spec_id: SPEC-2026-07-22-catalog-browse
title: Menu, homepage rails & dish detail on the live Aonik catalog
status: draft
branch: feat/catalog-browse
owner: michaeljosiah
capabilities: [catalog-browse, dish-detail]
created: 2026-07-22
updated: 2026-07-22
---

# Menu, homepage rails & dish detail on the live Aonik catalog

> **Verified 2026-07-22** against Aonik specs 066/067/070 and the shipped
> `Aonik.Commerce` implementation. Where the two disagreed, the code won. Two corrections
> here are safety-relevant and were wrong in the first draft: `isStale` is NOT a synonym for
> `declarationsWithheld` (FR-4 rule 4), and `declarationsWithheld` must be branched on the
> flag rather than on null-ness (rule 2). A third removes the custom-size list price, which
> has no source in the box plan (FR-6).

## Why

The homepage, `/menu` and `/menu/[slug]` render from `DISH_FIXTURES`. Aonik now serves every
piece of that data live: enriched browse rows with facet filtering (Spec 070), curated
collections for the rails (070), option-dependent product content — nutrition, ingredients,
allergens, heating — with an exact-authored-or-withheld safety rule (067), effective
personalisation option groups (066), and the box plan that prices Step 1 (068). This spec
maps each fixture-backed read onto its real endpoint and pins the safety-critical behaviours
(allergen display, "standard preparation" captioning) the frontend already promises in its
own comments.

Depends on: `SPEC-2026-07-22-aonik-transport`.

## What changes

- MODIFIED catalog-browse — `getDishes` / `getFeaturedDishes` / `getBoxOffers` /
  `getBoxPricing` / `getPersonalisationOptions` / `getHeatingInstructions` read live Aonik
  data (breaking: no — mapped onto the existing frontend types)
- MODIFIED dish-detail — `getDishBySlug` composes the product read with resolved content;
  allergens/ingredients render only when Aonik's `declarationsWithheld` flag is false, and
  `isStale` independently captions the nutrition panel (FR-4)
- ADDED catalog-browse — menu facet filters drive the browse endpoint's `facet.*`
  parameters instead of client-side filtering (FR-2)
- MODIFIED catalog-browse — the struck-through list price at custom box sizes is REMOVED
  (breaking: yes, visible — the box plan has no custom-size list price to source it from;
  see FR-6)
- ADDED catalog-browse — operator-data appendix: the facet groups, collections and
  attributes AbbysTable's menu expects the tenant to author (§ Design)

---

## Requirements

### Requirement: Catalogue list and paging
`capability: catalog-browse` · `delta: MODIFIED (feat/catalog-browse)`

The system SHALL read the menu from `GET /commerce/catalog/products` (anonymous). The
response is a paged envelope `{ items, totalCount, page, pageSize }` of product summary
rows: `{ id, slug, name, status, kind, categoryId?, variantCount, heroImageUrl?, tags[],
attributesJson, unitSurcharge? }`. Page size comes from the storefront config document's
`resultsPageSize`. Summary rows deliberately carry **no retail price** — the brand rule
"dishes never show a standalone price" is enforced by the API shape; `unitSurcharge` is the
one price-like field (an on-top-of-the-box delta) and maps to `Dish.upgradePence`.

#### Scenario: Menu grid renders from live rows
- **WHEN** `/menu` renders with the HTTP client active
- **THEN** each card shows name, hero image, tags and (when present) the signature
  upgrade from `unitSurcharge`
- **AND** no card shows a standalone dish price

#### Scenario: Display metadata rides attributesJson
- **WHEN** a product's `attributesJson` carries the storefront attribute contract
  (heat step, protein type, meal type — see Design § Operator data)
- **THEN** the card renders its heat label and the filters can match it
- **AND** a product missing an attribute simply does not match that filter (the fixtures'
  existing rule for carried-over dishes)

### Requirement: Facet-driven filtering
`capability: catalog-browse` · `delta: ADDED (feat/catalog-browse)`

The system SHALL translate the menu's filter UI into browse query parameters:
`facet.<key>=value1,value2` (repeatable; values are option tokens, never labels), combined
by Aonik as OR-within-a-group, AND-across-groups. Available groups and their options SHALL
be read from `GET /commerce/catalog/facets` rather than hard-coded, so the tenant can add,
rename or retire a filter group with no frontend change. Unknown facet keys/values are
rejected loudly by Aonik (400) — the UI must only send what the facets read advertised.

#### Scenario: Two groups AND, values within a group OR
- **WHEN** the customer ticks Protein = Chicken or Fish, and Dietary = Gluten-free
- **THEN** the request is `GET /commerce/catalog/products?facet.protein=chicken,fish&facet.dietary=gluten-free`
- **AND** the rendered grid is exactly Aonik's result set (no client-side re-filtering)

#### Scenario: Facet groups are data
- **WHEN** the tenant authors a new facet group (e.g. "Occasion")
- **THEN** the menu's filter rail shows it on next revalidation without a deploy

### Requirement: Homepage rails from collections
`capability: catalog-browse` · `delta: MODIFIED (feat/catalog-browse)`

The system SHALL read curated rails from collections: `getFeaturedDishes()` becomes
`GET /commerce/catalog/products?collection=featured&sort=rank` (or
`GET /commerce/catalog/collections/{slug}` for collection metadata + members). Rank order is
the curated default inside a collection. The homepage category rail ("A taste of the
table") reads per-category collections named in Design § Operator data — resolving the
fixtures' `DishCategory` taxonomy as tenant data, per the `types.ts` note asking Aonik to
reconcile it.

#### Scenario: Featured rail is curated, not derived
- **WHEN** the homepage renders
- **THEN** the rail lists the `featured` collection's members in curated rank order
- **AND** `Dish.isFeatured` stops being a frontend-owned flag (it reflects membership)

### Requirement: Dish detail with safety-correct content
`capability: dish-detail` · `delta: MODIFIED (feat/catalog-browse)`

The system SHALL read `GET /commerce/catalog/products/{slug}` for the dish page. The
response embeds: variants, media, `effectiveOptionGroups` (the personaliser — see next
requirement), `unitSurcharge`, `unitSurchargeCurrency`, and `content` + `contentVersion` —
the **resolved content** (`ResolvedContentDto`): `{ servingLabel, nutrition{kcal?,
proteinGrams?, carbsGrams?, fatGrams?, fibreGrams?, sugarsGrams?, saltGrams?}, ingredients?,
allergens?, declarationsWithheld, heating[{method, body}], heatingWithheld,
isStandardPreparation, isStale, canonicalSelectionJson, matchedVariantSelectionJson?,
contentVersion }`. `allergens` is a **single nullable string**, not an array. `heating` is
never null — it is an empty list when withheld.

Display rules. These encode Aonik Spec 067's safety model and the frontend's own "NEVER
inferred" comment. **Rules 2 and 4 are safety-critical: read them before touching this
panel.**

1. Nutrition figures render from `nutrition`, nulls omitted (a null is "not published",
   never zero).
2. Declarations are gated on the **flag, never on null-ness**. When `declarationsWithheld`
   is true the page shows its explicit "not yet published" state and renders **neither**
   `ingredients` nor `allergens` — *even when one of them is non-null*. Aonik sets the flag
   whenever either half is unauthored and still returns the authored half on the
   exact-variant path; a null check would render the ingredients and silently drop the
   allergen line, which Aonik's own source calls "the dangerous half". Nothing is ever
   substituted from another combination or another dish.
3. When `isStandardPreparation` is true, the customer has personalised away from the default
   *and no variant was authored for that combination*, so the figures shown are the default
   block's. They SHALL be captioned "figures are for the standard preparation".
4. `isStale` means the default block no longer describes the current standard preparation
   (Aonik sets it from `RequiresReview`, or when the block's `describesSelectionJson` has
   drifted from today's defaults). It withholds declarations and heating — but **Aonik still
   serves the nutrition figures unconditionally**. `isStale` therefore SHALL independently
   caption or suppress the nutrition panel; it is NOT a synonym for `declarationsWithheld`.
   The trap this closes: when the customer is viewing the standard preparation itself,
   `isStandardPreparation` is `false` while `isStale` is `true`, so rule 3's caption never
   fires and stale figures would otherwise render as current fact.
5. Figures fall back; declarations never do. The only fallback in this system is
   `servingLabel` + `nutrition` resolving to the product's **own** default block, flagged by
   rule 3. `ingredients`, `allergens` and `heating` have no fallback path at all, and no
   nearest-match search exists — resolution is an exact hash match on the complete canonical
   selection.
6. Selection-specific content (customer changes options on the dish page) MAY re-resolve
   via `GET /commerce/catalog/products/{slug}/content?selection=…&v={contentVersion}`.
   The `v` param never changes the body — it only gates caching (a matching `v` earns
   `max-age=300`; absent or mismatched gets `no-store` with the correct current body). Pass
   the version from the product read verbatim.

#### Scenario: Withheld declarations stay withheld
- **WHEN** a dish's resolution has `declarationsWithheld: true`
- **THEN** the allergen section renders the "not yet published for this combination" state
- **AND** nothing is substituted from any other combination or dish

#### Scenario: A half-published pair is still withheld
- **WHEN** a variant authors `ingredients` but leaves `allergens` null, so Aonik returns
  `declarationsWithheld: true` alongside a non-null `ingredients` string
- **THEN** the panel renders the "not yet published" state
- **AND** the authored ingredients string is NOT rendered

#### Scenario: Standard-preparation caption
- **WHEN** the customer selects a non-default protein and the resolution falls back to the
  default block (`isStandardPreparation: true`)
- **THEN** the nutrition panel is captioned as standard-preparation figures

#### Scenario: Stale figures are captioned even on the standard preparation
- **WHEN** a resolution returns `isStale: true` with `isStandardPreparation: false`
- **THEN** the nutrition figures are captioned (or suppressed) rather than presented as
  current
- **AND** ingredients, allergens and heating render their withheld states

#### Scenario: Unknown slug is a 404 page
- **WHEN** `getDishBySlug` receives a 404 from Aonik
- **THEN** the route renders Next's not-found page (existing behaviour preserved)

### Requirement: Personaliser from effective option groups
`capability: dish-detail` · `delta: MODIFIED (feat/catalog-browse)`

The system SHALL build the dish personaliser from the product's `effectiveOptionGroups`:
`{ key, label, helpText?, selectionMode, currency, sortOrder, defaultChoiceKey,
choices[{key, label, note?, price, sortOrder}] }`. `defaultChoiceKey` is non-nullable —
always present. Choice prices are absolute; the UI shows the **delta** against the group's
`defaultChoiceKey` price (in pence, via the transport adapter). The recommended default is
labelled with the config document's `recommendedChoiceLabel` (today "Abby's choice" —
`DishOption.isAbbysChoice` maps to `key === defaultChoiceKey`). An empty
`effectiveOptionGroups` list means the product is not personalisable — hide the panel
entirely, never render an empty one. The global `getPersonalisationOptions()` fixture read
is retired: options are per-product.

`selectionMode` is the string `"One"` or `"Multi"` (Aonik's `OptionSelectionModes`
constants — not `single`/`multi`, and not an enum). A product MAY widen a group from `One`
to `Multi` via `SelectionModeOverride`, so the mode SHALL be read per product at render
time and never hard-coded per group key — the protein group in particular is a live
candidate for widening, which the existing UI already hints at with "Choose 1 or more".

Delta display for a `Multi` group subtracts the default choice's price **once** from the sum
of the chosen prices (`Σ chosen − default`), matching Aonik's `OptionSelectionService`. For
any committed figure the storefront MAY instead call
`POST /commerce/catalog/products/{slug}/selection-quote` (anonymous; `currency` is required
or it 400s with rule `V10`), which returns the authoritative signed `adjustment`, a
per-group `breakdown`, a `summary`, a `display` string and `isDefault`. Client-side deltas
are for chip labels; the server figure is the one that must agree with the cart.

#### Scenario: Deltas, not absolutes
- **WHEN** a group's default choice costs 0 and "Full table" costs 10.00
- **THEN** the UI shows "+£10.00" on Full table and no price on the default

#### Scenario: Multi-select subtracts the default once
- **WHEN** a `Multi` protein group's default costs 0 and the customer picks two choices at
  2.50 and 3.00
- **THEN** the displayed delta is +£5.50, not +£5.50 less two defaults

#### Scenario: Non-personalisable dish
- **WHEN** a product returns zero effective option groups
- **THEN** the dish page shows no personalisation panel and "Add to box" adds the default
  variant directly

### Requirement: Box offers and pricing from the box plan
`capability: catalog-browse` · `delta: MODIFIED (feat/catalog-browse)`

The system SHALL price Step 1 from the default bundle's size plan — either the storefront
config document's embedded `box` section, or
`GET /commerce/catalog/products/{defaultBoxSlug}/box-plan` (keyed on the product **slug**)
for the full shape: `{ bundleProductId, minSize, maxSize, baseSize, basePrice,
perSpacePrice, currency, presets[{size, price, badge?, blurb?, savingAmount?, sortOrder}] }`.
The config document's embedded copy is trimmed — `{ minSize, maxSize, currency,
perSpacePrice?, presets[{size, price, badge?, blurb?, saving?}] }`, where the preset field is
`saving`, not `savingAmount`. Mapping to the existing types: presets → `BoxOffer[]`
(`pricePence`, `badge`, `blurb`, `savingPence` from authored `savingAmount` — **never
computed**); the formula (`basePrice + (size − baseSize) × perSpacePrice`, presets overriding
at their size) → `CustomBoxPricing`. The fixtures' `extraDishPence` concept is superseded:
growing a box always charges `boxPrice(target) − boxPrice(current)` server-side (see
`server-box-cart`), so the UI shows plan-derived marginal costs rather than a flat
per-extra-dish price.

**There is no list price for a custom size.** The plan carries no `listPrice`, `wasPrice` or
`rrp`, and `savingAmount` exists only on presets, documented in Aonik as "authored display
saving — never computed". A custom size resolves to a single formula number with no anchor.
`CustomBoxPricing.listPerDishPence` therefore loses its source, and the struck-through
"was £X" that `BoxChooser` renders at arbitrary sizes SHALL be removed — the saving badge
becomes preset-only. Restoring it at custom sizes would require inventing a list price
client-side, which this repo does not do; the alternative is for the tenant to author a
list price in Aonik, which is a platform change and out of scope here.

#### Scenario: Preset wins at its size
- **WHEN** the plan prices size 12 by formula at 185 but a preset authors 170
- **THEN** the size picker shows £170 at 12
- **AND** any displayed saving is the preset's authored `savingAmount`, not a client-side
  subtraction

#### Scenario: Custom size shows no saving
- **WHEN** the customer picks a size with no authored preset
- **THEN** the picker shows the formula price alone
- **AND** no struck-through list price or saving badge is rendered

### Requirement: Heating instructions from content
`capability: dish-detail` · `delta: MODIFIED (feat/catalog-browse)`

The system SHALL render reheating guidance from the dish's resolved content `heating` steps
(`[{method, body}]`) when authored, honouring `heatingWithheld` the same way as
declarations. The generic `getHeatingInstructions()` catalogue-wide read is retired; a
static generic fallback MAY remain for products with no authored heating, clearly framed as
general guidance rather than dish-specific instructions.

#### Scenario: Authored heating wins
- **WHEN** a dish's resolution carries heating steps
- **THEN** the dish page renders those steps, not the generic fallback

---

## Design

### Architectural decision

**Filters, rails and taxonomies become tenant data, not frontend constants.** The fixtures'
compile-time unions (`PROTEIN_TYPES`, `WELLNESS_GOALS`, `MEAL_TYPES`, `DIETARY_TAGS`,
`DISH_CATEGORIES`, `HEAT_STEPS`) survive only as *display* helpers; what filters exist and
what values they take comes from `GET /commerce/catalog/facets` at render time. This is how
the `types.ts` reconciliation note resolves: `DishCategory` (homepage rail) = collections;
`WellnessGoal` (menu facet) = a facet group. Neither derives from the other; both are
authored.

### Target architecture

`getMenuPageData` becomes: config + facets + first products page, concurrently. The dish
page becomes: product read (embeds content + options) + related-products browse call
(`facet.wellness` of the dish's goals) — replacing the fixture-era "fetch all dishes and
filter client-side" pattern.

### Operator data (authored in Aonik, not coded here)

The tenant must author, and this spec treats as an external dependency:

| Aonik object | Expected instances |
|---|---|
| Facet groups | `protein` (Tag/Attribute), `wellness` (Tag), `meal` (Attribute), `dietary` (Tag), `heat` (Attribute or Range over `attributes.heatStep`) |
| Collections | `featured` (homepage rail), one per homepage category rail (`carb-conscious`, `protein-led`, `plant-led`, `everyday-balance`), `extras` (Step 3 — see `server-box-cart`) |
| Product attributes contract | `attributesJson` carries at minimum `{"heatStep": 0-3, "protein": "...", "meal": "..."}` for menu dishes. Aonik enforces no schema here beyond "must be a JSON object" — these keys are a **tenant convention this storefront depends on**, documented nowhere else, so they must be authored consistently or the heat label and filters silently stop matching |
| Default box bundle | An Active bundle product whose slug is the config document's `defaultBoxSlug`, carrying a size plan |
| Content | Per-dish default blocks (+ variants for combinations whose declarations differ) — allergen display is entirely gated on this authoring |

### Type-mapping table (fixtures → live)

| Frontend type/field | Source |
|---|---|
| `Dish.id/slug/title` | summary `id`/`slug`/`name` |
| `Dish.description` | product detail `description` |
| `Dish.imageUrl` | summary `heroImageUrl` |
| `Dish.tags` | summary `tags` |
| `Dish.heat` | `attributesJson.heatStep` → `HEAT_STEPS` reverse map |
| `Dish.isSignature/upgradePence` | `unitSurcharge != null` / `toPence(unitSurcharge)` |
| `Dish.nutrition` | content resolution `nutrition` (nulls preserved) |
| `Dish.ingredients/allergens` | content resolution, only when not withheld (allergens joins Aonik's single string — reconcile the `Extra.allergens: string[]` mismatch by standardising BOTH on Aonik's string) |
| `Dish.personalisation` | derived: which of the four known group keys appear in `effectiveOptionGroups` |
| `BoxOffer` | box-plan presets |
| `CustomBoxPricing.minDishes/maxDishes/perDishPence` | box-plan formula fields |
| `CustomBoxPricing.listPerDishPence` | **no source — field is retired** (see FR-6) |
| `HeatingInstruction[]` | content resolution `heating` |

---

## Tasks
- [ ] `map.ts`: `mapSummaryToDish`, `mapProductToDish` (incl. content + option groups),
      `mapBoxPlan`, facet-response types
- [ ] `HttpAonikClient`: products browse (+ facet/collection/sort params), product by slug,
      facets read, box plan read
- [ ] Menu filter rail reads facet groups; filter state → `facet.*` params; drop
      client-side filtering
- [ ] Homepage rails from collections; retire `isFeatured` derivation
- [ ] Dish page: content display rules 1–6 (withheld/standard-preparation/stale states)
- [ ] Personaliser from `effectiveOptionGroups` with delta pricing + config label;
      `One`/`Multi` mode read per product
- [ ] Step 1 pricing from box plan; retire `extraDishPence` from display copy; remove
      `listPerDishPence` and the custom-size strikethrough from `BoxChooser`
- [ ] Heating from content with framed generic fallback

### Testing
- Unit: every mapper (fixture DTO JSON → frontend type), heat reverse-map bounds, delta
  computation (including a `Multi` group subtracting its default once), withheld/
  standard-preparation display-state selection.
- Unit (safety): a resolution with `declarationsWithheld: true` **and** a non-null
  `ingredients` renders the withheld state and no ingredients text; a resolution with
  `isStale: true, isStandardPreparation: false` still captions its figures. These two are
  regression tests for the rules most likely to be "simplified" back into a null check.
- Integration: menu page with mocked browse+facets (filter → query-param assertions); dish
  page rendering all content states; Step 1 against a plan with a preset override and a
  custom size asserting no strikethrough.

### Definition of done
All scenarios pass; typecheck and build are green; a reviewer has signed off.

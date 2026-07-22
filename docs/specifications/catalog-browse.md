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
  allergens/ingredients render only when exact-authored (FR-4)
- ADDED catalog-browse — menu facet filters drive the browse endpoint's `facet.*`
  parameters instead of client-side filtering (FR-2)
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
requirement), `unitSurcharge`, and `content` + `contentVersion` — the **resolved
standard-preparation content**: `{ servingLabel, nutrition{kcal?, proteinGrams?,
carbsGrams?, fatGrams?, fibreGrams?, sugarsGrams?, saltGrams?}, ingredients?, allergens?,
declarationsWithheld, heating[{method, body}], heatingWithheld, isStandardPreparation,
isStale, contentVersion }`.

Display rules (these encode Aonik Spec 067's safety model and the frontend's own "NEVER
inferred" comment):

1. Nutrition figures render from `nutrition`, nulls omitted (a null is "not published",
   never zero).
2. `ingredients`/`allergens` render **only** when present; when `declarationsWithheld` is
   true the page shows its existing explicit "not yet published" state. No fallback, no
   inference, ever.
3. When `isStandardPreparation` is true and the customer has personalised away from the
   default, figures are captioned "figures are for the standard preparation".
4. When `isStale` is true, declarations are already withheld by Aonik; the storefront
   treats it identically to (2).
5. Selection-specific content (customer changes options on the dish page) MAY re-resolve
   via `GET /commerce/catalog/products/{slug}/content?selection=…&v={contentVersion}`;
   the `v` param is the cache key — pass the version from the product read verbatim.

#### Scenario: Withheld declarations stay withheld
- **WHEN** a dish's resolution has `declarationsWithheld: true`
- **THEN** the allergen section renders the "not yet published for this combination" state
- **AND** nothing is substituted from any other combination or dish

#### Scenario: Standard-preparation caption
- **WHEN** the customer selects a non-default protein and the resolution falls back to the
  default block (`isStandardPreparation: true`)
- **THEN** the nutrition panel is captioned as standard-preparation figures

#### Scenario: Unknown slug is a 404 page
- **WHEN** `getDishBySlug` receives a 404 from Aonik
- **THEN** the route renders Next's not-found page (existing behaviour preserved)

### Requirement: Personaliser from effective option groups
`capability: dish-detail` · `delta: MODIFIED (feat/catalog-browse)`

The system SHALL build the dish personaliser from the product's `effectiveOptionGroups`:
`{ key, label, helpText?, selectionMode, currency, sortOrder, defaultChoiceKey,
choices[{key, label, note?, price, sortOrder}] }`. Choice prices are absolute; the UI shows
the **delta** against the group's `defaultChoiceKey` price (in pence, via the transport
adapter). The recommended default is labelled with the config document's
`recommendedChoiceLabel` (today "Abby's choice" — `DishOption.isAbbysChoice` maps to
`key === defaultChoiceKey`). An empty `effectiveOptionGroups` list means the product is not
personalisable — hide the panel entirely, never render an empty one. The global
`getPersonalisationOptions()` fixture read is retired: options are per-product.

#### Scenario: Deltas, not absolutes
- **WHEN** a group's default choice costs 0 and "Full table" costs 10.00
- **THEN** the UI shows "+£10.00" on Full table and no price on the default

#### Scenario: Non-personalisable dish
- **WHEN** a product returns zero effective option groups
- **THEN** the dish page shows no personalisation panel and "Add to box" adds the default
  variant directly

### Requirement: Box offers and pricing from the box plan
`capability: catalog-browse` · `delta: MODIFIED (feat/catalog-browse)`

The system SHALL price Step 1 from the default bundle's size plan — either the storefront
config document's embedded `box` section, or
`GET /commerce/catalog/products/{defaultBoxSlug}/box-plan` for the full shape:
`{ bundleProductId, minSize, maxSize, baseSize, basePrice, perSpacePrice, currency,
presets[{size, price, badge?, blurb?, savingAmount?, sortOrder}] }`. Mapping to the
existing types: presets → `BoxOffer[]` (`pricePence`, `badge`, `blurb`, `savingPence` from
authored `savingAmount` — **never computed**); the formula (`basePrice + (size − baseSize) ×
perSpacePrice`, presets overriding at their size) → `CustomBoxPricing`. The fixtures'
`extraDishPence` concept is superseded: growing a box always charges
`boxPrice(target) − boxPrice(current)` server-side (see `server-box-cart`), so the UI shows
plan-derived marginal costs rather than a flat per-extra-dish price.

#### Scenario: Preset wins at its size
- **WHEN** the plan prices size 12 by formula at 185 but a preset authors 170
- **THEN** the size picker shows £170 at 12
- **AND** any displayed saving is the preset's authored `savingAmount`, not a client-side
  subtraction

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
| Product attributes contract | `attributesJson` carries at minimum `{"heatStep": 0-3, "protein": "...", "meal": "..."}` for menu dishes |
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
| `CustomBoxPricing` | box-plan formula fields |
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
- [ ] Dish page: content display rules 1–5 (withheld/standard-preparation/stale states)
- [ ] Personaliser from `effectiveOptionGroups` with delta pricing + config label
- [ ] Step 1 pricing from box plan; retire `extraDishPence` from display copy
- [ ] Heating from content with framed generic fallback

### Testing
- Unit: every mapper (fixture DTO JSON → frontend type), heat reverse-map bounds, delta
  computation, withheld/standard-preparation display-state selection.
- Integration: menu page with mocked browse+facets (filter → query-param assertions); dish
  page rendering all four content states; Step 1 against a plan with a preset override.

### Definition of done
All scenarios pass; typecheck and build are green; a reviewer has signed off.

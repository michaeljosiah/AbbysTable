---
spec_id: SPEC-2026-07-22-server-box-cart
title: Server cart — the box session moves to Aonik
status: draft
branch: feat/server-box-cart
owner: michaeljosiah
capabilities: [box-builder, extras]
created: 2026-07-22
updated: 2026-07-22
---

# Server cart — the box session moves to Aonik

> **Verified 2026-07-22** against Aonik specs 066/068/071 and the shipped `Aonik.Commerce`
> implementation. Where the two disagreed, the code won — note that 068's rule R13 ("LineKind
> must be BoxDish") is superseded: 071 shipped, and the running server implements add-on
> lines. Corrections: multi-select groups require a JSON array (a bare string is rejected),
> customer-initiated line merges emit no `changes[]` entry, `reason` has seven values, and
> the quote's component order differs from the first draft.

## Why

The box a customer builds lives in `CartProvider.tsx` — client state persisted to
localStorage, priced by client-side arithmetic (`cartTotals`, `extraUnitPence`). That was the
plan: the provider's own comment says "moving to a server cart later is contained to this
file." Later is now. Aonik's box-builder cart (Spec 068, extended by 071) is a server-side
session with an authoritative quote on every touch, catalogue-drift repair, aggregate
availability, capacity rules, and a checkout that materialises real orders. Client-side
pricing cannot express any of that — and worse, it can disagree with what checkout will
actually charge.

Depends on: `SPEC-2026-07-22-aonik-transport`, `SPEC-2026-07-22-catalog-browse`.

## What changes

- MODIFIED box-builder — `CartProvider` keeps its context contract but is backed by an
  Aonik server cart via internal route handlers (breaking: no — consumers of `useCart()`
  keep compiling)
- ADDED box-builder — `X-Cart-Token` lifecycle in an httpOnly cookie; the token never
  reaches client JavaScript (FR-2)
- ADDED box-builder — authoritative quote rendering (component list) and drift-notice
  rendering (`changes[]`) (FR-4, FR-5)
- MODIFIED extras — Step 3 reads `GET /commerce/catalog/extras` and writes add-on lines to
  the server cart (FR-6)
- ADDED box-builder — one-shot migration of a pre-existing localStorage box into a server
  cart (FR-7)

---

## Requirements

### Requirement: Cart creation and the token cookie
`capability: box-builder` · `delta: ADDED (feat/server-box-cart)`

The system SHALL create the box session with `POST /commerce/carts/box`
`{ bundleProductId, size, firstLine? }` when the customer completes Step 1 (or arrives from
a dish page's "Add to box", which passes `firstLine` so the viewed dish lands already in the
box). The response is the box payload plus `cartToken` — **disclosed exactly once**. All
cart traffic flows through Next Route Handlers under `/api/cart/*` (server-side), which:

1. store `{ cartId, cartToken }` in an httpOnly, `SameSite=Lax`, `Secure` cookie scoped to
   the site — the token is never serialized into client JavaScript, page props, or URLs;
2. attach `X-Cart-Token` (and `X-Tenant-Id`) to the proxied Aonik call;
3. always fetch with `cache: 'no-store'`.

A cart id alone authorizes nothing (Aonik treats possession of the id as public knowledge);
losing the cookie means the guest cart is simply gone — render the empty-box state.

#### Scenario: Token stays server-side
- **WHEN** a box cart is created
- **THEN** the browser receives only an httpOnly cookie
- **AND** no fetch from client components carries the token (they call `/api/cart/*`)

#### Scenario: Stale cookie fails closed
- **WHEN** the cookie references a cart Aonik answers with 404 (expired, adopted elsewhere,
  swept as abandoned)
- **THEN** the route handler clears the cookie and the UI resets to the empty-box state
- **AND** no copy speculates about why (unknown and unauthorized are indistinguishable)

### Requirement: Line operations map onto box routes
`capability: box-builder` · `delta: MODIFIED (feat/server-box-cart)`

The system SHALL implement the `useCart()` operations against the box routes, all of which
return the full `{ box, quote, changes[] }` payload that becomes the new provider state:

| Provider operation | Aonik call |
|---|---|
| `addLine(line)` | `POST /commerce/carts/{cartId}/lines` `{ productVariantId, quantity, personalisation? }` (slot auto-resolves; pass `bundleSlotId` only if the tenant ever authors multiple slots) |
| `setQuantity(lineId, q)` | `PATCH /commerce/carts/{cartId}/lines/{lineId}` `{ quantity: q }` — `0` deletes |
| edit personalisation (all units) | `PATCH …/lines/{lineId}` `{ personalisation }` |
| edit personalisation (n of q units) | `PATCH …/lines/{lineId}` `{ personalisation, applyToUnits: n }` — atomic split |
| `removeLine(lineId)` | `DELETE /commerce/carts/{cartId}/lines/{lineId}` |
| `setBoxSize(size)` | `PATCH /commerce/carts/{cartId}/size` `{ size }` |

Client-side merging is retired: Aonik merges identical `(kind, slot, variant, canonical
selection)` lines itself (rule R6). Line identity is Aonik's `lineId` (a GUID), replacing
the locally fabricated `${dishId}-${n}` ids.

**Merges are usually silent — do not wait for a change notice to explain one.** Aonik emits
a `line-merged` change ONLY from its drift-repair pass, when a remapped selection collides.
A merge caused by the customer's own action — adding a dish that matches an existing line,
or re-personalising a line onto another — returns the merged box with **no `changes[]`
entry**. The UI SHALL therefore derive "your two lines became one" by diffing `box.lines`
across responses, not by listening for `line-merged`.

`CartPersonalisation { portion, protein, side, heatStep }` SHALL be re-encoded as the
Spec 066 selection object keyed by the product's effective option group keys, sent as the
request field **`personalisation`** (a JSON object, not a list of pairs). Group keys and
choice keys come from `effectiveOptionGroups`, never hard-coded. Omitting the selection
entirely means "the defaults" (`isDefaultPersonalisation: true` on the returned line).

**A group's value is a bare string only when its `selectionMode` is `"One"`. A `"Multi"`
group requires a JSON array, and Aonik rejects a bare string with rule `V5` rather than
wrapping it** — so the encoder SHALL emit `string | string[]` driven by the product's
effective mode, e.g. `{ portion: "regular", protein: ["chicken", "prawn"], side:
"plantain", heat: "medium" }`. Since a product may widen a group from `One` to `Multi`
(`SelectionModeOverride`), `CartPersonalisation`'s flat single-value shape SHALL widen to
match, and the protein group in particular cannot be assumed single-valued — the Step 2 UI
already offers "Choose 1 or more".

#### Scenario: Growing the box charges the marginal plan price
- **WHEN** the customer changes size 6 → 8
- **THEN** the provider calls the size route and re-renders from the returned quote
- **AND** the price change equals `boxPrice(8) − boxPrice(6)` from the plan (which may bend
  around preset price points — never a flat per-dish figure)

#### Scenario: Capacity is a hard ceiling
- **WHEN** an add would exceed the box size
- **THEN** Aonik rejects it (`commerce.storefront_validation`) and the UI offers "grow the
  box" as the path forward (mirroring the size-route call), never a silent overflow line

#### Scenario: Splitting a line
- **WHEN** the customer edits 2 of a 5-unit line to a different protein
- **THEN** the provider sends `applyToUnits: 2` and re-renders from the response: two lines
  whose quantities sum to 5

### Requirement: The quote is the only price
`capability: box-builder` · `delta: ADDED (feat/server-box-cart)`

The system SHALL render all pricing from the returned quote: an **ordered component list**
`components[{ key, amount }]` plus `deliveryList` (struck-through display value, not a
component), `total` (Aonik guarantees Σ components — its source comments the invariant
"A24 — the total IS the component sum"), `currency`, `unitsSelected`, `boxSize`,
`spacesLeft`, `isFull`.

Keys Aonik emits today, **in emission order**: `boxPrice`, `personalisation` (signed, may be
negative), `unitSurcharges`, `addOns` (appended only when non-zero), `deliveryCharged`, and
on a closed cart also `discount` (negated) and `tax`. Note `addOns` precedes
`deliveryCharged`, and `discount`/`tax` appear on no other list in these specs.

The summary UI SHALL iterate the array in the order given, never index by position and never
assume a closed key set — labels come from a key→copy map with a fallback of the raw key, so
a new component is a rendering non-event. `cartTotals`, `boxPricePence`, `extraUnitPence`
and `extrasTotals` are deleted; nothing client-side re-derives money.

#### Scenario: Total is never recomputed
- **WHEN** the quote renders
- **THEN** the displayed total is `quote.total` verbatim (pence-converted)
- **AND** no code path sums components client-side to display a total

### Requirement: Drift notices
`capability: box-builder` · `delta: ADDED (feat/server-box-cart)`

The system SHALL render `changes[]` (`{ lineId?, group?, from?, to?, reason, priceDelta?,
mergedIntoLineId? }`) whenever a response carries them: the catalogue moved under the cart
and Aonik repaired it. Notices are dismissible per render but re-appear if the next
response still reports them. A line with `isUnavailable: true` renders in a blocked state
with the reason; **continue and checkout stay disabled while any line is unavailable** —
resolution is the customer's action (remove or swap), never silent removal.

`reason` carries **seven** values, not three — the three named by the box-cart spec plus the
four Spec 066 selection-drift reasons passed straight through:

| `reason` | Origin |
|---|---|
| `unavailable` | Line's variant can no longer be supplied |
| `line-merged` | Drift repair collapsed two lines (see FR-2: customer-initiated merges are silent) |
| `price-changed` | Add-on retail price moved since it was added |
| `option-retired` | A chosen option no longer exists |
| `group-removed` | An option group left the product |
| `group-added` | A new option group appeared, defaulted |
| `selection-mode-changed` | A group widened or tightened (`One` ↔ `Multi`) |

The notice component SHALL render an unknown `reason` as a generic "your box was updated"
message rather than dropping it — a change the customer cannot see is worse than an
unstyled one.

#### Scenario: Unavailable blocks progress
- **WHEN** a load returns a line flagged `unavailable`
- **THEN** Steps 2–4's continue actions are disabled with an explanatory notice
- **AND** removing the line re-enables them (the next response carries no flag)

#### Scenario: Price-changed add-on requires re-acceptance
- **WHEN** an add-on's retail price changed since it was added
- **THEN** the notice shows old → new (`priceDelta`) and the updated quote
- **AND** checkout proceeds only after this refreshed state has been served (the A18 stop
  is server-enforced; the UI's job is to surface it, not to re-block)

### Requirement: Extras (Step 3) on the live catalogue
`capability: extras` · `delta: MODIFIED (feat/server-box-cart)`

The system SHALL read Step 3 from `GET /commerce/catalog/extras`:
`{ rows[{ productId, productVariantId, slug, name, description?, imageUrl?, tags[],
attributesJson?, unitPrice, unitSurcharge?, currency, content?, optionGroups[] }],
skipped }`. Rows are the tenant's extras collection in curated rank order; `unitPrice` is
the real retail price (the deliberate exception to the no-price rule); `content` carries
nutrition/ingredients/allergens/heating under the same safety rules as dishes; option
pickers build from `optionGroups` exactly as the dish personaliser does. A non-zero
`skipped` is surfaced to operators via console warning only (customers never see it).

Add-on lines write through `POST /commerce/carts/{cartId}/extras`
`{ productVariantId, quantity, personalisation? }` and edit through the SAME line routes as
dishes (they are lines with `lineKind: "AddOn"`, `unitPrice` populated, empty `slotId`).
Add-ons consume no box space and never change `unitsSelected`/`spacesLeft`/`isFull`; their
money arrives in the quote's `addOns` component. The `Extra`/`ExtraLine` frontend types and
`extras.ts` fixtures are retired in favour of the row shape (allergens becomes a single
string, matching dishes — resolving the fixtures' `string[]` inconsistency).

**Extras have no server-side filtering.** `GET /commerce/catalog/extras` takes no query
parameters at all — it is a single curated collection in rank order, unlike the main
catalogue's facet-driven browse. Step 3's existing category chips are backed today by the
`EXTRA_CATEGORIES` fixture union, which retires with `Extra`.

**DECIDED (2026-07-22): option (a) — group client-side over `attributesJson.category`.**

The chips stay. Aonik serves the whole extras rail in one read with no paging, so grouping
it in the browser is correct rather than a compromise — the objection that killed
client-side filtering on the *menu* (a paged endpoint, where filtering one page gives wrong
answers) does not apply to a complete list. Removing a shipped feature to match an API
shape that does not require it would be the wrong trade.

The category therefore SHALL be read from each row's `attributesJson.category`, joining the
same tenant-convention contract as the dish attributes, and the chip set SHALL be derived
from the values actually present rather than from a compile-time union — so a new category
appears by being authored, and a category nobody uses stops being offered. A row with no
category is reachable under "All" and by search, never hidden.

#### Scenario: Add-on never eats a space
- **WHEN** a full box (`isFull: true`) adds an extra
- **THEN** the add succeeds and `spacesLeft` stays 0
- **AND** the quote gains/updates the `addOns` component only

#### Scenario: Shared stock is honest
- **WHEN** a variant is both a box dish and an extra and demand across both exceeds
  availability
- **THEN** the add is rejected with the availability message (Aonik sums demand per variant
  cart-wide)

### Requirement: LocalStorage migration
`capability: box-builder` · `delta: ADDED (feat/server-box-cart)`

The system SHALL migrate a pre-existing `abbys-table:box:v1` localStorage box ONCE on first
load under the server-cart build: create a server cart of the stored size, replay lines
(and extras) through the routes above, then delete the storage key. Lines whose dish/option
keys no longer resolve are dropped from the replay and reported through the standard drift-
notice UI. If replay fails wholesale (e.g. Aonik unreachable), the local state is preserved
and the customer sees the fixture-era behaviour degraded gracefully (no data loss, no
crash).

#### Scenario: One-shot and destructive only on success
- **WHEN** the migration completes successfully
- **THEN** the localStorage key is removed
- **AND** a subsequent load hydrates purely from the server cart cookie

---

## Design

### Architectural decision

**The provider contract survives; the storage engine changes.** Everything under
`useCart()` keeps its name and rough shape (async now), so Steps 1–4 and the mobile sheet
don't churn. The provider becomes a thin client of `/api/cart/*` route handlers; the route
handlers are the only code that can see the cart cookie. This honours both of Aonik's
security invariants — the token is server-held, and the id alone is worthless — without
teaching any component about tokens.

State flow: every mutation response carries the whole `{ box, quote, changes }`; the
provider replaces its state wholesale (no local reducers reconciling deltas). Concurrent
tabs self-correct on their next action, exactly as Aonik designed.

### Target architecture

```
useCart() consumers (Steps 1–4, header pill, mobile sheet)
        │  (unchanged surface, now async + server-derived state)
        ▼
CartProvider  ── fetch('/api/cart/…', { method, body })
        │
        ▼
/api/cart/[...] Route Handlers (server)
        │  read/write httpOnly cart cookie { cartId, cartToken }
        │  X-Cart-Token + X-Tenant-Id → Aonik; no-store; AonikError passthrough
        ▼
Aonik box routes (POST /commerce/carts/box, POST|PATCH|DELETE …/lines, PATCH …/size,
                  POST …/extras, POST …/continue, POST …/quote)
```

Provider state shape becomes `{ box: BoxDto, quote: BoxQuoteDto, changes: BoxChangeDto[] }`
in pence-mapped form; `dishCount` = `quote.unitsSelected`; `boxSize` = `quote.boxSize`.

---

## Tasks
- [ ] `/api/cart` route handlers: create/get/add-line/patch-line/delete-line/size/extras
      (+ cookie management, error passthrough)
- [ ] `map.ts`: box payload mappers (BoxDto/BoxLineDto/BoxQuoteDto/BoxChangeDto → pence)
- [ ] `CartProvider` rewrite over the handlers; delete client pricing helpers
- [ ] Personalisation encoder: UI state ↔ 066 selection object via effective groups,
      emitting `string | string[]` per the group's `One`/`Multi` mode
- [ ] Widen `CartPersonalisation` to multi-value groups (protein first)
- [ ] Drift-notice component (all seven reasons + unknown fallback) + unavailable line
      states + blocked continue
- [ ] Decide and record the Step 3 category-chip outcome (tag grouping vs removal)
- [ ] Step 3 on `/commerce/catalog/extras` + add-on line UI (shared line routes)
- [ ] localStorage one-shot migration
- [ ] Remove `extras.ts`, `EXTRA_FIXTURES`, `BOX_FIXTURES` pricing fields as superseded

### Testing
- Unit: personalisation encoder round-trips, including a `Multi` group emitting an array and
  a `One` group emitting a bare string; quote component rendering (unknown key falls back to
  raw label, `discount`/`tax` render on closed carts); pence mapping of signed components;
  migration replay dropping unresolvable lines.
- Unit: the drift-notice component renders each of the seven `reason` values and falls back
  gracefully on an eighth.
- Integration: route handlers against mocked Aonik (cookie set-once, token never in
  response bodies, 404 → cookie cleared); provider flows for add/split/grow/remove; Step 3
  add-on add updating only `addOns`; drift-notice rendering from a recorded 409 payload.

### Definition of done
All scenarios pass; typecheck and build are green; a reviewer has signed off.

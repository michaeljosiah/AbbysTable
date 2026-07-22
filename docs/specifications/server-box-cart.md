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
selection)` lines itself and reports a `line-merged` change when a personalisation edit
collapses two lines. Line identity is Aonik's `lineId` (a GUID), replacing the locally
fabricated `${dishId}-${n}` ids.

`CartPersonalisation { portion, protein, side, heatStep }` SHALL be re-encoded as the
Spec 066 selection object keyed by the product's effective option group keys (e.g.
`{ portion: "regular", protein: "chicken", side: "plantain", heat: "medium" }`) — group
keys and choice keys come from `effectiveOptionGroups`, never hard-coded. Omitting the
selection entirely means "the defaults" (`isDefaultPersonalisation: true` on the line).

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
`components[{ key, amount }]` (known keys today: `boxPrice`, `personalisation` — signed,
`unitSurcharges`, `deliveryCharged`, `addOns`) plus `deliveryList` (struck-through display
value, not a component), `total` (Aonik guarantees Σ components), `currency`,
`unitsSelected`, `boxSize`, `spacesLeft`, `isFull`. The summary UI iterates the component
list generically — labels come from a key→copy map with a fallback of the raw key — so a
future component is a rendering non-event. `cartTotals`, `boxPricePence`, `extraUnitPence`
and `extrasTotals` are deleted; nothing client-side re-derives money.

#### Scenario: Total is never recomputed
- **WHEN** the quote renders
- **THEN** the displayed total is `quote.total` verbatim (pence-converted)
- **AND** no code path sums components client-side to display a total

### Requirement: Drift notices
`capability: box-builder` · `delta: ADDED (feat/server-box-cart)`

The system SHALL render `changes[]` (`{ lineId?, group?, from?, to?, reason, priceDelta?,
mergedIntoLineId? }`) whenever a response carries them: the catalogue moved under the cart
and Aonik repaired it (remapped choices, dropped groups, merged lines, `unavailable` flags,
add-on `price-changed`). Notices are dismissible per render but re-appear if the next
response still reports them. A line with `isUnavailable: true` renders in a blocked state
with the reason; **continue and checkout stay disabled while any line is unavailable** —
resolution is the customer's action (remove or swap), never silent removal.

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
- [ ] Personalisation encoder: UI state ↔ 066 selection object via effective groups
- [ ] Drift-notice component + unavailable line states + blocked continue
- [ ] Step 3 on `/commerce/catalog/extras` + add-on line UI (shared line routes)
- [ ] localStorage one-shot migration
- [ ] Remove `extras.ts`, `EXTRA_FIXTURES`, `BOX_FIXTURES` pricing fields as superseded

### Testing
- Unit: personalisation encoder round-trips; quote component rendering (unknown key falls
  back to raw label); pence mapping of signed components; migration replay dropping
  unresolvable lines.
- Integration: route handlers against mocked Aonik (cookie set-once, token never in
  response bodies, 404 → cookie cleared); provider flows for add/split/grow/remove; Step 3
  add-on add updating only `addOns`; drift-notice rendering from a recorded 409 payload.

### Definition of done
All scenarios pass; typecheck and build are green; a reviewer has signed off.

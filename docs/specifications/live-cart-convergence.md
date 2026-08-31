---
spec_id: SPEC-2026-08-31-live-cart-convergence
title: Live cart convergence
status: approved
branch: feat/live-cart-convergence
owner: michaeljosiah
capabilities: [box-builder, extras, personalisation]
created: 2026-08-31
updated: 2026-08-31
---

# Live cart convergence

## Why

The live storefront already has the right architecture: the browser calls same-origin cart
handlers, the handlers hold the cart token, Aonik returns the complete authoritative cart after
every write, and `serverEngine.ts` serialises writes before replacing client state wholesale.
Several UI operations do not complete that path. Add-on edits still mutate demo state, dish
personalisation uses a destructive remove-then-add sequence, multi-select values are flattened,
and some callers report success after a rejected request.

This specification closes those wiring gaps before payment work begins. It is a corrective delta
to `SPEC-2026-07-22-server-box-cart`, not a new cart design.

Depends on: `SPEC-2026-08-31-effective-option-groups`,
`SPEC-2026-07-22-server-box-cart`, `SPEC-2026-07-22-review-checkout`, Aonik Specs 066, 068,
071 and 085.

## What changes

- MODIFIED box-builder — every live mutation awaits one existing `/api/cart/*` operation and
  adopts the returned cart (breaking: no)
- MODIFIED personalisation — the canonical selection produced by `effective-option-groups` passes
  through add, edit and response projection without reshaping (breaking: internal types only)
- MODIFIED extras — add-on lines retain Aonik line identity and use the generic line PATCH/DELETE
  routes for quantity, options and removal (breaking: internal types only)
- MODIFIED pricing — committed-cart summary surfaces render Aonik quote values only
- MODIFIED migration — the unused, unsafe migration is retired rather than expanded

## Constraints

- The implementation SHALL follow KISS: connect existing operations rather than introduce a new
  state manager, command framework, generic repository, event bus or client pricing layer.
- The existing `useServerCart` request queue SHALL remain the sole same-tab ordering mechanism.
  Passive cross-tab synchronisation is out of scope; tabs converge on their next server action.
- The existing generic `PATCH /api/cart/lines/{lineId}` and `DELETE` routes SHALL serve dishes and
  add-ons. No add-on-specific edit routes SHALL be added.
- `PersonalisationSelection = Record<string, string | string[]>` SHALL remain the canonical
  transport shape supplied by `effective-option-groups`.
- Demo mode SHALL retain its current local behavior and pricing helpers.
- Payment, delivery, fulfilment, content redesign and broad Aonik changes are out of scope.
- No production runtime dependency SHALL be added for testing. Minimal dev-only tooling MAY be
  added only where the existing TypeScript/React seam cannot otherwise execute.

---

## Requirements

### Requirement: Every live mutation converges on server truth
`capability: box-builder` · `delta: MODIFIED (feat/live-cart-convergence)`

Every live-mode add, quantity change, personalisation change, resize and removal SHALL await one
Aonik-backed route operation. If a response contains a `cart` field, the provider SHALL adopt it
regardless of HTTP status: an object replaces the projection and `cart: null` resets it. A failed
response without a `cart` field SHALL preserve the last confirmed projection. Every failure SHALL
expose the error and SHALL NOT trigger success copy, navigation or modal closure.

Provider mutation promises SHALL reject after recording the error. Callers SHALL await them before
success effects. On review entry, checkout SHALL remain disabled until `/continue` succeeds; a
failed continue gate SHALL expose a retry and SHALL NOT proceed to checkout.

#### Scenario: Failure without cart preserves the confirmed cart
- **WHEN** a live mutation fails without carrying an authoritative cart
- **THEN** the last confirmed cart remains rendered and an actionable error is exposed
- **AND** the caller does not announce success or navigate as though the write completed

#### Scenario: Failure with cart adopts server truth
- **WHEN** a 409 drift carries a repaired cart, or a stale cart response carries `cart: null`
- **THEN** the provider adopts that value before exposing the error

#### Scenario: Rapid actions are deterministic
- **WHEN** a customer activates a mutation control repeatedly before the first response
- **THEN** a second activation while pending issues no second request
- **AND** a later activation derives from the adopted response

### Requirement: Dish personalisation edits are atomic
`capability: personalisation` · `delta: MODIFIED (feat/live-cart-convergence)`

The provider SHALL expose one personalisation update that calls the existing line PATCH with
`personalisation` and optional `applyToUnits`. Step 2 and review SHALL use it instead of decrementing
or deleting a line before adding another.

#### Scenario: A rejected edit loses nothing
- **WHEN** Aonik rejects a dish personalisation edit
- **THEN** the original line and quantity remain intact
- **AND** no compensating client request is required

#### Scenario: A partial edit splits atomically
- **WHEN** 2 units of a 5-unit line receive a different selection
- **THEN** one PATCH sends `applyToUnits: 2`
- **AND** the returned lines total 5 units

### Requirement: Selection cardinality is lossless
`capability: personalisation` · `delta: MODIFIED (feat/live-cart-convergence)`

The provider SHALL accept and project the canonical selection produced by
`SPEC-2026-08-31-effective-option-groups` without flattening, renaming or dropping values. A
personalisation PATCH SHALL include the full canonical selection whenever it changes. Resetting to
defaults SHALL send the complete default selection; omission means unchanged on PATCH.

#### Scenario: Multi-select round-trips
- **WHEN** a customer selects multiple choices in a `Multi` group
- **THEN** all choice keys are sent in one array
- **AND** reload and edit show the same complete selection

### Requirement: Add-ons use stable line identity
`capability: extras` · `delta: MODIFIED (feat/live-cart-convergence)`

Projected add-ons SHALL retain `lineId`, `variantId`, quantity and canonical personalisation.
Adding an add-on SHALL send its requested quantity and selection in one POST. Quantity and option
changes SHALL PATCH by `lineId`; removal SHALL DELETE by `lineId`. Two lines for the same variant
with different selections SHALL remain independently editable.

#### Scenario: Optioned add-ons remain distinct
- **WHEN** the same add-on variant is present with two different selections
- **THEN** each returned line has its own identity and controls
- **AND** editing or deleting one does not mutate the other

### Requirement: Live money comes only from the quote
`capability: box-builder` · `delta: MODIFIED (feat/live-cart-convergence)`

In live mode, every committed-cart breakdown and grand total SHALL render `quote.components` in
response order and `quote.totalPence` verbatim. Plan and catalogue prices, parent-approved choice
deltas, line unit prices and `quote.deliveryListPence` MAY render for their own non-aggregate
displays, but SHALL NOT be summed into a cart total. If no server-supplied value exists, the
committed-cart display SHALL omit it rather than calculate it. Demo-only aggregate helpers SHALL
NOT execute for a server cart.

#### Scenario: Signed components render verbatim
- **WHEN** Aonik returns a negative personalisation or discount component
- **THEN** the component and total render the returned pence values without clamping or recomputing

### Requirement: Unsupported legacy migration is removed
`capability: box-builder` · `delta: MODIFIED (feat/live-cart-convergence)`

Live mode SHALL neither read nor delete `abbys-table:box:v1`; demo mode SHALL retain its existing
localStorage behavior. The uncalled migration and completion-marker behavior SHALL be deleted,
superseding the parent spec's migration requirement. The production live-cart deployment predates
this corrective unit and has never advertised migration as a supported customer contract; adding
compatibility now would preserve no observed supported behavior.

#### Scenario: Live mode ignores a legacy key
- **WHEN** live mode starts while the legacy key exists
- **THEN** no replay request or completion marker is produced
- **AND** the legacy value remains untouched

### Requirement: Completion has executable evidence
`capability: box-builder` · `delta: ADDED (feat/live-cart-convergence)`

The repository SHALL provide a repeatable test command covering all three cart response outcomes,
request ordering, atomic edit request shape, add-on line identity and caller failure behavior. CI
SHALL run that command. Final verification SHALL include a recorded live box journey against the
deployed Aonik development tenant, including reload after each committed mutation.

---

## Design

Keep the current path:

```text
component -> CartProvider -> useServerCart queue -> /api/cart/* -> existing cart/server functions
          <- complete authoritative cart response <-
```

Widen only the lossy UI-facing selection and add-on line shapes. Reuse the existing mapped cart
selection, line PATCH, line DELETE and quote. Components await provider promises before presenting
success. Where repeated controls currently compute from stale render state, disable them while the
queue is active rather than adding an optimistic reducer.

## Tasks

- [x] `T1` Preserve prerequisite selections and add-on line identity in provider projection
- [x] `T2` Propagate mutation failures and prevent premature success/navigation
- [x] `T3` Wire add-on POST/PATCH/DELETE through existing routes
- [x] `T4` Replace dish remove-then-add edits with one line PATCH
- [x] `T5` Render live quote components without local derivation or clamping
- [x] `T6` Delete the unsupported migration and supersede its parent requirement
- [x] `T7` Add the minimal test command to CI and verify the live journey
  - [x] Automated convergence coverage runs under `npm test` and in CI
  - [x] Desktop and mobile deployed-tenant journey with reload after each mutation

### Verification evidence: 2026-08-31

A production build ran locally in live mode against the deployed Aonik development tenant
`5bf8d088-398f-4865-8ea6-406f39b6bfbf`. Headless Microsoft Edge exercised 1440x1000 desktop and
390x844 mobile viewports. No checkout was submitted, so the verification created no durable order.

- Desktop returned HTTP 200 and reloaded server truth after 6 -> 12 -> 6 resize, dish add, each
  quantity change from 1 -> 6, one atomic `Multi` personalisation PATCH carrying both `chicken` and
  `salmon`, add-on POST, one add-on PATCH changing quantity to 2 and `extra-puffpuff-size` to `12`,
  add-on DELETE, and `/continue`. Reload rendered the authored `12 pieces` selection.
- Mobile returned HTTP 200 and reloaded server truth after size creation, dish add, each quantity
  change from 1 -> 6, add-on POST, and `/continue`.
- Both viewports reached review after a successful continue gate and retained quote/line state after
  reload. Checkout was intentionally not invoked because payment is outside this corrective unit.
- The independently approved fixture seeder was applied through Abby's interactive Auth0
  tenant-admin session. It authored six namespaced extra groups and replaced all thirteen extra
  attachments without platform-admin elevation. Exact optioned add-on request paths, canonical
  selections, and distinct line identities also remain covered by `npm test`.

## Definition of done

- All scenarios above pass.
- `npm test`, lint, typecheck and production build pass.
- Desktop and mobile live-cart smoke journeys pass against deployed Aonik.
- No live mutation silently catches its own failure.
- No committed live-cart aggregate uses `cartTotals`, `extrasTotals`, `extraUnitPence` or equivalent
  client arithmetic.
- Both independent reviewers sign off on implementation evidence.

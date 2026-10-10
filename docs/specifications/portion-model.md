---
spec_id: SPEC-2026-10-10-portion-model
title: Portion model and dish, Add Dishes, Extras and Review v2
status: approved
branch: codex/portion-model-spec
owner: michaeljosiah
capabilities: [catalogue, dish-detail, box-builder, extras, review, cart-recovery]
created: 2026-10-10
updated: 2026-10-10
---

# Portion model and dish, Add Dishes, Extras and Review v2

## Why

The approved storefront designs give a dish one purchasing choice: **Light Table or Full
Table**. Main still renders the generic personaliser on dish pages, Add Dishes and Review.
The page behaviour guide already defines the customer journey, including the boundary between
dish portions and extras options. This spec translates that design into shared application and
data contracts. Implementing the pages independently would reproduce the current Full Table
price conflict and risk losing customer choices.

This specification defines the shared model and the implementation boundary for
[#22](https://github.com/michaeljosiah/AbbysTable/issues/22),
[#29](https://github.com/michaeljosiah/AbbysTable/issues/29) and
[#30](https://github.com/michaeljosiah/AbbysTable/issues/30). It was checked against main
[`142b679`](https://github.com/michaeljosiah/AbbysTable/commit/142b679f67787b5e49a0c995bf4bd2efbb558752)
after `git pull --ff-only origin main` on 10 October 2026. Aonik contract inspection used
[`6c02fcd`](https://github.com/michaeljosiah/aonik/commit/6c02fcd112c46b766d7d3d5c372a68f1ce30860c).

**Status: approved for implementation by the product owner on 10 October 2026.**
Customer behaviour and visual acceptance follow the approved design sources.
D1 was resolved by the product owner on 10 October 2026: **Full Table adds £5 per dish unit,
uniformly across dishes; Signature upgrades remain additional.** This supersedes the conflicting
prototype holding prices. Demo and local catalogue setup now use that approved value.
Implementation does not change production prices or catalogue data. Issue closure remains gated
on the evidence below.

## What changes

- ADDED a validated dish-portion view over Aonik's existing canonical selections (FR-01–03).
- MODIFIED dish detail and Add Dishes to use portion controls, preserving content and cart
  contracts (FR-04–07; breaking: yes, visible personalisation choices are retired).
- MODIFIED Extras to retain its approved item-specific size/heat choices and use real catalogue
  categories (FR-08; breaking: no for supported choices, unsupported configurations need review).
- MODIFIED Review to show read-only dishes, option-specific extras and authoritative delivery
  savings, with contextual editing on the earlier steps (FR-09–10; breaking: yes, the dish
  personalisation editor is removed).
- ADDED shared eight-second removal Undo and an explicit legacy-cart transition (FR-11–12).
- MODIFIED these pages to consume independent gift state when the gifting work supplies it
  (FR-13; breaking: no).

This spec supersedes the **visible generic dish-editor requirements** in
[effective-option-groups.md](effective-option-groups.md), including the rule that every unknown
group must render on every dish surface. It retains that spec's canonical transport and
cardinality rules wherever selections remain supported. It does not supersede the authoritative
cart rules in [live-cart-convergence.md](live-cart-convergence.md) or
[server-box-cart.md](server-box-cart.md). The supersession is recorded in
`effective-option-groups.md`; extras retain its supported choice and canonical transport rules.

### Approved commercial decision

| ID | Decision | Proposed direction and consequence |
| --- | --- | --- |
| **D1 — Full Table upcharge — resolved 10 October 2026** | **£5 per dish unit**, uniform across Standard and Signature dishes. Signature upgrades remain additional. | Light Table is included in the box price. Aonik authors the Full Table choice at a £5 delta from Light; every display and quote uses catalogue/cart data. Demo fixtures and local setup enforce this policy. Production publication and legacy-cart preservation remain rollout tasks, not outstanding price decisions. |

### Decisions already supplied by the designs

These are requirements to implement, not questions to ask again:

| Behaviour | Source and implementation consequence |
| --- | --- |
| Dish portion purchasing | Guide §3 and the approved Standard/Signature pages: Light Table / Full Table purchasing, selected-portion information and a preserved Standards return. |
| Extras size/heat choices | Guide §16 explicitly retains them; `design/CLAUDE.md` and Extras v2 supply the detailed picker/row treatment. Portion-only applies to dishes, not every product. |
| Read-only Review dishes | Guide §17: Change returns to Add Dishes; extras are grouped by item/option. No inline dish personalisation editor. |
| Review-edit return | Guide §15–17: targeted editing and RETURN TO REVIEW preserve the rest of the order. |
| Retained order state and repair | Guide §A3–A4, §17 and §30–31, plus `SHOPPING-STATE.md` §3–5: preserve compatible selections, reconcile stale state and repair the earliest invalid step. No silent reset. |
| Gift Card in Review | Guide §15 and §17 distinguish the in-box Gift Card and its confirmation from food-box gift intent. |

**Engineering verification, not a new business choice:** inspect existing customised carts/saved
boxes and ensure backend revalidation can preserve the information needed for FR-12. The guide
does not specify a legacy data conversion algorithm. Implement its preserve-and-repair rules;
do not assume permission to discard old boxes. Escalate a concrete, demonstrated incompatibility
only if it cannot be handled within those rules, rather than making speculative migration choices
a prerequisite for the entire UI build.

Operational readiness also requires confirmed portion weights, selected-portion nutrition, ingredients,
allergens, heating/storage and usable product/variant mappings. Missing data must have the honest
states below; the owner/content sign-off process decides launch readiness. This spec does not
approve holding nutrition or resolve the separate content/sign-off issue #38.

### Scope and source precedence

The target is a **1:1 mapping of the application's customer-facing UI to the approved design**:
page structure, content order, controls, copy, states, navigation and responsive treatment.
Implement the specified interactions instead of substituting a merely similar ecommerce flow.

- **Customer behaviour:** the [page behaviour guide](../../design/abbys-table-page-behaviour-guide.md).
  Its purpose explicitly distinguishes this role from layout and technical handoff.
- **Shopping-state decisions:** [SHOPPING-STATE.md](../../design/SHOPPING-STATE.md), alongside the
  guide. Their final recorded decisions take precedence over stale prototype business rules.
- **Visual treatment:** the approved current page files linked below and the shared design system
  in `design/_ds/`; use [design/CLAUDE.md](../../design/CLAUDE.md) for exact shared rules and
  [build-handoff.md](../../design/build-handoff.md) for approval history and implementation cautions.
  The guide explicitly delegates detailed Extras behaviour to these sources.
- **Operational data and production integration:** the
  [frontend/backend contract](../../design/frontend-backend-contract.md) and verified Aonik data.
  Use confirmed product/pricing data in the specified UI; do not copy holding prices, nutrition,
  dates, or prototype-only storage mechanisms as production truth.

Older issue wording does not reopen a behaviour already settled in these sources. If the guide
and an approved visual genuinely conflict, record the exact source/state and resolve that conflict;
do not silently redesign the page or ask the owner to reconfirm everything around it.

### Page-to-design mapping for this unit

The following is an implementation/acceptance map, not a claim that the current UI already matches.
Use the same guide and its §L checklist for the remaining application UI issues.

| Application surface | Behaviour guide | Approved visual source | Requirements / acceptance focus |
| --- | --- | --- | --- |
| Standard dish `/menu/[slug]` | §3; §A3–A7 | [Dish Landing v2](<../../design/Abby's Table - Dish Landing v2.dc.html>) | FR-01–05, FR-14: hierarchy, portion card, selected nutrition, open information panels, purchase bar and Standards return. |
| Signature dish `/menu/[slug]` | §3; §A3–A7 | [Dish Landing Signature v2](<../../design/Abby's Table - Dish Landing Signature v2.dc.html>) | Same purchase behaviour, with the approved Signature badge/information and separate surcharge treatment. |
| Step 1 integration `/box` | §14; §A3–A4 | [Choose Box v2](<../../design/Abby's Table - Choose Box v2.dc.html>) | FR-02, FR-05, FR-07, FR-13–14: carried dish/portion, box commitment, shared price policy and retained gift state. Preserve its approved responsive exception. |
| Step 2 `/box/dishes` | §15; §A3–A7 | [Add Dishes v2](<../../design/Abby's Table - Add Dishes v2.dc.html>) | FR-01–03, FR-05–07, FR-10–14: rows, details, Signature controls, rail/sheet, Undo, gift confirmation, full-box/repair states and Review return. |
| Step 3 `/box/extras` | §16; §A4–A7 | [Extras v2](<../../design/Abby's Table - Extras v2.dc.html>) | FR-08, FR-10–14: actual categories, supported option pickers/rows, details, completed-dishes card, optional progression, rail/sheet and Review return. |
| Step 4 `/box/review` | §17; §A4–A7 | [Review v2](<../../design/Abby's Table - Review v2.dc.html>) | FR-09–14: read-only dishes, grouped extras, Gift Card, summary, delivery saving, edit destinations and one competing Checkout CTA. |

The normal marketing header's scroll-hide behaviour excludes dish pages and ordering pages
(guide §A5). Steps 1–4 retain the transactional shell; they do not gain normal marketing navigation
as part of this redesign. Shared consent/focus behaviour also forms part of the acceptance map.

Already working on the audited main: the replacement notice, full-box entry gates, cart mutation
convergence and Review navigation to Checkout. Preserve and test these; they are not new backend
requirements. Complete destination-specific Back labels where the new flows require them.

Out of scope: building `/gifting` (#26), gift-card purchase/checkout (#27), rewards (#36), account
flows (#35), checkout completion (#31), business decisions (#37) and content sign-off (#38).
Gift consumers and their acceptance dependencies remain explicitly in scope below. The portion
work alone cannot close an issue whose gift-specific acceptance criteria are still unmet.

---

## Requirements

### Requirement: FR-01 — Validate a dish's portion contract
`capability: catalogue` · `delta: ADDED (codex/portion-model-spec)`

An orderable v2 dish SHALL offer one `One` selection group, keyed `portion`, with canonical
choices `light` and `full`, displayed as Light Table and Full Table. The default SHALL be
`light`. The catalogue release SHALL retire other selectable **dish** groups using FR-12's
transition; the UI SHALL NOT merely hide still-operative customisations and submit their defaults.

The storefront SHALL validate the group, default, choices, currency and product/variant mapping
before offering purchase. It SHALL use an explicitly resolved active variant ID for mutations.
A single active variant is unambiguous; multiple active variants require an authored mapping.
It SHALL NOT infer portions from a SKU, array order, translated label or assumed weight.

#### Scenario: Configuration is incomplete or ambiguous
- **WHEN** a dish has no valid portion group, a missing default, unexpected dish choices/groups,
  incompatible currency or no unambiguous active variant mapping
- **THEN** its content remains browseable with an ordering-unavailable state
- **AND** no guessed Light Table selection, zero upcharge or arbitrary variant is submitted.

#### Scenario: Availability changes
- **WHEN** an add or refresh reports the selected dish unavailable
- **THEN** the authoritative cart and existing replacement workflow determine the next action
- **AND** the UI does not substitute another portion or count an unavailable dish as a filled slot.

The current option DTO does not declare per-choice stock. Independent portion-stock messaging
requires an explicit backend contract; absence of a field is not evidence of availability.

### Requirement: FR-02 — Preserve identity and authoritative prices
`capability: box-builder` · `delta: MODIFIED (codex/portion-model-spec)`

The system SHALL retain `Record<string, string | string[]>` as the canonical selection transport.
A portion is a `One` string, never an array or display label. Existing default omission on adds
MAY be retained; edits SHALL explicitly encode the complete intended selection. The UI SHALL
decode an omitted default as Light Table only against a validated current contract.

Each Light Table or Full Table unit SHALL occupy one box slot. Same variant and same canonical
selection SHALL merge according to the server response; different portions SHALL remain distinct.
Returned `lineId` values SHALL identify mutation targets, including after split/merge operations.
Signature is an authored dish classification/surcharge, not a second customer-selectable upgrade.

Before commitment, portion delta SHALL be derived from the authored **absolute choice price minus
the default choice price**, converted once into integer pence. A Full Table Signature dish can
therefore show both the portion delta and the separate Signature upgrade. After a live mutation,
all charges and totals SHALL come from the returned cart/quote, with no duplicate addition of
those preview deltas. Generic Full Table copy SHALL follow the D1 policy rather than a literal.

#### Scenario: Several units and both portions
- **WHEN** a customer adds two Full Table units and one Light Table unit of the same Signature dish
- **THEN** three slots are occupied and the two portions have distinct lines
- **AND** the live quote applies the authored portion adjustment to two units and the Signature
  surcharge to three units, exactly once each.

#### Scenario: Choice prices are absolute
- **WHEN** a test catalogue has default choice price £3 and Full Table choice price £13
- **THEN** its displayed portion delta is £10, not £13
- **AND** this test data does not establish the commercial answer to D1.

### Requirement: FR-03 — Resolve content for the selected portion
`capability: dish-detail` · `delta: MODIFIED (codex/portion-model-spec)`

Purchase controls SHALL display the authored portion label, weight/serving description and price
delta. A selected-portion macro strip SHALL use resolved kcal, protein and fibre for that selection.
It SHALL NOT multiply Light values to estimate Full, assume universal 225g/450g weights, or present
unlabelled standard-preparation nutrition as the chosen portion's nutrition.

Nutrition accordions/dialogs SHALL allow an independent Light/Full comparison. This preview SHALL
start at the purchase selection and reset when the purchase selection changes; comparing nutrition
SHALL NOT change the purchase portion, quantities, cart or price. Content requests SHALL use the
existing selection-aware resolver and preserve stale/withheld declaration and heating rules.

#### Scenario: Full Table content is not yet published
- **WHEN** Full Table is selected but its exact content is unavailable or withheld
- **THEN** the UI shows the appropriate unpublished/unavailable state, with retry for a request failure
- **AND** it does not relabel Light Table nutrition, ingredients, allergens or heating as Full Table.

#### Scenario: Comparing nutrition while buying Light Table
- **WHEN** the customer previews Full Table nutrition then activates Add
- **THEN** the purchase remains Light Table unless its purchasing control was explicitly changed
- **AND** rapidly changing previews cannot display a late response for the wrong selection.

### Requirement: FR-04 — Replace the dish personaliser with the approved portion card
`capability: dish-detail` · `delta: MODIFIED (codex/portion-model-spec)`

Standard and Signature dish pages SHALL use the same portion-only purchase flow. The content order
SHALL be tags, heading, components, description, heat, “Flavour built properly.”, portion card,
Add to your box, delivery/minimum-box information, then the three initially open panels:
Nutrition, Ingredients & allergens, and Heating & storage. Related dishes and See our standards
SHALL follow the approved design. Authored microwave/hob/oven instructions SHALL render where
available; an empty heating panel SHALL explain that instructions are not yet available.

The generic personaliser, protein/side/heat controls, personalisation sheet, old jump links and
FlavourBand SHALL be removed from these surfaces. Heat remains an authored dish fact. The existing
sticky purchase bar and page CTA SHALL share one selection and one in-flight guard; acknowledgement
SHALL follow a successful mutation. Use the approved limited-cooking-run delivery note and its
hover/focus/pinned behaviour, the minimum-any-six message, and the simple “Back” label.

#### Scenario: The two Add controls are activated rapidly
- **WHEN** a customer taps the portion-card CTA and sticky CTA while an add is pending
- **THEN** at most one add is submitted
- **AND** a rejected add leaves the selection available to correct/retry without a success toast.

### Requirement: FR-05 — Carry genuine dish intent and preserve Standards returns
`capability: dish-detail` · `delta: MODIFIED (codex/portion-model-spec)`

With no committed box size, a genuine dish Add SHALL carry the dish and chosen portion into
Step 1, with `?dish=<slug>` as navigation context. The existing authoritative draft/session handoff
SHALL retain the actual selection; the slug alone SHALL NOT authorise a new add on reload or a
shared URL. Committing box size SHALL not add the carried dish again. With an active box, adding
SHALL preserve it and obey its capacity rather than replace it with a fresh draft.

See our standards SHALL preserve the current dish, portion and scroll only on a genuine return,
using the existing token/session/history rules in `dish-return.ts`. Quick-view returns SHALL
also restore their originating step/dialog and any explicit `return=review` context. Fresh visits
SHALL not inherit a stale portion choice from a previous visit.

#### Scenario: Carried dish survives box commitment
- **WHEN** Full Table is added before size selection and the customer commits a six-dish box
- **THEN** it contains exactly one Full Table unit of that dish
- **AND** refresh, Back/Forward and repeated rendering of `?dish=<slug>` do not add another unit.

### Requirement: FR-06 — Build the portion-only Add Dishes step
`capability: box-builder` · `delta: MODIFIED (codex/portion-model-spec)`

Step 2 SHALL use the approved search/filter/sort and cards, with separate Light Table and Full
Table rows, each showing Add or its own quantity stepper. The upper card area SHALL be one details
trigger; portion controls SHALL sit outside it. The Signature information button SHALL be a sibling
of that trigger with its own accessible name, expanded state and 44px target.

The details dialog SHALL show nutrition with its independent comparison switch, portion purchasing
controls, declarations/heating and related dishes. Generic dish option controls SHALL be absent.
The box rail/sheet SHALL show portion, quantity and the applicable separate upgrades, and allow
Change box size. Continue SHALL require a full, valid box. Removing the final dish SHALL preserve
the active box and its capacity. Unavailable lines SHALL retain the existing replacement notice
and preserve extras, gift state and checkout progress while the customer repairs the box.

#### Scenario: Capacity is reached
- **WHEN** the next add would exceed capacity
- **THEN** the full-box dialog offers permitted resize/removal actions without submitting the add
- **AND** changing portions is not treated as changing the number of occupied slots.

### Requirement: FR-07 — Price resizing from the active box plan
`capability: box-builder` · `delta: MODIFIED (codex/portion-model-spec)`

“Expand to N dishes” SHALL display the target size's **box base price** from the active plan,
using the existing `boxPlanPricePence(plan, N)` rules: an exact preset wins; otherwise use the
plan's authored formula. It SHALL NOT compute the amount by adding a flat `extraDishPence` to
the previous price. The label SHALL make clear that dish upgrades, extras and other order charges
are separate; it SHALL not pass the box base price off as the final order total.

Resizing SHALL obey configured bounds consistent with the approved 6–99 range. Shrinking SHALL
never delete dishes to fit. In live mode a resize SHALL first adopt the server response; an intended
subsequent add SHALL then pass fresh capacity/availability checks. The current API is not an atomic
resize-and-add operation. If the add fails after resize succeeds, the UI SHALL explain the outcome
and retain the confirmed new size and existing contents.

#### Scenario: Crossing a preset boundary
- **WHEN** the customer expands from 11 to 12 dishes and the plan has an authored 12-dish preset
- **THEN** the offer shows that preset base price, not the 11-dish price plus one flat increment
- **AND** confirmation uses the server's returned quote; cancellation changes nothing.

### Requirement: FR-08 — Preserve approved extras choices and fix categories
`capability: extras` · `delta: MODIFIED (codex/portion-model-spec)`

A simple extra SHALL use fixed-price Add/stepper controls. An extra with an approved
single size or heat choice SHALL use its authored names, values, order and prices in the approved
picker. Extras SHALL NOT all be renamed Light/Full or inherit a dish Full Table surcharge.
Unsupported multi-dimensional or `Multi` configurations SHALL be flagged for catalogue/design
resolution, not silently flattened, dropped or expanded into invented combinations.

After a choice is added, the card SHALL show only chosen options as separate quantity rows, then
an add-another-option action while further options exist. Picking an already selected option SHALL
increment that option's line. Option identity SHALL remain canonical and independent of labels.
Details, nutrition comparison and Standards return SHALL retain the selected extra option.
Any existing supported option-change path SHALL move/merge the chosen quantity correctly, as
required by guide §16; this does not reintroduce the single-option Change control removed by the
approved multi-option card design. Short option pickers SHALL focus the current selection; richer
details and the mobile Your box sheet SHALL focus their own headings.

The approved Extras heading/Optional treatment, compact completed-dishes card, expandable dish
list, extra rows, rail and mobile summary SHALL match the referenced design, not just offer the
same underlying cart operations. Details SHALL include the approved related-extras treatment.

Category pills SHALL be generated from actual catalogue category identities/names and counts,
with All, search, single selection and the approved sort choices. Preserve unfamiliar authored
categories. Unclassified items SHALL appear under All, never be coerced into Sides. Search SHALL
scope pill counts; selecting a pill SHALL not change the other pills' search-scoped counts.
No fixed enum SHALL discard catalogue categories.

#### Scenario: Two sizes of one extra
- **WHEN** Regular and Sharing bag are both in the box
- **THEN** each has its own returned line ID, quantity, price and Undo action
- **AND** adding Regular again leaves Sharing bag unchanged.

#### Scenario: No extras are selected
- **WHEN** a valid full box enters Extras
- **THEN** Review remains available without an extras minimum
- **AND** “No extras? Skip” appears only outside the explicit Review-edit context.

### Requirement: FR-09 — Render Review from the authoritative order
`capability: review` · `delta: MODIFIED (codex/portion-model-spec)`

Review SHALL show read-only dish lines with quantity, portion, authored serving/weight text and
applicable Full Table and Signature charges. Change SHALL open Step 2 using FR-10. The old Edit
personalisation button and modal SHALL be removed. Extras SHALL be grouped by item with separate
option rows, line totals, per-unit prices when quantity exceeds one, and individual steppers/Undo.
There SHALL be no invented standalone dish base price allocated from the box total.

Order summary SHALL use returned quote components and Total. Where `deliveryListPence` exceeds
the charged delivery amount, show the list amount struck through beside the charged amount or
Free. A missing, equal or lower list amount SHALL not produce a saving. The list amount SHALL
never be added to the total. Full Table and Signature adjustments SHALL not be counted twice or
mislabelled from arbitrary legacy personalisation adjustments.

The primary action SHALL remain **CHECKOUT →**, with Secure checkout below, navigating to
`/box/checkout` after validity checks. This follows the latest approved Review design rather than
the older issue's button wording. Below 1024px, summary SHALL sit in normal flow; the mobile CTA
SHALL yield while its in-flow equivalent is visible and near the footer as specified by the design.

#### Scenario: Delivery is included
- **WHEN** the quote supplies a positive delivery list price and zero charged delivery
- **THEN** Review shows the struck-through list price beside Free
- **AND** its total agrees exactly with the authoritative quote.

### Requirement: FR-10 — Return from editing without losing context
`capability: review` · `delta: ADDED (codex/portion-model-spec)`

Review Change/Add extras SHALL navigate to Step 2 or 3 with `?return=review`. This context SHALL
remain in the URL through reload and Standards return, never in persisted cart state. Normal
navigation, global View box and later unrelated visits SHALL not inherit it. The prototype's
`resume=1` marker SHALL not become a separate source of order state.

In this context use Back to review, RETURN TO REVIEW on rail/sheet, and REVIEW on the mobile bar;
hide Skip on Extras. Apply the destination's validity rules: dishes require a full valid box;
extras need no minimum, but stale/invalid order state still requires repair. Ordinary step labels
SHALL name their destination: Back to Build your box, Back to Add dishes and Back to Extras.

Return SHALL use history back only when the prior entry is known to be Review; otherwise replace
with `/box/review?edited=dishes|extras`. Review SHALL refresh the authoritative cart on BFCache
`pageshow` and focus the corresponding section heading, scrolling only if it is off screen.
An incomplete box arriving at Review during explicit editing SHALL return to Step 2 with the edit
context. Unavailability recovery SHALL follow the normal earliest-invalid-stage rules.

#### Scenario: Review edit is refreshed and returned
- **WHEN** the customer changes a portion, reloads Step 2 and returns after filling the box
- **THEN** Review shows the current server-confirmed lines, extras and other retained order state
- **AND** the dishes heading receives focus without creating a Review/edit/Review history loop.

### Requirement: FR-11 — Provide eight-second Undo for removals
`capability: cart-recovery` · `delta: ADDED (codex/portion-model-spec)`

Steps 2, 3 and 4 SHALL use one shared removal pattern for supported dish/extra removals, including
quantity 1 → 0. A successful removal SHALL show “<Item> removed” with **Undo** for eight seconds,
pausing for real mouse hover or keyboard-visible focus only. Touch-emulated hover and focus moved
after a tap SHALL NOT pause indefinitely. As in `at-undo.js`, resuming after a pause SHALL leave
at least 2.5 seconds to act. Only one removal SHALL be undoable per page;
another removal finalises the earlier one. A new dish add SHALL finalise a pending dish removal
before it can consume the freed slot. Finalising means forgetting the restore action: it is not
a second DELETE. Clear an additions toast when Undo starts.

In live mode, the row SHALL indicate its pending mutation; committed quantities and money SHALL
change together on the confirmed response. The Undo clock SHALL start after confirmation, not
while the request is in flight. This is the deliberate production adaptation of the prototype's
immediate local mutation to the already-approved authoritative-cart contract.

Undo SHALL restore the removed item's exact variant, portion/options and quantity through an
item-level server mutation. It SHALL restore its original displayed list position where possible
on that page and focus the equivalent restored control, using the new returned line identity if
the server merges lines. The server's **current** prices and availability SHALL apply; Undo SHALL
not replay an old whole-cart snapshot or promise the old price.

The snackbar SHALL overlay rather than shift content, clear the mobile bar, use the approved
desktop/sheet placement, offer a 44px target and announce its status. Keyboard removal SHALL
transfer focus to Undo. Expiry/dismissal SHALL not strand focus on a removed control. Application
navigation SHALL wait for outstanding writes; an unused Undo opportunity expires on leaving the
page and is not persisted through reload.

#### Scenario: Removal fails
- **WHEN** the server rejects the removal or its outcome cannot yet be confirmed
- **THEN** the UI converges through the existing cart error/refetch path
- **AND** it does not announce a successful removal or offer a restore that might duplicate a line.

#### Scenario: Undo is no longer admissible
- **WHEN** another tab fills the slot, changes the cart version or the product becomes unavailable
- **THEN** Undo adopts any authoritative cart response and clearly reports that restoration failed
- **AND** it does not overfill the box, overwrite other edits or blindly retry an uncertain add.

### Requirement: FR-12 — Transition legacy selections explicitly
`capability: cart-recovery` · `delta: ADDED (codex/portion-model-spec)`

The system SHALL distinguish compatible portion-only lines from lines carrying
non-default retired selections or selections whose meaning cannot be recovered. Compatible lines
SHALL retain their quantities and portions. Affected lines SHALL remain understandable to the
customer and require explicit replacement/reselection before progression to checkout. The system
SHALL preserve unaffected dishes, extras, box capacity, gift intent, recipient, delivery draft,
codes and account/rewards preferences, subject to ordinary server revalidation.

The transition SHALL cover live drafts, demo storage, saved boxes and Order again imports. It
SHALL not assume that hiding controls migrates data, or import demo/legacy local storage into a live
cart. A known old default can be treated as compatible only where its equivalence is documented;
unknown keys or lost catalogue definitions SHALL never be interpreted as consent to a new default.

#### Scenario: Existing dish has a non-default protein choice
- **WHEN** that cart is first opened after the portion-only rollout
- **THEN** the customer can see which dish needs a new choice and what had been selected
- **AND** no catalogue revalidation or UI projection silently removes that choice before the
  preserve-and-repair transition has handled it.

### Requirement: FR-13 — Consume gift state without conflating products
`capability: review` · `delta: MODIFIED (codex/portion-model-spec)`

Food-box gift intent, an in-box gift-card product, greeting-card selection and a standalone
gift-card purchase SHALL remain separate states. Dish/extra edits and Undo SHALL not infer or
clear one from another. Project existing `checkoutDraft.gift` fields when available, and preserve
unowned checkout draft fields on writes. A local banner boolean SHALL not become a second source
of truth.

When #26 supplies food-box gift intent, the builder SHALL render the approved gift notice and
Review SHALL represent the selected gift/greeting information from that state. When #27 supplies
the in-box gift-card product contract, Review SHALL render its Gift section, Edit/quantity/removal
actions and quote charges through that contract. It SHALL not fabricate a gift-card line from
`giftIntent`, use an ordinary extra as a stand-in or include greeting/delivery display amounts twice.

After a real in-box Gift Card add/update, the relevant ordering steps SHALL show the approved
one-off “Gift card added to your food box” / “Gift card updated” confirmation, derived from the
actual basket operation. Removing that Gift Card SHALL also remove its confirmation; the message
SHALL never survive as an unrelated stored flag. Food-box gift intent SHALL not trigger it.

#### Scenario: Portions change in a gifted food box
- **WHEN** a dish is changed or removed and undone
- **THEN** food-box gift intent, recipient details, hide-prices and greeting-card choices survive
- **AND** an in-box gift card appears only if a real gift-card product is present.

Gift consumers can be implemented behind absent-state handling, but a fixture-only demonstration
does not satisfy end-to-end gifting acceptance or justify closing #29/#30 in full.

### Requirement: FR-14 — Verify design correspondence, not just feature presence
`capability: review` · `delta: ADDED (codex/portion-model-spec)`

Each mapped surface SHALL follow its approved visual source for layout, typography, colour,
spacing, image treatment, content order, exact control labels and responsive composition, while
using real data in the source's designated data positions. Shared components SHALL follow the
canonical design rules rather than accumulate page-specific approximations. Behaviour SHALL
follow the guide and shopping-state decisions when a prototype is explicitly stale.

All mapped pages SHALL satisfy the guide's §L acceptance questions: arrival/restored state, visible
content, available actions, destinations, failure handling, Back behaviour, retained choices,
signed-in state, active-order state and mobile/desktop parity. Exercise the actual rendered app,
not just component presence or route status. Record design/app comparisons and remaining
differences before marking a page complete.

Dialogs SHALL contain focus, close on Escape, restore focus and prevent background scrolling as
specified. Consent controls SHALL take priority over lower fixed purchase/Undo controls (guide
§A6–A7 and §I). Use the existing canonical shell and approved responsive rules, including the
Choose Box exception, rather than copying prototype runtime workarounds into React.

#### Scenario: A page has all actions but differs from its approved layout
- **WHEN** the application renders the required controls with a different hierarchy, mobile
  composition, label or interaction from the approved source
- **THEN** the difference remains an open UI acceptance item
- **AND** passing cart tests or a merged PR alone does not mark that page complete.

---

## Design

### Architectural decision

Use a small validated **view of the existing selection contract**, not a second cart engine or
new generic configuration framework. The purchase view needs the canonical choice key, label,
authored serving text and price delta; wire selections remain the existing canonical object.
Reuse the current encoder, resolver, provider, same-tab mutation queue and authoritative quote.
Retain generic helpers for legitimate extras and lossless legacy inspection; retiring the dish
personaliser does not justify deleting all selection handling.

| Concern | Source of truth / rule |
| --- | --- |
| Portion identity and default | Validated Aonik effective group; labels are presentation only. |
| Portion serving text | Authored choice note/resolved serving label. The current DTO has no typed per-choice gram field; do not parse labels or invent one. Catalogue preparation must supply consistent descriptions. |
| Purchase preview | Validated choice/default absolute-price difference; separate authored Signature surcharge. |
| Committed quantities, prices and totals | Complete Aonik cart and quote returned by each operation. |
| Nutrition/declarations/heating | Existing selection-aware product-content resolver, including withheld/stale flags. |
| Dish slot count and capacity | Server cart plus approved box plan; every portion unit occupies one slot. |
| Extras options/categories | Approved catalogue choices and category identities, not dish portion constants. |
| Review edit return | Explicit URL context plus verified history, never cart state. |
| Pending removal Undo | One short-lived item restore record per page, not a persisted order snapshot. |
| Gifts and checkout fields | Their independent backend draft/product contracts; preserved by unrelated cart edits. |

### Target architecture and contracts

At the catalogue boundary, validate eligibility and build the narrow purchase view. The current
variant resolver's first-active fallback is insufficient for products with ambiguous variants;
resolve that data/contract before enabling their v2 controls. Share the resulting view between
dish detail, card rows, quick views and line presentation. Demo fixtures must enter through the
same boundary and use catalogue prices configured under the approved D1 policy.

| Operation | Existing route/engine behaviour to retain |
| --- | --- |
| Add dish | Resolve actual variant ID, encode canonical portion and submit one add; adopt merged line IDs/quote. |
| Quantity/remove | PATCH/DELETE by returned line ID, using the existing serial queue. |
| Change a portion where an existing edit path is retained | One atomic line PATCH with explicit intended selection and `applyToUnits` where needed; never DELETE then ADD. The v2 Review UI delegates editing to Step 2 rather than introducing an inline editor. |
| Add another extra option | Encode that extra's canonical choice and add; identical selections may merge, different ones remain distinct. |
| Resize then add | Two acknowledged operations with an explicit partial-success state; no claim of transactionality. |
| Undo removal | A targeted add of the removed quantity/options; use the returned current cart, not cached prices/line IDs. |
| Failure/conflict | Preserve existing 404/cart-null handling and adopt authoritative 409 responses. Do not refresh a stale version solely to force a write, or replay an uncertain mutation blindly. |

A lost response requires reconciliation before the UI can claim success or offer a retry that may
duplicate an add. Reuse existing error/convergence seams; this spec does not assume a new backend
undo, batch-resize or idempotency endpoint already exists. During a pending operation, do not allow
duplicate activations across the card, rail, dialog and mobile sheet.

### Migration and release order

Aonik's stored-selection revalidation can repair selections when option groups are changed or
removed. Removing catalogue groups first can therefore destroy the evidence needed to tell a
customer that their old dish was customised. The preserve-and-repair requirement needs a
backend-aware rollout, not a frontend-only storage-version bump.

1. Inventory current product groups, variants, live draft/saved selections and selection-content
   coverage; distinguish test data from real customer state without exposing private data in logs.
2. Publish the approved £5 Full Table policy and validate a catalogue mapping and legacy transition against representative
   carts. If a migration marker/preserved old description is required, implement that backend
   support before its first read could normalise away the old values.
3. Deploy compatible readers/transition handling, then publish the approved portion-only catalogue
   and matching content, then enable the v2 purchase surfaces. Keep unaffected order state intact.
4. Verify legacy/saved/Order again entry paths and live quotes before treating the rollout as done.
   A rollback must retain the same meaning of already-created portion selections and gift state.

Do not bump demo storage just to erase inconvenient selections. A version change must have an
explicit migration/reset policy. Do not promise that the browser can reconstruct values already
discarded by backend revalidation. If the backend cannot preserve/report them, that is a
release blocker to resolve before changing the affected catalogue groups. It does not reopen the
already-defined visual/interaction work. A demonstrated need to discard or materially reinterpret
customer choices requires a specific decision supported by that finding.

### Likely implementation seams

- Catalogue and content: `web/src/lib/aonik/dto.ts`, `map.ts`, product resolution and
  `web/src/lib/dish/selectionContent.ts`.
- Dish page: `web/src/components/dish/DishOrderProvider.tsx`, `DishOrderPanel.tsx`,
  `DishPersonaliser.tsx`, `DishPurchaseBar.tsx`, `DishInfoPanels.tsx` and the dish route.
- Builder and Review: `web/src/components/checkout/DishPicker.tsx`, `BoxChooser.tsx`,
  Extras/Review components and shared summary/line presentation.
- Cart: `web/src/lib/cart/CartProvider.tsx`, `serverEngine.ts`, the demo engine/storage and
  same-origin route adapters. Keep the existing mutation ordering mechanism.
- Navigation: `web/src/lib/dish-return.ts`, quick-view return records and explicit Review-edit links.
- Delivery display: reuse the existing rules in `web/src/lib/checkout/summary.ts` where applicable.

These are integration seams, not a requirement to rename files or introduce every concept as a
new module. Do not ship the prototype scripts/storage alongside the React cart.

---

## Tasks

- [x] Resolve D1: £5 per dish unit, uniform across all dishes, additional to Signature; demo and local catalogue setup updated. Production publication remains part of rollout.
- [x] Ground Extras size/heat choices and read-only Review in guide §16–17; these are settled requirements.
- [x] Map each affected application surface to the behaviour guide and approved visual source; adopt §L acceptance.
- [ ] Inventory existing data and verify the preserve-and-repair transition before changing catalogue groups.
- [ ] Validate catalogue eligibility, variants, serving text and content coverage; document genuine backend
  gaps before implementation, including any migration preservation support and gift-product contract.
- [x] Record the scoped supersession of `effective-option-groups`; retain transport and cart guarantees.
- [x] Implement the shared validated portion view, canonical encoding and configurable preview pricing.
- [ ] Implement and rehearse the legacy transition before retiring dish option groups.
- [x] Replace Standard/Signature dish personalisers; preserve purchase-bar, content and Standards-return behaviour (#22).
- [x] Build Step 2 portion rows/details, correct resize offer pricing and retain recovery/box lifecycle (#29).
- [x] Implement shared removal Undo with server confirmation, focus, timing and failure handling on Steps 2–4.
- [x] Implement explicit Review-edit navigation and destination-specific Back labels on Steps 2–4.
- [x] Align Extras with the approved supported choice model; fix category data/counts and preserve entry gates (#30).
- [x] Remove the Review dish editor; group extra option rows and add delivery list-price presentation (#30).
- [ ] Integrate gift-state preservation/notices with #26 and the actual in-box gift-card section with #27;
  record these as outstanding if their producers are not ready, rather than simulating completion.
- [ ] Run the checks below, record app/design comparisons for FR-14, obtain design/code review and reconcile
  issue checklists against shipped main.

### Testing

**Unit/contract checks:** validate group/default/currency/variant failures; default omission versus
explicit reset; absolute choice-price deltas including nonzero defaults; Signature separation;
Light/Full slot counting; plan preset boundaries and 6/99 limits; authored extras categories and
independent option identity; content request races/withheld states; delivery list-price display;
explicit Review return context; and eight-second Undo timing, real mouse versus touch hover,
keyboard versus tap focus, pause/resume minimum and focus targets.

**Live integration checks:** same-portion merge/different-portion split, atomic edits at full capacity,
quantity changes, last-dish removal, resize-success/add-failure, remove/undo with changed price or
availability, rapid duplicate controls, stale-tab conflicts and lost responses. Assert every surface
converges on the server quote and no operation overwrites unrelated checkout/gift state. Exercise
real legacy cart reads before and after catalogue transition, saved boxes and Order again; local
fixtures alone cannot prove the backend migration behaviour.

**Browser checks:** Standard and Signature dish pages; carry into Step 1 and exactly-once commitment;
card/quick-view purchase and nutrition comparison; search/category/sort; normal and Review-edit
navigation, reload and BFCache; Standards round trips; incomplete/unavailable recovery; Undo from
cards, rail and sheet with keyboard and pointer; empty/selected extras; delivery saving; real gift
consumers when available. Inspect 320px, 390px, 1024px and 1280px layouts, keyboard focus, live-region
announcements, modal containment and non-overlapping sticky/Undo/summary controls against designs.
Include the consent-open state and the breakpoint transition at 640px. Apply the ten guide §L
questions to every row of the page-to-design matrix; capture comparable design/app views at the
same viewport and state and identify every remaining material difference. Expected exceptions
are real operational data and documented production integration, not unrecorded UI redesigns.

For implementation, run the repository's current unit suite, lint, TypeScript check and production
build. Regenerate Next route types through the normal build workflow if stale generated types
obscure the typecheck. Implementation evidence is recorded below; live migration and release
acceptance must not be inferred from demo verification.

### Implementation evidence — 10 October 2026

- Validation: **704 tests passed**, ESLint and TypeScript passed, and the Next.js production
  build passed in demo mode. Main was pulled at the start and fetched again before completion;
  `origin/main` remains `142b679f67787b5e49a0c995bf4bd2efbb558752`.
- D1 is approved: Full Table is **£5 per unit**, additional to Signature. A regression checks
  every demo dish and mixed-portion Signature totals. Local setup attaches only the validated
  portion group and refuses an incorrect £5 delta before making requests; it has not been run
  against production. The runtime still renders catalogue/cart prices, not a price in markup.
- Production-build browser verification: a six-dish box with two Full Table units and £9 of
  Signature upgrades totals £182.95 (fixture box £158 + portions £10 + Signature £9 + delivery
  £5.95). Adding a Hot Native Pepper Sauce adds £2.50, producing £185.45; keyboard Remove/Undo
  preserves that selected heat and total. Review's mobile sheet contains the dish disclosure,
  contextual Edit dishes link, grouped extras and totals; returning focuses `review-dishes`.
- Responsive inspection covered 320px, 390px, 1024px and 1280px. The 320px details dialog has no
  horizontal overflow; the 390px Review bar shows after hydration and yields to the in-flow
  summary; the 1024px Review document has no horizontal overflow. Earlier checks covered both
  Puff Puff sizes, the exact 11-to-12 preset expansion, and independent purchase/nutrition choices.
  Reference comparisons used approved Add Dishes v2 and Review v2 at matching viewport sizes.
  These are implementation checks, not independent design or production sign-off.

[Desktop Review evidence](evidence/portion-model/review-desktop.png) ·
[Mobile Review evidence](evidence/portion-model/review-mobile.png)

- Shared `portions.ts` validates the portion contract, normalises equivalent Light defaults for
  demo merge identity, preserves unknown legacy choices, and selects exact preset resize prices.
- Dish pages and Step 2 use catalogue-driven portion controls. Nutrition comparison is independent
  of purchasing; unavailable or stale selected-portion nutrition is withheld instead of scaled.
- `FlowActions`, `FlowDialog`, `FlowLines` and `FlowShell` share mutation admission, accessible
  modal behaviour, quantity/removal controls, Undo and authoritative quote presentation.
- Standards return records contain UI context only. Review links use witnessed same-tab history
  where provable and replace navigation otherwise, then focus the edited section.
- Extras retain independent size/heat rows and real category names. Review has no dish editor;
  reduced delivery charges show the actual list-price strike-through.
- Demo/browser checks verified mixed Light/Full/Signature totals, both Puff Puff sizes in one box,
  dish/extra Undo, keyboard Undo inside the mobile summary, contextual Review editing and the
  Full Table Standards round trip. The new unit suite covers invalid models, legacy identity,
  exact preset boundaries, return-record validation, partial delivery discounts, overfilled-box
  guards and eight-second/pause/resume Undo deadlines.
- Production catalogue inventory/migration has **not** run. A live dish with additional groups or
  ambiguous active variants is deliberately unavailable for new v2 purchases until its catalogue
  mapping is corrected. Stored legacy selections remain visible and require replacement; no cart
  storage is reset. Backend revalidation that discards old selections still needs a rollout fix.
- Food-gift checkout-draft state is retained and displayed. The actual in-box gift-card product
  section and producer-driven gift confirmations remain dependent on #26/#27; no fake product or
  gift state is introduced. Live catalogue publication/integration, final visual review and reviewer sign-off remain
  release/issue-closure gates.

### Issue acceptance and definition of done

| Issue | Closure evidence required |
| --- | --- |
| #22 | FR-01–05, FR-14: Standard/Signature approved layout, portion/content behaviour, old personaliser removal, current price/weight source, sticky CTA, genuine carry/Standards returns and honest missing-heating states. |
| #29 | FR-01–03, FR-05–07, FR-10–14: portion rows/details, server-correct resize offers, Undo, contextual return, replacement recovery and destination labels; gift notices/confirmation verified against actual gift state. |
| #30 | FR-08–14: approved Extras choices/categories, retained valid-box gates, grouped option rows, read-only Review dishes, editor removal, contextual return, Undo, delivery strike-through, Checkout CTA and real gift section/integration. |

Done means D1 is resolved for shipped pricing, the preserve-and-repair transition is verified,
applicable scenarios pass in demo and live modes, the FR-14 visual/behaviour comparison passes,
content readiness is explicitly accounted for, required checks are green and a reviewer has signed off. Each issue
must be checked against the deployed/merged implementation and its remaining dependencies before
closure. If gift producers or an agreed design decision remain outstanding, keep the affected
issue open or obtain explicit agreement to move that acceptance criterion into a linked follow-up;
do not close it solely because this shared portion work has merged.

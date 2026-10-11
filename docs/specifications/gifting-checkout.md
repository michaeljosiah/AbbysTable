---
spec_id: SPEC-2026-10-10-gifting-checkout
title: Gifting and Gift Card Checkout
status: in_progress
branch: codex/gifting-checkout
owner: michaeljosiah
capabilities: [gifting, gift-card-checkout, gift-food-box]
created: 2026-10-10
updated: 2026-10-10
---

# Gifting and Gift Card Checkout

## Why

Issues #26 and #27 are the first remaining UI families. The approved Gifting v2 and Gift Card Checkout designs define their layout and interaction; the behaviour guide and SHOPPING-STATE define persistence, entry, and payment boundaries. Latest storefront main was pulled at 142b679. Work stacks on the portion-model and site-alignment branches (#86/#87). Backend master was fetched into a separate worktree, preserving unrelated local changes.

## What changes

- ADDED gifting — responsive route cards, value/arrival/message configurator, unfinished gift reminder (FR-01).
- ADDED gift-card-checkout — independent draft, email/post form, quantity, calendar, Undo and Stripe handoff (FR-02).
- MODIFIED food-box gifting — explicit intent, hidden prices, greeting card, recipient and in-box card (FR-03; breaking: no).
- MODIFIED Aonik gift purchasing — 1–10 separate instruments and delivery records, partial drafts and email-only purchaser (FR-04; breaking: no).

## Requirements

### FR-01: Approved Gifting v2
`capability: gifting` · `delta: ADDED (codex/gifting-checkout)`

The system SHALL render the two route cards as a peeking carousel below 1024px and a two-column grid above it, with the approved section geometry, colours, typography and artwork. It SHALL offer mutually exclusive arrival radios, preset/custom value, optional email message and a physical greeting card. Browsing the configurator SHALL NOT create an active order or unfinished-gift reminder.

- **WHEN** a standalone gift reaches checkout
- **THEN** its server draft SHALL produce the unfinished-gift reminder on a later Gifting visit
- **AND** dismissing the reminder SHALL preserve the editable gift.

### FR-02: Separate checkout and truthful payment
`capability: gift-card-checkout` · `delta: ADDED (codex/gifting-checkout)`

The system SHALL keep standalone gifts separate from the food-box cart, use the approved transactional chrome without a food stepper, save partial details on the server, and forward the tab's cart version on writes. Quantity SHALL be 1–10. Restore SHALL remain available after Undo expires and across reload. Postage and greeting-card fees SHALL apply once per recipient, not once per card. Removal SHALL immediately zero the displayed total and offer eight-second Undo, paused during hover/focus. The order sheet SHALL be a true modal and show the same summary content. Scheduled dates SHALL use tenant send time and posting days. Payment SHALL use the existing Stripe/Aonik order and capture flow; a redirect SHALL NOT prove payment.

- **WHEN** another tab changes the draft
- **THEN** the stale write SHALL fail without overwriting it
- **AND** the customer SHALL be asked to reload the saved gift.

- **WHEN** prices or policy change before payment
- **THEN** the authoritative quote SHALL be reviewed again before paying.

### FR-03: Gift intent belongs to the food box
`capability: gift-food-box` · `delta: MODIFIED (codex/gifting-checkout)`

The system SHALL prompt USE MY CURRENT BOX AS A GIFT / KEEP MY CURRENT BOX for an existing normal box. Choosing Use SHALL preserve its dishes, portions, extras, discounts and delivery. Pre-commit intent SHALL NOT create an active box. Gift prices SHALL be hidden by default and a greeting card off by default. Turning off gift intent SHALL preserve the box and remove gift charges. An In Food Box gift card SHALL NOT make the food box a gift.

### FR-04: Funded quantity
`capability: gift-card-checkout` · `delta: MODIFIED (codex/gifting-quantity)`

The backend SHALL snapshot one order line, funded instrument, ledger issuance and delivery record per card. Replays SHALL issue no duplicates. Face value SHALL remain excluded from taxable sales and coupon/points discounts. Partial drafts SHALL NOT issue value or claim payment. Existing single-card snapshots SHALL remain readable.

## Design

CSS geometry is ported directly from `design/Abby's Table - Gifting v2.dc.html` and `design/Abby's Table - Gift Card Checkout.dc.html`; React replaces prototype scripts with real cart/auth/checkout operations. Standalone cart and payment proofs live in separate httpOnly cookies. Drafts live in Aonik's existing checkout JSON; demo drafts use a separate httpOnly demo cookie and cannot pay. In-box choices use the food cart's versioned queue. No address vendor is fabricated: manual entry is the supported fallback while Aonik #352 remains open.

User confirmed on 10 October: £50/£75/£100/£150 presets, whole-pound custom £1–£999, £3.95 postage, £3 greeting card, and quantity 1–10 with backend extension. Full Table remains the separately approved £5 per dish.

### Outstanding release decisions

- Gift-card validity period, or never expires.
- Scheduled email send time (tenant timezone).
- Physical posting days require configured backend values; demo follows the design weekday fixture.

Live purchase remains disabled unless Commerce, Finance and loyalty tenant policies, product, ledger, validity, terms and send rules are configured. This change does not activate production policy or take real payments.

## Tasks

- [x] Pull latest main and read approved sources and current backend contracts.
- [x] Confirm launch amounts and quantity with the user.
- [x] Complete Gifting and gift checkout UI and food-box integration (manual address fallback; live address lookup remains external).
- [x] Add and validate backend partial drafts, quantity and per-card funding — [Aonik #391](https://github.com/michaeljosiah/aonik/pull/391).
- [x] Check desktop/mobile visuals, calendar focus, modal Undo, restore after reload, postal fees and quantity limit. Payment contracts are checked with backend/route tests; live Stripe and authenticated states remain release verification.
- [x] Run appropriate frontend and backend checks; prepare linked draft review PRs.
- [ ] Obtain release policy decisions and configure them through the supported backend workflow.

### Definition of done

Acceptance scenarios and appropriate checks pass, visual evidence is recorded, backend dependency and release settings are explicit, and a reviewer signs off. Issues remain open until the complete checklist is met on merged main.

## Verification and evidence

- Frontend: 718 tests passed; lint and typecheck passed; production build passed with explicit demo catalogue mode. A live-catalogue build also completed after fetch retries; the retained build log/evidence uses the deterministic demo catalogue.
- Backend: full Application suite 3,331 passed / 2 existing skips; API build passed with existing ImageSharp advisory warnings.
- Browser: 375px and 1280px application previews; no horizontal overflow. The desktop summary heading rectangle matches the source export. Calendar modal focus and return focus were verified. Remove/Undo works inside the sheet; a removed draft reloads with Restore. Ten £75 postal cards with one £3.95 postage and one £3 greeting card total £756.95; unavailable weekend posting dates are disabled by configured days.
- [Gifting desktop](evidence/gifting-checkout/gifting-desktop.png), [Gifting phone](evidence/gifting-checkout/gifting-mobile.png), [Checkout desktop](evidence/gifting-checkout/checkout-desktop.png), [Order sheet](evidence/gifting-checkout/checkout-mobile-sheet.png), [Calendar](evidence/gifting-checkout/calendar-mobile.png). Screenshots use demo data, not evidence of live capture or delivery.

### Release boundaries

The live UK address vendor remains Aonik #352; manual entry works without sample address results. Validity and scheduled email time still need business decisions. Backend migration, active policies/loyalty, Stripe, account-setup email and fulfilment integration must be verified in the release environment. Staff refunds for several issued cards use one selected card per sequential refund request. No issue is closed on the strength of unmerged branches or fixture screenshots.

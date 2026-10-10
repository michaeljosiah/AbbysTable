---
spec_id: SPEC-2026-10-10-account-design-alignment
title: Account and points design alignment
status: in-review
branch: codex/account-design-alignment
owner: michaeljosiah
capabilities: [account, loyalty, checkout]
created: 2026-10-10
updated: 2026-10-10
---

# Account and points design alignment

## Why
The My Account design defines Points, sent Gift Cards, a per-dish Order Again sheet and secure email changes. The implementation omitted these and silently deferred the saved-box choice after sign-in. Issues #35 and #36 remain open; checkout #31 also needs the points/account panels.

## What changes
- ADDED account-benefits (FR-01): real balance, ledger, milestone and calculator; sent gift cards and rate-limited resend.
- MODIFIED cart-adoption (FR-02, breaking: no): explicit Keep this box / Use saved box with both displayed versions.
- MODIFIED reorder (FR-03, breaking: no): preview the owned paid order and submit selected purchase rows/quantities to the backend’s atomic new-box creation.
- MODIFIED identity (FR-04, breaking: no): editable email requests a secure confirmation; confirmation does not directly update the profile.
- ADDED checkout-benefits (FR-05): earn estimate, account intent and real quoted points redemption.
- ADDED checkout-gift-tender (FR-06): masked gift-card payment alongside a voucher, using the backend’s funding split.

## Requirements
`capability: account` · `delta: ADDED (codex/account-design-alignment)`

### FR-01: Customer benefits
The system SHALL render the design’s Points and Gift cards sections from owner-scoped no-store reads, never another customer’s data or fixture balances in production.
- WHEN points are redeemed or refunded THEN history SHALL show signed movements and the backend’s running balance.
- WHEN a new £5 milestone is displayed THEN that milestone SHALL be acknowledged after hydration; a failed acknowledgement SHALL leave it eligible to show again.
- WHEN the calculator is used THEN today’s catalogue box prices SHALL drive the estimate; invalid own sizes SHALL hide stale estimates.
- WHEN a resend is accepted THEN the UI SHALL say requested, without claiming an asynchronous email was delivered.

### FR-02: Sign-in box choice
The system SHALL preserve both meaningful boxes until an explicit Keep this box / Use saved box submission. The server SHALL use the versions displayed at sign-in and SHALL refuse stale choices rather than silently overwriting newer work.

### FR-03: Order Again
The system SHALL open the source design’s modal sheet, preselect currently available purchased dishes, allow unticking and quantity edits, re-price a new box from the current catalogue and carry no old date, gift details or codes. The backend SHALL accept only selection IDs from the owned paid order. An existing active box SHALL remain intact.

### FR-04: Secure email
The system SHALL request identity-service confirmation for an edited email. A neutral 202 SHALL not be presented as proof of dispatch. Link tokens SHALL enter via URL fragment, move to an httpOnly cookie and never appear in a server URL. The backend SHALL require recent validated IdP proof to complete the change; the frontend SHALL offer sign-in and retry.

### FR-05: Checkout points
The system SHALL display backend estimates and store the account intent before payment. Redemption SHALL use the backend’s applied amount and quote; a requested amount SHALL never be treated as an applied credit. Full draft replacements SHALL preserve all other checkout sections.

### FR-06: Gift-card payment
The system SHALL submit issued gift codes only in request bodies, expose only masked codes, and use the backend’s gift/card payment split without treating gift funding as an order discount. A current cart version SHALL accompany every change. One gift tender and one voucher may coexist; the UI SHALL not claim multiple gift tenders.

## Design
Source: `design/Abby's Table - My Account.dc.html`, `design/Abby's Table - Checkout v2.dc.html`, behaviour guide §§19–22 and `design/SHOPPING-STATE.md` §54. Port source spacing, responsive geometry, typography, copy and accessibility. Reuse the existing Account frame and checkout modal infrastructure.

Server cookies hold guest credentials, box-choice snapshots and email capabilities. Components receive only the customer’s display data. Backend preview is read-only; selected reorder uses existing serialized creation and rechecks catalogue/stock.

### Release boundaries
- Loyalty needs its tenant policy/ledger bindings enabled before live estimates/earning are available.
- Email changes need Auth0 verified email and recent `auth_time` claims, notification configuration pointing EmailChangePath to `/account/email-change`, and provider update/session revocation verification.
- The source prototype suggests adding into an existing box, while the behaviour guide specifies a new box. The existing backend protects an active box. This implementation retains that protection; it does not silently merge or replace it.
- The redemption control is functional but the prototype has no dedicated amount-entry layout. It uses the existing code/input treatment; this is an explicit design gap, not a claim of pixel equality.
- UK address lookup, paid delivery windows, multiple gift-card tenders and live fulfilment configuration are separate checkout contracts still to reconcile. No invented lookup results or delivery services are offered.
- Review and release-environment verification are required before issue closure; unmerged work does not close issues.

## Tasks
- [x] Points and Gift cards sections and navigation.
- [x] Explicit saved-box choice.
- [x] Secure email request/confirmation UI.
- [x] Points quote and account-intent controls.
- [x] Backend selected reorder, owned preview and modal sheet.
- [x] Gift-card payment split and masked code handling.
- [x] Contract tests, lint, typecheck, build and isolated account layout comparison.
- [ ] Review sign-off and merged-main verification.


## Validation and remaining verification
Main was fetched again and remains `142b679f67787b5e49a0c995bf4bd2efbb558752`; the earlier main pull was already up to date. This branch is PR #89, stacked on Gifting PR #88; selected reorder is Aonik PR #392, stacked on #391.

- Frontend: 728 tests pass; lint, typecheck and Next production build pass.
- Backend selected reorder: 3,339 application tests pass, two existing skips; 33 checkout/reorder API tests pass; API build passes with existing package advisories. Backend PR stacks on the 1–10 gift-card change.
- Contract scenarios cover signed history, masked sent gifts/empty 202 resend, displayed box versions, no automatic stale adoption retry, full draft preservation, gift funding split and no exposed bearer code, optional account creation without loyalty, and identity confirmation capability handling.
- Desktop isolated rendering of the real Points and Gift cards components matches source geometry. Points balance block: 848.67 × 156.65 CSS px; How points work card: 848.67 × 346.02 CSS px, both equal the source at the same desktop width. The vertical offset is the omitted site header in the isolated render.
- Phone checks use 375 × 812 viewport; the single-column components have no horizontal overflow. At that width, both source and rendered Points balance blocks measure 316 × 242.91 CSS px, and both How points work cards measure 316 × 643.20 CSS px. Evidence uses synthetic account data and real application components/styles; it is not a live auth/payment/email test. See `evidence/account-design-alignment/`.
- Automatic approval review rejected starting the preview with local test-auth environment settings (reason: “blocked by policy”, no detail). No retry of that action was made. Static component rendering needs no auth service or outbound API.
- Order-again interaction and secure identity flows still require authenticated browser/release verification and independent PR review. No issue is closed on unmerged evidence.

The gift expiry rule and scheduled email send time remain owner decisions. Tenant configuration must also supply approved box presets/prices; the calculator follows configuration rather than publishing source placeholder prices.

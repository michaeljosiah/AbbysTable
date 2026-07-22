---
spec_id: SPEC-2026-07-22-review-checkout
title: Review, delivery promise & checkout
status: draft
branch: feat/review-checkout
owner: michaeljosiah
capabilities: [checkout, delivery-promise]
created: 2026-07-22
updated: 2026-07-22
---

# Review, delivery promise & checkout

> **Verified 2026-07-22** against Aonik specs 068/069 and the shipped `Aonik.Commerce`
> implementation. Where the two disagreed, the code won. Correction: the checkout request
> body is `{ provider, paymentMethodType, … }`, not `{ paymentProvider, paymentMethod }` —
> both field names in the first draft were wrong. The A18 stop is confirmed verbatim in 068.

## Why

`/box/review` today renders client-computed totals and ends the journey — there is no
order. Aonik's checkout (Spec 068, extended by 071) turns the box session into the real
thing: a re-validated cart, a `ProductPurchase` order with a box envelope, an invoice, a
`PaymentIntent`, reserved stock, and the kitchen-facing selection landing. The
earliest-delivery promise shown across the storefront (Spec 069) is likewise live data with
an explicit "no promise" state the fixtures cannot express. This spec wires the last two
pages of the journey — review and a new confirmation — onto those surfaces.

Depends on: `SPEC-2026-07-22-aonik-transport`, `SPEC-2026-07-22-server-box-cart`.

## What changes

- MODIFIED delivery-promise — `getDeliveryWindow()` reads `GET /commerce/config/delivery`,
  including the 404 no-promise state and the `timezone` field (breaking: no)
- MODIFIED checkout — `/box/review` renders the authoritative continue-gate response and
  triggers checkout (FR-2, FR-3)
- ADDED checkout — `/box/confirmation` renders the checkout result (FR-4)
- ADDED checkout — 409 drift handling on continue/checkout re-renders the refreshed box
  with change notices (FR-3)

---

## Requirements

### Requirement: Delivery promise with an honest empty state
`capability: delivery-promise` · `delta: MODIFIED (feat/review-checkout)`

The system SHALL read the promise from `GET /commerce/config/delivery`, which returns
`{ earliestDeliveryDate: 'YYYY-MM-DD', timezone: '<IANA id>' }` — or **404 when the tenant
has no resolvable fulfilment calendar**, which means "no promise", not an error. The
`DeliveryWindow` type gains `timezone`; every surface that shows the date (homepage hero,
menu banner, dish page, box steps, review) SHALL render nothing (or neutral copy without a
date) in the no-promise state — a wrong date is worse than no date, and the storefront
never invents one. Responses cache with `revalidate: 300`; the 404 is not cached.

The date formats in the promise's own timezone semantics (it is a calendar date, not an
instant): render `earliestDeliveryDate` verbatim as a local date — never `new Date(...)`
through the viewer's timezone, which can shift it a day. Spec 069 states the value "is a
date, not a timestamp" and that the weekday label is always derived from it rather than
separately configured; the string-parsing rule is this storefront's implementation of that,
not an Aonik requirement.

The `revalidate: 300` figure and the "do not cache the 404" rule are likewise **our**
decisions: Spec 069 says only that the response "is cacheable for minutes — the value only
moves at cutoff or midnight" and names no TTL.

#### Scenario: No calendar, no date
- **WHEN** Aonik returns 404 for the delivery config
- **THEN** delivery-date copy is absent everywhere it would have appeared
- **AND** the pages otherwise render normally

#### Scenario: Date is timezone-safe
- **WHEN** the promise is `2026-08-06` and the viewer's browser is in UTC−10
- **THEN** the rendered date is 6 August 2026 (string-parsed, never Date-shifted)

### Requirement: Review renders the continue gate's truth
`capability: checkout` · `delta: MODIFIED (feat/review-checkout)`

The system SHALL call `POST /commerce/carts/{cartId}/continue` when `/box/review` loads
(via the `/api/cart` handlers). The response is the standard `{ box, quote, changes[] }` —
re-validated against the live catalogue. The review page renders: every line (dishes with
personalisation summaries, add-ons with their retail prices), the quote's component list,
the delivery line (charged amount from the quote's `deliveryCharged` component; the
struck-through list value from `quote.deliveryList`), and any change notices. Drift
surfaced here follows the `server-box-cart` rules — unavailable lines block the place-order
action until resolved.

#### Scenario: Review shows server truth, not navigation state
- **WHEN** the catalogue changed while the customer was on Step 3
- **THEN** review arrives with the repaired box and visible change notices
- **AND** the totals shown are the response quote's, not anything carried across navigation

### Requirement: Checkout and the drift stop
`capability: checkout` · `delta: ADDED (feat/review-checkout)`

The system SHALL place the order with `POST /commerce/carts/{cartId}/checkout` on the review
page's confirm action. The request body is
`{ provider, paymentMethodType, returnUrl?, cancelUrl?, customerAccountId?, discountCode? }`
— note the two required fields are `provider` and `paymentMethodType`, NOT
`paymentProvider`/`paymentMethod`. Outcomes:

1. **Success** → the response is `CheckoutResult`:
   `{ orderId, invoiceId?, paymentIntentId, paymentStatus, subtotal, discountTotal,
   taxTotal, total, currency, clientSecret?, checkoutUrl? }`. Store `orderId` in the
   confirmation's server context, clear the cart cookie, navigate to `/box/confirmation`.
   `clientSecret` (embedded PSP) and `checkoutUrl` (redirect PSP) are the payment handoff —
   this iteration ignores them, and the fact that they already exist on the wire is what
   makes the deferred PSP journey a pure addition rather than a reshaping.
2. **409 `commerce.box_drift`** → the error body carries the refreshed box. Re-render
   review from it with change notices — nothing was reserved or created; the customer
   confirms again on the refreshed truth. This is Aonik's A18 stop: ANY customer-visible
   change (structural drift, price change, unavailability) halts checkout exactly once per
   change.
3. **`commerce.storefront_validation`** (e.g. an unavailable line raced in) → render the
   message inline; the blocked-line UI shows the specifics.

Payment in this iteration is intentionally thin: the storefront sends the configured
`provider`/`paymentMethodType` labels and treats a created order as success (Aonik
materialises the `PaymentIntent` and invoice; capture is an operator flow). A PSP
redirect/capture journey is a future spec — nothing here forecloses it, because the checkout
response already carries the `paymentIntentId`, `clientSecret` and `checkoutUrl` it would
need.

The A18 stop is verified in Aonik Spec 068's invariants: "An option is retired, then a stale
client posts checkout directly (no intervening GET) → checkout aborts 409 with the refreshed
box + `changes[]`; nothing is reserved, no order or payment exists; resubmission against the
refreshed state succeeds." Note the trigger is **any** drift change, including an add-on
`price-changed` — not only structural drift. Aonik persists the repair before throwing, so
the resubmit is against saved state.

#### Scenario: Drift stops exactly the changed checkout
- **WHEN** a dish's availability collapses between review render and confirm
- **THEN** confirm returns 409 with the refreshed box; review re-renders with the notice
- **AND** confirming again (after resolution) succeeds without any duplicate order

#### Scenario: Success is terminal for the session
- **WHEN** checkout succeeds
- **THEN** the cart cookie is cleared and back-navigation to Steps 1–4 starts a fresh box
  (the old cart is checked out; Aonik rejects further edits on it)

### Requirement: Confirmation page
`capability: checkout` · `delta: ADDED (feat/review-checkout)`

The system SHALL add `/box/confirmation`, rendered from the checkout response: order
reference, the placed box (size, dish lines, add-ons), the charged totals, the delivery
promise as known at placement, and — when the customer is signed in
(`customer-identity`) — a link to the order's page under `/account/orders/{orderId}`.
Anonymous customers see a static thank-you with the order reference and guidance that the
reference is their record (guest order lookup is not offered in this iteration; the
adoption path in `customer-identity` is the account-linking story).

#### Scenario: Refresh-safe
- **WHEN** the customer refreshes the confirmation page
- **THEN** it still renders (server-held context or query-carried order reference), and
  never re-triggers checkout

---

## Design

### Architectural decision

**Review is the checkout trigger; there is no separate /checkout page.** The journey stays
four steps + review, as designed. What changes is that review's data comes from the
continue gate and its confirm action is the checkout POST with first-class 409 handling.
The drift stop is Aonik's guarantee; the frontend's whole job is to *re-render the refreshed
truth loudly* — it never retries automatically, because the stop exists precisely so the
customer re-confirms what changed.

Payment marches behind checkout deliberately (order-first, capture-later is how the
platform works — Order ≠ Payment ≠ Ledger). The storefront ships bookable orders now and
grows a PSP journey later without reshaping any of this spec's surfaces.

### Target architecture

```
/box/review (Server Component)
   └─ POST /api/cart/continue → { box, quote, changes } → render lines + components + notices
   └─ confirm (Server Action) → POST /api/cart/checkout
         ├─ 2xx → clear cookie → redirect /box/confirmation (order context)
         ├─ 409 box_drift → re-render review from error.box (notices)
         └─ 4xx validation → inline message

/box/confirmation (Server Component) — order reference + placed box + totals
GET /commerce/config/delivery — everywhere the date shows; 404 ⇒ omit
```

---

## Tasks
- [ ] `DeliveryWindow` type + mapper: `timezone`, no-promise state; string-safe date render
      helper; audit every delivery-date surface for the empty state
- [ ] `/api/cart/continue` + `/api/cart/checkout` route handlers (drift body passthrough,
      cookie clear on success)
- [ ] Review page over the continue response (lines incl. add-ons, component list, delivery
      line, notices, blocked state)
- [ ] Confirm server action with the three outcome branches
- [ ] `/box/confirmation` page (+ signed-in link-through when identity lands)
- [ ] Remove the last fixture pricing surfaces review still touches

### Testing
- Unit: no-promise rendering across surfaces; timezone-safe date formatting (UTC−10/UTC+14
  edges); drift-409 parser (refreshed box out of the error body).
- Integration: review renders a recorded continue response (notices + components); confirm
  → mocked 409 → re-render with refreshed totals; confirm → success → cookie cleared +
  redirect; refreshed confirmation stays stable.

### Definition of done
All scenarios pass; typecheck and build are green; a reviewer has signed off.

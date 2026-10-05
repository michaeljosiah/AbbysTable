---
spec_id: SPEC-2026-07-22-review-checkout
title: Review, delivery promise & checkout
status: superseded
branch: feat/review-checkout
owner: michaeljosiah
capabilities: [checkout, delivery-promise]
created: 2026-07-22
updated: 2026-10-05
---

# Review, delivery promise & checkout

> **Status 2026-10-05: superseded by the v2 design.** The Review page, the continue gate and
> the delivery promise shipped (382f5b3). The checkout model does not survive the v2 design:
> - **Checkout:** "Review is the checkout trigger; there is no separate /checkout page" and
>   "order-first, capture-later" are replaced by a separate Checkout step. It takes
>   payment **before** the order exists (`design/SHOPPING-STATE.md` §21, §42, §43; `Checkout v2.dc.html`).
> - **Review:** its CTA becomes CONTINUE TO CHECKOUT (§7).
> - **Confirmation:** shown only after payment succeeds, in three variants (§44–47).
> - **Delivery:** the promise becomes date selection with reservations (§16–20).
>
> A replacement checkout-and-payment spec is still to be written. Meanwhile:
> - **Storefront:** #31, #32 and #30.
> - **Aonik:** michaeljosiah/aonik#344, michaeljosiah/aonik#345,
>   michaeljosiah/aonik#346 and michaeljosiah/aonik#347.
> - **Live ordering today:** creates an unpaid order with no address, date or email
>   (#5).

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

> **Extended (2026-10-05):** the honest empty state stands. The design adds:
> - date selection against capacity, with 15-minute holds and expiry (`design/SHOPPING-STATE.md` §16–22);
> - an earliest date that is the next cooking run with capacity
>   (`design/frontend-backend-contract.md` §4).
>
> See #31 and michaeljosiah/aonik#346.

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

> **Superseded in part (2026-10-05):** the continue gate stands, but Review no longer places
> the order; its CTA is CONTINUE TO CHECKOUT (#30).

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

> **Superseded (2026-10-05):** this treats a created, unpaid order as success. The design
> creates the order exactly once, on successful payment (`design/SHOPPING-STATE.md` §42–43). The drift-stop
> handling carries over to the new Checkout step (#31, #5, michaeljosiah/aonik#344).

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

> **Superseded (2026-10-05):** Order Confirmation v2 shows only after payment succeeds and
> has guest, logged-in and account-created variants (`design/SHOPPING-STATE.md` §44–47). It uses site
> chrome, not the checkout stepper (#32, michaeljosiah/aonik#354).

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

*(Superseded 2026-10-05 — see the status note at the top.)* **Review is the checkout trigger;
there is no separate /checkout page.** The journey stays
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
- [x] `DeliveryWindow` type + mapper: `timezone`, no-promise state; string-safe date render
      helper; audit every delivery-date surface for the empty state
- [x] `/api/cart/continue` + `/api/cart/checkout` route handlers (drift body passthrough,
      cookie clear on success)
- [x] Review page over the continue response (lines incl. add-ons, component list, delivery
      line, notices, blocked state) *(`quote.deliveryListPence` is not rendered — #30)*
- [x] Confirm server action with the three outcome branches
- [x] `/box/confirmation` page (+ signed-in link-through when identity lands)
- [x] Remove the last fixture pricing surfaces review still touches *(done for live in
      f0bfc05; demo fixtures stay by design)*

### Implementation notes (2026-07-22)

**The drift body is mapped server-side.** `/api/cart/*` returns the refreshed box in the
same `cart` field an ordinary response uses, so the client adopts it through one path and
never learns Aonik's decimal money or DTO field names. The engine therefore adopts
`payload.cart` on failure as well as success — a 409 drift is a failure that nonetheless
carries authoritative state, because Aonik persists the repair before refusing.

**`cart: undefined` ≠ `cart: null`.** Undefined means "this response carried no box" (leave
the current one alone); null means "the cart is gone" (reset to empty). Collapsing them
would blank a customer's box on an unrelated failure.

**The confirmation renders from a cookie snapshot, not a re-fetch.** Both storefront order
routes are `Policies("AdminUserPolicy")` and party-scoped, so an anonymous customer cannot
read their own order back — there is no re-fetch to make. `checkoutBoxCart` therefore reads
the box *before* placing (checkout returns only totals) and writes a compact snapshot. The
writer sheds line detail, then all lines, rather than exceeding the ~4KB cookie cap: a
confirmation without the dish list is degraded, but one the browser silently drops is no
confirmation at all. `clientSecret` is deliberately excluded — it authorizes a payment.

**Delivery caching, measured not assumed.** Next's Data Cache does not store the 404, so
the no-promise state re-asks each render and a newly-configured calendar appears at once.
The 200 caches for 300s as specified. Note the Data Cache persists to `.next/cache` across
restarts — clear it when testing this, or a stale hit reads as a code bug.

**Live mode was broken on four routes and is now green on all ten.** `getHeatingInstructions`
and `getPersonalisationOptions` threw `notYetMapped`, taking down the dish page, Step 2,
Step 3 and review. Both concepts were *retired*, not unimplemented — there is no endpoint to
map — so they now return empty, which every caller already reads as "not personalisable" /
"use the framed generic note". `getExtras` is genuinely implemented against
`GET /commerce/catalog/extras` (this is `server-box-cart` FR-6, delivered here because
review could not render without it).

**`Extra.ingredients` / `Extra.allergens` are now optional.** They were required, and the
extras modal rendered `allergens.length > 0 ? … : 'None'` — which would have told a customer
a food was allergen-free when Aonik had merely withheld the declaration. An empty list now
means "declared, none"; absent means "not published", and the modal says so.

### Testing
- Unit: no-promise rendering across surfaces; timezone-safe date formatting (UTC−10/UTC+14
  edges); drift-409 parser (refreshed box out of the error body).
- Integration: review renders a recorded continue response (notices + components); confirm
  → mocked 409 → re-render with refreshed totals; confirm → success → cookie cleared +
  redirect; refreshed confirmation stays stable.

### Definition of done
All scenarios pass; typecheck and build are green; a reviewer has signed off.

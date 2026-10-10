---
spec_id: SPEC-2026-10-10-checkout-and-payment
title: Checkout v2, payment states and Order Confirmation v2
status: in-progress
branch: feat/checkout-and-payment
owner: michaeljosiah
capabilities: [checkout, delivery-reservation, discount-codes, payment-states, order-confirmation]
created: 2026-10-10
updated: 2026-10-10
---

# Checkout v2, payment states and Order Confirmation v2

> Sources: `design/Abby's Table - Checkout v2.dc.html`, the three payment-status pages and
> `Order Confirmation v2`, design/CLAUDE.md ("Checkout step 5", "Business rules — reconciled
> 5 Oct 2026"), SHOPPING-STATE, and Aonik `master` @ 6c02fcd1: `docs/features/checkout-drafts.md`
> (#347), `delivery-capacity.md` (#346), `stripe-checkout.md` (#344), `discount-codes.md`
> (#355), `guest-order-read.md`, `order-delivery-details.md` (#345). Where the design and Aonik
> disagree, this spec says which won and why.

## Why

Review's "Place order" created an unpaid order with no address, date or email. Aonik now
takes payment before an order is final (hosted Stripe Checkout), keeps the checkout form on the
cart, holds delivery capacity for a chosen date, and applies discount codes itself. The
storefront needs the Checkout v2 page that feeds those, the payment-status pages that read the
outcome back, and the confirmation that shows only a paid order.

Delivered in two PRs:

1. **#31 (PR #76):** `/box/checkout` up to CONTINUE TO PAYMENT. The draft, coverage,
   calendar, reservation and code are all live.
2. **#32, #5 (this PR):** the Stripe hand-off, `/box/payment/return`, `/box/payment`
   (processing / not completed / cancelled), retry against the same order, and Order
   Confirmation v2 read back from Aonik. Online ordering stays behind `LIVE_ORDERING_ENABLED`
   until a Stripe sandbox run has passed end to end.

## What changes

- ADDED checkout — `/box/checkout`, its entry gate, and the draft saved on the cart (FR-1, FR-2)
- ADDED delivery-reservation — suggestion, calendar, 15-minute hold display (FR-3, FR-4)
- ADDED checkout — eligibility from the coverage lookup, blocking payment (FR-5)
- ADDED discount-codes — one code, applied or refused by Aonik at once (FR-6)
- ADDED checkout — one blocker function, CONTINUE focus rules, summary/bar/sheet (FR-7, FR-8)
- MODIFIED checkout — Review's CTA goes to `/box/checkout`; `PlaceOrderButton` is removed (breaking: no)
- ADDED payment-states — the Stripe hand-off, the return, the payment pages and retry (FR-9, FR-10)
- ADDED order-confirmation — Order Confirmation v2, only for a paid order (FR-11)
- REMOVED checkout — the order snapshot cookie and the cart route's `checkout` action (breaking: no;
  nothing outside the box builder used them)

---

## Requirements

### Requirement: FR-1 Entry gate
`capability: checkout` · `delta: ADDED (feat/checkout-and-payment)`

The system SHALL decide `/box/checkout` on the server from Aonik's box (live):
- no box, or an expired one → `/box`;
- a box that is not full, or holds an unavailable dish → `/box/dishes`;
- `CheckedOut` → "This order has already been completed." with VIEW ORDER (SHOPPING-STATE §53);
- an `orderId` on an open box that Aonik has not proven closed (`canEdit` false) → through
  `/box/payment/return?outcome=cancel`, which asks Aonik to recover the attempt and then shows
  what it found (D26). Once recovery has proven it closed unpaid, the box is editable and
  checkout opens as usual.

Demo keeps the box in the browser, so its gate runs in the page and makes the same redirects.
The page is `force-dynamic` and `noindex`. A page render cannot set cookies, so a box that has
gone is treated as gone without clearing its cookie there; the next cart route clears it.

#### Scenario: an order placed in another tab
- **WHEN** the box Aonik returns is `CheckedOut`
- **THEN** the form is not rendered
- **AND** the page says the order has already been completed and links to it

### Requirement: FR-2 The draft lives on the cart
`capability: checkout` · `delta: ADDED (feat/checkout-and-payment)`

The system SHALL save the form's own sections (purchaser, address, notes) to
`PUT /commerce/carts/{id}/checkout-draft` when a field is left, debounced, and before CONTINUE.

Two rules make the save safe:
- **The save is a full replacement.** Aonik clears any section a save leaves out, so the route
  first reads the draft and echoes every section the form does not own: date, code, gift,
  account choice, accepted terms and points.
- **It carries the tab's `X-Cart-Version`, never the version from that read.** A change made in
  another tab is therefore refused (409) rather than overwritten.

On a refusal the route answers with the box, draft and hold as they are now. The page then
merges three ways: it keeps this tab's edit only where the server still holds what this tab
last saw, and takes the other tab's value everywhere else. It says the page was updated and
never replays the write.

Delivery is UK-only: `countryCode: "GB"`, with no county or country field. The postcode is
saved normalised. Field limits are Aonik's storage bounds, except the notes, which the design
caps at 250 characters.

#### Scenario: saving a name never clears a date
- **WHEN** a draft with a date and a code exists and the customer changes their name
- **THEN** the save sends the same date and code back with the new name

### Requirement: FR-3 Suggestion, not reservation
`capability: delivery-reservation` · `delta: ADDED (feat/checkout-and-payment)`

With no date chosen, the system SHALL suggest the earliest date (`GET /commerce/config/delivery`,
uncached: the first date with known capacity). It offers USE THIS DATE and CHOOSE ANOTHER DATE.
Showing the suggestion reserves nothing.

When Aonik cannot give a date (404, or unknown availability), the page shows SHOPPING-STATE
§22's "We can't confirm delivery availability right now. Please try again." with TRY AGAIN, and
payment stays blocked.

Choosing a date calls `PUT …/delivery-reservation`:
- `delivery_date_full` / `no_delivery` → "That date has just filled. Please choose another
  available date." (§19), the month is re-read, and the previous hold stands;
- `delivery_availability_unknown` → the §22 state;
- `reservation_expired` → the hold is re-read;
- another tab's change → reconciled as in FR-2, and the customer is asked to choose again.

The calendar is our own, never the native date input:
- **Placement:** a sheet on a phone, a popover from 640, and the "About delivery dates" note
  beside it from 768.
- **Range:** this month and the next three (D23, booking horizon still open), read one month at
  a time and uncached.
- **Day states:** available, fully booked (struck) and no delivery. Unknown is treated as no
  delivery. Each state is part of the day's accessible name.
- **Keyboard:** one tab stop; the arrows move to the next or previous available day across
  months; Home and End go to the month's first and last available day.

### Requirement: FR-4 The hold is Aonik's; the page only counts
`capability: delivery-reservation` · `delta: ADDED (feat/checkout-and-payment)`

The system SHALL compute the time left once, from Aonik's own `expiresAtUtc − serverNowUtc`, and
count down locally. A UTC time sent without its `Z` is still read as UTC.

The panel has three phases: saved (more than 3 minutes left), still reserved (3 minutes or less)
and ended. The ended phase shows CHOOSE A NEW DATE and blocks payment.

The hold is re-read on arrival, when the countdown reaches 0 and when the tab is shown again.
That read also reports the box's version as Aonik has it (`boxVersion`, never adopted). When it
differs from the version the page's form was read with, the page re-reads the box, draft and
hold together (`GET /api/checkout/sync`) and merges, as after a refused write. This is what
brings a page restored by Back or Forward, or one another tab changed, up to date. The
following all count as ended:
- `Released`;
- a lapsed `Held`;
- a status the page does not know;
- a draft date with no hold.

Only a change of phase is announced, never the minutes. Demo shows a chosen date and no panel,
because nothing is held.

### Requirement: FR-5 Eligibility blocks payment
`capability: checkout` · `delta: ADDED (feat/checkout-and-payment)`

The system SHALL judge the postcode as soon as it is well formed, by asking the coverage lookup
on blur through the Delivery & FAQs server action, rate limits included:
- `serves` → "We deliver to this address";
- `not_served` → "We don't currently deliver to this postcode." The field takes the error border
  only; the sentence is not repeated.
- A postcode that does not exist → "Check your postcode and try again." (§15).
- Could not check → "We couldn't check that postcode just now. Please try again in a moment."
  with TRY AGAIN.

Anything but `serves` for the postcode in the field blocks payment. A refusal never clears what
was typed.

### Requirement: FR-6 One code, applied by Aonik
`capability: discount-codes` · `delta: ADDED (feat/checkout-and-payment)`

The system SHALL apply a code with `PUT …/discount`, remove it with `DELETE`, and re-read the box
so the summary shows Aonik's own `discount` component and total. Each refusal says its real
reason (expired, used up, not eligible, inactive, currency, invalid). Our copy for these awaits
sign-off (#37, D7).

A saved code that has stopped applying (the quote's `reasonCode`) is stated and must be removed
before paying.

**Departure from the design (D7):** the design's section offers gift cards, rewards and vouchers,
says "you can add more than one" and "we'll apply it at payment". Aonik holds one discount code
per cart, applies it immediately, and gift cards are a separate tender (#27). So section 4 is
"Discount code": "Have a code? Enter it and we'll apply it to your order."

### Requirement: FR-7 One function decides what blocks payment
`capability: checkout` · `delta: ADDED (feat/checkout-and-payment)`

`checkoutBlockers` (`src/lib/checkout/form.ts`) SHALL return the gaps in page order:
1. email, first name, last name, address line 1, town and postcode;
2. eligibility, or the postcode error when the lookup found no such postcode;
3. phone;
4. the delivery date: none chosen, the hold ended, or availability unknown;
5. a lapsed code.

The rail, the sheet, the bar and CONTINUE all read it. After a CONTINUE attempt, the need line
reads:
- "Choose a delivery date to continue." when only the date is missing;
- "Choose a new delivery date to continue." when only the hold has ended;
- "Complete N details to continue." otherwise.

CONTINUE marks every gap, closes the sheet, scrolls the first gap's label under the sticky
header and focuses its control. Nothing typed is ever cleared. The field errors are the design's
copy, verbatim.

### Requirement: FR-8 Summary, bar and sheet
`capability: checkout` · `delta: ADDED (feat/checkout-and-payment)`

The summary SHALL render Aonik's components in Aonik's order and its total as given. Zero
upgrade and extras rows are left out. Delivery always shows: "Free" with the struck list price,
or the amount charged. Its label carries the held date ("Delivery · Thu 22 Oct"), and before a
date is held it reads "Delivery" (D25).

**Below 1024:**
- The summary sits in page flow, the same markup as the rail.
- An 85px bar ("View order ⌃" + PAY SECURELY) opens a true modal sheet:
  - everything else is inert;
  - focus starts on its heading and returns to the bar on close.
- The bar hides while the summary's own CTA is on screen and once the footer is
  three-quarters up the screen.

**From 1024:** the summary is the sticky rail.

The legal line's links open Terms and Privacy in a new tab with `?from=checkout`.

### Requirement: FR-9 CONTINUE TO PAYMENT hands off to Stripe
`capability: payment-states` · `delta: ADDED (feat/checkout-and-payment)`

The system SHALL start payment only from CONTINUE, and only while `LIVE_ORDERING_ENABLED` is
on (checked on the server: `ordering.disabled`, 403, with no Aonik call). CONTINUE first saves
the form; a save that failed or merged another tab's change stops it there. Then
`POST /api/checkout/pay { expectedTotalPence }` runs, on the version the form was read with:
1. The current Terms of Sale version is recorded on the draft (`acceptedTermsVersion`, D29: the
   legal line says continuing is acceptance). Nothing is written when the tenant has none.
2. `POST /commerce/carts/{id}/checkout` with `Stripe`/`Card`, return and cancel URLs on
   `STOREFRONT_ORIGIN` (or the request's origin), and `expectedTotal` set to the total on
   screen. There is no `delivery`, no `discountCode` and no `customerAccountId`: the saved
   draft is the source, and an account-backed order would need staff to recover.
3. The attempt's references go into an httpOnly cookie (`abbys-table-payment`: `orderId`,
   `paymentIntentId`, the guest order token, the agreed total; 7 days). They never go into a
   URL, a log or analytics.
4. The page goes to Aonik's `checkoutUrl` (HTTPS only). A replayed attempt that has already been
   paid goes to the confirmation; one that cannot take payment now goes to `/box/payment`.

Aonik's refusals come back named:
- the total moved: with the box, so the summary shows the new one;
- the box changed: an unavailable dish goes back to the dishes;
- the date: full, ended or availability unknown;
- the postcode is not served, or coverage could not be checked;
- the terms changed.

Nothing is retried automatically except a network failure, which is asked once more: Aonik
resumes the same attempt. After that the page goes to `/box/payment`, which reads what
happened.

#### Scenario: the total moved since the page was drawn
- **WHEN** Aonik refuses the checkout with `commerce.discount_price_changed`
- **THEN** nothing is started and no cookie is written
- **AND** the summary shows the box as it is now, and the page asks the customer to check it

### Requirement: FR-10 The payment pages read Aonik, never the browser
`capability: payment-states` · `delta: ADDED (feat/checkout-and-payment)`

`/box/payment/return?outcome=success|cancel` is navigation only. A success return goes to
`/box/payment`. A cancel return asks Aonik to RECOVER the attempt (`POST …/payment/recover`),
then goes to what Aonik found:
- `?outcome=cancelled` once the attempt is proven closed and unpaid;
- `?outcome=failed` for a failed attempt;
- `?outcome=checking` while it is uncertain;
- the confirmation once it has been captured.

`/box/payment` shows processing, not completed or cancelled (`paymentStatusPage`), from Aonik's
`GET …/payment`. While the payment is being confirmed it polls at 2s, 5s, then every 10s (30s
after a 429), and after 20s says it is taking longer than usual. A paid order goes to the
confirmation. A box with no attempt goes back to checkout.

"No charges have been made" appears only after recovery has proven the attempt closed.

TRY AGAIN, USE ANOTHER CARD and CONTINUE TO PAYMENT are one action (`/api/checkout/retry`):
- an attempt that can still take payment returns to the SAME Stripe session;
- one that recovery closed unpaid has its saved date reserved again (D16), and a new attempt
  starts on the same order with the total the customer agreed to;
- a date that has gone, or a total that moved, goes back to checkout to choose or confirm
  again;
- anything still undecided stays on the page and never starts a second payment.

#### Scenario: the customer cancels on Stripe's page
- **WHEN** Stripe sends the customer to the cancel URL
- **THEN** Aonik is asked to recover the attempt before anything is said
- **AND** "cancelled" is shown only if Aonik proved the attempt closed and unpaid

### Requirement: FR-11 Order Confirmation v2, only for a paid order
`capability: order-confirmation` · `delta: ADDED (feat/checkout-and-payment)`

`/box/confirmation` (the site's own chrome) reads the order from Aonik for the attempt in the
payment cookie:
- a guest's with `X-Order-Token` (`/commerce/storefront/guest-orders/{id}`);
- a signed-in customer's with their bearer token.

It renders only when Aonik reports the payment `Captured`. An unpaid order goes to
`/box/payment`; with nothing to read, the page says so and implies nothing about whether an
order exists.

The rows are what the order records. Delivery is derived as total − (subtotal − discount −
points + tax). The variant comes from `loyalty.earningStatus`:
- `Earned` (signed in) → Logged in, with the points added;
- `AccountSetupRequired` → Account set up, with neutral copy (D8);
- anything else → Guest, with nothing after Total.

The tracking-email line is left out (D10): nothing sends one yet. The lede's "We've emailed
your order confirmation" is Aonik's own email, sent once the payment is captured (aonik#349).
The Stripe sandbox run must confirm it arrives before ordering is turned on. The old order
snapshot cookie is gone.

#### Scenario: a guest's paid order
- **WHEN** the payment cookie names an order whose payment is `Captured`
- **THEN** the order number, delivery, rows and total are Aonik's
- **AND** no account or points wording is shown

---

## Design

### Architectural decision

The checkout form is client state over a server-held draft. Every write goes through
`/api/checkout/*`, the only code beyond `/api/cart` that sees the cart cookie, and through the
cart engine's queue (`checkoutRequest`). As a result:
- draft saves, date holds and code changes run one at a time;
- each carries the version the page's form, hold and code were read with, and is built when its
  turn comes, so a save queued behind a merge sends the merged form;
- each adopts the box or version it gets back; a read never hands over a bare version.

A checkout write therefore never leaves Review or the box steps holding a stale version, and a
version is only ever adopted together with the box, draft and hold it belongs to.

### Target architecture

- `src/lib/checkout/`, React-free:
  - `form.ts`: fields, validation copy, postcode formatting, `checkoutBlockers`, `needText`, the
    draft mapping and the three-way merge;
  - `calendar.ts`: month grids, labels and keyboard steps;
  - `reservation.ts`: reading the hold, its phases and announcements;
  - `codes.ts`;
  - `summary.ts`;
  - `transport.ts`: the route's answers;
  - `server.ts`: SERVER-ONLY. The entry gate and Aonik's draft, reservation and discount
    calls.
- `src/app/api/checkout/[action]/route.ts`: `GET sync`, `PUT draft`, `GET|PUT reservation`,
  `PUT|DELETE discount` and `GET dates`.
- `AonikClient.getDeliveryCalendar(fromDate, days)`:
  - **Live:** `/commerce/config/delivery/dates`, uncached; its `earliestDeliveryDate` is the suggestion.
  - **Demo:** the design's holding availability, counted from today.
- `src/components/checkout/checkout/`: `CheckoutView` (state), `DeliveryDate`,
  `DeliveryCalendar`, `InfoNote`, `OrderSummary`, `CheckoutStatus`, and `useOverlay` (sheet vs
  popover).

### Not in this PR, and why

- **Delivery time windows:** Aonik rejects any `windowId` (D1).
- **Address lookup:** no address-lookup provider yet (aonik#352; D3). Manual entry only.
- **In-checkout log in, signed-in prefill and "Create an account":** next steps, with #34's
  setup landing.
- **Points:** #36.
- **Gift food box and greeting card:** #26 (D5).
- **Gift-card tender:** #27.
- **Google/Apple sign-in:** no provider configured (D19).

---

## Tasks
- [x] Aonik DTOs, `getDeliveryCalendar`, and the checkout server calls
- [x] `/api/checkout/*` with typed refusals and conflict sync
- [x] Engine `checkoutRequest` (queued, version-adopting)
- [x] `/box/checkout`: gate, sections 1–4, calendar, hold, eligibility, code, summary/bar/sheet
- [x] Review's CTA → `/box/checkout`; `PlaceOrderButton` removed; stepper step 5 lit
- [x] FR-9 the Stripe hand-off: terms, `POST …/checkout`, the payment cookie, named refusals
- [x] FR-10 `/box/payment/return`, `/box/payment` (processing / not completed / cancelled), retry
- [x] FR-11 Order Confirmation v2; the order snapshot cookie and the cart route's `checkout` removed

### Testing
- Unit (`tests/checkout.test.tsx`):
  - validation copy, postcode formatting, blockers and need text, the draft mapping, the
    three-way merge;
  - the calendar grid, labels and steps;
  - the hold's phases and announcements;
  - code reasons and summary rows;
  - the route: a draft echo on the tab's version, conflict sync, reservation refusals, code
    refusals, the calendar read;
  - the entry gate in a page render.
- Unit (`tests/payment.test.tsx`):
  - the payment pages' mapping and polling delays;
  - pay: closed ordering, the terms then the checkout on the right versions, the cookie, the
    named refusals;
  - the return: success, a cancel recovered, failed, uncertain, paid;
  - retry: the same session, then a re-reserved date and a new attempt, a full date, an
    undecided payment;
  - the gate during an attempt;
  - the confirmation's rows and variant, read with the guest token, paid only.
- Browser, against a stand-in Aonik in live mode:
  - eligibility refused and served;
  - draft saved;
  - full day disabled;
  - hold saved, warn and ended;
  - code refused, applied and removed;
  - another tab's change merged;
  - CONTINUE focus;
  - the sheet's focus and inert page.

### Definition of done
All scenarios pass; typecheck and build are green; a reviewer has signed off.

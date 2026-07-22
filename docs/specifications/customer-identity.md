---
spec_id: SPEC-2026-07-22-customer-identity
title: Accounts — register, sign in, adopt the box, my orders
status: draft
branch: feat/customer-identity
owner: michaeljosiah
capabilities: [identity, orders]
created: 2026-07-22
updated: 2026-07-22
---

# Accounts — register, sign in, adopt the box, my orders

## Why

The login and registration pages are deliberate stubs: they validate locally and then say
"Online accounts are nearly ready — nothing was sent." The backend they were waiting for
exists (Aonik Spec 072 + the platform identity it deliberately reuses): registration that
provisions a real customer (`User` + `Party` + the `PersonalUser` role at the identity
provider and in Aonik), password login, guest-cart **adoption** (the box built before
signing in becomes the account's box, and the guest token dies), and a party-scoped order
history. This spec gives those pages their first real contract and adds the account area.

Depends on: `SPEC-2026-07-22-aonik-transport`, `SPEC-2026-07-22-server-box-cart`,
`SPEC-2026-07-22-review-checkout`.

## What changes

- MODIFIED identity — the register and login pages submit to real endpoints via server
  actions (breaking: no — the pages exist; the notice goes away)
- ADDED identity — httpOnly session cookie holding the customer's tokens; session-aware
  header state (FR-2)
- ADDED identity — automatic guest-cart adoption on sign-in/registration (FR-3)
- ADDED orders — `/account/orders` (paged history) and `/account/orders/[orderId]`
  (detail) (FR-4)

---

## Requirements

### Requirement: Registration and login on platform endpoints
`capability: identity` · `delta: MODIFIED (feat/customer-identity)`

The system SHALL submit the registration form to Aonik's
`POST /v1/registrations/individual` (anonymous, tenant-scoped via `X-Tenant-Id`), which
provisions the IdP user and the platform records (User, Party, PersonalUser role) in one
call, and the login form to `POST /auth/token` (the password grant the platform exposes;
availability is IdP-configuration-gated per deployment). Both flows run in **server
actions/route handlers only** — credentials transit the Next server, never a
browser-to-Aonik call, and are never logged or stored beyond the exchange.

Error mapping: duplicate registration and bad credentials render the endpoint's message
inline without inventing detail; a `password grant disabled` configuration response renders
the "accounts unavailable" state (the current notice, now truthful) rather than a form
error.

The Google button STAYS disabled with its existing notice. Social sign-in is federation at
the tenant's identity provider (Aonik ADR-007 — Keycloak owns upstream IdPs); it becomes a
redirect flow in a future spec once the tenant configures it, and no password-grant
plumbing built here forecloses that.

The reset-password page is deferred (the platform endpoint exists; the page does not) —
tracked as a follow-up task, not a scenario.

#### Scenario: Registration provisions and signs in
- **WHEN** a new customer submits valid registration details
- **THEN** the server action registers, then immediately performs the token exchange
- **AND** the customer lands signed in (session cookie set) with no second form

#### Scenario: Credentials never reach the browser's world
- **WHEN** either form submits
- **THEN** the request is a same-origin server action; the Aonik call happens server-side
- **AND** no token or password appears in client JavaScript, localStorage, or URLs

### Requirement: Session
`capability: identity` · `delta: ADDED (feat/customer-identity)`

The system SHALL hold the customer session in an httpOnly, `SameSite=Lax`, `Secure` cookie
(access token + expiry; refresh token when the grant supplies one), managed by the same
route-handler layer as the cart cookie. Authenticated Aonik calls (adopt, my-orders) attach
`Authorization: Bearer <access token>` server-side. Expiry handling: a 401 from Aonik
clears the session cookie and renders the signed-out state; silent refresh is attempted
first when a refresh token exists. The header renders session-aware state everywhere: "Sign
in" ↔ an account menu (orders, sign out). Sign-out clears the session cookie — the cart
cookie survives (a signed-out customer keeps a guest view of nothing: adopted carts are
party-bound, so sign-out simply ends access until the next sign-in).

#### Scenario: Expired session degrades to signed-out
- **WHEN** an account page loads with an expired, unrefreshable session
- **THEN** the session cookie is cleared and the customer sees the signed-in-required state
  with a sign-in link — never a raw 401 page

### Requirement: Guest-cart adoption on sign-in
`capability: identity` · `delta: ADDED (feat/customer-identity)`

The system SHALL, immediately after any successful sign-in or registration **while a guest
cart cookie exists**, call `POST /commerce/carts/{cartId}/adopt` with the stored
`X-Cart-Token` and the new session's bearer. Semantics (Aonik-enforced; the frontend's job
is to route the outcomes):

- **Success** → the cart now belongs to the customer's party and the guest token is dead.
  The route handler drops the token from the cart cookie (keeping `cartId`); all further
  cart calls authorize via the session bearer alone.
- **404** → the cart was unknown, expired, or already someone else's; clear the cart cookie
  silently (fail-closed is indistinguishable by design — no copy speculates).
- **Z4 validation error** (cart already checked out) → skip silently; the box already
  became an order and lives in order history.

Adoption is idempotent for the owning party, so a double-fired sign-in flow is harmless.
After adoption, a signed-in customer's cart calls succeed with no token — and a cart
created while signed in is party-bound from birth (Aonik stamps the buyer from the
principal), so adoption is only ever needed for carts that predate the session.

#### Scenario: The pre-login box survives sign-in
- **WHEN** a customer builds a 6-box as a guest, then registers mid-journey
- **THEN** after the redirect they are signed in and the same box renders on Step 2–4
- **AND** the old guest token no longer works anywhere (server-verified semantics; the
  frontend no longer holds it)

#### Scenario: Signed-in carts need no adoption
- **WHEN** a signed-in customer starts a new box
- **THEN** no adopt call is made and no token is stored — the session bearer authorizes
  every cart call

### Requirement: Order history and detail
`capability: orders` · `delta: ADDED (feat/customer-identity)`

The system SHALL add `/account/orders` reading
`GET /commerce/storefront/orders?page={n}&pageSize={m}` (authenticated; paged envelope
`{ items, totalCount, page, pageSize }`, newest first, default page size 20, cap 100) with
rows `{ orderId, placedAtUtc, status, currency, total, boxSize? }`, and
`/account/orders/[orderId]` reading `GET /commerce/storefront/orders/{orderId}`:
`{ orderId, placedAtUtc, status, currency, subtotal, discountTotal, taxTotal, total,
boxSize?, items[{ itemType, quantity?, unitPrice?, amountIn, sku? }],
selections[{ productVariantId, quantity, sku, personalisationSummary? }] }`. The
`selections` are the placed box's dish lines with their human-readable personalisation —
render them as "what's in this box"; `items` are the charged retail lines (the box
aggregate, any add-ons, a delivery fee when charged).

Scoping is server-side (the query resolves only the customer's own carts' orders): a
foreign or unknown order id is a 404 — render not-found, never a permissions message. An
authenticated user with no party link gets an empty history (the platform treats them as a
guest); both pages require a session and bounce to sign-in without one.

#### Scenario: History pages
- **WHEN** a customer with 25 orders opens /account/orders
- **THEN** 20 render with paging controls driven by `totalCount`
- **AND** page 2 renders the remaining 5

#### Scenario: Foreign order id
- **WHEN** a signed-in customer opens another customer's order URL
- **THEN** the page renders not-found (the API answered 404)

---

## Design

### Architectural decision

**No frontend identity innovation.** Every auth capability is the platform's existing one
(registration, password grant, roles); the storefront adds only transport (server actions,
one session cookie) and the two moments Commerce defined for it: adopt-on-sign-in and the
account pages. The session and cart cookies are siblings managed by the same handler
layer — one holds who you are, the other holds the box you're building; adoption is the
handshake that moves a box from the second world into the first.

### Target architecture

```
(auth)/register → server action → POST /v1/registrations/individual → POST /auth/token
(auth)/login    → server action → POST /auth/token
        │ set session cookie (httpOnly)
        └ if cart cookie has a token → POST /commerce/carts/{id}/adopt
              ├ 200 → drop token, keep cartId
              ├ 404 → clear cart cookie
              └ Z4  → ignore (already an order)

/account/orders            → GET /commerce/storefront/orders?page&pageSize (bearer)
/account/orders/[orderId]  → GET /commerce/storefront/orders/{id} (bearer; 404 → notFound())
Header: session-aware (Sign in ↔ account menu)
```

### Operator data / deployment prerequisites

- The tenant's IdP must have the password grant enabled for `/auth/token` to serve
  storefront logins (deployment configuration, not code).
- `AONIK_TENANT_ID` (from `aonik-transport`) scopes registration and login to the
  AbbysTable tenant.

---

## Tasks
- [ ] Session cookie module + route-handler auth attachment (+ 401 → clear → signed-out)
- [ ] Register/login server actions on the real endpoints; remove the stub notices; keep
      the Google button's disabled state
- [ ] Adopt-on-sign-in in the auth flow with the three outcome branches
- [ ] Cart handlers: bearer-first authorization (token only when the cookie still holds one)
- [ ] `/account/orders` + `/account/orders/[orderId]` pages + header account menu
- [ ] Confirmation page link-through (from `review-checkout`) once signed in
- [ ] Follow-up (deferred): reset-password page; social federation redirect flow

### Testing
- Unit: session cookie encode/decode + expiry math; adoption outcome router (200/404/Z4);
  order DTO mappers (paged envelope, detail with selections).
- Integration: register→auto-login→adopt happy path against mocked Aonik (cookie
  transitions asserted: token dropped, session set); login with existing party lists only
  that party's orders (recorded fixtures); foreign order id renders not-found; expired
  session redirects to sign-in.

### Definition of done
All scenarios pass; typecheck and build are green; a reviewer has signed off.

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

> **Verified 2026-07-22** against Aonik spec 072, ADR-007 and the shipped `Aonik.Commerce`
> implementation. Where the two disagreed, the code won. Corrections: there is no `Z4` error
> code (that is a documentation rule label — the wire code is
> `commerce.storefront_validation`), and the IdP is operator-level, not tenant-level, which
> changes who can enable Google sign-in and how.
>
> **Re-verified 2026-07-22 against `Aonik.Platform` before implementation.** Four further
> corrections, the first of which blocks login entirely:
>
> 1. **`POST /auth/token` requires a `clientId`.** `TokenRequestDto.ClientId` is
>    non-nullable (`Contracts/Api/Identity/AuthContracts.cs`) and this spec never mentioned
>    it. The storefront needs an `AONIK_AUTH_CLIENT_ID` — the OAuth client the deployment's
>    Keycloak issues storefront tokens for. Without it there is no login.
> 2. **Registration's tenant belongs in the BODY, not the header.**
>    `IndividualRegistrationEndpoint.ResolveTenantIdAsync` takes `req.TenantId` first and
>    only then consults `Auth:TenantRouting`, which may be `Subdomain` (header ignored) or
>    unset (returns 400 "TenantId is required for registration"). Sending
>    `X-Tenant-Id` alone is correct in exactly one deployment configuration; sending
>    `tenantId` in the body is correct in all of them. We send both.
> 3. **The auth endpoints do not use the standard error envelope.** Both write
>    `{ error: <message> }` directly with no `code` field: registration conflict is **409**,
>    token failure is **400**. Branching must therefore key on status and endpoint, never on
>    a code. Note a 409 here is *not* box drift — `AonikError.isDrift` additionally requires
>    the drift code, so it does not false-positive, but nothing else may assume 409 ⇒ drift.
> 4. **Adopt's 400 has two causes, not one.** `AdoptCartEndpoint` throws
>    `StorefrontValidationException` when the principal has no party
>    ("This account has no customer profile to adopt the cart into.") in addition to the
>    cart-no-longer-Open case this spec described. Both are non-fatal to sign-in and the
>    frontend treats them the same way — proceed signed-in, do not block — but they are
>    different facts and only one of them means "it already became an order".

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
`POST /v1/registrations/individual` (anonymous; tenant sent in the request body as
`tenantId` **and** as the `X-Tenant-Id` header — see correction 2), which provisions the IdP
user and the platform records (User, Party, PersonalUser role) in one call, and the login
form to `POST /auth/token` (the password grant the platform exposes; availability is
IdP-configuration-gated per deployment).

Request bodies, from the shipped records:
`IndividualRegistrationRequest { tenantId?, registrationCountry?, title?, firstName,
lastName, email, phone?, password }` → `{ userId, partyId, onboarding }` — **no tokens**,
which is why registration is followed by an immediate token exchange.
`TokenRequestDto { grantType, clientId, username?, password?, scope?, redirectUri?,
codeVerifier?, authorizationCode?, refreshToken? }` →
`{ accessToken, refreshToken?, expiresIn, tokenType, idToken? }`. Both flows run in **server
actions/route handlers only** — credentials transit the Next server, never a
browser-to-Aonik call, and are never logged or stored beyond the exchange.

Error mapping: duplicate registration and bad credentials render the endpoint's message
inline without inventing detail; a `password grant disabled` configuration response renders
the "accounts unavailable" state (the current notice, now truthful) rather than a form
error.

The Google button KEEPS its current behaviour — a live button that opens the "accounts
unavailable" notice rather than a `disabled` control — and gains no backend here.

Its eventual path is **not** an Aonik endpoint and **not** a future Aonik spec. Spec 072
places it permanently outside Aonik's surface: "The storefront's Google button rides the
IdP's own federation (Keycloak brokering per ADR-007) via an authorization-code flow the
FRONTEND drives; the resulting JWT validates unchanged. No Aonik surface; noted so nobody
builds one." So the work, when it happens, is ours: an OIDC authorization-code flow against
the deployment's Keycloak, exchanging for the same session this spec establishes.

One correction to how this was previously framed: the IdP is **operator-level, not
tenant-level**. ADR-007 guarantee 1 is explicit — "Operator-choice, not tenant-choice.
`Auth.Provider` stays platform-level. A tenant inside a deployment cannot pick a different
IdP than its host's. Per-tenant federated IdP is intentionally deferred." AbbysTable
therefore cannot enable Google by configuring its own tenant; it depends on the deployment's
Keycloak having Google brokering configured.

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
- **`commerce.storefront_validation` (HTTP 400)** → the cart is no longer Open, i.e. it
  already became an order; skip silently and let order history carry it. The endpoint raises
  `StorefrontValidationException`, which maps to that code. (Spec 072's rule labels `Z1`–`Z6`
  are *documentation* identifiers, not wire codes — nothing on the response names a `Z4`, so
  no branch may match on one.)

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
`{ items, totalCount, page, pageSize }`, newest first, default page size 20, clamped to
1–100 server-side) with rows `{ orderId, placedAtUtc, status, currency, total, boxSize? }`,
and
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

- The deployment's Keycloak must have the password grant (direct access grant) enabled for
  `/auth/token` to serve storefront logins. ADR-007 notes it is "off by default in
  Keycloak", so this is an explicit deployment step, not code. Until it is enabled, the
  pages render the accounts-unavailable state — which is what they already show today.
- Google federation, if wanted, is brokered in that same Keycloak — an operator action, not
  a tenant setting (ADR-007 guarantee 1).
- `AONIK_TENANT_ID` (from `aonik-transport`) scopes registration and login to the
  AbbysTable tenant.

### Source provenance

Spec 072 documents the orders endpoints only in prose ("party-scoped summaries… detail incl.
items and the box's selection rows") and names no field contract. The DTO shapes above were
taken from the shipped implementation —
`src/Aonik.Commerce/Services/Checkout/StorefrontOrderService.cs`
(`StorefrontOrderSummaryDto`, `StorefrontOrderDetailDto`, `StorefrontOrderItemDto`,
`StorefrontOrderSelectionDto`) — and the paging defaults from
`StorefrontOrderEndpoints.cs` (`?? 20`) and `ListMyOrdersAsync` (`Math.Clamp(pageSize, 1,
100)`). They are therefore accurate against code but **not contract-guaranteed by a spec**;
if Aonik reshapes them without a spec change, this is where it will break first.

---

## Tasks
- [x] Session cookie module + route-handler auth attachment (+ 401 → clear → signed-out)
- [x] Register/login server actions on the real endpoints; remove the stub notices; keep
      the Google button's behaviour
- [x] Adopt-on-sign-in in the auth flow with the three outcome branches
- [x] Cart handlers: bearer-first authorization (token only when the cookie still holds one)
- [x] `/account/orders` + `/account/orders/[orderId]` pages + header account menu
- [x] Confirmation page link-through (from `review-checkout`) once signed in
- [ ] Follow-up (deferred): reset-password page; social federation redirect flow

### Implementation notes (2026-07-22)

**Cart calls send whichever proofs exist, not "bearer-first".** Aonik's `CartRequestAccess`
takes two independent halves — `X-Cart-Token` and the principal's party — so `cartAuth`
attaches both when both are present. That is what makes the guest → adopted → signed-in
transition seamless. It deliberately does NOT go through `aonikAuthedFetch`: that helper
throws when there is no session, and the common case here is a perfectly valid guest cart.
A missing session means "no bearer to add", never "this cart call fails".

**Adoption never fails a sign-in.** Someone who just typed their password correctly ends up
signed in; whether their half-built box came too is the lesser question. All three
documented outcomes plus any unexpected error return rather than throw.

**Registration that succeeds but cannot sign in is its own outcome.** The account EXISTS at
that point, so re-submitting the form would 409 and telling the customer their details were
wrong would be false. `RegisteredButNotSignedInError` → the form points at `/login`.

**The post-auth redirect is a security control with its own module.** `safePostAuthPath`
lives in `lib/auth/redirect.ts` rather than in the `'use server'` actions file, because that
file may export only async functions and a validator should be directly testable. It rejects
absolute URLs, protocol-relative `//host`, the backslash variant `/\host` that browsers
normalise, and control characters that could split a `Location` header.

**A last-name field was added to registration.** Aonik requires `firstName` AND `lastName` as
separate non-null values. Splitting one "full name" box on whitespace was the alternative and
it quietly mangles every name that does not fit "given family", so the form asks.

**Also fixed here:** the app had no `not-found.tsx` at all, so `notFound()` — which the order
detail page relies on for a foreign order id — rendered Next's bare fallback. Added a branded
one that keeps Aonik's no-existence-oracle promise: it never speculates about whether
something exists, only that we cannot show it.

### Testing
- Unit: session cookie encode/decode + expiry math; adoption outcome router (200/404/Z4);
  order DTO mappers (paged envelope, detail with selections).
- Integration: register→auto-login→adopt happy path against mocked Aonik (cookie
  transitions asserted: token dropped, session set); login with existing party lists only
  that party's orders (recorded fixtures); foreign order id renders not-found; expired
  session redirects to sign-in.

### Definition of done
All scenarios pass; typecheck and build are green; a reviewer has signed off.

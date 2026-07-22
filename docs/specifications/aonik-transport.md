---
spec_id: SPEC-2026-07-22-aonik-transport
title: Aonik transport & tenancy seam — the real HttpAonikClient
status: draft
branch: feat/aonik-transport
owner: michaeljosiah
capabilities: [aonik-transport]
created: 2026-07-22
updated: 2026-07-22
---

# Aonik transport & tenancy seam — the real HttpAonikClient

> **Verified 2026-07-22** against Aonik specs 066–072 and the shipped implementation in
> `Aonik.Commerce` / `Aonik.Api`. Where the two disagreed, the code won. Corrections from
> that pass are marked in place; the biggest was the `commerce.box_drift` error envelope,
> which does not carry a `code` field at all.

## Why

`web/src/lib/aonik/client.ts` was written before the Aonik commerce API existed. Its
`HttpAonikClient` paths (`/dishes`, `/box-pricing`, `/delivery-window`, …) are self-described
first guesses, and its `Authorization: Bearer AONIK_API_KEY` auth model does not match how
Aonik actually works. The commerce API now exists (Aonik Specs 066–072, all merged): every
route lives under `/commerce/...`, every request is tenant-partitioned by an `X-Tenant-Id`
header, catalog reads are anonymous, money is served in **decimal major units** while this
frontend works in **integer pence**, and cacheability is signalled per-endpoint.

This spec replaces the guessed transport with the real one. It is the foundation the other
four integration specs (`catalog-browse`, `server-box-cart`, `review-checkout`,
`customer-identity`) build on — nothing in the component tree changes; the reconciliation is
confined to `client.ts` exactly as that file promised.

## What changes

- MODIFIED aonik-transport — `HttpAonikClient` targets the real Aonik routes with
  `X-Tenant-Id` on every request; catalog reads send no credential (breaking: no — mock mode
  is untouched and remains the default in development, and without `AONIK_API_URL`)
- ADDED aonik-transport — money adapter between Aonik decimal major units and frontend pence
  (FR-1)
- ADDED aonik-transport — typed `AonikError` taxonomy mapping Aonik's error envelope
  (FR-2)
- ADDED aonik-transport — storefront config document fetch
  (`GET /commerce/config/storefront`) as the source of currency, labels, page size, delivery
  display amounts, default box slug and extras collection slug (FR-3)
- ADDED aonik-transport — caching policy per endpoint class (catalog ISR 300 s; cart,
  checkout and identity always `no-store`) (FR-4)
- ADDED aonik-transport — `.env.example` documenting `AONIK_API_URL` + `AONIK_TENANT_ID`;
  the unused `AONIK_API_KEY` guess is removed (FR-5)

---

## Requirements

### Requirement: Tenant header on every request
`capability: aonik-transport` · `delta: MODIFIED (feat/aonik-transport)`

The system SHALL send `X-Tenant-Id: <AONIK_TENANT_ID>` on every request to Aonik, and SHALL
treat the tenant id as server-only configuration (a non-`NEXT_PUBLIC_` variable), alongside
`AONIK_API_URL`.

Aonik partitions all storefront data by tenant and varies its shared-cache responses on this
header (`Vary: X-Tenant-Id`). Commerce's `TenantContextMiddleware` falls back to host/
subdomain resolution when the header is absent, so a missing header is not always a hard
400 — but relying on that fallback would couple us to how the API is hosted. We always send
the header explicitly.

#### Scenario: Catalog read carries the tenant
- **WHEN** `getDishes()` runs with `AONIK_API_URL` and `AONIK_TENANT_ID` configured
- **THEN** the request is `GET {base}/commerce/catalog/products` with header
  `X-Tenant-Id: {tenantId}`
- **AND** no `Authorization` header is sent (catalog reads are anonymous)

#### Scenario: Missing tenant id fails fast at startup, not per-request
- **WHEN** `AONIK_API_URL` is set but `AONIK_TENANT_ID` is not
- **THEN** `getAonikClient()` throws a configuration error naming the missing variable
- **AND** the error never reaches a customer page in production builds (build-time or
  boot-time check)

### Requirement: Money adapter — Aonik decimals to frontend pence
`capability: aonik-transport` · `delta: ADDED (feat/aonik-transport)`

The system SHALL convert every monetary amount received from Aonik (decimal major units,
e.g. `95.0` meaning £95.00) into integer pence at the transport seam using
`Math.round(amount * 100)`, and SHALL convert pence back to decimal major units
(`pence / 100`) on any amount it sends. Components continue to see pence only.

Aonik serves decimals **today**, but this is explicitly provisional: Spec 066 §19 O1 records
"whether public Commerce DTOs serve minor units globally" as an open decision, with the
current position being "DTOs serve decimals and the frontend's client class converts". This
adapter is exactly the seam that absorbs that decision if it flips — which is why it exists
as one function pair rather than scattered arithmetic. If Aonik switches to minor units,
`toPence`/`toMajor` become identities and nothing above them changes.

#### Scenario: Box plan prices arrive in pence
- **WHEN** Aonik serves a box preset priced `95.0` in `GBP`
- **THEN** the mapped `BoxOffer.pricePence` is `9500`

#### Scenario: Signed adjustments survive the round trip
- **WHEN** Aonik serves a personalisation adjustment of `-2.5`
- **THEN** the mapped pence value is `-250`
- **AND** re-encoding it for a quote request produces `-2.5` exactly

### Requirement: Typed error taxonomy
`capability: aonik-transport` · `delta: ADDED (feat/aonik-transport)`

The system SHALL map non-2xx Aonik responses into a typed `AonikError` carrying `status`,
`code` (when the body names one), `rule` (when present), `detail`, and — for `409`
box-drift responses — the refreshed box payload that rides the error body. Known codes the
storefront must branch on:

| Code | Meaning | Storefront reaction |
|---|---|---|
| `commerce.option_validation` | A personalisation selection violates the product's option rules (Aonik Spec 066 V-rules). HTTP 400. The body carries a `rule` field (`V1`–`V12`) naming the exact violation | Inline validation message on the personaliser, keyed on `rule` |
| `commerce.storefront_validation` | A cart/box rule was violated (capacity, availability, size bounds, adoption of a checked-out cart). HTTP 400 | Inline message; refresh the box state |
| `commerce.box_drift` (HTTP 409) | The catalogue changed under the cart at continue/checkout; the response carries the repaired box + `changes[]` | Re-render the box from the payload and show the change notices (see `server-box-cart`) |
| plain `404` | Unknown OR unauthorized — deliberately indistinguishable (fail-closed access) | Generic not-found handling; never "wrong token" copy |
| `401` / `403` | Missing/expired customer session on an authenticated route | Send to sign-in (see `customer-identity`) |

**The drift response uses a different envelope from every other error, and the parser MUST
handle both.** Aonik's `ExceptionHandlerConfiguration` writes validation errors as
`{ error: <message>, code: <code> }` but writes drift as
`{ error: "commerce.box_drift", message: <text>, box, quote, changes }` — for drift, `error`
holds the *code* and there is **no `code` field at all**. A parser that only reads `code`
will silently fail to recognise the one error the entire checkout flow depends on
detecting. `AonikError.code` SHALL therefore resolve from `body.code ?? body.error`.

#### Scenario: Drift 409 exposes the refreshed box
- **WHEN** checkout returns HTTP 409 whose body is
  `{ error: 'commerce.box_drift', message, box, quote, changes }` with no `code` field
- **THEN** the thrown `AonikError` has `status === 409` and `code === 'commerce.box_drift'`
- **AND** `error.box` contains the parsed refreshed box + quote + changes

#### Scenario: Validation errors keep their rule id
- **WHEN** a selection violates a Spec 066 rule and Aonik returns
  `{ error: <message>, code: 'commerce.option_validation', rule: 'V5' }`
- **THEN** the thrown `AonikError` exposes `rule === 'V5'` for the personaliser to branch on

#### Scenario: 404 is opaque
- **WHEN** any cart route returns 404
- **THEN** the error carries no distinction between "cart does not exist" and "not yours"
- **AND** no UI copy speculates about which it was

### Requirement: Storefront config document
`capability: aonik-transport` · `delta: ADDED (feat/aonik-transport)`

The system SHALL fetch `GET /commerce/config/storefront` (anonymous, cacheable, never 404s)
and expose it as the single source of: `currency` (canonical tenant currency), 
`recommendedChoiceLabel` (the "Abby's choice" label text), `resultsPageSize`,
`backToTopTrigger` (verbatim JSON), `delivery.listAmount` / `delivery.chargedAmount`
(display amounts: struck-through list vs charged-now; 0 renders as free), `defaultBoxSlug`
(which bundle product the box builder uses), `extrasCollectionSlug` (introduced by Spec 071,
served on this 070 document), and `box` (the default bundle's embedded size plan: `minSize`,
`maxSize`, `currency`, `perSpacePrice?`, `presets[{size, price, badge?, blurb?, saving?}]`,
or null when unset — note the preset field here is `saving`, whereas the full box-plan read
names it `savingAmount`).

Hard-coded storefront copies of any of these values SHALL be removed as pages adopt the
document (per the sibling specs).

#### Scenario: Config resolves once per request tree
- **WHEN** the homepage renders (featured rail + box offers + delivery promise)
- **THEN** `/commerce/config/storefront` is fetched at most once for that render
- **AND** its values thread to the components that need them as props

#### Scenario: Unconfigured tenant still renders
- **WHEN** the tenant has authored no storefront settings
- **THEN** the document still returns (Aonik serves defaults; the endpoint never 404s)
- **AND** the storefront renders with those defaults rather than crashing

### Requirement: Caching policy per endpoint class
`capability: aonik-transport` · `delta: ADDED (feat/aonik-transport)`

The system SHALL apply Next.js caching as follows:

| Endpoint class | Fetch policy |
|---|---|
| Catalog reads (`/commerce/catalog/*`), storefront config | `next: { revalidate: 300 }` (matches Aonik's `public, max-age=300`) |
| Delivery promise (`/commerce/config/delivery`) | `next: { revalidate: 300 }`; a 404 response is NOT cached (render "no promise") |
| Product content resolution with `v` param | `revalidate: 300` only when passing the current `contentVersion`; treat any other `v` as uncacheable |
| Cart routes (`/commerce/carts/*`), checkout, adopt | `cache: 'no-store'` — always |
| Identity (registration, token), my-orders | `cache: 'no-store'` — always |

#### Scenario: Cart calls are never cached
- **WHEN** any cart mutation or read runs
- **THEN** the fetch uses `cache: 'no-store'`
- **AND** no cart payload is ever served from the Next data cache

### Requirement: Environment contract
`capability: aonik-transport` · `delta: ADDED (feat/aonik-transport)`

The system SHALL add `web/.env.example` documenting: `AONIK_API_URL` (base URL, no trailing
slash), `AONIK_TENANT_ID` (tenant GUID). The `AONIK_API_KEY` variable and its
`Authorization: Bearer` header SHALL be removed from `HttpAonikClient` — Aonik's anonymous
storefront surface takes no service credential, and customer-authenticated calls use the
session established in `customer-identity` (never a static key).

#### Scenario: Mock mode unchanged
- **WHEN** `AONIK_API_URL` is absent
- **THEN** `getAonikClient()` returns `MockAonikClient` exactly as today

---

## Design

### Architectural decision

**All reconciliation stays inside `lib/aonik/`.** `client.ts` promised "the reconciliation is
confined to this class" — this spec holds it to that. The `AonikClient` interface keeps its
shape (pence, existing type names); a new private mapping layer (`lib/aonik/map.ts`)
converts Aonik DTOs → frontend types, and a private `aonikFetch` helper owns base URL,
tenant header, error mapping and cache policy. Components and pages import nothing new.

A second decision: **the tenant id is configuration, not code**. AbbysTable is one tenant of
a multi-tenant platform (Aonik ADR-013 — product identity is configuration); nothing in this
repo may assume it is the only storefront Aonik serves.

### Target architecture

```
Server Component / Route Handler
        │
        ▼
AonikClient (interface — UNCHANGED, pence-denominated)
        │
        ├── MockAonikClient (fixtures — unchanged, default without AONIK_API_URL)
        │
        └── HttpAonikClient
                │  getDishes() … getExtras()
                ▼
            map.ts  ←— DTO→frontend-type mapping + pence adapter (toPence/toMajor)
                │
                ▼
            aonikFetch(path, { cache, revalidate, session? })
                │  base = AONIK_API_URL
                │  headers: X-Tenant-Id: AONIK_TENANT_ID (+ Authorization when session)
                │  !ok → parse body → throw AonikError{status, code, detail, box?}
                ▼
            Aonik commerce API (/commerce/…)
```

Aonik responses use standard JSON casing (`camelCase`) — `ProductSummaryDto.HeroImageUrl`
arrives as `heroImageUrl`, etc. The mapping layer is the only place allowed to know Aonik
property names.

---

## Tasks
- [ ] Add `lib/aonik/http.ts`: `aonikFetch` (base URL, `X-Tenant-Id`, cache policy knobs,
      `AonikError` with drift-payload capture)
- [ ] Add `lib/aonik/map.ts`: `toPence` / `toMajor` + per-DTO mappers (filled in by the
      sibling specs as each surface lands)
- [ ] Rewrite `HttpAonikClient` methods onto real routes via `aonikFetch` + `map.ts`
- [ ] Add `getStorefrontConfig()` to `AonikClient` (fixture: sensible mock document)
- [ ] Remove `AONIK_API_KEY` usage; add `AONIK_TENANT_ID`; boot-time config validation
- [ ] Add `web/.env.example`
- [ ] Remove/deprecate fixture paths as sibling specs land (tracked there, not here)

### Testing
- Unit: `toPence`/`toMajor` rounding (including negatives and `.005` cases);
  `AonikError` parsing (code envelope, 409 drift body, empty body); config-validation throw.
- Integration: `aonikFetch` against a mocked `fetch` asserting header, URL join, cache
  policy per class; `getStorefrontConfig()` end-to-end against recorded Aonik JSON.

### Definition of done
All scenarios pass; typecheck and build are green; a reviewer has signed off.

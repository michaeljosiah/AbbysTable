---
spec_id: SPEC-2026-10-13-launch-foundations
title: Account setup and storefront launch availability
status: implemented
branch: codex/storefront-launch-foundations
owner: storefront
capabilities: [identity, gifting, checkout]
created: 2026-10-13
updated: 2026-10-13
---

## Why

The launch review found that paid account links could not finish setup, disabled gift
cards still advertised purchase and zero-cost postage, and postcode checks competed
with checkout and payment polling for one API request budget.

## What changes

The paid-link page hands the customer to the configured identity provider using
authorization code with S256 PKCE. Aonik remains the identity and paid-link verifier.
Disabled gift-card purchase controls are withheld and direct checkout/start requests
fail closed. Food-box gifting and existing payment/confirmation access remain available.
The companion AONIK change gives checkout and payment status their own rate policies.

## Requirements

- FR-01: The storefront SHALL send the paid-link token only to Aonik. It SHALL NOT
  put that token in an OAuth URL, log, page prop or browser-accessible storage.
  An encrypted, HttpOnly, Secure, SameSite=Lax, ten-minute cookie carries the
  token and verifier across the provider redirect. It is bound to browser state,
  issuer, client, tenant, API and storefront origin, and cleared on callback.
- FR-02: WHEN the provider returns, the storefront SHALL verify state, exchange
  the code with its verifier and call Aonik completion. It SHALL create a session
  only after Aonik confirms completion. An unverified/mismatched identity,
  expired/replayed link, altered cookie or provider error SHALL NOT create a session.
- FR-03: WHEN gift purchasing is disabled or its configuration cannot be read,
  the storefront SHALL show an unavailable message instead of gift prices,
  postage and purchase controls. Direct start SHALL create no cart.
- FR-04: Delivery checks SHALL NOT consume checkout or payment-polling budgets.
  Existing tenant/IP isolation and trusted forwarding rules SHALL remain enforced.

## Design and deployment

Configure server-only `AONIK_OIDC_ISSUER`, optional `AONIK_OIDC_AUDIENCE`,
`AONIK_AUTH_CLIENT_ID`, `STOREFRONT_ORIGIN`, and `ACCOUNT_SETUP_COOKIE_KEY`
(32 random bytes, hex encoded; identical across storefront instances).
The callback is exactly `<STOREFRONT_ORIGIN>/account/setup/callback`.
The provider must support a public client with authorization code/S256 PKCE and
offer registration and email verification on its hosted login page. This code
does not enable registration or alter provider permissions.

Aonik's paid-access setting must be enabled for this tenant with
`setupPath=/account/access`. Its configured email, email_verified and auth_time
claims must be present in the API access token. Auth0 can require an Action to
add those claims; use the claim names configured in Aonik. Unknown subjects are
admitted only to its existing completion endpoint. No token claims are trusted
by decoding an ID token in the storefront.

The customer must finish provider email verification and use the same address as
the paid order. Cancellation/failure leads to a neutral page with instructions to
reopen the original email; expired links use the existing resend flow. Backend
one-use consumption remains authoritative even if a browser replays an old cookie.
Order visibility follows Aonik's verified-access outbox event and may be eventual.
Do not record callback query strings in external access logs or analytics.

The companion API defaults are 30 delivery checks, 30 checkout/recovery attempts,
and 300 payment-status reads per minute per tenant/trusted IP, independently
configurable. A storefront proxy still aggregates its customers under its egress
IP; size those budgets with measured traffic. Limits remain per API process.

References: [PKCE](https://www.rfc-editor.org/rfc/rfc7636),
[Auth0's PKCE flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce/add-login-using-the-authorization-code-flow-with-pkce),
AONIK `docs/features/paid-account-access.md`.

## Tasks

- [x] Implement and exercise protected setup handoff/callback and failure paths.
- [x] Gate disabled gift purchasing in the UI and server entry point.
- [x] Separate API rate policies and add endpoint regression coverage.
- [ ] Review and deploy both changes.
- [ ] Configure the dev identity client, claim mapping and server cookie key.
- [ ] Verify a paid setup email through provider registration, verification and order history in dev.
- [ ] Measure concurrency and tune deployment budgets before public launch.

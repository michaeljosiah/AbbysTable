---
spec_id: SPEC-2026-10-07-site-chrome-and-consent
title: Site chrome and consent — header, drawer, footer, cookie consent, purchase bar, status pages
status: approved
branch: feat/site-chrome-and-consent
owner: michaeljosiah
capabilities: [site-chrome, consent, purchase-bar, status-pages]
created: 2026-10-07
updated: 2026-10-07
---

# Site chrome and consent

> **Status (2026-10-07): approved, partly implemented.** Requirements for built parts describe
> what `web/` does on `main` at 213ee0b, read from the source. Implemented: the drawer's signed-in
> state (#7, PR #44), the newsletter held back until it can save (#6, PR #45), the cookie consent
> manager (#11, PR #50), the 404, 500 and maintenance pages (#13, PRs #51 and #53), the mobile
> purchase bar (#12, PR #57), the v2 header, drawer and footer with the announcement bar removed
> (#10, PR #60), and #8 as far as the built pages allow (Allergens link in PR #49, Privacy and
> Terms links in PR #56; every Contact and Delivery & FAQs link read from one constant each, and
> "← Back to checkout" on the legal pages), with the Contact and Delivery & FAQs routes built (#24,
> #23). **Pending:** from #8, checkout's legal line (it arrives with
> Checkout, #31). Pending parts are
> specified from the issues and `design/` (Homepage v2's chrome,
> `design/CLAUDE.md` "Canonical shared components", behaviour guide §A2/§A3/§A5,
> `design/SHOPPING-STATE.md` §40). Where an issue and the design disagree, the design wins and the
> requirement says so.

## Why

The chrome and the consent layer were built from issues and `design/` without a specification,
in a repository whose unit of work is the specification (#41 plans this one). They are shared by
every page, and several of their rules — consent fail-safe, purchase-bar suppression, a 404 that
never waits on Aonik — are invisible until they break. This spec writes them down as checkable
requirements.

Depends on: `SPEC-2026-07-22-customer-identity` (session), `SPEC-2026-07-22-server-box-cart`
(active box), `SPEC-2026-10-07-marketing-pages` (which pages carry the bar).

## What changes

- ADDED site-chrome — v2 header, hide-on-scroll, drawer as a dialog, footer, no announcement bar
  (FR-01–FR-08)
- ADDED consent — one global manager, strict storage, triggers, gating, priority (FR-09–FR-14)
- ADDED purchase-bar — opt-in bar, visibility rules, offer and active-box content (FR-15–FR-17)
- ADDED status-pages — 404, 500, maintenance (FR-18–FR-20)
- ADDED site-chrome — information links on real routes, checkout legal return (FR-21, FR-22)

---

## Requirements

### Requirement: FR-01 Header content
`capability: site-chrome` · `delta: ADDED (feat/site-chrome-and-consent)`

The marketing header SHALL carry the wordmark (→ `/`), five links in this order — Menu `/menu`,
How it works `/how-it-works`, Abby's Story `/our-story`, Gifting, Private Table — the account
slot (FR-06) and the purchase pill (FR-02). Links SHALL go to routes, not `/#…` anchors, once
those routes exist; no link SHALL resolve to a 404 or a missing anchor. Until `/gifting` (#26) and
`/private-table` (#25) are built, each SHALL use one interim destination defined once in
`src/lib/content/navigation.ts` (an existing section, such as Private Table's `/#private`), or be
left out of the nav, and switch to its route when the page lands (open questions 2–3). No strapline, search, basket or promo strip. Below 1024
the burger opens the drawer; from 1024 the nav and the account link show. The link for the
current route SHALL carry `aria-current="page"`, styled with green-forest ink, semibold weight and
the persistent brass underline (three signals, never colour alone); hover overrides it. The header
carries `data-site-header` for the purchase bar's focus guard.

#### Scenario: Current page is marked
- **WHEN** a customer is on `/how-it-works` at 1280px
- **THEN** "How it works" has `aria-current="page"` and the underline, and no other link does

### Requirement: FR-02 GET STARTED becomes VIEW BOX
`capability: site-chrome` · `delta: ADDED (feat/site-chrome-and-consent)`

The pill SHALL read GET STARTED in terracotta and link `/box`. While a box is active by the one
shared rule — `isBoxActive` in `src/lib/purchase-bar/activeBox.ts`: committed, or holding a dish —
it SHALL read VIEW BOX in `--green-forest` and link `boxResumeHref`, the purchase bar's own rule
and destination, so the two never disagree. The first render (before the cart hydrates) always
sells. Resuming at the furthest valid step needs the shared shopping state (#14). "Get started"
is the only control with that label; the drawer, the bar and page CTAs read "Build a Box".

#### Scenario: One order reads as one thing
- **WHEN** a customer has committed a 12-dish box and opens `/standards`
- **THEN** the header pill reads VIEW BOX and links `/box/dishes`
- **AND** the purchase bar, once revealed, reads "12-dish box" with VIEW BOX to the same place

### Requirement: FR-03 Header hides on scroll
`capability: site-chrome` · `delta: ADDED (feat/site-chrome-and-consent)`

Below 1024, on every page with the marketing header, the header SHALL hide on a downward scroll
and return on any counted upward one, using the bar's direction rule (`nextDirection`: 8px
movement threshold, 120px floor) so header and bar share one source of truth. It SHALL NOT hide
while the drawer is open or keyboard focus is inside it. From 1024 it SHALL hide only on the
marketing routes — Homepage, Menu, How it works, Gifting, Private Table, Our Standards, Abby's
Story, Delivery & FAQs, Contact — hiding after 40px down and revealing after 64px up, measured
from the turning point; never hidden while `scrollY` ≤ its own height; shown while focus is in
it; held hidden for 450ms after an in-page anchor jump. Hiding is a transform on a sticky,
in-flow header, so nothing shifts; reduced motion removes the transition. The desktop opt-in SHALL
be a property of the route's shell, not a per-page script.

> Note: #10 lists the desktop exclusions as "dish pages, Allergens, account or checkout". The
> design (`design/CLAUDE.md` "Desktop marketing header", `build-handoff.md` §3v) also excludes
> Privacy Policy, Terms of Sale, Log in, Order Confirmation and the error pages; the design wins.
> Its older line "Desktop (≥1024) never hides it" is superseded by the same 5 Oct decision.

#### Scenario: Desktop hides only on marketing routes
- **WHEN** a customer scrolls 200px down `/privacy` at 1440px
- **THEN** the header stays in place
- **AND** on `/our-story` the same scroll hides it after 40px

### Requirement: FR-04 Drawer content
`capability: site-chrome` · `delta: ADDED (feat/site-chrome-and-consent)`

The drawer SHALL contain, in order: wordmark and close (×); the account link (FR-06); a hairline;
the five header links; a full-width BUILD A BOX pill → `/box`; a hairline; the social row. Every
target is at least 44px.

#### Scenario: Same journey on a phone
- **WHEN** a customer opens the drawer at 390px
- **THEN** every header destination and Build a Box is reachable from it

### Requirement: FR-05 Drawer is a real dialog
`capability: site-chrome` · `delta: ADDED (feat/site-chrome-and-consent)`

The drawer SHALL be `role="dialog"` `aria-modal="true"` `aria-label="Main menu"`, always mounted
so the burger's `aria-controls` resolves, and out of the tab order and accessibility tree while
closed. Opening SHALL move focus to Close, trap Tab and Shift+Tab inside, lock body scroll and
hold `data-overlay-open` on `<html>`; Escape, the scrim, Close or a link SHALL close it, and
closing SHALL return focus to the burger. Implemented today (`MobileDrawer.tsx`): always mounted
with `inert` while closed, focus to Close, Escape, scroll lock and `data-overlay-open`. Missing:
dialog role, focus trap, focus return.

#### Scenario: Focus comes home
- **WHEN** a keyboard user opens the drawer, tabs past the last control and presses Escape
- **THEN** focus wrapped to the first control, and after Escape it is on the burger

### Requirement: FR-06 Signed-in state
`capability: site-chrome` · `delta: ADDED (feat/site-chrome-and-consent)`

The account slot SHALL read "Log in" (→ `/login`) when signed out and "My Account" (→ the account
area) when signed in — label and destination both — in the header and the drawer. Signed-in state
SHALL come from the server session: `SiteChrome` calls `readSessionView()` (the cookie is
httpOnly) and hands it to `Header`, `MobileDrawer` and `AccountMenu`; browser storage never
decides it. Implemented (#7): the drawer's last link is "My Account" → `/account/orders` when
`session.isSignedIn`, otherwise "Login" → `/login`. Implemented (#10, PR #60): "Log in" /
"My Account" in both the header and the drawer, from `accountLink` in `src/lib/site-header/state.ts`;
sign-out moved to the account area (`/account/orders`).

#### Scenario: The drawer follows the session
- **WHEN** a signed-in customer opens the drawer
- **THEN** it shows "My Account" linking the account area, and no log-in link

### Requirement: FR-07 Footer
`capability: site-chrome` · `delta: ADDED (feat/site-chrome-and-consent)`

On `--green-deep` under a 2px brass rule, the footer SHALL carry: the "Join the table" signup only
when a subscribe action is supplied (none is until Aonik can store one — #6, aonik#357), with its
consent line linking `/privacy`; three columns — Shop: Menu / Gifting / Private Table; Learn:
Abby's Story / How it works / Our standards; Information: Delivery & FAQs / Allergens / Contact
us; the follow row with four icon links and "@FromAbbysTable" as plain text; the wordmark and
"Abby x"; and the legal strip "© 2026 Abby's Table", Privacy Policy | Terms, and Cookie
preferences as `<a href="/privacy#cookies" data-consent-open>`. Discovery Box and Journal SHALL be
removed. Column heads SHALL be accordion buttons below 1024 and, from 1024, labels
(`role="heading"`, no `aria-expanded`/`aria-controls`, out of the tab order) — one element, no
duplicated markup. The footer SHALL carry `data-purchase-bar-stop`, and `id="contact"` only while
Contact resolves to it (FR-21) — no longer, since #24.

#### Scenario: Desktop heads are not controls
- **WHEN** a keyboard user tabs through the footer at 1280px
- **THEN** no column head takes focus, and every column's links are visible

### Requirement: FR-08 No announcement bar; chrome reads no commerce data
`capability: site-chrome` · `delta: ADDED (feat/site-chrome-and-consent)`

`AnnouncementBar.tsx` and its `getDeliveryWindow()` read in `SiteChrome` SHALL be deleted; the
promo strip is dropped site-wide and no chrome shows the earliest delivery date. The chrome SHALL
then make no Aonik request on any route — only the session cookie read — so a slow or failing
Aonik cannot hold or fail a page through its layout.

#### Scenario: Aonik is down
- **WHEN** every Aonik request fails and a customer opens `/privacy`
- **THEN** the page renders with its full header and footer, HTTP 200

### Requirement: FR-09 One consent manager, mounted once
`capability: consent` · `delta: ADDED (feat/site-chrome-and-consent)`

`ConsentManager` SHALL be mounted once, in `app/layout.tsx`, covering every route group; never
per page, never copied. A manager that throws SHALL render nothing (`ConsentBoundary`), leaving
every trigger a plain link. However late it throws — even after `consentStore.init()` has loaded a
stored grant — the boundary SHALL revoke what was applied (`consentStore.revoke()`): `pending` is
published, so `ConsentGate` siblings close and `onConsent` cleanups run, and the store grants
nothing more that page session; the stored choice itself is kept for the next page (T13). An
initialisation that fails inside the manager's own effect revokes the same way.

#### Scenario: A crash is safe
- **WHEN** the manager throws on its first render
- **THEN** no optional technology runs and "Cookie preferences" goes to `/privacy#cookies`

#### Scenario: A late crash withdraws the grant
- **WHEN** a returning visitor who accepted analytics loads a page and the manager then throws
- **THEN** the analytics technology's cleanup runs at once, and nothing optional starts again until
  the next page load

### Requirement: FR-10 Consent storage and fail-safe
`capability: consent` · `delta: ADDED (feat/site-chrome-and-consent)`

The choice SHALL be stored under the one key `at-cookie-consent-v1` as `{ v: 1, ts, preferences,
analytics, advertising }`, with every access in try/catch. A value SHALL count only if it
parses to an object with `v: 1`, a `ts` that survives an exact ISO round trip, and a boolean for
each of the three categories (other keys are ignored and not kept); anything else is no choice —
essential only, banner showing — never consent. A write SHALL be read back; if it cannot
be, the status is `unsaved` (essential only) and any previous record is removed, so a withdrawal
that failed to save cannot leave an old grant behind. Statuses: `pending` (server render, before
init), `unresolved`, `resolved`, `unsaved`. A `storage` event re-reads, so a withdrawal in another
tab applies here.

#### Scenario: Corrupt storage is not consent
- **WHEN** the key holds `{"v":1,"ts":"2026","preferences":true,"analytics":true,"advertising":true}`
- **THEN** the status is `unresolved` and the banner shows

### Requirement: FR-11 Banner and preference panel
`capability: consent` · `delta: ADDED (feat/site-chrome-and-consent)`

The banner SHALL show whenever the status is `unresolved` (no valid choice stored). After a
failed save (`unsaved`) it stays hidden for the rest of the session — the visitor has chosen;
only storage failed — and the site runs essential-only. The banner: `role="region"` `aria-label="Cookie
choices"`, non-modal, never taking focus on load, with no dismiss; actions Required only (outline)
then Accept all (filled) — identical boxes, Required only first in DOM and visual order — and
Manage preferences. The panel SHALL be `role="dialog"` `aria-modal="true"` labelled "Cookie
preferences": focus moves to the dialog itself, Tab is trapped, Escape and the scrim close it, the
body is scroll-locked, focus returns to the opener (the page `h1` if the opener is gone), and
closing without choosing brings the banner back only when no valid choice is stored — a returning
visitor who opens the panel from "Cookie preferences" and closes it sees no banner. It lists exactly four categories: Essential with
an "Always on" text mark, then Preferences, Analytics and Advertising and measurement as
`role="switch"` buttons, off by default. Actions: Save my choices (filled), then Required only and
Accept all (outline). Providers, cookie names and durations are "to be confirmed" with a link to
section 7; none SHALL be invented. A route change closes the panel.

#### Scenario: Refusal is as easy as acceptance
- **WHEN** the banner renders at 320px
- **THEN** Required only and Accept all have the same height, width and label weight

### Requirement: FR-12 Consent triggers
`capability: consent` · `delta: ADDED (feat/site-chrome-and-consent)`

`[data-consent-open]` SHALL be the only selector bound — never an href or a label — through one
delegated, capture-phase click listener added as the last step of initialisation. It SHALL open
the panel first and call `preventDefault` only on success, and never intercept a modified (cmd,
ctrl, shift, alt) or non-primary click. Once bound, the manager sets `data-consent-ready` on
`<html>` and `aria-haspopup="dialog"` on the triggers (re-applied per route); a trigger with
`aria-controls="consent-panel"` gets `aria-expanded` kept in step.

#### Scenario: A new tab gets the policy
- **WHEN** a customer cmd-clicks "Cookie preferences"
- **THEN** `/privacy#cookies` opens in a new tab and no panel opens

### Requirement: FR-13 Non-essential technology is gated
`capability: consent` · `delta: ADDED (feat/site-chrome-and-consent)`

Every preference, analytics or advertising technology SHALL go through `<ConsentGate
category="…">` or `onConsent(category, start)` (`src/lib/consent/consent.ts`): it starts only
while a valid stored choice grants its category and stops, through its cleanup, the moment that
grant is withdrawn — same session, no reload. Nothing gated renders on the server. No tag SHALL
have a `<noscript>` fallback, and none SHALL fire server-side (open question 8).

#### Scenario: Withdrawal applies at once
- **WHEN** a customer who accepted analytics switches it off and saves
- **THEN** the analytics technology's cleanup runs in the same page session, without a reload

### Requirement: FR-14 Consent outranks every fixed element
`capability: consent` · `delta: ADDED (feat/site-chrome-and-consent)`

While the banner or panel shows, the manager SHALL set `data-consent-layer="banner|panel"` on
`<html>`, and every bottom-fixed control that could collide — the purchase bars, the checkout's
mobile bars, ↑ Top, the legal Sections/Top pair — opts in with `data-consent-yield` and is hidden
(`visibility: hidden`, so also out of the tab order). The banner's height is measured into
`--consent-banner-h` and added as body `padding-bottom` and `scroll-padding-bottom`. Stacking:
header 50, banner 70 (shared with the bar, which yields), drawer 90/95, sheets 99/100, consent
scrim/panel 310/311.

#### Scenario: The bar waits for a choice
- **WHEN** a first-time visitor scrolls down the homepage past the hero on a phone
- **THEN** the purchase bar stays hidden until they choose

### Requirement: FR-15 The purchase bar is opt-in per page
`capability: purchase-bar` · `delta: ADDED (feat/site-chrome-and-consent)`

A page carries the bar by rendering it — `MobilePurchaseBar` with `getPurchaseBarData()`, or
`DishPurchaseBar` on the dish page; there is no site-wide default. The page marks its reveal
point with `data-purchase-bar-reveal` and anything the bar must not cover with
`data-purchase-bar-stop`; the footer always carries the stop. Hidden SHALL mean `inert` plus
`visibility: hidden`. From 1024 the bar is not displayed. While mounted it holds
`data-purchase-bar` on `<html>` and measures its height into `--at-bar-h`, which keeps focus
scrolling clear of it below 1024. The roster of pages is marketing-pages FR-07.

#### Scenario: A page without a bar inherits nothing
- **WHEN** a customer navigates from `/` to `/our-story`
- **THEN** `data-purchase-bar` and `--at-bar-h` are gone from `<html>`

### Requirement: FR-16 Purchase bar visibility
`capability: purchase-bar` · `delta: ADDED (feat/site-chrome-and-consent)`

As `src/lib/purchase-bar/visibility.ts`: the bar SHALL show only when (1) the reveal marker is
wholly above the viewport (`bottom ≤ 0`; no marker counts as passed), (2) the page is scrolling
down — movements under 8px change nothing, nothing within the first 120px counts as down, and
while focus is inside `[data-site-header]` the page cannot newly switch into "down" (the bar keeps
its current state; the prototype's `_onScroll`) — and (3) it is not suppressed:
suppression starts once the first stop marker's top is above 75% of the viewport and holds,
continuously, below it. Releasing suppression never forces the bar back. `DishPurchaseBar` ignores
direction (`followsDirection={false}`). The drawer and phone sheets (`data-overlay-open` →
`[data-overlay-yield]`) and consent (FR-14) hide it in CSS. When an ancestor container scrolls,
markers are measured against its visible box.

#### Scenario: Homepage walk
- **WHEN** a customer scrolls down past "View the menu", then up, then down to Private Table
- **THEN** the bar shows, retracts, shows again, and is hidden from Private Table through the footer

### Requirement: FR-17 Purchase bar content
`capability: purchase-bar` · `delta: ADDED (feat/site-chrome-and-consent)`

With no active box the bar SHALL read "Minimum N dishes" / "From £x" from the plan
(`purchaseBarOffer`), omitting "From" when the plan has no preset at the minimum and showing the
CTA alone, centred, when there is no plan; the CTA is "Build a Box" → `/box` unless the page
supplies its own (How It Works' `BoxSizeLink`). With an active box it SHALL read "N-dish box" — or "Your box" when no size is committed and
neither the plan nor demo pricing can say which size Step 1 would preselect — the total and
"View box" → `boxResumeHref`: the total is the live quote verbatim, or the demo
quote (`buildDemoQuote`) in demo mode, and is left out when it cannot be known. Band, height and
pill never change.

#### Scenario: No guessed total
- **WHEN** a committed demo 6-dish box holds a dish whose surcharge the client cannot price
- **THEN** the bar shows "6-dish box" and View box, with no figure

### Requirement: FR-18 Page not found
`capability: status-pages` · `delta: ADDED (feat/site-chrome-and-consent)`

An unmatched URL SHALL get the root `app/not-found.tsx` with HTTP 404 — never a redirect, never a
soft-404 200 — rendering `SiteChrome` itself so the header, footer and session survive, with the
design's copy (`NOT_FOUND_COPY`): "Error 404", "We couldn't find that page.", GO TO HOMEPAGE → `/`
and "View the menu →" → `/menu`. It SHALL NOT be replaced by a catch-all route calling
`notFound()`. Because Next renders the root 404 into every document request, it SHALL never await
commerce data (`withAnnouncement={false}` today; pinned by `tests/not-found-chrome.test.ts`).
`notFound()` thrown by a `(site)` page renders `app/(site)/not-found.tsx` inside that layout.

#### Scenario: The 404 cannot fail
- **WHEN** Aonik is down and a customer opens `/no-such-page`
- **THEN** the response is 404 with full chrome, and no Aonik request was made

### Requirement: FR-19 Something went wrong (500)
`capability: status-pages` · `delta: ADDED (feat/site-chrome-and-consent)`

`app/error.tsx` (and `global-error.tsx` when the root layout fails) SHALL render the design's 500
in reduced chrome (`StatusChrome`): wordmark, no nav, drawer, account, GET STARTED, purchase bar,
newsletter or consent trigger; plain `<a>` links, each a full page load. TRY AGAIN in `error.tsx`
calls `router.refresh()` then `reset()`, so the route is refetched rather than the failed payload
re-rendered; in `global-error.tsx`, with the root layout gone, it is a full reload of the current
URL (`window.location.reload()`), as the design's handoff specifies. The "Need help with an order?" panel and the header's "Contact
us" jump render only when `SUPPORT_CONTACT` is set. `public/500.html` SHALL be generated from
`src/lib/status-pages/render.ts`: inlined CSS, fonts and wordmark, `noindex`, no JavaScript, no
outbound request; `UPDATE_STATUS_PAGES=1 npm test` regenerates it and the test fails while it is
stale. Serving it on an outage needs a CDN rule (open question 7).

#### Scenario: No wrong number on an outage page
- **WHEN** `SUPPORT_CONTACT` is `null`
- **THEN** neither the panel nor the "Contact us" jump appears, in the app or in `500.html`

### Requirement: FR-20 Maintenance mode
`capability: status-pages` · `delta: ADDED (feat/site-chrome-and-consent)`

With `MAINTENANCE_MODE` exactly `true`, `src/middleware.ts` SHALL answer every page and `/api/*`
request with the "We'll be back shortly" page (the same render as `public/maintenance.html`), HTTP
503, `Retry-After: 3600` and `Cache-Control: no-store`; never a redirect. The flag is read per
request. The matcher SHALL exclude `/.swa/*`, `_next/static`, `_next/image`, `assets/`, `fonts/`
and the icons. The page links nowhere into the site.

#### Scenario: Health checks survive maintenance
- **WHEN** maintenance is on and the host requests `/.swa/health.html`
- **THEN** the middleware does not run for it

### Requirement: FR-21 Information links on real routes
`capability: site-chrome` · `delta: ADDED (feat/site-chrome-and-consent)`

Each information link SHALL point at its real route as the page lands: `/privacy`,
`/terms-of-sale`, `/allergens`, `/delivery-and-faqs` (#23) and `/contact` (#24) — all built. Until
each page landed its links went to the footer (`/#contact`); Delivery & FAQs followed Contact. Now
no internal link SHALL point at
`/#contact`: the checkout footer's Delivery & FAQs and Contact Us, checkout's "Questions about your
order? Contact us", the dish page's allergen fallback, Log in's "Forgotten it?" (open question
10), the confirmation page's "Contact us", the order page's "Questions about this order?",
`STATUS_FOOTER_LINKS`, `CONTACT_HREF` and the Allergens page's constants.

#### Scenario: The swap is complete
- **WHEN** `/contact` is built
- **THEN** a search of `web/src` for `/#contact` finds nothing

### Requirement: FR-22 Legal links from checkout
`capability: site-chrome` · `delta: ADDED (feat/site-chrome-and-consent)`

Checkout's legal line ("By continuing, you agree to our Terms of Sale and acknowledge our Privacy
Policy.") SHALL open both documents in a new tab with `?from=checkout` and a visually hidden "(opens
in a new tab)"; checkout keeps its state in its own tab. A legal page SHALL show "← Back to
checkout" above its h1 only when it carries `?from=checkout`. That control MAY focus the existing
checkout where the browser allows; it SHALL NOT depend on `window.opener`, SHALL NOT require the
legal tab to close, and SHALL NOT open a second checkout. If it cannot switch, it stays and says
"Your checkout is still open in your previous tab. Switch back to it to carry on." Checkout's
footer legal links stay same-tab with no return link.

> Note: #8 says to open legal links "from checkout" in a new tab; the design limits that to
> checkout's legal line (`design/CLAUDE.md` "Legal line"), and the design wins.
> `design/at-legal-return.js` still closes the tab — the prototype is stale there.

#### Scenario: A plain visit has no return link
- **WHEN** a customer opens `/terms-of-sale` from the footer
- **THEN** no "Back to checkout" appears

---

## Design

### Architectural decision

Document-level states are boolean attributes on `<html>` — `data-overlay-open` (counted holds,
`src/lib/dom/documentFlag.ts`), `data-consent-layer`, `data-consent-ready`, `data-purchase-bar` —
and components that must give way opt in with `data-overlay-yield` / `data-consent-yield` in
`globals.css`. No component reads another's state, so the drawer, sheets, consent and bar stay
uncoupled. The rules (`lib/consent/consent.ts`, `lib/purchase-bar/visibility.ts`,
`lib/status-pages/render.ts`) are React-free and unit-tested. The chrome is server-rendered from
the session; only the header, drawer, footer, consent manager and bar are client components.

### Known gaps — code that contradicts the design or CLAUDE.md today

1. **Header, drawer, footer and announcement bar (#10):** resolved by PR #60 — the v2 chrome,
   hide-on-scroll from `src/lib/site-header/`, and no announcement bar, so `SiteChrome` reads the
   session and nothing else.
2. **Social links:** `SOCIAL_LINKS` are the design's accounts (PR #60), still unconfirmed (open
   question 1).
3. **404:** the design's Page Not Found carries the purchase bar; the root 404 has none, since the
   bar's offer needs the box plan and the 404 may not read Aonik.
4. **In-app 500:** it renders under the root layout, where `ConsentManager` is mounted, so a
   first-time visitor sees the banner on it; the design's 500 has no consent UI.

### Open questions (owner decisions, not requirements)

1. **Social URLs.** The design's markup uses instagram.com/fromabbystable,
   tiktok.com/@fromabbystable, facebook.com/fromabbystable/ and x.com/fromabbystable. Are these the
   brand's live accounts? Until confirmed, nothing here asserts them.
2. **Gifting before #26.** `/gifting` is not built and `/#gifting` lost its target with #15.
   For now (PR #60) Gifting stays out of the chrome until its page lands (`GIFTING_LIVE`).
3. **Private Table before #25.** `/private-table` is not built; `/#private` resolves only while the
   homepage band keeps `id="private"`.
4. **Sign-out.** Moved by PR #60 from the header's "Account" menu to `/account/orders`; #35
   moves it into My Account's menu.
5. **"My Account" destination.** Only `/account/orders` exists; the designed My Account page does
   not.
6. **Drawer BUILD A BOX with an active box.** The design does not say whether it becomes VIEW BOX
   (`at-order-state.js` skips the drawer pill). For now (PR #60) it switches with the header pill.
7. **Serving `500.html`.** Azure Static Web Apps cannot override a 500; a CDN or Front Door rule
   is needed.
8. **Server-side tags.** Consent lives in browser storage; a server-readable signal must be
   designed before any tag fires server-side.
9. **Bar after consent.** Accepting while scrolled down shows the bar at once in the banner's
   place; the design left it, to revisit on a real device.
10. **"Forgotten it?"** — Contact, or a password-reset flow when one exists?
11. **404 bar and 500 banner** (known gaps 3–4): bar without an offer, or none; banner suppressed
    on the 500, or not.

---

## Tasks

- [x] `T1` Drawer shows "My Account" when signed in — PR #44 (#7)
- [x] `T2` Newsletter hidden until a subscription can be saved — PR #45 (#6)
- [x] `T3` Cookie consent manager, mounted once, with the gate — PR #50 (#11)
- [x] `T4` 404, 500 and maintenance; 404 without the announcement strip — PRs #51, #53 (#13)
- [x] `T5` Mobile purchase bar, rules and active-box summary — PR #57 (#12)
- [x] `T6` Allergens, Privacy and Terms links on their pages — PRs #49, #56 (#8, legal half)
- [x] `T7` v2 header: links, pill, current page, hide-on-scroll (FR-01–FR-03) — PR #60 (#10)
- [x] `T8` v2 drawer as a dialog (FR-04–FR-06) — PR #60 (#10)
- [x] `T9` v2 footer (FR-07) — PR #60 (#10)
- [x] `T10` Delete the announcement bar and its delivery read (FR-08) — PR #60 (#10)
- [x] `T11` Contact and Delivery & FAQs links (FR-21) (#8): every link reads
  `CONTACT_HREF` or `DELIVERY_FAQS_HREF` in `src/lib/content/navigation.ts`
  (`tests/information-links.test.ts`). `DELIVERY_FAQS_HREF = '/delivery-and-faqs'` with #23 and
  `CONTACT_HREF = '/contact'` with #24, which dropped the footer's `id="contact"` and left no
  `/#contact` in `web/src`; the status pages are regenerated and both routes are in
  `DESKTOP_AUTO_HIDE_PATHS`.
- [x] `T12` "← Back to checkout" on the legal pages, and `checkoutLegalHref` for checkout's legal
  line (FR-22) (#8)
- [ ] `T14` Checkout's legal line — new tab, `?from=checkout`, hidden "(opens in a new tab)" —
  wired by Checkout v2 (#31) with `checkoutLegalHref` and `CHECKOUT_LEGAL_LINK`. No built step
  carries it: Review v2 has no legal line, and live ordering stays closed until Checkout ships.
- [x] `T13` `ConsentBoundary` revokes a loaded grant when the manager crashes after init (FR-09)
  — `consentStore.revoke()`, latched for the page session; pinned in `tests/consent.test.ts`

### Testing

- Unit (exists): `tests/consent.test.ts`, `tests/purchase-bar.test.tsx`,
  `tests/status-pages.test.ts`, `tests/not-found-chrome.test.ts`, `tests/legal-documents.test.ts`,
  `tests/site-header.test.ts` (FR-01–FR-07: auto-hide routes and thresholds, current page, account
  slot, pills, links and footer columns),
  `tests/information-links.test.ts` (FR-21), `tests/checkout-legal-return.test.tsx` (FR-22).
- Unit (still to add): drawer trap and focus return; footer heads by width.
- Manual: drawer, banner, panel and bar together at 320 and 390; keyboard only; reduced motion.

### Definition of done

All scenarios pass; `npm test`, lint, typecheck and build are green; a reviewer has signed off.

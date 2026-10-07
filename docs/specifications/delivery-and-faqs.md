---
spec_id: SPEC-2026-10-07-delivery-and-faqs
title: Delivery & FAQs — postcode checker, notify-me, FAQ search and topic groups
status: approved
branch: feat/delivery-and-faqs
owner: michaeljosiah
capabilities: [delivery-faqs, postcode-coverage, notify-me]
created: 2026-10-07
updated: 2026-10-07
---

# Delivery & FAQs

> **Status (2026-10-07): approved, partly implemented.** The page, the checker, the FAQ search and
> groups, and the switch of every Delivery & FAQs link to `/delivery-and-faqs` are built (#23). Two
> things wait on Aonik and are held back rather than faked: the live coverage lookup
> (michaeljosiah/aonik#352) and the notify-me list (michaeljosiah/aonik#357). Sources:
> `design/Abby's Table - Delivery and FAQs.dc.html`, `design/build-handoff.md` §3l, the page
> behaviour guide §9, `design/frontend-backend-contract.md` §3b–§3d and §4b,
> `design/SHOPPING-STATE.md` §15. Where the issue and the design disagree, the design wins and the
> requirement says so.

## Why

Delivery & FAQs is the first non-homepage rebuild and the page every "Delivery & FAQs" link in the
site has been waiting for (#8). It answers the two questions a customer asks before ordering —
"do you deliver to me?" and "how does it work?" — and its conversion path is its own: check a
postcode → confirm delivery → Build a Box. Its checker is the place a fake answer would do the most
harm: "we deliver" to a postcode we do not serve, or "we don't" because a lookup failed.

Depends on: `SPEC-2026-10-07-site-chrome-and-consent` (chrome, FR-21 information links),
`SPEC-2026-10-07-marketing-pages` (FR-01 verbatim copy, FR-02 figures from data, FR-05 links).

## What changes

- ADDED delivery-faqs — `/delivery-and-faqs`: page head, checker, delivery facts, FAQ search, topic
  grid, eight groups, "Still need help?" (FR-01, FR-09–FR-12)
- ADDED postcode-coverage — the checker's states, outcomes, validation, geolocation and the
  hand-off to the box builder (FR-02–FR-07)
- ADDED notify-me — the not-in-area capture, held back until it can store (FR-08)
- MODIFIED site-chrome — `DELIVERY_FAQS_HREF` is the page; the route auto-hides the desktop header
  (site-chrome FR-03, FR-21) (breaking: no)

---

## Requirements

### Requirement: FR-01 The page
`capability: delivery-faqs` · `delta: ADDED (feat/delivery-and-faqs)`

`/delivery-and-faqs` SHALL render, in this order: the centred head (h1 "Delivery & FAQs", lede
"Answers to common questions about delivery, your food and your order, all in one place."); the
postcode checker and its result region (FR-02); the four delivery facts — from 1024 only, since
each is also stated in an answer; "Search our FAQs" and its results (FR-10); "Choose a topic"
(FR-11); the eight groups; "Still need help?" with "Contact us" → `CONTACT_HREF`. It is an
information page, not a sales page: no hero and NO mobile purchase bar (behaviour guide §9). Its
desktop header DOES auto-hide — the design opts it in (`DESKTOP_AUTO_HIDE_PATHS`). Copy SHALL be
verbatim from the design file (marketing-pages FR-01); every answer awaits sign-off (#38).

#### Scenario: No bar competes with the checker
- **WHEN** a customer scrolls the page on a phone
- **THEN** no purchase bar exists in the DOM

### Requirement: FR-02 A checker only where an answer can come from
`capability: postcode-coverage` · `delta: ADDED (feat/delivery-and-faqs)`

The checker SHALL render only where the data source has a coverage lookup
(`AonikClient.coverage`, `src/lib/aonik/coverage.ts`). "We deliver" and "not in your area" SHALL
come only from that lookup's answer. Demo mode serves the design's placeholder coverage (outward
areas AB, BT, GY, HS, IM, IV, JE, KW, ZE are not served) — a read, like every demo read. Live mode
has no lookup until Aonik exposes one (aonik#352), so the page renders without the checker rather
than a control that cannot check.

#### Scenario: Live, before aonik#352
- **WHEN** the page renders against a live tenant
- **THEN** there is no checker and no request is made for coverage
- **AND** the FAQs render with their figures from the storefront config

### Requirement: FR-03 Nine states, reached only by real input
`capability: postcode-coverage` · `delta: ADDED (feat/delivery-and-faqs)`

The checker's states (`src/lib/delivery/checker.ts`) SHALL be: idle; empty; invalid; checking;
serves; not served; could not check; finding location; location refused. Empty, invalid and
location refused are corrections BESIDE the field (a polite status; `aria-invalid` for the two
entry errors), never
a result panel, and never move the page. Typing, clearing or "Change postcode" drops the panel and
any answer still in flight. The prototype's development-only `stateOverride` and any other review
control SHALL NOT ship (contract §4b) — a release gate, pinned by a test.

#### Scenario: A late answer never lands
- **WHEN** a customer edits the field while a check is in flight
- **THEN** that check's answer is discarded

### Requirement: FR-04 The three outcomes
`capability: postcode-coverage` · `delta: ADDED (feat/delivery-and-faqs)`

- **Serves:** "Great — we deliver to {postcode}" (normalised), "Earliest delivery" and the date
  with its weekday ("Thursday 6 August", derived from the date) and the cooking-run note — the date
  from the lookup, else the tenant's delivery window, else — or when that date is already past in
  the UK (`upcomingDeliveryDate`) — the three lines are left out; a
  terracotta 52px **BUILD A BOX** (the owner's call, design/CLAUDE.md) → `/box`; "Change postcode",
  which empties the panel and selects the field's value.
- **Not served:** "We're not in your area yet", the postcode, "Check another postcode". No Build a
  Box.
- **Could not check:** "We couldn't check that postcode just now." / "Please try again in a
  moment." and **TRY AGAIN** — a technical failure (the lookup threw, or the server could not be
  reached), never a refusal; the entry is kept.

Below 1024 a fresh outcome is brought into view under the header; a correction never is.

#### Scenario: Offline is not "not in your area"
- **WHEN** the network drops while a customer checks "DA1 2AB"
- **THEN** the page says it could not check and offers Try again

### Requirement: FR-05 Postcode validation
`capability: postcode-coverage` · `delta: ADDED (feat/delivery-and-faqs)`

Validation and normalisation (`src/lib/delivery/postcode.ts`) SHALL be permissive: case and spacing
are fixed, never errors ("da12ab" → "DA1 2AB"); `GIR 0AA` is accepted. The server action
(`checkPostcode`) SHALL validate again — it is a public endpoint — and refuse rather than truncate
an over-long entry. A format check cannot tell a real postcode from an invented one; that is the
lookup's job.

### Requirement: FR-06 Use my current location
`capability: postcode-coverage` · `delta: ADDED (feat/delivery-and-faqs)`

The control SHALL render only where the lookup can place a postcode at a point
(`CoverageLookup.postcodeAt`) and SHALL ask for the location only when pressed, never on load.
While waiting it reads "Finding your location…" (announced; focus stays on it). Refused,
unavailable, timed out or no postcode there all show "We couldn't access your location. Enter your
postcode instead." beside the field. A postcode is never guessed: the demo lookup answers only
within 25km of its two sample postcodes. Found → the field is filled and the ordinary check runs.
Coordinates are used for that lookup and kept nowhere.

### Requirement: FR-07 The hand-off to the box builder
`capability: postcode-coverage` · `delta: ADDED (feat/delivery-and-faqs)`

A served postcode SHALL reach the box builder in this tab's session, NEVER a query string
(contract §3b): sessionStorage `at-checked-postcode-v1` `{ v: 1, t, postcode }`, 24h, written on a
"serves" answer and on BUILD A BOX, removed on a later "not served" (`src/lib/delivery/handoff.ts`,
every access in try/catch). The postcode field and the search field carry no `name`, so a submit
before hydration sends nothing anywhere.

#### Scenario: Choose Box picks it up (#28)
- **WHEN** Choose Box v2 mounts with a live record and an empty delivery-checker field
- **THEN** it fills the field from `readCheckedPostcode(sessionStorage)` and runs its own coverage
  check — never trusting the stored answer, never overwriting something typed

### Requirement: FR-08 Notify me
`capability: notify-me` · `delta: ADDED (feat/delivery-and-faqs)`

The not-in-area panel SHALL offer "Want to know when we reach your area?" only where the data
source can store to the notify-me list (`AonikClient.notifyList`). The request carries the email
AND the checked postcode, to a list separate from the newsletter (contract §3c); the consent line
says so. "Thank you — we'll be in touch when we reach you." only for a stored request
(`status: 'joined'`). No source can store one yet (aonik#357), so the form renders nowhere — in
EITHER mode: demo serves fixture reads but never pretends a write succeeded (the footer
newsletter's precedent, #6).

#### Scenario: Nothing to store to
- **WHEN** a postcode is not served, in demo or live
- **THEN** the panel offers "Check another postcode" and no email field

### Requirement: FR-09 FAQ content and its figures
`capability: delivery-faqs` · `delta: ADDED (feat/delivery-and-faqs)`

The eight groups — Delivery (7), Your food (6), Orders & changes (6), Storage & reheating (5),
Payment (5), Gifting (5), Private Table (10), About Abby's Table (4) — SHALL come from
`src/lib/content/deliveryFaqs.ts`, verbatim. No figure is copy: the box minimum and the six-dish
price from the box plan (`purchaseBarOffer`), the delivery charge from
`StorefrontConfig.delivery.chargedPence` (contract §3d; £5.95 in the demo config), Private Table's
price from `PRIVATE_TABLE_FROM_PENCE`, all formatted by `src/lib/format.ts`. A question whose figure
is unknown — no plan, a failed read, or a charge of 0, which the wording cannot state — SHALL be
left out, never printed with a gap or a guess, and the counts follow what renders. The answers'
Private Table link is the chrome's destination (`PRIVATE_TABLE_ITEM.href`, FR-05).

#### Scenario: The delivery charge changes
- **WHEN** the configured charge becomes £6.50
- **THEN** both answers read "£6.50 per order" with no change in `web/src`

### Requirement: FR-10 FAQ search
`capability: delivery-faqs` · `delta: ADDED (feat/delivery-and-faqs)`

Per `src/lib/faq/search.ts`: an empty field is browse; one character holds the search state with
"Keep typing to search." (the topic grid stays hidden); two or more search live (180ms debounce,
the clear control immediate); every term SHALL match the question or its answer; question hits
rank above answer-only hits, then page order; an exact-duplicate question is indexed once; curly
and straight quotes match. Results sit under the field, each a question opening in place with the
same answer markup as its group; any query change closes an open answer. Nothing found shows
"We couldn't find anything for “…”." with **BROWSE ALL TOPICS** and **CONTACT US**, and hides
"Still need help?". Enter dismisses the keyboard and, below 1024, brings results under the header.
Every change is announced by one status region mounted from the start.

### Requirement: FR-11 Topics and groups
`capability: delivery-faqs` · `delta: ADDED (feat/delivery-and-faqs)`

The topic grid SHALL be plain fragment links (`#faq-<group>`) with measured counts, working before
any script runs. Each group is a server-rendered list of native `<details>` with "Back to FAQ
topics" and an "Expand all" that reads "Collapse all" only while every question in it is open (its
name carries the group, "Expand all questions in Delivery"). While a search runs the browse view is
hidden, never unmounted, so Find, deep links and open answers survive.

### Requirement: FR-12 Accessibility
`capability: delivery-faqs` · `delta: ADDED (feat/delivery-and-faqs)`

Every field SHALL have a label; corrections and outcomes SHALL be announced (a status beside the
field, a live result region, the search status); focus never falls to `<body>` when the control
that held it disappears (Try again → Check; Browse all topics → the topic heading on a phone, the
field on desktop; clear → the field); every control is keyboard operable with the shared brass
ring (cream inside the green pill); touch targets are 44px; the field correction is 16px
`--terracotta-ink` and small brass type on sage is `--brass-ink-warm`.

---

## Design

### Architectural decision

The page is a Server Component that reads Aonik once (`resolveDeliveryFaqsData`): the storefront
config for the figures, and whether a coverage lookup and a notify-me list exist. Missing pieces
degrade alone; the page never 500s. Client Components only where state lives: `PostcodeChecker`
(+ `NotifyMeForm`), `FaqSearch`, `ExpandAllButton`. The checks are server actions
(`src/lib/delivery/actions.ts`) returning values, never throwing. Rules are React-free and unit
tested: `postcode.ts`, `checker.ts`, `handoff.ts`, `faq/search.ts`, `content/deliveryFaqs.ts`.

The coverage contract proposed to aonik#352 (`CoverageLookup`): `check(postcode)` resolves
`{ status: 'serves', postcode, earliestDeliveryDate? } | { status: 'not-served', postcode }` and
THROWS when it cannot tell; optional `postcodeAt(latitude, longitude)` resolves a postcode or null.
The notify-me contract proposed to aonik#357 (`NotifyList`): `join({ email, postcode })`.

### Target architecture

| Piece | File |
|---|---|
| Route | `web/src/app/(site)/delivery-and-faqs/page.tsx` |
| Checker | `web/src/components/delivery-faqs/PostcodeChecker.tsx`, `NotifyMeForm.tsx` |
| FAQs | `web/src/components/delivery-faqs/FaqSearch.tsx`, `FaqBrowse.tsx`, `FaqAnswer.tsx`, `ExpandAllButton.tsx` |
| Rules | `web/src/lib/delivery/*`, `web/src/lib/faq/search.ts`, `web/src/lib/content/deliveryFaqs.ts` |
| Data | `web/src/lib/aonik/coverage.ts`, `notifyMe.ts`; `AonikClient.coverage` / `.notifyList` |

### Known gaps — departures from the design, each deliberate

1. **No notify-me form anywhere** until aonik#357 (FR-08); the design's not-in-area panel has one.
2. **No checker in live mode** until aonik#352 (FR-02), so live's "Where do you deliver?" answer
   ("Enter your postcode above…") has nothing above it until then.
3. Field corrections are 16px `--terracotta-ink` (the design: 14px `--chilli`, 3.8:1 on sand and a
   graphic-only token); "Earliest delivery" is `--brass-ink-warm` (`--brass-ink` is 4.28:1 on sage);
   the notify-me consent line is 14px (the floor for privacy notes; the design: 13px).
4. "Still need help?" is an h2 (the design: a paragraph), so it is in the heading outline.
5. One focus ring on the search pill (the prototype also rings the input inside it).
6. Without JavaScript the checker and search do nothing; their fields carry no `name`, so nothing
   leaks into a URL.
7. Demo data: the fixture earliest date (6 August) is past, so demo answers "serves" without the
   date lines (FR-04); the demo checkout still prices delivery
   "£10 → Free" (`BOX_PRICING_FIXTURE`) while the storefront config says £5.95 — to reconcile with
   the funnel (#28, #31).
8. Marketing-pages FR-02 keeps the earliest date off marketing pages; here it appears only in a
   served postcode's answer, the ordering funnel's first step.

### Open questions (owner decisions, not requirements)

1. **Coverage API (aonik#352)** — does the contract above suit; is the earliest date per postcode
   or tenant-wide; who supplies the coordinates-to-postcode lookup (Aonik, or a third party such as
   postcodes.io — which would need its own line in the Privacy Policy)?
2. **Changes and cancellations** — "Orders & changes" predates the 7-day rule (SHOPPING-STATE §49,
   behaviour guide §9); it is verbatim here until the copy is revised and signed off (#38).
3. **Free delivery** — if the configured charge is 0, what do the two delivery answers say?
4. **Duplicate questions** — "Can I freeze my meals?" is in two groups (search shows it once); the
   5-day guidance is in two, worded differently (build-handoff open items).
5. **Rate limiting** — the coverage and notify-me endpoints are public; abuse protection belongs to
   Aonik (contract §3b).

---

## Tasks

- [x] `T1` The page: checker, delivery facts, FAQ search, topics, groups (#23)
- [x] `T2` `DELIVERY_FAQS_HREF = '/delivery-and-faqs'`, status pages regenerated, desktop
  auto-hide (#8, #23)
- [ ] `T3` Live coverage: `HttpAonikClient.coverage` over aonik#352's endpoint (+ the location
  lookup); the checker then renders in live with no other change
- [ ] `T4` Notify-me: `HttpAonikClient.notifyList` over aonik#357; the form then renders
- [ ] `T5` Choose Box v2 reads the hand-off (FR-07 scenario) (#28)
- [ ] `T6` Copy sign-off: 7-day rule, duplicates, payment methods, gifting mechanics (#38)
- [ ] `T7` Reconcile the demo checkout's delivery fixture with the storefront config (#28, #31)

### Testing

- Unit: `tests/delivery-faqs.test.tsx` — validation, the nine states, the hand-off, demo and live
  coverage, the server actions, the FAQ figures and counts, search rules, rendering in both modes,
  no review controls, no URL postcode, no literal figures; `tests/information-links.test.ts`
  (FR-21), `tests/site-header.test.ts` (auto-hide route).
- Manual: 320 / 390 / 1024 / 1280 against the design file; every state through real input in demo
  mode (offline for "could not check", a denied permission for "location refused"); keyboard only.

### Definition of done

All scenarios pass; `npm test`, lint, typecheck and build are green; a reviewer has signed off.

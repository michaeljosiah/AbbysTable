---
spec_id: SPEC-2026-10-10-site-design-alignment
title: Site-wide alignment with the approved design folder
status: in-review
branch: codex/site-design-alignment
owner: michaeljosiah
capabilities: [site-chrome, marketing, checkout, account, visual-verification]
created: 2026-10-10
updated: 2026-10-10
---

# Site-wide alignment with the approved design folder

## Why

The owner requested a 1:1 comparison of the rest of the application with `design/`,
following the portion-model implementation in PR #86. A closed implementation issue
does not establish visual parity at every viewport or state.

Main was pulled on 10 October 2026 and remains `142b679`. This work starts from
`95d6e3e` (PR #86) so the shared order flow can be inspected together. The follow-up
branch keeps additional site changes separately reviewable.

## What changes

- ADDED a page-by-page design verification record and evidence.
- MODIFIED confirmed UI discrepancies while retaining authoritative commerce,
  identity, food-content and operational contracts.
- Document absent or gated surfaces explicitly; do not count a redirect, mock
  success or substituted component as the approved screen.

## Requirements

### FR-01: Approved sources
`capability: visual-verification` · `delta: ADDED (codex/site-design-alignment)`

The application SHALL follow the current approved page source, the final decisions
in `design/CLAUDE.md`, and `abbys-table-page-behaviour-guide.md`. The live-page manifest
identifies candidates, but superseded baselines and print variants are not additional
customer routes. Real catalogue data takes precedence over holding prices, dates,
photographs, contact details and unconfirmed food information.

### FR-02: Responsive and interactive parity
`capability: visual-verification` · `delta: ADDED (codex/site-design-alignment)`

Each implemented page SHALL retain the approved hierarchy, type, colour, spacing,
imagery treatment, controls and responsive composition. Shared navigation, sticky
controls, disclosures and overlays SHALL preserve their documented behaviour.

- WHEN a page is inspected on desktop and mobile, THEN the same customer task is
  available, without overflow, clipped controls or competing fixed CTAs.
- WHEN an approved surface depends on unavailable backend/content support, THEN
  the audit records the exact limitation rather than presenting a fabricated state.

## Design

Use existing components and design tokens. Fix a shared cause once where appropriate;
keep named page exceptions. Browser comparisons use local demo mode and the actual
approved HTML served locally. Authenticated/payment-only views also require source
and fixture-backed rendering checks if no real session/order is available. Such
checks must be labelled separately from live integration verification.

## Tasks

- [x] Pull main and establish the base and approved source inventory.
- [x] Inspect shared chrome, fonts, tokens, buttons and fixed controls.
- [x] Compare marketing/information pages at desktop and phone widths.
- [x] Compare Step 1, Checkout, authentication, account and payment/status surfaces.
- [x] Fix confirmed discrepancies and verify affected states.
- [x] Record missing/gated surfaces and remaining dependencies accurately.
- [x] Run appropriate checks and attach review evidence.
- [ ] Independent PR review and sign-off.

### Verification record

#### Method and scope

Compared the application with the locally served, approved HTML from
`design/_audit/live-pages.json`. The inventory has 32 entries: the old Choose Box
baseline and print Terms variant are not separate customer routes. Standard and
Signature dish templates share one implementation. The table below covers the
remaining 30 templates, grouped into 29 page families.

Browser checks used 1280px desktop and 390px phone viewports, with loaded fonts.
Eighteen public routes also received a 320px overflow check: none overflowed.
Account views were checked at 320, 768 and 1280px; checkout's intermediate 1060px
breakpoint was checked separately. Measurements compared visible heading size,
position and width alongside screenshots and CSS/source inspection. They are
not a pixel-diff certification of every possible data state.

Commerce routes used local demo mode. Account and payment screens used the actual
application components with local fixture data, not copies of the design markup.
Temporary fixture routes/scripts were removed after inspection. No live account
mutation, payment, email or order was submitted.

#### Corrections in this change

1. **Order chrome:** all five steps now use the approved separate logo/help row
   and cream progress band. Choose Box retains its own 1080px compact breakpoint;
   the other steps use 860px. Restored Optional below Extras where specified,
   correct phone gutters and label sizes, and the unregistered wordmark.
2. **Order footer:** restored the visible mobile wordmark, two-column links with
   the final Terms link spanning the row, desktop arrangement, spacing and touch
   targets. Removed the superseded contact strip and excess shell padding.
3. **Sticky summaries:** their offset and available height now track the measured
   checkout header, including intermediate widths and text wrapping. At 1060px,
   the Review rail starts 24px below the measured header.
4. **Choose Box:** corrected the choice heading, card text and savings badge,
   ADD DISHES labels, View box control, estimated-total position, and saved-dish
   treatment. A single saved dish uses one responsive card with its portion;
   larger saved boxes receive an accurate multi-dish summary. Demo totals now
   include saved extras, matching Review. A browser check confirmed a saved box
   at £185.45 (base £158, portion/Signature £19, extras £2.50, delivery £5.95).
   Live totals continue to use the server quote.
   Checkout's demo quote now also receives the catalogue's Signature supplements,
   so its £19 upgrade total is shown as £10 Full Table plus £9 Signature, rather
   than one obsolete Personalisation row. The shared label now names Full Table.
5. **Phone box summary:** made the sheet a true modal with inert background,
   focus containment, Escape and focus restoration. Its purchase bar yields to
   the sheet, other overlays, consent and the footer, instead of obscuring them.
6. **Login:** restored the approved 640px and 1024px section/card padding and
   gutters. Desktop heading positioning now matches the design; phone geometry
   remains aligned.
7. **My Account:** restored tablet card padding and form-action layout, desktop
   hero and body spacing, delivery-heading and tracker typography. On phones and
   tablets, the menu is the overview; the desktop overview cards no longer
   repeat below it. Subpages remain visible. All four rendered views have no
   horizontal overflow at the three checked widths.
8. **How it works:** restored the 16px spacing after the media figure, removing
   the observed section displacement.
9. **Delivery promises:** dish and ordering pages now use the existing future-date
   guard. They no longer advertise the expired prototype/demo delivery date.
10. **Questions drawer:** retained search/FAQ presentation, fixed modal focus and
    replaced nonfunctional chat/email controls with the real Contact route.
    The old form reported a successful send without a backend call. Answers no
    longer promise ingredient removal, unpublished storage periods or unsupported
    delivery coverage. Browser verification confirmed close-button focus on
    opening and return to Questions on Escape.

#### Page-by-page outcome

“Aligned” below means the inspected layout/type/spacing matches the approved
composition with the stated data exceptions. It does not certify unavailable
states, production integrations or unapproved legal/food content.

| Approved page | Application / evidence | Outcome and limits |
|---|---|---|
| Homepage v2 | `/`, browser | Hero and section heading geometry/type aligned on desktop and phone. Real catalogue items change the later rail height slightly. |
| Menu Landing v3 | `/menu`, browser | Filters, grid and type aligned. The expired demo delivery strip is correctly absent. |
| Dish Landing v2 + Signature v2 | `/menu/[slug]`, source + ordering browser checks | Portion cards implemented in PR #86; shared chrome and delivery promise checked here. Live catalogue migration/content still requires release verification. |
| How It Works v2 | `/how-it-works`, browser | Corrected media spacing; responsive composition aligned. Prices and food declarations remain sourced. |
| Abby's Story v2 | `/our-story`, browser | Major headings, layout and type aligned after fonts loaded. |
| Standards v2 | `/standards`, browser | Type and composition aligned. Authored nutrition/allergen content can change section height. |
| Gifting v2 | No `/gifting` route | Missing: #26. Gift intent and navigation cannot be signed off. |
| Private Table v2 | `/private-table`, browser | Layout/type aligned. Waitlist is withheld when unpublished/closed; the prototype's successful submission state is not a production capability. |
| Delivery and FAQs | `/delivery-and-faqs`, browser | Topic-heading geometry and responsive layout aligned. Coverage and availability remain data-driven. |
| Contact Us | `/contact`, browser | Header/type aligned. Published contact details, hours and form capability intentionally determine the available cards and page height. |
| Allergens | `/allergens`, browser | All six major heading positions/type aligned at both primary widths. Content sign-off remains separate. |
| Privacy Policy | `/privacy`, browser | Layout, columns and typography aligned. Company/cookie content differences are retained pending approval. |
| Terms of Sale | `/terms-of-sale`, browser + source | Responsive legal layout aligned. Print variant is a presentation of this document, not another route. Legal approval remains separate. |
| Log in | `/login`, browser | Responsive spacing corrected. Live identity and the saved-box choice remain separate work. |
| Choose Box v2 | `/box`, browser | Corrected saved-dish card, totals, CTA, footer and mobile sheet/bar. Real size prices replace holding figures. |
| Add Dishes v2 | `/box/dishes`, browser + source | PR #86 supplies portion-only selection/removal/return journey; verified shared chrome and date treatment here. |
| Extras v2 | `/box/extras`, browser + source | PR #86 supplies category/portion-flow changes; checked shared chrome and retained extra pricing on return to Step 1. |
| Review v2 | `/box/review`, browser + source | PR #86 supplies revised review; verified responsive rail/header clearance and totals. Gift line still requires real gift state. |
| Checkout v2 | `/box/checkout`, browser | Corrected shared header/footer. Existing form/summary inspected; logged-in prefill, address lookup, account setup, points/gifts and delivery-window details are not fully implemented (#31 and linked work). |
| Gift Card Checkout | No dedicated route | Missing: #27. |
| Order Confirmation v2 | Actual component, fixture browser render | Layout/type checked for a member order, including points. Real order/address and membership data produce extra rows. No live payment confirmation tested. |
| Payment Processing | Actual component, fixture browser render | Desktop/phone status composition and typography aligned. No payment submitted. |
| Payment Not Completed | Actual component, fixture browser render | Desktop/phone status composition aligned; outcome wording follows actual payment state. |
| Payment Cancelled | Actual component, fixture browser render | Desktop/phone status composition aligned. No cancellation of a real payment tested. |
| Page Not Found | Unknown URL, browser | 404 layout and major heading geometry aligned at both primary widths. |
| Something Went Wrong | `/500.html`, browser + source | Static type/composition inspected. Unpublished support details are withheld. Serving this asset is not proof of a working CDN outage fallback (#13). |
| Back Shortly | `/maintenance.html`, browser + middleware tests | Static layout/type inspected; missing support details explain vertical centring differences. Actual maintenance activation was not performed. |
| Link Expired | `/account/access`, browser + source | Expired-link presentation checked after hydration. Resend/signup handoff remains identity work (#34). |
| My Account | Actual overview/orders/addresses/details, fixture browser renders | Responsive fixes above. Orders fixture was the empty state; authenticated mutations and populated-order permutations were not exercised. Points/Gift cards sections, saved-box choice, editable email and per-dish reorder parity remain incomplete (#35). |

#### Outstanding before a site-wide 1:1 sign-off

- **#26 / #27:** Gifting and Gift Card Checkout, including gift intent, recipient,
  message and hide-price state. Related Review/Checkout lines cannot be shown as
  working until that state exists.
- **#35:** keep-this-box/use-saved-box choice at sign-in; dedicated Points and Gift
  cards sections; the designed reorder interaction and editable-email workflow.
  Current Order again reconstructs the whole box and opens Step 2. Email remains
  read-only under the current identity contract.
- **#36:** complete points integration across Checkout and Account. The current
  account overview and confirmation components already contain points UI, so the
  earlier statement that no points UI exists anywhere is no longer accurate.
- **#31:** remaining checkout capability/state checklist, including customer
  prefill and account setup, address lookup, gift/points behaviour and delivery
  details. Visual shell corrections alone do not close the issue.
- **#13:** CDN/host outage routing and production verification. The static files
  and tested maintenance middleware do not establish infrastructure completion.
- **Support:** a live-chat service or real inline message endpoint is needed to
  reproduce those prototype actions. The drawer now provides an honest, usable
  Contact link. Published business details and operational signup-list status
  also determine the Contact, Private Table and footer states.
- **#37 / #38 and live release checks:** unresolved business/content decisions,
  legal and food-content approval, authored contact/coverage information, live
  portion catalogue configuration, authentication and payment journeys.

Do not close these issues solely on this visual pass. The earlier issue audit
already closed #21, #23, #24 and #25 against their implementation criteria; this
change adds no further issue closures.

#### Evidence

Saved screenshots show the actual application. Account/payment filenames explicitly
identify fixture-backed screens; they are not evidence of live integration.

- [Choose Box, phone](evidence/site-design-alignment/choose-box-mobile.png)
- [Checkout, desktop](evidence/site-design-alignment/checkout-desktop.png)
- [Login, desktop](evidence/site-design-alignment/login-desktop.png)
- [Account, desktop fixture](evidence/site-design-alignment/account-desktop-fixture.png)
- [Account, phone fixture](evidence/site-design-alignment/account-mobile-fixture.png)
- [Payment, desktop fixture](evidence/site-design-alignment/payment-desktop-fixture.png)

Automated validation: 705 tests pass, including the rendered help-panel regression,
updated Contact-link contract and separate Full Table/Signature summary labels.
`npm run lint`, `npm run typecheck` and `npm run build` pass. The final build and
production-browser smoke check used `AONIK_DATA_MODE=demo`. The earlier build with
local live configuration also completed, after network-related page-generation
retries; that is not production integration sign-off. `git diff --check` passes.
Independent review is still pending.

### Definition of done

Every approved page type has a recorded comparison or explicit access/dependency
limitation; confirmed in-scope defects are corrected; appropriate checks pass; and
the result is reviewable. This audit does not approve legal/food content, invent
production data, or substitute demo behaviour for live authentication/payment checks.

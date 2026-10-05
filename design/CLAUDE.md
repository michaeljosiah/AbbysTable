# Abby's Table — project conventions

## Mobile-first rebuild (in progress — supersedes older desktop-first patterns)
The site is being rebuilt mobile-first. Over 70% of UK customers shop on mobile; the existing pages were designed for desktop and patched downward. These rules apply to every page we touch from now on.

- **Mobile is the base and the primary experience.** Styles with no media query ARE the mobile design.
- **Desktop is intentionally designed for desktop** — not a stretched mobile layout. Larger breakpoints get their own compositions (e.g. 50/50 splits, different crops), not the same composition at a wider size.
- **Media queries are `min-width` only.** Never add `max-width` overrides to a rebuilt page.
  **One accepted exception: Choose Box v2 (checkout step 1)**, which keeps its desktop-first
  cascade by decision — see its entry for why. Nothing else may follow it, and new work on that
  page still uses `min-width` where it can.
- **System breakpoints: 640 and 1024. Content cap 1280, side gutter 48px.** Treat these as defaults, not sacred. A component may add an exception only if it genuinely breaks — use the fewest possible, express them as `min-width`, and record each one below with the CONTENT reason (not just the number).
- **Never reorder interactive blocks with flex `order` or grid placement.** It desyncs visual and
  DOM order, so tab focus jumps backwards and assistive tech hears a sequence sighted users do not
  see (WCAG 2.4.3, 1.3.2). Put the DOM in the order you want and use ONE order at every width. It
  is only safe when what the block moves past is non-interactive — the Delivery & FAQs search moves
  past the delivery highlights, which contain no controls.
- **One set of content, recomposed with CSS grid.** Never duplicate markup for mobile/desktop and `display: none` one copy — it doubles payload and screen readers/search engines still see the hidden copy. Genuinely different image crops use `<picture>`.
- That rule bans DUPLICATE markup, not responsive visibility. Hiding a single element at one
  breakpoint is legitimate content prioritisation: `display: none` removes it from the
  accessibility tree as well, so no mismatch is created. Keep it mobile-first — hidden in the base
  state, revealed at `min-width` — and never use a visually-hidden utility for it, which
  deliberately does the opposite.
  Applied case: the dish card's description is hidden on mobile (it materially increases card
  height while browsing) and shown from 1024 up.
- **Zero layout shift.** Reserve geometry before images load: `aspect-ratio` on the image box plus `min-height` on the section so it can still grow with accessibility text. Never JS-calculated heights, never rigid pixel heights.
- **Touch targets: 44×44 is Abby's Table's internal minimum for MOBILE and touch, NOT the WCAG AA
  minimum** (AA is generally 24×24 with exceptions). Do not relax ours on the belief it is the
  legal floor. The image/title area of a card is tappable, not just a small link.
- **It is not a requirement for desktop navigation text.** Pointer-only controls that never appear
  on a touch layout — the desktop header nav links (`display: none` until 1024), the footer's
  legal strip and column labels at desktop — are sized for reading, not thumbs. Anything reachable
  on a phone still meets 44px, including everything inside the mobile drawer and the footer
  accordions in their collapsible state.
- Inline links inside body copy are also exempt: a 44px hit area would break line spacing —
  `min-height` DOES apply to an inline-block, so it inflates the line box and drags the whole grid
  row with it. Applied cases: the "Abby's Private Table" link inside a Delivery & FAQs answer, and
  "See opening hours" inside the Contact phone card's note. If a bigger target is wanted, take the
  text out of the inline flow — never pad an inline-block. Applied cases: the "Abby's Private
  Table" link inside a Delivery & FAQs answer, and "contact us" inside the Allergens notice.
- Where practical, enlarge the VISIBLE control to meet the target rather than padding an invisible
  hit area around a smaller one — especially for purchase CTAs. Two deliberate exceptions, both to
  the VISIBLE size only and never to the 44px target: the video pause/play control (34px disc) and
  the dish card's Signature "i" note (17px disc, sized by an invisible `::before`, because padding
  the button would inflate the navy pill it sits in).
- **Approved button ladder — do not flatten to one generic height:**
  **54** hero primary, drawer primary ⬥ **52** major section CTA — including a **"need help →
  Contact us" panel CTA**, which is the same module wherever it appears (How it works, View the
  full menu, Still need help, Need more help)
  ⬥ **48** mobile sticky purchase CTA ⬥ **44** header purchase CTA, icon controls, minimum
  text-link hit area.
- **A CTA's width must not change between phone widths.** The hero primary is `width: 100%` of its
  content column for every phone size — the page gutters set its outer width. No mobile
  `max-width` and no intermediate breakpoint: a `min(100%, 330px)` cap made the same button read
  full-width at 360 and a narrow centred pill at 430, which looks like two sizing systems. It
  becomes intrinsic only at 640, where the composition genuinely changes (button and link side by
  side). Height, radius, type and padding never vary. The header pill is a different class of
  control and stays intrinsic at every width.
- A major section CTA keeps its height on mobile — **only its width is responsive**: full width
  inside the page gutters on a phone, intrinsic and centred from 640. Never shrink an important
  mobile CTA.
- **A progress indicator is not a control.** The dish carousel's 3px line communicates position
  only: no click, no keyboard, no 44px target, `aria-hidden`, and NOT a touch-target exception.
  Navigation is the carousel itself — swipe/drag, trackpad, and Tab through the card links. Only
  make such a track draggable if a 3px hairline can be made to look grabbable, which it cannot.

### Server-side basket / checkout draft — production requirement (30 Sep 2026)
The prototype's order lives only in per-tab sessionStorage (`at-order-v1`, `at-date-hold-v1`,
`at-gift-checkout-v1`). That is a prototype mechanism and must NOT be extended with more browser
storage. **Checkout must use a server-side basket/order draft as the canonical source of truth.
Anonymous customers are identified by a basket token; authenticated customers can additionally
have the basket associated with their account. Browser/session storage may support the UI but
must never be the sole copy of the order. Delivery-capacity reservations must also be held and
validated server-side and must expire independently of the basket.**
- The draft holds everything chosen by checkout: box size, dishes, portions, Signature upgrades,
  extras and their options, gift configuration + greeting-card message, recipient and address,
  phone, delivery date + time window + notes, the reservation, applied codes, account-creation
  choice.
- Anonymous checkout must work: the server issues an anonymous basket ID and only that identifier
  goes in a cookie. No account is needed to persist the basket.
- Same browser, any tab ⇒ the same basket. Refresh or reopening checkout restores it automatically
  (this is what "← Back to checkout" relies on when the checkout tab was closed).
- Log in / account creation during checkout attaches or safely merges the guest basket into the
  account — never a fresh empty basket.
- Cross-DEVICE recovery (phone → laptop) works only for logged-in customers, via the
  account-linked basket. An anonymous basket cookie does not travel between devices; anonymous
  cross-device recovery would need a separate mechanism (e.g. an emailed secure resume link) and
  is NOT in scope unless decided.
- Two lifetimes: the basket persists (~24 h for an empty active box, 7 days for a populated one —
  "Business rules"); the delivery reservation is short-lived (15 minutes from an active date
  choice), plus a payment hold of up to 10 minutes once payment starts.
- Reservations are server-authoritative: the page timer only DISPLAYS the remaining time and never
  decides capacity. Changing date releases the old reservation and creates the new one atomically.
  Expiry removes only the reservation, never the basket.
- Payment success converts the draft into the confirmed order EXACTLY ONCE (idempotent against
  Stripe redirects/retries and webhook repeats). Account creation + points follow from that same
  conversion (see "Account + points states").
- Multi-tab edits need conflict handling: when the basket changes in another tab, checkout
  refreshes or reconciles rather than silently overwriting.

### Business rules — reconciled 5 Oct 2026 (user; AUTHORITATIVE — older wording elsewhere is superseded)
Where any line further down disagrees with this block, this block wins; the older line is marked
"superseded" in place. Prototype pages that still behave the old way are listed under "Prototype
still stale" — they are recorded, not fixed (documentation-only pass).
- **Active box.** One shared definition (detail: "ACTIVE BOX — one shared rule" under Choose Box v2).
  Viewing Step 1, the default 6-dish selection and changing size on Step 1 create NOTHING. Pressing
  **ADD DISHES** commits the box and makes it active even with 0 dishes on Step 2. A genuinely
  carried dish from a dish page also establishes active state before that commit. Removing the
  final dish never destroys an active box — it becomes an active EMPTY box and VIEW BOX stays.
  Payment success converts/clears the draft. Production retention: ~24 h for an empty active box,
  7 days for a populated one. The delivery reservation is a completely separate short-lived state.
  "Active" is never "has dishes" alone.
- **Box size.** Minimum 6, maximum 99, any count 6–99 valid. 6 / 12 / 18 stay as preset choices
  where the approved UI uses them; "Set your own" covers the rest (existing typeable stepper).
- **Existing normal box → Gifting.** Visiting Gifting never changes an order. With a normal active
  food box, "Build their box" first asks **"You already have a box in progress."** — primary
  **USE MY CURRENT BOX AS A GIFT**, secondary **KEEP MY CURRENT BOX**. KEEP: no change, customer
  stays on Gifting. USE: changes only the food-box gift intent; box size, dishes, portions and
  extras are kept; no second food-box draft; resumes at the furthest valid stage already reached.
  At build, the prompt uses the existing dialog / bottom-sheet pattern (no new design). Gift food
  boxes and Abby's Table Gift Cards remain separate concepts. Supersedes the 1 Oct immediate
  conversion (`?resume=1&gift=1`).
- **Points.** 2 points per £1 of eligible spend; 100 points = £1; never expire; no minimum
  redemption; redemption capped at **20% of an order** (the customer chooses how many, up to that
  cap — never copy such as "Use some or all of your points"). Earning is on eligible spend AFTER
  discounts. Earn: dishes, Signature upgrades, eligible extras. No earn: delivery/postage, the £3
  personalised greeting card. Buying an Abby's Table Gift Card earns on the amount actually paid
  for the card value; when that card is later redeemed, the card-funded amount does NOT earn again;
  new-money eligible spend alongside it does. Points cannot normally be redeemed against Gift Card
  value. Points, vouchers and Gift Cards may combine on ordinary food orders, subject to
  eligibility. **Qualifying points are added immediately after successful payment** — there is no
  "pending until fulfilment" state. Refunds/cancellations: full ⇒ reverse the points attributable
  to the refunded eligible spend; partial ⇒ only that part; refunding delivery, the greeting card
  or another non-earning line reverses nothing; points REDEEMED on a cancelled/refunded order are
  restored appropriately; if earned points were already spent, the reversal may take the balance
  negative, offset by future earnings.
- **Confirmed-order changes and cancellations.** No self-service change or cancellation in My
  Account: no Change order, no Cancel order, no customer-facing amendment deadlines, no
  cancellation-eligibility messages. My Account says only **"Need help with an order?" / "Contact
  us." / CONTACT US**; confirmed orders are read-only. The policy lives in **Delivery & FAQs and
  Terms of Sale**, kept simple: customers should contact Abby's Table **at least 7 days before their
  scheduled delivery** about changes or cancellations — not a guarantee that every earlier request
  is accepted; the business's case-by-case flexibility is NOT documented in detail. Delivery dates
  under 7 days away are never offered, so there is no separate rule for orders inside 7 days.
- **Delivery reservation + payment hold.** The Checkout reservation stays **15 minutes**. Showing
  the suggested / next available date does NOT reserve it; the reservation starts only when the
  customer actively selects or accepts a date. On entering payment with a valid reservation: (1)
  revalidate the date, (2) create/start the payment session, (3) protect the capacity as a
  **payment hold**, (4) allow up to **10 additional minutes** for payment/authentication. No second
  pressure countdown during payment. Repeated payment attempts must not extend a scarce slot
  indefinitely. If payment was actually submitted but the result is uncertain: do not release the
  capacity because a timer ran out, do not invite the customer to pay again yet — resolve the
  provider's result first.
- **Legal pages from Checkout.** Terms of Sale and Privacy Policy open in a NEW TAB; Checkout stays
  intact in its tab. The legal page shows "← Back to checkout"; where the browser permits it may
  focus/switch back to the existing Checkout. **Auto-closing the legal tab is NOT required**; never
  depend on `window.opener`; never create a second Checkout to implement the return. If the
  browser cannot switch, stay on the legal page and show "Your checkout is still open in your
  previous tab. Switch back to it to carry on."
- **Order Confirmation** keeps its approved v2 structure (below). Points language follows the rule
  above: qualifying points are added after successful payment, not held pending.
- **Account setup after Checkout — points (decided 5 Oct 2026).** Qualifying points are earned immediately after successful payment. If account setup/access is
  still incomplete, the points remain attached to the successful order and become visible in the
  account once secure setup/access is completed.
  Never described as pending, awaiting fulfilment or not yet earned. Order Confirmation v2's
  "created" line "Your points will appear once your account setup is complete." is acceptable on
  exactly that reading (earned, not yet visible).
- **Gift Card Checkout — account + points (decided 5 Oct 2026; build-stage requirement).** A
  signed-out Gift Card buyer gets the same OPTIONAL create-an-account-after-payment opportunity as
  food-box Checkout, so they can collect the points from the purchase: guest checkout stays; no
  password detour before payment; opting in sends a secure setup/access link after successful
  payment; an email that already has an account never creates a duplicate, never silently signs
  the customer in, and never blocks payment. Earn: 2 points per £1 of Gift Card value actually
  paid; postage and the £3 greeting card do not earn; the card-funded value does not earn again
  when the recipient redeems it. Points attach to the purchase immediately after payment and show
  in the account once setup/access is complete. Signed in ⇒ points go straight into the existing
  account. A guest who neither logs in nor opts in sees no points-awarded account state. Build with
  the established Checkout v2 account/points pattern; the approved Gift Card Checkout design stays
  the visual reference — no redesign now.
- **Prototype still stale (recorded, not fixed):** ⬥ Checkout v2 and Order Confirmation v2 sample
  points use 1 point per £1 (Checkout's "HOLDING RULE") — stale, reconcile to 2 per £1.
  ⬥ Gifting v2 still converts an existing box immediately via `?resume=1&gift=1`, with no prompt;
  `_audit/gift-flows.html` still tests that conversion. ⬥ `at-legal-return.js` still focuses
  checkout and closes the legal tab. ⬥ Gift Card Checkout still has no account-creation option or points panel
  (the 5 Oct decision above is not built yet — the prototype is visually stale on this point).

### Desktop marketing header — `at-desktop-header.js` (5 Oct 2026)
- **From 1024, the marketing/editorial pages' header hides on a meaningful scroll down and comes
  back on a meaningful scroll up**; near the top it is always in its normal place. Same header,
  only a transform changes. Opt-in per page: `<header class="at-hdr" data-at-desk-hdr="marketing">`
  + `<script src="at-desktop-header.js">` in the REAL head after at-logo.js. Opted in: Homepage,
  Menu, How it works, Gifting, Private Table, Standards, Abby's Story, Delivery & FAQs, Contact.
  **Not opted in, deliberately:** dish pages, legal (Allergens, Privacy, Terms), Log in, My Account,
  Order Confirmation, error pages, every ordering/checkout/payment step. There is no shared shell
  that tells these apart, so the opt-in attribute IS the distinction — add it to a new page only
  if it is genuinely a marketing/editorial page.
- Hysteresis from the turning point: hide after 40px down, reveal after 64px up, never hidden
  while scrollY ≤ the header's height; focus inside the header shows it; an in-page anchor jump
  keeps it hidden for 450ms so it cannot cover the target. Below 1024 the script does nothing —
  each page's own mobile logic (`data-hidden`) is untouched.
- Harness: `_audit/desktop-header-check.html` (9 pages × 1024/1280/1440/1920 + 5 control pages +
  mobile; `?pages=i,j&w=k&mkt=0&ctrl=0&mob=0` slices). Run in batches — the preview frame
  degrades over long runs and reports false sy=0 failures.

### Wordmark — `at-logo.js` (4 Oct 2026, site-wide)
- **Every Abby's Table wordmark is `<at-wordmark></at-wordmark>` inside its existing sized box**,
  which carries the colour as `color:` (was `background:` + a CSS mask over `assets/logo.svg`,
  which rendered as a solid bar in single-file exports). One copy of the SVG, in `at-logo.js`;
  loaded in the REAL `<head>` after `at-focus.css`, before `support.js`. Never reintroduce the
  mask or paste the SVG into a page. Size, position, hover and colour of each box are unchanged.
  head-check fails a page missing the script or still referencing `logo.svg`;
  `_audit/export-logo-check.html` verifies the exports. Verified 4 Oct 2026: 8 pages measured
  before/after at 360–1440 incl. the open drawer — box, colour, opacity and glyph identical (0.000px).
  Details:
  build-handoff.md § 3u.

### Standalone exports
- **`_archive/`** holds superseded pages, backups and pre-`export/` standalone copies (moved 4 Oct
  2026; see its README). Nothing live links there. Never copy a component from it.
- **Sterling sign, site-wide.** Playfair Display's £ has a double crossbar that reads as a euro.
  Every page's `<helmet>` carries an `AT Sterling` @font-face (`assets/fonts/at-sterling.woff2`,
  a 1 KB Figtree subset of U+00A3 only, 400–700) prepended to `--font-display` and
  `--font-accent` under `html:root`. Only the £ changes; copy the block into any new page. Never
  fix it per element — that is how it came back.
- `export/` holds compiled single-file snapshots (all 33 regenerated 4 Oct 2026, incl. the new My Account; runtime-assigned asset paths in every page's logic substituted for data URIs in temporary root copies, then deleted). They do NOT track source, so **regenerate them
  after any change to a shared component** — otherwise the user's download is a different site
  from the one in the project.
- The homepage needs its runtime-assigned media (three dish photographs set via ref, the clip's
  `src`/`poster` chosen by `matchMedia`) substituted for data URIs in a temporary copy at the
  project root before bundling; the bundler cannot see them. See `build-handoff.md` § 3n. Symptom
  when skipped: four images resolve to absolute project URLs and fail offline, and the clip never
  attaches. Verify a homepage bundle by checking every `<img>` has `naturalWidth > 0` AND that the
  `<video>` `src` becomes a `data:` URI after scrolling the clip into view.
- **The dish photographs are PNGs of 1.6–2.3 MB each**, which is why that bundle is ~22 MB. They
  are photographs, so they should be JPEGs at 2× display size (the project's own image rule) —
  doing so would cut the snapshot by more than half and speed the live pages. Not yet done; it
  changes approved pages, so it needs its own review.

### Component approval + propagation
- A shared component that we redesign and **approve becomes the canonical version at that moment**. Components not yet redesigned stay exactly as they are until we reach them.
- **Propagation is gated on per-page review.** Do NOT bulk-apply an approved component across the site. Each page gets its own `… v2.dc.html` copy that inherits the approved components, built only when we reach that page and the user has reviewed it. Never create the v2 copies ahead of that review.
- A page therefore never carries a mix of old and new versions of the same component — but the SITE will, while pages are worked through one at a time. That is expected.
- **Sequence per component:** mobile → user approves → desktop → user approves → propagate.
- A page's v2 must also move it onto the **1280 shell**. The un-rebuilt pages use a 1440 header
  shell over 1280 content bands, so their logo sits 80px left of their own content — fix that as
  part of the v2, not separately.
- **Preview canvas:** `$preview` width **390** on rebuilt marketing pages, so they open on the
  mobile design rather than desktop. (Checkout steps keep 1340 — see below.)
- Significant page revisions go in a copy (`… v2.dc.html`); it replaces the original on approval.

### Canonical shared components
Record the source file for each component as it is approved. Copy from the canonical file; never re-derive.
- Marketing header — **`Abby's Table - Homepage v2.dc.html`** (approved). Logo + 5 nav links (Menu / How it works / Abby's Story / Gifting / Private Table) + "Log in" + a **GET STARTED** pill. No search icon, no basket, no strapline, no promo strip. Sticky.
- Mobile drawer — **`Abby's Table - Homepage v2.dc.html`** (approved). **Always mounted**, closed
  with `display: none` so the burger's `aria-controls="at-drawer"` always resolves and the drawer
  stays out of the accessibility tree and tab order when shut; the slide-in replays on each open.
  Focus is taken in `open()` (the panel already exists), not in the ref callback. Wordmark + close, "Log in" (16.5px/600), hairline, the 5 links, full-width BUILD A BOX pill, hairline, social row.
- How it works band — **`Abby's Table - Homepage v2.dc.html`** (approved, mobile + desktop).
  Page section rather than shared component, but the looping-clip pattern and the step type scale
  set from it are canonical.
- Footer — **`Abby's Table - Homepage v2.dc.html`** (approved, mobile + desktop). 2px brass rule,
  green-deep ground, 1280 shell. Newsletter with consent line + privacy link, three link columns
  (collapsible accordions on mobile, all open from 1024), follow row with four icon links,
  @FromAbbysTable as plain text, wordmark, "Abby x", and a legal strip (© / Privacy Policy /
  Terms / Cookie preferences). The legal-strip label is **"Terms"**, not "Terms & Conditions" —
  the document itself is headed "Terms of Sale", which is the defined term used inside its clauses.
  Column heads are accordion **buttons on mobile and labels from 1024**: `role="heading"` with a
  level, `aria-expanded`/`aria-controls` removed, out of the tab order, and `_footToggle` inert.
  Set in JS from ONE `_footSemantics()` reading the footer container ref — never a per-element
  ref, and never two implementations in the same file. The original ARIA is captured in
  `data-` attributes first, because React only rewrites an attribute when its value changes, so it
  will not restore them on the way back to mobile. The column heads are accordion **buttons on mobile and
  labels from 1024** — at desktop they take `role="heading"`, drop `aria-expanded`/`aria-controls`
  and leave the tab order, and the toggle is inert. Set in JS because attributes cannot be swapped
  in CSS; one element, no duplicated markup. Centred on mobile, left-aligned desktop.
  No purchase-bar clearance spacer on this page — see the mobile bar section.
  **Consent-line "Privacy Policy" underline (approved + propagated 1 Oct 2026):** a continuous
  1px rule — `text-decoration-thickness: 1px; text-underline-offset: 3px;
  text-decoration-skip-ink: none`. The default skip-ink broke the line under the "y" descender.
  Applied to every page carrying the canonical footer (Homepage v2 is the source); copy it with
  the footer, never the old `text-underline-offset: 2px` version. All 18 affected `export/`
  snapshots regenerated the same day (homepage via the § 3n data-URI copy, now 5.3 MB because it
  carries the 800px JPEGs; Order Confirmation's three states from temporary copies with the
  `accountState` fallback set per state).
- Cookie consent manager — **`Abby's Table - Privacy Policy.dc.html`** (mobile + desktop approved).
  **Mounted once globally in production** — deliberately NOT propagated across the prototype
  (build-handoff.md § 3s contract, § 3t rationale). A second copy lives on Homepage v2 as the
  fixed-UI integration test only. First-visit banner (non-modal region, no dismiss — choosing is the only way past it)
  plus a modal preference panel opened from the banner, the Privacy section 7 button or the footer
  link, all three the same panel. Four categories matching Privacy section 7; Essential carries an
  "Always on" text mark, never a disabled switch. **Reject is exactly as easy as Accept** — same
  height, width and label weight, only the fill differs. Light cream ground with a 2px brass top
  rule. One storage key, `at-cookie-consent-v1`, read and written inside try/catch. **The consent
  layer outranks every other fixed element**: an unresolved banner suppresses the floating
  Sections/Top pair and the mobile purchase bar. Never invent provider names, cookie names,
  durations or extra categories — those are launch dependencies, and guessing them puts untrue
  statements in a legal notice.
- Consent trigger — **canonical anchor pattern on every page**: `<a href="…#cookies"
  data-consent-open>` in the footer legal strip, `<button data-consent-open>` for Privacy's
  in-page section 7 trigger (a link to the section it sits in is meaningless). `data-consent-open`
  is the only selector the manager binds — never the href, never the label. The manager binds ONE
  delegated listener as the last step of its own init, so if it never loads there is no listener
  and the anchor is just a link; it opens first and calls `preventDefault` only on success; it
  never intercepts modified or non-primary clicks; and it adds `aria-haspopup="dialog"` itself.
  A trigger with no fallback destination stays hidden until the manager is ready — **with its
  lead-in copy**, or hiding the control alone leaves a sentence promising something that is not
  there.
- **Consent outranks every other fixed element.** Unresolved banner or open panel suppresses the
  mobile purchase bar and the floating Sections/Top pair.
- **Fail-safe, stated as an outcome:** no JS, a manager that fails to initialise, or an unreadable
  or invalid stored state ⇒ essential processing only, including non-JS technologies. An invalid
  stored value is no choice, not consent.
- Menu page — **`Abby's Table - Menu Landing v3.dc.html`** (rebuilt mobile-first, **approved**). NOT "v2": that name was already taken by the pre-rebuild desktop-first
  page, which is superseded. Search + Filters + Sort keep the model the old page had — one bottom
  sheet on mobile, the same markup as an inline 4-column panel in the filter card from 1024 — and
  the grid uses the approved homepage dish card. **Every page in the project links to v3**: a link
  target is not a component, so repointing it is not gated on per-page review.
- Gifting page — **`Abby's Table - Gifting v2.dc.html`** (rebuilt mobile-first, **approved**). Two
  route cards (food box / gift card) in a full-bleed peeking carousel on mobile, a grid from 1024;
  gift-card order panel in three steps. Two named departures from the canonical chrome, both
  deliberate: **no mobile purchase bar** (a fixed "Build a Box" pushes one gifting route over the
  other, and both routes carry their own 52px CTA), and a terracotta 52px Build a Box in the
  Delivery & FAQs result panel. Arrival options are a **radiogroup**, not toggle buttons. The
  **"↑ Top" control is present on mobile** and, with no bar to clear, sits at the viewport-edge
  inset. Postage is a property of the arrival route (post **+£3.95**, email and food box free) and
  the CTA label follows it ("Buy gift card" / "Add to food box").
- Private Table page — **`Abby's Table - Private Table v2.dc.html`** (rebuilt mobile-first,
  **approved**). Every page in the project links to v2 — a link target is not a component, so
  repointing it was not gated on per-page review. Navy hero with a "Coming soon" mark, brass CTA + "from £1,500" + a "Find out more" text
  link, the credentials panel above the actions and the photograph sharing the text column's top and
  bottom edges. Then Who it's for (subgrid-aligned cards), What we offer (the Included band + two
  service cards), How it works (four steps, bulleted), and the waitlist form. **It is a WAITLIST, not
  a booking** — consultations are not open, so every CTA reads "Join the waitlist" and the
  confirmation promises no consultation or reply window. Named departures, all deliberate:
  **plain `--brass` on navy at 4.08:1** (below the 4.5:1 small-text minimum — taken so the page
  matches the homepage's navy band rather than introducing a second brass; `--brass-lift` passes at
  4.77:1, and the two pages must be revisited together, never one alone); a **peeking carousel** for
  the two service cards on mobile, grid from 640, with the shared subgrid rows held in BOTH
  compositions; **no "Support as your needs change" section** (the support copy sits inside each
  card instead); and the sticky bar is the **homepage purchase bar's treatment** — cream-2 band, 1px
  sand rule, 48px green-forest pill — with the left-hand price block dropped.
- Standards page — **`Abby's Table - Standards v2.dc.html`** (rebuilt mobile-first, **approved**).
  Every page in the project links to v2 — a link target is not a component, so repointing it was
  not gated on per-page review. Hero on `--sage`
  (the homepage's sanctioned "Our standards" ground — this page is that band expanded), a
  three-line h1 with hard `<br>`s that are art direction, four prohibition marks (glyph under a
  ring and a bar), then a centred "What goes in" chapter opener with an index of the five
  standards, then bands 01–05 alternating cream/blush, then the closing CTA on the hero's ground.
  The old page's jump-card index, per-standard eyebrows, mobile accordions, caption pills and the
  standalone nutrition + "From our kitchen" sections are gone (the last two absorbed into 04 and
  05). Numerals are How It Works v2's `.hw-num` device; the five band visuals are four photographs
  and — for 05 — the example dish panel itself, because the claim is transparency.
  **Named departures — approved for THIS PAGE ONLY.** The user granted them explicitly and
  scoped them: they do NOT override the existing standards, and they are not licence to repeat
  any of them elsewhere. Copying one to another page needs its own decision.
  ⬥ Band titles at `clamp(26px, 7.4vw, 34px)`, where the scale has nothing between section 48 and
  card 26 — the site scale is unchanged.
  ⬥ Index labels 20px on mobile, 22px from 1024.
  ⬥ 14px radius on the hero mark cards, against the 18/24 panel and media radii.
  ⬥ The footer's 2px brass divider used mid-page, under the chapter opener.
  ⬥ **A green-forest hero CTA** — the ladder still reserves terracotta for the header pill, the
  hero CTA and the drawer CTA everywhere else.
  ⬥ **Purchase-bar suppression from the closing CTA through the footer.** The site-wide named
  list stays Private Table + footer; this page adds its closing CTA because that band holds its
  own Build a Box. Behind the `barSuppressAtCta` prop.
  ⬥ Hero title, lede and CTA centred for the whole single-column layout, going left at 1024 when
  the hero splits.
  **Also unresolved:** the example dish's nutrition figures are inherited from the old page and
  have never been confirmed against a real recipe — the panel is labelled "Example dish
  information" for that reason.
  **Lesson worth carrying:** three separate bugs on this page were an inline `style` attribute
  silently outranking a class rule — a hero ground, a CTA's `display: inline-flex` (which also
  made `margin: auto` inert), and a lede's `margin: 14px auto 0` that kept it centred while its
  heading went left. When a class rule appears to do nothing, check the element's inline style
  first. A fourth was a later same-specificity `!important` rule winning on source order alone
  (`.st-fig` over `.st-hero-fig`), which is the modifier-vs-base-class trap this file already
  records twice.
- **Order in progress — `at-order-state.js`** (site-wide, loaded in every page's `<helmet>`).
  Once step 1 has been started, the marketing chrome stops selling and starts reporting: the
  header pill becomes **VIEW BOX in `--green-forest`** (terracotta stays reserved for *starting* a
  purchase), and the mobile purchase bar swaps "Minimum 6 dishes · From £158" for the box summary
  — disc icon, "6-dish box", the total, and a caps **VIEW BOX** with no arrow. Band colour, height
  and pill treatment are unchanged; only what the bar SAYS changes. Choose Box v2 publishes the
  label and total from `renderVals`, so the bar can never disagree with the page. **sessionStorage,
  key `at-order-v1`**, all access in try/catch — `localStorage` would leave a stale VIEW BOX
  promising a box that no longer exists. An unreadable or invalid value is *no order*, and every
  page keeps its normal selling chrome; the state only ever adds information. Re-applied by a
  MutationObserver (the component re-renders after the script runs), which disconnects while
  writing so it cannot see its own mutations.
- **Signed-in state — `at-account-state.js`** (site-wide, loaded in every live page's `<helmet>`
  next to `at-order-state.js`; Order Confirmation v2 loads it alone). **A signed-in customer sees
  "My Account" wherever a signed-out one sees "Log in"** — the header `.at-login` and the drawer's
  Log in link. Capitalised "My Account". The label AND the href change: signed in, the link goes to
  `Abby's Table - My Account.dc.html` (original href kept in `data-at-acct-href`, restored on sign-out). Set by a valid Log in page submit and by Checkout v2's in-checkout log in
  (`ATAccount.signIn()`); `ATAccount.signOut()` exists. **Sign out lives in the account area**
  (decided 1 Oct 2026) — never a loose header link. Built 4 Oct 2026: the last row of My Account's
  account menu. **localStorage, key
  `at-account-v1`** `{ v: 1, ts }`, 24h expiry, all access in try/catch — localStorage rather than
  sessionStorage because a real session spans every tab (legal pages open in new tabs). Unreadable,
  invalid or expired ⇒ signed out ⇒ "Log in": the state only ever changes a label. Re-applied by a
  MutationObserver (components re-render after the script). Checkout steps' own header carries no
  Log in link, so nothing changes there. **Prototype display flag only** — production decides
  signed-in from the server session and renders the label server-side; this is NOT identity and
  must never gate anything. Add the script to any page that goes live.
  **At checkout (Checkout v2 + Gift Card Checkout):** arriving already signed in hides the
  "Already have an account? Log in" offer and shows a sage line "You're signed in. Your saved
  details are filled in.", and prefills the email from the sign-in (prototype stores it in the
  flag; production fills from the session). Logging in on the page keeps the panel and its
  "Signed in." message for that visit. Signed-in state (`arrived`, `signedIn`) and the log-in panel
  (`loginExp`, `lgEmail`, `lgSaid`, `lgErr`) are read fresh on every load and are in Checkout v2's
  `AT_SNAP_SKIP` — never persisted in the order snapshot, so a resume cannot restore an expired or
  signed-out session or a stale "Signed in." panel. (The gift record saves named fields only, so it
  needs no skip.)
- **Document head standard (site-wide, every live page).** Every page's REAL `<head>` carries,
  in this order and before `support.js`: (1) FIRST, straight after `<meta charset>`, a
  dependency-free first-paint rule,
  `html, body { background-color: #F7F1E8; color-scheme: light; }` — the literal of `--cream`, on
  purpose, so it never waits for a token sheet; (2) the favicons and the five design-system
  stylesheets (fonts, colors, typography, spacing, styles); (3) `at-focus.css`; (3b) `<script src="at-logo.js">` on every page with a wordmark. Those links must
  NOT also appear in `<helmet>`: from there they were applied out of the raw template, torn down
  when the runtime consumed it, then re-added — a transparent document on every full load (~1s
  on Standards) and a ~160ms gap on back navigation. Page-specific `<style>` blocks stay in
  `<helmet>` (measured: mounted before the template is removed and never torn down, and nothing
  is rendered at the moment of removal). Do not fix flashes with fades, timeouts or overlays.
  Standards↔Step 2 return state is unchanged and must not depend on BFCache for correctness.
  **Verification — `_audit/head-check.html`.** Reads every page in `_audit/live-pages.json` as
  source and reports any that is missing the first-paint rule, is missing a shared stylesheet,
  still loads one only through `<helmet>`, or has a real-head + `<helmet>` duplicate. **A
  whole-page rewrite (`dc_write`, `write_file`, anything that regenerates the document) MUST be
  followed by running it** — those tools regenerate `<head>` and silently drop this block. Also
  run it in every final audit. Add a page to `live-pages.json` when it goes live. Never "fix" a
  failure with runtime JavaScript that injects the styles: they must exist before first paint.
  **Production:** the per-page head blocks are the PROTOTYPE implementation. The production build
  must own these rules in the global site shell/template, so no page can lose them on regeneration.
- **Focus standard (site-wide) — `at-focus.css`.** One shared stylesheet, linked in every live
  page's REAL `<head>`, before `support.js` — never in `<helmet>`. A helmet link is injected by the
  runtime after first render, so it is not render-blocking: that is what let the browser's blue
  outline flash on load. In `<head>` it is parser-inserted, blocks first paint and blocks the
  runtime script, so the rule exists before any script can move focus. Never re-declare it per page.
  Controls whose box-shadow is owned by an inline style take a solid brass OUTLINE instead
  (the inline value outranks any rule); the shared file handles that by attribute selector. Controls
  get ONE `:focus-visible` ring (the DS `--shadow-focus` brass ring + a transparent 2px outline so
  forced-colors still draws one), at zero specificity so a component may refine the shape.
  Elements with `tabindex="-1"` (focused by script only — skip targets, panel headings) get NO
  ring, which is what prevents the browser-default blue outline. Focus outlines are never removed
  globally. Dialog and panel titles are associated with their container by
  `aria-labelledby`; opening/closing an overlay moves focus in and restores it to the trigger.
  **Upstream:** this belongs in the design system itself; it lives at the project root only
  because the linked DS copy is read-only here. Move it there when the DS is next edited.
  **Initial focus by overlay type (shared rule, not a per-page choice):**
  ⬥ **Short action dialogs / confirmations** (change box size, box full, added): title via
  `aria-labelledby`; initial focus on the most appropriate CONTROL (the checked option, else the
  primary action). Never focus the title just to have it announced.
  ⬥ **Content-rich dialogs, drawers and sheets** (dish details, the help drawer's views, filter
  sheet, box sheet, order sheet, cookie preferences panel): focus MAY go to the visible heading or
  container with `tabindex="-1"` as a reading start; it shows no ring.
  ⬥ Always: restore focus to the opener on close; trap focus only in true modals (`aria-modal`);
  one shared `:focus-visible` ring for controls; never suppress control indicators globally.
  Audited 28 Sep 2026: the only short dialogs focusing a title were Add Dishes v2's three; fixed.
- **CTA label standard (site-wide, every page).** A **button CTA** — any filled or outlined pill
  — is ALL CAPS via `text-transform: uppercase`, `.12em` tracking, **no arrow**, in the checkout
  too ("ADD DISHES", "CONTINUE", "VIEW BOX", "ADD TO YOUR BOX"). The source text
  stays in sentence case; CSS does the casing, so screen readers don't spell it out. A **text-only
  CTA** that takes you somewhere keeps its sentence case and **ends in an arrow** (→, or a down
  arrow for an in-page jump), with the arrow `aria-hidden`. Exempt, not CTAs: in-place actions
  (Clear all, Add back, Try again, Change, Enter address manually, Show/Hide), the header nav, footer
  links, the "↑ Top"/"Sections" utilities, the consent buttons, and the Google/Apple provider
  buttons, which follow those brands' own label guidelines. The header pill keeps its own
  tighter tracking (.08–.1em). **Named exception: Choose Box v2's delivery-checker "Check"**
  stays sentence case — caps made that secondary band more dominant than the step's own CTA. Swept across all rebuilt pages; checkout steps 2–5 (Add Dishes,
  Extras, Checkout, Review) pick it up at their own review.
- Checkout step 1 — **`Abby's Table - Choose Box v2.dc.html`** (**approved**). Every page in the
  project links to v2.
  **Gift intent (user, 1 Oct 2026):** Gifting's "Build their box" links in with **`?gift=1`**. Step
  1 then shows a blush note above "Choose your box size" (gift glyph, "Sending this as a gift?" /
  "Choose their box and dishes first. At checkout you can send it to their address, hide prices and
  add a personalised greeting card (+£3).") — one markup at every width, hidden when a dish is
  carried. **Gift intent is a property of the ACTIVE ORDER RECORD** — `at-order-v1.giftIntent`
  (boolean), never a tab preference and never in a step snapshot (`^giftIntent$` is in
  AT_SNAP_SKIP on steps 1–2). Rules (fixed 1 Oct 2026, user):
  ⬥ URL signals apply ONCE per history entry (marked `history.state.atGiftSeen`), so Back/Forward
  can never re-apply them over a later choice; after that the record decides. Step 1: `?gift=1` ⇒
  gift; `?resume=1` ⇒ record; with an ACTIVE order any other entry is an edit ⇒ record; with no
  active order a plain entry is a fresh box, NOT a gift. Step 2: `?gift=1` ⇒ gift; `?size=` without it ⇒ not a gift; otherwise record. Before
  any record exists (empty box) the URL is the only carrier; the record is created with the value.
  ⬥ Checkout v2 reads only the record (`ckGiftRecord()`), and the record outranks its own s5
  snapshot. Gift on ⇒ "Is this box a gift?" open, **Hide prices ticked, £3 card UNTICKED**.
  Switching it off writes `giftIntent: false` (`ckGiftWrite`) and it stays off on return.
  ⬥ ~~Gifting's "Build their box" with an order in progress goes to **step 1 `?resume=1&gift=1`**:
  the SAME order, converted to a gift and opened for editing — never a parallel gift order.~~
  **Superseded 5 Oct 2026:** with a normal active box, "Build their box" first asks "You already
  have a box in progress." (USE MY CURRENT BOX AS A GIFT / KEEP MY CURRENT BOX) — see "Business
  rules — reconciled 5 Oct 2026". Still never a parallel gift order. The prototype has not been
  updated.
  **Step 1 never deletes an active order (user, 1 Oct 2026).** ~~ACTIVE ORDER = `at-order-v1` holds
  dishes~~ — **superseded 2 Oct 2026 by "ACTIVE BOX — one shared rule" below** (committed by ADD
  DISHES, or a genuinely carried dish; dishes are read from `snap.s2` first — step 2 owns them;
  Review's Change writes s2 too).
  Entry paths: **no active order** — plain (Get started / Build a box / Build your box / drawer /
  footer), `?postcode=`, `?gift=1`, `?dish=` ⇒ a fresh box as before. **Active order** — every
  entry, plain ones included, plus `?resume=1` (step 2's Back, VIEW BOX, Gifting) ⇒ an EDIT: the
  order is loaded untouched and opens on its current box size (unless step 1 was the step last
  written, when its own restored snapshot is newer). The rail reads "N dishes in your box" / "Your
  dishes are saved. You can change them on the next step.", the total carries an "Upgrades &amp;
  extras" row (the order's total minus its box price, estimated). Step 1 publishes nothing for
  an active order, and only ever clears ITS OWN empty record (no later-step snapshot).
  **Box size never goes below the dishes in the box:** choosing a smaller size holds it at the dish
  count and says "Your box has N dishes. To choose a smaller box, remove dishes on the next step."
  A carried dish (`?dish=`) joins an active order once (`&add=slug&q=n` to step 2, deduped by id;
  the box grows to fit); a dish already in the box is not a carried dish (no carry card).
  ADD DISHES on an active order ⇒ `Add Dishes v2 ?resume=1&size=N[&gift=1][&add=…]`. Step 2 applies
  size/add ONCE per history entry (`history.state.atEditSeen`), and a non-resume step-2 load with a
  record holding dishes resumes it — so Back/Forward onto an old `?size=6` entry, or a reload, can
  never empty or resize the box. **There is no "Start a new order" action yet** — the only explicit
  reset is removing the dishes on step 2; an active order therefore keeps its gift intent through
  plain entries. Building that action is an open decision.
  **ACTIVE BOX — one shared rule (user, 2 Oct 2026; supersedes "dishes = active"; reconfirmed 5 Oct 2026).** A valid
  `at-order-v1` record (label + total) is active when `boxCommitted === true` OR it genuinely holds
  a dish (`dishCount > 0`, read from s2 → s4 → s3 → s5, else a Step-1 carried dish). Canonical:
  `ATOrder.isActive` / `ATOrder.dishCount` in `at-order-state.js` (header, purchase bar, Gifting);
  mirrored verbatim as `atIsActive` / `atDishCount` in each checkout step's order block, because a
  step's state is built before the helmet script can be relied on.
  ⬥ **Commit point = Step 1's ADD DISHES** (default 6 included): creates/updates the record with
  `boxCommitted`, `boxSize`, `giftIntent`, `lastActivityAt`. Viewing or changing size on Step 1
  commits nothing — no record, GET STARTED stays.
  ⬥ Steps 2–5 always write the label/total (an empty box reads "12-dish box" at its box price),
  set `boxCommitted` + `boxSize`, and create a record only when a dish is in the box.
  ⬥ **Removing the last dish never deletes the order**: an active empty box keeps its size, VIEW
  BOX stays, and it resumes Step 2. Nothing in Steps 2–5 deletes the record; Step 1 clears only
  its own uncommitted record whose carried dish was removed.
  ⬥ A carried dish with nothing committed is active everywhere; Step 1 restores it from its own
  snapshot on ANY entry (a different `?dish=` replaces that uncommitted dish).
  ⬥ Payment success clears it: Order Confirmation v2 removes `at-order-v1`, `at-gift-box-v1` and
  `at-date-hold-v1` before first render (production: the server converts the draft exactly once).
  ⬥ **Production expiry (not built — the prototype is session-scoped):** empty active box 24 h of
  inactivity; populated box 7 days; delivery reservation a separate 15-minute hold (plus the 10-minute payment hold); payment
  success converts/clears; a future "Start a new order" may clear at once. No customer-facing
  expiry countdown. `lastActivityAt` is recorded on every write for that purpose.
  Harness `_audit/gift-flows.html` now covers these too (53 checks, all passing 2 Oct 2026).
  **Test harness:** `_audit/gift-flows.html` drives the real pages (iframe at 1100px) through the
  gift flows AND the active-order flows — Back from Checkout/Review/Extras/Add Dishes, resizing,
  held size, reload, plain and dish entry with an active order, conversion from Gifting (32 checks,
  all passing 1 Oct 2026). It saves and restores the tab's order records. Run it after any change to
  step 1, step 2, Checkout or Gifting.
  Gifting's copy now matches: the gift option is **at checkout**, not review, and the message is
  part of the **+£3 greeting card**. **ONE page serves both entry points**, not two files: the dish detail page
  links in with **`?dish=<slug>`** and the box starts with that dish in it; every "Build a Box",
  "Build your box" and "Get started" CTA links in with **no parameter** and the box starts empty.
  The chrome, the cards, the rail, the sheet and every price path are identical, so a copy would
  be two files to keep in step — the same reasoning as the gift-card checkout's `?route=`. A
  `preselectedDish` prop is the fallback for a direct load, and a slug the page does not model is
  ignored rather than trusted. **The carried dish is whichever dish the customer was viewing** —
  name, photograph and alt text all come from the `DISHES` map keyed by slug, never hard-coded to
  one dish, and the names are the menu's own strings so step 1 and the dish page cannot disagree.
  Adding a dish to that map is all that is needed for its page to carry into the box
  (`seafood-okra` → Royal Seafood Okra, `ata-dindin-lamb-shank` → Ata Dindin Lamb Shank).
  The image is assigned by **ref**, not in the template, so the bundler's runtime substitution
  still applies — and the ref is **idempotent** (it only writes `src` when the value differs),
  because an unconditional write re-triggers the load on every render.
  **Empty state:** "No dishes yet / You'll choose your dishes on the next step." whenever the box
  has no dish — on arrival with none, and after the carried dish is removed (the removal itself is
  the site Undo snackbar; there is no "Add back"). See the Undo standard for the Next up rule.
  The page's own design is deliberately **unchanged from the original** — the
  four box cards, the summary rail, the mobile list, the carry banner and the bottom sheet are all
  as they were. What changed: the **gift-checkout header** (wordmark + "Questions?", strapline
  gone) with the 5-step indicator moved into its own band beneath it; the **gift-checkout footer**;
  type brought to the floors (13px labels, 16px supporting copy, 14px tertiary); ink corrections
  (`--taupe`→`--brown`, brass-as-type→`--brass-ink`, terracotta-as-type→`--terracotta-ink`, with
  brass kept on icon strokes and the stepper ring); hover/press moved to colour shifts rather than
  lifts. The in-body "Step 1 of 5" eyebrow was removed — the band states it.
  **Bar suppression:** the fixed mobile bar is hidden once the footer crosses 75% of the viewport,
  the Dish Landing v2 pattern, because it was otherwise covering the legal strip and its consent
  trigger at full scroll. Driven by an **IntersectionObserver on the footer plus a capture-phase
  document scroll listener**, not window `scroll` alone — when an ancestor container does the
  scrolling (host preview, embedded frame) window `scroll` never fires and the bar sat over the
  footer at the end of the page.
  **Help drawer:** the gift-card checkout's, transplanted verbatim (see the Checkout-flow section);
  the page's own FAQ list feeds it, ordered so the four shown unqueried are the box-choosing
  questions. **"Back"** is a real browser back to whatever preceded step 1, with the Seafood Okra
  dish page as the href fallback for a direct load, a new tab or no JS.
  **Delivery checker:** three tiers — stacked and content-hugging on a phone, full-width with the
  stack centred from 640, label and field on one line from 768, the full single row with its
  divider from 1200. No "use my location" control on any of them.
  **Estimated-total note:** the dish page's disclosure pattern (hover opens, leaving closes,
  click pins, ×/Esc/outside-click dismiss), but **anchored right** — left-anchored it overflowed
  the 320px summary rail into a clipped viewport. A panel hanging off a narrow rail needs
  re-anchoring, not just copying, and it needs its own `box-sizing: border-box` because this page
  has no global reset.
  **Touch targets:** the quantity stepper, Remove, the estimated-total toggle, the sheet close and
  the "i" all keep their drawn sizes (28/29/26/24/18px) and take a 44px invisible `::before`
  target — the dish card's pattern, chosen so the preserved design is untouched.
  **Mobile bar:** the sticky summary button reads the box label, the total and **"View ⌃" as words
  plus the chevron** (`--brass-ink`, 16px) — a bare chevron did not say what it did. Matches the
  gift-card checkout's "View ⌃" wording. Bar height is the homepage purchase bar's 85px.
  **ADD DISHES always goes to step 2** (`Add Dishes v2.dc.html?size=N`) — never the menu page. The
  size travels in the URL because an empty box has no order record yet; step 2 reads `?size=`
  only when no carried dish is in the step 1 snapshot, and ignores values outside 6–99.
  **Updated:** the bar now reads **"View box ⌃"** and its CTA **ADD DISHES** (names the next step,
  not "Continue"); the box icon is dropped below 420px, because both longer labels need the room.
  Step 2 (Add Dishes v2): **"View box ⌃" + CONTINUE** on the mobile bar, and **CONTINUE →** (no
  "Next:") on the desktop rail and the box sheet — 85px bar at every phone width.
  **"Secure checkout" is reserved for step 4 (Review),** whose next step IS checkout. Steps 1–3
  carry no reassurance line inside the CTA, so their CTAs hold the 52px major-CTA height.
  **Carried dish on mobile** shows a saved state inside its card ("Your dish is saved." + "Keep the
  N-dish box or choose another size below." — the same live line as desktop's banner), sage tint + the green tick — a confirmation, never an alert), followed
  by a "Choose your box size" h2 heading the mobile list. The mobile vertical spacing above the
  box options was tightened so the first option shows sooner. Desktop's carried-dish banner was
  later rebuilt to the approved mockup (tick, bin, sage "Your dish is saved." panel) with a
  "Choose your box size" h2 above the four cards.
  **Your box rail = Add Dishes v2's architecture.** `.ad-rail-card` > header + `.ad-rail-body`
  (fixed `.ad-rail-status`, scrolling `.ad-rail-list`) + `.ad-rail-foot` (Estimated total row,
  CTA, delivery note). Height is measured from `--ck-h`; the short-screen fallback (list under
  120px ⇒ status + list scroll together) is the SHARED `at-rail.js` `atRailFit()`, loaded by both
  steps — never re-implement it per page. Step 1 passes one 24px clearance (no Top control);
  step 2 passes 88px then 24px. The in-list "Total" row was dropped (the footer row states it).
  **Desktop rail from 1024 on both steps** (was 861 here) — the mobile treatment now runs to 1023.
  **Open:** the progress band is `position: static`, so it scrolls away while the header sticks —
  a leftover, not yet a decision, and deliberately left alone: making it sticky costs mobile
  screen space, so it is a UX call rather than a defect. The Full Table upcharge reads **+£10**
  here and **+£5** on the dish page; both are holding text that changes before launch, but they
  must agree, and it has not been settled.
  **Cleanup pass (done):** a 63-line stylesheet block that had been duplicated verbatim was cut to
  one copy; the £105 estimated-total button, "Scroll for more" and the footer's short "Terms" link
  took 44px targets without changing their drawn size; the postcode input now spans its whole 48px
  pill instead of 42px; five supporting-copy sizes (15.5/15/14/13px) came to the 16px floor; 54
  dead classes, the logo-strap rules and the old drawer's state (`faqQuery`, `faqOpen`,
  `faqExpanded`, `emailOpen`, `emailSent`, `chatStarted`, `em`, `setField`, `emailValid`) were
  removed after tracing every reference.
  **Still off-standard — ARCHITECTURAL EXCEPTION, accepted. Do not "fix" it in passing:** the page
  keeps its **desktop-first cascade** (11 `max-width` blocks, 60 `!important`s). Migrating it to
  the mobile-first system was scoped and **declined**. The reason is in the measurement, not the
  media queries: the page carries **297 inline `style` attributes holding ~1,514 declarations**
  (128 colours, 118 font-sizes, 113 displays…), and an inline declaration outranks any class rule
  — so a mobile-first cascade written underneath it would be inert. The job is therefore a
  presentation-layer rewrite of the markup, not a media-query inversion, and most of the
  `!important`s exist to beat those inline styles rather than each other. Large diff across an
  approved design for no user-visible gain. Step 1 is the one page on the old architecture by
  intent; revisit only if a functional or visual issue forces it.
  **Regression harness:** `_audit/compare.html` (see `_audit/README.md`) diffs two copies of the
  page by measurement — real iframes at nine widths × seven states, layout-critical computed
  styles plus geometry, elements matched by structural path. Use it for ANY future change here.
  Noise floor is 0; three false-positive sources are handled inside it and must stay (wait for
  tokens to resolve, freeze transitions, read rects before styles).
- My Account — **`Abby's Table - My Account.dc.html`** (built 4 Oct 2026, **awaiting review**).
  Built from Log in's copy of the canonical chrome (header/drawer "My Account" `aria-current`).
  Sections are hash views (`#orders #points #gifts #addresses #details`, none = overview) so
  Back/Forward work; focus moves to the section h2 (`tabindex="-1"`). **Mobile:** the account
  menu (rows with live summaries) IS the overview; the header/drawer label follows the signed-in state (signed out ⇒ "Log in" + the signed-out panel); inside a section it is hidden and a "← Back to
  My Account" link shows. **From 1024:** permanent sticky sidebar + content, and a desktop-only
  overview panel (points, default address, recent orders) — hidden on mobile because the menu
  rows carry the same summaries. One nav element throughout. Hero: h1 "Hello, {first name}",
  box-in-progress strip from `ATOrder` (VIEW BOX → step 1 `?resume=1`), and the forest-green
  Next delivery card with a 4-step tracker (overview only). **Sign out** is the nav's last row:
  `ATAccount.signOut()` then Homepage v2. Prototype tweaks: `accountState`, `customer`,
  `privateTableWaitlist`. `at-account-state.js` now also points the Log in link at this page
  when signed in (original href kept in `data-at-acct-href`). **All figures are sample data.**
  **Open / production:** server redirects signed-out visitors to Log in with a return URL; Order
  again is built (see "Order again"); production rebuilds the basket server-side; no receipts/invoices or
  saved payment cards yet. **Order changes/cancellation: decided 5 Oct 2026 — no self-service; confirmed
  orders are read-only; My Account offers only "Need help with an order?" / CONTACT US** (see
  "Business rules"). The upcoming-order card's "Need to change this delivery? Contact us →" link is
  flagged for review against that rule (not changed). Points follow "Points rules"; delivery tracker states need the real
  fulfilment statuses.
- **Points rules — FINAL (user, 5 Oct 2026; supersedes the 4 Oct summary). Full text: "Business
  rules — reconciled 5 Oct 2026".** 2 points per £1 of eligible spend after discounts; 100 = £1;
  never expire; no minimum; redemption capped at 20% of an order. Earn: dishes, Signature upgrades,
  eligible extras, and a Gift Card PURCHASE (on the amount paid for its value). No earn:
  delivery/postage, the £3 greeting card, and the Gift-Card-funded part of an order when a card is
  redeemed. Points cannot normally be redeemed against Gift Card value. Added immediately after
  successful payment (no pending state); refunds reverse only the points attributable to the
  refunded eligible spend, redeemed points are restored, and a negative balance is allowed.
  **Stale on those pages, not yet changed:** Checkout v2 / Order Confirmation v2 sample figures
  still use 1 point per £1 and their pop-ups state no rate. Gift Card Checkout: account creation + points
  now DECIDED (5 Oct 2026, "Business rules") — build-stage requirement, prototype not yet updated.
  My Account → Points: blush balance card ("N points · Worth £X"), brass milestone line in £5 steps
  ("N points until your points are worth £15" — value, never a threshold: points are usable at any
  time, and the balance line says "Use any amount at checkout, up to 20% of an order."). The first
  visit after crossing a £5 mark replaces the bar with "✓ Your points are now worth £15" (Points
  section + overview card), once per mark: prototype record `at-points-seen-v1` in localStorage
  (try/catch; no record ⇒ recorded silently); `showMilestone` tweak forces it; production: server, "How points work" (3 ringed numerals), a box-size calculator
  (6 / 12 / 18 / Your own 6–99 typeable → points earned, their £ value, and how much of the balance
  that box could take — capped at 20%, which it says), history with + points · £ and a running
  balance. Overview card and menu row show the £ value too. Calculator uses the holding box prices.
- **Box size limits (user, 4 Oct 2026; reconfirmed 5 Oct 2026): 6 minimum, 99 maximum, any count in
  between.** Was 30. 6 / 12 / 18 remain the presets where the approved UI shows them.
  `CUSTOM_MAX` (Choose Box v2) and `MAX_SIZE` (steps 2–5) are the only places it lives; step 2's
  hand-off clamps read `MAX_SIZE`, never a literal. "Set your own" on step 1 and the Change box size
  dialog on steps 2–3 are now **typeable** as well as stepped (the stepper works in ones; 6 → 99
  is 93 taps): a 2-digit numeric field between − and +, committed on blur/Enter. An out-of-range
  entry is NOT committed — the field reverts and says "Choose between 6 and 99 dishes." (steps 2–3:
  7–99, because 6 is the 6-dish box). Draft + error live on the instance, never in a snapshot.
  Pricing is holding data; no "a bigger set box is cheaper" prompt (user: the set boxes already
  show their saving).
- **Order again (user, 4 Oct 2026).** My Account → past order → ORDER AGAIN opens a sheet (phone) /
  dialog (640+) with every dish of that order TICKED at its old quantity and portion: the whole box
  is one tap, specific dishes are an untick. Off-menu dishes show "No longer on the menu", disabled.
  Summary line is live: no box ⇒ "N dishes · N-dish box" (under 6: "· 6-dish box. You'll choose X
  more on the next step."); box in progress ⇒ "Adding N dishes to your S-dish box." + grow / spaces
  left / full; over 99 ⇒ "Boxes hold up to 99 dishes. Remove N to continue." (CTA stays pressable
  and moves focus to that line). The CTA reads ADD TO YOUR BOX only when a box is in progress, otherwise BUILD A BOX; rows show the portion only (no "N last time"). An UPCOMING order also offers ORDER AGAIN (Orders card, beside "Need to change this delivery? Contact us →", and Recent orders); its sheet adds "This starts a new box. Your {date} delivery won't change." so it never reads as editing that delivery. A real "add to this delivery" needs server-side kitchen cut-offs — not built. The overview's Recent orders rows carry the same ORDER AGAIN (every order, upcoming included), price under the details on the left. CTA ⇒ `Add Dishes v2 ?[resume=1&]reorder=slug.q.portion,…&fromd=6 August`.
  **Rules:** merges INTO the box in progress (never a second order); same dish + portion add
  quantities; box takes the EXACT count, never a jump to a set size, never shrinks, min 6; applied
  ONCE per history entry (`history.state.atReorderSeen`); gift intent untouched (record decides).
  **Food only** — no delivery date, gift details, card or codes carried; prices are today's.
  Step 2 confirms with the site Undo snackbar worded as an addition ("N dishes added from your 6
  August order"); Undo restores the pre-merge box, size included. `at-undo.js` gained optional
  `said` / `restored` / `text` overrides for that — removal wording is unchanged by default.
  Production: the server rebuilds the basket from the stored order and checks availability.
  **Harness:** `_audit/reorder-check.html` (11 checks, all passing 4 Oct 2026); gift-flows.html still
  53/53 and head-check 32/32 after the 99 + reorder changes.
- Log in page — **`Abby's Table - Log in.dc.html`** (rebuilt, **approved**). Centred card, inline
  password reveal, green-forest primary, outline providers. No create-account route yet — every
  rebuilt page's "Log in" points here.
- Page not found (404) — **`Abby's Table - Page Not Found.dc.html`** (built 1 Oct 2026 from the
  user's mockup, **awaiting review**). Built from Log in's copy of the canonical Homepage v2
  header, drawer, footer and purchase bar (no nav item is `aria-current`). One centred cream band:
  "Error 404" eyebrow (13px/.24em, `--brass-ink`), h1 "We couldn't find that page." on the Log in
  hero scale (`clamp(38px, 11.6vw, 56px)`), 18px lede, **GO TO HOMEPAGE** (52px green-forest, full
  width on a phone, intrinsic from 640) and "View the menu →" (site text-CTA) to Menu Landing v3.
  **Departures from the mockup, by instruction:** the leaf pattern is removed (the brand has no
  textures or patterns); the primary's arrow is dropped (CTA label standard); the mockup's footer
  is replaced by the canonical one. `<meta name="robots" content="noindex">`; production must
  serve it with an HTTP 404 status, never a 200.
- Something went wrong (500) — **`Abby's Table - Something Went Wrong.dc.html`** (built 1 Oct
  2026 from the user's mockup, **awaiting review**). **Reduced chrome by decision (user, option 2,
  1 Oct 2026)** — the page is served as a static file when the application has failed, so it
  carries only what is true and works then. Header: wordmark (links home) + "Contact us" with a
  brass-ink envelope icon (the payment header's "Questions?" pattern: 20px, 1.7 stroke, 7px gap),
  an in-page jump to the direct-contact panel. Footer: **the simplified footer with social links**
  (user, 1 Oct 2026, chosen over the standard checkout footer): 2px brass rule, green-deep,
  wordmark, Delivery &amp; FAQs / Contact us / Privacy Policy / Terms, the four social icons, © and
  "Abby x" — no Allergens, no Cookie preferences (no consent manager runs on this page and it sets
  no non-essential cookies).
  **Removed:** nav, drawer, Log in / My Account, GET STARTED / VIEW BOX, mobile purchase bar,
  newsletter, `at-order-state.js`, `at-account-state.js`, and all page JS.
  Body: a 72px `--blush` status disc with a 1.5px `--brass-ink` triangle, `aria-hidden` (the brand
  is near-iconless; the mark is scoped to error/status pages); "Error 500"; h1 "Something didn't go
  to plan."; lede; **TRY AGAIN** (52px green-forest, `href=""` reloads with no JS); **"Back to
  homepage →"** (user — not the mockup's "Back to Abby's Table"); then **"Need help with an
  order?"** panel with the Contact page's own email and phone as mailto/tel links — the one route
  that works in a full outage. `noindex`; production serves it pre-rendered with HTTP 500.
  The mockup's expired-link state is not built.
- We'll be back shortly (maintenance, 503) — **`Abby's Table - Back Shortly.dc.html`** (built 1 Oct
  2026 from the user's mockup, **awaiting review**). Something Went Wrong's page, **stricter**: the
  whole site is down on purpose, so nothing links into it — header and footer wordmarks are not
  links, and the footer is wordmark + the four social links (where status updates go) + © + "Abby
  x", no site links (my call, delegated by the user). Header "Contact us" + envelope jumps to the
  direct-contact panel. Body: blush disc with a 1.5px `--brass-ink` gear, "Temporarily
  unavailable", h1 "We'll be back shortly.", the mockup's lede, **TRY AGAIN** (kept, user), then the
  "Need help with an order?" email/phone panel. **By decision (user, 1 Oct 2026):** generic — no
  return time; no "your box is saved" line; the mockup's "Back to Abby's Table" link is dropped
  (it would only show this page again). Phone band hugs its content; min-height from 1024 only.
  `noindex`; production serves it pre-rendered with **HTTP 503 + Retry-After**, never 200.
- Link no longer valid — **`Abby's Table - Link Expired.dc.html`** (built 1 Oct 2026 from the
  user's mockup, **awaiting review**; decisions delegated to me on industry practice). Page Not
  Found's full chrome (the site is working when this shows) and band, plus the error-page status
  mark (blush disc, 1.5px `--brass-ink` link glyph). Eyebrow "Secure link", h1 "This link is no
  longer valid.", lede "For your security, this link has expired or has already been used."
  **ONE generic page for every emailed secure link** — account set-up after checkout now, password
  reset when it exists; the server knows the token type. **One message for expired and used.**
  **SEND A NEW LINK** (52px green-forest) is a real POST form — no email field: the server resolves
  the account from the expired token. On send the button is replaced in place by a **sage
  confirmation** ("Check your email" + "If this link belongs to an account, we've sent a new one…"),
  `role="status"`, focus moved to it (tabindex -1). It never confirms an address or that an account
  exists. Text CTA **"Log in →"** (not the mockup's "Back to Abby's Table": a used link usually
  means the password is already set). `previewState` prop shows the sent state. Production: HTTP
  410, `noindex`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`; a new link invalidates
  the old; resends rate-limited.
- Dish detail page — **`Abby's Table - Dish Landing v2.dc.html`** (rebuilt mobile-first, **approved**).
  **"Add to your box" carries this dish into step 1** (`?dish=<slug>`) — it was a no-op until now.
  The back link reads **"Back"**, the site standard, not "Back to menu".
  Every page in the project links to v2 — a link target is not a component, so repointing it was
  not gated on per-page review. A **Signature variant** is built as its own page
  (`Abby's Table - Dish Landing Signature v2.dc.html`, **approved**), inheriting this page's chrome,
  portion card and named departures — the old `Dish Landing (Signature)` file is superseded. Copied
  from the desktop-first original rather than rewritten, so the runtime image assignment and the
  accordion machinery survived; the chrome, the stylesheet and the layout around them were
  replaced. Announcement bar and 1440 shell gone; canonical header, drawer and footer on the 1280
  shell. Photograph then info column on a phone, two columns from 1024 with the related dishes
  under the photograph in the left column. Info column order: tag pills, h1, components line,
  description, heat row, "Flavour built properly.", portion card, 54px Add to your box, meta list,
  three accordions (Nutrition / Ingredients & allergens / Heating & storage, open on load).
  **Removed:** the whole personalise state machine (protein, side, heat, the Yes/No step, the
  options sheet and the live price box) — the mockup replaced it with the portion card, and the
  dead CSS and logic went with it; the blush "where the flavour comes from" band; the jump-link
  row; the three nested back-to-top spans.
  **Naming follows the menu's records** — Royal Seafood Okra, its components line and its
  description are the menu's own strings, as are all four related dish names, so the two pages
  cannot disagree about what a dish is called.
  **Named departures — approved for THIS PAGE AND THE SIGNATURE VARIANT ONLY.** The user scoped
  them explicitly: they do NOT replace the standard anywhere else, and copying one to another
  page needs its own decision.
  ⬥ Related-card names at 18px, below the 22px card tier, for the smaller desktop column.
  ⬥ Related-card name **truncation with a hover tooltip**, gated on measured overflow and
  pointer-only, so touch wraps in full.
  ⬥ Accordion titles at 26px desktop.
  ⬥ The sticky bar carrying a **dish CTA rather than "Build a Box"**, using the homepage
  purchase-bar treatment (cream-2 band, 1px sand rule, 48px green-forest pill).
  ⬥ A desktop **focus-order mismatch** — the related cards follow the buy panel in the DOM but
  appear halfway up the left column. Inherent to putting interactive cards beside a tall
  interactive column.
  **Personalisation is removed for good** — protein, side, heat, the Yes/No step, the options
  sheet and the live price box are not coming back. The portion card is the only dish-level
  choice. Do not reintroduce them on the Signature variant either.
  **The nutrition figures are holding text**, to be replaced with confirmed values before launch.
  They drive the portion card's macro strip as well as the Nutrition panel.
  **Delivery note copy is settled:** "We take a limited number of orders for each cooking run, so
  we can give every dish the care it deserves. The date shown is our next available run.
  **Availability can change if a run fills before you complete checkout.**" \u2014 the last sentence
  is set bold, and it is the caveat that replaced the dropped postcode/box-builder line. Five
  instances across four pages (Menu Landing v3, both dish pages, Choose Box v2 \u00d7 2); they must
  stay identical. Checkout v2 carries its own date-booking note instead.
  **Delivery note pattern:** the "?" disclosure opens on hover AND on click — hover-opened it
  closes when the pointer leaves the LINE (not the trigger, or it shuts before you can reach it),
  click-opened it is pinned and only the ×, Esc or a click outside dismisses it. `onFocus` and
  `onBlur` mirror the pointer pair. Applied to Menu Landing v3 as well, delivery note only: the
  filter sheet's style note stays click-only, because hover-to-open fires while scrolling a sheet.
- Gift-card checkout — **`Abby's Table - Gift Card Checkout.dc.html`** (rebuilt mobile-first).
  ~~**No account creation and no points panel — decided (user, 1 Oct 2026), not an omission.**~~
  **Superseded 5 Oct 2026:** a signed-out buyer gets the same optional account creation after
  payment as food-box Checkout, to collect the points from the purchase (2 per £1 of card value
  paid; postage and the £3 card do not earn; no second earn on redemption). Full rule: "Business
  rules — Gift Card Checkout — account + points". **Build-stage requirement** using Checkout v2's
  create-after-payment pattern; the approved design stays the visual reference. **The prototype is
  visually stale on this point** — it still shows "Already have an account? Log in" only and no
  points panel. (History: the 1 Oct decision rested on the then-open earn-on-purchase-or-spend
  question, now settled.)
  **One page serves both arrival routes**, chosen by `?route=email|post` from the Gifting link with
  a `route` prop as the fallback — not two files: the chrome, order panel, sticky band, help drawer
  and every validation path are identical, and a copy would be two files to keep in step. The post
  route swaps the recipient email for a UK delivery address (line 1, line 2 optional, town, county
  optional, postcode — **no country field**, since delivery is UK-only), renames the date a
  **posting** date, adds a **Postage +£3.95** row, and prices the message as a **greeting card
  +£3** because the card is what carries it. Postcode validation is deliberately loose (real UK
  grammar has too many exceptions to reject on) and the value is uppercased as it is typed.
  Source file for every checkout convention in the Checkout flow section below.
- **Undo — reversible removal standard (site-wide).** Shared module **`at-undo.js`** (`ATUndo`);
  never re-implement it per page. Remove takes the item out at once and every dependent value
  (count, progress, totals, summary, sticky bar) updates immediately, and the list shows its
  normal state (e.g. "No dishes yet") straight away. The confirmation is an **OVERLAY, never in
  flow**, so nothing moves when it expires: a fixed snackbar (`.at-undo-fix`, above the 85px
  mobile bar, 24px from the bottom at desktop) for page-level removals, and inside a
  `[data-undo-scope]` (rail / sheet) a snackbar anchored over the list just above that
  container's footer (a zero-height anchor, or a sticky zero-height one where the sheet itself
  scrolls). Treatment: sage-tinted 12px panel, soft shadow, green-forest tick disc,
  "<Item> removed", **Undo** (600, brass-ink underline, 44px target). The label is always
  **"Undo"** — never Add back / Put it back. Undo restores the item exactly (portion, quantity,
  upgrades, position in the list). 8s timeout, paused while hovered or focused; one pending undo
  per page (a new removal confirms the last; adding a dish on step 2 confirms a pending dish
  removal so the box cannot overfill). No explanatory removal copy.
  **Exception — complex configured items:** after Undo expires, a quieter **"Restore gift card"**
  text action stays in the empty state for the rest of the page/session and restores the
  configuration exactly (Gift Card Checkout). It survives a reload: the checkout keeps its own
  `at-gift-checkout-v1` record, flagged `removed: true` — NOT an order item (totals, contents,
  payment and Gifting's resume banner all ignore it). Cleared on payment, on any same-tab link out
  of the checkout, when Gifting starts a replacement gift, or at session/24h expiry.
  Simple dish/extra removals are Undo-only. Focus moves Remove → Undo → the restored
  item's Remove (`data-undo-btn` / `data-rm="<key>"`, matched in the same rail/sheet/panel); a
  polite live region announces "X removed. Undo available." / "X restored." Stepping a quantity
  down from 1 is a removal and takes the same Undo. Applied: Choose Box v2, Add Dishes v2, Gift
  Card Checkout. **Extras and Review are deliberately untouched** — their old toast removals stay
  until those steps are reviewed/rebuilt, when they adopt this standard via `at-undo.js`; do not
  retrofit them in passing.
  **Step 1 "Next up" and "No dishes yet" never show together.** Arriving with no dish ⇒ "No
  dishes yet" only. Arriving from a dish page ⇒ the dish + "Next up" ("Choose your dishes from
  the menu on the next step.") only, for as long as the dish stays. Removing it ⇒ Next up goes and
  "No dishes yet" replaces it (Undo brings both the dish and Next up back). Not for permanent actions
  (account or saved-data deletion) — those keep a confirmation step.
- Checkout step 2 — **`Abby's Table - Add Dishes v2.dc.html`** (rebuilt, **approved**). Every page in
  the project links to v2 (step 1's ADD DISHES, Gifting's resume, Extras' and Review's "Change"
  links) — a link target is not a component, so repointing it was not gated on per-page review.
  The old `Add Dishes.dc.html` is superseded. Menu Landing v3's search / Filters / Sort and dish card, plus two
  portion rows (Light Table / Full Table) with Add or a − n + stepper per row. The card's upper
  region (photo, badges, name, components line, View details →) is ONE details trigger: the View
  details button's `::after` covers it, one keyboard stop, name "View details for <dish>"; the
  portion rows sit outside it. **Signature cards (30 Sep 2026):** the WHOLE navy SIGNATURE ⓘ pill
  is one button, "About Signature dishes" (`aria-expanded` / `aria-controls` → its note), a SIBLING
  of the details trigger, never inside it: the badge overlay comes first in the card DOM (so
  Signature is the card's first tab stop, as it is first on screen), sits at `z-index: 2` above the
  trigger's `::after`, and stays `pointer-events: none` except on that button — so every other
  badge, "+£4 UPGRADE" included, still opens details. Drawn size unchanged; 44px-tall target by
  `::before`; focus is the shared at-focus.css outline. The drawn "i" is an `aria-hidden` span the
  note's caret still points at. Ordinary cards keep the single trigger. Dish-details dialog: nutrition first with its own Light/Full
  switch (follows the chosen portion, resets when it changes), portion switch, Add to your box,
  then ingredients / allergens / heating, all open; "You might also like" after heating on
  mobile, under the image on desktop. "See our standards" is the Standards round trip
  (`at-std-return-v1` + `?qv=1`): back returns to the same dish, portion and scroll, rebuilt from
  the record if the page is not restored from BFCache. Your box: `at-rail.js` architecture
  (88px then 24px clearance for the ↑ Top pill), "Change box size" in the header. CTA **CONTINUE →**
  (rail + sheet), **CONTINUE** on the 85px mobile bar; disabled until the box is full, with the
  inline terracotta "Add N more dishes to continue." beside it. Adding past the size opens "Your
  N-dish box is full". Short dialogs focus a control, the dish dialog its heading (focus
  standard). Removal = the site Undo; the "…added" toast is cleared when an Undo starts so the
  two never stack. Stepping 1 → 0 is a removal.
  **Open on this page:** nutrition figures are holding text; no `export/` copy exists yet.
- Checkout step 3 — **`Abby's Table - Extras v2.dc.html`** (built from Add Dishes v2; **approved**
  30 Sep 2026). The old `Extras.dc.html` is superseded. Every page links to v2: step 2's CONTINUE
  (rail, sheet and bar), Review's "Change" for extras (`?resume=1`, so the extras chosen are
  restored from the step 3 snapshot) and the VIEW BOX resume href, which step 3 writes itself. Back
  and Edit dishes go to step 2 (`?resume=1`); REVIEW and "No extras? Skip" go to Review. Same chrome,
  Your box architecture, Undo, focus and head standards as step 2.
  **Title:** h1 **"Extras"** (matches the stepper label) followed on the SAME line, to its right, by
  an **"Optional"** eyebrow (13px/600, .24em caps, `--brass-ink`); wraps beneath on a narrow line.
  Lede: "Add sides, snacks, drinks and sauces to your box, or skip straight to review." Desktop
  stepper shows "Optional" (13px `--brass-ink`) under Extras; the mobile stepper does not.
  **Browse:** search, single-select category pills with counts, Sort (Recommended / price low→high /
  high→low). Below 1024: search, then a scrolling pill row that starts on the gutter and bleeds to
  the screen edge (end padding returns the last pill), then count + sort. From 1024: search + sort
  on one line, pills wrap beneath. No tool card, no Filters sheet (one facet only).
  **Card:** the step 2 card with ONE row. Simple extra: price + ADD / − n +. Extra with options:
  "From £x" + "2 sizes" / "Choose heat" + **CHOOSE** (Fried Plantain and Zobo Cooler sizes are
  **Light Table · 225g / Full Table · 450g** and **Light Table · 330ml / Full Table · 500ml** —
  holding values; Chin Chin keeps Regular / Sharing bag, Puff Puff 6 / 12 pieces), which opens the **option picker** (short
  action dialog: thumbnail + name, "Choose a size" list with prices or "Choose your heat" Mild /
  Medium / Hot in one row, ADD TO YOUR BOX · £x; focus on the checked option). The button reads
  **CHOOSE SIZE** / **CHOOSE HEAT**; the row "From £x · N sizes" (or "N heat levels").
  **Several options of one extra (30 Sep 2026, from the user's mockup):** once any option is in the
  box the card lists ONLY the chosen options, one compact row each (label, unit price, − n +),
  in the item's own option order, then **"+ Add another size"** (an in-place action: sentence case,
  no arrow) while any option is left. It opens the same picker preset to the first unchosen option;
  options already in the box read "In your box: n" under their label, and choosing one adds 1 to it.
  After adding, focus goes to that row's "+". Each option is its own line (id + portion), so each
  keeps its own quantity, Undo and `data-rm` focus key; a row's "−" at 1 is its removal. The old
  single-option "· Change" (swap the option, merge quantities) is gone from the card.
  **Review mirrors it:** extras are grouped by item — image + name once, then a row per chosen
  option (label, line total, "· £x each" when qty > 1, stepper). The row's "−" at 1 shows a bin
  and is "Remove <item>, <option>" with the site Undo; the separate Remove button is gone.
  Layout: phone = 44px thumbnail beside the name, option rows at full card width beneath; from 640
  = 72px image with the name AND rows beside it (no empty band under the name). Option labels break
  only at " · ". Option rows are React-keyed by option (`key`), and the groups by item — unkeyed,
  removing one size left focus on the NEXT size's "−" (Undo never took focus; Enter again removed it).
  **Details dialog = step 2's structure:** tag, name, description, heat row (Heat-option extras only,
  follows the chosen heat), "Flavour built properly." + See our standards, option tiles, ADD TO YOUR
  BOX · £x, Nutrition (size switch where sizes exist; follows the chosen size), Ingredients &
  allergens, Heating & storage, **You might also like** (4 extras, same category first).
  **Standards round trip** as step 2: `at-std-return-v1` + `?qv=1`, Standards reads
  `?from=step3` ("Back to <extra>") and returns to the same extra, option and scroll.
  **Your box:** the dishes collapse into ONE compact card at the top of the list (sand strip
  "6-dish box" — plus Edit dishes in the mobile sheet — then a toggle row: green tick, "Your 6
  dishes", "Complete" in `--brass-ink`, chevron → expands the dish list). The old status block
  and Dishes section are gone. Then **Extras (n)** with steppers and Undo; an "Extras (n)" row in
  the estimated total. CTA **REVIEW →** (rail + sheet), **REVIEW** on the bar; never blocks.
  "No extras? Skip →" under the lede while no extra is added. Mobile sheet: labelled by its own
  heading, which takes focus on open (the rail's is hidden below 1024), Tab contained, 44px close.
  **Entry gate:** needs a FULL box; short records `location.replace` to step 2; no order at all
  shows a sample full box behind the `demoBox` prop — production must redirect instead.
  **Holding content, never invented:** extras nutrition figures are EXAMPLES ("confirmed before
  launch"); ingredients/allergens and heating/storage say "being confirmed"; extras photography is
  placeholder (one dish photo); the 13 records and options are carried from the old page unverified.
  **Known, not changed (inherited from step 2):** card category tags at 12px (menu card); "REVIEW →"
  arrow on a filled CTA (same as step 2's approved "CONTINUE →").
  **Probably also on step 2 (approved, untouched):** the sheet-focus and card-Undo-focus bugs fixed
  here share step 2's code — offered to the user, not applied.
  **Open:** Review (step 4) still reads extras from its own records, not from step 3's snapshot —
  to be wired when step 4 is rebuilt. No `export/` copy of Extras v2 yet.
- **↑ Top control — canonical `.mn-top` `<button>` (Menu Landing v3).** Every page's Top is that
  button. Private Table v2's was an `<a href="#pt-top">` with its own caps styling; replaced
  30 Sep 2026 with the canonical markup, CSS and `goTop` verbatim (the page now publishes its bar
  height as `--at-bar-h`, the name the canonical rule reads; hidden from 1024 as before).
- **Base link rule on every live page:** `a { color: var(--green-forest); }` +
  `a:hover { color: var(--terracotta-deep); }`. Added to Add Dishes v2 and Extras v2 (the only two
  without it). No `:visited` styles exist anywhere; do NOT add a global `a:visited` reset.
- **Open — touch "sticky hover" (investigated 30 Sep 2026, not yet approved):** most control
  `:hover` rules are unguarded, so on touch the hover colour sticks after a tap (Top, the mobile
  bar's VIEW BOX, etc.) — this, not `:visited`, is what reads as "changed colour after a click".
  Proposed standard, awaiting approval: control hover styles only inside `@media (hover: hover)`,
  touch feedback via `:active`, `:focus-visible` untouched; applied by a measured sweep.
- Checkout step 4 — **`Abby's Table - Review v2.dc.html`** (built from Extras v2; **approved**
  30 Sep 2026). The old `Review.dc.html` is superseded. Every page links to v2: Extras v2's REVIEW / RETURN TO
  REVIEW / "No extras? Skip", Add Dishes v2's review-edit return, Checkout's back link, `at-return.js`,
  and the VIEW BOX resume href (step 4 writes it itself); `_audit/live-pages.json` lists v2. Its
  export is `export/Abby's Table - Review v2 (standalone).html` — all three dish photographs are
  declared as `ext-resource-dependency` (fish, goat, lamb) because they are assigned by ref.
  Personalisation (and its "Edit personalisation" modal) is gone for good. Main column: h1 "Review
  your order", then cards — **Your dishes** (read-only: portion, qty, Signature, Full Table
  upcharge; "Change" → step 2 in the review-edit context, see below), **Extras** (grouped by item, a
  row per chosen size/heat with its own stepper — see "Review mirrors it" under step 3; "Change" →
  step 3 in the same context; empty ⇒ "No extras added." + "Add extras →"), **Gift** (when one
  is in the box; Edit / stepper / Remove). Rail = **Order summary**, totals only (same `at-rail.js`
  architecture), CTA **CHECKOUT →** carrying the **Secure checkout** line beneath (arrow kept by the
  user's decision, matching steps 2–3's CONTINUE →); the row reads **"Total"**, not "Estimated
  total", with no pricing "i" note. Dish lines always show quantity and weight ("1 × Light Table ·
  225g"); extras lines show the LINE total (qty × unit), like the dish lines. Mobile bar
  "View box ⌃" + CHECKOUT, the Your box sheet as on step 3 (its "Edit dishes" uses the review-edit
  context). **Below 1024 the Order summary sits in flow after the Extras/Gift cards** — the same
  `.at-summary-col` markup as the desktop rail (DOM order already put it there, so nothing is
  reordered or duplicated), static and uncapped; sticky + height-capped only from 1024. Its title is
  an h2. **One CHECKOUT at a time:** the mobile bar hides while that card is on screen (measured on
  scroll/resize, `ctaNear`), and returns when it scrolls away — the Standards v2 closing-CTA idea,
  scoped to this page. **Open on this page:** the box-panel lists (desktop rail on steps 2–3 and
  the View box sheet here) still list one line per option, not grouped by item like the Review
  card; `export/Extras v2 (standalone).html` predates the multi-option card and needs regenerating
  (its lamb photograph is not declared either — same fix as Review v2). **Phone checks:**
  `_audit/review-phones.html?page=<file>` loads any page at 320 / 375 / 430 side by side (the
  screenshot tool cannot see into iframes, so measure through `contentDocument`). **Phone line layout:** the card header is title + Change on one row with the
  box size beneath (one flex row from 640); a dish line stacks name / meta / Full Table upcharge in
  the full text width (price column from 640), and the meta breaks only at its " · " separators; extras
  groups follow the step 3 "Review mirrors it" layout (44px thumbnail + rows beneath on a phone).
  **Mobile bar vs footer:** hidden once the footer's top is above 75% of the viewport, MEASURED
  (`getBoundingClientRect`) on an IntersectionObserver with fine thresholds + a capture-phase scroll
  listener — `rootMargin` is ignored in a framed preview, so the bar vanished at the first pixel of
  footer. **Applied to Add Dishes v2 and Extras v2** (30 Sep 2026), which
  had read `isIntersecting` under the rootMargin. Choose Box v2 never had the defect: its observer
  only TRIGGERS a measured `_updateFootNear` (same 75% test) plus a capture-phase scroll listener —
  it is where the Dish Landing v2 pattern was recorded, so it was left untouched. Starts from its own `snap.s4`, else step
  3's `snap.s3`, else step 2's; a short box goes back to step 2.
- **Contextual edit return — `at-return.js` (`ATReturn`).** Review → "Change" (dishes) opens step 2
  as `Add Dishes v2.dc.html?resume=1&return=review`. The context is **explicit in the URL** and
  nowhere else — never in state, so never in the `s2` snapshot — which is why VIEW BOX, step 1 →
  step 2 and Extras' "Edit dishes" can never inherit it, while refresh and the Standards round trip
  keep it. In that context only: "‹ Back to review" (href Review v2) and **RETURN TO REVIEW** replace
  "‹ Back" and CONTINUE on the rail and sheet, and **REVIEW** on the 85px mobile bar (matches Extras' REVIEW); both obey step 2's own box-completion rule (the same
  "Add N more dishes" guidance; phone opens the box sheet). No Save step: step 2 already commits
  every change to `at-order-v1` as it is made. `ATReturn.go()` uses `history.back()` when the
  previous entry is Review (no Review → Step 2 → Review loop is pushed), else `location.replace`
  with `?edited=dishes`. Review re-reads the order on a bfcache `pageshow`, takes its dishes from
  whichever step wrote last, keeps extras untouched, and returns focus to the Your dishes heading
  (`tabindex="-1"`, no ring), scrolling only if it is off screen. A short box reaching Review goes
  back to step 2 **in** the review context. Extras' "Change" / "Add extras →" use the same contract (`?resume=1&return=review`, section
  `extras`): step 3 shows "‹ Back to review", RETURN TO REVIEW on rail and sheet, REVIEW on the bar,
  hides "No extras? Skip", and Review returns focus to the Extras heading. Extras are optional, so
  step 3's return is never blocked.
- Checkout step 5 — **`Abby's Table - Checkout v2.dc.html`** (built from Review v2; **approved 1 Oct 2026**). The old desktop-first `Checkout.dc.html` is superseded; Review v2's CHECKOUT and
  `_audit/live-pages.json` point to v2. An UPDATE of the old design to the standards, not a new
  flow: same sections — Contact, delivery address, Book your delivery (own calendar + two time
  windows + notes), gift/voucher codes, terms line — on the approved checkout chrome (header,
  stepper at 5 of 5, help drawer with checkout FAQs, footer, 85px bar, in-flow summary below 1024,
  one CTA on screen at a time). The rail/summary reads the REAL order from `snap.s4` (Review) — the
  old page's hard-coded rows, including Personalisation, are gone — and adds the delivery row
  ("Delivery · Thu 6 Aug, 7am – 6pm", £10 struck → Free; 7am – 12pm +£4.95 goes into the total). The two windows are labelled by time only — "7am – 6pm" (free) and "7am – 12pm" (+£4.95) — no name or sub-line.
  **Fixed on the way:** marketing opt-in was pre-ticked (now unticked — a pre-ticked box is not
  consent); the address had two Postcode fields (now line 1, line 2 optional, town, postcode, all
  with `autocomplete` tokens); calendar days were unlabeled buttons with fake month arrows and an
  8px "Full" caption (now labelled buttons — "Thursday 6 August, available" — disabled when not
  deliverable, fully booked shown by tint + legend, no tiny text); windows are a radiogroup with
  arrow keys; the code result is an inline status, not a toast; type raised to the floors.
  **Validation:** email, names, line 1, town, postcode (permissive, normalised as typed), phone.
  Errors show after a field is left or on CONTINUE TO PAYMENT, which then scrolls the first
  failing field's label under the sticky header and focuses it; the rail/sheet say "Complete N
  details to continue." Valid ⇒ "Taking you to secure payment…" (the Stripe hand-off is out of
  scope). **Named departure:** calendar cells are 44px tall but only ~33–40px wide on phones
  (seven columns in 272–311px). **Open:** calendar and window prices are holding data (August 2026
  only); no `export/` copy.
  **Carried over from Gift Card Checkout (30 Sep 2026)** — everything not specific to gifts, copied
  rather than re-derived: the ringed section numerals (1 Your details · 2 Where should we send your
  box? · 3 Book your delivery · 4 Gift cards, rewards and vouchers); the **log-in block** inside
  section 1 (one-button row "Already have an account? / Log in for faster checkout", always-mounted
  panel, email + password with Show/Hide, LOG IN + Forgot your password?, "or", Continue with Google /
  Apple; logging in fills the checkout email; the password is `lgPass` so AT_SNAP_SKIP keeps it out
  of the resume snapshot); the **address lookup** (combobox with listbox, arrow/Home/End/Enter/Esc/
  Tab, flips up when there is no room above the 85px bar; picking replaces the field with the
  confirmed block + Change; "Enter address manually" / "Search for an address instead", values kept
  across every switch); and the **eligibility** line ("We deliver to this address" / "We don't
  currently deliver to this postcode."), which blocks payment. The sample addresses and excluded
  outward codes are the gift checkout's placeholders (plus a Kirkwall address to show a refusal).
  ONE function, `ckBadOf(state)`, decides what blocks payment for the rail, the sheet and CONTINUE.
  **Sections 1–3 now use the gift checkout's own markup and classes** (`gc-sec`, `gc-field`,
  `gc-lab`, `gc-in`, `gc-err`, `gc-opt`, `gc-dtbtn`, `gc-cal`), copied verbatim, so the type matches
  exactly: 1 **Your details**, 2 **Send to**, 3 **Choose a delivery date** (the date field + popover
  calendar with no month arrows — one month of data; then Delivery time as the gift's radio cards;
  then notes). **Calendar (30 Sep 2026, from the user's mockup):** month arrows (the gift's 44px
  `gc-nav`) over four months of holding data from August 2026, disabled at either end; arrows keys
  cross month boundaries. Three distinct day states — **available** bold green, **fully booked**
  terracotta-ink with a strike line, **no delivery** grey (Sun/Mon and before the earliest run) —
  with a key (Available / Fully booked / No delivery) under the grid (no note line beneath it); each day's label says which state it is. Dates are
  ISO strings; `ckDayOf` upgrades an older snapshot's bare day number.
  **Your details order (user's mockup, 30 Sep 2026):** no lede (removed by the user), Email (placeholder "Email address", no hint), then the log-in row as a sand-ruled single line with a right chevron (rotates down when open; the panel still opens in place), then points. **Points (section 1, under the log-in row) + "This box is a gift" (section 2, directly under its heading) (30 Sep 2026, user's mockup).** **Gift card (rebuilt to the user's mockup, 30 Sep 2026):** one bordered card — gift icon (no divider), "Is this box a gift?" + "Optional", then a ☐ "Yes, add gift options" checkbox (unticked, collapsed on load; replaces the old switch) (its sub-line removed by the user) Ticking expands, inside the same border (no divider — removed by the user): ☑ "Hide prices from the box" (ticked each time "Yes" is ticked) / "We won't include any prices or invoices in the delivery."; ☐ "Add a personalised greeting card" +£3.00 / "Include an Abby's Table card printed with your message." with a card picture (doubled by the user): 112px wide under the option on a phone, indented to its text; 128px beside it from 640 ( 3:4 image slot `ck-gift-card-img`, `assets/greeting-card-384.jpg`, the user's card photograph, 384×512 JPEG); when ticked, a "YOUR MESSAGE" brass eyebrow + textarea with the 0/300 counter bottom-right. The message is optional — no longer a validation error. Ticking "Yes" always starts fresh: Hide prices TICKED (user's decision), the card unticked, no message. Unticking "Yes" clears all three, so re-ticking is always a first time. No marketing opt-in on this page (removed by the user). Also removed by the user: the page lede, the "You pay securely on the next page." line, the email and phone hints, and the Send to lede. CONTINUE TO PAYMENT carries a → by the user's decision (as steps 2–4). **Date selection (user's mockup, 30 Sep 2026, supersedes "held on arrival"):** the "Earliest delivery: …" line under the heading is removed (user) — the row holds only "About delivery dates" with its ⓘ AFTER the label (Menu Landing v3's order). on arrival NO
  date is chosen or reserved. A "NEXT AVAILABLE" card SUGGESTS the earliest date (calendar disc,
  date, "Earliest available date") with USE THIS DATE › (52px green-forest; chevron kept from the
  mockup) and CHOOSE ANOTHER DATE (48px outline, opens the calendar). Confirming either shows the
  "Delivery date" field and starts the reservation; choosing again releases it and starts a fresh
  15 minutes. No date ⇒ payment blocked ("Choose a delivery date to continue.", focus to USE THIS
  DATE). A live `at-date-hold-v1` record restores the chosen date on refresh. About delivery dates
  (popover AND calendar side panel): cooking-run line, sage inset "When you choose a delivery date,
  we'll save it for you for 15 minutes while you finish checkout." / "You can change your delivery
  date at any time before payment.", then "Your delivery date is confirmed once payment is
  complete. If the reservation ends before you checkout, your box and checkout details will be kept. Simply choose a date again, you can reselect the same one if it's still available.". Delivery notes: "Add delivery instructions (e.g. safe place, access details)", 250
  max, counter bottom-right.
  **Delivery date reservation:** a panel under the date field. A confirmed date is held for 15 minutes (`holdMinutes`
  prop, a Tweak for testing). ⬥ Saved: sage panel, green tick disc, "<Date> is saved for you." /
  "You can change your delivery date at any time." / clock "Reserved for N min" ⓘ.
  ⬥ Last 3 minutes: brass tint + clock disc, "Still reserved for you · N min" / same line / "We'll
  keep your box and checkout details if this reservation ends." ⓘ. ⬥ Ended: terracotta tint, "!"
  disc, "Your delivery-date reservation has ended." / "Your box and checkout details are still
  here. Please choose another available delivery date." + a CHOOSE A NEW DATE pill (48px,
  terracotta-ink) that opens the calendar. Ended blocks payment ("Choose a new delivery date to
  continue.", focus to that pill). The ⓘ opens "About your reservation" in the site "i" pattern.
  Minutes are NOT live-announced; only a change of state is. sessionStorage `at-date-hold-v1`
  {day, exp} keeps the countdown across a refresh (try/catch; unreadable ⇒ a fresh hold). The
  calendar's side panel now follows mockup 4: the cooking-run line, a sage inset "We'll save your
  chosen date while you finish checkout." / "You can change your delivery date at any time before
  payment.", then "Your delivery date is confirmed once payment is complete…". The standalone
  "About delivery dates" ⓘ keeps its own copy. **Backend dependency:** the hold must be created and
  timed by the server (capacity per cooking run); the page clock is display only. **Payment hold (5 Oct
  2026):** entering payment with a valid reservation revalidates the date, starts the payment session
  and converts the capacity into a payment hold of up to 10 further minutes — no second countdown on
  screen, no indefinite extension by repeated attempts, never released on a timer while a submitted
  payment's result is uncertain (see "Business rules"). Merely showing the suggested date reserves
  nothing.
  **Mobile (30 Sep 2026):** no 120px bar clearance at the end of the page — steps 2–5 all end `.ad-shell` at 32px, then the footer's 46px (uniform; step 1 was already close). The bar is hidden by then (footer-arrival suppression, and on steps 4–5 the summary's own CTA), so it never covers the last content. below 640 the log-in row reads "Already have an account? Log in" (the
  " for faster checkout" span is hidden, not duplicated); "Create an Abby's Table account" is 600 at
  every width. Every ⓘ note and the calendar are BOTTOM SHEETS below 640 (fixed, 86vh max, grip,
  shared scrim; × / Esc / tap outside close; same markup and focus rules) and the anchored popovers
  from 640. The phone calendar sheet has its own "Choose a delivery date" header + × and shows only
  the calendar + key — "About delivery dates" is its own sheet via the ⓘ. Mobile bar holds one line
  and 85px from 390 up (was 360 before the CTA became PAY SECURELY) by freeing space (bar gap 10, price gap 6, CTA padding 16; the box disc only
  from 480, where the 14/14/22 spacing returns). Under 390 only, "View order ⌃" drops under the
  total rather than sliding under the CTA.
  **Small fixes (30 Sep 2026):** the code field's placeholder is "Gift card, reward or vouchers" below
  640 and "Gift card, reward or voucher code" from 640 (a placeholder cannot be set in CSS, so a
  640 media query drives it); the hidden-on-mobile " for faster checkout" span carries no underline
  of its own (it sat inside the underlined link and drew a second rule); the rail points note undoes
  the phone sheet's square bottom, missing border and padding from 640 by name (the sheet rule
  targets `.ck-rptspop.is-open`, which outranks the plain popover rule).
  **Open decisions (1 Oct 2026):** delivery row shows the earliest date before one is chosen; the
  two points ⓘ notes differ (Your details long, rail short); USE THIS DATE › casing vs the mockup's
  sentence case; "Back to checkout" vs "Return to checkout"; PAY SECURELY on a bar CTA that validates
  rather than pays. Holding data: calendar availability, +£4.95 window, £10 → Free delivery,
  sample addresses and no-delivery postcodes; Full Table +£10 (step 1) vs +£5 (dish page).
  Not built: Stripe hand-off. ~~confirmation page~~ — superseded: Order Confirmation v2 is built and
  approved. `export/` snapshots not regenerated since the
  Review / steps 2–4 / legal-page changes.
  **Mobile bar CTA reads PAY SECURELY (user, 30 Sep 2026).** The Order summary points row (rail and sheet) is centred as one unit — star, title, ⓘ. **Audit (30 Sep 2026):** head standard, links, labels, ARIA targets, type floors and no max-width queries all pass; two 44px misses fixed (the rail ⓘ shrank to 38px in a tight row; "Yes, add gift options" had no sub-line and was 38px tall). **Bottom sheets are TRUE MODALS (user, 30 Sep 2026):** below 640 (the order sheet below 1024) the open sheet takes role="dialog" + aria-modal + aria-labelledby its heading, everything else is `inert` (the scrim / overlay excepted so a tap still closes), Tab and Shift+Tab cycle inside, body scroll is locked, and ×, Esc or the backdrop return focus to the exact control that opened it — one `_modalSync()` driven from componentDidUpdate; from 640 the notes revert to non-modal popovers. Below 640 every ⓘ is click-only (the rail ⓘ's hover/focus preview applies from 640 only — as a sheet it re-opened on the returning focus); the opener's own branch is never made inert. Open, not defects: calendar and window prices are holding data; the reservation clock is display-only. **CONTINUE TO PAYMENT → (30 Sep 2026):** no lock; "Secure checkout" + shield beneath, Review v2's `.rv-cta-in` / `.rv-secure` treatment, on the rail and the sheet. **Order sheet (mobile "View order ⌃", 30 Sep 2026):** mirrors the desktop summary — both headed "Order summary" (renamed from "Your order" by the user), no Edit link (removed by the user — Back returns to Review), the same rows (box, Full Table, Signature, Extras, gift, greeting card, dated delivery), Total, the points panel (★ + ⓘ, whose note opens IN the sheet rather than as a second sheet), CONTINUE TO PAYMENT → and the Stripe line. The dish/extra lists and steppers inherited from Review are gone — editing happens on Review, as on desktop.
  **Review v2 order sheet (30 Sep 2026, user-approved change to an approved page):** the mobile "View box ⌃" sheet now mirrors Review's desktop rail — "Order summary", the same price rows, Total, CHECKOUT + Secure checkout and the delivery line. The dish/extra lists, steppers, Remove, "Edit dishes" and the gift-card editor are gone from the sheet (the page itself edits them). Steps 1–3's sheets already matched their rails (only mechanics differ; step 2's desktop-only "Want to add more?" left as is).
  **Back links (30 Sep 2026, user):** each checkout step names its destination — "Back to Build your box" (step 2), "Back to Add dishes" (3), "Back to Extras" (4), "Back to Review" (5), and "Back to Review" in the review-edit context (was "Back to review"). Step 1 keeps "Back" (its destination varies). Destinations unchanged.
  **Legal line (30 Sep 2026):** "By continuing, you agree to our Terms of Sale and acknowledge our
  Privacy Policy." Both links open a NEW TAB (`target="_blank" rel="opener"`, `?from=checkout`, a
  visually hidden "(opens in a new tab)"); checkout itself is never navigated, so every piece of
  state — form, gift, date, reservation clock, scroll — simply stays in its tab. The reservation
  keeps running; a `visibilitychange` re-check catches the clock up on return (background tabs
  throttle timers), and expiry is handled by the normal ended state. **`at-legal-return.js`**
  (loaded in both legal pages' helmet) shows "← Back to checkout" above the h1 whenever the page
  carries checkout's origin marker `?from=checkout` — NO opener or referrer is required (browsers
  sever openers and strip referrers; a real checkout visit must not lose the link). Footer, nav and
  plain URLs carry no marker and never show it. ~~Return: a reachable checkout tab ⇒ focus it and
  close the legal tab; close refused ⇒ stay and say "Your checkout is still open in your previous
  tab…" (never a second checkout); no reachable checkout tab ⇒ the href (Checkout v2 ?resume=1).~~
  **Superseded 5 Oct 2026:** "← Back to checkout" MAY focus/switch to the existing checkout where the
  browser permits; auto-closing the legal tab is NOT required; never depend on `window.opener`;
  never open a second checkout. If it cannot switch: stay and say "Your checkout is still open in
  your previous tab. Switch back to it to carry on." (`at-legal-return.js` still closes the tab —
  prototype stale.)
  **State dependency — PRODUCTION REQUIREMENT (not built in the prototype):** see
  "Server-side basket / checkout draft" below. Checkout's
  footer legal links are untouched (same tab, no return link).
  **Checkout "i" notes (30 Sep 2026, revised):** every ⓘ in the MAIN column (About delivery dates, the Your details points ⓘ, both reservation ⓘs) is CLICK-ONLY by the user's decision — click opens (pinned), a second click, ×, Esc or a click outside closes, focus returns to the ⓘ; no hover or focus preview. Only the Your order rail's points ⓘ keeps the site pattern (hover/focus previews, click pins). One shared `_tip()` layer; a trigger without the enter/focus/blur handlers is simply click-only. The "About delivery dates" note shown WITH the calendar stays as it is (part of the calendar panel). The rail's points panel has its own "i": "About Abby's Table points" / "Earn N points with this order to use towards future purchases." / "Log in or create an account before payment to collect them." (shorter than the Your details popover, by the user).
  Points panel (blush tint, brass-ringed star): "Earn N points with this order" + an "i" disclosure,
  which opens a popover in the delivery-dates pattern ("About Abby's Table points" — the user's copy, with the order's live points figure), then "Create an Abby's Table account and collect my points" (UNTICKED by default); once logged in
  the checkbox is replaced by "they'll go straight to your account". **Account + points states (30 Sep 2026)** — driven only by the existing
  `signedIn`, `loginExp` (log-in panel open) and `joinOn`; no new state. Section card, one job per line:
  ⬥ Guest: ★ "Earn N points for this order." ⓘ / ☐ "Create an Abby's Table account" / (14px) "Collect your points,
  save your details and make future orders quicker." Unticked by default; never required.
  ⬥ Ticked: same heading and label; the sub-line becomes "We'll email you after payment to finish
  setting it up." (polite live). Unticking restores the guest line — no warning. No password, no
  modal, no extra fields: the Your details email IS the account email.
  ⬥ Log-in panel open: checkbox hidden; "Log in to collect your points." Closing restores
  the previous state (the tick survives).
  ⬥ Logged in: "Complete your order to earn N points" ⓘ, nothing else.
  Rail: ★ "N points available" ⓘ, or "You'll earn N points" when logged in or ticked (and the log-in
  panel is shut). No checkbox or copy in the rail — account creation lives only in Your details.
  The ⓘ explains the scheme in both places.
  **Backend dependencies (not prototyped):** create the account only after a SUCCESSFUL payment,
  from the checkout email; attach the order; award points by the normal rules; send a secure
  set-password link. Confirmation page copy: "Account created / N points earned / We've emailed
  you a secure link to finish setting up your account." Payment fails ⇒ no account, no points.
  Existing email ⇒ no duplicate, no reveal at entry, route through the normal account-access flow,
  never block guest checkout. **HOLDING RULE (STALE — superseded 5 Oct 2026):**
  1 point per whole £1 excluding delivery and gift-card value. The final scheme is 2 points per £1 of
  eligible spend ("Business rules"); the prototype's figures and copy still use the holding rule and
  must be reconciled. Gift card: **off and collapsed on arrival**; a
  `role="switch"` opens it (body always mounted, `display: none` when off). Inside: greeting-card
  photo (`image-slot`, awaiting a real photograph), "Hide prices from the box" (ticked when the
  gift opens), "Add a personalised greeting card +£3" (UNTICKED — a paid add-on is never
  pre-ticked, though the mockup showed it ticked), and a 300-character message that is required
  while the card is ticked. The card adds a "Greeting card +£3" rail row and £3 to the total.
  **About delivery dates (30 Sep 2026, user's mockup; calendar itself unchanged):** an "ⓘ About
  delivery dates" text action after the Earliest line opens a click-only popover (caret under the
  "i", ×, Esc, outside click; always mounted; no icon in the popover). The date field shows a
  visible **Change date** (part of the button's accessible name). Opening the calendar closes the
  popover; the calendar and the SAME note then share ONE panel (one background, one border) — note
  beside the calendar from 768 (where 336 + 360 fit), below it under 768 — with a × in the note
  corner, plus Esc and click-out. Copy (user's wording, 30 Sep 2026): "We take a limited number of
  orders for each cooking run, so we can give every dish the care it deserves. The date shown is
  our next available cooking run." then, as its own BOLD paragraph, "Dates are confirmed when
  payment is completed. If your chosen date fills before you complete payment, we'll simply ask
  you to choose another available date. Your box and checkout details will be kept." — checkout's
  OWN note (this page books the date), deliberately NOT one of the settled delivery-note instances.
  Points and gift icons have no rings; points use one brass filled star in both places. Change date
  and the terms links use continuous underlines (`text-decoration-skip-ink: none`). Section 4 takes the same treatment. Labels are 13px uppercase brass-ink, fields white
  with a 14px radius, sand rules between sections, errors in `--chilli` with the triangle glyph.
  Not carried: recipient email, message and greeting card, gift quantity, email-vs-post routes,
  "Post today" — gift-only.
- Order confirmation — **`Abby's Table - Order Confirmation v2.dc.html`** (redesign from the user's
  mockup, **approved 1 Oct 2026**; supersedes `Order Confirmation.dc.html`, and replaces it in
  `_audit/live-pages.json`). Canonical marketing header, drawer and footer. One page,
  three states via the `accountState` prop (production: the confirmed order). Order: "Order
  confirmed" with the tick disc at the END of the heading (aria-hidden, wraps below on narrow
  phones), lede, order number + copy button, then **Delivery details | Order summary** — two open
  cards, stacked on a phone, side by side from 1024 — then a full-width navy **Private Table
  banner**. No accordions, no email-signup band (the footer carries the only signup), no gifting
  promo, no "Manage delivery".
  ⬥ **Delivery details:** date + window, address, then (member and created only — **never guest**)
  a compact "What happens next" (13px brass-ink caps label, three numbered lines, user's copy) a
  fixed 22px + hairline below the address — not pushed to the card bottom.
  ⬥ **Order summary:** rows, Total, then by state — **member:** ★ "N points earned" ⓘ / "Added to
  your Abby's Table account." (no link); **created:** Account created / secure-link line + ★ points
  / "Your points will appear once your account setup is complete." (no resend link); **guest:**
  nothing after Total (a "create an account" prompt was tried and removed by the user).
  ⬥ **The ⓘ uses Checkout v2's points pop-up** (cream-2 panel, sand border, caret, × , "About
  Abby's Table points") and its disclosure behaviour: hover opens (pointer, 640+), leaving closes,
  click pins, ×/Esc/outside click dismiss. Copy is past tense ("You've earned N points…"), not
  checkout's prospective wording. Inline below 1024, floats with a shadow from 1024.
  ⬥ **Private Table banner:** photograph (`private-table-hero-1120.jpg`) left from 1024 / top on a
  phone, "Coming soon", title, lede, two routes (Worldwide · Recipe development / UK-wide · Recipe
  development & meal preparation) in --brass-lift rings, the page's three credentials, brass 52px
  **FIND OUT MORE** → Private Table v2 (top of page, not #enquire). Small type on navy uses
  `--brass-lift`, never plain brass. No arrow on the CTA, no image fade (no UI gradients).
  ⬥ Type: h1 clamp(36px, 10vw, 56px) — 56 is the rebuilt-page h1 max; lede 16/18; card titles
  22/26; Total 22/26; points headings 19. No `at-order-state.js` (the order is confirmed);
  `at-account-state.js` IS loaded. **Open:** figures are sample data; checkout does not yet
  navigate here; sample points use 1 per £1 — **stale**, the final rule is 2 per £1, added immediately
  after successful payment ("Business rules"). The "created" state's "Your points will appear once
  your account setup is complete." is **decided acceptable (5 Oct 2026)**: the points are already
  earned against the successful order and only become visible once secure setup/access is done —
  never pending or awaiting fulfilment ("Business rules — Account setup after Checkout").
- Payment processing — **`Abby's Table - Payment Processing.dc.html`** (status page 4 of the user's
  mockup, **approved 1 Oct 2026**; statuses 5 and 6 are built, below). Chrome is the payment-status header + Checkout v2's
  simplified footer and help drawer (rule below), on the system 640/1024 steps — so between 1024
  and 1080 its gutters differ from the checkout steps, which still carry the legacy 641/1081
  (see "Checkout breakpoints" below). h1 "We're confirming your
  payment" + a decorative brass ring (built in renderVals so the spin survives re-renders; slowed,
  not stopped, under reduced motion — it is the loading indicator), bold "Please don't close…"
  lede as the status line, blush "Your order is safe" panel with a brass-ink padlock. The mockup's
  scattered ingredients are replaced by **`assets/food-box-open.jpg`** in a framed 24px-radius block
  on its own dark ground — right column from 1024, under the panel on a phone. (A cut-out of the
  box on cream was tried and reverted by the user.) **Payment-status header** (see rule below):
  no `at-order-state.js`, no `at-account-state.js`. `simulate` prop (off) moves on to Order Confirmation after 4s for demos. Production: the
  server's payment result routes to confirmation / not completed / cancelled — never the browser.
- Payment wasn't completed — **`Abby's Table - Payment Not Completed.dc.html`** (status page 5 of
  the user's mockup, built 1 Oct 2026, **awaiting review**). Copied from Payment Processing: same
  composition, photograph and drawer, on the 640/1024 steps. h1 "Payment wasn't completed", lede,
  an alert panel (blush tint, 1px `--terracotta-ink` rule — the `gc-wa-fail` treatment — white disc
  with a terracotta-ink "!", heading in `--terracotta-ink`), then **TRY AGAIN** (52px green-forest)
  + **USE ANOTHER CARD** (52px outline), full width on a phone, side by side from 640,
  and "Return to checkout →" (site text-CTA: 1.5px brass rule under label and arrow) to Checkout v2. Header + footer as Payment
  Processing **except the wordmarks link home and footer links open in the same tab** — nothing is
  in flight. **Departure from the mockup:** its primary CTA is gold; ours is green-forest, matching
  every checkout CTA. Prototype: both CTAs go to Payment Processing; production re-opens the
  provider for the same order draft. "No charges have been made" is the mockup's copy and must be
  confirmed against the provider's behaviour (a declined card can leave a pending authorisation).
  **Secondary label is "Use another card"** (user, 1 Oct 2026) — the mockup's "Use a different
  payment method" (~390px at .12em) could not hold one line in a phone's content column. The CTAs
  keep 12px vertical padding + 1.35 line height so any future longer label wraps cleanly.
  **Open:** the drawer's topic list carries both "This payment" and "Payment" (inherited from
  Payment Processing) — overlapping; to be settled on all three payment-status pages together.
- Payment was cancelled — **`Abby's Table - Payment Cancelled.dc.html`** (status page 6 of the
  user's mockup, built 1 Oct 2026, **awaiting review**). Copied from Payment Not Completed — same
  chrome, photograph, drawer, CTA treatment and "Return to checkout →". h1 "Payment was
  cancelled", lede "Nothing has been charged and your order is still here." The panel is
  **neutral, not an alert** — the customer chose this: sand tint, no rule, white disc with a
  brass-ink "i", heading in green-forest ("You cancelled the payment"). CTAs **CONTINUE TO PAYMENT**
  (green-forest, not the mockup's gold) + **USE ANOTHER CARD** (the status-5 label, kept the same on
  both pages rather than the mockup's "Use a different payment method"). Drawer FAQs are this
  page's own (charged / saved / date held / change before paying / secure). Same topic-list overlap.
- **Payment-status pages never carry an ordering CTA (decided 1 Oct 2026).** The customer already has
  an order in progress, so Get started, Build a Box, VIEW BOX or any other header ordering CTA would
  start a parallel journey. ⬥ **4. Payment processing** uses the MOST restricted header: wordmark
  (not a link) + "Questions?", which opens **Checkout v2's help drawer** over the page (payment FAQs,
  WhatsApp, message form) so the customer never leaves it — no navigation, no
  My Account, no mobile nav drawer, never auto-hides — and the **simplified checkout footer** (Checkout v2's),
  with its wordmark not a link and every link opening in a new tab. It behaves like a
  transaction-processing screen: nothing on it navigates away from the payment in flight.
  ⬥ **5. Payment wasn't completed / 6. Payment cancelled** carry NO Get started / ordering CTA;
  the dominant action is the customer's existing order (TRY AGAIN / CONTINUE TO PAYMENT). As
  built they use Payment Processing's header (wordmark + "Questions?") with the wordmark LINKING
  home, and the simplified checkout footer with same-tab links — nothing is in flight. Never load
  `at-order-state.js` on any of the three (it would write VIEW BOX), nor `at-account-state.js`
  (no account link to relabel).
- **Checkout breakpoints — legacy, not a decision (audited 1 Oct 2026).** Checkout v2 and Review v2
  still use 641 / 721 / 861 / 1081. They are the old desktop-first chrome's ≤640 / ≤720 / ≤860 /
  ≤1080 ("Checkout-flow step chrome", superseded) inverted one-for-one, with no content reason
  recorded. Due to move to 640/1024, both pages together, checked with `_audit/compare.html`;
  721 (h1 40→50px) needs its own call. **768 is a real exception:** the first width where the
  calendar (336) and its panel (360) sit side by side. The 1340 `$preview` rule for checkout
  steps comes from the same superseded section; Checkout v2 and Review v2 open at 390. Unsettled.
- Checkout step chrome — **stays separate from the marketing header** (see Checkout-flow section below); untouched until we reach the checkout flow.

### Checkout flow — conventions (source: Gift Card Checkout)
Approved as standards. **Applied per page as we edit each checkout step, not as a sweep** — the
five food-box steps keep their current chrome until their own review.
- **Transactional shell, two variants.** Wordmark + "Questions?" only: no nav, no burger, no
  drawer, no mobile purchase bar, and it never auto-hides — a checkout step is a task, not a page
  to browse from. The **food-box flow carries a 5-step progress indicator**; the **gift-card
  checkout carries none**, because that journey is much shorter.
- **Simplified checkout footer on every checkout page.** 2px brass rule, green-deep ground, 1280
  shell, wordmark, five legal/help links at 44px in full-opacity blush, © line with Cookie
  preferences at 14px (also a 44px target — it is a flex item in the © row, not an inline link), "Abby x". No newsletter, no link columns, no social row — every one of those
  is an exit from the task. No "↑ Top" control.
- **"Questions?" help drawer on every checkout page that offers help.** The canonical file is
  **`Abby's Table - Gift Card Checkout.dc.html`** — copy the drawer from there verbatim (CSS,
  markup and logic) rather than re-deriving it, and give it the page's own FAQ content and topic
  list. Applied to **Choose Box v2**, whose earlier drawer (live chat + an email accordion + a
  "view all questions" toggle) is superseded and gone. A **bottom sheet on a phone** (max 86dvh — `dvh`, not `vh`, or
  mobile browser chrome and the keyboard make it read full-screen), a 480px full-height right
  sheet from 640. Same on both checkout pages. Three views in ONE drawer: help (search + popular questions + Still
  need help?), an inline message form, and a sent confirmation. **No link out to the FAQs page** —
  searching happens inside the drawer. Modal: focus enters, moves to each view's heading, is
  contained, Esc closes, focus returns to the trigger, the close control is sticky while content
  scrolls, and the page behind takes `inert` + `aria-hidden`. Opening or closing it must never
  reset checkout state, and a part-typed message survives a close.
- **The only external support route is WhatsApp**, in a new tab with `noopener noreferrer`, no
  prefilled message and nothing about the order passed. A blocked pop-up shows an inline fallback
  ("Unable to open WhatsApp." / Try again · Message us instead) — never a redirect of the checkout.
  Each route states its own reply time inside its own card, and **WhatsApp's follows the opening
  hours** — "Open now · We usually reply within 4 hours" / "Closed now · We'll reply when we
  reopen". **The number, hours and bank-holiday list live in `at-contact-data.js`** — one source of
  truth, imported by every page that shows them, so the pages can never disagree about how to
  reach us or whether anyone is there. Never hard-code another copy; the values are still
  placeholders, and centralising them makes confirming them one edit. Never promise a reply time
  while closed.
- **Never send a customer from checkout to Contact Us.** "Message us" transitions the drawer to an
  inline form (Name, Email, Order reference, How can we help?, Message), prefilled from what the
  BUYER has given us — never from the gift's recipient. A failed send preserves everything typed.
- **Date fields use our own calendar, never the native date input**, which arrives as an unstyled
  system widget mid-checkout.
- **The post route has no same-day option** — no "Post today". With one arrival timing there is
  nothing to choose between, so the radiogroup is dropped there entirely and the calendar shows
  directly under "Posting date"; a single radio presents a decision that is not one and gives a
  keyboard user a group with one stop. The effective value is DERIVED (`_when()` returns "pick" on
  the post route), never written into state from a render — validation, the summary and the
  radiogroup must all read the same value or the payment CTA can appear on an order that then
  fails to submit. Email keeps both options.
- **Sticky order band on mobile, canonical for checkout pages.** Full-width green-forest band flush
  to the bottom edge, **85px — the same height as the homepage purchase bar**, so both fixed bottom
  elements present the same edge from page to page. They remain separate components (this band is
  itself one button — gift mark, "Your order" + a quantity line, the total, and a `--brass-lift`
  "View ⌃"; the marketing bar wraps a 48px CTA pill in 18px of padding). Only the height is shared,
  and it is reached with padding, never by scaling the band's content up.
  Tapping it opens a **modal bottom sheet** carrying the SAME order components as the end-of-page
  panel (reused, never a second set): grab handle, "Your order", the gift-card artwork, rows, Total.
  The **payment CTA appears only once every required field is filled**; before that the sheet states
  what is outstanding and an outline "Continue checkout" returns to the first missing field. The
  result of paying is reported **inside the sheet**, which stays open. Hidden whenever the full order
  card is on screen, and while the help drawer is open — never the band and the card at once. No
  clearance spacer: the order card sits directly above the footer, so the band cannot cover the end
  of the page. Desktop (≥1024) has the sticky order rail instead and no band.
- **Address entry on the post route is a LOOKUP, not a form.** Default state is one field —
  "Delivery address", placeholder "Start typing a postcode or address" — as an accessible combobox
  (`role="combobox"`, `aria-expanded`/`aria-controls`/`aria-activedescendant`, a `role="listbox"`
  panel styled as the form-input dropdown), with **"Enter address manually"** directly beneath it.
  Selecting a suggestion **replaces the field** with a compact confirmed-address block plus
  **Change** — never a wall of populated inputs. Manual mode is line 1, line 2 (optional), town,
  postcode, with correct `autocomplete` tokens and **no County field**. Switching between search
  and manual keeps whatever has already been entered, and Change never clears other checkout data.
  **Lookup is an accelerator, never a lock**: manual entry always reaches every address.
- **Delivery eligibility is judged as soon as there is a postcode**, stated where the address is
  ("✓ We deliver to this address" / "We don't currently deliver to this postcode.") and it blocks
  payment. Never held back to the payment step, and a refusal never clears what was typed.
- **Postcode formatting is normalised, never rejected.** Uppercased as typed; the space is inserted
  once the inward code is complete, so the caret is never moved mid-word. Case and spacing are
  formatting we can fix, so neither is ever an error message.
- **Postcode validation is deliberately permissive**, because real UK grammar has enough exceptions
  that a strict pattern turns away valid addresses — a worse failure than accepting a malformed one.
  `GIR 0AA` (Girobank, Bootle) is a live postcode the standard pattern cannot express, so it is
  matched explicitly; do not "tidy" it out of the expression.
- **Phone number is its own field on the post route**, outside the address block, required, with
  the reason stated ("so the courier can reach the recipient on the day if needed").
- **The personal message carries from Gifting into the checkout**, on both routes. It travels in
  `sessionStorage` (`at-gift-draft-v1`), **never in the query string**: it is something personal
  the customer wrote, and a query lands in browser history, server logs and any copied link. The
  Gifting CTA writes it on the way out inside try/catch; the checkout reads it once on mount and
  only into an empty field, so it can never overwrite something typed there. If storage is
  unavailable the anchor still navigates and the customer retypes — the right failure.
- **Two ways to say the same thing is a bug, not emphasis.** Where one element already states a
  reason (the eligibility panel), a field-level error sets its marker to `true` rather than to the
  same sentence: the field still takes the error border and the focus, and the text renderers print
  only string values. The refusal appearing twice, 81px apart in two treatments, read as a
  rendering fault.
- **Marketing consent is unticked by default** on every page that asks. UK GDPR needs an active
  opt-in, so a pre-ticked box is not consent. The gift-card checkout **does not ask at all** —
  one fewer decision mid-payment — so the rule binds only the steps that do.
- **No "Your checkout stays open" reassurance in the help drawer** — removed. It existed only
  while the phone drawer covered the whole screen; the bottom sheet leaves the step visible above
  it, which says the same thing without a line of copy.
- **Logging in happens inside the step**, never by navigating away: the "Already have an account?"
  row expands in place (email, password with inline Show/Hide, forgot-password link, Google and
  Apple). The panel is always mounted and closed with `display: none` so `aria-controls` always
  resolves; opening scrolls it into view and focuses the email field, collapsing returns focus to
  the row.
- **Conditional summary rows** — a summary line appears only once the customer has chosen it
  (Gifting and the gift-card checkout). Agreed for the gift-card **post** route too; the food-box
  summary is decided at its own review.
- **Gifting hands off to the gift-card checkout by LINK, carrying the order in the query**
  (`?value=100&route=email`). Email and post are navigations, so they are real anchors — middle-
  click, copy-link and a no-JS load all work; **"In a food box" is not a navigation** and stays a
  button, because the card joins a food box order rather than starting its own checkout. The
  checkout reads `value` from the URL and falls back to its prop when visited directly, guarding
  against a junk value so a payment page can never print "£NaN". Both email and post currently land
  on the same page; splitting them when the post route is built is a change to one string.

- **Unfinished gift (Gifting v2 ⇄ Gift Card Checkout).** A standalone gift becomes "unfinished"
  only once it is IN the gift-card checkout: the checkout writes sessionStorage
  `at-gift-checkout-v1` (`{v:1, t, value, route, msg, f:{…typed fields, never the password},
  dismissed}`) on mount and on every field change, and removes it when payment goes through.
  Gifting never writes it — browsing, picking a value, a message or a route creates nothing; the
  "In a food box" route never creates it at all. Gifting shows the banner below the header, above
  the hero, read before first paint; invalid, expired (24h), unreadable or dismissed ⇒ no banner.
  Blush panel, 1px sand, 18px radius, the site's gift glyph, green-forest type; **CONTINUE YOUR
  GIFT is green-forest** (continuing, not starting — the VIEW BOX rule), caps, no arrow; "Edit
  gift details ↓" loads the saved gift into this page's own order panel and jumps to it; × hides
  the reminder for the session and keeps the gift. Completely separate from `at-order-v1` — it
  never changes the header pill or purchase bar. Continue re-opens the checkout with every typed
  field restored. After "Edit gift details", the order panel's CTA reads **CONTINUE** while
  every gift field matches the saved gift and **SAVE CHANGES** once any differs (value, custom
  amount, route, card, message) — never "Buy gift card"/"Add to food box" while editing, on every
  route including In a food box. The checkout's two **Edit** links (panel header + mobile order
  sheet) go to `Gifting v2?edit=1#gift-card` after flushing the save: Gifting starts with the gift
  already loaded in edit mode before first paint (no banner — they are already editing), even if
  the reminder was dismissed.
- **Gift card "In a food box" with NO box yet (Gifting v2 → Choose Box v2 → Add Dishes).**
  ~~"No box" = no `at-order-v1` (a box exists only once a dish is in it)~~ — **superseded 5 Oct
  2026:** "no box" = no ACTIVE box under the shared active-box rule (`ATOrder.isActive`; see
  "Business rules — reconciled 5 Oct 2026"). A committed empty box (ADD DISHES pressed, 0 dishes)
  IS active, and a genuinely carried dish also establishes active state. Or a gift already saved
  for one. The option reads "We'll save your gift card while you build a food box."; the CTA is a
  real anchor, **BUILD A FOOD BOX** (caps, no arrow — the CTA standard, over the mockup's →), with
  "Your £X gift card [and greeting card] will be saved while you build the food box. Recipient
  details come at checkout." beneath. It writes sessionStorage **`at-gift-box-v1`**
  (`{v:1, t, value, card, msg, sel, qty, price, lines?, stage}`, 24h, try/catch, invalid ⇒ no
  gift) — nothing is bought. Step 1 shows the saved-gift block under the h1 at every width, and a
  gift line in Your box (rail + sheet) ABOVE "No dishes yet": "Saved for this box" · Edit. The
  gift is never a dish line, so it never takes a slot or counts to the minimum; it IS in the
  estimated total (own rows). The default 6 is provisional; step 1's CTA commits whatever is
  selected (no re-click) → `stage: "added"` → **Add Dishes** (the gift route only; the normal
  route still goes to Menu Landing v3). Step 2 opens at that size, empty, with "✓ Added to this
  box" / "Delivered inside this box" · Edit. Step 1's size and step 2's lines persist in the
  record. Every Edit goes to `Gifting v2?edit=box#gift-card` (panel loaded, edit mode,
  CONTINUE/SAVE CHANGES), which returns to step 1, or step 2 once added. Choosing email/post
  from there drops the record. The route where a box already exists keeps "Add to food box".
- **Gift card "In a food box" WITH a box in progress (attach route).** One active box only — never
  a second box, never a choice between boxes. "Box in progress" = a valid `at-order-v1`, or a gift
  already `stage: "added"`. Option copy "We'll add this gift card to the food box you're already
  building."; Delivery row "In your food box"; CTA **ADD TO FOOD BOX** (anchor, caps, no arrow);
  note "Your £X gift card [and greeting card] will be added to your food box. The gift card does
  not count towards your dish minimum." Pressing it sets `at-gift-box-v1` `stage: "added"`,
  `via: "order"`, `notice: "added"` and returns to `at-order-v1.href` — the step LAST REACHED.
  **Step tracking:** every checkout step (1–5) calls `atMarkLater(this, n, file, label, total)`
  from renderVals, writing `step`, `href` (`…?resume=1`) and a state snapshot `snap.sN` into
  `at-order-v1` (transient UI and payment fields excluded by `AT_SNAP_SKIP`). `?resume=1` restores
  that snapshot before first paint. `at-order-state.js` `save()` now MERGES, so label/total
  updates never wipe step/snapshots, and VIEW BOX returns to the last step. The helper block is
  the same in all five step pages — keep them identical.
  **Confirmation:** one-shot `notice` in the gift record, taken (and deleted) by whichever step
  loads next: compact status panel, first thing under the progress header, "Gift card added to
  your food box" / "Gift card updated" + the gift line, × dismisses (gift stays). Never shown
  again on step changes. **Shown only while the gift is in the box** (`gnOn && gift record` in
  every step's renderVals), so it can never describe a gift that is gone — removed here, on
  another step or in another tab. Removing the gift also dismisses it for good: Undo restores
  the gift, not the notice. **Your box** on every step shows the gift as its own line (never a dish,
  never in the count), "Delivered inside this box" · Edit, plus Gift card / Greeting card total
  rows. Steps 1 and 2 keep quantity + Remove (the site Undo); steps 3–5 are Edit-only until their
  rebuilds.
- **Step 2 rebuild — build history for `Abby's Table - Add Dishes v2.dc.html` (now approved; the
  old Add Dishes is superseded and nothing links to it).** Where this entry and the "Checkout step 2"
  entry above disagree, the entry above is current. Mobile-first on the 1280 shell; chrome (header, 5-step band,
  checkout footer, help drawer) extracted verbatim from Choose Box v2. No personalisation. Dish
  card = the approved card + two portion rows (Light Table / Full Table): macro line, price, and
  ADD until that portion is in the box, then the stepper. (Details trigger: now the whole upper
  region of the card — see the entry above.)
  **Pricing:** Light is included in the box price; Full shows its per-dish upcharge (`FULL_ADD`,
  default +£4, okra +£5); Signature dishes add their menu supplement to either portion. Sizes and
  prices = Step 1's (6/12/18 + Set your own 7–99 at £17 — was 7–30; maximum raised to 99 on 4 Oct 2026, see "Box size limits"). **Your box** is ONE element: bottom
  sheet under 1024 (opened from the 85px bar), sticky rail from 1024. Change box size = a
  radiogroup dialog (sheet on a phone, centred from 640); sizes below the dish count are disabled.
  Box full ⇒ "Your N-dish box is full" → CHOOSE A LARGER BOX (pending dish remembered and added on
  update) → "Box changed to N dishes"; at the box maximum (now 99, was 30) ⇒ "Remove a dish before adding another". CONTINUE is
  `aria-disabled` until the box is full. **Quick view** — now "dish details"; content order per the entry above (sheet on a phone,
  two-column modal ≤1040px from 1024): tags, name, components, heat, "Flavour built properly." + See our standards,
  portion radiogroup with macro strip, three accordions, ADD TO YOUR BOX. Only Royal Seafood Okra
  has real ingredients/allergens; the rest say they are being confirmed — never invent them.
  **See our standards (quick view only):** writes `at-std-return-v1` (dish, portion, scroll,
  history length, full state snapshot), replaces the current entry with `?qv=1`, then navigates
  in the same tab to `Standards v2?from=step2`. Standards shows "← Back to {dish}" only for that
  origin and returns by history (or `location.replace`). Step 2 with `?qv=1` + a fresh record
  restores state, reopens the quick view on the portion, restores scroll, then strips `qv` and
  deletes the record (also on bfcache `pageshow`), so it never reopens twice.
- **Gift-card quantity + Remove (Gift Card Checkout).** The order panel and the mobile order
  sheet both carry the dish line's controls from Choose Box v2: 28px brass − / + discs (1–10) and
  a "Remove" text button, 44px invisible targets. Quantity multiplies the gift-card line only —
  **postage and the greeting card are per order** (one envelope, one card carrying one message);
  confirm this before launch. Remove is an explicit discard: it clears `at-gift-checkout-v1`, so
  Gifting stops offering to continue it; the panel shows "Gift card removed" with Add back and
  "Back to gifting →" (to the TOP of Gifting, no anchor — the gift is gone, so there is nothing to
  resume in the gift-card section), the payment CTA disappears, and everything typed is kept. Add back restores
  the same quantity.

### Reusable interaction patterns (rebuilt pages)
Both are techniques, not taste — reuse rather than re-derive.
- **Contextual "Back to dish" (dish page → Our Standards → dish).** Standards v2 shows
  "‹ Back to dish" at the top of its hero ONLY when the customer arrived via a dish page's "See our
  standards" link. Two signals, both required: `?from=dish` on the link AND a live record in
  sessionStorage `at-dish-return-v1` (`{v:1, t, page, hl, y, returning, s:{portion, nutrition,
  ingredients, heatAcc}}`, written on click, 6h expiry, same-origin Dish Landing URL only). The query
  alone — a pasted link — is not enough; nav, footer, homepage and direct visits never show it.
  Read synchronously before first paint, so no layout shift. Styling is the site's existing back
  link (16px/600 green-forest, 18px chevron), 48px target on a phone, 44 from 1024; label is
  "Back to dish" (never bare "Back", never the dish name). A primary click is a TRUE return:
  `history.back()` when the entry behind is the dish (referrer path, or `history.length === hl+1`),
  otherwise `location.replace(dish)` — never a forward push, so no Dish → Standards → Dish loop.
  The href is the real dish URL for no-JS/new-tab/modified clicks. The dish page restores its
  portion + accordion state and scroll position only when genuinely returning (`returning` flag or
  a `back_forward` navigation), via settle-then-scroll; from the back-forward cache it reapplies
  nothing. Applied on Dish Landing v2 and Dish Landing Signature v2.
- **Settle-then-scroll reveal.** When a control reveals content below the fold (date picker, login
  block, dropdown list), poll until TWO consecutive measurements agree, then scroll just far enough
  to clear the edge, then confirm it landed and finish without animation if it did not. Scrolling on
  the element's first sighting gets cancelled by the commit that follows. Never `scrollIntoView`.
- **Radiogroup for 2–3 mutually exclusive options** (Gifting's arrival routes, the checkout's
  delivery date). `role="radiogroup"` + `role="radio"`/`aria-checked`, arrows and Home/End move the
  selection, roving tabindex — and when nothing is selected yet the FIRST option stays tabbable, or
  the group has no tab stop at all.

- **Replacing a page's stylesheet wholesale means stripping its carried-over inline layout in the
  same pass.** An inline `style` attribute outranks any non-`!important` class rule, so a new
  mobile-first sheet lands completely inert over markup that still carries the old inline
  `display`, `grid-template-columns`, `padding` and `margin`. Dish Landing v2 rendered two columns
  with 48px gutters at 390px for exactly this reason. Fix by REMOVING the inline declarations, not
  by adding `!important` — that leaves two competing sources and the same trap for the next edit.
  Five instances so far across Standards v2 and Dish Landing v2 (a hero ground, a CTA's
  `display: inline-flex`, a lede's `margin: … auto`, a whole page's grid, an h1's `font-size`):
  when a class rule appears to do nothing, check the element's inline style first.
- **Do not slice a logic class between string markers in a bulk script.** `}));` and `};` recur
  constantly, so the first match is rarely the boundary you meant; a mis-sliced array left a
  syntax error that blanked the page. Structural edits to the class go through targeted
  replacements with enough surrounding context to be unambiguous.
- **Re-measure after a bulk write before trusting what you see.** Writes made through the
  bulk-edit path do not always hot-reload the preview, so a post-edit probe can report the
  PREVIOUS layout and send you chasing a fix that is already in the file.

### Tokens — pending changes (scoped to rebuilt pages, not yet in the design system)
Declared in the rebuilt page's `:root`; move into the design system when the component is
approved and propagated, then delete the local override.
- `--surface-dish: #EDE5D9` — the dish-card panel ground. Promoted from a literal that three
  rebuilt pages were hard-coding (Homepage v2, Menu Landing v3, Dish Landing v2), so the card
  colour has ONE source. Note it is NOT the same as `--surface-card` (#E0D8C8, which equals
  `--sand`): the design system's token and the colour the cards actually use had drifted apart,
  and this records the real one. Used for dish-card panels, the dish page's accordion panels and
  its unselected portion buttons. The superseded pre-rebuild pages keep the literal.
- `--terracotta: #B7554E` — sampled from the approved mockup; the shipped `#B45F5A` carries
  more blue and reads dull. Also clears white-on-fill at 4.75:1 (the old value was 4.47:1).
- `--terracotta-deep: #9C433D` — matching hover/press.
- `--gold: #F6C33B` — bright accent from the mockup. **Dark grounds only:** 9.3:1 on
  green-deep, 1.45:1 on cream, 1.63:1 under white text. `--brass` (#C28E3C) remains the
  light-ground accent until those sections are redesigned.
- `--brass-ink-warm: #7A5219` — brass for small **type on the warm panel grounds**: blush, sand and
  sage, where `--brass-ink` measures 3.72:1, 3.97:1 and 4.28:1 and fails the 4.5:1 small-text
  minimum. Measured **4.56:1 on blush, 4.86:1 on sand, 5.25:1 on sage** (6.13:1 on cream), and it
  still reads as brass rather than brown. `--brass-ink` stays correct for small type on `--cream`;
  this is only for the warm panels, and neither replaces `--brass` for rules, hairlines and large
  marks. Third instance of the same split that produced `--brass-ink` and `--terracotta-ink`: an
  accent and an ink are two tokens, not one. Introduced on Private Table v2's "Included with both
  services" band, which is 13px on bare blush.
- **`--taupe` (#86755F) is never small text.** The design system calls it "secondary /
  supporting text", but at 13px it measures 3.96:1 on cream and 3.14:1 on sand — under the 4.5:1
  minimum. Use `--brown` for small supporting text on light grounds. Same failure mode that
  produced `--brass-ink`. It is fine at body size and above.
- `--brass-ink: #8A5F1F` — **approved**; apply to every page as it is rebuilt (per-page, not a
  bulk pass). Brass for **small text on cream** — 4.96:1 there, but only **3.97:1 on `--sand`**,
  **3.72:1 on `--blush`** and **4.28:1 on `--sage`**,
  so small text on a sand, blush or sage panel uses `--brown` and brass-ink is limited to rules and
  marks there. Measured cases: the menu's "where the flavour comes from" label (12px on blush) and
  the delivery strip's "i" glyph (13px on sage, which takes `--green-forest` at 9.4:1).
  `--brass-deep` (#A9762C) is only
  3.47:1 there, under the 4.5:1 small-text minimum; this is 4.96:1 and still reads brass. Rule:
  `--brass` for rules, hairlines and large marks; `--brass-ink` whenever brass is type.
- `--terracotta-ink: #943E38` — terracotta for **type on light grounds**. `--terracotta` measures
  3.14:1 on blush and 3.55:1 on cream, so it only ever passed as headline-scale type and failed
  the moment anyone reduced a size; this is 4.63:1 and 6.23:1, safe at any size. **Light grounds
  only** — on `--green-deep` it falls to 2.2:1, where the lighter `--terracotta` is correct (so
  the footer's "Abby x" keeps `--terracotta` and is NOT switched). Exactly the `--brass` /
  `--brass-ink` split, for the same reason: an accent and an ink are two tokens, not one.
- **Brass on `--navy` is a KNOWN, ACCEPTED exception at 4.08:1.** The homepage's Private Table band
  and Private Table v2's hero and process sections both use plain `--brass` for small type on navy:
  13px labels, the "Coming soon" mark, "Find out more" and the step numerals. That is under the
  4.5:1 small-text minimum. `--brass-lift` measures 4.77:1 there and would pass, but switching one
  page alone would put two different brasses on the same brand ground — so the two are revisited
  together or not at all. Do not "fix" either in isolation.
  **Homepage reach rows (1 Oct 2026, user):** the band's "Worldwide / UK-wide" line is now two
  icon rows using Order Confirmation v2's Private Table route icons (globe, pin; 52px ring, 1.5px
  line glyph), stacked on a phone and two across from 640, copy unchanged. Rings, glyphs and the
  13px caps labels are plain `--brass` under this exception — NOT Order Confirmation's
  `--brass-lift`, which sits on a different ground and would put a second brass on the band.
- `--brass-lift: #D09B45` — brass for **type on `--green-forest`**, the mirror of `--brass-ink`.
  Plain `--brass` is only 4.25:1 there, which carries a boundary or a mark (3:1) but not a 13px
  numeral; this is 4.97:1 and still reads bronze rather than the yellow `--gold` gives. Measured
  against `--green-forest` ONLY — on `--green-deep` brass is 1.9:1 and gold remains correct.
  Introduced on How It Works v2.

### The homepage IS the standard — for everything, not just type
`Abby's Table - Homepage v2.dc.html` is the reference implementation. When building any new page,
**take its values, do not choose new ones**: type sizes and clamps, section paddings and gutters,
radii, panel grounds, button heights, hover and focus treatments, breakpoint compositions,
spacing rhythm. If the homepage has no equivalent for something, that is a decision to raise, not
a number to invent. Checkable sizes:
- Page title (h1): `clamp(38px, 11.6vw, 56px)` mobile, 56px+ desktop.
- Section title (h2): `clamp(30px, 8.6vw, 40px)` mobile / 48px desktop, line-height 1.08,
  letter-spacing -0.01em.
- Card / step / panel heading: 22px mobile → 26px desktop.
- Section intro AND page lede: **18px at EVERY width** — neither scales up on desktop. A 20px
  desktop bump crept onto Contact and Allergens and was removed.
- Body 16px. Small labels 13px / .16em. Button labels 13-14px / .12em.
- Inner shell: `max-width: 1280px`, gutter 22px mobile → 34px at 640 → 48px at 1024.
- Panel radius 18px; large media 24px.

### Mobile type floors (rebuilt pages)
- Body **16px** minimum. Section intro **18px**. Small labels/numerals 13px with .16em tracking.
- **Supporting copy is ONE size: 16px.** Never mix 14/15/16px for equivalent content — that is the
  noise the floor exists to prevent. Tiers, in full:
  card / panel action or value **22px display** ⬥ supporting copy **16px** ⬥ error messages and
  actionable helper text **16px** (errors are information, not microcopy) ⬥ input, select and
  textarea text **16px minimum** (sub-16px triggers zoom on iOS) ⬥ tertiary metadata (file
  formats, size limits, image captions) **14px** ⬥ customer-facing legal or privacy notes
  **14px minimum** ⬥ field labels and eyebrows **13px uppercase, .16em** ⬥ button labels
  **13–14px uppercase, .12em**.
- The display face is **Playfair Display** (`--font-display`). Not Fraunces — it is not in the
  design system.
- **Long unbreakable values wrap; they do not shrink.** The contact email is 22px like every other
  card action and wraps after the "@" via a zero-width space, so it can never split mid-domain.
  Measured against the CARD, not the viewport, because the page has three gutter regimes: it is a
  single line once the card is **≥356px wide**. That is a **400px viewport** in the single-column
  layout, and **~790–820px** in the 2-up band (792 at the 34px gutters from 640, 820 at the 48px
  gutters from 1024). So it is **two lines at every common phone width** — 320, 360, 375, 390, 393. A smaller size was rejected
  because 20px and even 18px still overflow a 320px card, so shrinking never solved the case it
  existed for. At 320px the decorative arrow is dropped (aria-hidden, and the whole card is a
  link) because the domain alone fits the column but the arrow does not.
- A **desktop** size may differ from mobile where the column geometry demands it — the contact
  cards hold 19px at 4-up, and the email 16px. That is a named geometry exception for one row, not
  a second type scale, and mobile is never reduced to satisfy a desktop constraint.
- Do not harmonise unrelated components that happen to sit 1px apart: the footer's consent line
  stays at its canonical 13px.
- Never two body sizes within ~2px of each other — that is noise, not hierarchy.
- Display sizes come from the design system scale: card/step titles 22px, section titles 48px on
  desktop (40px is the promo size, not a section size).

### Mobile purchase CTA + header behaviour (canonical, marketing pages only)
Scroll direction owns it: one purchase CTA visible at a time, and nothing inside the header ever
changes shape.
- Header **auto-hides on downward scroll** and returns on upward scroll. This supersedes
  "sticky" for mobile. Desktop (≥1024) never hides it and has no bottom bar.
- Bottom bar appears only once the hero's **"View the menu" CTA has left the viewport** AND the
  scroll is downward; scrolling back into the hero resets both to their normal state.
- **8px movement threshold + 120px floor**, so a jittery scroll cannot flicker the UI.
- Header does not hide while the **drawer is open**, nor while **keyboard focus is inside it**.
- Bar is **suppressed continuously from the point Private Table meaningfully enters view (its top
  crossing 75% of the viewport) through the entire footer.** Not a general principle — the named
  list is Private Table and the footer, and any addition needs explicit approval or the bar
  becomes unpredictable from page to page. Private Table because "Build a Box" beside a £1,500
  bespoke service is two different journeys and the pair reads as an upsell; the footer because
  the page has ended. Because the rule is continuous and positional, the footer is covered without
  being tracked separately — but it also means **anything placed below Private Table is
  suppressed**, so adding a section after it means revisiting this.
- A middle-band test was tried first and rejected: it released too early, letting the bar return
  over the tail of the section.
- **Scroll direction stays the single source of truth.** Releasing suppression never forces the
  bar back: scrolling up past Private Table lifts the suppression, and the bar then returns on the
  next downward scroll like anywhere else. Forcing it back would briefly show the header CTA and
  the bar together, which is exactly what the direction rule exists to prevent.
- Canonical, so all of this propagates to every rebuilt page.
- Bar stays hidden while **cookie consent is unresolved** — the cookie layer has priority. No
  banner exists yet; the `cookieUnresolved` prop stands in so the suppression is reviewable.
- Safe-area padding on the bar, so nothing is covered on iOS. Reduced motion removes both
  transitions.
- A bottom **clearance spacer is only needed where the bar can actually be visible at the end of
  the page**. On a page whose last sections are Private Table and the footer the bar is suppressed
  there, so the spacer is redundant and shows as a strip of page ground — remove it on that page.
  Not a site-wide deletion: keep it wherever the final section can still show the bar. The
  measured `--at-bar-h` stays either way; the bar itself reads it.
- **On a page with no Private Table, track the FOOTER directly.** The footer is on the named
  suppression list in its own right ("the page has ended"); the homepage only gets it for free
  because its positional Private Table rule runs through everything below that band. Use the same
  75%-of-viewport test, bound to the footer ref the page already has — never a second ref on the
  same element. Spacer is then redundant there too, for the homepage's reason.
- **Abby's Story v2 and Gifting v2 carry NO mobile purchase bar at all** — decided per page, so the
  rule above applies to pages that have one, and these two are not examples of it. Abby's Story is
  the founder narrative, and a fixed "Build a Box" beside it turns the story into a sales page;
  Gifting has two competing routes and a fixed CTA would push one over the other. On both, the
  header CTA is the route to the box builder at every width. Removing a bar means removing its
  state as well — the hero-CTA observer, the footer-suppression flag and the measured
  `--at-bar-h` all go; `dirDown` stays, because the header still auto-hides.
- **Images: never let a page load a source asset at its native size.** Decoded bitmaps cost
  width × height × 4 bytes regardless of display size and sit OUTSIDE the JS heap, so the tab is
  killed with no script error. Abby's Story v2 held 163 MB for a page displaying nothing over
  ~700px — two certificate scans at print resolution were 98 MB of it. Rules: resize to the
  displayed size at 2×; JPEG for photographs, PNG only for genuine transparency; `loading="lazy"`
  and `decoding="async"` on everything below the hero, the hero eager with
  `fetchpriority="high"`; bake filters (e.g. `grayscale`) into the file rather than applying them
  at runtime, which makes the compositor hold a second copy of the layer. Originals stay in
  `uploads/`; pages reference processed files in `assets/`.
  **Superseded in part by § Image production standards below** — that section refines the loading
  rule (position-based, not "below the hero"), caps full-bleed source width, and limits
  `fetchpriority`. Where the two differ, the section below wins.

### Image production standards
Proven on Homepage v2, which went from 9.8 MB to 709 KB desktop / 610 KB mobile at first render
(908 KB / 809 KB after a full scroll), and from ~26.6 MB to ~19.7 MB of decoded bitmap.
Apply to every page from now on.

**Format**
- Do not serve photographic PNGs in production unless PNG is genuinely required, such as for
  transparency. JPEG is the current default photographic format. Preserve original masters
  separately in `assets/` (or `uploads/`) — converting is never deleting.

**Source dimensions**
- Size photographic assets for their actual rendered use. Source width should not materially
  exceed approximately **2× the maximum rendered CSS width**. For full-width or full-bleed
  imagery, cap source width at approximately **1800px** unless a specific case requires more.
- "Approximately" and "should not materially exceed" are deliberate — this is a judgement, not
  an arithmetic test. A 1774px hero is fine; a 1402px photograph in a 505px column is not.

**Loading**
- Priority follows **viewport position**, not whether an image sits above or below the hero.
  Judge against two reference viewports so the answer is reproducible: **390×844 and 1440×900.**
- `loading="eager"` for an image required in or immediately around the initial viewport;
  `loading="lazy"` for photography meaningfully below it.
- **At most one `fetchpriority="high"` per page**, and only where that image is the likely LCP
  element. A page with no image-based LCP candidate uses none.
- `decoding="async"` is the default for photographic content.
- **Do not preload a below-fold carousel or gallery image merely because it is first.** Preload
  only where early discovery improves the initial viewport without competing with something more
  important. Homepage v2's dish rail sits ~2 screens down, so it gets no preload — the hero has
  uncontested priority.

**Production vs standalone export — a deliberate split**
- **Production:** responsive markup may use `srcset`/`sizes` where mobile and desktop differ
  enough to justify separate sources.
- **Standalone exports:** never bundle every responsive candidate — the bundler embeds all of
  them and the browser uses one. Before bundling, make an **export-only copy at the project root**
  using the single appropriate source per image, and convert runtime-assigned image/media URLs to
  embedded data URIs (see § 3n in build-handoff.md). Bundle that copy, then delete it.
- **Never modify a production page purely to accommodate the bundler's limitations.**
- After generating an export, **verify it offline**: every intended image and media file resolves,
  lazy assets load after scrolling, and there are no external asset references. Then delete the
  temporary copy.

**Runtime-assigned image sources**
- **Do not add `loading="lazy"` to an image whose `src` is assigned after mount** by the project's
  runtime image-assignment pattern (the `imgRef` / `IMAGES` map used by every dish surface). In
  this project that combination **fails silently**: the attribute is valid, the URL is correct,
  the console is clean, and the image never loads. Measured on Homepage v2 — two dish cards fully
  inside the viewport, correct `src`, `naturalWidth: 0`.
- For runtime-assigned images: keep the existing assignment behaviour unless it is deliberately
  refactored; use `decoding="async"`; do not assume native lazy loading is safe just because the
  attribute is valid HTML; and if deferred loading is genuinely needed, implement and test an
  explicit mechanism rather than adding the attribute alone.
- These images are already off the first-render path by virtue of being discovered after mount,
  which is most of what lazy would have bought.
- **Any change to this rule requires verification at the real breakpoint, after scrolling the
  image into view** — static code review makes this failure look correct.
- **The box-builder flow (Abby's Boxes, Add Dishes, Review, Extras, Dish Landing, Choose Box)
  uses the same pattern.** Do not copy Homepage v2's lazy treatment onto those runtime images
  when optimising them.

**Two gates**
- **Optimise the asset before increasing loading-system complexity.** A runtime-assigned image
  that loads immediately is not inherently a problem once the asset itself is the right size.
  Do not introduce an IntersectionObserver or a custom lazy-loader merely to make the
  initial-vs-full-scroll columns look different.
- **Performance QA is bytes AND pixels on screen.** Homepage v2 measured 362 KB at first render
  only because three photographs were not loading; the correct implementation is 709 KB. Always
  report payload, decoded memory, and confirmation that every image actually rendered — a number
  that improves because an asset vanished is a regression, not a win.
- **Gate 1 — network.** No production page ships an obviously oversized photographic asset, or a
  photographic PNG where an appropriately compressed format would transfer materially less.
- **Gate 2 — decode.** Small file size alone does not mean optimised. Check natural pixel
  dimensions against maximum rendered dimensions and reduce oversized sources. Homepage v2 is the
  proof: network fell ~96%, decoded memory only ~26%.

**QA check**
- For image-led pages record both: payload required for the initial viewport, and payload after a
  full scroll. If the two are effectively identical on a page with substantial below-fold
  photography, images are being loaded eagerly that should not be.
- Where desktop and mobile use different art-directed sources, **measure per breakpoint rather
  than summing mutually exclusive sources** — the homepage audit first read 12 MB when the real
  per-visit figure was 9.8 MB.

**Track B — decode/dimension backlog** (network is fixed on these; source dimensions are not):
`founder-1237.jpg` 1237×1272 for a ~492px column (6 MB decoded; ~4.1 MB at 1000px, ~2.6 MB at
800px) ⬥ How It Works v2's four `hw-*.jpg` at 1402×1122 for a ~505px column (~24 MB decoded
total) ⬥ Abby's Story v2, 14 images, ~31 MB decoded ⬥ Standards v2's five `std2-*.jpg` at 1200px
(~21 MB decoded) ⬥ both `hiw-poster-*.jpg` (5.3 MB decoded across breakpoints). Address as one
pass after the PNG/network work, not by reopening pages individually.
- **Transactional chrome is out of scope** — checkout/box-builder steps keep their own header.

#### "↑ Top" utility control (menu page; canonical if it propagates)
- A **navigation utility, not a CTA**: cream ground, green-forest ink, 1px sand hairline, restrained
  shadow. Never the filled-green or terracotta treatment — it must stay subordinate to Build a Box.
- **Visibility is derived from scroll POSITION, never a card count**, with two thresholds so it
  cannot flicker: mobile shows it once the menu band has passed ~1.75 viewport heights and hides it
  under ~0.9; desktop shows it once the first ROW of cards has left the viewport (measured from the
  first card) and hides it once that row is back.
- Mobile: 46px, 16px from the right, **14px above the purchase bar** — clearance read from the
  measured `--at-bar-h`, and it drops to the viewport edge when the bar is retracted. Desktop: 40px,
  24px insets, moving into the right gutter from 1440 (see Breakpoint exceptions).
- Scrolls to the page heading less the sticky header's height, never `window.scrollY = 0`, and moves
  focus to the h1. Fades and slides; `prefers-reduced-motion` removes both and the scroll jumps.
- **z-index 75: above the purchase bar (70), below the drawer, the filter sheet and consent.** It is
  suppressed while any of those are open. It stays visible over the footer — that is where it is
  most useful — which is the one place it deliberately differs from the purchase bar.

#### Delivery availability strip (menu page)
- Page-level context, so it sits under the lede, not in the filter card: it is not a filter and it
  does not change the results. Full width at a 14px radius on a phone, intrinsic pill centred from
  640. Ground is `--sage` — a real token, not a new panel colour — so nothing in it is brass.
- **The date is a VALUE, not copy.** Wording is fixed ("Next deliveries from …"); the date comes
  from an editable source like the £158 price, never a literal in the template. Placeholders carry
  the right weekday — a delivery promise is the last place to guess.

#### Hover language (rebuilt pages)
- **Interactive elements shift COLOUR on hover, never fade.** `--brass` on dark grounds, toward
  `--terracotta-deep` on light. Icon links shift their `fill`; text links shift `color` and keep
  the brass underline where one exists. One language for text links, icon links and buttons.
- Opacity fades are for non-interactive things only. The logo mark is the single exception — a
  wordmark, not a control.
- Three bugs this rule fixed, worth not repeating: the header login shifted brown →
  green-forest (two dark colours, so visually no change) while its neighbours went to terracotta;
  the social icons had a header rule AND a footer rule both setting `opacity: .72`, compounding
  to ~52%; and "Cookie preferences" had no hover at all because the rule selected `a` only and it
  is a `<button>`. **When a control changes element type, re-check every selector that styled it.**

### Close controls, dropdowns and icon colour (rebuilt pages)
- **Close is a plain 44px SVG cross**, green-forest, hover terracotta-deep, **no ring and no disc**.
  Set by the mobile drawer, the filter sheet, the cookie panel and the info notes; a brass-ringed
  cross on the gift-card checkout's help drawer was the single outlier and was removed. Always an
  SVG cross — a text `×` cannot be stroked or sized consistently.
- **Two dropdown classes, deliberately not merged** — they do different jobs. A **view control**
  (Menu v3's Sort) styles as a menu: brass icons, cream panel, tick on the active option. A **form
  input** (checkout's "How can we help?") styles as a field: white 52px trigger with a sand
  hairline, green-forest when open, cream-2 panel, sage hover/keyboard-active, blush + semibold +
  tick for the committed choice, no tick on the placeholder. Both are listboxes with the same
  keyboard contract (arrows/Home/End, Enter or Space commits, Esc closes the list only, Tab closes
  and moves on, outside pointerdown and focus-out dismiss) and both flip above the trigger when the
  space below cannot hold them.
- **Icon colour follows the icon's JOB, never the component it sits in.** Action, direction and
  dismissal icons — chevrons, arrows, crosses, reveal toggles — are **green-forest** on light
  grounds. **Leading identity marks** that label rather than act — the search magnifier, the
  category discs, the lock, the question mark — are **brass-ink**. Never two colours for one
  meaning: brass chevrons in one place and green ones in another is the exact inconsistency this
  rule exists to stop.
- **Named exception: a view control keeps its brass icons**, chevron included, because the menu
  styling is the thing that tells it apart from a form input. Applied case: Menu v3's Sort. This is
  the one place a chevron is brass, and it is deliberate — do not "correct" it to green, and do not
  read it as licence for brass chevrons anywhere else.
- On a **`--sand` chip** a mark takes green-forest, not brass-ink: brass-ink measures 3.97:1 there.
  Applied case: the reply-time clock in the help cards' note chips.
- Un-rebuilt pages still carry native `<select>`s, text `×` closes and brass chevrons. Fixing those
  is part of each page's own rebuild, not a separate sweep.

#### Current-page state in the desktop nav (canonical)
- `aria-current="page"` was already on the right link in every rebuilt header, but **nothing styled
  it**, so on desktop there was no way to tell which page you were on. The link now takes
  **green-forest ink, semibold, and a persistent brass underline** — the same underline the hover
  uses, so there is one language rather than a new decoration.
- **Three signals, never colour alone**: ink, weight and the rule. The inline `style` attribute on
  each link sets `color` and `border-bottom-color`, so the rule needs `!important` to win.
- **Hover deliberately overrides the current-page state.** The pointer reports what it is over, not
  where you are.
- Applied to all eleven rebuilt pages. The **mobile drawer is deliberately untouched**: its links
  sit on the dark ground, where brass measures 1.9:1 and cannot carry an underline or type, so it
  needs its own treatment decided at the drawer's next review.

### Button interaction (rebuilt pages)
- **No hover lift on buttons.** Hover is a colour shift, press is a slight colour deepen — the
  design system's rule ("fades and colour shifts, no bounces, no large motion"). A
  `translateY(-1px)` on the terracotta primaries came across from the old homepage and made three
  buttons the only ones on the page that moved; removed. Canonical, so it propagates.
- A **card** may still lift on hover (the dish card's 4px). Cards are not buttons.
- Any transform-based hover carries a `prefers-reduced-motion` guard.
- **Every button has a press state**: `filter: brightness(.94)` on `:active`, on top of whatever
  the hover does. Hover alone left the green and outline buttons with no press response.
- **Fill colour by role, not by importance.** `--terracotta` is reserved for the three persistent
  primaries — header pill, hero CTA, drawer CTA. In-page CTAs are `--green-forest` (How it works,
  Our standards, the mobile purchase bar) or outline (View the full menu, Read Abby's story).
  One approved exception: the Delivery & FAQs result panel's **Build a Box is terracotta at 52px**
  — user's call, taken knowingly. Do not "correct" it to green.

## Long documents (Terms of Sale, and any future clause-based page)
- **The index is navigation over ONE continuous document**, never a controller that swaps what the
  document shows. Every clause is always in the page: browser Find, printing, indexing, deep links
  and no-JS all depend on it, and swapping content is what caused every scroll-position bug on
  Terms.
- **Opening or closing a group must never change scroll position, the active clause, or the URL.**
  Scroll position changes only when the reader selects a clause, selects Top, loads a deep link, or
  uses Back/Forward. This is an acceptance test, not a preference.
- Group row = disclosure. Numbered clause = navigation. Same rule at every width.
- **Anchors are human-readable slugs** (`#refunds`), never clause numbers — numbers change when
  clauses are reorganised, meanings do not. Keep a legacy resolver for any number-based links
  already in the wild.
- `pushState` for a deliberate clause click so Back steps through selections; `replaceState` for
  passive scroll tracking, or ordinary reading fills the history.
- **Scroll tracking uses IntersectionObserver**, never per-frame measurement across every clause.
- **The observer is only a TRIGGER; it must be paired with a scroll-STOP pass.** It fires on
  intersection changes, so the final resting position can produce no event at all and the last
  mid-flight value sticks — clicking clause 9 landed on 9 with the index and the URL both saying 8.
  One debounced evaluation (~140ms after scrolling stops) fixes it and is not per-frame work.
- **A deliberate clause click locks the spy out until the scroll settles.** Otherwise every clause
  passed through `replaceState`s over the click's `pushState`, and Back steps through clauses the
  reader never chose. Release the lock on the settle pass, and carry a timeout fallback: a scroll
  that does not move fires no scroll event, so the lock would strand the spy for good. The
  fallback must BAIL if any scroll was observed — a long smooth scroll outruns the timeout, which
  released the lock mid-flight and let the index flicker through the clauses it passed.
- Heading outline is **page H1 → group H2 → clause H3**, matching the index, so screen-reader
  heading navigation mirrors the visible structure.
- Clause titles stay on the recorded panel tier (22px mobile / 26px desktop). A larger display size
  makes 56 repeated titles compete with page-section headings.
- Legal copy carries a **measure cap** (660px) on paragraphs and lists; panels, grids and notices
  keep their own widths.
- **Print CSS is the long-form legal-document treatment: Terms of Sale and Privacy Policy only** —
  the two pages customers print or save as PDF. Chrome, index, floating controls, every
  interactive control and the whole marketing footer come off; every clause goes on, expanded,
  with headings kept off page breaks. The page title, last-updated date, company and contact
  details and all substantive sections stay. Outbound links keep their address printed after them
  (`text-transform: none`, `letter-spacing: 0`, or a button's uppercase and tracking are inherited
  by the `::after`). Do not infer that other pages need print CSS — it is a named two-page list.
- **PDF export needs a generated `-print` copy built on the `doc-page` component** — the page's
  own `@media print` CSS serves the production site, not the editor's export. Browser print from
  inside the editor paginates the APP (tell-tale: a near-blank page and a `?file=…&present=1`
  footer URL), so no page-side rule can fix it. Generate the copy from the source's `<main>` with
  a parser — strip the index, the back-to-top links, every `ref`/`on*`/`{{ }}` binding and both
  `@media print` blocks — and regenerate it on every content change; it is plumbing, never linked
  and never hand-edited. Do NOT hand-write `@page` rules or declare `omelette-owns-print` yourself.
- **Print must reset the runtime host chain, and a print-relevant page sets NO `$preview` height.**
  The document lays out inside `#dc-root > .sc-host`; a preview height makes that a fixed box and
  print stops at the bottom of it — one page, however correct the content rules are. Set
  `height: auto`, `min-height: 0`, `overflow: visible`, `position: static` on `html`, `body`,
  `#dc-root` and `.sc-host`, all `!important`. `$preview` on Terms and Privacy is **width only**.
- **Hide the whole `footer` element in print, never a list of footer blocks.** Naming blocks left
  `.at-foot-cols` printing: three accordion column heads, collapsed, with no links under them.
  Rewrite print selectors against the page you are on — an inherited list silently misses
  whatever that page added.

## Motion and video
- Clips **loop continuously and carry a pause button**. Looping means the motion never stops, so
  WCAG 2.2.2 requires the control — it is a requirement, not chrome. Never remove it from a
  looping clip. (The alternative, play-once-and-rest, was considered and rejected: a 4s single
  play is over before it registers.)
- Control: 44px hit area, 34px cream disc, brass hairline, brass-deep glyph, inset 6px
  bottom-right of the media box. Label toggles "Play the video" / "Pause the video".
- An explicit pause is **remembered** — re-entering the section must not restart playback.
  Playback pauses off-screen otherwise.
- Source attached at a **400px root margin** with `preload="none"`; poster shown immediately.
  `prefers-reduced-motion` downloads and plays nothing — poster only, button becomes opt-in Play.
- Silent always. Geometry reserved with `aspect-ratio`.
- A looping clip must **cut back to its opening frame without a visible jump** — first and last
  frames need to match. Record this in the shoot brief for every clip.

### Full-bleed carousels (rebuilt pages)
- A horizontal card track may overflow the content grid on the RIGHT so the next card peeks in.
  It must NOT start left of the grid: its left padding is the 1280 grid line
  `max(48px, calc((100% - 1280px) / 2 + 48px))`, not the viewport gutter, or the first card sits
  further left than the section above it and the two read as different layout systems. Apply the
  same value to `scroll-padding-left` so snapping agrees.
- Heading, intro, scroll indicator and CTA stay on the ordinary 1280 grid — only the track bleeds.

### Section transitions (rebuilt pages)
- Cream bands stay on the SAME cream: between two cream sections the transition comes from the
  heading and spacing, never a divider or a slightly different cream.
- **Specific sections DO get their own full-bleed coloured band** — approved: Our standards
  (`--sage`), and Abby's Story and Private Table when we reach them. This is a named list, not a
  licence to alternate bands page-wide, and the ground must be a real token.
- `--sage: #E1E2D2` — Our standards band. green-forest 9.4:1 and brown 10.2:1 on it, so type is
  safe; **brass is 2.2:1 and the hero's gold only 1.2:1**, so neither works on sage — marks and
  icons there use `--brass-ink` (4.3:1).
- The gap between two sections is ONE intentional value, split across the two sections' paddings:
  **~64px mobile, ~68px at 640, ~76px from 1024.** Change both paddings together — they were
  independently chosen once and compounded to 98px, which read as an accidental hole.

### Breakpoint exceptions
- Menu page "↑ Top" control — **min-width 1440px** — the width at which the right gutter can hold
  the control clear of the cards, so it stops sitting over photography. It is 82px wide and keeps a
  28px edge inset, so it needs ~110px of free gutter, and (viewport − 1280) / 2 plus the 48px page
  padding passes that at 1440. Below it, 24px over the card is the accepted fallback. Content
  reason, not a device size.
- Homepage hero facts row — **min-width 1280px** — three benefits across need ~590px; the hero's
  copy column (56% of the viewport less the 1280-cap gutter) gives 477px at 1024 and 621px at
  1280. Below it they stay stacked, one line each. Content reason, not a device size.

### Desktop hero composition
- The hero is **ONE continuous photograph**, never a green panel beside a photo. A visible
  vertical seam reads modular and generic; the brand wants an immersive editorial scene.
- The 1280 cap governs **alignment only** — it is not an instruction that everything stops or
  splits at 1280. The image stays full-bleed.
- The protected copy zone comes from a **feathered left overlay** that reaches zero before the
  food, so the bowl keeps its luminosity. Never a flat wash across the whole image.
- Desktop uses the **2:1 crop**; mobile uses the 3:4. Do not serve the 3:4 to desktop — it looks
  like the mobile framing.
- Hero height is content-driven, so between 1024 and 1279 the 2:1 image is height-driven and the
  food sits further left; the overlay carries legibility there. Accepted, not a defect.
- Hero max-height 780px. Above ~1864px wide this is what governs the hero, and it trades vertical
  crop against how much of the next section shows on a 1920×1080 screen. The bowl/copy clearance
  does NOT depend on it (the image is width-driven at every desktop width). Do not raise it
  further to fix ultrawide cropping — that is an image/art-direction problem (bigger master, or a
  crop shot for the ratio), never a hero-height one.
- 640–1023 is the **mobile composition at a wider measure** (copy 560px, button and link side by
  side), not a desktop layout. A wide-but-short device — an unfolded Galaxy Z Fold, ~673×800 —
  therefore gets that treatment and its copy runs further across the image than on a phone. Looked
  at and accepted; the overlay carries it. The hard break after "scratch," is what stops the
  subline running the full width there, so do not remove it.
- **Never cap the whole page** and expose page background at the sides — full-bleed bands with
  1280 centred inner content is the architecture; a boxed site loses the immersive feel.

### Imagery
- All current food/hero imagery is AI-generated **placeholder**, to be reshot before launch.
- **Never substitute unrelated imagery as a stand-in** \u2014 no dish photo standing in for a video
  poster, no borrowed shot filling a gap. If an asset is missing, ASK the user for it and leave
  the container reserved until it arrives.
- **`photography-shot-list.md`** (project root) is the running shoot brief — crops, aspect
  ratios, negative-space requirements, what's missing. Add to it as each section is designed;
  read it before specifying any new image.

### Measured, not restated (learned building the dish carousel)
- **Never hard-code a number that describes another element.** If a spacer, clearance or offset
  depends on something content-dependent, MEASURE it: write the value to a custom property from a
  `ResizeObserver` and let the consumer read it (`height: var(--at-bar-h, 85px)`). The mobile bar's
  clearance literal drifted 70 → 76 → 77 → 85 and was still wrong at 320px, where the price label
  wraps and the bar grows to 94.
- A `ResizeObserver` callback that mutates layout must **dedupe and defer**: bail out when the
  value is unchanged, and write inside `requestAnimationFrame` (cancelling the previous frame).
  Writing directly from the callback changes page height, which can flip the scrollbar, which
  resizes a full-width fixed element, which re-fires the observer — "ResizeObserver loop completed
  with undelivered notifications", plus visible jitter. Cancel the frame on unmount.
- **`width: 100%` resolves against the nearest constrained ancestor, not the gutters.** A text
  measure on a wrapper that also contains controls silently caps them. Put the measure on the text
  elements, or keep controls out of the measured wrapper.
- After any structural width change, check **320, 360, 375, 390, 393 and 430**. Two of those
  behaving differently is a capped width, not a device quirk.

### Cards and repeated content
- **The menu's dish card is the homepage card with two named departures**, both because the surface
  differs: the description is shown at EVERY width (the carousel is a taster; the menu is where
  people choose), at 16px on a phone per the body floor and the approved 14.5px from 640; and on
  mobile the card carries **no two-line clamps and no reserved min-heights** — one card per row, so
  there is nothing to align to and the reserved space only truncated long names and left voids. The
  clamps and reserved heights return at 640, where cards sit side by side and rows must align.
- The card's data block is **two fixed rows** — heat pips + the heat WORD on the first, protein and
  fibre on the second. One wrapping row broke at a different point on every card. The homepage card
  leaves the heat word off; on a menu it is stated, because that is what is being scanned for.
- **A disclosure note belongs in the flow of the block it explains, not floating over it.** The
  filter sheet's "Eating style" note opened over its own trigger and its group label and covered the
  chips beside it; in flow between the head and the chips it can never overlap or be clipped by the
  sheet's scroll box. Every note carries an ×, closes on Esc, on a tap outside and on a second tap
  of its "i", and only one note is open at a time.
- **A floating panel's caret is a rotated SQUARE carrying two of the panel's own borders**, never a
  solid triangle: a triangle paints over the 1px outline and the border visibly stops either side of
  the notch. Rotated, its fill covers the segment behind it and its two edges continue the line.
  Its offset is measured to the trigger's centre, not eyeballed.
- **Equal-height cards need every field populated.** An optional block inside a card whose footer
  is pinned with `margin-top: auto` leaves a dead void when absent — the neighbours look finished
  and that one looks broken. Either make the field required or drop the equal-height pin.
- A `{{ }}` hole in an `img src` is **fetched verbatim while streaming**, firing a 404 for
  "{{ d.image }}" and flashing broken images. Write a literal `src` and set the real one in a ref.
- **`alt` belongs to the photograph, not to the record.** Keep it beside the image path (one
  `{src, alt}` entry per photo) so a stand-in describes what is actually on screen. Alt generated
  from a dish name will confidently describe food that is not in the picture.
- An interactive control cannot live inside a card-wide `<a>`. Put it in a sibling overlay with
  `pointer-events: none` on the container and `auto` on the control — taps still fall through to
  the card link.
- **A tooltip's ANCHOR decides whether its caret can point at anything.** Anchor to the element
  the caret must point at, or measure the offset at runtime. When "point at the trigger", "stay
  level with it" and "don't cover X" cannot all hold, that is a decision to take (reorder the
  elements) — not another clamp to add.
- Design-system tracking is set for eyebrows (.16em). In a compact data row it reads loose —
  override locally (.06em) rather than shrinking the type.

### Runtime gotchas (learned building the hero — apply to every component)
- **A modifier class does not beat a later base-class rule.** `.mn-note-pop` and `.mn-note` were
  both (0,1,0) and the base rule came later in the sheet, so a `margin-top: 0` on the modifier lost
  and an absolutely-positioned panel sat 14px below its authored position with its caret detached.
  Write the modifier as two classes (`.mn-note.mn-note-pop`) or declare it after the base.
- **A text input must `align-self: stretch` inside a tall field.** At its intrinsic ~21px height
  only the text line focuses it, so a 52px-looking search pill is a 21px target. Never wrap the
  field in a `<label>` to fix this when it also holds a clear button — a label may not contain
  another interactive control.
- **An icon beside centred, wrapping text must be INLINE, inside the text run.** As a flex sibling
  the text span claims all remaining width the moment it wraps to two lines, leaving no free space
  for `justify-content` and stranding the icon at the column's left edge — worse the wider the
  column. Inline, it sits against the first word at every width.
- **Swap `role="dialog"`/`aria-modal` off when a sheet becomes an inline panel at desktop.** A
  static panel announcing aria-modal tells a screen reader the rest of the page is unavailable. Same
  pattern as the footer heads: set it in JS, and re-assert the mobile values on the way back, since
  React only rewrites an attribute when ITS value changes.
- **Heading levels are part of the page, not the component.** The menu has no section heading
  between its h1 and its cards, so the card titles are h2 there — an h3 skipped a level and the
  heading list read H1 then H3 eight times.
- **An attribute that mirrors state must be written from the NEXT value, in the handler.** A frame
  scheduled after `setState` still reads the old value, and a stable ref callback is never
  re-invoked — so `aria-expanded` sat at "false" while the panel was open. Compute `next`, set the
  attribute from it, then `setState`.
- **Never assert a transitioned property in a hidden or unfocused document.** Transitions do not
  advance there, so the computed value sits at its START — which reads exactly like a control
  painting one state behind. A switch was diagnosed as a repaint bug on that evidence and "fixed"
  with 25 lines of attribute-syncing that solved nothing. Disable the transition first
  (`transition: none !important`), then assert; and check `document.visibilityState` before
  believing any style measurement. A cached-looking computed style (an injected `!important` rule
  changing nothing) means the renderer is wedged — reload and re-measure rather than diagnosing.
- **Style children of a `{{ }}` hole with DIRECT-child selectors.** A hole nests an inner
  interpolation span inside the element you wrote, so a descendant selector matches both and the
  INNER one paints. `.btn span:first-child` restyled the wrapper's inner span and a 13px sub-label
  rendered at 22px display, inflating that button to twice its neighbours' width. Use `>` (or
  explicit classes). Where the inner span happens to inherit the intended style the bug is hidden,
  not avoided.
- **A `<figure>` carries a 40px UA side margin.** It is invisible while the element uses a
  `margin` shorthand and reappears the moment you switch to `margin-top` — which you must, if the
  figure ever needs auto side margins (an inline shorthand sets left/right to 0 and beats any
  non-important class rule). Zero them explicitly. Four photographs rendered 80px narrower than
  their own column this way.
- **`grid-column-start` alone cancels the span from a `grid-column` shorthand.** `grid-column:
  span 2` expands to `start: span 2 / end: auto`; a later `grid-column-start: 2` replaces that
  start, resolving the item to ONE track. Set both edges in one declaration
  (`grid-column: 2 / span 2`).
- **A filled anchor button must re-state its `color` on `:hover`.** The global `a:hover` rule
  (0,1,1) outranks a button class (0,1,0), so a white label took the link hover colour on a fill
  of that same colour and vanished. Only bites buttons that set their colour in a CLASS — inline
  colour is immune, which is why it can hide for a long time.
- **Cell borders do not make a divider in a partially-filled grid row.** A `border-top` on cells
  that start mid-grid draws a segment floating across the middle. Put the rule on the container,
  or separate the rows with padding.
- **Every `<button>` needs an explicit `type`.** The default is `submit`; three shipped without it.
- **A `ref` has to be wired at BOTH ends, and a bound attribute is not proof it resolved.**
  `footHeadRef` was returned from `renderVals` but never bound in markup; later `hoursPanelRef`
  was bound AND in `renderVals` and still arrived null at runtime. Audit both directions (holes
  with no key, keys with no hole), and for a **one-off measurement on an always-mounted element,
  prefer `getElementById`/`querySelector` over a ref** — it cannot be left half-wired. Three
  occurrences of this class so far.
- **`componentDidUpdate` is never called** by this runtime. Scroll locks, focus moves and any
  other side effect must live in the handler (`open()`/`close()`) or in a ref callback.
- **`setState`'s commit callback is never called either**, so post-render DOM work has no hook:
  start it from the handler and poll for the condition proving the render landed — on rAF AND a
  timer, bounded by wall-clock (not a frame count), cancelling both on close/unmount. Verified
  fallback for this runtime, not a general pattern. Canonical implementation: the drawer's
  `_takeDrawerFocus()` in Homepage v2; full account in build-handoff.md § 3x.
- **Refs passed to the template must be stable class fields, never arrows built in
  `renderVals()`.** A new identity each render makes React detach the old ref with `null`, and
  `renderVals()` runs on scroll here (header auto-hide), so the ref is torn down constantly and is
  unreliable exactly when a handler reads it. This was half of the drawer focus bug; fixing it
  alone did not move the symptom.
- **Preview host has previously produced per-URL stale asset failures** (design-system CSS and an
  image, failing on the plain URL while any query string returned 200). Before changing any asset
  path or adding a cache-buster, reproduce it and read build-handoff.md § 3y.
- **Take focus in the ref callback**, not after `setState`. An `<sc-if>` panel mounts during
  commit, so a single `requestAnimationFrame` still fires before the ref exists.
- **An always-mounted `display: none` panel has the SAME focus-timing problem as an unmounted
  one.** `focus()` on a hidden element is a no-op, and one frame after `setState` still finds it
  hidden — the panel appeared with focus left on `<body>`. Re-assert until `offsetParent` is
  non-null, bounded so it cannot spin. "Always mounted" fixes `aria-controls`, not focus.
- **A `visibility: hidden` element cannot take focus either**, so returning focus to a control that
  is only sometimes visible silently drops it to `<body>`. Check `offsetParent` and computed
  `visibility` first, and give the return a fallback target (the page `<h1>` with `tabindex="-1"`).
- Body scroll lock via `overflow: hidden` **works**. `window.scrollBy()` bypasses it, so it is
  not a valid test — do not "fix" a working lock on that evidence.
- **A spanning grid item distributes its extra height into the rows it spans.** A form spanning two
  sidebar rows inflated the first one and pushed the second cell to the bottom of the column. Add a
  flexible spacer row and span into that: a spanning item does not grow inflexible tracks when it
  also spans a flexible one.
- **CSS can only move a cell between positions within the SAME grid.** If an element must sit in
  one place on mobile and another on desktop, both positions have to be cells of one grid — that is
  why the Contact body is a single 12-column grid rather than a cards grid plus a form/sidebar
  grid. Never reparent with JS to fake it, and never ship a second copy.
- **Making a text run a flex container changes the text.** `display: flex` turns each fragment into
  an item: trailing whitespace between them is trimmed (an arrow lost its space from the label),
  `gap` lands between them (an 8px gap fell either side of a zero-width space, opening a 16px hole
  mid-email), and a zero-width space is **not a break opportunity between flex items**, so a long
  string overflows instead of wrapping. Keep a text run plus its trailing glyph inside ONE inline
  child and space it with `gap` on the parent.
- **Media-query blocks must be ordered ascending.** A `min-width: 640` rule written after a
  `min-width: 1280` block wins at 1280 too. And `!important` at one breakpoint must be matched at
  every wider one, or the narrower rule keeps winning.
- **Media queries add NO specificity.** A `.cls[data-x="true"]` rule (0,2,0) written for mobile
  beats a plain `.cls` rule (0,1,0) inside `@media (min-width: 1024px)`, so a mobile-only
  presentation survives into desktop. Match the selector's specificity in the wider block — and if
  the state is mobile-only, also clear it in JS on resize, or it persists with its dismiss control
  hidden.
- **Never align columns with a min-height.** A min-height tuned to one column width is wrong at
  every other width, because the column is content-dependent. Use shared row tracks (CSS subgrid)
  so the alignment holds everywhere and degrades to ragged rather than broken.
- **Never size anything from a `clamp()` value.** Rendered height is content-driven and usually
  larger. Measure the real box before doing crop or clearance arithmetic.
- **Hyphenated compounds never split across lines.** Wrap the compound alone in
  `<span style="white-space: nowrap;">` — "ultra-processed", "high-quality", "Chef-prepared" —
  so wrapping still happens at the spaces either side. Where the string comes from DATA and has no
  markup hook, a non-breaking hyphen (`\u2011`) carries the rule **in the prototype only** — for
  the build, keep hyphens ordinary in the data and protect approved compounds at render time
  (`build-handoff.md` § 3e). Prefer a markup hook where one exists: tag pills use `nowrap` on the
  pill. Do not blanket-apply — a long compound forced unbreakable can overflow a narrow column, so
  test at the narrowest width first. Never a hard `<br />` and never nowrap on the whole phrase: nowrap on a flex item that cannot grow overflows into its neighbour instead of
  wrapping. If a column is then too narrow for a sensible break, give it width (content-sized
  columns), do not add a breakpoint.
- **No `ch` units to force a line break.** `ch` is the zero-glyph advance (~30% wider than
  average lowercase), so it cannot land a break reliably. Use an explicit `<br />` and comment it.
- Hard breaks in display copy taken from an approved mockup are art direction: keep them and say
  so in a comment, or the next person removes them.
- **An inline `margin` shorthand beats any non-important class rule.** Elements in these files
  carry their spacing inline, so a new `.class { margin-bottom: … }` silently loses. Change the
  inline value; never reach for `!important` to win against your own markup.
- **Hit area on the interactive element, decoration on an inner span.** A border on a 44px flex
  box lands ~14px below the text; it belongs on the label.
- Uppercase via `text-transform`, sentence case in the markup — literal capitals get spelled out
  by some screen readers.
- Focus ring: `--brass` on light grounds; on dark grounds a cream ring with a `--gold` outer edge
  (brass is only 1.9:1 on green-deep). Dark-ground values are **2px cream outline at offset 0 plus
  `box-shadow: 0 0 0 3px var(--gold)`** — cream flush to the control, gold a hairline edge
  outside it. The outline paints over the shadow, so the visible gold band is
  (spread − outline width): a literal 2px spread hides the gold completely. Never a glow — 5px of
  gold around a 52px pill read as a halo, and 4px was only 1px thinner. Same language on every
  control, no per-control exceptions.
- **Sample a mockup's colour before inventing a token for it.** A large warm area next to a warm
  photograph reads lighter than it is: the founder band looked like a new peach and measured as
  the existing `--blush` within three units.
- Measuring a generated mockup: sample pixels, and use the mean of the top ~15% of matching
  pixels, not the peak — peaks on thin antialiased strokes overstate the colour.

### Canonical copy
- The **header pill next to "Log in" reads "Get started"** — on all twelve rebuilt pages. It is the
  only control with that label; the drawer pill, the mobile purchase bar and every in-page CTA stay
  **"Build a Box"**. Do not harmonise them: the header is the top-of-funnel entry point, the others
  act on an order.
- The order CTA is **"Build a Box"** everywhere else (drawer, purchase bar, page CTAs). Not "Build
  Your Box".
- How it works **step 01 is also "Build a box"** — user's call, taken knowingly over "Build your
  box"; the repetition with the adjacent CTA is accepted. Do not "fix" it.
- Price wording is canonical, the **value is not**: `6 dishes from [price]`, currently resolving to
  **"6 dishes from £158"**. The wording and presentation are fixed; £158 comes from an editable
  price source so it can change before or after launch without a code change. Never hard-code it
  into a template as literal copy.
- The £95 / 6–12–18 ladder still in Choose Box and the rest of the funnel is **obsolete**, not an
  open question — reconcile the funnel to the flexible-quantity model. Never let the old ladder
  dictate copy on a rebuilt page.
- **Do not design states Abby's Table does not have.** No sold-out dishes, no price-unavailable,
  no empty menu, no delivery-unavailable or retry screens. Ordinary technical failure handling is
  a development concern, not a design backlog. Document what exists or is a known requirement.

### Build handoff
- **The prototype defines look, copy and behaviour — NOT the production rendering architecture.** These pages render client-side because that is what makes them editable here. A production build should server-render or statically render marketing content. Do not carry client-side rendering patterns into the build.
- CLAUDE.md holds RULES (terse, checkable). Explanation, rationale, state matrices and developer
  prose belong in **`build-handoff.md`** (project root) — read it before build-related work.

## Layout widths (desktop-first pages — being replaced by the rules above as pages are rebuilt)
- **Header + footer shell:** `max-width: 1440px`, side padding `48px`.
- **Content band** (the container holding page content, grids, copy): `max-width: 1280px`, side gutter `48px` (desktop) dropping to `20px` on mobile, `margin: 0 auto`.
- This matches the design system: "1440px frame, ~1280px content with a side gutter."
- Do NOT introduce new content widths (no 1180 / 1240 / 1340) or new gutters (no 24 / 44). If a page needs a different width, ask first.

### Current status (all standardized)
- Homepage — content 1280 / gutter 48 / footer 1440 ✓
- Dish detail — content 1280 / gutter 48 / footer 1440 ✓
- Menu landing — content 1280 / gutter 48 / footer 1440 ✓
- Choose box — content 1280 / gutter 48 / footer 1440 ✓
- Add dishes — content 1280 / gutter 48 / footer 1440 ✓

## Checkout-flow step chrome (Steps 1–5: Choose box → Add dishes → Extras → Review → Checkout)
**SUPERSEDED for rebuilt steps.** This section describes the OLD desktop-first step chrome (header stepper, in-body "Step N of 5" eyebrow), kept only because Extras, Review and Checkout still use it. Rebuilt steps follow "Checkout flow — conventions" above: copy the chrome from **`Abby's Table - Choose Box v2.dc.html`** / **`Abby's Table - Add Dishes v2.dc.html`**. When Step 3+ is rebuilt, clone a v2 step and swap only the body content.

- **Header:** logo (`.at-logo-mark` width **168px**, height 29px) → spacer → desktop stepper → spacer → Questions button. Header row `gap: 26px; padding: 16px 48px; max-width: 1440px`. Back button is NOT in the header.
- **Back button:** lives in the BODY, first child of `.at-main-wrap`, `margin-bottom: 18px` (label hidden < 640px). Never in the header.
- **Body eyebrow:** `Step N of 5`, font 13px / `letter-spacing: .18em` / uppercase / brass. Then `<h1 class="at-h1">` at **50px** (→ 40px at ≤720px). Intro `<p>` max-width 560px.
- **Desktop stepper:** `flex: 0 1 720px`, each step `width: 74px`. State treatment (identical on every page):
  - **done:** `bg green-forest`, `ring green-forest`, `numColor white`, `showNum:false` (check icon), `labelWeight 500`, `labelColor brown`; the connector line *before* it is green-forest.
  - **current:** `bg surface-bright`, `ring brass`, `numColor brass`, `showNum:true`, `labelWeight 600`, `labelColor green-forest`.
  - **todo:** `bg surface-bright`, `ring sand-2`, `numColor taupe`, `showNum:true`, `labelWeight 400`, `labelColor taupe`; connector line sand.
  - Connector `leadColor` is green-forest only when the *previous* step is done, else sand.
- **Mobile stepper:** `flex: 1 1 auto`; progress bar `width: min(220px, 52vw)`, fill = `N/5`.
- **"Your box" sidebar:** `.at-summary-col` sticky `top: 104px` (96px in the 861–1080 tablet state). Green header (`padding 18px 22px`, radius `18px 18px 0 0`, brass box icon 24px, "Your box" 21px blush). Column width **372px** desktop, **320px** at 861–1080.
- **`.at-main-wrap`:** `max-width: 1280px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 30px 48px 64px` (→ `26px 22px 40px` at ≤1080). Must be `width:100%` or it shrink-wraps in the flex column and the band width jumps between steps.
- **Footer + mobile bar:** copy verbatim (footer `max-width: 1440` / `padding: 40px 48px`, foot logo blush 176px).
- **Shared responsive breakpoints (identical on every step):** stepper collapses to mobile + header wraps at **≤1080px**; tablet 2-col with 320px sidebar at **861–1080px**; sidebar hidden + mobile bar + stacked footer at **≤860px**; h1 40px at **≤720px**; back/help labels hidden + header pad 16px at **≤640px**; logo 120px at ≤440px. Never let two steps use different collapse widths.
- **Preview canvas:** `$preview` width **1340** on every step so they scale identically in the editor.

## Design system
- Bound design system: Abby's Table (`_ds/abby-s-table-design-system-...`). Load the bundle in every DC and compose with its components. Use `var(--*)` tokens; never invent colors/type/spacing.

## Working practice
- **Never ship a live-looking control that does nothing.** An inert handler behind a filled
  primary button is worse than no button: on Privacy it sat under copy promising customers they
  could change their cookie choices "at any time". Either build the behaviour, or downgrade the
  control and soften the copy to match what the page can actually do.
- **Fill by role still applies to utility actions.** A utility control gets the outline treatment
  (`.at-p-cta-out`), not the section-CTA fill, whatever its importance to the page's compliance.
- **A question is not an instruction to build.** When asked whether something changes our
  standards, whether an approach is right, or what the options are — answer, then stop and wait
  for confirmation. Build only when asked to build.

### Copying a page as the basis for a new one
- Always strip the inherited CSS **and its comments**. A page copied from another arrives with
  dozens of rules and comment blocks describing sections it does not have; comments left behind
  after their rules are deleted are worse than the dead rules, because the next reader trusts the
  prose. Contact needed 26 rules and 41 comment blocks removed.
- **Deleting a rule line can take an unrelated selector with it.** The footer Join button lost its
  press state because `.at-foot-join:active` shared a line with `.at-chk-btn:active`. After any
  bulk strip, re-check the components you did NOT intend to touch.
- Audit false positives to expect, so they are not "fixed" later: a class applied through a
  `{{ hole }}` looks unused because it never appears in a literal `class` attribute; tag names
  inside HTML or CSS comments look like real tags to a regex; a class member reached by bracket
  access (`this["toggleG" + i]`) looks unused; an `alt=""` set from a ref looks like a missing
  alt; and `<option value="">` is the correct empty placeholder, not an orphan attribute.
- **Removing a class from markup leaves a double space** where the attribute was. That is enough to
  break byte-parity on a shared component — collapse `<tag  ` back to `<tag ` after any bulk
  class strip.

### Recording measurements
- **Write down the measurement, not a number derived from it.** A wrap threshold recorded as a
  viewport width was wrong twice, because the page has three gutter regimes; recorded as "a card
  width of 356px" plus the derived figures, it survives a gutter change.

## Voice & content
- Warm, plainspoken, sentence case. UPPERCASE only for eyebrows/labels with wide tracking.
- No emoji in brand copy. Lozenge ⬥ as separator. No ® on the wordmark anywhere on the site.

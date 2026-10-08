---
spec_id: SPEC-2026-10-07-marketing-pages
title: Marketing pages — Homepage v2, How It Works, Our Standards, Abby's Story, Allergens, legal, Contact, Private Table
status: approved
branch: feat/marketing-pages
owner: michaeljosiah
capabilities: [marketing-pages, homepage, legal-pages, contact-page, private-table]
created: 2026-10-07
updated: 2026-10-07
---

# Marketing pages

> **Status (2026-10-07): approved, partly implemented.** Written after most of it shipped, so the
> requirements for built pages describe what `web/` does on `main` at 213ee0b, read from the
> source. Implemented: How It Works (#16, PR #55), Our Standards and the Back to dish round trip
> (#17, PR #54), Abby's Story (#18, PR #52), Allergens (#19, PR #49), Privacy Policy and Terms of
> Sale (#20, PR #56), Homepage v2 (#15, PR #59), Contact (#24; its form waits on aonik#356) and
> Private Table (#25; its waitlist waits on aonik#357) — the last three specified from their
> issues and `design/` page files. Where an issue and `design/`
> disagree, the design wins and the requirement says so. Header, drawer, footer, cookie consent,
> the purchase bar's mechanics and the status pages are in `SPEC-2026-10-07-site-chrome-and-consent`.

## Why

The repository is spec-driven: the specification in `docs/specifications/` is the unit of work.
The v2 marketing pages were built from issues and the `design/` folder without one, and review
flagged a page PR (#52) for that. Issue #41 plans this spec. It records the requirements those
pages meet, or will meet, so that a reviewer has a definition of done to check against.

Depends on: `SPEC-2026-07-22-catalog-browse` (dish records, the box plan),
`SPEC-2026-10-07-site-chrome-and-consent` (chrome, purchase bar, consent).

## What changes

- ADDED marketing-pages — rules every marketing page shares: verbatim copy, figures from data,
  no inferred allergens, "to be confirmed" company details, no link to an unbuilt route,
  placeholder imagery, an explicit purchase-bar roster (FR-01–FR-07)
- ADDED homepage — the v2 homepage: section order, hero, How it works band, dishes, Our
  standards, founder and Private Table (FR-08–FR-13)
- ADDED marketing-pages — `/how-it-works` (FR-14), `/standards` and its Back to dish round trip
  (FR-15, FR-16), `/our-story` (FR-17)
- ADDED legal-pages — `/allergens` (FR-18), `/privacy` and `/terms-of-sale` (FR-19, FR-20)
- ADDED contact-page — `/contact`: one grid, details and hours from configuration, the message
  form, and never a false "sent" (FR-21–FR-24)
- ADDED private-table — `/private-table`: the page, every CTA "Join the waitlist", the waitlist
  form and its fixed country list, never a false "joined", and the bar's waitlist variant
  (FR-25–FR-29)

---

## Requirements

### Requirement: FR-01 Copy is verbatim from the design
`capability: marketing-pages` · `delta: ADDED (feat/marketing-pages)`

Each page SHALL render its copy verbatim from its page file in `design/`, including the hard line
breaks the design marks as art direction (the Homepage and Standards headlines). Copy SHALL change
only when the design does. A page MAY depart from the design's words only where they would state
something untrue of the product; each departure SHALL be commented at its use site and listed
under "Known gaps" below. Founder, health, credential, allergen-safety and legal copy SHALL NOT be
reworded at all.

#### Scenario: Abby's Story is the founder's own account
- **WHEN** `/our-story` is compared with `Abby's Table - Abby's Story v2.dc.html`
- **THEN** every word matches
- **AND** no statement about her career, diagnosis or study is reworded, extended or tidied

#### Scenario: A departure is recorded, not silent
- **WHEN** the design says "UK-wide delivery" and the product delivers to mainland UK only
- **THEN** the page reads "Mainland UK delivery", with a comment at the use site
- **AND** the departure appears in this spec's Known gaps

### Requirement: FR-02 Prices, minimums and dates come from data
`capability: marketing-pages` · `delta: ADDED (feat/marketing-pages)`

No price, box minimum, dish count or delivery date SHALL be written into markup. Minimums and
"From" prices SHALL come from the tenant's box plan through `buildBoxSizeModel`
(`src/lib/how-it-works/boxSizes.ts`) and `purchaseBarOffer` (`src/lib/purchase-bar/offer.ts`),
held in pence and formatted by `src/lib/format.ts`. The canonical wording is fixed and the value is
not: "6 dishes from £158" / "Minimum 6 dishes · From £158" resolve from data. When the plan is
unavailable the line SHALL name no number rather than guess one, and the page SHALL still render.
A page that states a minimum and carries the purchase bar SHALL read both from one plan read: Our
Standards' closing line takes its minimum from the offer `getPurchaseBarData()` resolves for its
bar, so the two cannot disagree (T10; box pricing is no longer read for it).
No marketing page SHALL show the earliest delivery date; it belongs to the ordering funnel.

#### Scenario: The price changes without a frontend change
- **WHEN** the plan's six-dish price changes from £158 to £165
- **THEN** the homepage note, the purchase bar and How It Works all read "From £165"
- **AND** no file in `web/src` changes

#### Scenario: No plan, no guessed figure
- **WHEN** Aonik cannot supply a box plan
- **THEN** Our Standards' closing line reads "Choose your dishes, personalise where available,
  and pick your delivery date."
- **AND** the page answers 200

### Requirement: FR-03 Allergens and nutrition are never inferred
`capability: marketing-pages` · `delta: ADDED (feat/marketing-pages)`

Allergen, ingredient and nutrition information SHALL appear only where a source published it.
`/allergens` names the UK regulated 14 and makes no claim about any dish. A dish with no published
allergens shows "Allergen information is not yet published for this dish." with a contact route.
Our Standards' example dish panel is labelled "Example dish information". A page SHALL NOT claim
that ingredients or allergens are shown "on every dish" while any dish lacks them (see open
question 6 for the homepage's nutrition line).

#### Scenario: Absent data is stated, not filled
- **WHEN** a dish record carries no `allergens`
- **THEN** its page shows the not-yet-published notice and a contact link
- **AND** no allergen list, "free from" claim or plausible default appears

### Requirement: FR-04 Placeholder company details render as "to be confirmed"
`capability: legal-pages` · `delta: ADDED (feat/marketing-pages)`

Company details SHALL render from `src/lib/content/company.ts` (`COMPANY`), whose values are all
`null` until the owner confirms them; a `null` value SHALL print the design's "to be confirmed"
mark. The designs' placeholder values — "Abby's Table Foods Ltd", "Example Foods Ltd", company
number 12345678, "1 Example Street", phone 020 3875 1234, hello@FromAbbysTable.co.uk, "Stripe" as
the payment provider — SHALL NOT be copied into `web/`. Contact details have one source,
`SUPPORT_CONTACT` (`src/lib/content/contact.ts`), shared by both legal documents and the status
pages.

#### Scenario: A missing detail is visible
- **WHEN** Terms of Sale renders while `COMPANY.legalName` is `null`
- **THEN** clause 1 shows "to be confirmed" in its place
- **AND** neither placeholder company name nor 12345678 appears anywhere on the site

### Requirement: FR-05 No link to an unbuilt route
`capability: marketing-pages` · `delta: ADDED (feat/marketing-pages)`

Every internal link SHALL resolve to a route that exists in `web/`. A destination whose page is not
built SHALL point at the closest real destination — today Delivery & FAQs takes `/contact` — never
at a URL that would 404, and SHALL be repointed in the change that builds the page (#8). Internal links go through `next/link` (`Button` and `NavLink` route on `href`); the
500 page's plain `<a>` links are the one exception. Links SHALL be real anchors, so that
open-in-new-tab and modified clicks work without JavaScript.

#### Scenario: Delivery & FAQs is not built yet
- **WHEN** a customer follows Allergens' "Browse our FAQs" while `/delivery-and-faqs` does not exist
- **THEN** they land on `/contact`
- **AND** the link never answers 404

### Requirement: FR-06 Imagery is placeholder until #38
`capability: marketing-pages` · `delta: ADDED (feat/marketing-pages)`

All photography and video is AI-generated placeholder (`design/README.md`) and SHALL be marked as
such with a comment at its use site. No other image SHALL be substituted while a real asset is
missing. Alt text SHALL describe the image actually on screen and SHALL be reviewed whenever the
image is replaced. The hero image of a page is eager with `fetchpriority="high"` — the page's only
such image (Next 15's `priority` alone only preloads it; How It Works' hero gained it in T11);
images further down load lazily. Replacing the placeholders is launch work tracked by #38.

#### Scenario: A reshoot replaces a photograph
- **WHEN** a placeholder image is replaced
- **THEN** its alt text is reviewed in the same change

### Requirement: FR-07 Which pages carry the mobile purchase bar
`capability: marketing-pages` · `delta: ADDED (feat/marketing-pages)`

A page carries the mobile purchase bar only where its design does, and marks its own reveal and
stop points (mechanics: site-chrome spec, FR-15–FR-17).

| Page | Bar | Reveal (`data-purchase-bar-reveal`) | Stop (`data-purchase-bar-stop`) |
|---|---|---|---|
| Homepage `/` | `MobilePurchaseBar` | hero "View the menu" | Private Table band, then footer |
| How It Works | `MobilePurchaseBar`, CTA = `BoxSizeLink` | hero "Build a Box" | footer |
| Our Standards | `MobilePurchaseBar` | hero "See what goes in" | closing CTA band, then footer |
| Abby's Story | none | — | — |
| Allergens, Privacy, Terms | none | — | — |
| Contact | none | — | — |
| Private Table | `PurchaseBarShell`, one centred "Join the waitlist" — only while the waitlist is open (FR-29) | the whole hero band | enquiry section on entry (`"entry"`), then footer |

`/menu` and the dish pages also carry one (`SPEC-2026-07-22-catalog-browse`); Gifting and Delivery &
FAQs will carry none.

#### Scenario: The founder narrative is not a sales page
- **WHEN** a customer scrolls anywhere on `/our-story` on a phone
- **THEN** no purchase bar exists in the DOM
- **AND** the header CTA remains the route to the box builder

#### Scenario: Standards suppresses at its own CTA
- **WHEN** Our Standards' closing band's top crosses 75% of the viewport
- **THEN** the bar is hidden from there through the footer

### Requirement: FR-08 Homepage section order
`capability: homepage` · `delta: ADDED (feat/marketing-pages)`

The homepage SHALL render, in order: Hero → How it works → A taste of the table → Our standards →
Meet the founder → Private Table → footer. The `BoxesPromo` and `Gifting` sections SHALL be
deleted, not hidden, and every link to their anchors repointed or removed in the same change —
including `/menu`'s "Explore Abby's handpicked boxes" (`MenuGrid`, `/#boxes`) — so nothing is left
pointing at a missing anchor (FR-05). Private Table SHALL stay the last band: the purchase bar's suppression is
positional, so anything placed below it is suppressed too. All commerce data SHALL be resolved
once in `app/(site)/page.tsx` and passed down. The page SHALL show no announcement strip and no
earliest delivery date.

#### Scenario: The removed sections stay removed
- **WHEN** the homepage renders
- **THEN** it contains the six bands in the order above (five if there are no dishes to show) and
  no boxes promo or gifting section
- **AND** no delivery date appears on it

### Requirement: FR-09 Homepage hero
`capability: homepage` · `delta: ADDED (feat/marketing-pages)`

The hero SHALL carry the H1 "Nigerian Fusion Food. Nutrition at the Core." set with the design's
four hard breaks (Nigerian / Fusion Food. / Nutrition / at the Core.); the lede "Chef-prepared
dishes made from scratch, with quality ingredients and real flavour." with its break after
"scratch,"; three content-sized facts — "Rooted in tradition", "No ultra-processed foods", "Real
ingredients. Real flavour."; a primary "View the menu" → `/menu` that carries
`data-purchase-bar-reveal`; and a secondary "How it works →" → `/how-it-works`, a route, never an
in-page anchor. The hero image is the page's LCP element.

#### Scenario: The secondary CTA is a page
- **WHEN** a customer cmd-clicks "How it works →"
- **THEN** `/how-it-works` opens in a new tab

### Requirement: FR-10 Homepage How it works band
`capability: homepage` · `delta: ADDED (feat/marketing-pages)`

The band SHALL carry the h2 "How Abby's Table works", the intro "Four simple steps, from our table
to yours.", and the four steps as a real `<ol>` with `aria-hidden` numerals: 01 "Build a box" /
"Minimum order: 6 dishes. Choose your meals and preferred portion size."; 02 "We cook from
scratch" / "Chef-prepared, nutrition-led, made for flavour with quality ingredients."; 03
"Delivered chilled" / "Choose your Mainland UK delivery date."; 04 "Heat, enjoy, live well" /
"Ready in minutes.". The minimum in step 01 comes from the plan (FR-02). Actions: "Build a Box" →
`/box` and "Learn more →" → `/how-it-works`; from 1024 a note "Minimum 6 dishes · From £158" from
data (on a phone the purchase bar carries that line instead). The looping clip SHALL have a pause
control (WCAG 2.2.2) and, under reduced motion, show its poster with an opt-in Play.

> Note: `build-handoff.md` ("How it works band") quotes older wording for steps 01 and 02. The page
> file is the later source and wins.

#### Scenario: No date in the band
- **WHEN** the band renders with a live tenant that publishes an earliest delivery date
- **THEN** the date does not appear in the band, nor anywhere else on the homepage

### Requirement: FR-11 A taste of the table
`capability: homepage` · `delta: ADDED (feat/marketing-pages)`

The dishes section SHALL keep its heading "A taste of the table" and intro "A few of Abby's dishes,
from everyday favourites to signature upgrades.", render cards from catalogue data, each linking
`/menu/<slug>`, and end with "View the full menu" → `/menu`. A Signature card's info button
("What does Signature mean?") SHALL open the tooltip "One of Abby's specials. This dish takes a
little more time or uses premium cuts, so there's a small upgrade."; the upgrade amount comes from
the dish record. The card is shared with `/menu`, whose design (Menu Landing v3) carries the same
copy, so the change applies to both. The band SHALL be left out when there are no dishes to show.
The info "i" is a real button in the card's tag stack, outside the card link, with the v2 tag
treatment (T13, #21 — `SPEC-2026-10-07-menu` FR-08–FR-10).

#### Scenario: The popover is not a link inside a link
- **WHEN** a keyboard user tabs through a Signature card
- **THEN** the card link and the info button are separate tab stops

### Requirement: FR-12 Our standards band
`capability: homepage` · `delta: ADDED (feat/marketing-pages)`

On `--sage`, the band SHALL carry the h2 "Our standards", the line "Real food, higher standards.",
and four items in this order, each with its decorative `aria-hidden` icon in `--brass-ink`:
High-quality ingredients / No commercial seasoning blends / Full nutritional information / No seed
oils, with the design's body lines. Its CTA "View our standards" → `/standards` carries no arrow.

#### Scenario: Icons carry no meaning alone
- **WHEN** a screen reader reads the band
- **THEN** each standard is announced from its words, and no icon is announced

### Requirement: FR-13 Meet the founder and Private Table
`capability: homepage` · `delta: ADDED (feat/marketing-pages)`

The founder band (`--blush`) SHALL carry the h2 "Meet the founder" with "Esther Abby Josiah" as a
paragraph beneath it, not part of the heading; keep its three founder paragraphs; and link "Read
Abby's story" → `/our-story`. The Private Table band (`--navy`) SHALL carry the h2 "Abby's Private
Table", the line "Bespoke Nigerian fusion menus, created around you.", its body paragraph, two
reach rows with globe and pin icons — "Worldwide · Bespoke recipes created for you" and "UK-wide ·
Bespoke recipes created and prepared for you" — "Find out more" → `PRIVATE_TABLE_HREF`
(`/private-table`, the page's top, never its form; #25) — and
one credentials card at every width: Guided by "A UK-certified
health coach", Overseen by "A registered nutritionist", In collaboration with "Your clinical
team". The band carries `data-purchase-bar-stop`, `id="private"` and a 72px `scroll-margin-top`:
it was the chrome's Private Table destination (`/#private`) until #25, so a link saved then still
lands — often by an UPWARD jump, which re-shows the phone header — with its heading clear of the
header. Nothing in `web/src` links that anchor any more. The design's
price line "Private Table from £1,500" is unverified (build-handoff; open question 2): it MAY
appear only as approved copy from a content constant, never inline in markup, and SHALL be removed
if the owner does not confirm it before launch.

#### Scenario: The outline reads correctly
- **WHEN** the page's heading outline is listed
- **THEN** it contains "Meet the founder", not "Esther Abby Josiah"

### Requirement: FR-14 How It Works page
`capability: marketing-pages` · `delta: ADDED (feat/marketing-pages)`

`/how-it-works` SHALL render the hero (h1 "How Abby's Table works", a "Build a Box" carrying the
reveal marker, "See the menu →"); a step rail (`<nav aria-label="The four steps">`) that is jump
navigation to `#step-1`–`#step-4`, never progress; step 1 with a size picker built from the box
plan — its presets, plus a custom option ("6+", "Custom") only where the plan prices a range — a
price read-out from the plan and "Start building"; steps 2–4,
"Nutrition, clearly shared." and a closing "Ready to fill your box?" whose sentence takes the
minimum from data. Every purchase link — hero, panel, closing and the purchase bar — SHALL carry
the chosen size as `?dishes=<id>` (`BoxSizeProvider`, contract §4c). Each Aonik read degrades on
its own: no plan gives a picker with no sizes or prices; no example dish gives no example card.

#### Scenario: The chosen size survives
- **WHEN** a customer picks 18, scrolls back to the hero and taps "Build a Box"
- **THEN** they go to `/box?dishes=18`
- **AND** Choose Box preselecting it is #28, outside this spec

### Requirement: FR-15 Our Standards page
`capability: marketing-pages` · `delta: ADDED (feat/marketing-pages)`

`/standards` SHALL render a `--sage` hero with the three-line h1 "Great food / Starts with /
Higher Standards", its lede, the four prohibition marks from `BRAND_STANDARDS` and "See what goes
in", an in-page jump to `#standards` that adds no history entry; a "What goes in" opener with an
index (`aria-label="The five standards"`) to the five bands; bands 01–05 alternating cream and
blush; and a closing band on the hero's ground with "Ready to fill your box?", the minimum from
data and "Build a Box" → `/box`. The design's named departures (green-forest hero CTA, band title
scale, mid-page brass rule, suppression from the closing CTA) apply to this page only.

#### Scenario: A plain visit is not a dish visit
- **WHEN** a customer opens `/standards` from the footer
- **THEN** no "Back to dish" control is rendered or revealed

### Requirement: FR-16 Dish → Our Standards → dish round trip
`capability: marketing-pages` · `delta: ADDED (feat/marketing-pages)`

As specified in `src/lib/dish-return.ts`: the dish page's "See our standards" (`StandardsLink`)
SHALL link `/standards?from=dish&dish=<slug>` and, for a plain same-tab primary click only, write
one sessionStorage record `at-dish-return-v1` holding the dish, time, `history.length`, scroll
position, the WHOLE personaliser selection and a one-off token, which is also stamped in the dish
entry's `history.state` (key `atDishReturn`). Records expire after 6 hours. Our Standards SHALL
show "Back to dish" only when BOTH the query names a dish the catalogue has (checked on the
server) AND this tab holds a live record for it; the control is server-rendered `hidden` and
revealed only in the browser (an inline gate script before first paint, a layout effect on
client navigation). Opening Our Standards SHALL mark the record `departed` BEFORE revealing the
control, on both paths alike (`departDishReturn`, which the gate script mirrors byte for byte;
T12), so the browser's Back to the dish restores even before Our Standards has hydrated. A click
on "Back to dish" itself before hydration follows its plain `href`, as with JavaScript off: a
forward visit that restores nothing (open question 7). "Back to dish" SHALL make a true return —
`history.back()` when the entry behind is the dish, otherwise mark `returning` and replace —
never a forward push. The dish page SHALL restore the selection and scroll only on a
genuine return (departed, and either `returning` or on the stamped entry), never on a reload, then
disarm the record; an edit drops it. The selection SHALL NEVER be put in a URL.

#### Scenario: A pasted link shows nothing
- **WHEN** someone opens a shared `/standards?from=dish&dish=<real-slug>` in a fresh tab
- **THEN** "Back to dish" stays hidden

#### Scenario: A genuine return restores the choice
- **WHEN** a customer picks Full Table, opens Our Standards and taps "Back to dish"
- **THEN** the dish page shows Full Table and their previous scroll position
- **AND** reloading the dish afterwards restores nothing

### Requirement: FR-17 Abby's Story page
`capability: marketing-pages` · `delta: ADDED (feat/marketing-pages)`

`/our-story` SHALL render the design verbatim (FR-01) as a static Server Component with no
eyebrows, no mobile purchase bar and no film player (a captioned still until the footage exists).
Every "Abby's Story" link on the site SHALL point at `/our-story`, never at a `#founder` anchor.

#### Scenario: Every route to the story is a page
- **WHEN** the header, drawer, footer or founder band links to Abby's Story
- **THEN** the `href` is `/our-story`

### Requirement: FR-18 Allergens page
`capability: legal-pages` · `delta: ADDED (feat/marketing-pages)`

`/allergens` SHALL list the regulated 14 as plain list items in the design's order — no links,
buttons, icons or chevrons — followed by the cross-contamination notice, then Our approach → Need
more help → Useful links in the same order at every width. Its safety copy is placeholder pending
food-safety sign-off and SHALL NOT be reworded or extended until then. It carries no hero, no
purchase bar and no desktop header auto-hide.

#### Scenario: The list promises nothing
- **WHEN** a customer taps "Mustard"
- **THEN** nothing happens, because it is not a control

### Requirement: FR-19 Long legal documents
`capability: legal-pages` · `delta: ADDED (feat/marketing-pages)`

`/terms-of-sale` (56 clauses in 8 groups) and `/privacy` (11 sections in 4 groups) SHALL each be
one continuous document; the grouped index (`LegalNavigation`: index, mobile sheet, floating
Sections/Top pair, scroll-spy) navigates it and never swaps what it shows. The Sections/Top pair
yields to the consent layer (`data-consent-yield`). The print stylesheet that drops the site
chrome is a `<style media="print">` rendered by `LegalDocument`, so it exists on these two pages
only. Clause copy is verbatim and awaits legal review (#38); it SHALL NOT be reworded.

#### Scenario: Find works on the whole document
- **WHEN** a reader uses the browser's Find for a word in clause 40
- **THEN** it is found without opening any index group first

### Requirement: FR-20 Legal anchors are a public contract
`capability: legal-pages` · `delta: ADDED (feat/marketing-pages)`

Section slugs in `src/lib/legal/terms.ts` and `privacy.ts` SHALL never be renamed once published;
`tests/legal-documents.test.ts` pins them. `#cookies` (Privacy section 7) is committed: every
"Cookie preferences" fallback lands there. Legacy number anchors `#sN` and `#N` SHALL resolve to
their slug and be rewritten to it with `replaceState`. Section 7's "Cookie preferences" is a
`<button data-consent-open>` that, with its lead-in, is shown only under `html[data-consent-ready]`.
The checkout return ("← Back to checkout") is site-chrome FR-22.

#### Scenario: An old link still lands
- **WHEN** a customer follows an emailed `/terms-of-sale#s30`
- **THEN** clause 30 is shown and the address bar reads its slug

### Requirement: FR-21 Contact page, one grid
`capability: contact-page` · `delta: ADDED (feat/marketing-pages)`

`/contact` SHALL render `Abby's Table - Contact Us.dc.html` verbatim (FR-01): the h1 "Contact us",
"Choose the way you'd prefer to get in touch." and the lede, then ONE 12-column grid whose DOM
order is the phone order — WhatsApp (the highlighted card, `--sage-tint`), Email, a "Send a
message" jump to `#send` (phone layout only, and only while the form is shown), Phone, the
opening-hours block, "Looking for something specific?" (phone layout only), FAQs, the Private
Table panel, "Send us a message". One column on a phone, two cards to a row from 640; from 1024
every cell is placed: the form in columns 1–8 spanning the sidebar's rows, and the hours block at
the top of the sidebar (9–12) — the SAME element that sits under the Phone card on a phone, moved
by CSS alone, never duplicated or reparented. The cards go 4-up only from 1280 (the design's
content exception); while there is no FAQs card the three are 3-up from 1024. "See opening hours"
is a disclosure (`aria-expanded`, `aria-controls`) below 1024 and, from 1024, a jump that focuses
the sidebar's "Opening hours" heading. No hero and no purchase bar (FR-07); the desktop header
auto-hides (site-chrome FR-03). The FAQs card SHALL appear only while Delivery & FAQs has its own
page (it has since #23; before, the card would have linked to this one) and the Private Table
panel only while its waitlist can take a name (`waitlistOpen`, FR-28: the page exists since #25,
the list waits on aonik#357; the panel links `PRIVATE_TABLE_WAITLIST_HREF`), never a "Join the
waitlist" with nothing to join.

#### Scenario: The hours move, the markup does not
- **WHEN** the page is resized from 390px to 1280px
- **THEN** the hours block moves from under the Phone card to the top of the sidebar
- **AND** the document holds one hours block throughout

### Requirement: FR-22 Contact details and opening hours from configuration
`capability: contact-page` · `delta: ADDED (feat/marketing-pages)`

WhatsApp (with its QR), email, phone and the opening hours SHALL come from
`src/lib/content/contact.ts` (`WHATSAPP_CONTACT`, `SUPPORT_CONTACT`, `OPENING_HOURS`), each `null`
until the owner confirms it (production values from Aonik, aonik#358). A `null` detail SHALL show
the "to be confirmed" mark and SHALL NOT be a link: no `mailto:`, `tel:` or `wa.me` without a
value. The design's phone, email, WhatsApp number, hours, bank holidays and placeholder QR SHALL
NOT be copied into `web/`; the QR shows from 1024 only, unre-encoded, once a real tested code is
configured. "Open now / Closed" SHALL be computed from configured hours only, in Europe/London (BST
handled; the London date decides a bank holiday), honouring closed days, bank holidays and
exceptional closures — in the browser, never on the server, and re-checked as each minute turns.
With no hours there SHALL be no status. Words carry the state, never colour alone, and the
printed table is derived from the same hours (`src/lib/contact/hours.ts`).

#### Scenario: No hours, no status
- **WHEN** `OPENING_HOURS` is `null`
- **THEN** neither "Open now" nor "Closed" appears
- **AND** the hours read "to be confirmed"

#### Scenario: The clocks go forward
- **WHEN** the line opens 08:30–18:00 on weekdays and it is 07:30 UTC on Monday 30 March 2026
- **THEN** the status reads "Open now" (08:30 BST)

### Requirement: FR-23 The message form
`capability: contact-page` · `delta: ADDED (feat/marketing-pages)`

The form SHALL carry, in order: Your name; Email address; What's it about? — a native `<select>`
with "Choose a subject" and the six subjects in the design's words (An existing order / Placing a
new order / A dish, ingredients or allergens / Delivery / Gifting / Something else), never Private
Table; Order number, shown only for "An existing order" and optional; Your message, at least 10
characters; up to 3 images, JPG, PNG or HEIC (by extension when a HEIC has no MIME type), 10MB
each, picked with a real "Choose images" button or dropped. Validation is ours (`noValidate`):
inline, `aria-invalid` + `aria-describedby`, the design's messages, each cleared as its field is
corrected. A failed submit SHALL move focus to the first error in field order and bring it clear
of the header. Invalid images are named and the valid ones still attach. Success SHALL replace the
form, take focus, read "Thank you — your message has been sent." and echo the address; "Send
another message" returns an empty form. The rules live in `src/lib/contact/enquiry.ts`, shared by
the form and the server action.

#### Scenario: Focus goes to the first error
- **WHEN** a customer types a name and submits with a bad email and a nine-character message
- **THEN** focus moves to Email address, which is in view under the header
- **AND** the email and message errors are shown, the name's is not

### Requirement: FR-24 Never a false "sent"
`capability: contact-page` · `delta: ADDED (feat/marketing-pages)`

The form SHALL render only when an enquiry can really be sent: live data and the Aonik enquiry
endpoint (`ENQUIRY_PATH` in `src/lib/aonik/enquiries.ts`; aonik#356, not built). Until then the
page keeps "Send us a message" and says "Our message form isn't available yet." — adding "Please
use one of the ways above to get in touch." when a direct route is configured, and otherwise the
brand's social accounts (`SOCIAL_LINKS`), so a "contact us" never lands on a dead end — and no jump
points at the form; demo mode SHALL NOT send or say it has (the newsletter's rule, #6). The server
action SHALL re-run every rule on what arrived and answer `sent` only after a 2xx from the
endpoint. Any other outcome keeps every field and image and says "We couldn't send your message
just now. Everything you've written is still here, so please try again." The request is multipart
in the contract's field names (§3e), never retried. Every text field has a length cap, enforced by
the field and again by the action (name 200, email 254, order number 64, message 5,000 characters),
and the email shape check is linear (`isEmailAddress`), so no field can hold the server.

#### Scenario: No endpoint, no thanks
- **WHEN** a valid enquiry is posted to the action while `ENQUIRY_PATH` is `null`
- **THEN** it answers `unavailable`
- **AND** no request leaves the server

### Requirement: FR-25 Private Table page
`capability: private-table` · `delta: ADDED (feat/marketing-pages)`

`/private-table` SHALL render `Abby's Table - Private Table v2.dc.html` (approved; behaviour guide
§8) verbatim (FR-01) as a Server Component, in order: a `--navy` hero — the "Coming soon" mark,
the h1 "Abby's Private Table", the lede, "Confidential by design · NDA by arrangement", the
photograph (square under the headline on a phone; beside the copy, sharing its top and bottom
edges, from 1024), the three credentials as one brass-hairline panel (stacked, three across from
640), then the actions: "Join the waitlist" with "Private Table from £1,500" centred under it,
and "Find out more" → What we offer, taking focus to its heading; Who it's for — the design's
THREE audiences (the issue's "4" predates it), one shared title row from 1024 (subgrid); What we
offer on `--blush` — the confidentiality line again, "Included with both services" (three) and
the two service cards (Bespoke Recipe Development, from £1,500, Worldwide; Recipe Development &
Meal Preparation, from £1,780, UK-wide, on `--green-forest`), a peeking scroll-snap carousel on a
phone and two columns from 640, their rows aligned by subgrid in both; How it works on `--navy` —
four steps of three points, a rail down the side on a phone and across from 1024; Register your
interest. Both prices come from content constants in `marketing.ts` (`PRIVATE_TABLE_FROM_PENCE`,
`PRIVATE_TABLE_MEAL_PREPARATION_FROM_PENCE`), formatted by `formatPrice`, never literals (FR-02);
"Private Table from" is the lower. Plain `--brass` for small type on navy is the accepted 4.08:1
exception shared with the homepage band. The route is on the desktop header auto-hide list
(site-chrome FR-03), and every chrome link, the homepage band's "Find out more", the Terms of
Sale waitlist clause and the Delivery & FAQs answer reach it through `PRIVATE_TABLE_ITEM`.

#### Scenario: The figures are data
- **WHEN** the owner changes the meal-preparation price in `marketing.ts`
- **THEN** its card shows the new "From £…" with no other change
- **AND** no source file under `private-table/` contains a pound figure

### Requirement: FR-26 Every call to action reads "Join the waitlist"
`capability: private-table` · `delta: ADDED (feat/marketing-pages)`

The page is a WAITLIST, not a booking: consultations are not open. Every call to action — the
hero's, each service card's, the form's submit and the mobile bar's — SHALL read "Join the
waitlist" (`JOIN_WAITLIST_LABEL`; no "Book", "Enquire" or "Build a Box", and no pending label),
and nothing on the page SHALL route into the food-box journey. The jumps go to the form
(`#enquire`) without a history entry, scroll it clear of the header and move focus to its
heading — or, once joined, to the confirmation; a service card's jump also preselects its
service. With no JavaScript each is a plain fragment link. All of them, and the bar, render ONLY
while the waitlist is open (FR-28).

#### Scenario: The card picks its service
- **WHEN** a customer presses "Join the waitlist" on Recipe Development & Meal Preparation
- **THEN** the page scrolls to "Register your interest", which takes focus
- **AND** "Recipe development & meal preparation" is chosen in the form

### Requirement: FR-27 The waitlist form
`capability: private-table` · `delta: ADDED (feat/marketing-pages)`

The form SHALL carry, in order: Full name; Email address and Telephone number (optional), side by
side from 1024; Country or region; Which service — a native radio group of "Recipe development"
(Worldwide), "Recipe development & meal preparation" (UK-wide) and "Not sure yet". Country or
region is an editable combobox with a list popup (WAI-ARIA 1.2: `role="combobox"`,
`aria-autocomplete="list"`, `aria-expanded`, `aria-controls` to an always-mounted listbox,
`aria-activedescendant`), over the FIXED list in `src/lib/content/countries.ts`: nothing typed
suggests the design's eight (the United Kingdom first); typing ranks names, aliases ("UK",
"England", "USA") and word starts; ↓/↑ open and move (wrapping), Home/End jump while open, Enter
picks (and only then — it never submits from an open list), Escape closes only the list, a press
outside closes it, and it opens upwards without room below. A query that matches nothing shows
the design's note. Validation is ours (`noValidate`), with the design's messages, in field order,
focus moving to the first error; three messages are ours (a name over 200 characters, a
telephone number that is not one, a country not on the list). Success replaces the form with
"Thank you — you're on the waitlist." / "We'll let you know as soon as consultations open." — no
consultation date, no reply time — and takes focus. The rules live in
`src/lib/private-table/` (`country.ts`, `waitlist.ts`), shared by the form and the action.

#### Scenario: The keyboard picks a country
- **WHEN** a customer types "ni" in Country or region, presses ↓ and Enter
- **THEN** "Nicaragua" (the second suggestion after "Nigeria") fills the field and the list closes
- **AND** focus is still in the field, and the form was not submitted

### Requirement: FR-28 Never a false "joined"
`capability: private-table` · `delta: ADDED (feat/marketing-pages)`

The form, every "Join the waitlist" and the bar SHALL render only where the waitlist can really
store an entry: `waitlistOpen()`, i.e. `AonikClient.waitlist` exists — `null` in BOTH data modes
until aonik#357 (`WAITLIST_PATH` in `src/lib/aonik/waitlist.ts` is the one switch; demo never
pretends a write, #6's rule). Until then Register your interest says "The Private Table waitlist
isn't open yet." and nothing links to the form. The server action SHALL re-run every rule on what
arrived — every field capped (name 200, email 254, telephone 32, country 100 characters), the
email shape checked in linear time (`isEmailAddress`), the country resolved against the fixed list
and stored as its ISO code, the service one of the three — and answer `joined` only after a 2xx;
otherwise `invalid`, `unavailable` or `error`, keeping everything entered ("We couldn't add you to
the waitlist just now. Everything you've entered is still here, so please try again."). The entry
is JSON in proposed field names (`name`, `email`, `phone?`, `country`, `service`), never retried,
and is a list of its own — not the newsletter, not notify-me.

#### Scenario: Nothing to store to
- **WHEN** a valid entry is posted to the action while `WAITLIST_PATH` is `null`, in demo or live
- **THEN** it answers `unavailable`
- **AND** no request leaves the server

### Requirement: FR-29 The mobile bar's waitlist variant
`capability: private-table` · `delta: ADDED (feat/marketing-pages)`

Private Table's bar SHALL be the canonical band (`PurchaseBarShell`) with one centred "Join the
waitlist" pill and no price block, and SHALL never become VIEW BOX. It follows the canonical
direction rule (site-chrome FR-16), revealed once the WHOLE hero band has gone (its CTA is below
the fold on a phone), and is suppressed from the moment any of the enquiry section is on screen —
its stop is marked `data-purchase-bar-stop="entry"` (`STOP_ON_ENTRY`), whose line is the
viewport's bottom edge rather than 75% — and continuously through the footer.

#### Scenario: One waitlist action on screen at a time
- **WHEN** a customer scrolls down a phone past the hero, then on until the form's top enters
- **THEN** the bar shows past the hero and is gone the moment the form appears
- **AND** it stays gone over the footer

---

## Design

### Architectural decision

Pages are Server Components. Each `page.tsx` fetches its commerce data once and passes it down;
sections never fetch. Copy lives in `src/lib/content/*` or the page, and every rule worth testing
lives in a React-free module (`lib/dish-return.ts`, `lib/legal/document.ts`,
`lib/how-it-works/boxSizes.ts`, `lib/purchase-bar/*`) so it is unit-tested without a browser.
Aonik failures degrade per piece; a marketing page never becomes a 500 because one read failed.

### Target architecture

| Route | File | Data |
|---|---|---|
| `/` | `app/(site)/page.tsx`, `components/sections/*` | featured dishes, box plan |
| `/how-it-works` | `app/(site)/how-it-works/page.tsx` | box plan, example dish |
| `/standards` | `app/(site)/standards/page.tsx` | example dish, minimum, return dish |
| `/our-story` | `app/(site)/our-story/page.tsx` | none |
| `/allergens` | `app/(site)/allergens/page.tsx` | none |
| `/contact` | `app/(site)/contact/page.tsx`, `components/contact/*`, `lib/contact/*` | `lib/content/contact.ts`; enquiry endpoint availability |
| `/privacy`, `/terms-of-sale` | `LegalDocument` + `lib/legal/*` | `COMPANY` |
| `/private-table` | `app/(site)/private-table/page.tsx`, `components/private-table/*`, `lib/private-table/*` | `lib/content/privateTable.ts`, `countries.ts`; whether a waitlist exists (`AonikClient.waitlist`) |

### Known gaps — code that contradicts the design or CLAUDE.md today

The original-template homepage and the root metadata ("UK-wide", "Heat, eat, live well"), the
first two gaps recorded here, were closed by #15 (PR #59; T6, T9) and are no longer listed.

1. **How It Works departs from its design's words on purpose** (FR-01): "Mainland UK delivery" for
   "UK-wide delivery"; "Pick an available mainland UK delivery date at checkout." for "…UK
   nationwide delivery at checkout."; and "…shown on each dish where we've published them…" for
   "…shown on every dish…" — to be restored when every dish publishes them (#38).
2. `build-handoff.md` §3v says the three step-1 sub-steps were removed; the page file still has
   them and the code follows the page file.
3. The demo fixtures still price the box at £95 with a 30-dish maximum until the funnel is
   reconciled (#28); live mode reads the plan.
4. **Contact follows its design's DOM order, which desktop placement departs from** (FR-21): from
   1024 the FAQs card is placed before Phone at 1280 and the sidebar's Private Table panel comes
   before the form in the tab order. The design's own composition; recorded, not changed.
5. Contact's "Send another message" is `--brass-ink-warm`, not the design's `--brass-ink`, which
   measures 4.28:1 on the success panel's `--sage` (design/CLAUDE.md, tokens).
6. **Private Table departs from its design where production needs it** (FR-25–FR-29): no
   "Join the waitlist", form or bar until a waitlist exists (the design has no closed state);
   Which service is a native radio group, not `role="radio"` buttons; audience and step titles
   are h3s; the country list is fixed (the design accepts any text and lists 15) and the active
   suggestion carries `aria-selected` (APG), the chosen one a tick; the bar's suppression runs
   through the footer (the prototype only tested whether the form was on screen). The ↑ Top
   control waits for the canonical one from Menu v3 (#21).

> Note on sources: the page behaviour guide §6 says Abby's Story's bar "follows the normal
> marketing logic"; `design/CLAUDE.md` and the page file have no bar, and they win.

### Open questions (owner decisions, not requirements)

1. ~~**Private Table link before #25.**~~ Resolved by #25: every Private Table link goes to
   `/private-table`.
2. **"Private Table from £1,500" and "from £1,780".** The handoff records £1,500 as unverified,
   and £1,780 (Recipe Development & Meal Preparation) is the design's figure. Are both shown at
   launch, and do they stay approved copy (content constants) or come from data?
3. **Gifting before #26.** Homepage v2 has no gifting band, so the nav's current `/#gifting`
   loses its target once #15 lands. Where should Gifting links point until `/gifting` exists?
4. **Delivery & FAQs before #23.** Its links resolve to `/contact` until its page lands, so on
   `/contact` the footer marks both "Delivery & FAQs" and "Contact us" current, and Contact's own
   FAQs card waits for the page (FR-21).
5. **"Ready in minutes"** (homepage step 04) is unquantified copy awaiting the real reheat time.
6. **"Full nutrition shared for every dish"** (homepage Our standards) is approved copy the owner
   confirmed as intended, but it holds only if every dish page publishes full nutrition. If any
   does not at launch, does the line change, or does the dish wait?
7. **"Back to dish" before hydration.** On a full load of Our Standards the gate reveals the
   control at first paint, and until React hydrates a click on it is its plain link: a forward
   visit to the dish (a new history entry) that restores nothing. Accept that brief window, as
   the JavaScript-off behaviour, or have the inline gate also bind a minimal true-return click
   handler that steps aside once `BackToDish` hydrates?
8. **Contact's undesigned states.** The failure line and the "form isn't available yet" notice are
   ours (the design has neither); and should unconfirmed routes stay visible as "to be confirmed"
   (as the legal pages do) or be left out until confirmed?
9. **Contact's promises.** "We've sent a copy to …" holds only if aonik#356 sends an
   acknowledgement email; "within two working days" is an unconfirmed reply time. Spam protection
   (honeypot, timing or an invisible challenge — no CAPTCHA) is the endpoint's to choose.
10. **Private Table while the waitlist is closed** (FR-28). The page hides every "Join the
    waitlist", the form and the bar, and says "The Private Table waitlist isn't open yet." (our
    words); Contact hides its Private Table panel. Alternatively the CTAs could stay and lead to
    that notice. And the notice: one sentence, or a route meanwhile (the socials, as Contact's)?
11. **Private Table's undesigned copy.** The three extra messages (FR-27), the failure line and
    the closed-state notice are ours; the credentials and both prices await #38.
12. **The waitlist entry** (aonik#357). Field names are proposed (`name`, `email`, `phone?`,
    `country` ISO code, `service` id); a second sign-up with the same email, abuse protection and
    the unsubscribe route (Privacy Policy) are the endpoint's to settle. The country list (ISO
    3166-1 less uninhabited regions, plus Kosovo; GOV.UK-style names) is ours to confirm.

---

## Tasks

- [x] `T1` How It Works with the size picker and `?dishes=` links — PR #55 (#16)
- [x] `T2` Our Standards and the Back to dish round trip — PR #54 (#17)
- [x] `T3` Abby's Story at `/our-story`, all story links repointed — PR #52 (#18)
- [x] `T4` Allergens — PR #49 (#19)
- [x] `T5` Privacy Policy and Terms of Sale, slugs pinned — PR #56 (#20)
- [x] `T6` Homepage v2 — PR #59 (#15)
  - [x] Delete `BoxesPromo` and `Gifting` sections and their fixture reads
  - [x] Hero (FR-09) and How it works band without a date (FR-10)
  - [x] Our standards band (FR-12); founder heading structure (FR-13)
  - [x] Private Table band (FR-13); "Find out more" hidden until #25 (`PRIVATE_TABLE_HREF`)
  - [x] Signature tooltip copy on the shared dish card (FR-11); the separate button is T13
- [x] `T7` Repoint `/#contact` placeholders as Contact and Delivery & FAQs land (#8) — Delivery &
  FAQs with #23, Contact with #24
- [ ] `T8` Real photography, company details, legal and food-safety sign-off (#38)
- [x] `T9` Root metadata to "mainland UK" / "Heat, enjoy, live well" — PR #59
- [x] `T10` Our Standards' minimum from the storefront plan, the same source as its purchase bar
  (FR-02) — the closing line reads the bar's offer, one plan read; `getStandardsPageData` no
  longer reads box pricing
- [x] `T11` How It Works' hero image gets `fetchPriority="high"` (FR-06) — the page's only one,
  whichever hero image renders
- [x] `T12` The Back to dish gate marks the record departed before revealing the control (FR-16)
  — `departDishReturn`, mirrored by the gate; `tests/dish-return.test.ts` runs every record case
  through both and compares what each writes
- [x] `T13` The Signature info button as a real button outside the card link (FR-11) (#21) — with
  the v2 tag stack; `SPEC-2026-10-07-menu`
- [x] `T14` Contact (#24): the grid, routes, hours and status, the form held back (FR-21–FR-24)
- [ ] `T15` Wire the enquiry endpoint when aonik#356 ships: set `ENQUIRY_PATH`, reconcile the
  field names, confirm the acknowledgement email, routing by subject, spam protection and
  server-side image checks (type sniffing, virus scan, EXIF stripping) (FR-24). Three 10MB
  images exceed Next's server-action (1MB) and middleware (10MB) body limits: send the form to a
  route handler (`app/api/enquiries/route.ts`) that streams with its own cap and is left out of the
  middleware matcher (checking `MAINTENANCE_MODE` itself), or upload images direct to storage —
  never raise either limit globally
- [ ] `T16` Contact details, hours, bank holidays and closures from Aonik (aonik#358), and a real,
  tested WhatsApp QR (FR-22)
- [x] `T17` Private Table (#25): the page, the CTAs, the form and its country typeahead, the
  action, the bar's waitlist variant, every Private Table link repointed to `/private-table` and
  the route on the desktop auto-hide list (FR-25–FR-29); held closed until aonik#357
- [ ] `T18` Wire the waitlist when aonik#357 ships: set `WAITLIST_PATH`, reconcile
  `toWaitlistBody` with its field names, confirm de-duplication, abuse protection and the
  unsubscribe route (FR-28); Contact's panel and the page's CTAs then appear on their own
- [ ] `T19` The ↑ Top control on Private Table, once the canonical one lands with Menu v3 (#21)

### Testing

- Unit (exists): `tests/how-it-works.test.tsx`, `tests/dish-return.test.ts`,
  `tests/legal-documents.test.ts`, `tests/legal-pages.test.tsx`, `tests/purchase-bar.test.tsx`,
  `tests/contact.test.tsx` (FR-21–FR-24: hours across DST, closed days and closures; subjects,
  validation and images; the action never answering `sent` without an endpoint; the page as
  configured today and fully configured), `tests/private-table.test.tsx` (FR-25–FR-29: copy
  against the design file, prices from constants, the country list and typeahead ranking, every
  validation rule and cap, the action and the Aonik request, the page closed and open, the bar's
  on-entry stop and a phone walk).
- Unit (to add with #15): section order; no delivery date on `/`; every homepage figure from the
  plan; no internal `href` on `/` to an unbuilt route.
- Manual: 320 / 390 / 1024 / 1440 against each page file; keyboard pass of every control.

### Definition of done

All scenarios pass; `npm test`, lint, typecheck and build are green; a reviewer has signed off.

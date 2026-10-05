# Abby's Table — build handoff

Companion to `CLAUDE.md`. That file holds the terse, checkable rules; this one explains the
reasoning, the state of each component, and the things a developer must NOT inherit from the
prototype. Updated as each component is approved.

**Status (5 Oct 2026):** the mobile-first rebuild covers every public page, the whole food-box
ordering flow (steps 1–5), Order Confirmation, the payment-status and error pages, Log in and My
Account. The inventory below is the authoritative current state. Only **Abby's Boxes** is still on
the old desktop-first shell.

### Where the rebuild stopped

Rebuilt and approved (checkout steps 1–3 included — see § 3aa for step 3): **homepage v2**, **Delivery & FAQs**, **Contact**, **Allergens**, **Terms of
Sale**, **Privacy Policy**, **How It Works v2**, **Abby's Story v2** (§ 3u, including the restored
three-up "Remission" section), **Menu Landing v3**, **Gifting v2** (§ 3z), **Standards v2**,
**Dish Landing v2** and its **Signature** variant, **Choose Box v2** (§ 3aa), **Add Dishes v2**
(checkout step 2, § 3ab), **Extras v2** (step 3), **Review v2** (step 4), **Checkout v2** (step 5,
§ 3ad), **Order Confirmation v2**, **Payment Processing** (§ 3ae) and **Log in**.
**Payment wasn't completed** and **Payment was cancelled** (§ 3af) are built and in review.
**Page not found**, **Something went wrong**, **We'll be back shortly** and **Link no longer valid**
(§ 3ag–3aj) are built and awaiting review. **My Account** is built and awaiting review (see "My
Account" under the signed-in state section).
**Private Table v2** is rebuilt and **approved** (waitlist, not
booking; see CLAUDE.md for its named departures), and every page now links to it. **Gift Card Checkout** is rebuilt and in review — **both**
gift-card arrival routes (email and post) are built on the one page, chosen by `?route=`. It is the
source file for every checkout convention recorded in CLAUDE.md. Still on the old desktop-first
shell: Abby's Boxes. The food-box checkout steps are all rebuilt, but Checkout v2 and Review v2
still carry the legacy 641/721/861/1081 breakpoints (CLAUDE.md "Checkout breakpoints").

All rebuilt pages carry the canonical header, drawer and footer, and the canonical
`data-consent-open` footer anchor (§ 3s) — except the checkout steps, which carry the
transactional shell instead (§ 3aa). The consent manager itself is mounted on Privacy Policy
(canonical) and Homepage v2 (fixed-UI integration test) only — deliberately not propagated (§ 3t).

**Historical snapshot (homepage build order, kept for the reasoning — NOT current status).** At
the time, the approved homepage parts were the header (auto-hiding on mobile), mobile drawer, hero,
How it works band and mobile purchase bar, then the dishes preview, Our standards and Meet the
founder; boxes promo, gifting, Private Table, footer and the cookie banner were still to come.
Gifting was then judged the natural next section (it reuses the founder band's 50/50 split) and
the footer the higher-value alternative, being a shared component that becomes canonical on
approval. All of these have since been built and approved — see the inventory above.

### Our standards — what was settled

- **First sanctioned coloured band.** `--sage: #E1E2D2`, full-bleed. Coloured bands are now a named
  list — Our standards, Abby's Story, Private Table — not a page-wide alternating rhythm.
- Icons are `--brass-ink`, matching the How it works numerals. Gold measures 1.2:1 on sage and
  brass 2.2:1, so neither is usable there; the hero's gold icons are unchanged on their dark
  ground. The four glyphs are drawn in-house (thin stroke, 1.6) — the design system ships no icon
  set, so they are ours to approve, not brand assets.
- Icons are decorative and `aria-hidden`: every standard is stated in words beside it.
- Item order is deliberate: High-quality ingredients / No commercial seasoning blends / Full
  nutritional information / No seed oils.
- Desktop titles are aligned with **CSS subgrid**, not a min-height. A min-height was tried and
  only held at 1280 — the column is content-dependent, so the literal was wrong everywhere from
  1024 to 1279. Where subgrid is unsupported the titles simply run ragged; nothing breaks.
- The 640–1023 band caps the text measure at 480px, matching How it works (507) and the dishes
  intro (520). The mockup defined only the phone list and the 4-column desktop, so that state was
  designed here rather than inherited.
- CTA "View our standards" links to `Abby's Table - Standards v2.dc.html`. No arrow — the page's
  filled-green section CTAs do not carry one.

**The footer is the next shared component.** Once approved it is canonical for every page, so
decide its contents deliberately rather than porting the old one.

**The pricing contradiction is now live, not deferred.** The rebuilt homepage states
"Minimum 6 dishes · From £158" in How it works and in the mobile bar, while Choose Box v2 and the
rest of the funnel still run the obsolete £95 / 6–12–18 ladder — so the homepage and the next
screen disagree today. **Choose Box v2's rebuild did not touch it**: that pass deliberately
preserved the page's existing design and content, and the pricing model is a data decision rather
than a layout one. The model is settled (§ 3k and `frontend-backend-contract.md`);
reconciling the funnel to it is build work, not a decision. There is no longer a boxes promo to
carry that message, so How it works is the only place the homepage states it.

**Awaiting from the client:** dish photography (5 dishes), box photography (2 shots), the real
reheat time for step 04's "Ready in minutes", whether orders are one-off or subscription, delivery
cost and non-mainland exclusions, cookie banner copy, and confirmation of the earliest-delivery
lead time so that date can be computed rather than hard-coded.

**Assets taken in last session** (all AI placeholder, see `photography-shot-list.md` § 2b):
`uploads/abbys_mobile_video_4s.mp4` → `assets/hiw-mobile.mp4`;
`uploads/abbys_desktop_video_4s.mp4` → `assets/hiw-desktop.mp4`;
`uploads/abbys_mobile_start.jpg` → `assets/hiw-poster-mobile.jpg`;
`uploads/abbys_desktop_start.jpg` → `assets/hiw-poster-desktop.jpg`.
The end frames (`abbys_*_end.jpg`) are not referenced by the page — the clip loops, so its own
last frame is what shows. They stay in `uploads/` as shoot reference.

### How it works band — what was settled, and why

- Four steps as a real `<ol>`, numerals `aria-hidden` so the sequence survives without them.
- Copy: intro "Four simple steps, from our table to yours." Steps: 01 "Build a box" (knowingly the
  same words as the adjacent CTA — the user's call) / "Choose 6 or more dishes, then select your
  meals and portion size."; 02 "We cook from scratch" / "Prepared in small batches with
  high-quality ingredients."; 03 "Delivered chilled" / "Choose your Mainland UK delivery date.";
  04 "Heat, enjoy, live well" (no ampersand — the Playfair "&" was louder than the words round it).
- "Mainland UK" is deliberate and implies exclusions that are documented nowhere yet — see Open
  items. Do not soften it back to "UK" to avoid the question.
- The earliest-delivery date was built into both the hero and step 03, reviewed, and **removed
  from both**. It lives only in the funnel. Do not reintroduce it to the homepage.
- Type: step titles 22px Playfair, body 16px, numerals 13px at .16em in `--brass-ink`, intro 18px,
  section heading clamped on mobile and 48px from 1024. The earlier 19/15.5/14/15 set was rejected
  as too flat — four sizes inside 5px is not a hierarchy.
- Desktop composition: copy and CTA in the left column, steps as a 2×2 grid, clip full width
  below. Mobile is heading → intro → steps → clip → CTA.
- Hero facts row: the three facts are **content-sized (`flex: 0 1 auto`), not equal thirds**. Equal
  thirds starve the middle label of ~20px and push "No ultra-processed foods" to three lines.
  Two failed attempts are recorded in `CLAUDE.md` so they are not repeated: `nowrap` on the whole
  phrase overflowed into the next fact's icon, and a 1280-only media query was both unnecessary
  and fragile.
- Header purchase pill raised 40 → 44px; mobile bar CTA 44 → 48px. The bar's `.at-barpad` spacer
  is 70px because the bar is 11 + 48 + 11 — keep them in sync.

The approved header and drawer are canonical, but propagation is **page by page after review** —
each page will get its own `… v2` copy inheriting them when we reach it. So expect the site to
carry old and new chrome side by side while the rebuild is in progress. That is deliberate.

---

## 1. What the prototype does and does not define

**It defines:** layout, composition, copy, colour, type, spacing, responsive behaviour,
interaction and accessibility semantics.

**It does not define the rendering architecture.** These pages render client-side because that is
what makes them editable in the design tool. Marketing pages should be server-rendered or
statically generated. Do not read the client-side pattern as intentional.

Three more prototype artefacts to leave behind:

- **Inline styles plus `!important` media queries.** Base (mobile) styles are inline so the design
  paints as it streams; every `min-width` override therefore needs `!important` to beat inline
  specificity. In production this should be an ordinary stylesheet with a normal cascade and no
  `!important` at all. The *values* are correct; the delivery mechanism is not.
- **One image file per crop.** No `srcset`/`sizes`, so a phone currently downloads the same file
  as a desktop. Production needs responsive sources — see `photography-shot-list.md`.
- **Links are `.dc.html` filenames.** They stand in for routes. A route map is needed; the
  intended destinations are listed in section 5.

---

## 2. Responsive architecture

Mobile-first, and strictly so: the styles with no media query **are** the mobile design, and every
query is `min-width`. There are no `max-width` overrides anywhere in a rebuilt page.

Two system breakpoints, **640** and **1024**, plus a single documented exception at **1280** for
the hero benefits row. Exceptions must be justified by content, expressed as `min-width`, and
recorded in `CLAUDE.md` with the reason — not the device that prompted them.

Where a value can be fluid it is fluid rather than stepped, which is why the breakpoint count is
so low: the wordmark uses `clamp(108px, 36vw, 168px)`, the mobile headline
`clamp(38px, 11.6vw, 56px)`, and the desktop headline `clamp(56px, 5.4vw, 78px)` — continuous
across the 1024 boundary with no jump.

**One set of content, recomposed.** Markup is never duplicated and hidden per breakpoint: that
doubles payload and leaves the hidden copy visible to screen readers and crawlers. Genuinely
different image crops use `<picture>`.

**Layout width.** Full-bleed visual bands with a centred **1280px** inner box and a **48px**
gutter. The header row and the hero copy use the same box, so the wordmark, the headline and every
band below share one left edge. The hero's left offset deliberately avoids `100vw`, which includes
the scrollbar and would break that alignment on Windows. In production, 1280 and 48 should be
tokens rather than the repeated literals they are here.

Never cap the whole page. A boxed site with page background at the sides loses the immersive feel
the brand is built on.

---

## 3. Zero layout shift

Geometry is reserved before images load, and never with JavaScript or rigid pixel heights.

The hero is the worked example: its height comes from the copy, and the photograph is an
absolutely positioned layer behind it. Nothing can move when the image arrives, and the section
grows freely with browser zoom, longer copy, translation or larger accessibility text. Its
`min-height` is a floor (`clamp(500px, 44vw, 780px)`), never a fixed height.

---

## 3b. Media and motion

**The How it works clip loops, so it must carry a pause control.** Anything that moves for more
than five seconds needs a way to stop it (WCAG 2.2.2); a four-second loop is still moving
indefinitely, so the four-second duration buys no exemption. The button is therefore part of the
spec. Play-once-and-rest was built first and rejected: a single four-second play is over before it
registers.

State matrix for the clip:

| Condition | Behaviour |
|---|---|
| First load, section far from viewport | Poster only. `preload="none"`, no video bytes fetched. |
| Section within 400px of viewport | Source attached, playback starts, loops. |
| Scrolled away (>400px) | Paused. Resumes on return. |
| User pressed pause | Stays paused. Re-entering the section must NOT resume — the explicit choice outranks the automatic behaviour. |
| `prefers-reduced-motion` | Nothing fetched, nothing played. Poster only; the button becomes an opt-in Play. |
| Autoplay refused (data saver, low power) | Poster stays, button reads Play. Never an error state. |

**Two crops, chosen in JS.** `<video>` ignores `media` on `<source>` in every current browser, so
the 2.4:1 desktop file and 3:2 mobile file are selected once at mount via `matchMedia`, and the
CSS `aspect-ratio` at the same 1024 breakpoint must agree with that query or the poster and the
clip disagree about their shape. This is not a prototype shortcut — it is the only way to
art-direct a video source. Production additionally needs a WebM alongside each MP4, and the
posters served at the right size rather than one file for all viewports.

## 3c. Why 44px is our touch-target floor

44×44 is **not** the WCAG AA minimum, and the rule should not be relaxed on the belief that it is.
AA's SC 2.5.8 Target Size (Minimum) asks for 24×24 with exceptions; 44×44 is SC 2.5.5 Target Size
(Enhanced) at AAA, and matches Apple's and Google's platform guidance. We hold 44 as an internal
minimum because over 70% of traffic is mobile commerce — comfort, not compliance, is the argument.

Sizes are a deliberate hierarchy, not one value everywhere: the further a control is from the
moment of purchase, the smaller it can be. The mobile purchase bar is 48 rather than 44 because it
is the control a shopper returns to repeatedly with a thumb, so it earns more than the minimum.
The ladder is recorded in `CLAUDE.md`.

Where practical, enlarge the visible control rather than relying on invisible padding. Invisible
expansion is legitimate but pointless on a primary CTA, and it makes the button look less
important than it is.

**The clip pause/play control is an exception to the visible-size rule only, never to the 44px
target.** Its 34px disc keeps the media box uncluttered; the interactive area around it is still
44×44 and must stay that way.

## 3d. Dish data — the swap contract

**All dish content is placeholder.** Names, components, descriptions, macros, heat levels and
photography are stand-ins taken from the existing site so the section could be built and reviewed;
none of it is signed-off product data. It is structured so that replacing it touches data only.

One array, `DISHES`, in the homepage logic class. The template loops it and reads nothing else, so
adding, removing or reordering dishes needs no markup change. Record shape:

| Field | Notes |
|---|---|
| `imageKey` | Key into `IMAGES`, **not** a file path — see below |
| `title` | Clamped to 2 lines in the card; long names cannot change card height |
| `parts` | **Required.** See the equal-height note below |
| `description` | Desktop only (hidden under 1024) |
| `category` | Renders the cream pill. Optional |
| `isNew` / `isSignature` | Booleans → the brass-ink and navy pills |
| `heat` | 0–3. Drives the pips AND the accessible label via `HEAT_WORD` |
| `protein` / `fibre` | Grams, numbers not strings |
| `placeholder` | `true` when the photo is not of this dish |

**One source of truth for photography, and alt belongs to the photograph.** Records carry
`imageKey`; `IMAGES` maps key → `{ src, alt }`. There is deliberately no path or alt on the dish
record — two sources of truth would drift. Alt text has to describe the picture actually shown, so
a stand-in borrows the real shot's description rather than the dish's: the Jollof Quinoa Bowl card
is announced as the goat efo photograph, because that is what is on screen. Swapping src and alt
is then a single edit. (This was got wrong first time — the card claimed to show jollof quinoa
while displaying goat efo. Keeping alt on the dish record is what caused it.)

**`parts` is required on a homepage record.** The four cards are equal height and the components
line fills the middle of the card; a record without it leaves an ~84px void between title and
nutrition rule while its neighbours have none, which makes half the row look unfinished. Two of
the four `parts` strings are AUTHORED from the dish description (marked in the source) because the
menu data has no components line for those dishes — they need sign-off with the rest of the copy.

**`placeholder: true` must be a hard production failure, not a warning.** It renders nothing and
exists solely so stand-ins are greppable; a build that ships one is advertising a dish with a
photograph of different food, which is the ASA/CAP risk already logged against the hero. Today
one record carries it: Jollof Quinoa Bowl uses the goat efo photograph. Three of the four cards
use genuine photography.

**Deliberately omitted from the built card**, both present on the older desktop-first homepage:
the hover tooltip that revealed a truncated dish name, and the Signature upgrade banner and
info tooltip. None of the four current titles truncate, so the tooltip would never fire; the
Signature treatment is reduced to the navy pill, per the approved mockup.

## 3e. Hyphenated compounds — protect at render time, not in the content

The design rule is that a hyphenated compound never splits across lines ("Lime- / Herb Purple
Cabbage"). In hand-written markup that is a `white-space: nowrap` span around the compound alone,
so wrapping still happens at the spaces either side.

**The prototype currently uses a non-breaking hyphen (U+2011) inside some dish strings. Do not
carry that into the build.** It works visually, but it makes the content responsible for layout,
and the character does not survive a CMS import, a copy/paste, Unicode normalisation, a search
query, or an editor simply typing an ordinary "-". Content editors should never have to remember a
special character to keep the layout intact.

Production approach:
- Dish data keeps **ordinary hyphens**: `Lime-Herb Purple Cabbage`.
- The card component protects an **approved list** of compounds at render time, emitting
  `<span class="keep-together">Lime-Herb</span> Purple Cabbage`.
- The rule then lives with the component and applies to any future dish automatically.

**Do not blanket-apply it.** A long compound forced unbreakable can overflow a narrow column —
which is exactly how the earlier `nowrap`-the-whole-phrase attempt broke the hero facts row. Test
each candidate at the narrowest supported width before adding it to the approved list.
`Mediterranean-inspired` and `Fall-off-the-bone` are deliberately left breakable pending that
test; tag labels keep ordinary hyphens and are protected by `nowrap` on the pill instead, which is
the render-layer pattern already in place.

## 3f. What the dish carousel changed for every later section

Five patterns came out of this section and should be treated as the house style from here on.

**1. Derive geometry, never restate it.** The page-bottom clearance for the sticky bar was written
as a literal four times and was wrong each time the bar's content changed. It is now measured from
the bar itself into a custom property. Any value that describes another element's size belongs in
a measurement, not in a comment claiming the arithmetic.

**2. Observers that write styles must be deferred.** Dedupe on the value, write in
`requestAnimationFrame`, cancel on unmount. Otherwise the write feeds back into the thing being
observed and the browser reports an undelivered-notification loop.

**3. Placeholder content needs a flag, not a note.** Every dish record carries `placeholder: true`
while its photograph is a stand-in, and alt text lives with the photograph rather than the dish.
The build must treat a remaining flag as a hard failure — it is the only thing standing between
the prototype and an advert showing food we do not sell.

**4. Content rules that live in markup do not survive a move into data.** The hyphenated-compound
rule worked while the copy was hand-written and silently lapsed the moment the same copy came from
an array. Any typographic rule needs a data-side answer as well as a markup one (§ 3e).

**5. Re-measure after layout, three times over.** `componentDidUpdate` never fires in this
runtime, so anything geometric needs: a ref callback, a post-layout pass, an image `load` handler,
and a `ResizeObserver`. Two of the defects in this section were correct maths run against a layout
that had not settled.

### Meet the founder — what was settled

- Ground is the design system's `--blush` #E9CDB8. It reads lighter than that in the mockups, so
  both were pixel-sampled: #EACBB6 desktop, #ECD1BD mobile. A new lighter token was created and
  then removed once measured — **sample before inventing a token**.
- `assets/founder.png` is 1237×1272, so the media box is reserved **square at every width** and
  the photograph is never re-cropped between breakpoints. Still AI placeholder.
- Composition: stacked on mobile (photo then copy), still stacked at 640–1023 with the media
  capped at 480px so a square photo does not become 900px tall, and 50/50 with the copy
  vertically centred from 1024.
- "Esther Abby Josiah" is a `<p>` subtitle under the `<h2>`, not part of the heading, so the
  document outline reads "Meet the founder".
- Title 48px on desktop, name 32px, 10px between them. 60px was tried and reverted: **48 is the
  section-title size for every band on the page** and the founder is not an exception.
- CTA "Read Abby's story" is outline, 52px, no arrow — the page's section CTAs do not carry one —
  and follows the ladder: full width inside the gutters on a phone, intrinsic from 640. The
  mockup showed it intrinsic on mobile; the ladder won.
- Fourth coloured band, after Our standards. Abby's Story and Private Table remain on the list.

## 3g. Token migration — six page-local declarations to fold in

The rebuilt homepage declares six custom properties in its own `:root`, either overriding or
extending the bound design system. They live on the page so the sections could be reviewed without
touching the system; **each must move into the design system when the header propagates**, and the
local block then deleted. Until then, any page that reuses these components has to carry the same
block or it will render with the old values.

| Property | Value | Relationship to the design system | Why |
|---|---|---|---|
| `--terracotta` | #B7554E | **overrides** #B45F5A | Shipped token carries more blue and reads dull; this also clears white-on-fill at 4.75:1 (was 4.47:1) |
| `--terracotta-deep` | #9C433D | **overrides** #96474A | Matching hover/press for the above |
| `--gold` | #F6C33B | **new** | Bright accent for DARK grounds only — 9.3:1 on green-deep, 1.45:1 on cream, 1.2:1 on sage |
| `--brass-ink` | #8A5F1F | **new** | Brass as TYPE on light grounds. `--brass-deep` is only 3.47:1 on cream; this is 4.96:1 and still reads brass |
| `--chilli` | #B8431C | **new** | Heat pips. Graphic only, never type. The terracotta value quoted in the system's own guide, before the token drifted pinker |
| `--sage` | #E1E2D2 | **new** | Our standards band ground |

Rules that travel with them: **gold on dark grounds, brass and brass-ink on light** — they never
meet in the same band. `--brass` for rules, hairlines and large marks; `--brass-ink` whenever
brass is type. `--blush` was left alone: the founder band looked like a new lighter peach and
measured as the shipped value.

## 3h. Image and video assets — current state and what production needs

Every file below is AI-generated placeholder (§ Open items). Sizes are what the prototype ships,
not what production should.

| Asset | Dimensions | Weight | Used for |
|---|---|---|---|
| `hero-portrait.png` | 1086×1448 (3:4) | 2.1 MB | Hero, below 1024 |
| `hero-landscape.png` | 1774×887 (2:1) | 2.1 MB | Hero, 1024 and up |
| `founder.png` | 1237×1272 (≈1:1) | 1.9 MB | Founder, all widths |
| `dish-goat-efo.png` | 1200×896 (4:3) | 1.8 MB | Dish cards 1 and 4 (stand-in) |
| `dish-lamb-shank.png` | 1200×896 | 2.3 MB | Dish card 2 (stand-in) |
| `dish-fish-peppersoup.png` | 1200×896 | 1.6 MB | Dish card 3 (stand-in) |
| `hiw-poster-mobile.jpg` | 1080×720 (3:2) | 117 KB | Clip poster, below 1024 |
| `hiw-poster-desktop.jpg` | 1200×500 (2.4:1) | 101 KB | Clip poster, 1024 and up |
| `hiw-mobile.mp4` | 3:2 | 1.1 MB | Clip, below 1024 |
| `hiw-desktop.mp4` | 2.4:1 | 1.0 MB | Clip, 1024 and up |

**That is roughly 13 MB of PNG for one page, which is not shippable.** What production needs:

- **Photography as AVIF with a WebP fallback**, not PNG. These are photographs; PNG is the wrong
  container and accounts for nearly all the weight.
- **Real `srcset`/`sizes` on every image.** Only the hero uses `<picture>`, and only to switch
  art direction (3:4 below 1024, 2:1 above) — there is no resolution switching anywhere. The dish
  cards render a 1200px-wide file into a 360px box on a phone.
- **The clip needs a WebM alongside each MP4**, and the posters served at the right size rather
  than one file for all viewports.
- **Art-direction crops are fixed, not negotiable:** the hero must not serve the 3:4 to desktop,
  and the founder photo is reserved square at every width so it is never re-cropped.
- **The wordmark is `<at-wordmark>` (`at-logo.js`), inline SVG in `currentColor`** — one file recolours
  for every ground by the `color` of the box it sits in. It replaced the CSS `mask: url(assets/logo.svg)`
  treatment on 4 Oct 2026, which failed in single-file exports (a solid bar where the wordmark should
  be). Never reintroduce the mask, and never fork the logo into coloured files. See § 3u.

## 3i. Browser support

- **CSS subgrid is load-bearing** for the Our standards desktop layout — the four titles share a
  row track so the descriptions align at every width. Where it is unsupported the titles fall back
  to ragged; nothing breaks, but the alignment is lost. Baseline: Safari 16, Chrome 117, Firefox
  71. If the support target is wider than that, this needs a different mechanism, **not** the
  min-height that was tried and reverted (§ Runtime gotchas in CLAUDE.md).
- `ResizeObserver` drives the sticky-bar clearance and the tooltip caret. Both are guarded with
  `typeof ResizeObserver !== "undefined"`, and both consumers carry static fallbacks.
- `env(safe-area-inset-bottom)` is used with a `0px` fallback throughout.
- `aspect-ratio`, `clamp()`, `min()`/`max()`, `:focus-visible`, `text-wrap: pretty` and CSS
  `mask` are all used without fallbacks. `text-wrap: pretty` degrades harmlessly; the others do
  not, so they set the real support floor.
- `-webkit-line-clamp` clamps the dish titles, components lines and descriptions. Still prefixed,
  still required.

### Private Table — what was settled

- Ground is `--navy` #28365C, per the design system. Fifth sanctioned coloured band.
- **Accents are `--brass`, by decision, not `--gold`.** Gold is 7.3:1 on navy and brass 4.1:1, so
  three items sit just under the 4.5:1 AA small-text minimum: the 18px subline, the 16px
  Worldwide / UK-wide line and the 13px card labels. This was measured, raised, and brass chosen
  anyway on brand grounds — it is an accepted trade, not an oversight. Do not "fix" it to gold
  without asking. The card border and lozenge rules are decorative and unaffected.
  Note this is the one place on the page where the "gold on dark grounds" rule is set aside.
- The old section's eyebrow ("A private service") and its lozenge divider are both dropped — they
  read as one unit, and a divider with nothing above it floats.
- **One credentials card at every width**, full width on a phone. The old section had a bordered
  desktop card plus a separate borderless mobile copy of the same content — duplicate markup.
- Card labels raised 11px → 13px at .16em, to the mobile small-label floor.
- Copy is unchanged from the current live section, including "Private Table from £1,500".
- The CTA follows the standard ladder — full width inside the page gutters on a phone. A further
  12px inset was tried on premium grounds and **reverted**: it contradicted the recorded rule.
- Spacing was tightened after review rather than redesigned: subtitle→body 14px, 32px before the
  reach line, price 11px under the button, card dividers 14px, column gap 48px, and the copy
  column lifted 18px on desktop because its CTA and price line sit low against the card.

## 3j. Mobile purchase bar — full visibility logic

The bar is a canonical shared component: this logic is its definition, not a homepage detail, and
it propagates to every rebuilt marketing page. Desktop (≥1024) never shows it and never hides the
header.

**Scroll direction is the single source of truth.** One purchase CTA is visible at a time, and
nothing inside the header ever changes shape.

| Condition | Header | Purchase bar |
|---|---|---|
| Page load, hero in view | visible | hidden |
| Scrolling down, hero CTA still on screen | visible | hidden |
| Scrolling down, hero CTA gone | hidden | **visible** |
| Scrolling up, anywhere | visible | hidden |
| Drawer open | visible (never hides) | hidden |
| Keyboard focus inside header | visible (never hides) | unchanged |
| Cookie consent unresolved | normal | hidden (consent has priority) |
| Private Table's top above 75% of viewport, and everything below it incl. footer | normal | **hidden** |

Thresholds: an **8px movement threshold** and a **120px floor**, so a jittery scroll cannot
flicker either element.

**The suppression is positional and continuous, not a visibility test.** It begins when Private
Table's top crosses 75% of the viewport height and holds for the rest of the page — which is how
the footer is covered without being tracked separately. An IntersectionObserver middle-band test
was implemented first and rejected: it released while the tail of the section was still on screen,
letting the bar return exactly where it was not wanted. Consequence to know: **any section placed
below Private Table inherits the suppression.** It is the last band before the footer today.

**Releasing suppression never forces the bar back.** Scrolling up past Private Table lifts it, and
the bar then returns on the next downward scroll like anywhere else. Forcing it visible on release
would briefly put the header CTA and the bar on screen together, which is the exact thing the
direction rule exists to prevent. This was considered and rejected.

**Two reasons the bar exists at all** are worth keeping in mind when changing this: over 70% of
traffic is mobile, and the header's purchase pill scrolls away. Removing the bar removes the
persistent route to purchase on the majority experience.

Geometry: the bar's height is **measured**, not stated — a `ResizeObserver` writes it to
`--at-bar-h` and the page-bottom spacer consumes it. See § 3f, point 1.

## 3k. Content and data ownership

Governance rather than layout, and **beyond what a design handoff can sign off** — the
allergen and claim-approval rules need input from whoever owns food safety and legal. Structure is
specified here; compliance is not confirmed. See `frontend-backend-contract.md` for the field-level
contract.

### Three ownership layers

| Layer | Owns | Examples |
|---|---|---|
| **System of record** | operational truth | nutrition, allergens, price, availability, portion options, delivery lead time |
| **CMS** | editorial content | founder paragraphs, Private Table copy, standards explanations, imagery |
| **Template / config** | controlled UI | CTA labels, routes, icon keys, component structure, layout behaviour |

Plus an **assurance layer** across all three: release gates (below). Not a fourth owner — a check.

### Rules

- **CMS references system-of-record data, never duplicates it.** A dish page may choose whether to
  show protein and fibre; the values come from the menu model. Project or cache for performance;
  never copy into editable fields.
- **Alt text belongs to the media asset**, with a contextual override permitted. The override is
  **bound to the asset version** — replacing the asset clears it or flags it for review. Store
  `asset_id`, `asset_version`, `alt_override`, `alt_review_status`. Without this, a swapped
  photograph inherits a description of the previous one, which is the bug we already fixed once.
- **Standards items carry an `icon_key` from a fixed set.** Never an uploaded icon, or the visual
  language drifts.
- **Founder copy is repeatable paragraph fields, not rich text.** Editors change words, not
  structure. A WYSIWYG block lets someone insert headings and lists the design does not support.
- **Canonical UI copy is not editable.** "Build a Box" is config, not content.
- **Navigation is one controlled object** — `label`, `route`, `order`, `visible` — not editable
  labels pointing at hard-coded destinations.
- **Marketing claims need traceability, not just approval.** "No seed oils" and "No commercial
  seasoning blends" are approved copy with nothing behind them today. The two approval workflows
  need a shared identifier so a claim can point at the record substantiating it.

### Staleness

| Data | Delivery |
|---|---|
| **Allergens** | safety-critical — must be serving current approved data before the dish stays orderable |
| **Nutrition** | immediate revalidation after approved change |
| **Price, availability, earliest delivery date** | runtime or edge, never build-time projection — too volatile |
| **Editorial** | normal publication cycle |

**Allergens fail closed.** If invalidation fails, stale allergen data must not stay served.
**OPEN — needs your decision:** whether that means the dish becomes unsellable, or falls back to
server-rendering allergens from source on demand. Recommended: the fallback. A rule whose safe
state is also an unsellable state gets switched off under commercial pressure; one that degrades
to a slower but correct render survives.

### Approval

Two workflows, deliberately separate:

- **Marketing / controlled claims** — CMS draft → authorised approval → publish.
- **Food data** — recipe, nutrition or allergen change → operational approval → propagate → dish
  sellable. Not governed by the marketing CMS.

"Controlled" rather than "regulated": some are legally sensitive, others commercially or
reputationally so.

### Audit

A **publication snapshot** per release, holding enough immutable version information to
reconstruct what a customer saw on a given date: content revision, config revision, referenced
media versions, controlled-claim versions, resolved nutrition and allergen versions, gate results,
timestamp. Field-level history answers "what was this value"; the question actually asked is "what
did this page say on 14 March" — including that the salmon showed 38g protein and declared
mustard. Gate results are part of the snapshot so "was that a real photograph of that dish" stays
answerable.

### Release gates

Some fail the deployment, some only block that dish from publishing or being orderable. Which is
which is an implementation decision.

- `placeholder === true` → hard failure
- required product image missing → failure
- image awaiting alt review → failure
- allergen record missing → dish cannot publish or be ordered
- controlled claim not approved → cannot publish
- broken dish or route reference → failure
- invalid nutrition schema → failure
- production content referencing unpublished CMS records → failure

These are the protections that vanish during a CMS migration unless they are explicit acceptance
criteria.

### Footer — what was settled

- Becomes the **canonical shared footer** on approval. Mobile-first, on the 1280 shell (the old
  one used a 1440 header shell over 1280 content).
- Mobile is centred throughout and the three link columns are **collapsible accordions**; at 1024
  the accordion is switched off (all columns open, heads become plain labels, chevrons hidden)
  rather than being built for desktop and overridden down.
- **Dropped:** "Journal" and "Discovery Box" — no such pages. **Added:** How it works and Our
  standards to Learn, plus legal links and a consent line on the signup, which previously
  collected an email address with no lawful basis stated.
- **One destination does not exist yet — Privacy Policy.** It stays on `#contact` rather than
  pointing at a file that would 404. Delivery & FAQs, Allergens, Contact us and Terms are all built
  and wired across every rebuilt page.
- **A Privacy Policy is a launch blocker, not just a missing page.** The site already collects
  three kinds of personal data with no policy behind the link: newsletter signup, the not-in-area
  notify-me capture, and the contact form including image uploads that may carry EXIF location.
  Every one of those consent lines points at a Privacy Policy that does not exist.
- Company registration details are not in the footer — none supplied. A UK trading site normally
  carries them; space is available in the legal strip.
- Signup: stacked 52px field + 48px button on a phone, one pill from 640. The field is not a CTA,
  so it is not on the button ladder. The combined pill is deferred to 640 because at 320 it left
  the input about 150px, which cannot show the placeholder.
- "Abby x" is **25px, not the old 22**: terracotta is 3.2:1 on green-deep, which only clears the
  3:1 large-text threshold at 24px and above.
- Consent line is 13px, not 14 — the intro above it is 16px and the type floor forbids two body
  sizes within 2px of each other.
- "Cookie preferences" is an `<a href="…#cookies" data-consent-open>`, not a button: a real link
  to the Privacy cookie section, progressively enhanced into a dialog trigger where the consent
  manager is mounted (§ 3s). It was previously an inert `<button>`; the anchor is the canonical
  pattern on all six rebuilt pages.
- All footer type clears AA on `--green-deep`: brass 5.2:1, green-sage 5.4:1, sand-2 9.9:1,
  blush ~12:1. The old footer's problems were type sizes and touch targets, not colour.
- Two defects found in review and worth remembering: the accordion never collapsed because an
  inline `display: flex` beat the non-important class rule, and the pill's input had no
  `flex: 1; min-width: 0`, leaving 47px of dead space and a clipped placeholder.
- **@FromAbbysTable is plain text, not a link.** The four icons above already reach the accounts;
  a fifth route to the same place is redundant. No hit area or hover on it.
- Social icons are `<a>` with `aria-label`s and share `.at-social` with the drawer, so the hover
  language applies in both places.
- **Approved, mobile and desktop. This is now the canonical footer** — other pages inherit it via
  their own v2 copy when we reach them.
- The purchase-bar clearance spacer was **removed from this page** — see CLAUDE.md; it is not a
  site-wide deletion.

### Homepage section order — canonical, and load-bearing

Hero → How it works → A taste of the table → Our standards → Meet the founder → Private Table →
footer. **Complete** — the old homepage's boxes promo and gifting sections are removed, not
pending. The Gifting page itself remains and is still linked from the nav and the footer.

This is not cosmetic. The mobile purchase bar's suppression is **positional** — it starts when
Private Table's top crosses 75% of the viewport and holds for everything below, which is how the
footer is covered without being tracked separately. So **anything inserted after Private Table
inherits the suppression**, and reordering the tail of the page changes the bar's behaviour.
Sections added below it need that rule revisited.

## 3l. Delivery & FAQs — the first non-homepage rebuild

File: **`Abby's Table - Delivery and FAQs.dc.html`** ("and" not "&" — the ampersand blocks
scripted edits; the page title still reads "Delivery & FAQs"). Header, drawer and footer are
copied **verbatim** from homepage v2 rather than re-derived. `$preview` 390.

**It is an information page, not a sales page**: no hero and no mobile purchase bar. Its own
conversion path is check-postcode-then-build, so a persistent Build a Box would compete with the
thing the page exists to do.

### Postcode checker — nine states, and how they are reviewed

Live test inputs cover the normal flows: `DA1 2AB` delivers, `AB12 3CD` is not-in-area, `DA1ABC`
is invalid, an empty field prompts. The remaining states need production services, so they sit
behind a **development-only `stateOverride` prop**.

- **The override must never reach the customer-facing build.** It is a review affordance.
- Field-level messages (empty, invalid, geolocation refused) appear **beside the input**, never as
  a result panel: a malformed entry is a correction to make in place, not an outcome to announce.
- A **lookup failure is a genuine technical-failure state**, neutrally worded, entry preserved,
  retry the only action. It is not a delivery outcome.
- **Not-in-area shows no Build a Box** — there is nothing to order into — and offers a notify-me
  email capture instead.
- Build a Box carries the checked postcode forward: `?postcode=…`, so the customer is not asked
  twice.
- **Coverage list is a placeholder.** `NOT_YET` holds outward-code areas; the real list comes from
  the courier's coverage, not from us. `PC_RE` is a **format check only** — it cannot tell a real
  postcode from a well-formed invented one, which is also why the failure state exists.
- **Geolocation is simulated.** Production needs `navigator.geolocation` plus a
  coordinates-to-postcode lookup, then the ordinary check.
- Mobile only, the result panel is scrolled just under the sticky header on a real outcome —
  otherwise a customer can check a postcode and see nothing change. Never on a validation message.

### FAQ search — behaviour and why the index is what it is

- **The index is read from the live DOM**, so the questions remain the single source of truth:
  adding a question needs no data entry and search cannot drift out of step with the page. It also
  means the groups are hidden with CSS rather than unmounted — unmounting would take the index.
- Answers in results are **copied from their source question**, so bold values and lists survive
  rather than being re-authored as plain text.
- Empty field = browse. **One character = search state with "Keep typing to search"** (the topic
  grid never returns while a query is present). **Two or more = live search**, 180ms debounce.
- The clear × is driven by the **raw input value**, not the debounced query, so it never lags a
  keystroke. Results stay debounced.
- Every term must match, so multi-word queries narrow. A hit in the question ranks above an
  answer-only hit.
- **Exact-duplicate questions are dropped from the index** (first in document order). Results
  carry no topic label, so the same question twice read as a rendering fault. See § Open items for
  the near-duplicate pair that this cannot catch.
- An open answer **collapses on any query change** — rows are reused by position, so an answer
  left open would sit under a different question.
- Submit dismisses the keyboard and brings the results heading under the header, driven from the
  handler and re-asserted until the panel exists. **Not** a flag tied to first render: with live
  search the panel is usually already mounted, so a mount-time flag almost never fired and could
  survive to fire on a later search.
- Native `<details>`, not data-driven: the copy is under review, so every question is literal,
  editable markup with no per-item state.
- The **eight-topic grid replaced a horizontal jump-link row with scroll-spy** — eight topics could
  not fit without side-scrolling and the row had no room to grow. Question counts are measured from
  the groups, never written in. No eyebrows, no icons on the cards.

### Mobile-specific decisions

- **Order differs by breakpoint**: postcode check → search → delivery highlights → topic grid →
  FAQ groups. Desktop keeps highlights above search. Done by reordering two sections inside one
  flex column — one set of markup, no duplication.
- **The four delivery highlights are hidden below 1024.** Content prioritisation, not
  duplicate-and-hide: `display: none` removes them from the accessibility tree too, and all four
  facts are also covered by the Delivery and Storage & reheating answers, so nothing is only there.
- Clearing the search does **not** refocus the field on mobile (the keyboard would cover the topic
  grid it just restored); desktop keeps the focus.
- The search field and its results share a **900px reading column**; the topic grid keeps the full
  1280 for its four-card row.

### Two canonical-component fixes made here

Both are semantics only, no visual change, and both propagate:

1. **Footer column heads are labels at desktop.** They keep `role="heading"` with a level, drop
   `aria-expanded`/`aria-controls` and leave the tab order from 1024, and the toggle is inert.
   Set in JS because attributes cannot be swapped in CSS.
   Reconciled across all five rebuilt pages after an audit found **two different implementations**
   of it — a container ref on the homepage and Delivery & FAQs, a per-element ref on Contact,
   Allergens and Terms — plus a shared latent bug: neither restored `aria-expanded` on the way
   back to mobile, because React only rewrites an attribute when its value changes. All five now
   run one `_footSemantics()` off the footer container ref, capture the original ARIA in
   `data-` attributes, and guard `_footToggle` at desktop. **Copy the footer from the homepage**
   so the per-element variant is not reintroduced.
2. **The drawer is always mounted**, closed with `display: none`, so the burger's
   `aria-controls="at-drawer"` always resolves. Focus moves in `open()` rather than the ref
   callback, since the panel now already exists.

### Contact — what was settled

File: **`Abby's Table - Contact Us.dc.html`**. Same page type as Delivery & FAQs — an information
page, so no hero and no mobile purchase bar. Header, drawer and footer verbatim from homepage v2.
`$preview` 390.

- **Direct routes come before the form.** Four method cards (Phone, Email, WhatsApp, FAQs) sit
  above it: someone who wants to phone should not scroll past a form to find the number. One
  column on a phone, two at 640, four from 1024.
- **Desktop is form-left, routing-right; the form stays first in the DOM** at every width, so the
  reading order matches the intent that brought them here.
- **Validation is ours, not the browser's** (`noValidate`): native bubbles cannot be styled, are
  announced inconsistently and vanish on scroll. Inline, persistent, `aria-invalid` +
  `aria-describedby`, and an error clears as the field is corrected so it never contradicts the
  screen. On submit, focus goes to the **first error in field order** — on a phone the messages are
  below the fold, so a submit that only paints red looks like nothing happened.
- The message field requires 10 characters. Not a count for its own sake: a two-word message
  cannot be answered, and finding that out by reply wastes a day of the two promised.
- **Success replaces the form** rather than appearing beside it — leaving it up invites a second
  send. It promises a reply **within two working days** (user's choice) and echoes the address.
- **Order number is optional and only shown for "An existing order"**, with help text saying to
  send without it if they cannot find it. A required reference would block the person most likely
  to need help.
- The **open/closed indicator** is computed in local UK time from one hours table, accounts for
  weekends and a bank-holiday list, and re-checks each minute. Colour is never the only signal —
  the words "Open now" / "Closed" carry it.
- Subject options: existing order, new order, dish/ingredients/allergens, delivery, gifting,
  something else. Chosen to route, and because "dish, ingredients or allergens" is the one a food
  business must not lose in a general inbox. **Private Table is deliberately NOT an option** —
  those enquiries go through that page's own waitlist form, which the side panel deep-links to.
- **Optional image upload**, up to 3 images, 10MB each, JPG/PNG/HEIC. A photo is the fastest way
  to show a problem with a dish or a delivery. The drop zone is not the control — "browse files" is
  a real button, so the field works without a pointer. Invalid files are reported by name and the
  valid ones still attach, rather than the whole drop being rejected. HEIC often arrives with an
  empty MIME type from older phones, so the extension is a fallback. Object URLs are revoked on
  remove and unmount.
- The side panel is **one Private Table panel, not two cards**: "Delivery & FAQs" is already a
  method card at the top, so repeating it below was the same route twice.
- The Private Table panel carries **the homepage band's own treatment, not a tint of it**: `--navy`
  ground, brass eyebrow and lozenge hairline, cream title, sand-2 body, cream pill with the same
  "Find out more" label. Two lighter grounds were tried first (a peach sampled from the mockup,
  then a computed OKLCH navy tint) and both read as a generic card — **the navy ground is what
  makes the service recognisable**, so no new token was needed after all.
- Brass on navy is 4.1:1 there, the accepted Private Table trade already recorded in CLAUDE.md —
  same reason, brand recognition. Body copy is `--sand-2` at 8.0:1, so reading text clears.
- The h1 was corrected to the homepage standard `clamp(38px, 11.6vw, 56px)`. **Delivery & FAQs
  still uses the old `clamp(34px, 9.6vw, 44px)`** and should be brought into line.
- **WhatsApp is the highlighted card** — ground `--sage-tint` #E8E9DC with a `--sage` hairline, and
  the note "Usually the quickest way to reach us." **Full `--sage` was not usable**: it measures
  4.28:1 against `--brass-ink` and the card's eyebrow is 13px, so the band colour itself fails the
  small-text minimum. The tint is 4.58:1, green-forest 10.1:1, brown 6.9:1 — and it reads as a
  highlight rather than a second coloured band in a row of cream cards. New pending token.
- Card order is **WhatsApp, Email, FAQs, Phone** on desktop and **WhatsApp, Email, contact form,
  Phone** on mobile, with FAQs moving into the "Looking for something specific?" group below 1024.
- **The subject field is a native `<select>` and must stay one.** Style the CLOSED control only —
  height, border, radius, type, spacing, focus, chevron — to match the other fields, and let the
  device's own picker take over on tap. The open state is drawn by the browser/OS outside the
  document: it varies by platform and version, cannot be styled, and is **not part of Abby's
  Table's design system**. Do not build a custom listbox to make the open state match the site —
  that means reimplementing keyboard support, focus trapping and typeahead, which is the defect
  already logged against the menu page's sort control. The mockup's picker is illustrative only.
  Already true in the prototype: `<option value="">` for "Choose a subject", so it fails
  validation like an empty field; a real `<label for="c-topic">`; and errors appear on submit, not
  while choosing. **Still to do: test on iOS Safari and Android Chrome on real devices.**
  One deliberate layout shift: choosing "An existing order" reveals the optional order-number
  field, which moves the fields below it.
- **No live chat and no contact-form failure state** — see § Open items.

## 3m. Mobile type scale (settled on Contact, applies to every rebuilt page)

Recorded here as well as in `CLAUDE.md` so it is not agent-only guidance — a developer or a
different tool needs to be able to find this rule.

| Role | Size |
|---|---|
| Page title | `clamp(38px, 11.6vw, 56px)` mobile, 56px+ desktop |
| Section title | `clamp(30px, 8.6vw, 40px)` mobile, 48px desktop |
| Section intro / lede | 18px at every width |
| Card / panel action or value | **22px** Playfair Display |
| Supporting copy | **16px** — one size, never mixed with 14 or 15 for equivalent content |
| Error messages, actionable helper text | **16px** — information, not microcopy |
| Input / select / textarea text | **16px minimum** — sub-16px triggers zoom on iOS |
| Tertiary metadata (file formats, size limits, captions) | 14px |
| Customer-facing privacy or legal notes | 14px minimum |
| Field labels, eyebrows | 13px uppercase, .16em |
| Button labels | 13–14px uppercase, .12em |

- Display face is **Playfair Display**, not Fraunces.
- **Long unbreakable values wrap rather than shrink.** The contact email is 22px like its siblings
  and wraps after the "@", using a zero-width space so it cannot split mid-domain. The threshold is
  a **card width, not a viewport width** — the page has three gutter regimes, so a viewport figure
  does not survive a gutter change. It is a single line once the card is **≥356px wide**:
  a **400px viewport** in the single-column layout, and **~790–820px** in the 2-up band (792 at the
  34px gutters in force from 640, 820 at the 48px gutters from 1024). It is therefore **two lines
  at every common phone width — 320, 360, 375, 390, 393**. 20px and 18px both
  still overflow a 320px card, so a size exception never solved the case. At 320px the decorative
  arrow is dropped — it is `aria-hidden` and the whole card is a link, and the domain alone fits
  the column while the arrow does not.
- **Desktop may hold a different size where column geometry demands it**: the contact cards keep
  19px at 4-up and the email 16px, because the card leaves 124px beside the QR. A named exception
  for one row — mobile is never reduced to fit a desktop constraint.
- The footer's consent line stays at its canonical 13px. Do not harmonise unrelated components
  that happen to sit 1px apart.

## 3n. Producing a standalone HTML file (learned the hard way)

A single self-contained file is the right thing to hand to anyone outside this project — the raw
`.dc.html` only renders next to `support.js`, `_ds/` and `assets/`.

- The bundler inlines **only what it can see in the document**. Anything assigned at runtime is
  invisible to it: the homepage's three dish photographs (set through a ref), and the clip's
  `src` and `poster` (chosen by `matchMedia` in the logic). The first homepage export shipped with
  four broken images and no video.
- Procedure that works: substitute those paths for data URIs in a **temporary copy at the project
  root** (so every other relative path still resolves), bundle that, then delete the copy. Never
  edit the compiled output.
- Sizes today: Allergens 797KB, Contact 858KB, Delivery & FAQs 920KB, Privacy 925KB, Terms 1.0MB,
  Terms print copy 818KB, **homepage 21.9MB** — the homepage carries two videos and five
  photographs inline. That figure is a placeholder-asset artefact, not a target; see § 3h.
- **The runtime-assigned list is six files, not four**: the three dish photographs
  (`dish-goat-efo`, `dish-lamb-shank`, `dish-fish-peppersoup`, set through `IMAGES` in a ref), the
  desktop poster, and both clips. `hiw-poster-mobile` is in the markup, so the bundler sees it.
  Substituting all six and then listing what still points at `assets/` is the check that the
  substitution was complete.
- **Checkout steps 1 and 2 need the same substitution.** Choose Box v2 picks the carried dish's
  photograph from its `DISHES` map, and Add Dishes v2 assigns all three dish photographs through
  `IMAGES` in a ref — both at runtime, so both are invisible to the bundler. The maps sit ABOVE
  `class Component`, so substitute across the whole logic script, not only the class. Verify with
  `?dish=ata-dindin-lamb-shank` on step 1 (the dish with no resource meta) and by opening a dish
  dialog on step 2.
- `export/Abby's Table - Terms of Sale (print).html` is the bundled **print copy** (§ 3r), not a
  second copy of the page: it is the file to open and print for a real paginated PDF.
- Each page needs a `<template id="__bundler_thumbnail">` in `<head>` before it can be bundled.
- **Regenerate every export after any shared-component change.** They are compiled snapshots, so a
  footer or header fix does not reach them — the user holds download cards for these files, and
  stale ones make a claim of site-wide consistency untrue for the artifacts they actually have.
  This bit once: the Contact and Allergens standalones still carried the superseded per-element
  footer-semantics code after it had been removed from source.

## 3o. What the page-copy chain costs

Each rebuilt page was copied from the last, so each arrived carrying the previous page's CSS.
Cleaning that up found one genuine regression and a lot of noise, worth knowing before the next
page is built:

- **A shared rule line took an unrelated selector with it.** The footer Join button lost its
  `:active` press state because it shared a declaration with the postcode buttons, which were
  stripped at file creation. One button on the page had no press response, against our own rule.
- **Comments outlive their rules.** Contact carried 41 comment blocks describing a hero, dish
  cards, a Signature tooltip and an FAQ search it does not have; Delivery & FAQs carried 14. In a
  handoff document that is worse than dead CSS, because the prose reads as authoritative.
- **Dead `renderVals` keys and unwired refs.** `footHeadRef` was returned but never bound in
  markup, so the footer's desktop heading semantics never applied on that page — a silent
  accessibility regression that only a both-directions audit finds.
- Recommendation for the next page: strip inherited CSS and comments **first**, then audit holes
  against keys in both directions, then re-check the components you did not intend to touch.

### Allergens — what was settled

File: **`Abby's Table - Allergens.dc.html`**. Third information page, so the same shape as
Delivery & FAQs and Contact: no hero, no mobile purchase bar, canonical chrome verbatim.
`$preview` 390.

- **The 14 are a plain `<ul>`, not links or buttons.** User's call: there is no per-allergen
  destination, so no icons and no chevrons either — a chevron on an inert item promises something
  the page cannot deliver. This also means the page needs no JavaScript beyond the shared chrome.
  If per-allergen detail is added later, the items become buttons and each needs a disclosure
  panel; the grid does not otherwise change.
- The list is the **UK regulated 14**, verbatim and in the mockup's order. 2 columns on a phone,
  3 at 640, 4 from 1024.
- **No search.** Fourteen scannable items, and it would filter toward nothing.
- The cross-contamination statement gets its **own `--blush` panel** so it cannot be read as
  supporting copy, and is stated in words rather than relying on the icon.
- **The sidebar is ONE order at every width**: Our approach, Need more help, Useful links. After
  the caveat that reads as an escalation — how allergens are handled, then a person, then links.
  The mockup leads with Need more help, and it was built that way first with a flex `order` swap
  below 1024; that desynced visual and DOM order and both panels hold links, so tab focus jumped
  152px back up the page. The three panels are independent self-labelled peers, so a single order
  costs nothing. **Do not reintroduce the swap at either breakpoint** — reversing it only moves the
  same defect to desktop.
- Both sidebar destinations already existed: `Abby's Table - Standards v2.dc.html` and
  `Abby's Table - Menu Landing v3.dc.html` (v2 until the menu rebuild). Contact us and the FAQs
  link are wired too.
- The footer's **Allergens link is now wired on all four rebuilt pages**. Only Privacy Policy and
  Terms remain parked.

### Terms of Sale — what was settled

File: **`Abby's Table - Terms of Sale.dc.html`**. Fourth information page. Canonical chrome
verbatim, `$preview` 390. 56 numbered clauses in eight groups.

- **Composition follows the terms2 mockup**: grouped index left, clauses right from 1024. The
  flat 56-item index from terms1 was explicitly rejected — it does not scale and gives no sense of
  where you are.
- **The index is FIRST in the DOM at every width.** Nothing is reordered, so focus order matches
  the visual order (the rule learned on Allergens).
- **One nav element, three presentations**: collapsed under "Jump to a section" on mobile, a fixed
  bottom sheet when opened from the floating control, and a sticky column from 1024. Never a
  second copy.
- **A group is open by default only while its clauses are being read**; a manual toggle sticks for
  that group. The scroll-spy drives `aria-current` by writing the attribute directly rather than
  through a hole — 56 links re-rendering on every scroll frame is work the page does not need.
- **The floating Sections / Top pair is mobile only**, and suppressed until the first clause has
  been passed so it never sits over the introduction. Escape closes the sheet, focus returns to the
  Sections button, and a jump link inside the sheet dismisses it so the destination is not left
  behind the panel.
- **Clause titles are 22px → 26px**, the recorded card/panel heading tier. The mockups draw them
  nearer 30px; a repeated titled block is what that tier is for, and 40/48px is the page-section
  size, not a clause size. No new size was invented.
- **Five food-standards glyphs** drawn in the Our standards language (thin stroke 1.6, brass-ink,
  `aria-hidden`, each standard stated in words beside it). Like the standards four, these are
  in-house and ours to approve, not brand assets.
- **Deliberately not taken from the mockups:** the "LEGAL" eyebrow (the site has none), the script
  "Good food brings people together" line, the per-clause previous/next links at the foot of the
  content (only "Back to top" remains), the dish photograph inside clause 3, and the mockups' own
  footer — ours is canonical.
- **Three classes of drafting artefact were stripped** from the supplied copy, as notes to us
  rather than customer text: bracketed markers (`[sample legal name]`, `[if applicable]`,
  `[provisional]`), the legal citations, and clause 41's "this section can simply remain
  unpublished until they are introduced". Clause 41 now reads as live copy, so **if gift cards are
  not offered at launch, that clause should be removed rather than published**.
- Clause bodies are literal markup, not data-driven — the copy is under legal review, so
  editability matters more than cleverness. Same reasoning as the FAQ answers.
- The footer's **Terms links are now wired** in both the Information column and the legal strip.
  Only Privacy Policy remains parked. The label was shortened from "Terms & Conditions" to
  **"Terms"** across all five rebuilt pages; the page's own h1 stays "Terms of Sale", since that is
  the defined term the clauses use throughout.

### Terms of Sale — the document architecture (revised)

The page was first built showing one group of clauses at a time. That was wrong and has been
replaced: **all 56 clauses are always rendered as one continuous document**, and the index is
navigation over it. The rules are in CLAUDE.md; what a developer needs to know:

- **Anchors are slugs, and they are a public contract.** `#refunds`, `#allergen-information`,
  `#failed-delivery`. FAQ answers, customer-service emails, checkout and confirmation emails should
  all use these, and one architecture only — not a mix of `?section=`, `#30` and `/terms/refunds`.
  A legacy resolver still accepts `#s30` and `#30`.
- Clause numbers are **presentation**. The durable identifier is the slug, so a clause can be
  inserted later without breaking years of links.
- `pushState` on a deliberate clause click, `replaceState` for scroll tracking.
- The observer re-registers as refs land, because they arrive while the template streams.
- The mobile floating pair appears once the inline "Jump to a section" has scrolled away and is
  **suppressed over the footer** — same reasoning as the homepage purchase bar.
- **Still open, logged not built:** a new tab for Terms opened from checkout (checkout is not
  rebuilt), and a site-wide skip-to-content link — building it on Terms alone would leave the four
  other rebuilt pages inconsistent.
- **Terms versioning is an operational requirement, not a page feature.** The version in force when
  a contract is formed must be captured with the order; the site need not publish an archive at
  launch, but previous versions must be retained.
- The document restates policy that also appears in checkout, Delivery & FAQs, the Allergens page,
  dish labels and confirmation emails. **Reconciling those is a launch task** — two slightly
  different versions of the same policy is the main way terms become indefensible.

## 3p. Cross-page audit — what a full pass actually catches

Run after every shared-component change. The five rebuilt pages were audited end to end at the
close of this session; these are the classes of defect it found, in the order they mattered.

**Broken links that look wired.** "Terms" and "Contact us" were parked on `#contact` on pages whose
destinations now exist — the label had been changed without the href. **Whenever a page is created,
grep every other page for a parked link to it.** Still parked, correctly: Privacy Policy (no page).

**Two implementations of one canonical component.** The footer's desktop heading semantics existed
twice under different method names, so neither looked broken and a name-based search reported the
other as missing. Compare shared chrome **byte for byte** against the canonical file, not by
feature-spotting.

**Dead class hooks.** Twelve across four pages with no CSS rule and no JS reference, left by the
page-copy chain. Check both directions: selectors with no element, and elements with no selector.

**Stale comments.** Comments outlive the rules they describe and read as authoritative. Two on
Terms pointed at a media-query block deleted in the same turn.

**Byte-parity broken by whitespace.** Removing a class attribute leaves a double space; that alone
made four footers non-identical.

**What was clean and stayed clean**, so a future pass can compare: no duplicate ids, broken
anchors or broken ARIA references on any page; no untyped buttons; no missing streaming hints; no
`{{ }}` in an image `src`; no interactive target under 44px; `min-width` queries only, ascending;
one 1280/22 shell with 34/48 steps everywhere.

### Terms of Sale specifically

Audited clause by clause: 56 contiguous, every one in the index with a matching slug,
`scroll-margin-top` and a return link; outline 1/8/56/6 with no headings inside the nav; all eight
warm panels' small text at 5.57:1 or better; every listener removed, every rAF cancelled, the
observer disconnected; `pushState` for clause clicks and `replaceState` for passive tracking; the
legacy `#sN` resolver present; all 15 print selectors resolving to real elements.

### Privacy Policy — what was settled

File: **`Abby's Table - Privacy Policy.dc.html`**. Built on Terms of Sale, so it inherits that
page's architecture wholesale: one continuous document with every section always rendered, a
grouped index that is navigation over it rather than a controller, human-readable slugs,
IntersectionObserver scroll tracking, the floating Sections/Top pair on mobile, and the long-form
legal-document print stylesheet. 11 numbered sections in four groups, plus an unnumbered closing
"Changes to this Privacy Policy".

- **`#cookies` is a committed anchor.** Section 7's slug is `cookies` specifically so the cookie
  consent panel can deep-link to it — the client asked for a "Learn more about cookies" link
  straight to `/privacy#cookies`. Do not rename that slug.
- **All four tabular blocks are definition lists, not `<table>`s** — legal basis (13 rows),
  service providers (7), retention (11) and rights (7). Each is one-name-one-value, so a `<dl>`
  reflows to a single column on a phone without the per-cell `data-label` a responsive table
  needs. Column heads are decorative and `aria-hidden` — a `dl` already conveys the relationship.
  Two columns from 640.
- **The cookie table is deliberately not rendered.** The client's copy has it as four columns of
  placeholders, to be completed from a real audit. A table of nothing is furniture, so it is a
  panel saying the list is not yet published, what it will contain, and that technologies Abby's
  Table does not use will not be listed. **Replace with the real audit before launch.**
- **`--sage` was removed from this page's `:root`.** It carried a six-line note about the Our
  standards coloured band; this page has no band. The token stays on the homepage, where it is
  used.
- **20 placeholder values are marked in the page**, not hidden: dotted-underline italic "to be
  confirmed" marks. Section 5's seven providers, section 8's ten retention periods, section 10's
  international-transfer providers, and the waitlist unsubscribe method. Company details reuse the
  same placeholders as Terms; VAT is omitted, consistent with the not-registered-at-launch call.
- **Section 3's lawful basis for the Private Table waitlist is "Consent"**, not the earlier "Your
  request and/or consent". "Your request" is not a UK GDPR lawful basis, and privacy information
  has to name the actual basis rather than describe informally why someone supplied the data. This
  holds only while the waitlist form is the explicit unticked opt-in we designed — if it ever
  becomes something a customer is enrolled in by another route, the basis has to be revisited.
- Two in-page cross-references (section 2 → 4, section 8 → 7) use the same slug anchors as the
  index, so they work with JS unavailable.
- **Both "Cookie preferences" controls are outline** (`.at-p-cta-out`), and both open the consent
  manager (§ 3q). Outline because this is a utility action, not the page's primary call — it was
  briefly a filled green 52px CTA and read as the page's main CTA. No new button style was added.
  "Contact the ICO" is the same outline treatment. If two identical outline buttons on one page
  ever reads flat, differentiate the ICO link — do not promote Cookie preferences.
- **Print was rewritten against this page, not inherited.** The Terms list named three footer
  blocks and left `.at-foot-cols` and `.at-foot-legal` printing, which put the three footer nav
  column *heads* on the page with no links under them — they are accordions, collapsed by default.
  The whole `footer` element is hidden instead, so a new footer block cannot reintroduce it.
  `.at-t-nav` covers the index links, so `.at-t-jump` is not named separately. The external-link
  `::after` carries `text-transform: none` and `letter-spacing: 0`, or the ICO address inherits the
  button's uppercase and prints as "(HTTPS://ICO.ORG.UK)" at .12em.
- The h1 is "Privacy Policy" and the footer label is "Privacy Policy" — **not** shortened to
  "Privacy" (see § Open items).

## 3q. Cookie consent manager — canonical, site-wide

File of record: **`Abby's Table - Privacy Policy.dc.html`**. Built there because both entry points
live on that page and it is where the behaviour is reviewable in context. **Mobile is approved
first; the desktop composition is a separate step and there is no `min-width` rule for it yet.**
Copy it verbatim when it propagates — the project's shared components are byte-identical copies,
not child components.

**It replaced an inert stub.** `openCookiePrefs` was an empty function wired to a filled green
52px button, while section 7 told readers they could change their choices "at any time". That is a
promise the page could not keep, and it was the last functional blocker on Privacy.

### What it is

- **Banner**, first visit only. A non-modal `role="region"`: stealing focus on page load is
  hostile, and a reader may legitimately want to read the policy before choosing. **No dismiss
  control** — choosing is the only way past it, which is what keeps "nothing optional is set until
  you choose" true.
- **Preference panel**, opened from the banner's "Manage preferences", the section 7 button or the
  footer link — all three open the same panel. Modal (`role="dialog" aria-modal="true"`), focus
  trapped, Escape closes, body scroll locked. Closing without choosing brings the banner back, so
  the gate is never bypassed.
- **Four categories, matching section 7 exactly**: Essential, Preferences, Analytics, Advertising
  and measurement.
- **Essential carries a text mark ("Always on"), not a disabled switch.** A switch you cannot move
  is a dead control.
- Optional categories are `<button role="switch" aria-checked>` with `aria-labelledby` pointing at
  the row title. 44px hit area around a 46×26 track.

### Rules that came out of it

- **Reject must be exactly as easy as Accept.** Same height, same width, same label weight — only
  the fill differs. Anything quieter fails the "as easy to refuse" test, and a text-link Reject
  beside a filled Accept is the specific pattern to avoid.
- **The consent layer has priority over every other fixed-position element.** On Privacy the
  banner and the floating Sections/Top pair are both bottom-fixed, so an unresolved banner
  suppresses the pair. This is the same rule that already keeps the mobile purchase bar hidden
  while consent is unresolved (§ 3j) — now with a real implementation behind it rather than the
  `cookieUnresolved` prop standing in.
- **Light cream ground, not green-deep.** A dark sheet competes with the footer, and a light panel
  keeps the ordinary brass focus ring and light-ground contrast rules. 2px brass top rule, matching
  the footer. "Always on" uses `--brown` on `--sand`, not `--brass-ink` — brass-ink is 3.97:1
  there, under the small-text minimum.
- **Storage touches one key only**: `at-cookie-consent-v1`, holding `{v, ts, preferences,
  analytics, advertising}`. Reads and writes are wrapped in `try`/`catch` because storage throws
  rather than returning null in some private modes, and a privacy page that crashes on load is the
  worst available failure. An unparseable value is treated as no choice.
- **`ccResolved` starts `true`** so a returning visitor never sees the banner flash before storage
  is read; `componentDidMount` clears it for a first-time visitor and the slide-up covers the frame.
- The always-mounted `display: none` panel has the same focus-timing problem as an unmounted one,
  so focus is re-asserted per frame until `offsetParent` is non-null, bounded at 20 frames
  (`CLAUDE.md`, runtime gotchas). Focus returns to the control that opened the panel, falling back
  to the page `h1` when that control is itself now hidden — which is the normal case when the
  trigger was the banner.

### What it deliberately does NOT do

**No provider names, no cookie names, no durations, no categories beyond the four.** Those are
launch dependencies on the real production stack, not design decisions, and inventing them would
put untrue statements in a legal notice. The panel says so in place, pointing at section 7.

**It does not set or block anything yet.** No analytics or advertising tags exist in the
prototype, so the component is currently the *record* of a choice. In production it is the
**gate**: non-essential technologies must not fire until consent is given, and the stored value is
what each tag checks. That wiring is a build task.

### Launch checklist — the 21 "to be confirmed" values

None of these may ship. Marked in the page as dotted-underline italic marks so they cannot pass
unnoticed. **T** = blocked on the cookie/tag audit; **C** = blocked on the consent manager being
wired to real tags; **B** = ordinary business information.

| Where | Value | Blocked on |
| --- | --- | --- |
| § 5 providers | Payments | B |
| § 5 providers | Delivery | B |
| § 5 providers | Website and hosting | B |
| § 5 providers | Email and customer communications | B |
| § 5 providers | Analytics | T |
| § 5 providers | Advertising and measurement | T |
| § 5 providers | Fraud and security | B |
| § 5 prose | Payment provider named in the Payments subsection | B |
| § 6 prose | Waitlist unsubscribe method | B |
| § 7 prose | Third-party advertising/measurement providers | T |
| § 7 panel | **The whole cookie inventory** — every cookie and similar technology actually running, with provider, purpose, category and duration | T, C |
| § 8 retention | Orders and accounting records | B |
| § 8 retention | Customer account information (after "while active") | B |
| § 8 retention | Customer enquiries (after resolution) | B |
| § 8 retention | Complaint records | B |
| § 8 retention | Complaint images | B |
| § 8 retention | Food-safety and recall records | B |
| § 8 retention | Refund records | B |
| § 8 retention | Private Table waitlist | B |
| § 8 retention | Security logs | T |
| § 10 prose | International-transfer providers and the safeguards applying to each | B, T |
| Consent panel | Individual cookies, providers and durations per category | T |

Also placeholder, though not marked as such because they are shared with Terms of Sale: the
company name (Example Foods Ltd), registered office, company number, telephone number and email.

**Still outstanding beyond the checklist:** the whole policy needs legal review, and the cookie
inventory needs a real audit of what the production site actually loads — not a list transcribed
from this prototype, which loads none of it.

## 3r. Printing the legal pages — two different mechanisms

**The `@media print` CSS on Terms and Privacy is for the PRODUCTION site**: a customer pressing
Cmd+P on the real page. It is correct and stays — measured at ~25 pages with all 56 clauses
present and all chrome suppressed.

**It is not what the editor's PDF export uses.** Two separate failures were diagnosed here, and
they are worth keeping apart:

1. **`$preview` height capped the printed box.** The document lays out inside the runtime's
   `#dc-root > .sc-host`; a `$preview` height makes that a fixed box and print stops at the bottom
   of it — one page, however correct the content rules are. Both pages are now **width only**, and
   carry a print rule resetting the whole host chain (`height: auto`, `min-height: 0`,
   `overflow: visible`, `position: static` on `html`, `body`, `#dc-root`, `.sc-host`).
2. **Browser print from inside the editor prints the APP, not the design.** The give-away is the
   printed footer URL (`…?file=…&present=1`) and a single near-blank page. Nothing on the page can
   fix this — it is the wrong mechanism.

### The export route: a generated print copy

File: **`Abby's Table - Terms of Sale-print.dc.html`**. Built on the `doc-page` component, which
owns the sheet, the pagination and all print geometry — so the copy contains **no `@page` rule and
no print reset**, and the source's two `@media print` blocks are stripped out of it.

- **It is plumbing, not a page of the site.** Not linked from anywhere, not exported to
  `export/`, and never hand-edited.
- **Generated, not written.** The body is the source's `<main>` parsed and cleaned: index, sheet
  head, the 56 back-to-top links and the grid wrapper removed, then every `ref`, `on*` handler and
  `{{ }}` binding stripped, so the copy is fully static HTML with no logic class. Verified: 0
  holes, 56 clauses, 0 leftover chrome elements.
- **Regenerate it whenever the Terms content changes** — same rule as the `export/` snapshots. It
  carries a provenance stamp (`omelette-print-source`) naming the source version, and the export
  tool refuses a copy whose stamp no longer matches, which is the safety net rather than the
  process.
- Break hygiene added on top of the component's defaults: clause headings never end a page
  (`break-after: avoid`), and the info panels, notices, definition rows and standards grids stay
  whole.
- The sheet is ~7in of text measure, i.e. below the 1024 breakpoint, so the copy prints the
  **mobile composition** — single column, 22px clause titles, 16px body. That is the intended
  result for paper, not a bug to breakpoint around.

**Privacy Policy has no print copy yet.** It needs the identical treatment when we want its PDF.

## 3s. Cookie consent — production contract

**This section is the specification.** The prototype shows the approved design and behaviour; it is
not the architecture. Everything a developer must not have to infer is written here.

### Architecture

- **ONE global component, mounted once at application root** — never per page, never copied. It
  renders above every other fixed layer.
- The prototype has it on TWO pages only: **Privacy Policy** (canonical source; copy from here) and
  **Homepage v2** (integration test for the fixed-UI collision). The other four rebuilt pages carry
  the trigger and no component. That is deliberate — see § 3t.
- Propagation across the site is a BUILD task, not a design task, precisely because production
  mounts it once.

### Triggers — the canonical pattern

Every consent trigger carries `data-consent-open`. That attribute is the ONLY selector the manager
binds to: never the href, which changes with routing, and never the label, which changes with
translation.

| Where | Element | Fallback |
| --- | --- | --- |
| Footer legal strip (every page) | `<a href="/privacy#cookies" data-consent-open>` | Navigates to the cookie section |
| Privacy section 7 | `<button type="button" data-consent-open>` | None — hidden until the manager is ready |
| Consent banner "Manage preferences" | `<button type="button">` | None — the banner only exists when the manager does |

**Off-page triggers are real anchors; the in-page trigger is a button.** A link pointing at the
section it already sits in is meaningless, which is why section 7 is the exception.

**Prototype vs production URL.** The prototype's fallback href is the design-file path
`Abby's Table - Privacy Policy.dc.html#cookies` so it works during review. **Production must use
`/privacy#cookies`.** This is a named routing requirement, not an inferred one.

### Interception — the rules that make the fallback real

1. **The manager binds the listener itself**, as the last step of its own initialisation — one
   delegated listener on `[data-consent-open]`. If the manager never loads or fails before that
   point, **no listener exists** and every trigger behaves as an ordinary link. The guard is
   structural, not a condition inside a handler: a handler that intercepts and then discovers it
   cannot open has already swallowed the click.
2. **Open first, suppress navigation only on success.** `preventDefault()` is called only after the
   panel has genuinely opened. If opening throws, the click proceeds to the Privacy section.
3. **`open()` must be synchronous.** The panel is always mounted (hidden with `display: none`), so
   opening is a state flip with nothing to load. A promise cannot be awaited inside a click handler
   without losing the default navigation.
4. **Modified and non-primary clicks are never intercepted** — cmd, ctrl, shift, alt, middle-click.
   Opening Cookie preferences in a new tab must give the reader the Privacy section.
5. **ARIA follows behaviour.** The manager adds `aria-haspopup="dialog"` at initialisation. Before
   that the trigger genuinely is a link to a document section, and announcing a dialog would be a
   lie. `aria-expanded` is optional, not a requirement.

### The two surfaces

**Banner** — first visit, or whenever no valid choice is stored.
- `role="region"`, `aria-label="Cookie choices"`. **Non-modal**: it must not steal focus on load. A
  reader may legitimately want to read the policy before choosing.
- **No dismiss control.** Choosing is the only way past it. That is what keeps "nothing optional is
  set until you choose" true.
- Actions: **Required only** (outline) then **Accept all** (filled), in that DOM and visual order,
  plus **Manage preferences** (text link) opening the panel.

**Preference panel** — modal.
- `role="dialog" aria-modal="true"`, labelled by its title. Focus moves to the dialog container
  (not to a control — a programmatic focus on the close button paints a focus ring on open).
- Focus trapped; **Escape closes**; body scroll locked while open; focus returns to the trigger that
  opened it, with the page `h1` as fallback when that trigger is itself now hidden.
- Closing WITHOUT choosing returns the banner. The gate is never bypassed.
- Actions: **Save my choices** (filled — the only filled button in the panel), then **Required
  only** and **Accept all** (both outline).

**Refusal parity is an acceptance criterion, not a style note.** Required only and Accept all are
identical boxes — same height, same width, same label weight — and Required only comes first in
both reading and tab order. Only the fill differs, and that was a deliberate, recorded decision.

### Categories

Exactly four, matching Privacy section 7. **Do not add, rename or split them.**

| Category | Control | Default |
| --- | --- | --- |
| Essential | "Always on" **text mark** — never a disabled switch | Always on |
| Preferences | `role="switch"` | **Off** |
| Analytics | `role="switch"` | **Off** |
| Advertising and measurement | `role="switch"` | **Off** |

A switch that cannot be moved is a dead control, which is why Essential carries a text mark.

### Storage

- **One key: `at-cookie-consent-v1`.** Value: `{ v, ts, preferences, analytics, advertising }` —
  version, ISO timestamp, three booleans.
- Reads and writes wrapped in `try`/`catch`: storage throws rather than returning null in some
  private modes, and a privacy page that crashes on load is the worst available failure.
- **The version is in the key**, so a change in the category set retires the old key rather than
  silently reinterpreting it — a stored choice must never be re-used for a question that has
  changed.

### Fail-safe behaviour — the clause that matters legally

> **If JavaScript is unavailable, the consent manager fails to initialise, or the stored consent
> state is unavailable, unreadable or invalid, Abby's Table must default to essential processing
> only. No preference, analytics or advertising technologies may be activated, including
> technologies that do not depend on JavaScript.**
>
> **An unreadable or invalid stored state is treated as no valid choice, not as consent**, and the
> banner continues to appear on later visits until a valid choice can be stored and read back.

This is stated as an outcome deliberately. It does not rest on optional cookies "needing"
JavaScript — a `<noscript>` tracking pixel is a JS-free advertising tag, and the requirement covers
it.

### Gating — what the prototype does NOT do

**The prototype RECORDS a choice. Production must GATE on it.**

- No non-essential technology may load, execute or set storage before a valid consent state exists.
- Each technology checks the stored value; the manager is not merely a UI.
- **Withdrawal must take effect without a reload** — turning a category off stops the corresponding
  processing in the same session.
- The gate belongs with each technology, including server-side and tag-manager-fired tags. A tag
  that fires server-side is subject to the same rule.

### Priority over other fixed UI

**The consent layer outranks every other fixed element.** While consent is unresolved (banner
showing) or the panel is open:

- the **mobile purchase bar** is suppressed (homepage and any page carrying it);
- the **floating Sections / Top pair** is suppressed (Terms, Privacy).

Both are bottom-fixed, so this is a collision rule, not a preference. Verified on Homepage v2:
banner up and scrolling down leaves the bar hidden; after a choice, normal behaviour resumes.

**Open point for the build:** when a customer accepts while already scrolled down, the purchase bar
appears immediately, because scroll direction was already downward. A different button therefore
materialises where the banner's button just was. Left as-is deliberately (scroll direction remains
the single source of truth) — but if it reads badly on a real device, the fix is to require a fresh
downward scroll after consent resolves.

### Accessibility acceptance criteria

- Banner does not take focus on load; panel takes focus on open.
- Focus is trapped in the panel; Escape closes it; focus returns to the opening trigger.
- Every switch is a `role="switch"` button with `aria-checked` and `aria-labelledby` pointing at its
  row title.
- Touch targets ≥44px. The switch button is 46×44 — sized to its own 46px track rather than pulled
  into place with a negative margin.
- `prefers-reduced-motion` removes the banner and panel animations and the switch transitions.
- Contrast: light cream ground, so the ordinary brass focus ring and light-ground rules apply.
  "Always on" uses `--brown` on `--sand` (`--brass-ink` is 3.97:1 there, under the minimum).

### Still unresolved — launch dependencies, not design decisions

Actual providers ⬥ cookie names ⬥ durations ⬥ first- or third-party status ⬥ the final tag audit ⬥
the resulting Privacy section 7 cookie table. The panel says so in place rather than guessing, and
the full list is in § 3q's launch checklist. **None of these may be invented.**

## 3t. Why the consent manager was NOT propagated to every page

A deliberate decision, taken with the user, and worth stating so it is not read as unfinished work.

**In production the component is mounted once globally.** Copying it into six prototype files would
create six copies to keep byte-identical, for an architecture the build does not use. The design
decisions — categories, defaults, copy, refusal parity, priority over other fixed UI — are all
settled and reviewable on one page.

**Two pages carry it, for two different reasons.**
- **Privacy Policy** is the canonical source. Copy from this file; never re-derive.
- **Homepage v2** is an integration test, not propagation. It is the only page where the banner
  meets the mobile purchase bar and the auto-hiding header — three fixed elements competing for the
  bottom of a phone screen. That collision is a design decision, and leaving it to the build would
  have meant a developer taking it by default.

**The other four rebuilt pages carry the trigger only** — the `data-consent-open` anchor, which
falls back to the Privacy cookie section. They are NOT missing anything: with the manager absent,
the anchor doing exactly what it says is the correct behaviour.

**What this defers, and the risk accepted:** propagation becomes a build task, so it happens only
if the contract in § 3s is read and followed. That is acceptable because the contract is explicit
and the alternative — five more copies drifting apart — is worse. It is the highest-risk item in
the handoff, because a banner that sets tags before consent is a compliance failure rather than a
visual defect.

**If the trigger's element type ever changes again, re-check every selector that styled it.** This
control has now caused a defect twice on exactly that: it had no hover at all when a rule selected
`a` and it was a `<button>`, and the button-only rules became dead CSS when it became an anchor.

## 3u. Abby's Story v2 — built

File: **`Abby's Table - Abby's Story v2.dc.html`**. Sixth page rebuilt. The un-rebuilt
`Abby's Table - Abby's Story.dc.html` stays until this is approved.

**Every "Abby's Story" link site-wide now resolves to this page**, done ahead of approval on the
user's instruction. Three shapes were repointed:

- Rebuilt pages (homepage v2, Delivery & FAQs, Contact, Allergens, Terms of Sale, Privacy Policy)
  carry literal `href`s in the header, drawer and footer Learn column — plus the homepage's
  founder-band "Read Abby's story" CTA. Straight swap.
- Old-shell pages with a `nav(id)` scroll-or-navigate helper (Gifting, Private Table, Standards,
  How It Works, Abby's Boxes, the old homepage) get a `STORY` constant, and the story entry's
  `href` becomes the real destination in BOTH link factories
  (`href: target === "founder" ? this.STORY : "#" + target`) — not just a branch inside `nav()`.
  A JS-only fix left `href="#founder"` in the DOM, so cmd/middle-click and open-in-new-tab went
  nowhere, the hover status bar lied, and a pre-hydration click did nothing. `nav()` keeps a
  `founder` branch at the TOP, before the in-page `getElementById` lookup (the old homepage has a
  local `#founder` band, so a fall-through-only fix would still have scrolled), and it now
  returns early on modified or non-primary clicks so the browser can use the real href. Same
  standard as the consent trigger in CLAUDE.md: the anchor works without JS, and JS never
  intercepts a modified click.
- Old-shell pages that build `href: HOME + hash` with no click handler (Menu Landing v2, both Dish
  Landing pages) get a `dest(hash)` helper mapping `#founder` to the story page, applied to the
  header nav, the drawer list and the footer columns.

The retired `Abby's Story.dc.html` is left as it is. `Abby's Table - Homepage-print-x04o7s.dc.html`
is also untouched: it is a generated print copy of the retired desktop homepage, regenerated never
hand-edited, so it still carries the old `#founder` nav entry and a `noop` story CTA. `export/`
snapshots of the touched pages are now stale — regenerate before any handoff.

Canonical chrome, 1280/22 shell, homepage type scale, no eyebrows anywhere (user's call — the
eyebrow tier is not used on this page at all), promo strip removed.

**Page-local decisions, all deliberate and all recorded at the code:**

- `--story-ink: #101410` — the diagnosis band's near-black, restored at the user's request. NOT a
  design-system colour (`--green-deep` is the system's dark ground), so it is page-local until the
  band is reviewed. On it: blush 12.3:1, sand-2 12.1:1, brass 6.4:1.
- **The diagnosis band's accent line is `--brass`, not `--gold`.** Gold is the homepage's
  dark-ground accent but is never used for type there; brass matches the footer eyebrow treatment.
- **The founder's name is `--terracotta`**, upright Playfair 26 → 32px, with a leading em dash.
- **The hero CTA is `--green-forest`**, not terracotta — a knowing departure from fill-by-role.
  Terracotta on this page is therefore the header pill, the drawer CTA and the name only.
- **The hero collage is overlaid on the portrait**, as the original design had it, but positioned
  against the figure rather than in viewport percentages, so it reflows. Portrait squares up at 640
  and anchors to `object-position: 50% 12%` so the paper never covers her face. Stacks below 640 —
  six pieces of paper over a 346px photo hides the subject. Cleaner paper than the original: flat
  bright ground, sand hairline, 10px/8% shadow rather than 20px/16%.
- The prints' tape tabs are **baked into the image files**; removing them needs re-exported assets.

### The "Remission became a mission" section — built

The three-column composition (copy | certificates | quote) was flattened to two columns during the
clean-up and has been restored. As built:

1. **Three-up from 1024**: `1.2fr | 1fr | 0.92fr`, gap 44, `align-items: center` — the original
   composition. Single column below that; DOM order is visual order at every width.
2. **Certificates on `--sand`** — the dish card's text-panel ground. Flat colour, no gradient, no
   border, no shadow. The old warm gradient is what made the panel read as a different visual
   language, and the design system forbids gradients on UI surfaces.
3. **Certificates are slanted** (−3.2° / +2.4°, the original's angles) on a flat sand ground —
   the no-gradient rule is about the panel, not the paper on it. Width held to 90% so the rotated
   corners stay inside the panel, gap 20 to absorb the extra height a rotated box takes
   (w × sinθ). Hairline `--sand-2` (`--sand` would be invisible on a sand ground); shadow is the
   hero collage's paper value (10px / 8%), not the original's heavier 20px / 16%.
4. **"What I studied" sits INSIDE the sand panel**, centred above the certificates, as a real
   Playfair heading (`h3`, medium, 16px, .12em tracking, uppercase) — in **`--brass-ink`, not
   `--brass`**. The user asked for the diagnosis band's brass, but that is a DARK-ground accent
   and measures **2.0:1 on sand**, so it would effectively vanish; brass-ink is the same brass
   deepened, 3.97:1, clearing the 3:1 headline minimum. Flagged to the user, not silently
   substituted. 16px matches the badge labels in the copy column, so the two columns' small type
   sits on one optical tier.
5. **Breakpoint exception — `.ab-marks` is 2-up from 640, back to stacked at 1024.** Content
   reason: in the single-column band a stacked certificate renders ~950px wide, far past a
   readable document size; at 1024 each one sits in a ~350px column and stacks again.

## 4. Accessibility already implemented

Carry these through; they are part of the spec, not extras.

- Escape closes the drawer; focus is trapped inside it while open, and pulled back in if it
  somehow lands outside.
- Focus moves into the panel on open and returns to the toggle on close.
- Body scroll is locked while the drawer is open.
- The drawer is `role="dialog" aria-modal="true"`; the toggle carries `aria-expanded` and
  `aria-controls`.
- Every target is at least 44px, achieved with padding or height on the interactive element.
- Focus rings are visible on both grounds — brass on light, cream with a gold edge on dark.

Known gaps on pages not yet rebuilt: the menu page's filter sheet and sort menu still lack
Escape, a focus trap and `aria-expanded`, and the sort menu is marked up as a listbox without
arrow-key support.

---

## 3v. How It Works v2 — built

File: **`Abby's Table - How It Works v2.dc.html`**. Seventh page rebuilt. The un-rebuilt
`Abby's Table - How It Works.dc.html` stays until this is approved, but **every "How it works"
link site-wide already resolves to v2** — the same three shapes as the Abby's Story repoint:
literal hrefs on the rebuilt pages, the `HIW` constant on the old-shell pages with a `nav(id)`
helper, and the `dest(hash)` helper (now mapping `#howitworks` as well as `#founder`) on Menu
Landing v2 and both Dish Landing pages.

Canonical chrome, 1280 / 22-34-48 shell, homepage type scale, band paddings 44-48 → 56-60 → 72-76,
button ladder, hover/press/focus language, auto-hiding header and the mobile purchase bar all
copied from Homepage v2 rather than re-derived. Purchase-bar suppression tracks the FOOTER
directly (no Private Table band on this page), same as Abby's Story v2, and there is no bottom
clearance spacer.

**No eyebrows.** The old page carried an uppercase eyebrow above every one of its seven section
headings, including the step-2 mockup's "HOW WE COOK". All dropped. The step NUMERALS stay — they
are the homepage's small sans numeral (13px / .16em brass-ink, 22px from 1024), and the page is a
numbered sequence. On the dark band the numeral is `--gold`, not `--brass-ink`, which is
unreadable there.

Copy changes the user supplied in this pass: hero lede and step 1 body now say "select your
portion size"; sub-step 2 is "Choose your portion size where available"; three em-dashes in steps
3 and 4 and the nutrition line became commas; the closing CTA is "Build a Box" (canonical), not
"Build your box".

### Step 1 — the picker now carries its choice
The 6 / 12 / 18 / 6+ picker is **kept** (the user's call — it is not obsolete), and restored to the
original page's **"Choose a size"** treatment: a green-forest head carrying the label and the
buttons, on a bright card, restyled to the new scale, tokens and hover language. On that dark
ground the buttons are outline/blush and the hover shift is toward `--gold` on both the border and
the label — a border-only hover left the text looking inert. Selected is a blush fill with
green-forest type.
- "Start building" sits under the picker, because it is the control that acts on the selection.
- The selection is carried into the funnel as `?dishes=6|12|18|custom` on the Build a Box href —
  the hero CTA, the panel CTA, the closing CTA and the mobile bar all use it. **Choose Box does not
  read the parameter yet**; wiring it is the production contract this records, so the choice is not
  silently dropped between the two pages.
- **The price read-out is back**, restored from the original design: "From" plus the figure at
  32px rising to 38px, in the green head, updating with the selection and announced with
  `aria-live="polite"`. It reads the `SIZES` array, which is the page's single price source — no
  figure is restated in markup.
- **Only the six-dish price is real.** £158 is canonical; the £95 / £170 / £240 ladder in Choose
  Box is superseded and its PRICES are not reused. Its **saving ladder is** — £10 at 12, £25 at 18
  — because that structure is the funnel's own and is not part of the obsolete pricing. The
  figures shown apply those savings to a pro-rata £158 base: list £316 / £474, shown £306 / £449.
  **The 12 and 18 figures are still placeholders and must be replaced before launch**, and when
  they are, the saving lines have to be recomputed with them. Custom shows the minimum and no
  saving line, because the quantity is not known until the box is built.
- The three sub-steps (Pick every dish / Make it yours / Choose delivery) are **removed** — with a
  working size picker and its CTA in the same panel, they restated the page.

### Step 2 — four points, not six
The method grid is the user's four: Quality ingredients, Flavour built properly, Nutrition at the
core, No shortcuts. Two icons went with the two dropped points, which also removes the
hand-approximated Nigeria outline flagged below — the remaining four (leaf, pot, sprout, no-entry)
are ordinary geometry.

**Step 2 is the one section with a full-width header.** Heading and lede span both columns, then
the photograph and the four points sit side by side beneath, with the points in a single column.
Its copy carried a heading, a lede AND a 2×2 grid, which ran far taller than a 5:4 photograph and
left dead space above and below the image. Stretching the media to fill the row was tried first
and reverted — it fixed the gap but gave that one step a portrait crop unlike every other
section. Widening the heading shortens what remains, so the two columns agree at their natural
sizes. Deliberately not the pattern for 01 / 03 / 04, whose copy is a short paragraph.

### Section grounds — alternating, at the user's request
The user asked for the original's alternating bands, mapped onto real tokens: hero `--cream`,
rail `--blush`, step 1 `--cream`, step 2 `--cream-3`, step 3 `--cream`, step 4 `--green-forest`,
nutrition `--blush`, closing `--sage`. This **supersedes the one-band decision** recorded in the
first draft of this section, and it is a deliberate exception to "cream bands stay on the same
cream" for this page — taken on instruction, not by drift. `--sage` was Our standards' band alone;
it is now shared with this page's closing CTA, also on instruction.

Step 04's green band was briefly removed to make all four step numerals one colour, and put back:
the band is wanted, the numeral difference is not a defect. The two brasses are forced by the two
grounds — `--brass-ink` is ~1.9:1 on green-forest, and the lifted value is 2.2:1 on cream — so a
dark band and a matching numeral cannot both be had. They are matched on contrast (4.96:1 and
4.97:1 against their own grounds), size, weight and tracking.

### Two fixes worth keeping
- **Filled anchor buttons must re-state their colour on hover.** The global `a:hover { color:
  var(--terracotta-deep) }` (0,1,1) outranks a button class (0,1,0), so `.hw-cta`'s white label
  took terracotta-deep on a terracotta-deep fill and vanished. Any filled anchor button that sets
  its colour in a CLASS rather than inline needs `color` in its `:hover` rule.
- **The hero dish name is back on the photograph**, as the original had it. The original set it in
  Cormorant; this is the display face at the recorded panel tier (22 → 26) over a scrim covering
  the lower third, full-opacity cream.

### Decisions needing approval
- **One coloured band** — superseded, see "Section grounds" above: the page alternates, on
  instruction. What still needs recording against the site-wide rule is that step 04's
  `--green-forest` band and this page's alternation are an approved exception, not a precedent for
  other pages.
- **First UI icons on the site.** The step-2 method grid uses four thin-stroke 1.5px icons in
  `--brass-ink` on `--sand` discs, per the design system's own "if a future surface needs icons,
  use a thin-stroke line set — and flag it, since none exists in the source". This is that flag.
- **Step rail kept** as a jump nav on the `--blush` band the original used: real links, 48px
  targets, horizontal scroll on a phone and centred from 640. It is navigation, not a progress
  indicator, so the touch-target rule applies in full. Numerals are green-forest, not brass-ink —
  on blush the ink value measures ~4.4:1, under the small-text minimum for a 12px figure.

### Imagery
The four page photographs were 1402×1122 PNGs at 2.1–2.4 MB each. Re-encoded as JPEG at the
**source width** — `assets/hw-hero.jpg`, `hw-scratch.jpg`, `hw-delivery.jpg`, `hw-heat.jpg`,
173–293 KB — and the source PNGs stay in `assets/` for the reshoot.

Not the usual displayed-size-at-2× rule, and the reason is worth keeping: the widest this page
ever paints them is **not** the desktop split (~564px) but the **640–1023 single-column band**,
where the media box is `viewport − 68px`, so ~955px at 1023. 2× of that is 1910px, above the
1402px source, so 1402 is the honest ceiling and no downscale applies. A first pass at 1000×800
was wrong for exactly this reason — it rendered at ~1.05× in that band while the comment claimed
2×. **When checking this rule, measure the widest BAND, not the desktop composition.** Decoded
cost is 6.3 MB each, nowhere near the 163 MB failure on Abby's Story.

Hero is eager with `fetchpriority="high"`, everything below it is lazy. Still AI placeholder — see
`photography-shot-list.md`.

## 3w. Menu Landing v3 — built

File: **`Abby's Table - Menu Landing v3.dc.html`**. Eighth page rebuilt, and the first one whose
name breaks the `v2` convention: `Abby's Table - Menu Landing v2.dc.html` was already taken by a
pre-rebuild revision of the desktop-first page. v2 is superseded; **every page in the project now
links to v3** (41 links across 17 files). A link target is not a shared component, so repointing it
is not gated on per-page review — the pages themselves still carry their own chrome until rebuilt.

**Dropped from the old page:** the promo strip and its socials, the 1440 header shell, the logo
strapline, the "Order" pill, the basket icon, the old floating back-to-top button, the "What's on
the table?" eyebrow (its words became the page title), the dish-name truncation tooltip, and the
sticky filter band — that last one fought the auto-hiding header, which did not exist when it was
written.

**Kept, at the user's instruction:** search, Filters and Sort behave as they did; only geometry,
type and hit areas were rebuilt. "Where the flavour comes from" keeps its composition, copy, 40px
heading and monogram; only its 12px label moved off brass (2.2:1 on blush, and brass-ink only
3.72:1) and its max-width query was re-expressed as a mobile base plus a 1024 composition.

### Filters — one set of content, two compositions
A bottom sheet below 1024, the same markup as an inline four-column panel inside the filter card
from 1024. Always mounted and closed with `display: none`, so `aria-controls` always resolves. As a
sheet it is a modal dialog: focus trapped, body scroll locked, Escape closes, focus returns to the
Filters button. As an inline panel it is none of those things, so `role`/`aria-modal` are removed
in JS at 1024 and re-asserted below it (§ CLAUDE.md runtime gotchas).

### Data and filter vocabulary
Records carry the card fields (title, components line, description, cream tags, New, Signature,
upgrade, heat, protein, fibre) **plus** the fields the controls read: protein source, eating styles,
diet flags, kcal and carbs. Notes for production:
- **"Lamb" was added to the protein chips.** The old page offered five chips and none matched the
  lamb shank, so that dish vanished under every protein filter.
- **"Under 500 kcal" is now DERIVED** from the record's kcal rather than restated as a tag. The old
  page carried that tag on a 520 kcal dish.
- **"Low sugar" has no field** and still stands in against carbohydrate load until real data exists.
- **"DASH" remains an eating style in the data with no chip and no definition** — the user's call,
  taken knowingly. A customer can see the tag on a card and cannot filter by it or read what it
  means.
- Six of the eight components lines are authored from each dish's description, because the source
  menu data has none for them. Marked `AUTHORED` in the file and still for review.

### Review-only props
`pageSize` (6 / 12 / All) and `reviewCatalogue` (8 / 24 / 48 dishes) exist so scroll behaviour can
be exercised against a realistic catalogue. The catalogue multiplier **repeats the eight real
records** and only makes the slug unique — no invented dish names, prices or nutrition enter the
prototype. `openFilters` opens the sheet on mount; `cookieUnresolved` stands in for the consent
layer, which is mounted once globally in production rather than per page.

### Fixed-element priority on this page
Highest wins, and every one of them yields to the layer above it:

| Layer | z-index | Suppressed by |
|---|---|---|
| Drawer / filter sheet / consent | 90+ | — |
| "↑ Top" utility | 75 | drawer, filter sheet, consent |
| Mobile purchase bar | 70 | drawer, filter sheet, consent, **footer in view** |
| Sticky header | 60 | hides on downward scroll; never while drawer or sheet is open |

The bar tracks the **footer** for suppression, since this page has no Private Table band — the
footer is on the named suppression list in its own right. The Top control deliberately does NOT
follow it there: the end of the page is where a back-to-top is most useful. Neither needs a bottom
clearance spacer, for the homepage's reason.

### Images
The cards load **800px JPEGs** (`assets/dish-*-800.jpg`, 96–119KB) generated from the 1200px PNG
masters, which stay in `assets/` for the reshoot. A card paints ~400px at most, so 800 is the
displayed size at 2×; the masters decode to ~4.3MB each. The flavour band uses `hw-scratch.jpg`,
already in `assets/` for How It Works — not the PNG the old page referenced.



| Prototype file | Intended route |
|---|---|
| `Abby's Table - Homepage v2.dc.html` | `/` |
| `Abby's Table - Menu Landing v3.dc.html` | `/menu` |
| `Abby's Table - How It Works v2.dc.html` | `/how-it-works` |
| `Abby's Table - Abby's Story v2.dc.html` | `/our-story` |
| `Abby's Table - Private Table v2.dc.html` | `/private-table` |
| `Abby's Table - Choose Box v2.dc.html` | `/build/box` (step 1) |
| `Abby's Table - Dish Landing v2.dc.html` | `/menu/<dish-slug>` |
| `Abby's Table - Delivery and FAQs.dc.html` | `/delivery-and-faqs` |
| `Abby's Table - Contact Us.dc.html` | `/contact` |
| `Abby's Table - Privacy Policy.dc.html` | `/privacy` |
| `Abby's Table - Allergens.dc.html` | `/allergens` |
| `Abby's Table - Terms of Sale.dc.html` | `/terms-of-sale` |
| `Abby's Table - Menu Landing v3.dc.html` | `/menu` |
| `Abby's Table - Gifting v2.dc.html` | `/gifting` |
| `Abby's Table - Log in.dc.html` | `/login` |

Footer labels versus routes: the legal strip says **"Terms"**, the page is headed **"Terms of
Sale"**, and the route above matches the document rather than the label. That is deliberate —
"Terms of Sale" is the defined term used inside the clauses — but pick the production route
knowingly rather than inheriting it.

The filename uses "and" rather than "&" for tooling reasons only; the page title, nav and footer
link all read "Delivery & FAQs". Pick the route on its own merits.

Dish pages already carry a `slug` per dish and link as `?dish=<slug>`. Slugs become URLs, so
confirm them before launch.

Header "Log in" now points at **`Abby's Table - Log in.dc.html`** on every rebuilt page (20
references across 10 pages, repointed off the checkout placeholder). There is still no account
system behind it and **no create-account route** — that flow is designed when checkout is rebuilt.
Logged-in state should read "My account", with sign-out in the account area or low in the drawer.

---

## 3z. Gifting v2 — built

File: **`Abby's Table - Gifting v2.dc.html`**. Ninth page rebuilt. Canonical header, drawer and
footer; 1280/22-34-48 shell; homepage type scale.

**Two routes, two different jobs.** "Send a food box" (you choose the dishes) and "Send a gift
card" (they choose). On mobile the two route cards sit in a **full-bleed peeking carousel** — the
track bleeds right so the second card is visibly there, which is the affordance; there is no
"swipe" hint and no dots. From 1024 they are a two-column grid on the ordinary shell. Both media
boxes hold the **same 16/11 ratio** so titles, copy and CTAs land on the same lines.

**Named departures from the canonical chrome, both deliberate:**
- **No mobile purchase bar.** A fixed "Build a Box" pushes one gifting route over the other, and
  each route already carries its own 52px CTA. The **"↑ Top" control IS present on mobile**, and
  with no bar to clear it sits at the viewport edge inset rather than above a measured bar.
- **Terracotta 52px "Build a Box"** in the Delivery & FAQs result panel — user's call, taken
  knowingly against the fill-by-role rule. Do not "correct" it to green-forest.

**Gift-card order panel — three steps.** Value (four chips + a custom input, digits only, 3 max;
choosing a chip clears the custom value and vice versa) → arrival → message.

- Arrival is a **`role="radiogroup"`** of three `role="radio"` buttons with arrow-key/Home/End
  selection and only the selected radio tabbable — NOT `aria-pressed` toggles, which announced
  three "pressed" buttons and conveyed no choice.
- **Postage belongs to the route**, so it is stated in the option before it reaches the total:
  Email £0, **By post +£3.95**, In a food box £0. £3.95 came from the mockup — if postage is ever
  banded by destination this becomes "from £3.95" with the exact charge at checkout.
- The greeting card (+£3) is offered on the post and food-box routes only; on email the message is
  included in the gift email, so that summary row reads **"Message"** rather than "Greeting card".
- The CTA label comes from the chosen route: **"Buy gift card"** for email and post, **"Add to food
  box"** for the food-box route, since there the card joins an existing order.
- One money formatter drops ".00", so £100 and £3.95 sit in the same row without £100.00.
- Summary is four figures with **spacing, no dividers** (a wrapping row floated border segments
  across the middle; a fixed four-column max-content grid from 1024 keeps them grouped). The
  **total** is the one figure a step up in display size — 26px against the 22px tier — rather than
  being marked with a rule.
- The confirmation is an `aria-live="polite"` line, **cleared by every change to the order** — left
  standing it described an order the panel no longer showed.

**Existing box → "Build their box" (rule, 5 Oct 2026 — prototype not yet updated).** Visiting
Gifting never changes an order. With a normal active food box, "Build their box" first asks "You
already have a box in progress." — **USE MY CURRENT BOX AS A GIFT** (primary: changes only the
food-box gift intent; size, dishes, portions and extras kept; no second draft; resumes at the
furthest valid stage) or **KEEP MY CURRENT BOX** (no change; stays on Gifting). Existing dialog /
bottom-sheet pattern. Supersedes the immediate `?resume=1&gift=1` conversion the prototype still
does. Gift food boxes and Gift Cards stay separate. See § 3ak.

**Known and signed off:** the same photograph does two jobs (route card and food-box section) as a
holder — see `photography-shot-list.md` § 3b; "Send a food box" appears as both a route-card title
and the section heading below it; and the route card's "How it works" link goes to the food-box
section on this page, not the How It Works page.

The gift-card and greeting-card visuals are **rendered `aria-hidden` mocks**, not photographs, so
the type inside them is artwork and the mobile type floors do not apply to it.


---

## 3aa. Choose Box v2 — checkout step 1, and the one accepted architectural exception

File: **`Abby's Table - Choose Box v2.dc.html`**. The first food-box checkout step brought onto the
canonical checkout chrome. **Its own design is deliberately unchanged from the original** — the four
box cards, the summary rail, the mobile list, the carry banner and the bottom sheet are all as they
were. What changed is everything around them.

- **Transactional shell** (§ CLAUDE.md, Checkout flow): gift-checkout header (wordmark +
  "Questions?", no nav, no drawer, no strapline) with the 5-step indicator in its own band beneath
  it, and the simplified checkout footer. The in-body "Step 1 of 5" eyebrow went — the band states
  it.
- **Help drawer transplanted verbatim from the gift-card checkout**, which is the canonical file
  for it. Three views in one drawer, search over this page's own FAQ list (ordered so the four
  shown unqueried are the box-choosing questions), WhatsApp with the hours-aware reply note,
  inline message form, no link out to the FAQs page. The page's earlier drawer (live chat + an
  email accordion + a "view all questions" toggle) is **superseded and deleted**.
- **Delivery checker**, three tiers: stacked and content-hugging on a phone; full-width with the
  stack centred from 640; label and field on one line from 768; the full single row with its
  divider from 1200. No "use my location" control at any width.
- **"Back" is a real browser back** to whatever preceded step 1, with the Seafood Okra dish page as
  the href fallback for a direct load, a new tab or no JS. It sits in its own bar under the step
  band, above the delivery checker.
- **Bar suppression** uses an **IntersectionObserver on the footer plus a capture-phase document
  scroll listener**, not window `scroll` alone: when an ancestor container does the scrolling
  (host preview, embedded frame) window `scroll` never fires, and the bar sat over the footer and
  its consent trigger at the end of the page.
- **Type, ink and targets** brought to the standards: 13px labels / 16px supporting copy / 14px
  tertiary; `--taupe`→`--brown`, brass-as-type→`--brass-ink`, terracotta-as-type→`--terracotta-ink`;
  hover and press became colour shifts rather than lifts. Small controls keep their drawn sizes
  (18–29px) and take an invisible 44px `::before` target — the dish card's pattern, chosen so the
  preserved design is untouched.

### The architectural exception — do not "fix" it in passing

The page keeps its **desktop-first cascade**: 11 `max-width` blocks and 60 `!important`s. Migrating
it to the mobile-first system was scoped and **declined**, and the reason is worth recording because
the media-query count is misleading.

The page carries **297 inline `style` attributes holding ~1,514 declarations** — 128 colours, 118
font-sizes, 113 `display`s, 105 `align-items`, 84 font-weights. An inline declaration outranks any
class rule, so a mobile-first cascade written underneath that markup would be **inert**. The job is
therefore a presentation-layer rewrite of ~1,500 declarations, not a media-query inversion, and most
of the `!important`s exist to beat those inline styles rather than each other. Large diff across an
approved design, no user-visible gain.

Step 1 is the one page on the old architecture **by intent**. Revisit only if a functional or visual
issue forces it. Every other rebuilt page remains `min-width`-only.

### Regression harness

**`_audit/compare.html`** (see `_audit/README.md`) — because the page cannot rely on a mobile-first
cascade to keep it honest, changes here are policed by measurement instead.

It loads two copies of the page in real iframes at nine widths (320 → 1440) across seven states
(default, box-selected, postcode-checked, est-note-open, sheet-open, drawer-open, drawer-error),
reads layout-critical computed styles plus geometry from both, matches elements by structural path,
and reports only the differences. Media queries need a genuine viewport, so a resized container
would prove nothing.

Both constants point at v2 today, so a run is its own self-test and must report zero. To test a
change: copy the page, point `NEXT` at the copy, edit the copy.

**Three noise sources are handled inside it and must stay.** Measuring before the tokens resolve
reports every colour as `rgb(0, 0, 0)`; measuring mid-transition records interpolated values;
reading rects and styles interleaved forces a layout per element and freezes the page. Noise floor
is 0 — a harness that reports differences against an identical file cannot be trusted to report
real ones.

### Open on this page

- **The progress band is `position: static`**, so it scrolls away while the header sticks. A UX
  call rather than a defect — making it sticky costs mobile screen space — and deliberately left
  alone.
- **The Full Table upcharge reads +£10 here and +£5 on the dish page.** Both are holding text that
  changes before launch, but they must agree, and it has not been settled.

### Order in progress — `at-order-state.js`

A shared, self-initialising script loaded from every page's `<helmet>`. Once a customer has begun
a box, the marketing chrome must stop inviting them to begin one.

- **Header pill** → **VIEW BOX** in `--green-forest`. Terracotta stays reserved for *starting* a
  purchase, so a different job gets a different colour.
- **Mobile purchase bar** → the box summary: disc icon, "6-dish box", the total, and a caps
  **VIEW BOX** with no arrow. Band colour, height and pill treatment are unchanged — only what the
  bar says changes, from an offer to the order the customer already has.
- **Choose Box v2 publishes** the label and total from `renderVals`, so the bar can never disagree
  with the page it came from.
- **sessionStorage, key `at-order-v1`**, every access in try/catch. `localStorage` was rejected: it
  would leave a stale VIEW BOX on a marketing page weeks later, promising a box that no longer
  exists.
- **Fail-safe:** an unreadable or invalid value is *no order*, and every page keeps its normal
  selling chrome. The state only ever ADDS information; its absence is the safe default, so a
  blocked storage API or a script that never loads costs nothing.
- Re-applied by a **MutationObserver**, because each page's component re-renders after the script
  runs and would undo a one-shot pass (§ 3x). The observer disconnects while writing so it cannot
  see its own mutations.

**Production note:** this is prototype glue. The real site should hold the basket server-side or in
application state and render the correct chrome on the server — not patch the DOM after render.
The *behaviour* recorded here is the specification; the mechanism is not.



### Signed-in state — `at-account-state.js`

**Rule:** a signed-in customer sees **"My Account"** wherever a signed-out customer sees **"Log in"**
— the header link and the mobile drawer link, on every page. The label changes and the link goes to
My Account (`Abby's Table - My Account.dc.html`); the original href is restored on sign-out.

- Prototype: a shared self-initialising script beside `at-order-state.js` in every live page's
  `<helmet>`. A valid Log in submit, or logging in inside Checkout v2, calls `ATAccount.signIn()`.
- **localStorage, key `at-account-v1`**, `{ v: 1, ts }`, expires after 24h. localStorage (unlike the
  order key) because a signed-in session is browser-wide, not per tab.
- **Fail-safe:** unreadable, invalid or expired ⇒ signed out ⇒ "Log in".
- **Checkout (food box + gift card):** arriving signed in hides the "Already have an account? Log
  in" offer, shows "You're signed in. Your saved details are filled in." and prefills the email.
  Signed-in and log-in-panel state are never saved in the order snapshot — they are re-read on
  every load, so a resumed checkout can't show a session that has since ended.
- Order Confirmation v2's `accountState` prop shows the three post-payment states for review; in
  production the confirmed order and the session supply them.

**Production:** the server session is the only source of truth for signed-in. The header label is
rendered server-side from it; the browser flag here is display glue for the prototype and must never
be treated as identity or used to gate content, prices or account data. A signed-out request for
My Account must be redirected server-side to Log in with a return URL (the prototype shows a
signed-out panel instead).

### My Account — `Abby's Table - My Account.dc.html`

Hash-routed sections (`#orders #points #gifts #addresses #details`, none = overview). All figures
are sample data; production supplies them from the account. Backend dependencies:

- **Orders:** upcoming + past, status, dishes, gift marker. Status values need the real fulfilment
  states (prototype: Confirmed / Cooking / Out for delivery / Delivered). **Confirmed orders are
  read-only:** no Change order, no Cancel order, no amendment deadlines or eligibility messages —
  only "Need help with an order?" / "Contact us." / CONTACT US (§ 3ak). The prototype's upcoming-card
  link "Need to change this delivery? Contact us →" is flagged for review against that rule.
- **Order again:** sheet with every dish of the order pre-ticked; hand-off to step 2 as
  `?[resume=1&]reorder=slug.qty.portion,…&fromd=…`. Production rebuilds the server-side basket
  from the stored order, re-prices at today's prices, rejects off-menu dishes, merges into an
  active basket (exact count, min 6, max 99, never shrinks) and never carries gift details, dates or
  codes. An upcoming order's reorder starts a NEW box; editing an upcoming delivery needs kitchen
  cut-off rules and is not built.
- **Points:** the final rules are § 3ak (2 per £1 of eligible spend after discounts; 100 = £1; never
  expire; no minimum; capped at 20% of an order; Gift Card purchase earns, its later redemption does
  not; added immediately after successful payment; refunds reverse only the refunded eligible
  spend's points, redeemed points are restored, negative balance allowed). The ledger
  (earned, redeemed, adjusted, running balance) and "highest £5 mark seen" (prototype:
  localStorage `at-points-seen-v1`) are server records.
- **Gift cards sent:** resend (email route) needs a rate-limited resend endpoint.
- **Addresses:** CRUD + one default; offered at checkout.
- **Details:** email change needs a confirm-new-address link; password is reset by emailed link;
  newsletter consent is recorded with timestamp; account deletion is by contact (data-protection
  request), not self-serve.
- **Sign out** ends the server session, then lands on the homepage.


---

## 3ab. Add Dishes v2 (checkout step 2) and the shared checkout modules — approved

### Shared modules (project root; production should own them in the app shell)
- **`at-rail.js` — `atRailFit()`.** Your box rail sizing for steps 1 and 2: measured from `--ck-h`,
  clearance stops (step 1: 24px; step 2: 88px then 24px), and a "short" mode (status + list scroll
  together) when the list would get under 120px. Hysteresis: a mode is left only once the list
  would get 140px again.
- **`at-undo.js` — `ATUndo`.** The reversible-removal standard: one pending undo per page, 8s,
  paused only by a real mouse hover or KEYBOARD focus (a tap emulates hover with no leave, and
  push() focuses Undo, so on touch either would have paused it forever). Overlay only — fixed
  snackbar, or anchored inside a `[data-undo-scope]` rail/sheet — so nothing reflows. Focus
  Remove → Undo → restored item's Remove, via `data-undo-btn` / `data-rm`. Focus moves on a
  timer, not rAF: rAF is paused in hidden frames and silently dropped focus.
- **`at-focus.css`.** One `:focus-visible` ring for controls (DS `--shadow-focus` + transparent
  outline for forced-colors), none for `tabindex="-1"`, and a solid brass outline for controls
  whose box-shadow is owned by an inline style. Must load from the real `<head>`.

### Document head standard
Every live page's real `<head>` carries, before `support.js`: the first-paint rule
`html, body { background-color: #F7F1E8; color-scheme: light; }` (first, straight after
`<meta charset>`), the favicons, the five design-system stylesheets and `at-focus.css`. They were
previously in `<helmet>`, which the runtime applies from the raw template, tears down when it
consumes the template, and re-adds — a transparent document for ~1s on a full load and ~160ms on
back navigation (measured, Step 2 ⇄ Standards). `_audit/head-check.html` verifies the standard
against `_audit/live-pages.json`; run it after any whole-page rewrite. **Production:** these rules
belong in the global site shell/template, not per page.

### Standards round trip
Step 2 saves the whole step to `at-std-return-v1` and rewrites its own history entry to `?qv=1`
before navigating. Standards' "Back to <dish>" uses `history.back()` when the previous entry is
that page, else `location.replace`. Step 2 rebuilds the dish dialog from the record before its
first render. Correctness does not depend on BFCache; production should still allow it (no
`Cache-Control: no-store`, no unload handlers) so the return is instant.

### Gift-in-box confirmation
The one-shot "Gift card added to your food box" / "Gift card updated" panel (from the `notice`
field of `at-gift-box-v1`) renders only while the gift record exists, on all five steps, and is
dismissed permanently when the gift is removed on steps 1–2 — a status message must never outlive
the thing it reports. Production: derive it from the basket, not from a stored flag.

### Open
- Nutrition figures on step 2, both dish pages and the dialogs are holding text.
- React/ReactDOM are fetched from unpkg by the prototype runtime on every full load — a
  production build must bundle them.
- Several approved content-rich overlays focus their heading on open, which the focus standard
  permits; only short dialogs must focus a control.

## 3aa. Checkout step 3 — Extras v2 (approved 30 Sep 2026)

File: **`Abby's Table - Extras v2.dc.html`**. Supersedes `Extras.dc.html`. Built from Add Dishes v2,
so it carries the same checkout chrome, Your box rail (`at-rail.js`), Undo (`at-undo.js`), focus and
head standards. CLAUDE.md holds the full behaviour spec; the points a developer must not infer:

- **Links.** In: step 2's CONTINUE; Review's "Back to extras" / "Change" (`?resume=1`); VIEW BOX
  resume (step 3 writes its own `at-order-v1` href). Out: Back and Edit dishes → step 2
  (`?resume=1`); REVIEW and "No extras? Skip" → Review; See our standards → Standards v2
  (`?from=step3`, shared `at-std-return-v1` record, `?qv=1` reopens the same extra and option).
- **Entry gate.** A full box is required. The prototype's sample box (`demoBox` prop) exists for
  preview only — production redirects to step 2.
- **Options live on the line, not the product.** An extra's size/heat is part of its box-line key
  (`id|option`); Change moves the quantity to the new option and merges with an existing line.
- **Two dialogs, two focus rules.** The option picker is a short action dialog (focus on the checked
  option); the details dialog is content-rich (focus on its heading). The mobile Your box sheet is
  labelled by, and focuses, its own heading.
- **Holding content.** Extras nutrition is EXAMPLE data; ingredients/allergens and heating/storage
  read "being confirmed"; photography is one placeholder dish photo. None may ship.
- **Open.** Review (step 4) does not yet read step 3's extras snapshot — wire it when step 4 is
  rebuilt. No `export/` copy yet.

## 3x. Runtime lifecycle — post-render DOM work needs a poll, not a callback

Recorded because it cost a whole diagnosis cycle and produced a silent accessibility defect that
looked like a CSS problem. **Scope: this prototype runtime only** — it says nothing about React
generally and should not be read as "always poll".

**Two hooks that are not called here.** `componentDidUpdate` is never invoked (already noted in
the drawer source), and **`setState`'s second-argument commit callback is never invoked either**.
Verified on Homepage v2: a focus move placed in that callback fired **no focus event at all** over
800ms — not a mis-targeted focus, no focus. Any DOM work that must happen *after* a state-driven
render therefore has no lifecycle hook to hang on.

**Verified fallback (the pattern the canonical drawer now uses).** Kick off the work from the
handler that called `setState`, then poll for the condition that proves the render landed:

- Poll on **both** `requestAnimationFrame` **and** a `setTimeout` ladder. A frame can be throttled
  (background tab, heavy paint); a timer cannot. Belt and braces, and the work is idempotent.
- **Neither is reliable ALONE in the editor preview, and scroll events do not fire at all.**
  Measured on the gift-card checkout: `scroll` fired **zero** times on `window`, `document` and
  `document.scrollingElement` while `documentElement.scrollTop` moved 200 → 900, and a fresh
  `IntersectionObserver` delivered **no** callbacks while its target moved 350px above the
  viewport. So anything whose visibility depends on scroll position must poll geometry on a timer;
  an event-driven version silently never runs. The band's `_readBar` is the worked example.
- **Timers in the preview are throttled to roughly 900ms.** Measured: a plain `setInterval(150)`
  ticked twice in 1.8s. So a geometry poll set at 150ms settles about a second after the scroll
  stops *in the editor* and immediately in a real browser (where the scroll listener also fires).
  Do not shorten the interval to compensate — the throttle is the host's, and the shorter value
  just burns work. Expect this lag when reviewing any scroll-derived UI in the preview.
- **Do not use frame-count budgets as proxies for post-render availability.** A fixed number of
  animation frames assumes a maximum render cost. On content-heavy pages the main thread may be
  blocked long enough that the frame budget expires before the DOM commit occurs. Post-commit DOM
  acquisition must tolerate variable render duration and terminate on success or on a sufficiently
  conservative wall-clock safety limit.
- The old drawer budget was 20 frames (~330ms) and expired *just* before the homepage's
  `display: none → flex` flip landed, so the retry gave up against a still-hidden panel and did
  nothing, with no error.
- **Set the ceiling well clear of any measured blocking time, not just past it.** The consent panel
  blocks for ~1s on Privacy on the machine it was measured on, so its ceiling is **3s** — a 1s
  limit would be the same render-cost assumption in better disguise, and a slower CPU, a throttled
  tab or a heavier future page walks back into the bug. The poll exits the instant the target is
  focusable, so a wide ceiling costs nothing normally. The drawer currently sits at 1s and should
  be widened to match when those files are next touched.
- **Find the target in the document, not through a ref**, when the element is always mounted under
  a stable id. Ref attach timing was the other half of this bug (below).
- Cancel **both** handles on close and on `componentWillUnmount`.

**Why the refs made it worse.** The drawer's `panelRef` was an arrow function created inside
`renderVals()`, so a new function identity arrived on every render and React detached the old ref
with `null` each time. On these pages `renderVals()` runs on *scroll* (header auto-hide state), so
the panel ref was being torn down and reattached constantly — and `this._panel` was unreliable at
exactly the moment `open()` read it. **Refs passed to the template must be stable class fields.**
That fix alone was not sufficient, which is the trap: it removed one of two stacked causes and the
symptom did not move, which is easy to misread as "the fix didn't work".

**The cookie consent manager had the same defect, and worse.** Flagged as latent after it passed on
Homepage v2, then **reproduced as a hard failure on Privacy Policy — its own canonical file**: the
panel visibly opens and keyboard focus never enters it, so a keyboard or screen-reader user is
presented with a modal dialog they cannot enter.

The first hypothesis (ref detached by the clause spy's scroll re-renders) was **wrong** — it failed
on a fresh load with zero scrolling. **The clause spy is innocent; do not "fix" or optimise it on
the strength of that early suspicion.** The measured cause: an 80ms sampler fired **once in a full
second** after the trigger click, because opening the panel re-renders 56 clauses and blocks the
main thread for about a second. The 20-frame budget (~330ms) therefore expired *before the commit
landed*, `take()` gave up against a still-hidden panel, and no focus event was ever fired. Homepage
v2 passed the identical test only because its commit is faster — the same code, a different margin.
Worth generalising: **a frame-count budget is a disguised assumption about render cost**, and the
pages that break it are the content-heavy ones.

Fixed with the same shape as the drawer: stable `ccPanelRef`, an id fallback (`_ccPanelEl()`), and
1s wall-clock polling on a frame and a timer, cancelled in `ccClosePanel`, on the save path and on
unmount. **Resolving from the banner had no focus handling at all.** `_ccResolve` restored focus only with
`if (wasPanel) this._ccReturnFocus()`, so choosing Accept or Reject **on the banner** removed the
button the user had just pressed with nothing taking its place and focus dropped to `<body>` — the
next Tab restarted from the top of the document (WCAG 2.4.3). Demonstrated on Privacy, fixed by
calling `_ccReturnFocus()` unconditionally: it already returns to the recorded opener when that
element is still rendered (the panel route) and falls back to the h1 when it is not (the banner
route, whose trigger has just been removed).

Propagating that to Homepage v2 exposed a second instance of the helper-dependency trap: its
`_ccReturnFocus` referenced `this._h1`, which **that page never wires** (no `h1Ref` in its
`renderVals`), so the fallback was dead code and the banner resolve still landed on `<body>`. Both
files now resolve the heading as `this._h1 || document.querySelector("h1")` — the same
read-from-the-document pattern as the drawer's `_drawerPanel()`, and for the same reason.

Verified on both pages: banner Accept and banner Reject each move focus to the h1 (never `<body>`)
and persist valid JSON; panel Accept, panel Reject and Esc all return focus to the opener; the
drawer is unaffected. Consent behaviour, copy, categories and storage were not otherwise changed.

**Focus target is intentional per component, and the two differ on purpose** — not an
inconsistency to harmonise. Consent dialog: the **panel container**, because it carries an
accessible title and role and the user needs that context before tabbing. Navigation drawer: the
**Close button**, because it has no equivalent heading to announce. Design, copy,
categories, storage and cookie logic were not touched.

Verified on Privacy: both triggers (the section 7 `<button>` and the footer `<a href="…#cookies">`)
open it and focus the panel ⬥ focus returns to *whichever* trigger opened it ⬥ containment holds on
Tab ⬥ closed panel has 0 focusables ⬥ correct after six scroll jumps driving the clause spy ⬥
focus not ejected by a re-render while open ⬥ three open/close cycles ⬥ `at-cookie-consent-v1`
byte-identical before and after. Not verified: the first-visit **banner**, because checking it
means clearing a stored consent choice that belongs to the user — do that check with storage you
own.

**Canonical blocks carry hidden helper dependencies, and substitution is not verification.**
Propagating the drawer block to nine pages put a call to `_canFocus` into five files that never
defined it (Log in already called both `_canFocus` and `_trapIn` without defining either — a
pre-existing defect: closing its drawer threw and Tab never trapped). Nothing reported an error,
because the call sits inside a rAF/timer callback where a `TypeError` dies silently. Two rules from
this: a canonical component is **its code block + its required helpers + its acceptance test**, and
every propagated instance needs its own behavioural smoke test — a successful source replacement
proves only that the text changed. Deliberately NOT fixed by extracting a shared helper module:
duplicated definitions across eleven files are the lesser evil mid-repair.

**Acceptance test for any drawer change** (all seven, as run on Homepage v2): closed drawer out of
the tab order ⬥ focus enters on open ⬥ focus lands on Close ⬥ trap holds on Tab from the last
focusable ⬥ Escape closes and returns focus to the burger ⬥ header auto-hide does not engage while
focus is inside ⬥ pointer open/close unchanged.

## 3y. Incident — preview host per-URL asset failures (transient, no code change kept)

Logged so the workaround that briefly existed in source is not mistaken for architecture, and so
the failure mode is recognised if it returns.

**Symptom.** For part of one session, four design-system URLs failed to load on every page —
`tokens/typography.css`, `tokens/spacing.css`, `styles.css`, `_ds_bundle.js` — leaving
`--font-sans`, `--font-display`, `--weight-medium`, `--radius-pill` and `--shadow-card`
unresolved. Pages rendered in a browser-default serif with square buttons and no card shadows.
Four `resource_error` entries per page. It survived reloads.

**Evidence gathered (and its limits).** The same paths returned 200 with *any* query string
appended; `fonts.css` and `colors.css` in the same folder loaded normally throughout; and an
unrelated project image (`assets/hw-delivery.jpg`) failed identically and recovered under a new
filename. Read as a **per-URL stale/negative entry in the preview host**, not a design-system
misconfiguration and not a path error. The probe was a page-context `fetch()` comparing status
codes — good evidence that the URL failed here and that changing the URL avoided it, but it is
**not** proof about the caching layer itself; browser networking and page `fetch()` can differ.

**What was done.** A `?v=1` cache-buster was added to one page (Gifting v2) to make it reviewable.
The fault later stopped reproducing — three samples across two untouched pages, all four assets 200
with tokens resolving — so **the query string was removed and no other page ever received it**. The
site is uniformly unversioned. Nothing about the design system was restructured.

**If it returns.** Reproduce first (fetch the plain URL and a query-versioned one, compare), then
apply **one identical** `?v=N` across all affected pages — never per-page ad-hoc values, and never
inside the design system's own `styles.css` imports. Bumping the value later is a scripted
find-and-replace across every file in one pass; half the site on `v=1` and half on `v=2` is worse
than the original fault. Treat it as debt with a removal condition, below.

**Removal condition (owned by the user, not by a session).** Remove any versioning once the
unversioned URLs have loaded successfully across **repeated fresh preview sessions on different
days** and the failure is no longer reproducible. A single session — including a future one that
finds everything healthy — can contribute a data point but cannot close this out, because the
condition is cross-session by nature.

---

## 3ac. Server-side basket / checkout draft — PRODUCTION REQUIREMENT (30 Sep 2026)
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
- Two lifetimes: the basket persists (~24 h for an empty active box, 7 days for a populated one); the
  delivery reservation is short-lived (15 minutes, started only by an active date choice), and
  becomes a payment hold of up to 10 further minutes once payment starts (§ 3ak).
- Reservations are server-authoritative: the page timer only DISPLAYS the remaining time and never
  decides capacity. Changing date releases the old reservation and creates the new one atomically.
  Expiry removes only the reservation, never the basket. A submitted payment whose result is
  uncertain is resolved with the provider first — capacity is not released on a timer and the
  customer is not invited to pay again until then.
- Payment success converts the draft into the confirmed order EXACTLY ONCE (idempotent against
  Stripe redirects/retries and webhook repeats). Account creation + points follow from that same
  conversion (see "Account + points states").
- Multi-tab edits need conflict handling: when the basket changes in another tab, checkout
  refreshes or reconciles rather than silently overwriting.

## 3ad. Checkout step 5 — Checkout v2 (approved 1 Oct 2026)
Source of truth for behaviour is CLAUDE.md, "Checkout step 5". Summary for the build:
- Three sections: Your details (email, log-in row, points + optional account creation), Send to
  (gift options with greeting card, name, address lookup / manual, phone), Choose a delivery date
  (suggested next date, calendar, 15-minute reservation, time window, notes). Codes, legal line,
  Order summary rail / mobile sheet, CONTINUE TO PAYMENT → with "Secure checkout".
- Account creation is a checkout preference only: no password before payment; the account is
  created from the checkout email after a successful payment, with a secure set-password link.
  Existing emails route through the normal account-access flow, never a duplicate.
- The date reservation, the basket and the exactly-once order conversion are server
  responsibilities — see § 3ac. The page clock is display only. The suggested date reserves nothing
  until chosen; entering payment converts the reservation to a payment hold (§ 3ak).
- Points: the prototype's figures use the 1-point-per-£1 holding rule — stale; build to § 3ak.
- Legal links open a new tab (?from=checkout) with "← Back to checkout" (at-legal-return.js);
  checkout is never navigated away from. **Rule (5 Oct 2026):** the return MAY focus/switch to the
  existing checkout where the browser permits; auto-closing the legal tab is NOT required; no
  dependence on `window.opener`; never a second checkout; if it cannot switch, stay and say "Your
  checkout is still open in your previous tab. Switch back to it to carry on." The prototype's
  `at-legal-return.js` still closes the legal tab — stale.
- Mobile bottom sheets are true modal dialogs (inert background, focus trap, focus return).
- Not built: Stripe hand-off. ~~confirmation page ("Account created / N points earned / We've
  emailed you a secure link…")~~ — superseded: Order Confirmation v2 is built and approved (its
  created-account points wording is now decided: points are earned at payment and become visible once
  setup/access is complete — § 3ak). Holding data listed in CLAUDE.md
  "Open decisions".

## 3ae. Payment processing (approved 1 Oct 2026)
File: **`Abby's Table - Payment Processing.dc.html`**. Shown while the payment provider confirms.
- **Most restricted chrome:** wordmark (not a link) + "Questions?" opening Checkout v2's help
  drawer; simplified checkout footer with every link in a new tab. No ordering CTA, no account
  link, and neither `at-order-state.js` nor `at-account-state.js` is loaded.
- **The browser never decides the outcome.** Production polls the server for the payment result
  and routes to Order Confirmation, "Payment wasn't completed" or "Payment cancelled". Reloads
  must never create a second order (§ 3ac exactly-once conversion). The `simulate` prop is for
  demos only.
- Spinner is decorative (`aria-hidden`); the lede is the status region. Photograph
  `assets/food-box-open.jpg`, with its proportions reserved before it loads.
- Statuses 5 and 6: § 3af.

## 3af. Payment wasn't completed + Payment was cancelled (built 1 Oct 2026, awaiting review)
File: **`Abby's Table - Payment Not Completed.dc.html`**. Shown when the server reports a failed or
declined payment. The order draft, its details and (if still valid) the delivery reservation are
kept — § 3ac.
- TRY AGAIN and USE ANOTHER CARD both return to the payment provider for the SAME
  order draft; never a new draft. "Return to checkout →" reopens checkout restored from the draft.
- "No charges have been made" must be true for the provider's failure modes before launch.
- **Status 6, Payment was cancelled** — **`Abby's Table - Payment Cancelled.dc.html`**, same
  page with a neutral panel. Reached when the customer backs out of the provider. CONTINUE TO
  PAYMENT and USE ANOTHER CARD re-open the provider for the SAME draft. "Nothing has been
  charged" holds by definition for a cancelled session, but confirm no authorisation is placed
  before the customer confirms.

## 3ag. Page not found (built 1 Oct 2026, awaiting review)
File: **`Abby's Table - Page Not Found.dc.html`**. Canonical marketing chrome (Homepage v2 header,
drawer, footer, purchase bar) around one centred band: eyebrow, h1, lede, GO TO HOMEPAGE, "View the
menu →". No decoration (mockup's leaf pattern removed).
- Production: the server returns **HTTP 404** with this page as the body for any unknown URL —
  never a redirect to it and never a 200 (soft 404). `noindex` is set in the prototype too.
- Loads `at-order-state.js` and `at-account-state.js`, so an order in progress shows VIEW BOX and a
  signed-in customer sees My Account, as on every marketing page.

## 3ah. Something went wrong — error 500 (built 1 Oct 2026, awaiting review)
File: **`Abby's Table - Something Went Wrong.dc.html`**. Reduced chrome (user decision): wordmark +
"Contact us" header (envelope icon), simplified footer with social links, no account / basket /
newsletter / consent UI and no page JavaScript. Decorative status mark, TRY AGAIN (reloads the current URL), "Back to
homepage →", and a direct email/phone panel.
- Production: return **HTTP 500** with this page as the body, served as a **pre-rendered static
  file** by the web server / CDN, so it still works when the application is down. Never a redirect.
  Its CSS, fonts and logo must be inlined or served from the CDN — nothing from the app.
- Keep the email and phone in step with the Contact page.
- Not built from the same mockup: maintenance (503, "We'll be back shortly") and expired link.
- Standalone copy: `export/Abby's Table - Something Went Wrong.html` (752 KB) — a natural start
  for the static production file, since it already inlines its CSS, fonts and logo.

## 3ai. We'll be back shortly — maintenance (built 1 Oct 2026, awaiting review)
File: **`Abby's Table - Back Shortly.dc.html`**. The 500 page with no links into the site at all.
- Production: switched on at the web server / CDN for planned maintenance; returns **HTTP 503**
  with a **Retry-After** header (so search engines keep the real pages), never 200 and never a
  redirect. Pre-rendered static file, like the 500 page.
- Copy is generic by decision — if a return time is ever wanted, post it on the social channels
  the footer links to rather than editing this file during an outage.

## 3aj. Link no longer valid (built 1 Oct 2026, awaiting review)
File: **`Abby's Table - Link Expired.dc.html`**. Shown by the working app for any expired or used
emailed secure link (set-password after checkout account creation; password reset later).
- Endpoint contract: GET with the token renders this page when the token is expired/used/unknown —
  **HTTP 410**, `noindex`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- SEND A NEW LINK POSTs back with the token. Server: resolve the account from the token if it can;
  issue a fresh token of the same type, invalidating any outstanding one; email it; **rate-limit**
  per token and per account. Respond with the same "Check your email" state whether or not an
  account was found — no enumeration, and the page never shows the email address.
- Not covered: a token that cannot be resolved at all (malformed) gets the same page and the same
  answer; the customer can still use Log in → Forgot your password once that flow exists.

## 6. Open items
- **Prototype stale against § 3ak (recorded 5 Oct 2026, not fixed):** Checkout v2 / Order
  Confirmation v2 points figures (1 per £1); Gifting v2's immediate existing-box conversion (and the
  gift-flows harness checks that test it); `at-legal-return.js` closing the legal tab; Delivery &
  FAQs and Terms of Sale wording on changes/cancellations to be checked against the 7-day rule;
  Gift Card Checkout's account-creation + points option (decided, not built).
- **Server-side basket / checkout draft (§ 3ac)** — required before launch: canonical server-side order draft, anonymous basket token, account merge, server-held delivery reservations, exactly-once order conversion on payment, multi-tab reconciliation.

- **The gift-card checkout's address lookup is a LOCAL SAMPLE, not a lookup.** The post route's
  "Delivery address" combobox matches against twelve hand-written Kent/London addresses in
  `ADDR_SAMPLE`. The interaction is complete and correct — suggestions, keyboard selection,
  confirmed-address block, Change, manual fallback — but production must call a real PAF-backed
  service (Loqate, Royal Mail, getAddress.io). The suggestion list is the only thing between a
  customer and a mis-delivered gift, and a dozen sample streets cannot do that job. Manual entry
  covers every address in the meantime, which is why lookup is built as an accelerator and never a
  lock.
- **The delivery-exclusion list is an assumption.** `NO_DELIVERY` refuses the Channel Islands,
  Isle of Man and the far north of Scotland (GY, JE, IM, HS, ZE, KW, IV, PA, PH, AB, BT) on the
  grounds that chilled food on a next-day courier does not reach them. That shape is right but the
  codes are guessed: the business must supply its actual coverage, and the eligibility message is
  worse than useless if it turns a payable order away or accepts one we cannot fulfil.
- **The courier phone number is now required on the post route.** Copy states why ("so the courier
  can reach the recipient on the day if needed"), which is the lawful basis for asking — if the
  courier does not in fact use it, the field should go.

- **Opening hours, bank holidays and the WhatsApp number now live in ONE file** —
  `at-contact-data.js` at the project root exports `WA_URL`, `WHATSAPP_NUMBER`, `HOURS`,
  `HOURS_LABEL`, `BANK_HOLIDAYS`, `isOpenNow()` and `replyNote()`. Created when Choose Box v2
  became the third page needing them; it supersedes the earlier "duplicated in two files, edit
  both" arrangement. **Never hard-code another copy.** Pages import it (Choose Box v2 does so in
  `componentDidMount`, falling back to the neutral "Closed now" wording until it resolves, so the
  page can never promise a reply time it has not verified).
  **Contact Us and the gift-card checkout still hold their own copies** and should be moved onto
  the module when each is next edited — until then the three must be kept in step by hand.
  Production needs the same single source server-side, plus a way for the business to record
  exceptional closures: an indicator that says "Open now" during an unplanned closure is worse
  than no indicator. The values are still the unverified placeholders (Mon–Fri 9–5, Sat 10–2, Sun
  closed) and cannot ship — but confirming them is now one edit.
- **The reply times themselves are unverified** — WhatsApp "within 4 hours" and Message us "within
  2 working days", stated on the gift-card checkout's help drawer and now on Choose Box v2's too.
  They are commitments to customers mid-payment, so they need the business to confirm them before
  launch.
- **The WhatsApp number is the same unverified placeholder as Contact Us**
  (`wa.me/442038751234`), now reaching customers from three pages through `at-contact-data.js`.
  It is a real-looking number that is not ours; it must be replaced with
  the actual WhatsApp Business number or the route removed.

- **The earliest-delivery date is hard-coded** as "6 August" on every funnel step (Choose box,
  Add dishes, Extras, Review, Checkout) and on Abby's Boxes. It must be computed from the kitchen
  cut-off and lead time, in one place, and it is already visibly stale in the prototype. Treat
  every instance as one value, not six strings. Deliberately absent from the rebuilt homepage.
  **Menu Landing v3 is the first page to do this properly**: its strip reads a `nextDelivery` prop
  ("Next deliveries from Fri 18 Sep") rather than a literal, so there is one value to wire to the
  real availability source. Its note explains the date as the next available **cooking run**
  (limited orders per run) and no longer mentions postcode — if dates do vary by postcode, the box
  builder is now the only place a customer learns that.
- **"Full nutrition shared for every dish" is a claim the product must honour.** Confirmed
  accurate and intended, but it depends on the dish detail pages actually publishing full
  nutrition — the cards and menu data carry protein and fibre only today. If those pages ship
  without it, the homepage line has to change.
- **Private Table's credentials are regulated claims** — "a UK-certified health coach", "a
  registered nutritionist", "in collaboration with your clinical team". Each needs to be
  substantiable, and the wording checked, before launch.
- **Allergens are designed, not open.** `Abby's Table - Dish Landing v2.dc.html` carries an
  "Ingredients & allergens" accordion, the Add Dishes modal repeats it, and the footer links to an
  Allergens page. Each dish record already holds an `allerg` string. Nothing new to design — but
  see § 3k for what production must guarantee about that data, and the footer Allergens page
  itself does not exist yet.
- **Gifting mechanics are unconfirmed.** The FAQ answers describe gift messages, sending direct to
  a recipient, a recipient-choice journey and gift cards. Per the client's copy notes, the
  recipient-choice mechanism and gift-card format, redemption rules and launch availability all
  need operational confirmation before publishing.
- **Payment-method wording is provisional** — the final answer must reflect whatever methods are
  actually enabled at launch. The prototype says "including major debit and credit cards".
- **Two FAQ answers are intentionally duplicated**, and search now has to work around it.
  "Can I freeze my meals?" appears verbatim under both Your food and Storage & reheating, and the
  5-day fridge guidance appears under both with different wording. They were kept in both so
  either browse path finds them. Since search results no longer carry a topic label, the index
  drops exact-duplicate questions (first in document order wins) — otherwise the same question
  printed twice looked like a bug. **The near-duplicate pair is not caught by that**, so
  "How long will my dishes keep?" and "How long will my meals keep in the fridge?" both appear in
  results. A copy decision: keep one of each pair, or reword so the difference is meaningful.
- **Every contact detail on the Contact page is an UNVERIFIED PLACEHOLDER**, taken from the
  mockup because the question went unanswered: phone **020 3875 1234**, email
  **hello@FromAbbysTable.co.uk**, and the same number behind the WhatsApp link. None of the three can
  ship as-is. The opening hours (Mon–Fri 9–5, Sat 10–2, Sun closed) are equally unconfirmed, and
  the "Open now / Closed" indicator is computed from them, so a wrong window produces a
  confidently wrong answer on the page.
- **`assets/whatsapp-qr-placeholder.png` IS NOT A SCANNABLE CODE.** A drawn stand-in so the
  desktop layout matches the mockup — user's call, taken knowingly. Replace before launch; the alt
  text says so, and a release gate should treat a placeholder QR the same as a placeholder dish
  photo. Desktop only; on a phone the WhatsApp link opens the app directly.

  **Production spec for the real asset:**
  - **96 × 96 CSS px** displayed. Chosen over 120px because 120 would have forced the method row
    to 2×2, weakening the contact strip for one card's sake. 96 fits beside a display-size line in
    a quarter of the 1280 row.
  - **Four-module quiet zone on all four sides**, inside the image file. The card's 1px border
    then sits outside the clear space instead of cropping it. (The placeholder now has this; the
    first version had two modules.)
  - **Vector or high-resolution render**, never a resized raster screenshot.
  - **Dark green or black on white.** High contrast, no brand tinting of the modules.
  - **Keep the payload short** — the shortest `wa.me` URL, or better a redirect such as
    `FromAbbysTable.co.uk/whatsapp`. A shorter payload means a lower QR version and fewer, larger
    modules, which is what actually buys scanning reliability at 96px. A redirect also lets the
    WhatsApp destination change without reissuing the asset.
  - **Test on real current iPhone and Android cameras**, at the site's real breakpoints and at
    100%, 125% and 150% browser zoom. Do not infer scannability from CSS pixel arithmetic — CSS
    px do not map reliably to physical size across displays and zoom levels.
  - Do not design around an assumed module count: the QR version depends on the final payload and
    error-correction level.
- **The bank-holiday list behind the open/closed indicator is hard-coded** (England & Wales, 2026)
  and needs a maintained source, plus a way for the business to record exceptional closures.
- **TERMS OF SALE NEEDS SOLICITOR REVIEW BEFORE LAUNCH.** The copy is a working draft supplied by
  the client and is good enough to build and review against, but it is not signed off. It makes
  statements about contract formation, cancellation rights, perishable-goods exemptions, refunds and
  liability that carry real legal consequence. A UK consumer/food-law solicitor should review the
  final text.
- **The company registration details in clause 1 and clause 56 are PLACEHOLDER** — Abby's Table
  Foods Ltd, company number 12345678, 1 Example Street London AB1 2CD. Also placeholder: **Stripe**
  named as the payment provider in clause 12.
- **Not VAT registered at launch** (user's confirmation). The VAT number row is removed from the
  registered-details panel, and clause 10 states it plainly rather than the draft's "prices include
  VAT where VAT is applicable", which implied VAT was being charged. **This has to be revisited if
  the business registers** — the threshold is reachable — and the change is two edits: restore the
  VAT row and reword that one sentence. Same phone and email as the
  Contact page, so they carry the same open flag.
- **Terms of Sale must be reconciled against the rest of the site before launch.** It is the one
  document that restates policy already stated elsewhere, so the customer must never be given two
  slightly different versions. Specifically check it against: the checkout and Order Confirmation,
  Delivery & FAQs (delivery charge, cancellation windows — now "contact us at least 7 days before
  your scheduled delivery", § 3ak — freezing, reheating), the Allergens page
  (precautionary wording, "free from", dietary descriptions), dish labels, and the confirmation
  email. That consistency is a large part of what makes the terms defensible.
- **EVERY WORD OF SAFETY COPY ON THE ALLERGENS PAGE IS PLACEHOLDER** and needs sign-off from
  whoever owns food safety before launch. Specifically: the cross-contamination statement ("we
  cannot guarantee that any dish is 100% free from allergens"), and three operational claims under
  Our approach — **separate storage**, **careful preparation and thorough cleaning**, and **our
  team is trained to manage allergens responsibly**. Each must be true of the actual kitchen, or
  amended. This is the highest-consequence unverified copy in the prototype.
- **The Privacy Policy carries 20 marked placeholders and one unrendered table.** All are visible
  in the page as "to be confirmed" marks. Needed before launch: the seven service providers
  (payments, delivery, hosting, email/CRM, analytics, advertising, fraud), the ten retention
  periods, the material international-transfer providers and their safeguards, the waitlist
  unsubscribe method, and a **cookie audit** to populate section 7's technology list.
- **The Privacy Policy has not been legally reviewed.** The copy is the client's, used verbatim,
  and includes statements about lawful bases, special-category data and international transfers.
- **The client proposed shortening the footer legal strip to "Privacy · Terms · Cookie
  preferences"** — dropping the © notice and shortening "Privacy Policy". Not applied: it changes
  a canonical component across six pages, and the © notice is a legal marking. Raise before doing.
- **The cookie panel needs a "Learn more about cookies" link to `/privacy#cookies`.** The anchor
  exists; the panel does not.
- **"Private Table from £1,500" is unverified** and sits inside the parked pricing decision.
- **"Ready in minutes" is unquantified.** The brand voice states specifics plainly, and this
  does not. Needs the real reheat time and method (oven minutes, microwave minutes) before launch.
- **One-off or subscription is never stated** anywhere on the homepage. It is the most common
  hesitation for a UK meal box and currently has no answer on the page. A content decision, not a
  design one.
- **Delivery cost and coverage are unstated.** "Mainland UK" now appears in How it works step 03,
  which implies non-mainland exclusions that are documented nowhere.
- **No basket.** Box state lives only inside the checkout flow; marketing pages show nothing. A
  half-built box has no route back. Decided deliberately, worth revisiting.
- **Cookie consent** is designed but not built: bottom banner, non-modal, equal-weight
  Reject/Accept, no dismiss control, tertiary "Customise settings", and a cookie policy page that
  does not yet exist. Must not steal focus on load, and must not obscure focused content
  (WCAG 2.4.11).
- **Allergen information** is a UK legal requirement for distance selling of prepared food and is
  not yet designed into the dish, box-builder or checkout flows.
- **Delivery slots and lead times** are unresolved — postcode coverage, cut-offs, sold-out dates.
- **All food imagery and video is AI-generated placeholder.** See `photography-shot-list.md`.
  This is a launch blocker, not a polish item, and it will not announce itself: the prototype's
  filenames (`hero-*.png`, `hiw-*.mp4`, `hiw-poster-*.jpg`) are the ones a build would inherit, so
  a placeholder ships by default unless someone deliberately replaces it. Two reasons it cannot
  go live beyond image quality:
  - **Garbled lettering.** The packaging in the How it works clip reads "Tigerl Nermfied Ram" and
    similar. It is legible at full size.
  - **Dishes that do not exist.** The hero shows steak with jollof; the clip is labelled "Jollof
    Rice with Grilled Chicken". Neither is one of the eight menu dishes, so both misrepresent the
    product under ASA/CAP rules for advertising food you sell.
  Every placeholder is marked with a comment at its use site in the page source. Treat "no real
  asset yet" as a reserved empty container, never as a reason to substitute another photo.
- **Token changes are pending**, declared in the rebuilt page's `:root`: `--terracotta` → #B7554E,
  `--terracotta-deep` → #9C433D, and a new `--gold` (#F6C33B, dark grounds only). These move into
  the design system when the component propagates.
- **Playfair 500 vs 600** for the hero headline is unresolved.
- **The standards line** ("No seed oils ⬥ No bouillon or cubes ⬥ No MSG ⬥ No refined sugars") was
  dropped from the homepage along with the promo strip. Whether it is removed site-wide or kept on
  inner pages was never settled. It is a signature brand device, so it should not disappear by
  omission.
- **One console error logs as `{}`** on load and could not be attributed — every resource returns
  200 and nothing throws during interaction. Left alone rather than guessed at; noted so it is not
  rediscovered as new.


## 3u. The wordmark — `at-logo.js` (4 Oct 2026)

One custom element, `<at-wordmark>`, draws the Abby's Table wordmark everywhere: marketing header,
mobile drawer, footer, the checkout-step / payment-status / error-page headers and footers.

- **Source of truth:** the paths in `at-logo.js` are `assets/logo.svg` verbatim (viewBox
  `0 0 236.735 40.125`). If the logo ever changes, update both. Nothing on a live page loads
  `assets/logo.svg` any more; the file stays for the design system and for reference.
- **Markup contract:** the existing sized box is unchanged and owns size, position and colour —
  `<span aria-hidden="true" style="…width/aspect-ratio…; color: var(--green-forest);"><at-wordmark></at-wordmark></span>`.
  The element fills that box; the SVG scales to fit with `preserveAspectRatio="xMidYMid meet"`
  (`align="left"` ⇒ `xMinYMid`), the same geometry as the old `no-repeat center / contain` mask.
  Colour is the box's `color` (was its `background`). Hover/opacity rules on the box are unchanged.
- **Accessibility:** the link (or `role="img"` span on the error/payment pages) keeps the
  accessible name; the box stays `aria-hidden`; the SVG is `aria-hidden="true" focusable="false"`
  with no `<title>`, so it adds nothing to the accessibility tree.
- **Loading:** `<script src="at-logo.js">` in every live page's REAL `<head>`, after
  `at-focus.css`, before `support.js` — defined before anything renders. `_audit/head-check.html`
  now fails a page that uses `<at-wordmark>` without it, loads it only from `<helmet>`, or still
  references `logo.svg`.
- **Why the self-redraw:** the page renderer clears the element's children and style attribute
  after it connects (it does not know about the SVG). So the element's default box lives in a tiny
  stylesheet the script adds to `<head>` at load, and the element watches its own children and
  redraws — the at-order-state.js re-apply pattern.
- **Exports:** the bundler inlines `at-logo.js`; standalone files need no logo file and no mask.
- **Production:** render the SVG server-side in the shared header/footer partial (same markup,
  same `currentColor` contract) — no client script needed there.


## 3v. Desktop marketing header — `at-desktop-header.js` (5 Oct 2026)

One shared script, one passive scroll listener. Applies only at `(min-width: 1024px)` and only
to `header.at-hdr[data-at-desk-hdr="marketing"]`. Writes `data-desk-hidden="true|false"`; a
stylesheet the script adds maps it to `translateY(-100%)` and neutralises the page's mobile
`data-hidden` at desktop (by specificity — no page CSS was edited). The header's existing
`transition: transform .22s` and its reduced-motion override are reused. Thresholds: hide 40px,
reveal 64px, measured from the turning point; top zone = header height. The header is sticky and
in flow throughout, so hiding never shifts layout. **Applies to:** Homepage, Menu, How it works,
Gifting, Private Table, Standards, Abby's Story, Delivery & FAQs, Contact. **Does not apply to:**
dish pages, Allergens, Privacy Policy, Terms of Sale, Log in, My Account, Order Confirmation, error
pages, ordering steps, checkout/payment pages. **Production:** same rules in the shared
marketing-page shell; the opt-in becomes a property of that shell.

## 3ak. Business rules — reconciled 5 Oct 2026 (authoritative)

Mirrors CLAUDE.md "Business rules — reconciled 5 Oct 2026". Where an older line here disagrees,
this section wins.

- **Active box.** Viewing Step 1, the default 6 and changing size on Step 1 create nothing. ADD
  DISHES commits the box (active even at 0 dishes); a genuinely carried dish from a dish page also
  makes it active. Removing the final dish leaves an active EMPTY box; VIEW BOX stays. Payment
  success converts/clears the draft. Retention ~24 h empty / 7 days populated. The delivery
  reservation is separate. Never "active = has dishes".
- **Box size.** 6–99, any count; 6 / 12 / 18 presets where the UI shows them; "Set your own" for the
  rest (existing typeable stepper).
- **Existing box → Gifting.** See § 3z: prompt first ("You already have a box in progress." — USE MY
  CURRENT BOX AS A GIFT / KEEP MY CURRENT BOX). Visiting Gifting changes nothing.
- **Points.** 2 per £1 of eligible spend after discounts; 100 = £1; never expire; no minimum; capped
  at 20% of an order (customer chooses how many up to the cap — no "use some or all" wording).
  Earn: dishes, Signature upgrades, eligible extras, Gift Card purchases (amount paid for the card
  value). No earn: delivery/postage, the £3 greeting card, the Gift-Card-funded part of an order.
  New-money eligible spend alongside a Gift Card earns. Points not normally redeemable against Gift
  Card value. Points, vouchers and Gift Cards may combine on food orders, subject to eligibility.
  Added immediately after successful payment — no pending-until-fulfilment state. Full refund ⇒
  reverse points on the refunded eligible spend; partial ⇒ only that part; non-earning lines reverse
  nothing; redeemed points on a cancelled/refunded order are restored; a negative balance is allowed
  and offset by future earnings.
- **Confirmed orders.** Read-only in My Account; no self-service change/cancel, no deadlines or
  eligibility messages; only "Need help with an order?" / "Contact us." / CONTACT US. Policy (Delivery
  & FAQs, Terms of Sale only): contact Abby's Table at least 7 days before the scheduled delivery —
  not a guarantee of acceptance; case-by-case flexibility not documented. Dates under 7 days away are
  never offered.
- **Reservation + payment hold.** 15 minutes from an active date choice (a displayed suggestion
  reserves nothing). Entering payment: revalidate the date → start the payment session → protect
  capacity as a payment hold → up to 10 further minutes. No second countdown. Repeated attempts
  cannot extend a slot indefinitely. Submitted-but-uncertain payments: resolve with the provider
  first; no release on a timer, no "pay again".
- **Legal pages from Checkout.** New tab; checkout intact; "← Back to checkout" may switch to the
  existing checkout where the browser permits; no auto-close requirement; no `window.opener`
  dependence; no second checkout; fallback message "Your checkout is still open in your previous
  tab. Switch back to it to carry on."
- **Desktop marketing header.** § 3v (page lists there).
- **Order Confirmation.** Approved v2 structure unchanged (normal site navigation, no stepper, Order
  confirmed, order number, Delivery details, concise Order summary, account/points state, restrained
  Private Table banner, no gifting promotion, no Manage delivery). Points are added after successful
  payment, not pending; the prototype's 1-per-£1 figures are stale.
- **Account setup after Checkout — points (decided 5 Oct 2026).** Qualifying points are earned immediately after successful payment. If account setup/access is
  still incomplete, the points remain attached to the successful order and become visible in the
  account once secure setup/access is completed.
  Never pending, awaiting fulfilment or "not yet earned". The "created" state's "Your points will
  appear once your account setup is complete." is acceptable on that reading.
- **Gift Card Checkout — account + points (decided 5 Oct 2026; build-stage requirement).** Same
  optional create-after-payment as food-box Checkout: guest checkout stays; no password detour
  before payment; opt-in ⇒ secure setup/access link after successful payment; an existing-account
  email never duplicates, never silently signs in, never blocks payment. Earn 2 per £1 of card value
  actually paid; postage and the £3 greeting card do not earn; no second earn when the recipient
  redeems. Points attach to the purchase at payment and appear once setup/access is complete;
  signed in ⇒ straight into the account; a guest who does not opt in sees no points-awarded account
  state. Use Checkout v2's pattern; the approved Gift Card Checkout design stays the visual
  reference. **The prototype is visually stale** (no account option, no points panel) until built.
- **Unchanged and still agreed:** server-side draft as source of truth; same-browser multi-tab
  recovery and reconciliation; exactly-once conversion; guest checkout; separate Gift Card and gift
  food-box states; preserving valid progress; an invalid later-stage order returns to the earliest
  step that needs fixing; unavailable dishes return to Step 2 keeping compatible downstream state;
  site-wide VIEW BOX for an active box; no marketing-email signup in Checkout / Order Confirmation;
  gift-only recipient phone helper.

---
spec_id: SPEC-2026-10-07-menu
title: Menu — /menu to Menu Landing v3, filters, sort, the delivery strip and the v2 dish card
status: approved
branch: feat/menu-landing-v3
owner: michaeljosiah
capabilities: [menu, catalog-browse, dish-card]
created: 2026-10-07
updated: 2026-10-07
---

# Menu

> **Status (2026-10-10): approved, implemented but for one item.** `/menu` is rebuilt to Menu
> Landing v3 (#21): title and lede, the delivery strip, the filter card with its four groups and
> Sort, the grid on the v2 dish card, "Where the flavour comes from", the purchase bar and ↑ Top.
> Aonik's typed dish facts and its protein and calorie sorts (michaeljosiah/aonik#359) are live.
> One thing still waits on Aonik and is held back rather than faked: the next cooking run WITH
> CAPACITY (michaeljosiah/aonik#346).
> Sources: `design/Abby's Table - Menu Landing v3.dc.html`, `design/build-handoff.md` §3w,
> `design/CLAUDE.md` (menu page, ↑ Top, delivery strip, cards, dropdowns),
> `design/frontend-backend-contract.md` §4, §4b, §4d. Where the issue and the design disagree,
> the design wins and the requirement says so.

## Why

The menu is where people choose. The old page was the desktop-first template under a "Menu"
heading, with six filter groups the v3 design retired (Category, Calories among them), a sticky
filter band that fought the auto-hiding header, and a card whose Signature explainer could not be
opened by keyboard or on a phone. Its filters are also the place a guess would do quiet harm: a
dish shown under "Mild" because its heat was never published, a low-sugar claim made from a
carbohydrate figure, a dish sorted to the top of "Lowest calories" because an unknown was read as
zero.

Depends on: `SPEC-2026-07-22-catalog-browse` (the browse and facets reads, FR-2),
`SPEC-2026-10-07-site-chrome-and-consent` (chrome, purchase bar, consent),
`SPEC-2026-10-07-marketing-pages` (FR-01 verbatim copy, FR-02 figures from data, FR-11 the card).

## What changes

- MODIFIED menu — `/menu` to Menu Landing v3: page head, delivery strip, filter card, grid, flavour
  band, purchase bar, ↑ Top (FR-01–FR-03, FR-10, FR-11)
- MODIFIED catalog-browse — the filter vocabulary becomes the design's four groups; URL facets are
  checked against the facets read; a menu order is a capability of the source (FR-04–FR-07)
- ADDED dish-card — the v2 tag stack, a derived "Under 500 kcal", the Signature "i" as a real
  button outside the card link (FR-08, FR-09; closes marketing-pages T13)
- MODIFIED catalog-browse — a browse row with no `heatStep` has no heat, not "Medium" (FR-06)
  (breaking: yes, visible — live cards without published heat lose their heat row)

---

## Requirements

### Requirement: FR-01 The page head
`capability: menu` · `delta: MODIFIED (feat/menu-landing-v3)`

The page SHALL open with the h1 "What’s on the table?" (no eyebrow) and the lede "Chef-prepared
Nigerian fusion dishes, cooked in small batches" — a phone reads that clause alone with a full
stop; from 640 it continues "and delivered chilled to mainland UK. Choose {minimum} or more dishes
to build your box." The minimum is the box plan's, in words, from the same read as the purchase bar
(marketing-pages FR-02); with no plan the second sentence is left out. The title band is the
purchase bar's reveal point.

#### Scenario: The minimum is the plan's
- **WHEN** the tenant's plan starts at 6 dishes
- **THEN** the lede reads "Choose six or more dishes to build your box." from 640
- **AND** with no plan it reads "…delivered chilled to mainland UK." and names no number

### Requirement: FR-02 Next deliveries
`capability: menu` · `delta: ADDED (feat/menu-landing-v3)`

Under the lede the page SHALL show a `--sage` strip "Next deliveries from {date}", the date a
value from Aonik's delivery window formatted "Fri 18 Sep" (`formatDeliveryDateShort`, the weekday
derived from the date). With no window the strip SHALL NOT render, and a window whose date has
passed in the UK SHALL count as none (`upcomingDeliveryDate`). Its "i" ("About delivery
dates") SHALL open the note "About delivery dates" / "We take a limited number of orders for each
cooking run, so we can give every dish the care it deserves. The date shown is our next available
run. **Availability can change if a run fills before you complete checkout.**" verbatim — on hover
(closing when the pointer leaves the strip), on keyboard focus, and on click (pinned until a second
click, the ×, Escape or a press outside). Contract §4 asks for the next run WITH CAPACITY; until
aonik#346 the value is the earliest delivery window.

#### Scenario: No window, no date
- **WHEN** Aonik answers 404 for the tenant's delivery window
- **THEN** no strip renders and no date appears anywhere on the page

#### Scenario: A stale window
- **WHEN** the earliest delivery date Aonik returns is yesterday
- **THEN** no strip renders: a day that has gone is never promised

#### Scenario: Keyboard
- **WHEN** a keyboard user tabs to the "i"
- **THEN** the note opens, Escape closes it, and Tab can reach its ×
- **AND** Escape pressed on the × closes the note with focus back on the "i"

### Requirement: FR-03 The filter card
`capability: menu` · `delta: MODIFIED (feat/menu-landing-v3)`

The card SHALL hold the search ("Search dishes", a 52px pill with a clear ×), Filters (filled, with
the selected count) and Sort, then the active filters as removable 44px pills ("Remove filter:
Fish") with "Clear all". It SHALL NOT be sticky. Filters and Sort share a row on a phone and never
shrink below their labels: where they cannot fit (320, or a narrow phone with the count pill) Sort
wraps under Filters rather than overflowing the page. With no facet groups there is no Filters
button; with fewer than two orders there is no Sort.

### Requirement: FR-04 One set of groups, two compositions
`capability: menu` · `delta: MODIFIED (feat/menu-landing-v3)`

The groups SHALL be one always-mounted panel (`display: none` while shut, so `aria-controls`
resolves): below 1024 a bottom sheet that is a modal dialog — focus moves in and is trapped, the
page does not scroll, Escape closes it (an open note first) and focus returns to Filters, and it
holds `data-overlay-open` so the purchase bar and ↑ Top yield; from 1024 an inline four-column
panel inside the card with no dialog role and no `aria-modal`. Its foot carries "Clear all
filters" (while any is selected) and "Show N dishes".

#### Scenario: The bar yields to the sheet
- **WHEN** the purchase bar is in and the customer opens Filters on a phone
- **THEN** the bar and ↑ Top are hidden and out of the tab order until the sheet closes

### Requirement: FR-05 The four groups
`capability: catalog-browse` · `delta: MODIFIED (feat/menu-landing-v3)`

Demo mode SHALL serve the design's groups in its order — Protein source (Chicken, Beef, Lamb,
Fish, Turkey, Plant-based), Eating style (Protein-led, Carb-conscious, Plant-led,
Mediterranean-inspired, with "What do these mean?"), Heat (None, Mild, Medium, Hot, the chips
drawing the card's pips), Dietary & other (Gluten-free, Dairy-free, High in fibre) — each with
"All". Keys are `protein`, `wellness`, `heat`, `dietary`; live groups are whatever the tenant's
facets read advertises. The seeders author demo's groups with demo's tokens, matched on each
product's `attributesJson.facets.<key>` (`tenantFacetGroups`, `dishFacetTokens`), so
`?facet.protein=lamb` means the same in both modes; the display attributes keep the record's words. "Low sugar" SHALL come only from a real
flag: live, a tenant facet on Aonik's typed `lowSugar` (aonik#359), matched by Aonik; demo's dishes
carry no such flag, so demo has no chip — the prototype's stand-in (carbohydrate ≤ 20g) would be a
nutrition claim. "DASH" stays
in the data with no chip (contract §4d). Calories and Category are no longer groups.

#### Scenario: OR within, AND across
- **WHEN** the customer selects Lamb and Turkey, then Hot
- **THEN** the URL is `?facet.protein=lamb,turkey&facet.heat=hot` and the grid is the lamb shank
  alone

#### Scenario: The eating-style note defines only what is offered
- **WHEN** a tenant's eating-style group offers two of the four styles
- **THEN** the note defines those two, and is absent when it would define none

### Requirement: FR-06 Never a guessed value
`capability: catalog-browse` · `delta: MODIFIED (feat/menu-landing-v3)`

A dish SHALL match a facet value only through a field its record carries; a dish without the field
matches nothing. A record's heat is Aonik's typed `heat` (0–3, aonik#359) wherever the record
carries that member — null is unknown, never refilled from the legacy `heatStep` attribute, which
counts only for a source without the typed member; anything absent or not an integer 0–3 SHALL be
no heat (it used to read "Medium"), and every surface (card, dish page, Standards and How It Works
examples, Add Dishes, Review) SHALL leave the heat out rather than draw a level. The same holds for
the card's figures: Aonik's typed kcal, protein and fibre (null when unknown or withheld as stale)
over the attributes (the homepage rail takes them from the row too, never the detail read), and the
protein source is the product's category where it names one. Copy — the description and the
components line — falls back to the legacy attribute only while the typed value is blank. A seeded
tenant authors typed heat and its heat facet as one-step Range bands on it, so the filter and the
pips read one field.

#### Scenario: No heat published
- **WHEN** a live row's typed `heat` is null (or, from an older Aonik, it has no `heatStep`)
- **THEN** its card has no pips and no heat word, and it matches none of None/Mild/Medium/Hot

#### Scenario: Figures under review
- **WHEN** a dish's default content block is stale, so Aonik withholds its figures from rows
- **THEN** neither its menu card nor its homepage rail card shows protein, fibre or "Under 500
  kcal", and it sorts after every dish with the figure

### Requirement: FR-07 Sort, at the source
`capability: catalog-browse` · `delta: ADDED (feat/menu-landing-v3)`

Sort SHALL offer Recommended (the source's own order), Highest protein and Lowest calories — only
the orders the source can apply across the whole match set before paging
(`AonikClient.menuSorts`). Demo applies all three; live does too, at Aonik (aonik#359):
Recommended sends no sort (the `menu` collection's rank is Aonik's default inside a collection),
Highest protein `sort=protein-desc`, Lowest calories `sort=calories-asc`. A dish without the figure
SHALL follow every dish with it, never be read as 0; ties keep the recommended order in demo and
go by name in live (Aonik's tie-break).
The order is `?sort=protein|calories` (absent for Recommended); an order the source cannot apply
is Recommended. Sort is a view control (menu styling, brass icons, tick) and a listbox: arrows,
Home, End; Enter or Space commits; Escape closes the list only; Tab closes and moves on; a press
outside or focus leaving dismisses it; it opens above the trigger when the space below is short.

### Requirement: FR-08 The v2 dish card
`capability: dish-card` · `delta: MODIFIED (feat/menu-landing-v3)`

The card (homepage rail and menu grid) SHALL carry its tag stack over the photograph, outside the
card link: cream 12px pills (the first eating style, else the homepage category; then "Under 500
kcal"), "New" in gold with forest ink, the navy Signature pill with its "i", and the navy upgrade
pill. There is no "Abby’s Signature" banner. On the menu the title is an h2, the description shows
at every width (16px on a phone, unclamped; 14.5px and clamped from 640), and the heat row states
the word beside the pips ("Heat level: Mild" as one labelled image). A live browse row carries no
description field, so a menu card's description is the product's `description` attribute (seeded
with the product's own words); without one the card shows none.

### Requirement: FR-09 "Under 500 kcal" is derived
`capability: dish-card` · `delta: MODIFIED (feat/menu-landing-v3)`

The tag SHALL show exactly when the dish publishes calories strictly under 500; a stored tag of
that name is ignored and a dish without calories shows none. It is not a filter.

#### Scenario: A stored tag on a 520 kcal dish
- **WHEN** a record carries the tag "Under 500 kcal" and 520 kcal
- **THEN** the card shows no calorie tag

### Requirement: FR-10 The Signature note
`capability: dish-card` · `delta: MODIFIED (feat/menu-landing-v3)`

The "i" SHALL be a real button ("What does Signature mean?", `aria-describedby` a per-card
tooltip) outside the card link — the link and the button are separate tab stops — opening "One of
Abby’s specials. This dish takes a little more time or uses premium cuts, so there’s a small
upgrade." on hover where the device can hover, on keyboard focus and on a tap; a second tap,
Escape, a press outside the pill or blur closes it. Below 1024 it opens under the tag stack inside
the card with its tail measured to the "i" (and under the upgrade pill if it would cover the
price); from 1024 to the right of the pill. Closes marketing-pages FR-11's known gap (T13).

### Requirement: FR-11 ↑ Top
`capability: menu` · `delta: ADDED (feat/menu-landing-v3)`

A "↑ Top" utility (cream, green ink, hairline; z-index 75) SHALL show by scroll position — on a
phone once the menu band has passed 1.75 viewport heights, hidden under 0.9; from 1024 once the
first card has left the viewport, hidden when it is 140px back — never by a dish count. It returns
to the page heading less the header and focuses the h1 (a jump under reduced motion). On a phone it
sits 14px above the purchase bar while the bar is in (`data-purchase-bar-shown`, `--at-bar-h`), at
the edge when it retracts; 40px at 24px insets from 1024; in the right gutter from 1440. It yields
to the drawer, the sheet and an unresolved consent layer, and stays over the footer.

### Requirement: FR-12 Where the flavour comes from
`capability: menu` · `delta: MODIFIED (feat/menu-landing-v3)`

Under the grid the blush band SHALL carry the monogram, "Where the flavour comes from" (12px,
`--brown`), "Bold Nigerian flavour, built from real ingredients.", a brass hairline and the two
facts with their decorative icons; from 1024 the photograph sits in its own column.

---

## Design

### Architectural decision

The page is a Server Component that resolves everything once (`getMenuPageData`: facets read
first, then the browse with only advertised facet values; the delivery window and the facets are
optional, the browse is not) and the purchase bar's plan (`getPurchaseBarData`). State lives in the
URL (`q`, `facet.*`, `sort`, `limit`), as before; search keeps its own text and reaches the URL
after a 250ms pause, so no keystroke is lost to the round trip. Rules are React-free in
`src/lib/menu/` and unit tested. A menu order is a capability of the data source, like coverage
on Delivery & FAQs: the page offers what the source can do.

### Target architecture

| Piece | File |
|---|---|
| Route | `web/src/app/(site)/menu/page.tsx` |
| Components | `web/src/components/menu/` — `MenuBrowser`, `MenuToolbar`, `MenuFilterSheet`, `MenuSort`, `FilterChip`, `MenuGrid`, `MenuDeliveryStrip`, `MenuTopButton`, `FlavourBand` |
| Card | `web/src/components/sections/DishCard.tsx`, `SignatureInfo.tsx` |
| Rules | `web/src/lib/menu/` — `facets.ts`, `filters.ts`, `sort.ts`, `cardTags.ts`, `topControl.ts`, `constants.ts` |
| Copy | `web/src/lib/content/menu.ts` |
| Data | `getMenuPageData`, `AonikClient.menuSorts`, `heatFromStep` (`web/src/lib/aonik/`) |

### Known gaps — departures from the design, each deliberate

1. **"mainland UK"** for the design's "across the UK" in the lede (marketing-pages FR-01; CLAUDE.md
   — non-mainland exclusions are open).
2. **No "Low sugar" chip in demo** (FR-05): its dishes carry no real flag; live shows the tenant's.
3. **Filters and Sort wrap** where they cannot share a row (FR-03); the prototype's `1fr 1fr`
   overflowed the page by 4px at 320.
4. **The demo's goat dish has no protein source**: the design files "Wild Rice, Goat Efo" under
   "Beef" (FR-06; owner question 1).
5. **The homepage's Pepper Soup Seafood Stew loses "Under 500 kcal"**: the homepage design prints
   it, but the dish publishes no calories (FR-09).
6. Sheet and note closes are SVG crosses (design/CLAUDE.md "Close controls"); the prototype's
   markup has text ×.
7. With Aonik unreachable in live mode the browse fails and the route shows the 500 page, as it did
   before; a failed facets or delivery read costs only the filters or the strip.
8. The demo delivery date (6 August) has passed, so demo `/menu` shows no strip (FR-02's stale-window
   rule); the tests pin the clock to before it to check the strip.

### Open questions (owner decisions, not requirements)

1. **Wild Rice, Goat Efo's protein** — the design says Beef; add "Goat" to the vocabulary, or
   correct the record?
2. **Low sugar** — publish a real per-dish flag (and its basis) or take the chip off the design.
3. **DASH** — publish a definition and a chip, or remove it from the data (contract §4d).
4. ~~**Recommended in live**~~ — answered by Aonik: with no sort, a collection browse is in `rank`
   order, so Recommended is already the `menu` collection's curated order.
5. **`pageSize`** — 6 per page and per Load more, the design's default; a product decision before
   launch (contract §4b).
6. **Live facet keys** — the UI gives the eating-style note and the heat pips to `wellness` and
   `heat` (`spice` still draws pips); a tenant seeded before #21 should retire `meal` and
   `calories`, re-author the four groups above and re-seed its products (for `facets` and
   `description`). A description field on Aonik's browse row would retire the attribute.

---

## Tasks

- [x] `T1` Page head, lede minimum from the plan, delivery strip and note (FR-01, FR-02)
- [x] `T2` Filter card, sheet/panel at 1024, groups, pills, Sort (FR-03–FR-05, FR-07)
- [x] `T3` No guessed heat: `heatFromStep`, optional `Dish.heat` on every surface (FR-06)
- [x] `T4` v2 card: tag stack, derived kcal tag, Signature button (FR-08–FR-10; marketing T13)
- [x] `T5` ↑ Top and the flavour band (FR-11, FR-12)
- [x] `T6` aonik#359: typed heat, protein source and nutrition on browse rows, a low-sugar flag,
  sort by protein and calories — `HttpAonikClient.menuSorts` lists all three; "Low sugar" is the
  tenant's facet on the typed flag
- [ ] `T7` aonik#346: the next cooking run with capacity as the strip's date
- [ ] `T8` Owner questions 1–6

### Testing

- Unit: `tests/menu.test.tsx` — the vocabulary, each group's matching, OR/AND, URL parsing and
  sanitising, pills, the result line, each sort with ties and missing figures, the kcal tag, card
  tags, the heat mapping, the date format, ↑ Top thresholds, the page in demo and in live (no Sort,
  no sort sent, no unadvertised facet sent, no guessed heat, a failed facets read, a failed
  browse); `tests/homepage.test.tsx` (the card's Signature button outside the link).
- Manual: 320 / 390 / 1024 / 1280 / 1440 against the design file; every chip and sort on demo data;
  the sheet's focus trap and Escape; the bar and ↑ Top yielding; keyboard only.

### Definition of done

All scenarios pass; `npm test`, lint, typecheck and build are green; a reviewer has signed off.

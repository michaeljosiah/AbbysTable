# Abby's Table — frontend/backend contract

**Version 0.3 — homepage, Delivery & FAQs, Contact.** Both teams read this so they agree what passes between them.
Expected to change when the checkout flow is rebuilt; version it rather than treating it as final.

Ownership layers, staleness rules, approval workflows, audit and release gates are specified in
`build-handoff.md` § 3k. This document is the field-level contract only.

---

## 1. Dish record

The homepage dish carousel renders from an array of records. Swapping the placeholder data for
production data must not require touching card layout.

| Field | Type | Owner | Notes |
|---|---|---|---|
| `id` | string | system of record | stable; used for the route |
| `name` | string | system of record | menu name, must match what is orderable |
| `components` | string | CMS | the "with…" line under the title |
| `description` | string | CMS | hidden on mobile by design, shown from 1024 |
| `tags` | array of `tag_key` | config | from a fixed set — never free text, or the pill styling drifts |
| `heat` | integer 0–3 | system of record | rendered as pips; the word is exposed to assistive tech, not shown |
| `protein_g`, `fibre_g` | number | system of record | referenced, never copied into CMS fields |
| `price` | money | system of record | runtime or edge |
| `signature` | boolean | system of record | drives the Signature pill and its upgrade note |
| `upgrade_price` | money, optional | system of record | only when `signature` |
| `image_key` | string | system of record | resolves through the image map — **one** source of truth, not both a key and a path |
| `route` | string | config | must resolve to a real dish page |
| `placeholder` | boolean | assurance | `true` blocks production build |

**Not on the homepage card:** allergens and full nutrition. Both are on the dish detail page, which
is where they are designed. Do not add them to the card.

### Images

`image_key` resolves through a map so real photography is a one-line change per dish. Three files
currently stand in for eight dishes, which is why `placeholder` exists.

`alt` belongs to the **media asset**, not the dish record — with a version-bound contextual
override. See § 3k.

---

## 2. Price

**Canonical wording is fixed; the value is not.**

```
6 dishes from [starting_price]
```

currently resolving to **6 dishes from £158**.

- `starting_price` comes from an editable price source. Changing £158 to £165 must not require
  frontend work.
- The wording, casing and placement are canonical copy and not editable.
- The old £95 / 6–12–18 ladder is **obsolete**, not an alternative.
- Price is runtime or edge data, never projected at build time.

Appears in three places on the homepage: the How it works CTA note, the mobile purchase bar, and
the boxes promo when built.

---

## 3. Allergens

**Already designed.** `Abby's Table - Dish Landing v2.dc.html` carries an "Ingredients & allergens"
accordion; the Add Dishes modal repeats it; the footer links to an Allergens page. Each dish record
holds an `allerg` string today.

Production requirements:

- **Controlled values for the 14 regulated allergens** in `allergens_present[]`, not a free-text
  string. The current string is prototype shape only.
- A separate `precautionary_statement` where justified by the kitchen's actual cross-contamination
  risk assessment — not a generic "may contain everything" CMS field.
- One authoritative source feeding **website, ordering and production labels**. Not three
  separately maintained copies.
- Available **before the customer completes purchase**, and again on delivery. UK distance-selling
  requirement.
- Fail-closed on staleness (§ 3k), with the open question of unsellable versus source-render.

The footer Allergens page is linked but does not exist yet.

**Not signed off here.** Legal classification of the meals and packaging determines the exact
labelling obligation and needs confirming with whoever owns food safety.

---

## 3b. Postcode coverage lookup

Powers the Delivery & FAQs checker. Prototype behaviour is a stand-in in three respects.

| Need | Prototype | Production |
|---|---|---|
| Coverage | `NOT_YET` array of outward-code areas in the page | authoritative source is the **courier's coverage**, not us |
| Validation | `PC_RE` format check only | real lookup — a format check cannot tell a real postcode from a well-formed invented one |
| Geolocation | simulated, fills a served postcode | `navigator.geolocation` + a **coordinates-to-postcode lookup**, then the ordinary check |

- The response must distinguish **serves / does not serve / could not check**. The third is a
  technical-failure state with its own wording and a retry, not a "we don't deliver" answer.
- Return a **normalised postcode** for display; the page echoes it back to the customer.
- A successful check hands the postcode to the box builder as `?postcode=…` so the customer is not
  asked twice. Production should carry it in session rather than the query string.
- **Mainland UK only** is stated on the page. Non-mainland exclusions are still to be confirmed
  (§ Open items in `build-handoff.md`).
- Rate limiting and abuse protection are a production concern; the prototype has none.

## 3c. Notify-me capture

Shown only in the not-in-area state. Needs `email` plus the **checked postcode**, so coverage
demand can be measured by area — the postcode is the reason the record is worth keeping. Consent
wording is on the page ("only to tell you when we reach your area"), so this list is **separate
from the newsletter** and must not be merged into it.

## 3d. Delivery charge

**£5.95 per order**, stated in two FAQ answers. A configured value, not literal copy — same
treatment as the box starting price. Must be shown before order completion.

## 3e. Contact form submission

Nothing is wired: the prototype validates, then shows the success state. Production needs

- **submission with a real failure state** — the page has none, so a failed send currently reads as
  a successful one. This is a genuine integration failure and in scope by our own rule.
- **spam protection** that does not add a visible puzzle (honeypot, timing, or an invisible
  challenge). No CAPTCHA on a contact form for a food business.
- **an acknowledgement email** to the sender, since the page promises a reply within two working
  days and the only receipt on screen is a message they cannot revisit.
- **routing by subject.** The six options exist to route; "dish, ingredients or allergens" must
  not land in a general inbox — allergen questions are safety-relevant.
- `order_number` is optional and only collected for an existing order. Never make it required.
- **image attachments** — up to 3, 10MB each, JPG/PNG/HEIC. The client checks type, size and count
  as a courtesy; **the server must enforce all three again**, plus real content-type sniffing (an
  extension proves nothing), virus scanning, and stripping EXIF before anything is stored or
  forwarded — a customer photo can carry GPS coordinates. HEIC needs converting or a viewer,
  since inbox clients often cannot display it.
- Fields: `name`, `email`, `topic` (enum), `order_number?`, `message`, `images[]`. Consent wording is on the
  page: details are used to reply only, so this must **not** be added to the newsletter list.

## 3f. Opening hours

The page shows a computed "Open now / Closed" indicator, so the hours are **data, not copy**:

- one hours table, in **local UK time** (Europe/London, so BST is handled),
- a maintained **bank-holiday** source rather than the hard-coded 2026 list in the prototype,
- a way to record **exceptional closures** — the indicator is worse than useless if it says open
  during an unplanned closure.

## 4. Earliest delivery date

Shown in How it works step 03, and on the **menu page** as "Next deliveries from …". **Computed,
never a stored string** — from the kitchen cut-off time and the delivery lead time, in UK time,
accounting for weekends and holidays. Runtime or edge data.

Awaiting the real lead time from the client; the prototype shows an illustrative date.

On `Abby's Table - Menu Landing v3.dc.html` it arrives through a `nextDelivery` prop, so there is
one value to wire rather than a literal in the template. Two things the copy now commits to:
- The wording is **"Next deliveries from {date}"**, and the strip's note explains the date as the
  next available **cooking run** — limited orders per run. So the value must be the earliest date
  of the next run with capacity, not simply today + lead time.
- The note **no longer mentions postcode**. If available dates do vary by postcode, that is now
  disclosed for the first time in the box builder, which needs checking against how coverage
  actually works (§ 3b).
- The date is customer-visible as a weekday plus a date ("Fri 18 Sep"), so the weekday must be
  derived from the date, never stored alongside it.

---

## 4b. Development-only controls that must not ship

`Abby's Table - Delivery and FAQs.dc.html` exposes a `stateOverride` prop to force any of the
checker's nine states. It exists because several states cannot be triggered without production
services, and it is a **review affordance only** — it must not reach the customer-facing build.
Treat it the same way as `placeholder: true` on dish records: a release gate, not a nice-to-have.

`Abby's Table - Menu Landing v3.dc.html` adds two of the same kind: **`reviewCatalogue`** (repeats
the eight real dish records to 24 or 48 so scroll behaviour can be exercised — it invents no
dishes, it only makes the slug unique) and **`openFilters`** (opens the filter sheet on mount).
Neither may ship. `pageSize` is different: it is a real product decision about how much of the menu
loads at once, and needs a value chosen before launch.

## 4d. Menu filtering and sort

The menu filters and sorts **client-side over the whole dish list** in the prototype. Production
decides whether that stays true or becomes a query; if it becomes a query, these are the
vocabularies it must support, and they are data, not copy:
- **Protein source** — Chicken, Beef, Lamb, Fish, Turkey, Plant-based. One value per dish.
- **Eating style** — Protein-led, Carb-conscious, Plant-led, Mediterranean-inspired. Many per dish.
  **"DASH" also exists in the dish data** and has no chip and no published definition: a customer
  can see it on a card and cannot filter by it. Either publish a definition and add the chip, or
  remove it from the data — it should not stay half-present.
- **Heat** — None / Mild / Medium / Hot, one level per dish, rendered as pips plus the word.
- **Dietary** — Gluten-free, Dairy-free, High in fibre. **"Low sugar" has no field** and currently
  stands in against carbohydrate load; it needs a real flag or it must come off the page.
- **Sort** — Recommended (the list's own order, so the source must have an intentional one),
  Highest protein, Lowest calories.
- The "Under 500 kcal" card tag is **derived from kcal**, not a stored tag — the old page carried it
  on a 520 kcal dish. Do not reintroduce it as content.

## 4c. Box size carried from How it works

`Abby's Table - How It Works v2.dc.html` step 1 has a size picker (6 / 12 / 18 / custom). Every
purchase link on that page — hero CTA, panel CTA, closing CTA and the mobile purchase bar —
carries the choice as **`?dishes=6|12|18|custom`**.

**Choose Box does not read it yet.** Wiring that is the contract: arriving with the parameter must
preselect the matching size, and `custom` must open the custom-quantity state at the six-dish
minimum. An absent or unrecognised value falls back to the page's own default — never an error
state, and never an empty selection.

The parameter is a convenience, not a source of truth: price and availability are resolved by the
box builder, not by what the URL claims.

## 5. What the frontend does not receive

Stated so nobody builds for it. Abby's Table does not have, and these are **not** to be designed:

- sold-out or out-of-stock dishes
- price-unavailable states
- an empty menu
- delivery-unavailable or generic retry screens

Ordinary technical failure handling is normal development resilience, not a design deliverable.

---

## 6. Marketing content

| Content | Owner | Shape |
|---|---|---|
| Founder paragraphs | CMS | repeatable paragraph fields — **not** rich text |
| Standards items | CMS + config | `title`, `description`, `icon_key` from a fixed set |
| Private Table copy and credentials | CMS, controlled claims | credentials require operational approval |
| Navigation | config | one object: `label`, `route`, `order`, `visible` |
| CTA labels | config | canonical, not editable |

---

## Changelog

- **0.5** — adds § 4d (menu filtering and sort vocabularies), extends § 4 with the menu's
  `nextDelivery` value and its cooking-run wording, and lists the menu's two review-only props in
  § 4b. Flags two half-present filter values: "DASH" (in the data, no chip, no definition) and
  "Low sugar" (a chip with no field).
- **0.4** — adds § 4c (box size carried from How it works as `?dishes=`), and records that the
  12 and 18 box prices shown on that page (£306 / £449) and their savings (£10 / £25) are
  placeholders derived from the canonical £158 six-dish price. Only £158 is confirmed.
- **0.3** — adds Contact: form submission, spam protection, acknowledgement email, subject
  routing, and opening hours as data.
- **0.2** — adds Delivery & FAQs: postcode coverage lookup, geolocation, notify-me capture, the
  £5.95 delivery charge, and the development-only state override.
- **0.1** — homepage scope. Dish record, price, allergens, delivery date, marketing content.
  Checkout state, box contents, filtering and gifting are not yet covered.

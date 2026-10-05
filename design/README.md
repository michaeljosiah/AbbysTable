# Abby's Table — start here

A UK direct-to-consumer brand making chef-prepared Nigerian food, cooked in small batches in a
Kent kitchen and delivered chilled. This project holds the **design prototype** for the website
rebuild, plus the documents production works from.

Over 70% of customers shop on mobile. The site is being rebuilt **mobile-first**: the styles with
no media query are the mobile design, and desktop is a separate composition rather than a stretched
version of it.

---

## What is decided

- **The homepage is rebuilt and approved**, section by section, mobile first then desktop: header,
  mobile drawer, hero, How it works, the dishes preview, Our standards, Meet the founder, Private
  Table, footer. The boxes promo and gifting sections were removed from the page. It also carries
  the cookie consent layer as the fixed-UI integration test (see below).
- **Delivery & FAQs is the first non-homepage rebuild** (`Abby's Table - Delivery and FAQs.dc.html`)
  — postcode checker with nine reviewable states, FAQ search, and eight topic groups.
- **Contact is rebuilt** (`Abby's Table - Contact Us.dc.html`) — four contact routes, a validated
  message form with optional image upload, and a computed opening-hours indicator. Its body is a
  single 12-column grid so the hours block can move between the sidebar and the phone card by CSS
  alone.
- **Approved shared components are canonical from that moment** — the header and drawer already
  are. They propagate to other pages only when we reach each page, so the site carries old and new
  versions side by side while it is worked through. That is expected.
- **The menu is rebuilt** (`Abby's Table - Menu Landing v3.dc.html`) — the full dish grid on the
  approved homepage card, with search, filters and sort kept as they behaved before: one bottom
  sheet on a phone, the same markup as an inline panel in the filter card on desktop. It adds a
  delivery-availability strip and a discreet "↑ Top" utility. Named v3 because "v2" was already
  taken by a revision of the old desktop-first page; **every page in the project now links to it**.
- **The rest of the site (dish detail, checkout flow) is designed but not yet rebuilt.**
  Those pages are desktop-first and still on the old layout shell.
- **Allergens is rebuilt** (`Abby's Table - Allergens.dc.html`) — the UK regulated 14 as a plain
  list, the cross-contamination statement, and a sidebar that reorders on mobile. All of its safety
  copy is placeholder pending sign-off.
- **Terms of Sale is rebuilt** (`Abby's Table - Terms of Sale.dc.html`) — 56 clauses in eight
  groups, with a grouped index that is a sticky column on desktop and a bottom sheet on mobile. The
  copy is a working draft awaiting solicitor review.
- **Privacy Policy is rebuilt** (`Abby's Table - Privacy Policy.dc.html`) — 11 numbered sections in
  four groups, sharing Terms' index, deep-linking and print treatment. Copy is a working draft
  awaiting legal review, and carries visible "to be confirmed" marks for the 21 values that must
  come from the production setup rather than from us.
- **The cookie consent manager is built and approved** (mobile and desktop), and lives on Privacy
  Policy as its canonical source. It is **deliberately not propagated**: in production it is one
  component mounted once globally, so copying it across six prototype pages would create drift for
  an architecture the build does not use. Homepage v2 carries a second copy purely as an
  integration test — the one page where the banner meets the mobile purchase bar and the
  auto-hiding header. Every other page carries only the trigger, an anchor that falls back to the
  Privacy cookie section. **`build-handoff.md` § 3s is the production contract** and § 3t explains
  the decision; § 3s is the single most important section in the handoff, because a banner that
  sets tags before consent is a compliance failure rather than a visual defect.
- **`export/`** holds standalone single-file versions of the rebuilt pages, for sharing outside
  this project. Regenerate them after any change — and read `build-handoff.md` § 3n first, because
  runtime-assigned images and video have to be inlined by hand.

## What is not decided

Open items are listed at the end of `build-handoff.md`. The ones that block launch rather than
build: real photography, the reheat time, one-off versus subscription, delivery cost and
non-mainland exclusions, and reconciling the funnel to the £158 pricing model.

---

## Which document to read

| Document | Audience | What it is |
|---|---|---|
| **README.md** | everyone | this page |
| **CLAUDE.md** | design | the terse, checkable rules — breakpoints, token values, the button ladder, canonical copy, component approval status |
| **build-handoff.md** | frontend + backend | the working record: what each section decided and why, what the prototype does not define, open items |
| **frontend-backend-contract.md** | frontend + backend | the data passing between them — dish records, price, allergens, delivery dates. Versioned |
| **photography-shot-list.md** | client + photographer | the running shoot brief: crops, ratios, negative space, what is missing |

`build-handoff.md` is currently the main handoff. A clean per-page frontend document is written at
each page's approval; the homepage's is produced once its remaining sections are in, at which point
`build-handoff.md` becomes the archive rather than the working document.

---

## Three things to know before reading further

**The prototype defines look, copy and behaviour — not the rendering architecture.** These pages
render client-side because that is what makes them editable in this tool. Production should
server-render or statically render marketing content. Techniques that exist only because of the
prototype are marked as such; do not port them.

**All photography and video is AI-generated placeholder.** Every image will be reshot. Dish records
carry `placeholder: true`, and shipping one is a hard build failure by design.

**The bound design system is Abby's Table**, at `_ds/`. Colours, type and spacing come from its
tokens. Six page-local token declarations override or extend it and are listed for migration in
`build-handoff.md` § 3g.

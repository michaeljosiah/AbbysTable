# Abby's Table

> **Nigerian food, the way it deserves to be made.**
> High-quality ingredients. Flavour built from real food, not additives. Nutrition-led and made from
> scratch for your table.

Chef-prepared Nigerian meals — personalised, cooked from scratch in small batches, and delivered
chilled to mainland UK. Founded by **Esther Abby Josiah**.

---

## Status

Two routes are built and running in [`web/`](web/) — Next.js 15 App Router, React 19, TypeScript,
CSS Modules, with design tokens that started as a port of the original template (bringing them up to
the v2 design in [`design/`](design/) is #9):

- **`/`** — the v2 homepage: hero, How it works, the dish rail, Our standards, Meet the founder and
  Private Table.
- **`/menu`** — the full catalogue: search, six filter facets (protein, spice, wellness goal, meal
  type, dietary, calories), removable active-filter chips, and "load more" pagination. The facet
  logic is a pure module in [`web/src/lib/menu/filters.ts`](web/src/lib/menu/filters.ts).
- **`/menu/[slug]`** — the dish page, statically generated for every dish: personaliser (portion,
  protein, side, heat, with live surcharge), nutrition, ingredients and allergens, reheating
  guidance, and related dishes. Signature dishes get their badges and upgrade price from the same
  `isSignature` flag — the two dish-detail templates are one page, not two.
- **`/terms-of-sale`** and **`/privacy`** — the legal documents, each one continuous document with a
  grouped index (sticky column on desktop, bottom sheet on a phone). Section slugs are a public
  contract ([`web/src/lib/legal/`](web/src/lib/legal/)); company details come from
  [`web/src/lib/content/company.ts`](web/src/lib/content/company.ts) and print "to be confirmed"
  until set. Opened from checkout's legal line (`?from=checkout`, a new tab), each shows "← Back
  to checkout" above its h1 ([`web/src/lib/legal/checkoutReturn.ts`](web/src/lib/legal/checkoutReturn.ts)).
- **`/contact`** — Contact us: WhatsApp, email and phone cards, opening hours with an "Open now /
  Closed" indicator, and the message form, in one 12-column grid. Details and hours come from
  [`web/src/lib/content/contact.ts`](web/src/lib/content/contact.ts) and print "to be confirmed"
  until set; the form sends to Aonik's enquiry endpoint in live mode (aonik#356) and is held back
  in demo. Rules in
  [`web/src/lib/contact/`](web/src/lib/contact/).
- **`/delivery-and-faqs`** — the postcode checker (shown only where a coverage lookup exists: the
  demo fixtures, or live, Aonik's coverage endpoint, aonik#352) and the FAQs: live search and eight
  topic groups. Prices in the answers come from the storefront config; a served postcode is handed
  to the box builder in session storage, never a URL
  ([`web/src/lib/delivery/`](web/src/lib/delivery/), spec
  [`delivery-and-faqs.md`](docs/specifications/delivery-and-faqs.md)).
- **`/private-table`** — Abby's Private Table: the navy "Coming soon" hero with the credentials,
  Who it's for, the two services (from £1,500 / from £1,780, content constants awaiting the
  owner), How it works and "Register your interest". A **waitlist, not a booking**: the form
  (with a typeahead over a fixed country list), every "Join the waitlist" and the mobile bar
  appear only once Aonik can store an entry (aonik#357); until then the page says the waitlist
  isn't open yet ([`web/src/lib/private-table/`](web/src/lib/private-table/)).

> **Allergens are never inferred.** Only dishes whose data the templates actually published carry
> ingredient and allergen text; every other dish shows an explicit "not yet published" notice
> pointing to contact. Do not populate those fields from anything but the real catalogue.

Commerce data (dishes, box pricing, delivery dates) will come from the **Aonik** admin API. Until
that exists, everything resolves through a typed client seam
([`web/src/lib/aonik/`](web/src/lib/aonik/)) backed by fixtures — no component knows the difference,
and no price or date is hardcoded in markup.

This repository is also an [Arke](AGENTS.md) spec-driven workspace: work is authored as markdown
specifications in [docs/specifications/](docs/specifications/), reviewed, then implemented.
**The design source of truth is [`design/README.md`](design/README.md)** (the v2 design). The
templates in `docs/template/` are the originals and are **superseded**; the homepage anatomy below
is the v2 homepage `web/` renders. See [CLAUDE.md](CLAUDE.md) for conventions and known scaffold
drift.

### Running the site

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

`npm run build` · `npm start` · `npm run lint` · `npm run typecheck`

To point at a real Aonik instance, set `AONIK_API_URL` (and `AONIK_API_KEY`). Both are server-only —
the storefront calls Aonik from Server Components, so the credential never reaches the browser.

---

## The product

### Brand standards

Four prohibitions are the core positioning (Our Standards' hero lists them; the homepage's Our
standards band summarises that page):

**No seed oils · No bouillon or cubes · No MSG · No refined sugars**

> *Flavour built from real food and natural ingredients.*

### Founder story

After more than a decade cooking Nigerian food for some of Britain's finest tables through
**Mrs J Foods** and **Béllé-Full**, a devastating diagnosis changed everything. Remission became a
reason to rethink and relearn the food she loved — and that journey became Abby's Table.

### Offer

Prices and rules change in [`design/`](design/), not here — see `design/README.md`,
`design/CLAUDE.md` ("Business rules") and `design/frontend-backend-contract.md`.

| Product | Price | Notes |
|---|---|---|
| Box | **6 dishes from £158** | Any size from 6 to 99 dishes; 6 / 12 / 18 presets. Only the six-dish price is confirmed; it comes from an editable price source, never a literal |
| Signature dishes | menu supplement | Counts as one box dish; the supplement is added on top |
| Gift box | — | A food box sent to a recipient, from the Gifting page. Separate from Abby's Table Gift Cards |
| Abby's Private Table | from £1,500; with meal preparation from £1,780 (both unverified) | **Coming soon — a waitlist, not a booking.** Recipe development worldwide; recipes cooked for you UK-wide |

Delivery is **chilled, never frozen**, to mainland UK, on a date the customer chooses at checkout.
Delivery cost and non-mainland exclusions are still open. The £150 main box and £78 Taster Box are
not part of v2, and the £95 / £170 / £240 box prices are obsolete; `web/` still shows £95 until
the funnel is reconciled.

**Abby's Private Table** is the premium service: bespoke Nigerian-inspired recipe collections
developed under registered-nutritionist oversight to the guidelines a client's clinical team has
set, then returned to that team for sign-off. Its credentials are regulated claims that must be
substantiated before launch (`design/build-handoff.md`, open items).

---

## Homepage anatomy

The v2 homepage (`design/Abby's Table - Homepage v2.dc.html`, #15), in its canonical order — the
order is load-bearing, because the mobile purchase bar is suppressed from Private Table's top to
the end of the page (`design/build-handoff.md`, "Homepage section order"). The boxes promo and
gifting bands are removed, not pending. Anchor ids are kept for the nav's `/#…` targets.

| # | Section | `id` | Ground | Purpose |
|---|---|---|---|---|
| 1 | Hero | `top` | One photograph + feathered green-deep overlay | "Nigerian Fusion Food. Nutrition at the Core.", three facts, *View the menu* (the bar's reveal point), *How it works →*. |
| 2 | How it works | `howitworks` | `--cream` | Steps 01–04, *Build a Box* and "Minimum 6 dishes · From £158" (desktop; the bar carries both on a phone), *Learn more →*, the looping clip. **No delivery date.** |
| 3 | A taste of the table | `menu` | `--cream` | The featured dish rail, *View the full menu*. |
| 4 | Our standards | `standards` | `--sage` | Four standards with marks, *View our standards*. |
| 5 | Meet the founder | `founder` | `--blush` | Portrait, Abby's story in short, *Read Abby's story*. |
| 6 | Abby's Private Table | `private` | `--navy` | Reach rows, credentials, "Private Table from £1,500". *Find out more* → `/private-table` (#25). |

The header, drawer and footer are the site chrome (#10, "Site chrome" below), not homepage bands;
the announcement bar is gone site-wide.

**How it works** — the four steps: **Build a box** (minimum order from the box plan; choose meals and
portion size) → **We cook from scratch** → **Delivered chilled** (choose your Mainland UK delivery
date) → **Heat, enjoy, live well** (ready in minutes).

### Site chrome (v2 — built, #10)

**Header:** wordmark · Menu · How it works · Abby's Story · Gifting (once its page lands) · Private
Table · Log in (My Account when signed in) · a **GET STARTED** pill to `/box`, which reads **VIEW
BOX** while a box is active. No strapline. Below 1024 the links move into a burger-opened drawer
(wordmark + close, Log in / My Account, the links, a full-width **BUILD A BOX** pill — VIEW BOX
while a box is active — and the socials). The header hides on a
downward scroll on a phone; from 1024 it hides (40px down, back after 64px up) on the marketing
pages only — not on dish pages, Allergens, legal, account or checkout.

**Footer:** *Shop* (Menu, Gifting once built, Private Table) · *Learn* (Abby's Story, How it works, Our
standards) · *Information* (Delivery & FAQs, Allergens, Contact us) — accordions on a phone, open
columns from 1024 — then the wordmark, "Abby x", the four social icons with **@FromAbbysTable** as
plain text, and the legal strip: © · Privacy Policy | Terms · Cookie preferences.

Gifting (#26) is not built yet and stays out of the chrome until its page lands; Private Table goes
to its page (`/private-table`, #25) — from one place, `web/src/lib/content/navigation.ts`. Every
"contact us" in the pages reads `CONTACT_HREF` (`/contact`) and every Delivery & FAQs link
`DELIVERY_FAQS_HREF` (`/delivery-and-faqs`) from there too, so each page's arrival was a one-line
change. The homepage band's *Find out more* reads the same destination (`PRIVATE_TABLE_HREF`).

---

## Content model

The menu is driven by a `DISHES` array. Each dish:

```js
{
  image, title, description,
  cat,                        // filter category
  heat,                       // "low" | "medium" | "high"  -> 1..3 pips
  tags: [],                   // "New" (brass) | "Under 500 kcal" (cream)
  signature: true,            // adds Signature badge + banner
  upgrade: "+£4 upgrade",
  protein: 38, fibre: 8,      // default to 32g / 9g when absent
  personalise: true,
  pers: ["portion","protein","sides","heat"],
}
```

**Filters:** `Featured dishes` (all) · `Carb-conscious` · `Protein-led` · `Plant-led` ·
`Everyday balance`.

**Current dishes** (placeholder data — six dishes share only three images):

| Dish | Category | Heat | Flags |
|---|---|---|---|
| Wild rice, goat efo | Protein-led | medium | New, Under 500 kcal |
| Ata Dindin Lamb Shank | Protein-led | high | **Signature**, +£4, 38g protein |
| Fish peppersoup bone broth | Everyday balance | high | — |
| Suya salmon, kale, quinoa | Plant-led | low | Under 500 kcal |
| Suya ribeye, jollof, asparagus | Protein-led | high | New |
| Slow-braised egusi, spinach, wild rice, plantain | Everyday balance | medium | — |

Personalisation strings are generated from `pers` — e.g. `["sides","heat"]` renders
*"Change sides or heat level"*.

---

## Design system

Declared in the template as *"Derived from the homepage Figma"* and exposed as the global
`AbbySTableDesignSystem_c3ba5a`.

### Palette

A warm editorial palette: deep Nigerian greens, brass, terracotta and toasted creams.

| Token | Hex | Role |
|---|---|---|
| `--green-forest` | `#1E3A2F` | Primary brand green — headings, top bar, dark CTAs |
| `--green-deep` | `#15291F` | Darkest — footer ground |
| `--green-mid` | `#456052` | Hairlines on dark |
| `--green-sage` / `--green-mist` | `#8FA096` / `#AEB8B1` | Muted / disabled text |
| `--brass` / `--brass-deep` | `#C28E3C` / `#A9762C` | Eyebrows, rules, accents |
| `--terracotta` / `--terracotta-deep` | `#B8431C` / `#9A3614` | Primary buttons, accent display text |
| `--navy` | `#28365C` | Private Table ground |
| `--cream` / `--cream-2` / `--cream-3` | `#F7F1E8` / `#F7F2E8` / `#FBF8F1` | Page / header / menu grounds |
| `--blush` | `#E9CDB8` | Founder band, text on dark |
| `--sand` / `--sand-2` | `#E0D8C8` / `#D6D0C6` | Card surface, hairlines |
| `--brown` / `--taupe` | `#3B2C22` / `#86755F` | Body / secondary text |

Semantic aliases (`--surface-*`, `--text-*`, `--action-*`, `--border-*`) wrap every raw colour —
**prefer these in components.**

### Typography

| Family | Token | Use |
|---|---|---|
| **Playfair Display** | `--font-display` | Headings — hero 55px, section 48px, promo 40px, card 22px |
| **Cormorant Garamond** | `--font-accent` | Editorial accent line, 28px |
| **Figtree** | `--font-sans` | All UI, body (16/15/13/11px), eyebrows, buttons |

A brand signature is **wide tracking on small uppercase labels** — `0.24em` on eyebrows,
`0.16em` on buttons and nutrition tags, `0.12em` on the announcement bar.

### Space, shape, layout

4px base grid (`--space-1` … `--space-10`, 4→128px). Section rhythm `--section-pad-y: 96px`, page
gutter 80px at 1440. Radii: 12px small, **18px cards**, **24px large media**, 999px pills. Shadows are
warm and restrained. Layout: `--content-max: 1280px` inside `--frame-max: 1440px`.

### Components

| Component | Variants |
|---|---|
| `Button` | `primary`, `outline`, `outline-light`, `outline-brass` · sizes `lg` / `sm` |
| `Eyebrow` | tones `brass`, `blush`, `cream`, `light` |
| `SectionHeading` | levels 1–2, tone `cream`, alignable |
| `NavLink` | active state |
| `FilterPill` | active state |
| `NutritionTag` | coloured dot + label |

---

## Working with the original template

> **Superseded** by the v2 design in [`design/`](design/). Kept for reference to what `web/` was
> built from; take new values from `design/`, not from here.

`docs/template/Homepage.html` is a **~23MB single-file bundle** — do not open it whole.

- **Line 376** — `__bundler/manifest`: UUID → base64 assets. **~22.8MB on one line.** Never read
  or grep it without `cut`.
- **Line 388** — `__bundler/template`: the real source (~150KB), JSON-escaped.

Decode line 388 to a readable file first:

```bash
sed -n '388p' docs/template/Homepage.html > tpl.json
node -e "require('fs').writeFileSync('homepage.html', JSON.parse(require('fs').readFileSync('tpl.json','utf8')))"
```

The decoded page is **React 18.3.1 (UMD, via unpkg)** driving a single class component, with a
mustache-like template layer: `x-import` pulls design-system components from global scope, `sc-for`
iterates, `sc-if` branches, and `{{ }}` binds. Component state covers the menu filter, dish-title
clamping, footer accordions, newsletter submission, drawer, sticky header and top bar.

Responsive breakpoints: 1280 · 1040 · 960 · 768 · 620 · 560 · 520 · 400 · 344, plus
`prefers-reduced-motion`. Accessibility is already wired — `aria-label`, `aria-expanded`,
`aria-controls`, focus rings via `--focus-ring`, and a `<noscript>` fallback.

### Known template caveats

- **`6 August` is hardcoded** in three places (announcement bar, how-it-works, boxes promo). It must
  become a single dynamic value.
- **Dish images are placeholders** — six dishes map onto three assets via `window.__resources`.
- Macro values (`Protein 32g`, `Carbs 18g`, `Fat 18g`, `Calories 520`) are static defaults.
- Social links point at bare `instagram.com` / `tiktok.com` / `facebook.com` / `x.com`.
- Login, Journal, Delivery & FAQs, Allergens and *Read Abby's story* have no destinations yet.

---

## Repository layout

```
README.md                    this file
AGENTS.md                    Arke grounding baseline (regenerated — don't hand-edit)
CLAUDE.md                    conventions, verified state, scaffold drift
.arke/                       coordinator config, plugins, session + trace logs
.opencode/agents/            six agent prompts (spec-author, architect, researcher,
                             implementer, reviewer-a, reviewer-b)
docs/specifications/         source of truth for work — template, README, generated index
docs/template/               original design templates (superseded by design/)
design/                      the v2 design — source of truth; start at design/README.md

web/                         the storefront
  src/app/                   layout (chrome + fonts + metadata), / and /menu routes
  src/components/ui/         design-system primitives — Button, Eyebrow, SectionHeading,
                             NavLink, FilterPill, NutritionTag, HeatPips, FloralMark
  src/components/brand/      Logo (masked SVG), SocialIcons
  src/components/layout/     Header, MobileDrawer, Footer, SiteChrome (the v2 chrome)
  src/components/status/     404 and 500 pages (design: Page Not Found, Something Went Wrong)
  src/components/sections/   the six homepage bands + DishCard
  src/components/menu/       menu browser — toolbar, facet panel, grid, flavour band
  src/components/dish/       dish page — personaliser, info panels, related dishes,
                             the shared add-to-box action and the dish's mobile bar
  src/components/legal/      Terms of Sale / Privacy Policy shell, index, copy blocks
  src/components/contact/    Contact page — the grid, message form, hours disclosure, open/closed
  src/components/purchase-bar/ the mobile purchase bar — band, behaviour, Build a Box / VIEW BOX
  src/lib/aonik/             commerce seam — types, client interface, fixtures
  src/lib/menu/              pure faceting and search logic
  src/lib/purchase-bar/      the bar's visibility rules, offer and active-box summary (pure)
  src/lib/site-header/       when the header hides (per route and width), current page,
                             Log in / My Account, GET STARTED / VIEW BOX (pure)
  src/lib/dom/               <html> state flags (data-overlay-open), their hooks, ghost-click
                             guard, the shared page-scroll direction, the focus trap
  src/lib/content/           navigation, editorial copy, support contact and company
                             details (unset)
  src/lib/legal/             legal documents' sections, groups and anchor contract
  src/lib/contact/           Contact form rules and opening hours in UK time (pure), and the
                             form's server action
  src/lib/status-pages/      generator for the static host pages below
  src/middleware.ts          maintenance mode: MAINTENANCE_MODE=true → 503 for pages and API
  src/styles/tokens.css      design tokens; target is design/ (see #9)
  public/assets/             images, video and logo extracted from the bundle
  public/500.html            self-contained 500 / maintenance pages — GENERATED:
  public/maintenance.html    `UPDATE_STATUS_PAGES=1 npm test` rewrites them. No host
                             serves 500.html on an outage yet (needs a CDN rule)
```

## Contributing

The specification — not the code, not the ticket — is the unit of work. Start from
[`docs/specifications/specification.template.md`](docs/specifications/specification.template.md):
*Why → What changes → Requirements → Design → Tasks*. Requirements use RFC-2119 (“The system
SHALL …”) with `WHEN/THEN/AND` scenarios.

**Definition of done:** all scenarios pass; typecheck and build are green; a reviewer has signed off.

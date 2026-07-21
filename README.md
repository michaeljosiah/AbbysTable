# Abby's Table

> **Nigerian food, the way it deserves to be made.**
> High-quality ingredients. Flavour built from real food, not additives. Nutrition-led and made from
> scratch for your table.

Chef-prepared Nigerian meals — personalised, cooked from scratch in small batches, and delivered
chilled UK-wide. Founded by **Esther Abby Josiah**.

---

## Status

**No application code exists yet.** This repository is an [Arke](AGENTS.md) spec-driven, multi-agent
workspace: work is authored as markdown specifications in [docs/specifications/](docs/specifications/),
reviewed, and only then implemented.

The single product artefact is a bundled homepage design template at
`docs/template/Homepage.html` — a Figma-derived, fully realised homepage with a complete design
system. **This README is reverse-engineered from that template** and documents the product it
describes, so the specs and the eventual implementation have a shared reference.

See [CLAUDE.md](CLAUDE.md) for repository conventions and known scaffold drift.

---

## The product

### Brand standards

Four claims run as a band directly beneath the hero, and they are the core positioning:

**No seed oils · No bouillon or cubes · No MSG · No refined sugars**

> *Flavour built from real food and natural ingredients.*

### Founder story

After more than a decade cooking Nigerian food for some of Britain's finest tables through
**Mrs J Foods** and **Béllé-Full**, a devastating diagnosis changed everything. Remission became a
reason to rethink and relearn the food she loved — and that journey became Abby's Table.

### Offer

| Product | Price | Notes |
|---|---|---|
| Main box | **£150** | Eight chef-prepared dishes |
| Taster Box | **£78** | Four dishes — the entry point for new customers |
| Signature dishes | **+£4** upgrade | Counts as one box dish; upgrade added on top |
| Gift box | — | Built from the same menu, delivered to a recipient |
| Abby's Private Table | Consultation | Bespoke, dietitian-developed collections; **worldwide** |

Delivery is **chilled, never frozen**, UK-wide, with a customer-chosen date at checkout.

**Abby's Private Table** is the premium service: bespoke Nigerian-inspired recipe collections
developed with a registered dietitian to the guidelines a client's clinical team has set, then
returned to that team for sign-off.

---

## Homepage anatomy

Ten sections, top to bottom. Anchor ids are the nav targets.

| # | Section | `id` | Ground | Purpose |
|---|---|---|---|---|
| 0 | Announcement bar | — | `--green-forest` | Batch note + earliest delivery date; social icons. Dismissible. |
| 1 | Header | — | `--cream-2` | Logo (masked SVG + ®), nav, Login, **Order** button. Sticky. |
| 2 | Hero | `top` | Image + green gradient | Headline, sub, *View the menu*, *See how it works*. 590px. |
| 3 | Standards | `standards` | `--cream-2` | The four "no" claims + accent line. |
| 4 | How it works | `howitworks` | `--cream` | 4 numbered steps, delivery date, *Build your box*. |
| 5 | Menu | `menu` | `--cream-3` | Filter pills + horizontal dish-card scroller. |
| 6 | Founder | `founder` | `--blush` | Portrait split, Abby's story, *Read Abby's story*. |
| 7 | Boxes promo | `boxes` | `--green-forest` | £150 headline, delivery date, *Choose your meals*, Taster Box link. |
| 8 | Gifting | `gifting` | `--cream` | Autoplay muted video split, *Build a gift box*. |
| 9 | Private Table | `private` | `--navy` | Dietitian service, *Request a private consultation*. |
| 10 | Footer | `contact` | `--green-deep` | Newsletter, 3 link columns, socials, © 2026. |

**How it works** — the four steps: **Build your box** (personalise portion, protein, side or heat) →
**Cooked from scratch** (small batches, simmered stocks, real spices, no cubes) → **Delivered chilled
UK-wide** (choose a date; packed chilled, never frozen) → **Heat, eat and live well** (fridge to plate
in minutes).

**Navigation:** Menu · How it works · Abby's Boxes · Gifting · Private Table · Our Standards ·
Abby's Story · Contact · Login. Below 1040px this collapses to a burger opening a 286px left drawer,
and the Order button becomes a compact basket pill.

**Footer columns:** *Shop* (Menu, Gifting, Discovery Box, Private Table) · *Learn* (Abby's Story,
Our Standards, Journal) · *Information* (Delivery & FAQs, Contact Us, Allergens). Columns collapse to
accordions on mobile. Newsletter — "Kitchen notes and offers from Abby monthly" — confirms with
*"Thank you for joining the table."* Socials: Instagram, TikTok, Facebook, X — **@FromAbbysTable**.

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

## Working with the template

`docs/template/Homepage.html` is a **29MB single-file bundle** — do not open it whole.

- **Line 376** — `__bundler/manifest`: UUID → base64 assets. **28.9MB on one line.** Never read or
  grep it without `cut`.
- **Line 388** — `__bundler/template`: the real source (~121KB), JSON-escaped.

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
docs/template/Homepage.html  bundled homepage design template (29MB)
```

## Contributing

The specification — not the code, not the ticket — is the unit of work. Start from
[`docs/specifications/specification.template.md`](docs/specifications/specification.template.md):
*Why → What changes → Requirements → Design → Tasks*. Requirements use RFC-2119 (“The system
SHALL …”) with `WHEN/THEN/AND` scenarios.

**Definition of done:** all scenarios pass; typecheck and build are green; a reviewer has signed off.

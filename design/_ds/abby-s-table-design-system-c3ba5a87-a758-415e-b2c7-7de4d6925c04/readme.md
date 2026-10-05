# Abby's Table — Design System

A warm, editorial design system for **Abby's Table**, a UK direct-to-consumer brand making chef-prepared Nigerian food. Meals are cooked in small batches in a Kent kitchen and delivered chilled, UK-wide. The brand is nutrition-led and founder-driven — born from Esther Abby Josiah's journey through a cancer diagnosis and remission, rethinking the food she loved.

The product is a marketing-and-ordering **website**: hero, menu of dishes (filterable by dietary approach — Protein-led, DASH, Plant-led, etc.), founder story, gifting, a premium "Private Table" dietitian service, and a footer with newsletter signup.

## Sources
- **Figma:** "Abby's Table Latest 2.fig" — a single page, `Homepage - desktop` (1440px wide). This is the sole source of truth. There were **no formal Figma component sets**; the component library here was derived from the repeating patterns on that page.
- Extracted assets live in `assets/` (logo, hero, founder, two dish photos).

---

## Content fundamentals

**Voice — warm, plainspoken, confident, never salesy.** The brand talks about food and care, not "products." Sentences are short and declarative, often fragments used for rhythm: *"New parents. A season of recovery. A busy stretch. Just because."*

- **Person:** Mostly third-person and imperative ("Send a box that says everything", "Build a gift box"). The founder is named and present ("Read Abby's story", signed *"Abby x"*). Occasional warm second person.
- **Casing:** Sentence case for headlines and body. **UPPERCASE only for eyebrows and labels**, always with wide tracking (e.g. `MEET THE FOUNDER`, `WHAT'S ON THE TABLE?`, `A PRIVATE SERVICE`).
- **Defined by negatives — a signature device:** *"No seed oils ⬥ No bouillon or cubes ⬥ No MSG ⬥ No refined sugars."* Standards are stated as what's left out.
- **Concrete & sensory:** "Slow-cooked, deeply seasoned and made from scratch." Real prices stated plainly (£150, £78). Dishes named specifically ("Wild rice, goat efo", "Fish peppersoup bone broth").
- **No emoji** in brand copy. The only non-alphabetic glyph used decoratively is the lozenge **⬥** as a separator and **®** after the wordmark. (The UI kit uses a single 🧺 basket glyph for demo feedback only — not brand copy.)
- **Vibe:** an upscale, health-forward private chef who happens to deliver. Heritage Nigerian cooking treated with fine-dining seriousness.

---

## Visual foundations

**Palette — earthy, restaurant-warm.** Deep Nigerian **forest green** (`#1E3A2F`) is the spine: top bar, headings, dark CTAs, footer. **Brass/gold** (`#C28E3C`) is the precious accent — hairline rules, eyebrows, the Join button. **Terracotta** (`#B45F5A`) is the action/heat color for primary buttons and one accent serif line. A **navy** (`#28365C`) anchors the premium Private Table section. Everything sits on **toasted creams** (`#F7F1E8`, `#FBF8F1`) with **blush** (`#E9CDB8`) and **sand** (`#E0D8C8`) for warmer bands and card panels. See `tokens/colors.css`.

**Type — three families, clear roles.**
- **Playfair Display** (Medium) — display headings, high-contrast serif. 48px section titles, 40px promos, 55px hero, 22px card titles.
- **Figtree** — everything functional: body, nav, buttons, eyebrows, tags. The brand's *signature* is **very wide letter-tracking** on small uppercase text (eyebrows 0.24em; buttons & nutrition tags 0.16em; announcement 0.12em).
- **Cormorant Garamond** (Medium, 28px) — used sparingly for a single editorial flourish line. Playfair *Italic* for the "Abby x" signature.

**Backgrounds & imagery.** Full-bleed warm food photography for the hero (with a left-to-right forest-green **protection gradient** for legibility), and large rounded photo blocks (24px radius) for the founder and gifting. Photography is warm-toned, natural light, appetite-forward. Sections alternate solid color bands (cream → cream-bright → blush → forest green → cream → navy → deep-green footer) to create rhythm — no gradients on UI surfaces, no textures or patterns.

**Shape & elevation.**
- **Radii:** pills are fully rounded (buttons, filter chips, 42px icon buttons); dish cards & photos use 18px; large media blocks 24px.
- **Cards:** the dish card is photo-on-top, sand (`#E0D8C8`) panel below, centered text. Restrained warm shadow (`--shadow-card`) — no harsh elevation.
- **Borders:** 1px hairlines — sand on light grounds, green-mid (`#456052`) on dark. **Brass rules** are a motif: a 3px brass line tops the announcement bar; a 2px brass divider separates the footer.

**Buttons & states.** Primary = terracotta fill, white, semibold. Dark = forest fill. Outline = 1px forest hairline (light) or 1px brass/cream (on dark). Hover darkens the fill / shifts text toward terracotta or blush; links gain a brass underline. Transitions are quick and subtle (~0.16–0.18s ease) — fades and color shifts, **no bounces, no large motion**. Press feedback is a slight color deepen.

**Layout.** 1440px frame, ~1280px content with an 80px (48px in the kit) side gutter. Generous vertical rhythm (~72–96px section padding). Centered compositions for menu/promo/private sections; split 50/50 for founder & gifting.

---

## Iconography

The brand is **near-iconless** by design — typography and color carry the work.

- **Social icons** (Instagram, TikTok, Facebook, X) are the only recurring icons — small (16px) monochrome glyphs in blush on the dark top bar and footer. Recreated as inline SVG in `ui_kits/website/Header.jsx` (`SocialIcons`).
- **Carousel chevrons** — a single arrow vector, used left/right in circular `IconButton`s.
- **Nutrition markers** — small colored **dots** (not icons) preceding macro labels.
- **Separator glyph** — the lozenge **⬥** in the standards line.
- **No icon font, no icon set, no emoji** in the brand UI. If a future surface needs UI icons, use a thin-stroke line set (e.g. Lucide at ~1.5px) in forest green or brass to stay consistent — and flag it, since none exists in the source.

The wordmark (`assets/logo.svg`) paints with `currentColor`, so the `Logo` component recolors one asset for both light (forest) and dark (blush) grounds.

---

## Index / manifest

**Foundations**
- `styles.css` — global entry point (imports only).
- `tokens/colors.css` · `tokens/typography.css` · `tokens/spacing.css` · `tokens/fonts.css`
- `guidelines/*.card.html` — specimen cards (Colors, Type, Spacing, Brand).

**Components** (`window.AbbySTableDesignSystem_c3ba5a.*`)
- `components/core/` — **Button**, **IconButton**, **FilterPill**
- `components/content/` — **Eyebrow**, **SectionHeading**, **NutritionTag**, **DishCard**
- `components/forms/` — **EmailSignup**
- `components/navigation/` — **NavLink**, **TopBar**
- `components/brand/` — **Logo**

Each directory has `<Name>.jsx` + `<Name>.d.ts` + `<Name>.prompt.md` and a `*.card.html` thumbnail.

**UI kits**
- `ui_kits/website/` — interactive recreation of the full homepage (desktop). Open `index.html`.
- `ui_kits/mobile/` — the same site as a mobile app: slide-in nav drawer, bottom tab bar, horizontal dish/filter scrollers, tap press-states. Open `index.html`.

**Assets** (`assets/`)
- `logo.svg` (recolorable wordmark), `hero.png`, `founder.png`, `dish-goat-efo.png`, `dish-fish-peppersoup.png`.

---

## Caveats
- **Fonts** are loaded from Google Fonts (Playfair Display, Cormorant Garamond, Figtree all match the Figma exactly). If you hold licensed binaries, swap the `@import` in `tokens/fonts.css` for local `@font-face`.
- **Imagery** is limited to what the Figma contained: hero, founder, and two dish photos. Some dish cards reuse photography — replace via the `DishCard` `image` prop.

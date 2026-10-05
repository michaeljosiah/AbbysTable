# Abby's Table — photography shot list

Running brief for the photo shoot. Every AI-generated image currently in the design is a
placeholder; this file records what each one has to be replaced with. Updated as each
section is designed.

Status key: **NEEDED** = no usable asset · **PLACEHOLDER** = AI image in place, must be reshot ·
**HAVE** = real asset, no action

---

## 1. Homepage hero — PLACEHOLDER
Two separate crops of the same scene. Served via `<picture>`; do not crop one from the other.

| | Desktop | Mobile |
|---|---|---|
| Aspect | 2:1 landscape | 3:4 portrait |
| Min pixels | **3200 × 1600** (3840 × 1920 preferred) | 1200 × 1600 |
| Dish position | right ~55% of frame | right edge, entering mid-frame, cropped |
| Negative space | left ~45%, empty | upper-left through lower-left, empty |
| Dark ground | **62–65% of frame width** | upper-left through lower-left |

- The hero is one continuous full-bleed photograph at both sizes, with a feathered overlay for the
  copy — **both crops are load-bearing**: 2:1 for desktop, 3:4 for mobile.
- Dark ground must reach **62–65% of the frame width** in both crops. The placeholders manage
  53.2% (landscape) and 57.5% (portrait); more dark ground means a lighter overlay, which means
  the food stays brighter.
- Both crops must be the **same scene, same dish, same lighting** — they swap via `<picture>`,
  so the food must not appear to change when the orientation does.
- The rendered hero is **taller than 3:4 on mobile** (~620px at 390px wide, and free to grow
  with accessibility text). The section ground is `--green-deep`, so the image covers the top
  and flat colour continues below with no visible join — which only works while the photo's
  ground matches the token. Do not shoot on a lighter surface.
- Mobile copy column stays narrower than the clear area rather than scrimming the photo; the
  longest line is "Real ingredients. Real flavour."
- Current placeholders: landscape 1774×887, portrait 1086×1448 (portrait is slightly under the
  3× requirement for a 390pt phone — acceptable as a placeholder only).

- **Ground must be dark and near-neutral-green** — the placeholder measures ~#16281E, which
  is within a hair of `--green-deep` (#15291F). This is load-bearing: a flat green-deep panel
  butts against the photo edge and the seam disappears, which is why the food needs no
  darkening overlay. Shoot on a dark green or near-black surface, not on wood or cream.
- **No overlay is applied to the food.** Light it for appetite: directional, specular
  highlights on the greens and sauces, deep shadow falloff into the negative space.
- Negative space must be genuinely empty — no props, no crumbs, no cloth folds crossing into
  it. Headline type sits there at 40–56px.
- Props in the placeholder that read well: dark ceramic bowl, deep green linen, small bowls
  of chilli relish top-right, scattered spice.
- **Must show a real Abby's Table dish.** The placeholder shows steak with jollof and
  asparagus, which is not on the menu — using it as-is would misrepresent the product
  (ASA/CAP). Pick one of the eight menu dishes and shoot that.

## 2. Dish photography — 5 NEEDED, 3 PLACEHOLDER
Card crop is 4:3, 18px radius, shot from a consistent angle across the set.

- HAVE (reuse, but reshoot for consistency with the set): `dish-goat-efo.png`,
  `dish-fish-peppersoup.png`, `dish-lamb-shank.png`
- NEEDED: Royal Seafood Okra · Suya Salmon, Kale, Quinoa · Jollof Quinoa Bowl ·
  Turkey Ayamase with Greens · Chicken Egusi with Cauliflower Rice
- Currently 5 of 8 cards reuse another dish's photo.

## 2b. How it works clip — PLACEHOLDER
Two crops of one 4-second silent clip, same scene and lighting; they must not appear to change
dish when the orientation does.

| | Desktop | Mobile |
|---|---|---|
| Aspect | 2.4:1 (12:5) | 3:2 |
| Current placeholder | 1200 × 500 | 1080 × 720 |
| Min pixels | 2400 × 1000 | 2160 × 1440 |

- **Loops continuously**, with a pause button in the corner. So the clip must **loop seamlessly**:
  the last frame has to cut back to the first without a visible jump. Shoot it as a move that
  returns to where it started, or hold long enough at each end that the cut is invisible — a
  one-way push will snap on every repeat.
- The opening frame doubles as the poster and the reduced-motion still, so it must stand alone as
  a composed shot. Deliver it as a still matching the video exactly (currently `hiw-poster-*.jpg`).
- A slow reveal, not a fast move. No cuts, no camera shake, no text on screen.
- Must be silent — there is no audio control anywhere in the UI.
- **Cannot ship as-is:** the placeholder's sleeve copy is garbled AI lettering
  ("Tigerl Nermfied Ram", "Emrely arlyf rec wnnrifnnch") and the dish shown, "Jollof Rice with
  Grilled Chicken", is not one of the eight menu dishes — the same ASA/CAP problem as the hero.
  Shoot real packaging with real sleeve copy, showing a dish that is actually on the menu.
- The footage is **packaging and delivery**, not cooking, so it illustrates steps 03–04 rather
  than the whole four-step flow. If we want the "we cook from scratch" step covered visually,
  that is a second clip.
- **Build note:** `<video>` ignores `media` on `<source>`, so the crop is picked once in JS at
  mount. Production still needs both files served conditionally, plus a WebM alongside the MP4.

## 2c. Homepage dish taster — ALL FOUR ARE STAND-INS
The homepage shows four dish cards at 5:4. Only three dish photographs exist
(`dish-goat-efo`, `dish-lamb-shank`, `dish-fish-peppersoup`) and **none of them is of any of the
four dishes shown**, so every record carries `placeholder: true` and each card's alt text
describes the photograph rather than the dish.

| Card | Needs a 5:4 shot of | Currently showing |
|---|---|---|
| 1 | Yaji-Crusted Wild Salmon — seared salmon, jollof quinoa, rainbow salad | goat efo |
| 2 | Surf & Turf Efo Riro Rice — goat, garlic butter prawns, brown basmati, curly kale | lamb shank |
| 3 | Slow-Braised Oxtail Pappardelle — oxtail in ata dindin over pappardelle | fish peppersoup |
| 4 | Pepper Soup Seafood Stew — monkfish, king prawns, mussels, butter beans, fennel | goat efo |
- Crop for the card, not the plate: the bowl should sit central with room at the top, because
  category and NEW pills overlay the top-left corner of the image.

## 2d. How it works page — 4 PLACEHOLDER
All four photographs on `Abby's Table - How It Works v2.dc.html` are AI stand-ins. Source PNGs are
1402×1122 in `assets/` (`hiw-hero`, `hiw-scratch`, `hiw-delivery`, `hiw-heat`); the page loads
JPEG re-encodes at the same pixel size (`hw-*.jpg`). Shoot at **5:4**, 1402px wide or better.

- **Hero — plated dish.** Currently salmon with ofada rice. A dish name is set over the bottom of
  the frame on a dark scrim, so the **bottom third must be uncluttered and tonally dark enough**
  to hold cream text. Whatever dish is shot, the caption copy must be changed to match it.
- **Step 2 — hands, mortar and pestle.** Spices being ground. Same scene family as § 5, but this
  is a different crop and should be shot as its own frame, not cropped from it. Carries the
  "Cooked from scratch" label bottom-centre — same dark-bottom requirement.
- **Step 3 — a packed box.** Insulated box, labelled dishes visible, packaging as it actually
  ships. This is the one shot a customer uses to judge whether the delivery looks credible, so it
  should be the real packaging, not a prop. Carries "Packed safely chilled".
- **Step 4 — eating at home.** A plated dish being eaten, warm domestic light. Carries "Ready when
  you are".

The three step labels sit bottom-centre over a scrim; the hero caption likewise. So **all four
need a calm, darker bottom edge** — brief this into the composition rather than fixing it with a
heavier scrim, which would dull the food.

## 2e. Menu page — 8 CARDS FROM 3 PHOTOGRAPHS
`Abby's Table - Menu Landing v3.dc.html` shows the full menu at the same 5:4 card crop as the
homepage taster. The same three photographs stand in for all eight dishes, so five cards carry a
photo of another dish and every record carries `placeholder: true`; alt text describes the
photograph, not the dish. The dishes still needed are the five listed in § 2.
- The page loads **800px JPEG re-encodes** (`dish-goat-efo-800.jpg`, `dish-lamb-shank-800.jpg`,
  `dish-fish-peppersoup-800.jpg`, 96–119KB) rather than the 1200×896 PNG masters: a card paints
  ~400px at most, so 800 is the displayed size at 2×. Masters stay in `assets/` for the reshoot,
  and the derivatives are regenerated from them whenever the photography is replaced.
- Shoot the set at **1200px wide or better at 5:4** so both the 800px card file and any future
  detail crop come from one master.
- The tag pills (category, NEW, Signature, upgrade) overlay the **top-left** corner and the
  Signature note opens over the image on a phone, so keep the top-left third free of detail that
  matters.

## 3. Abby's Boxes — 2 NEEDED
The two box products have no photography at all. Needs the physical packaging: box open with
meals visible, and a closed/branded shot.

## 3b. Gifting page — 1 PHOTOGRAPH DOING TWO JOBS, 1 NEEDED
`Abby's Table - Gifting v2.dc.html` uses `assets/gifting-box.jpg` (a JPEG copy of the How it works
delivery shot, 1402×1122) in **two places within one scroll**: the "Send a food box" route card
at 16/11, and the food-box section's split at 4/3 on mobile / full panel height from 1024. Signed
off as a holder for now — the duplication is known, not an oversight.

- **Needed: a second box photograph** for the food-box section, so the two are not the same frame.
  The section is about making a box personal, so the natural subject is the box being packed or
  closed — dishes going in, or the lid going on with the greeting card on top.
- Both crops carry no text over them, so neither needs reserved negative space.
- Desktop stretches the section image to the panel's height rather than holding a ratio, so shoot
  it with enough vertical room to crop tall (portrait-ish framing, subject centred).
- The **gift card and the greeting card are rendered previews, not photographs** — brass hairline
  on green-forest, value set from the picker. If they should be shot instead, that is a third
  frame: the printed card held or lying on a table, with the value legible.

## 4. Founder — HAVE
`assets/founder.png`. In use on the homepage founder band and Our story.

## 5. Standards / provenance — HAVE
Mortar-and-pestle image, used on the standards page and the menu page's
"Where the flavour comes from" band. The menu page loads the JPEG re-encode `hw-scratch.jpg`
(shared with How it works), not the `hiw-scratch.png` master — same photograph, and PNG is for
genuine transparency only. **It appears only from 1024 up**: on a phone that band is copy alone,
which is the composition the old page had and the user asked to keep.

---

## General notes for the shoot
- Warm-toned, natural light, appetite-forward. No cool white balance.
- Every image that carries text over it needs deliberate empty space in the composition —
  flag it at the shoot rather than fixing it with an overlay later.
- Supply at 2× the largest rendered size, and tell us the intrinsic dimensions so the
  layout can reserve geometry and avoid layout shift.
- The hero is full-bleed, so the desktop master must cover the widest display without upscaling.
  The current placeholder is 1774px wide and is already soft at 1920 (1.08×), 2560 (1.44×) and 4K
  (2.16×). Deliver **3200px minimum, 3840px preferred**.
- **Build note:** that master must not ship to phones. Production needs `srcset`/`sizes` so a
  375px handset downloads a phone-sized file. The prototype references one file per crop because
  it has no build step — do not carry that into production.

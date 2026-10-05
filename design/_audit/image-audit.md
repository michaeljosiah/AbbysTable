# Image audit — every asset referenced by a live page

Read-only inventory. No changes made.

Displayed widths are derived from each page's layout CSS (390px viewport with 22px gutters; 1440px viewport with the 1280 cap and 48px gutters), ±10%. "Oversize" compares natural width against 2× the mobile display.

| Asset | Format | Size | Natural | Disp 390 | Disp 1440 | Oversize vs 2×mobile | Decoded | Discovery | loading | decoding | fetchpriority | Initial viewport | Shared | Optimised version exists | Pages |
|---|---|--:|---|--:|--:|--:|--:|---|---|---|---|---|---|---|---|
| `hero.png` | PNG | 2531 KB | 1959×803 | 390 | 1440 | 2.5× | 6 MB | CSS | - | — | absent | yes | no | — | Homepage-print-x04o7s |
| `private-table-hero.png` | PNG | 2530 KB | 1275×1234 | 346 | 560 | 1.8× | 6 MB | HTML | eager+hi/eager | — | high | yes | 2 pages | — | Private Table v2, Private Table |
| `hiw-hero.png` | PNG | 2469 KB | 1402×1122 | 346 | 560 | 2× | 6 MB | HTML | eager | — | absent | yes | no | `hw-hero.jpg` | How It Works |
| `hero-mobile.png` | PNG | 2432 KB | 1122×1402 | 390 | — | 1.4× | 6 MB | CSS | - | — | absent | yes | 2 pages | — | Abby's Boxes, How It Works |
| `dish-lamb-shank.png` | PNG | 2391 KB | 1200×896 | 360 | 400 | 1.7× | 4.1 MB | JS | - | — | absent | no | 6 pages | `dish-lamb-shank-800.jpg` | Abby's Boxes, Add Dishes, Extras, Homepage v2, How It Works, Review |
| `hiw-scratch.png` | PNG | 2233 KB | 1402×1122 | 346 | 505 | 2× | 6 MB | HTML | eager | — | absent | no | no | `hw-scratch.jpg` | How It Works |
| `hiw-heat.png` | PNG | 2162 KB | 1402×1122 | 346 | 505 | 2× | 6 MB | HTML | eager | — | absent | no | no | `hw-heat.jpg` | How It Works |
| `hiw-delivery.png` | PNG | 2152 KB | 1402×1122 | 346 | 505 | 2× | 6 MB | JS/HTML | -/eager | — | absent | no | 2 pages | `hw-delivery.jpg` | Abby's Boxes, How It Works |
| `hero-portrait.png` | PNG | 2140 KB | 1086×1448 | 390 | — | 1.4× | 6 MB | HTML | eager | — | absent | yes | no | — | Homepage v2 |
| `hero-landscape.png` | PNG | 2122 KB | 1774×887 | — | 1440 | — | 6 MB | HTML | eager | — | absent | yes | no | — | Homepage v2 |
| `founder.png` | PNG | 1970 KB | 1237×1272 | 346 | 560 | 1.8× | 6 MB | JS/HTML/CSS | -/eager | — | absent | no | 2 pages | — | Homepage v2, Homepage-print-x04o7s |
| `dish-goat-efo.png` | PNG | 1814 KB | 1200×896 | 360 | 400 | 1.7× | 4.1 MB | JS/HTML | -/eager | — | absent | no | 9 pages | `dish-goat-efo-800.jpg` | Abby's Boxes, Add Dishes, Choose Box, Dish Landing, Extras, Homepage v2, Homepage-print-x04o7s, How It Works, Review |
| `dish-fish-peppersoup.png` | PNG | 1634 KB | 1200×896 | 360 | 400 | 1.7× | 4.1 MB | JS/HTML | -/eager | — | absent | no | 9 pages | `dish-fish-peppersoup-800.jpg` | Abby's Boxes, Add Dishes, Choose Box, Dish Landing, Extras, Homepage v2, Homepage-print-x04o7s, How It Works, Review |
| `hw-hero.jpg` | JPEG | 299 KB | 1402×1122 | 346 | 560 | 2× | 6 MB | HTML | eager+hi | — | high | yes | no | — | How It Works v2 |
| `hw-scratch.jpg` | JPEG | 260 KB | 1402×1122 | 346 | 505 | 2× | 6 MB | HTML | lazy | — | absent | no | 2 pages | — | How It Works v2, Menu Landing v3 |
| `std2-nutrition.jpg` | JPEG | 258 KB | 1200×906 | 346 | 505 | 1.7× | 4.1 MB | HTML | lazy | — | absent | no | no | — | Standards v2 |
| `hw-heat.jpg` | JPEG | 227 KB | 1402×1122 | 346 | 505 | 2× | 6 MB | HTML | lazy | — | absent | no | no | — | How It Works v2 |
| `std2-ingredients.jpg` | JPEG | 210 KB | 1200×900 | 346 | 505 | 1.7× | 4.1 MB | HTML | lazy | — | absent | no | no | — | Standards v2 |
| `std2-hero.jpg` | JPEG | 206 KB | 1200×895 | 346 | 500 | 1.7× | 4.1 MB | HTML | eager+hi | — | high | yes | no | — | Standards v2 |
| `std2-spices.jpg` | JPEG | 191 KB | 1200×960 | 346 | 505 | 1.7× | 4.4 MB | HTML | lazy | — | absent | no | no | — | Standards v2 |
| `story-hero.jpg` | JPEG | 189 KB | 1400×788 | 390 | 700 | 1.8× | 4.2 MB | HTML | eager+hi | — | high | yes | no | — | Abby's Story v2 |
| `story-video-still.jpg` | JPEG | 189 KB | 1400×788 | 346 | 560 | 2× | 4.2 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `story-chapter-02.jpg` | JPEG | 188 KB | 900×673 | 346 | 505 | 1.3× | 2.3 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `gifting-box.jpg` | JPEG | 179 KB | 1402×1122 | 346 | 600 | 2× | 6 MB | HTML | lazy | — | absent | no | no | — | Gifting v2 |
| `hw-delivery.jpg` | JPEG | 179 KB | 1402×1122 | 346 | 505 | 2× | 6 MB | HTML | lazy | — | absent | no | no | — | How It Works v2 |
| `story-chapter-01.jpg` | JPEG | 178 KB | 900×720 | 346 | 505 | 1.3× | 2.5 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `story-diagnosis.jpg` | JPEG | 165 KB | 1200×960 | 346 | 505 | 1.7× | 4.4 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `bellefull-logo-sm.png` | PNG | 162 KB | 700×196 | 120 | 140 | 2.9× | 0.5 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `story-chapter-03.jpg` | JPEG | 161 KB | 900×673 | 346 | 505 | 1.3× | 2.3 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `dish-goat-efo-800.jpg` | JPEG | 125 KB | 800×597 | 360 | 400 | 1.1× | 1.8 MB | HTML/JS | lazy/- | — | absent | no | no | — | Menu Landing v3 |
| `std2-delivery.jpg` | JPEG | 121 KB | 1200×960 | 346 | 505 | 1.7× | 4.4 MB | HTML | lazy | — | absent | no | no | — | Standards v2 |
| `dish-lamb-shank-800.jpg` | JPEG | 120 KB | 800×597 | 360 | 400 | 1.1× | 1.8 MB | JS | - | — | absent | no | no | — | Menu Landing v3 |
| `polaroid-jollof-bowls.jpg` | JPEG | 118 KB | 600×750 | 150 | 190 | 2× | 1.7 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `hiw-poster-mobile.jpg` | JPEG | 117 KB | 1080×720 | 346 | — | 1.6× | 3 MB | JS | - | — | absent | no | no | — | Homepage v2 |
| `polaroid-bf-pouches.jpg` | JPEG | 113 KB | 600×750 | 150 | 190 | 2× | 1.7 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `cert-cnm.jpg` | JPEG | 113 KB | 800×566 | 200 | 240 | 2× | 1.7 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `polaroid-mrsj-menu.jpg` | JPEG | 104 KB | 600×750 | 150 | 190 | 2× | 1.7 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `dish-fish-peppersoup-800.jpg` | JPEG | 102 KB | 800×597 | 360 | 400 | 1.1× | 1.8 MB | JS | - | — | absent | no | no | — | Menu Landing v3 |
| `hiw-poster-desktop.jpg` | JPEG | 101 KB | 1200×500 | — | 1010 | — | 2.3 MB | JS | - | — | absent | no | no | — | Homepage v2 |
| `polaroid-bf-boxes.jpg` | JPEG | 93 KB | 600×696 | 150 | 190 | 2× | 1.6 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `cert-harvard.jpg` | JPEG | 80 KB | 800×618 | 200 | 240 | 2× | 1.9 MB | HTML | lazy | — | absent | no | no | — | Abby's Story v2 |
| `floral-monogram-gold.png` | PNG | 60 KB | 329×382 | 64 | 96 | 2.6× | 0.5 MB | HTML | eager/lazy | — | absent | no | 6 pages | — | Abby's Boxes, Add Dishes, Dish Landing, Menu Landing v3, Private Table, Review |
| `mrsj-logo.png` | PNG | 44 KB | 610×280 | 140 | 160 | 2.2× | 0.7 MB | HTML | eager | — | absent | no | no | — | Abby's Story v2 |
| `floral-monogram.png` | PNG | 39 KB | 329×382 | 64 | 96 | 2.6× | 0.5 MB | HTML | eager | — | absent | no | 2 pages | — | Homepage-print-x04o7s, Private Table |
| `whatsapp-qr-placeholder.png` | PNG | 14 KB | 528×528 | 160 | 160 | 1.7× | 1.1 MB | HTML | eager | — | absent | no | no | — | Contact Us |
| `favicon-180.png` | PNG | 5 KB | 180×180 | 0 | 0 | — | 0.1 MB | JS | - | — | absent | no | 11 pages | — | Abby's Boxes, Add Dishes, Checkout, Choose Box, Dish Landing, Extras, Homepage-print-x04o7s, How It Works, Private Table, Review, Standards v2 |

## Bytes competing at first render vs. full scroll

"Initial render" counts every image the browser starts fetching without waiting for scroll — eager `<img>`, CSS backgrounds, and JS-assigned sources (which begin after mount). It is not a viewport measurement; a non-lazy image three screens down still competes.

| Page | Initial render | Full scroll | Images |
|---|--:|--:|--:|
| How It Works | **16.9 MB** | 16.9 MB | 9 |
| Homepage v2 | **12 MB** | 12 MB | 8 |
| Abby's Boxes | **10.2 MB** | 10.2 MB | 7 |
| Add Dishes | **5.8 MB** | 5.8 MB | 5 |
| Review | **5.8 MB** | 5.8 MB | 5 |
| Extras | **5.7 MB** | 5.7 MB | 4 |
| Dish Landing | **3.4 MB** | 3.4 MB | 4 |
| Choose Box | **3.4 MB** | 3.4 MB | 3 |
| Private Table | **2.6 MB** | 2.6 MB | 4 |
| Private Table v2 | **2.5 MB** | 2.5 MB | 1 |
| Menu Landing v3 | **0.3 MB** | 0.7 MB | 5 |
| How It Works v2 | **0.3 MB** | 0.9 MB | 4 |
| Abby's Story v2 | **0.2 MB** | 1.9 MB | 14 |
| Standards v2 | **0.2 MB** | 1 MB | 6 |
| Contact Us | **0 MB** | 0 MB | 1 |
| Checkout | **0 MB** | 0 MB | 1 |
| Gifting v2 | **0 MB** | 0.2 MB | 1 |

## decoding / fetchpriority, as found

| Asset | decoding | fetchpriority |
|---|---|---|
| `bellefull-logo-sm.png` | async | absent |
| `cert-cnm.jpg` | async | absent |
| `cert-harvard.jpg` | async | absent |
| `dish-fish-peppersoup-800.jpg` | absent | absent |
| `dish-fish-peppersoup.png` | absent | absent |
| `dish-goat-efo-800.jpg` | async/absent | absent |
| `dish-goat-efo.png` | absent | absent |
| `dish-lamb-shank-800.jpg` | absent | absent |
| `dish-lamb-shank.png` | absent | absent |
| `favicon-180.png` | absent | absent |
| `floral-monogram-gold.png` | absent/async | absent |
| `floral-monogram.png` | absent | absent |
| `founder.png` | absent | absent |
| `gifting-box.jpg` | async | absent |
| `hero-landscape.png` | absent | absent |
| `hero-mobile.png` | absent | absent |
| `hero-portrait.png` | absent | absent |
| `hiw-delivery.png` | absent | absent |
| `hiw-heat.png` | absent | absent |
| `hiw-hero.png` | absent | absent |
| `hiw-poster-desktop.jpg` | absent | absent |
| `hiw-poster-mobile.jpg` | absent | absent |
| `hiw-scratch.png` | absent | absent |
| `hw-delivery.jpg` | async | absent |
| `hw-heat.jpg` | async | absent |
| `hw-hero.jpg` | async | high |
| `hw-scratch.jpg` | async | absent |
| `mrsj-logo.png` | absent | absent |
| `polaroid-bf-boxes.jpg` | async | absent |
| `polaroid-bf-pouches.jpg` | async | absent |
| `polaroid-jollof-bowls.jpg` | async | absent |
| `polaroid-mrsj-menu.jpg` | async | absent |
| `private-table-hero.png` | async/absent | high/absent |
| `std2-delivery.jpg` | async | absent |
| `std2-hero.jpg` | async | high |
| `std2-ingredients.jpg` | async | absent |
| `std2-nutrition.jpg` | async | absent |
| `std2-spices.jpg` | async | absent |
| `story-chapter-01.jpg` | async | absent |
| `story-chapter-02.jpg` | async | absent |
| `story-chapter-03.jpg` | async | absent |
| `story-diagnosis.jpg` | async | absent |
| `story-hero.jpg` | async | high |
| `story-video-still.jpg` | async | absent |
| `whatsapp-qr-placeholder.png` | absent | absent |

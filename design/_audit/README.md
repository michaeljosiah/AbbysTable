# Choose Box — layout regression harness

`_audit/compare.html` compares two versions of a page by measurement rather than by eye. It was
built to police a mobile-first refactor of Step 1; that refactor was **declined** (see CLAUDE.md,
Choose Box v2 — "Architectural exception"), so the harness is retained for **future regression
testing** of any change to this page.

It takes two file paths: a frozen baseline and the version under test. `BASE` points at
**`Abby's Table - Choose Box v2 - baseline 2026-09-28.dc.html`** (project root, so its relative
paths resolve), frozen after the Undo / rail / 1024 breakpoint / "Secure checkout" round. `NEXT`
points at the live page. Until the live page changes, a run must report **zero** differences —
that is the self-test. After a change is approved, re-freeze the baseline from the approved page.
The baseline shares the live page's `at-*.js` modules, so a change to a shared module shows up in
both and will NOT be caught here; test those on the pages that load them.

Both documents are loaded in a real `<iframe>` at each width, so media queries evaluate against a
genuine viewport — you cannot simulate a breakpoint by resizing a container. The same
layout-critical properties are then read from both and only the differences are reported.

## Running it

Open `_audit/compare.html`. It runs one width by default (390). Use the hash to choose:

- `#w=390` — a single width
- `#w=320,430` — a list
- `#w=all` — the full matrix (nine widths; several minutes)

Progress and the verdict appear in the header; the full result is on `window.__audit`
(`.summary`, `.diffs`).

## What it measures

**Widths:** 320, 375, 390, 430, 640, 768, 1024, 1280, 1440.

**States** (a default page proves nothing about a sheet, an error or a drawer):
`default` · `box-selected` · `postcode-checked` · `est-note-open` · `sheet-open` (below 1024)
· `drawer-open` · `drawer-error`.

**Properties:** geometry, box model, flex/grid, type and the visual properties that can move a
layout — not every property the engine exposes. Browser-computed noise is deliberately excluded;
the goal is to catch geometry and type changes, not to diff resolved shorthands.

Elements are matched by structural path, so the two documents line up without ids. A CSS-only
refactor must not change structure — a missing key is therefore itself a finding.

## Noise control (learned the hard way)

Three things produced false differences before they were handled, and all three will come back if
removed:

1. **Measuring before the tokens resolve** reports every token colour as `rgb(0, 0, 0)`. The
   harness waits for the body background to become a real colour.
2. **Measuring mid-transition** records interpolated colours and offsets. The harness injects a
   stylesheet disabling all transitions and animations before reading. We compare settled states.
3. **Reading rects and styles interleaved** forces a layout per element and made the page
   unresponsive. Rects are collected first, styles second, yielding every 150 elements.

**Noise floor: 0 differences** across all seven states at 320, 375 and 390px with both constants
pointing at the same file. Re-establish that floor after changing the harness — a harness that
reports differences against an identical file cannot be trusted to report real ones.

## Other checks in this folder

- **`head-check.html`** — the document head standard (CLAUDE.md). Reads every page in
  `live-pages.json` as source and reports any page missing the first-paint background or a shared
  stylesheet, loading one only through `<helmet>`, or loading it in both. Run it after any
  whole-page rewrite and in every final audit; add a page to `live-pages.json` when it goes live.


## reorder-check.html
Drives Add Dishes v2 with My Account's `?reorder=` hand-off: dishes land, under-6 sits in a 6-dish box, portions carry, reload never adds twice, merging into a box in progress takes the EXACT count and combines same dish + portion, Undo restores the pre-merge box, a hand-off past 99 is ignored. Saves and restores this tab's order records. 11 checks, all passing 4 Oct 2026. Run it after any change to step 2 or My Account's Order again.


## export-logo-check.html
Opens every file in `export/` and checks the wordmark: the expected number of `<at-wordmark>` elements, each drawn as inline SVG filling its box, coloured, `aria-hidden` + `focusable="false"`, no element still using a CSS mask, and no request for `logo.svg` or `at-logo.js` (proof the file is self-contained). `?from=N&to=M` runs a slice. 33/33 passing 4 Oct 2026. Run it after regenerating exports.


## desktop-header-check.html
Drives the 9 marketing pages at 1024×768, 1280×800, 1440×900 and 1920×1080 through slow wheel, trackpad-style 1–3px jitter, sub-threshold reversals, repeated reversals, fast jumps, keyboard focus in the header and the return to the top; then checks 5 non-marketing control pages are unchanged and the 9 pages' mobile header logic still works at 390. Dispatches one scroll event per step (the preview frame coalesces native ones). Run in batches. All passing 5 Oct 2026.

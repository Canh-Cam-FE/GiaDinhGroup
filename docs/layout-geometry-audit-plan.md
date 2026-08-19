# Layout Geometry Audit — Implementation Plan

> Supersedes [Visual Layout Confirmation](./visual-layout-confirmation-plan.md).
> That brief proposed diffing a per-page Figma PNG against a screenshot. This
> plan replaces the reference image with the geometry already present in
> `json/{slug}.json`.

## Goal

Give the coding agent a deterministic, numeric answer to "is the layout I built
the layout the Figma JSON describes?" — expressed as per-node deltas it can act
on (`gap 24px, expected 32px`), not as a pixel-mismatch percentage.

## Non-goals

- The audit never becomes an authority for `ty`, `fi`, `tx`, component mapping,
  or design tokens. Those stay owned by `json/system-design.json`,
  `generated/agent-lookup.json`, and the typography contract.
- The audit does not judge aesthetics, color, or responsive breakpoints other
  than the design base width.
- No screenshots, no image comparison, no thresholds requiring calibration.

## Why not reference-image pixel diffing

Recorded so this is not re-litigated:

1. **No references exist and nothing produces them.** There is no `images/`
   directory, and `extract.mjs` only reads `figma/figma-targets.json`. Nothing
   binds a PNG to the `meta.at` of the JSON it was exported from, so a
   re-extract silently invalidates every reference.
2. **The pages are not deterministic renderers.** `dist/*.html` loads fonts from
   `fonts.googleapis.com` at runtime. Offline CI blocks on every page; online CI
   gets version-drifting binaries per user agent.
3. **Full-page diffs cascade.** Figma artboards are fixed-height; HTML height is
   emergent from Vietnamese text wrapping. One extra wrapped line near the top
   shifts everything below it, so the diff reports the last sections as worst
   while the actual defect is the first one. A 2px positional tolerance does not
   absorb a cumulative vertical shift.
4. **The data does not support it.** Across page JSON, ~98% of nodes carry
   `b.width`/`b.height` (home 290/295, about 3846/3865) but almost none carry
   `b.x`/`b.y` (home 15/295). The JSON describes *relative* boxes, gaps, and
   padding. That is what should be checked.

## Authority and matching model

**JSON is the expectation; the DOM is the observation.** The audit reads
`json/{slug}.json` and measures the built page. It never writes to `json/`
page files and never emits CSS.

**Matching must be anchor-based, not 1:1.** `automation/agent-rules/05-layout-geometry.md`
explicitly forbids redundant `.wrap` / `.inner` wrappers, so a correct page has
*fewer* elements than the JSON has nodes. Any exhaustive node-to-element walk
will produce false failures by design. Match only on stable anchors:

| Anchor | JSON side | DOM side |
| ------ | --------- | -------- |
| Section root | `meta.moduleRegions[].sectionClass` | `section.{sectionClass}` |
| Text box | node `tx` (normalized, same normalization as `typography-audit.mjs`) | element whose trimmed text matches |
| Container | nearest JSON ancestor with `al` that contains ≥2 matched anchors | nearest common ancestor element of those anchors |

A frame whose only job is to nest another frame has no element of its own — rule
05 collapses it — so its anchors resolve one level too deep and it takes the
parent element instead. That bubbling is allowed only for single-child frames;
any other collision is a real missing level and reports `STRUCTURE_COLLAPSED`.

**Component instances are half-transparent.** Rule 04 turns Figma instances into
mixins (`+btn1`, `+newsItem`), so their internal frames are not authored in the
module and are never checked. Their *text* stays visible for anchor matching,
because the agent may have written the card inline. This matters more than it
sounds: on `home`, 31 of `tin-tuc`'s 32 text nodes live inside instances, so
treating instances as fully opaque would erase almost all coverage, and treating
them as fully transparent would flag mixin internals the module cannot fix.

---

## Phase 0 — Static geometry lint (zero dependencies) — **shipped**

Runs in the same style as the existing audits — no browser, no binaries, no
network — and catches the most common agent errors.

**Script:** `automation/scripts/layout-geometry-audit.mjs`
**Command:** `npm run audit:layout` / `npm run audit:layout:page -- --page home`

### Inputs

- `json/{slug}.json` — `meta.moduleRegions` and `tree`.
- `src/modules/{slug}/{folder}/index.pug` and `index.sass`.
- `styles/tailwind.min.css` (same file `typography-audit.mjs` already reads).
- `automation/config/layout-rules.json` — `designBaseWidthPx: 1920`,
  `rootFontSizePx: 19.2`.

### Checks

| Code | Severity | Condition |
| ---- | -------- | --------- |
| `REGION_NOT_IMPLEMENTED` | HIGH | Module is still the scaffold (≤6 elements, ≤1 matched anchor) while Figma has ≥3 text nodes, ≥3 auto-layout frames, or ≥2 component instances |
| `GAP_MISSING` | HIGH | JSON container has `al.itemSpacing > 0` and ≥2 layout children; matched element declares no `gap` |
| `GAP_MISMATCH` | HIGH | Declared gap resolves to a different px value than `al.itemSpacing` |
| `PADDING_MISMATCH` | HIGH | Declared padding does not resolve to `al.padding`; one issue per element listing every wrong side |
| `AXIS_MISMATCH` | BLOCKER | `al.layoutMode` is `HORIZONTAL` but no row/flex-row (or grid) is declared, or vice versa |
| `ALIGN_AXIS_SWAP` | BLOCKER | Figma's primary/counter alignment landed on the wrong CSS axis — the swap called out in rule `05` |
| `ALIGN_MISMATCH` | HIGH | The right axis carries an explicitly different value than Figma's |
| `STRUCTURE_COLLAPSED` | HIGH | Two Figma frames with distinct gap/padding resolve to one Pug element — a nesting level is missing |
| `WIDTH_UNCONSTRAINED` | INFO | JSON node is `layoutSizingHorizontal: FIXED` with `b.width < 1920` but no `max-w` / `w-` / column class is declared |
| `ABSOLUTE_NODE_UNHANDLED` | HIGH | JSON node has `b.x`/`b.y` inside its parent's box and no `al` (floating overlay) but the module declares no `relative`/`absolute` pairing |
| `FIXED_PX_OFFSET` | HIGH | An `absolute` child uses a raw px offset instead of `clamp:` / `%`, contradicting rule `05` |

Two guards keep these quiet when the JSON says nothing useful. Alignment is only
checked on an axis whose `layoutSizing*` is not `HUG`, because a content-sized
axis has no free space for alignment to act on. Horizontal padding is only
checked on frames narrower than 1500px, since full-bleed sections get theirs
from `.container*`, which lives outside the module.

`STRUCTURE_COLLAPSED` is what keeps a single defect from cascading. When a Figma
frame's anchors resolve to an element another frame already owns, the audit
reports that one structural fact and stops checking outer frames, rather than
re-attributing every ancestor by one level and emitting a dozen bogus gap and
padding errors. Collapsing one wrapper in the test fixture went from 14 issues
to 2. Frames skipped this way are listed in `skipped` so the gap in coverage is
visible rather than silent.

Resolution of a utility class to px reuses the fluid math in
`tailwind.config.js`: at 1920 the `clamp()` max arm applies and `1rem = 19.2px`,
so **Figma px maps 1:1 to CSS px at the design base width**. Assert that
mapping once at startup rather than re-deriving it per check.

### Output

`json/layout-geometry-audit.json`, matching the existing report shape:

```json
{
  "generatedAt": "…",
  "cssFile": "styles/tailwind.min.css",
  "designBaseWidthPx": 1920,
  "pages": [
    {
      "pageSlug": "home",
      "status": "WARN",
      "regions": 9,
      "anchorsMatched": 41,
      "anchorsUnmatched": 3,
      "issueCount": 5,
      "issues": [
        {
          "severity": "HIGH",
          "code": "GAP_MISMATCH",
          "region": "tin-tuc",
          "node": "Frame 1000004375",
          "expected": { "itemSpacing": 32 },
          "found": { "gap": 24, "from": "gap-6" },
          "pugFile": "src/modules/home/tin-tuc/index.pug",
          "pugLine": 12,
          "message": "…",
          "fix": "Replace gap-6 with clamp:gap-[32] on .list"
        }
      ]
    }
  ]
}
```

Statuses follow `module-structure-audit.mjs`: `PASS` / `WARN` / `FAIL` / `SKIP`,
`FAIL` when any BLOCKER is present, exit 1 on `FAIL`.

### Wiring (done)

1. `"layout-geometry-audit.json"` added to `SKIP_PAGE_JSON_FILES` in
   `automation/scripts/page-json-skip.mjs`.
2. `package.json` gained `audit:layout`, `audit:layout:page`, and `ci:layout`.
3. `buildAuditFeedback(pageSlug)` in `agent-compiler.js` now iterates
   `AUDIT_REPORTS` instead of reading only `json/typography-audit.json`, so
   `{{AUDIT_FEEDBACK}}` carries typography *and* geometry issues, each under its
   own command heading, sharing the 30-item budget.

A `--page` run merges into the existing report instead of replacing it. The
compiler reads this file per page, and a page-scoped run would otherwise delete
every other page's feedback. `--page` is parsed with `lastIndexOf` because
`npm run audit:layout:page -- --page home` passes the flag twice.

---

## Phase 1 — Rendered geometry audit (headless measurement)

Only build this if Phase 0's residual false-negative rate justifies it. It
catches what static analysis cannot: text wrapping, overflow, real line counts,
and computed values from cascade interactions.

**Dependency:** `puppeteer-core` driving an already-installed Chrome via
`CHROME_PATH`. Do **not** add `puppeteer` or `playwright`: `node_modules` is
committed to this repo (20,906 of 21,373 tracked files), so a bundled browser
download would land in git history.

### Capture rules specific to this repo

- Load `dist/{slug}.html` over `file://` — `dist` uses relative `./css/` paths,
  so no local server and no port conflict with `npm start`. Home resolves to
  `dist/index.html`.
- Viewport width **1920** (`layout-rules.designBaseWidthPx`),
  `deviceScaleFactor: 1`. Any other width invalidates the 1:1 px mapping.
- JavaScript must run: `src/js/modules/viewport.js` sets `--scrollbar-width`,
  which every `clamp:` utility depends on via `--design-vw`. Suppressing JS
  silently shifts every fluid value.
- Pre-flight guard: assert `getComputedStyle(document.documentElement).fontSize`
  is `19.2px` and `--scrollbar-width` is set. Abort with a BLOCKER otherwise —
  a wrong root font size makes every delta meaningless.
- Pre-flight guard: assert the resolved font family on a known heading is the
  expected family, not a fallback. **Prerequisite:** self-host the Google Fonts
  families currently loaded from `fonts.googleapis.com` in the page `head`, or
  this guard fails in offline CI.
- Await `document.fonts.ready` and image decode, then inject
  `* { animation: none !important; transition: none !important; }` **after**
  measurement-critical layout has settled — and never inject anything that
  changes `transform`, since transforms participate in layout here.
- Scroll through the page once to trigger lazy content, then return to top.

### Measurement

A single `page.evaluate` returns, per matched anchor: `getBoundingClientRect()`
relative to **its section root** (never the document), plus computed `gap`,
`padding`, `display`, `flex-direction`, `justify-content`, `align-items`.
Never compare absolute page Y — that is the cascade trap from the old plan.

### Tolerances

| Quantity | Tolerance |
| -------- | --------- |
| Width | ±2px, or ±0.5% of section width, whichever is larger |
| Gap / padding | ±1px (these come from discrete utilities) |
| Element height | ±2px |
| Section height | ±1.5% (text wrapping is legitimate) |
| Absolute page position | not compared |

### Additional checks

| Code | Severity | Condition |
| ---- | -------- | --------- |
| `RENDER_GAP_MISMATCH` | HIGH | Computed gap ≠ `al.itemSpacing` beyond tolerance |
| `RENDER_WIDTH_MISMATCH` | HIGH | Measured box width ≠ `b.width` beyond tolerance |
| `TEXT_WRAP_DRIFT` | HIGH | Text anchor renders on more lines than `b.height / lineHeight` implies |
| `OVERFLOW_X` | BLOCKER | `scrollWidth > clientWidth` on any section root |
| `COLLECTION_COUNT` | HIGH | Matched container child count ≠ JSON sibling count |
| `FONT_FALLBACK` | BLOCKER | Resolved family is not the expected family |
| `ROOT_FONT_DRIFT` | BLOCKER | `1rem ≠ 19.2px` at 1920 |

Results merge into the same `json/layout-geometry-audit.json` with a
`"measured": true` flag on the page entry, so the compiler integration needs no
second code path.

---

## Page pipeline after this lands

```bash
npm run tokens:check
npm run prod
npm run audit:modules:page -- --page home
npm run audit:typography:page -- --page home
npm run audit:layout:page -- --page home
npm run agent            # injects all three reports as {{AUDIT_FEEDBACK}}
```

Agent loop: implement → audit → fix the highest-severity geometry issue → rerun.
Stop after three runs with an unchanged issue set and report the blocker rather
than inventing offsets.

## Edge cases this design must handle

- **Page JSON missing a region's modules** — `SKIP` that region, do not fail;
  `module-structure-audit` already owns the missing-folder failure.
- **Text anchor appears more than once** (repeated labels, carousel duplicates)
  — match all occurrences, compare against the first, and downgrade to INFO if
  the count differs, since Swiper clones loop slides.
- **Text is dynamic** (`each` loops, interpolation) — reuse the
  `TX_DYNAMIC_POSSIBLE` logic from `typography-audit.mjs` and skip the anchor
  rather than reporting a phantom mismatch.
- **Placeholder assets during early coding** — missing images are INFO, never a
  blocker. The audit must stay usable on a half-built page; that is the phase it
  exists for.
- **Absolute/floating nodes** — checked for the `relative`/`absolute` pairing and
  the `clamp:` offset rule, not for measured position.
- **`about.json` scale** (3,865 nodes) — cap anchors per region and record
  `anchorsUnmatched` so coverage is visible instead of silently partial.
- **Non-page JSON** — continue using `isPageJsonFile` from `page-json-skip.mjs`.
- **No `.gitignore` in this repo** — Phase 1 writes no artifacts; if any are
  added later, create a `.gitignore` first.

## Acceptance criteria

Phase 0 was verified by implementing `src/modules/home/lien-he/` faithfully
against its region JSON, confirming a clean pass, then mutating one thing at a
time and restoring the scaffold afterwards.

| # | Criterion | Result |
| - | --------- | ------ |
| 1 | Runs with no new dependencies and writes `json/layout-geometry-audit.json` | ✅ |
| 2 | A faithful implementation reports zero issues | ✅ |
| 3 | `clamp:gap-[40]` → `gap-6` yields exactly one `GAP_MISMATCH` (24px vs 40px) | ✅ |
| 4 | Dropping `clamp:p-[40]` yields one `PADDING_MISMATCH` listing all four sides | ✅ |
| 5 | Dropping `flex-col` yields one `AXIS_MISMATCH` | ✅ |
| 6 | `justify-center` → `items-center` yields one `ALIGN_AXIS_SWAP` | ✅ |
| 7 | `justify-center` → `justify-end` yields one `ALIGN_MISMATCH` | ✅ |
| 8 | Collapsing a needed wrapper yields `STRUCTURE_COLLAPSED` + the inner gap error, not a cascade | ✅ (2 issues, was 14) |
| 9 | `npm run agent` shows typography and geometry issues in one `{{AUDIT_FEEDBACK}}` block | ✅ |

Still to prove, once a module is genuinely built: that a correct page reports
`PASS` rather than `SKIP`, and that `ABSOLUTE_NODE_UNHANDLED` and
`FIXED_PX_OFFSET` fire on real overlay markup. No current page exercises either.

Phase 1 adds one more: abort with a clear BLOCKER when the root font size is not
19.2px or a font falls back.

## Sequence

1. ~~Anchor matcher + region walker~~ — done.
2. ~~Gap, padding, and axis checks over Pug + Sass~~ — done.
3. ~~Alignment-axis and absolute-node checks~~ — done.
4. ~~Report writer, `page-json-skip` entry, npm scripts~~ — done.
5. ~~Generalize `buildAuditFeedback` to multiple reports~~ — done.
6. Calibrate on real modules. Every region on all six pages is still a scaffold,
   so the only code firing today is `REGION_NOT_IMPLEMENTED` (27 across 6 pages).
   The property checks cannot be calibrated against production markup until at
   least one page is built.
7. Phase 1 rendered measurement, gated on Phase 0 coverage being trustworthy.
8. CI target once local results are stable.

## Current baseline

```text
Layout geometry audit: 0 pass, 6 warn, 0 fail (27 issues)
  about: WARN — 10/44 anchors matched — REGION_NOT_IMPLEMENTED×8
  home: WARN — 7/31 anchors matched — REGION_NOT_IMPLEMENTED×6
  projects-detail: WARN — 5/23 anchors matched — REGION_NOT_IMPLEMENTED×4
  projects: WARN — 3/10 anchors matched — REGION_NOT_IMPLEMENTED×3
  services-detail: WARN — 6/22 anchors matched — REGION_NOT_IMPLEMENTED×5
  sustainability: WARN — 5/9 anchors matched — REGION_NOT_IMPLEMENTED×1
```

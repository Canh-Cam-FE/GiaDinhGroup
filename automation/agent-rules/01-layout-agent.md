# Coding Rules — Figma JSON → Pug / Sass Production Compiler

> **Audience:** Coding agents translating Figma into production code for this project.
> **Stack:** Pug, Sass (`.sass`), Tailwind CSS 3, Vanilla JS (ES modules).
> **Architecture:** Semantic HTML, section root classes + generic nested children (`.wrap`, `.box`, `.inner`, `.media`, `.panel`), fluid sizing (`clamp:` / `rem:` / `ratio:` / `r()`).
> **Role:** Expert Frontend Engineering Agent — Figma design-system artifacts → production code.
> **Scope:** This is the entry point for layout compilation from page JSON into Pug / Sass production modules. It runs **every time** a section is compiled. Deep-dive mapping tables live in the numbered files listed in §D — read this file first, then jump to only the files your current task needs.

This document has no "legacy repository scan" content — it is the **target standard for new work only**. If you are editing an existing module, preserve its current public structure unless the task explicitly says to refactor it.

---

## A. Absolute rules (read first — never violate)

**Environment**

- Never upgrade, downgrade, or modify project dependencies or `package.json` versions (`gulp`, `tailwindcss`, `sass`, or any JS tooling). Unapproved bumps cause layout regressions and break the build pipeline.
- Never generate, patch, or alter `tailwind.config.js`, `json/system-design.json`, `tokens/*`, or `generated/*`. Token sync is `npm run extract` then `npm run tokens`. Report a missing token — never patch one inline.
- Never edit `tailwind.config.js` without first reading `json/system-design.json`.
- Start layout compilation only after the user has run `npm run extract` (and `npm run tokens` if generated artifacts are stale).

**Source of truth**

- **Page content:** `json/{page}.json` is authoritative for structure, `ty`, `fi`, and `tx`.
- **Design facts:** `json/system-design.json` is the Figma export dictionary (styles, fonts, spacing).
- **Resolved class/tag/stem:** `generated/agent-lookup.json` (injected as `TYPOGRAPHY_TABLE` / `DESIGN_LOOKUP`) is authoritative for `ty` → `{ class, tag }` and `fi` → Tailwind stem — never guess these from screenshots or prior pages.
- Images under `images/{page}/{section}.jpg` (confirm actual path with team) are layout/spacing hints only, checked **after** JSON mapping is done — never use a JPG to override `ty`, `fi`, or `tx`, to guess a heading size, to pick a color, or to rewrite copy text.
- Read `tx` from page JSON and use it as literal copy — never rewrite text from a screenshot.

**Typography**

- Never use responsive text utilities in Pug (`md:text-xl`) — use `.heading-*` / `.heading-serif-*` / `.body-*` only (see `02-typography.md`).
- Never put `.heading-*` / `.heading-serif-*` on anything but `h1`–`h4` or `span`. Never put `.desc` / `.zone-desc` on `p`, and never nest `p` inside them (single-line or multi-line — always `div`).
- Never wrap an icon-font glyph (`font: icon|icon2|icon3`, or `ty` containing `Font Awesome`) in `.body-*` / `.heading-*`.

**Colors & fills**

- Never use raw hex in markup (`text-[#…]`, `bg-[#…]`) — this includes gradient hex hacks.
- Never assign a solid `bg-{color}` / `text-{color}` utility to a `Gradient/*` fill. Gradients are implemented once, in Sass or via a `bg-gradient-*` macro — see `03-colors-gradients.md` for the full rule (this is the only place gradients are explained).
- Never pick a color from memory or a prior page — re-scan `DESIGN_LOOKUP` / `json/system-design.json` first (after `npm run tokens`).

**Layout & markup**

- Never exceed **6** Tailwind utility classes on one element — overflow goes to the module's `index.sass`.
- Never use `px` for layout spacing (except 1–2px borders) — use `rem:` / `clamp:` / the spacing scale.
- Never use inline `style=""`.
- Never use BEM (`__`, `--`) and never repeat the section-root name on a child selector.
- Never name a custom Sass child class after a Tailwind utility — `@apply` inside a class with the same name crashes Tailwind with a circular-dependency error. **Banned as custom Sass child class names:** `.grid`, `.flex`, `.block`, `.inline`, `.hidden`, `.visible`, `.relative`, `.absolute`, `.fixed`, `.sticky`, `.container`, `.table`, `.overflow-hidden`. Use `.list`, `.item-grid`, `.layer`, `.float`, `.stack`, `.shell`, etc. instead.
- Never duplicate an existing mixin or component — scan `src/modules/mixin.pug` / `src/components/` first.
- Never put page styles in `src/core/` — use the module's own `index.sass`.

**JavaScript**

- Never bind interactivity to a presentational CSS class — use `data-js-target` / `data-js-action` / other `data-js-*` hooks. Legacy `data-type` markup already wired to `src/js/modules/ui.js` is read-only; don't extend that pattern in new code.

---

## B. Inputs (source of truth)

| # | Artifact | Use |
| - | -------- | --- |
| 1 | `json/system-design.json` | **Immutable static dictionary.** Read-only reference for `tokens.styles`, `tokens.fontFamilies`, `tokens.spacing`. Never regenerate or modify. |
| 2 | `json/{page}.json` | Structural layout tree: sections, `b` (bounds), `al` (auto-layout), `fi`, `ty`, `tx`, `ch`. |
| 3 | `generated/agent-lookup.json` | **Authoritative** `ty` → `{ class, tag }` and `fi` → Tailwind stem — injected as `DESIGN_LOOKUP` / `TYPOGRAPHY_TABLE` at compile time. |
| 4 | `generated/design-tokens.js` / `generated/typography.js` | Theme colors + typography component classes consumed by `tailwind.config.js`. |
| 5 | `tailwind.config.js` | Theme colors, font sizes, gradients, spacing (wired to generated artifacts). |
| 6 | `src/modules/mixin.pug` | Reusable mixins — scan before inventing components. |
| 7 | `images/{page}/{section}.jpg` (confirm path with team) | Visual layout hint only — spacing/composition check after JSON mapping. Never a source of `ty`, `fi`, or `tx`. |

Design-system tokens: `json/system-design.json` → DesignTokenIR (`npm run tokens`) → `generated/*`. Page content: `json/{page}.json` (each page references `"system": "system-design.json"` in `meta`).

| Page | JSON file |
| ---- | --------- |
| Homepage | `json/home.json` |

Agent manifest (workflow, components, radius): `src/core/design-system/manifest.json`.
Agent structural contract (folder layout — use instead of the legacy `home/` monolith): `automation/reference/page-contract.json` + `automation/reference/snippets/`.
Token sync: `npm run extract` then `npm run tokens` (writes `tokens/*` + `generated/*`).

---

## C. Workflow

### Step 0 — Gather inputs

1. Open `json/{page}.json`. Confirm `meta.system` → `system-design.json`.
2. Walk `tree` → section frames; for each node read `ty`, `fi`, `tx`, `b` (width/height), `al` (auto-layout, padding, gaps).
3. Read `src/core/design-system/manifest.json` for component/layout patterns.
4. Read the injected `TYPOGRAPHY_TABLE` (from `generated/agent-lookup.json`) — confirm each `ty` resolves to `cssClass` + `html` tag.
5. Scan `src/modules/mixin.pug`, `src/components/`, and existing `src/modules/{page}/` — **reuse before creating**.
6. Map every text node and fill **before** looking at any JPG (see §D for the mapping-table files).

### Step 1 — Plan module scope

| Figma | Project path |
| ----- | ------------ |
| Page | `src/pages/{slug}.pug` |
| Top-level section frame | `src/modules/{page}/{section}/index.pug` + `index.sass` |
| Global component / section | `src/modules/global/{section}/index.pug` + `index.sass` |
| Reusable component / instance | `src/modules/mixin.pug` or `src/components/{name}/` |

Check `tree` for repeated section patterns (cards, tabs, sliders) before inventing new structures.

**Section root syntax (mandatory for new pages):** every module `index.pug` must use exactly one root element with class `section.{page}-{section}` (e.g. `section.home-hero`, `section.gioithieu-hero`). This is the canonical root structure — do not invent alternate root class patterns for new work. See `automation/reference/page-contract.json`.

### Step 2 — Build the token mapping (handoff artifact — write this down before coding)

- **TEXT nodes** → resolve `ty` to `cssClass` + `html` tag from `TYPOGRAPHY_TABLE`, or apply the icon exception. Full rule: `02-typography.md`.
- **FILL nodes** → solid → Tailwind color token; `Gradient/*` → Sass/theme macro, never a hex utility. Full rule: `03-colors-gradients.md`.
- **Figma component instances** → mixin lookup, including the mandatory form-detection rule. Full rule: `04-components.md`.
- **Geometry (`b` / `al`)** → grid vs. absolute positioning, fluid sizing. Full rule: `05-layout-geometry.md`.

### Step 3 — Pre-Flight Checklist (planning phase — before any code)

**Your response must begin with the exact heading `### Pre-Flight Verification`, immediately followed by the completed checklist from `10-checklist.md` (the Pre-Flight Checklist — not to be confused with the JSON/breakpoint reference tables in `11-appendix.md`), printed as a completed markdown checklist.** Only output Pug/Sass/JS code blocks after every checklist item is checked. This forces you to verify each rule against the JSON *before* generating code, not after.

Walk every checklist item in `10-checklist.md` against your planned mapping from Steps 0–2. Mark each item `- [x]` or `- [ ]` with a brief note where a item cannot yet be verified.

### Step 4 — Scaffold page & sections

1. `src/pages/{slug}.pug`: `extends _layout.pug`; set `title` and `bodyClass = 'page {slug}-page'`.
2. If the target page is `global`, write to `src/modules/global/{section}/index.pug` instead of `src/modules/{page}/{section}/index.pug`.
3. Each module `index.pug` opens with a single `section.{page}-{section}` root — no alternate root class patterns on new pages.
4. **Shared references** — if a node is `{"t": "SHARED_REF", "ref": "…"}`, do **not** generate markup or a page module for it. Put chrome includes on the **page entry** (`src/pages/{slug}.pug`):

| `ref` value | Action |
| ----------- | ------ |
| `header` | **Skip** — already in `_layout.pug` |
| `footer` | **Skip** — already in `_layout.pug` |
| `top-banner` (or `.top-banner`) | `include ../components/banner/index.pug` |
| `global-breadcrumb` (or `.global-breadcrumb`) | `include ../components/breadcrumb/index.pug` |

Never scaffold `src/modules/{page}/breadcrumb/` for `global-breadcrumb`.

### Step 5 — Write Pug, Sass, and (if needed) JS

Full templates, boilerplate, and DOM-hook rules live in `07-code-templates.md`. In short: one `section.{page}-{section}` root per module; generic nested children only; auto-layout → flex/grid; write JS only for sliders/tabs/accordions, registered via `safeInit()`.

### Step 6 — Visual verification & self-review

1. Render at a **1920px outer browser window width** — this matches the Figma frame per `06-project-structure.md`, not raw `100vw`.
2. Compare against the Figma frame export / reference JPG — overlay or side-by-side, not a glance.
3. Confirm spacing, font sizes, and column widths land within **±2px** of `b.width` / `b.height` / `al.padding` / `al.itemSpacing`. If anything drifts, re-check the `clamp:` / `rem:` / `ratio:` math first — never "eyeball fix" with an arbitrary utility.

---

## D. Where to find detailed rules

| When you are… | Read |
| -------------- | ---- |
| Starting any task | **§A — Absolute rules** (this file) |
| Mapping text nodes to typography classes | `02-typography.md` |
| Mapping fills — solid colors and `Gradient/*` | `03-colors-gradients.md` |
| Mapping a Figma component/instance to a mixin, or detecting a form | `04-components.md` |
| Converting `b` / `al` bounds into grid or absolute-position code | `05-layout-geometry.md` |
| Naming folders/classes, grid scaffold, fluid sizing, viewport math | `06-project-structure.md` |
| Writing the actual Pug/Sass/JS boilerplate | `07-code-templates.md` |
| Images, `picture`, Swiper sliders | `08-media-swiper.md` |
| Planning a homepage-style multi-section page | `09-page-reference.md` |
| Planning phase — running the **Pre-Flight Checklist** before writing code | `10-checklist.md` |
| JSON schema reference, breakpoints, transition utilities (reference tables only — **not** the checklist) | `11-appendix.md` |

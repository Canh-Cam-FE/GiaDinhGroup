# Folder Structure

## Top-Level Tree

```
HTML-Automation/
├── _gulptasks/           # Gulp task modules (one file per concern)
├── automation/           # Figma extract + agent prompt tooling
│   ├── agent-rules/      # Coding rules for layout agents (01-layout-agent.md entry + numbered modules)
│   ├── prompt/           # Agent prompt template (prompt.md)
│   ├── reference/        # Agent structural contract (NOT compiled by Gulp)
│   │   ├── page-contract.json
│   │   └── snippets/     # Canonical split-folder Pug/Sass examples
│   ├── shared-sections.json  # header, footer, banner, breadcrumb refs
│   └── scripts/          # extract.mjs, agent-compiler.js, typography-audit.mjs
├── docs/                 # Project documentation (this folder)
├── figma/                # Raw Figma JSON exports (input to extract)
├── fonts/                # Built font output (mirrored from src/fonts)
├── img/                  # Built image output (mirrored from src/img)
├── json/                 # Extracted page + system design JSON
├── scripts/              # Built JS output mirror (core.min.js, main.min.js)
├── src/                  # All source code
├── styles/               # Built CSS output mirror
├── config.json           # Vendor JS/CSS bundle manifest
├── gulpfile.babel.js     # Gulp entry point
├── package.json
├── tailwind.config.js
├── tokens/               # DesignTokenIR (normalized + resolved bundles)
└── generated/            # Emitted theme / typography / agent-lookup artifacts
```

## `src/` — Source of Truth

```
src/
├── pages/                # Page entry Pug files (compile to dist/*.html)
│   ├── _layout.pug       # Base HTML shell (head, header, footer, scripts)
│   ├── index.pug         # Homepage
│   └── {slug}.pug        # One file per page
├── modules/              # Page sections (primary content blocks)
│   ├── mixin.pug         # Global Pug mixins (buttons, cards, forms, swiper nav)
│   ├── home/             # LEGACY: monolith index.pug + index.sass (do not copy structure)
│   └── {page}/{section}/ # Target: one section root per folder
│       └── index.pug + index.sass
├── components/           # Shared site chrome (not page-specific sections)
│   ├── header/           # header.pug + header.sass
│   ├── footer/           # footer.pug + footer.sass
│   ├── banner/
│   ├── breadcrumb/
│   ├── news/
│   ├── pagination/
│   └── mockup/           # Legacy pattern examples
├── core/                 # Global styles (never page-specific)
│   ├── mixin.sass        # Sass functions/mixins (r, clampSize, img-ratio, etc.)
│   ├── animation-lib/    # Keyframes, hamburger, animation classes
│   ├── design-system/    # Buttons, grid, typography helpers, radius, content
│   ├── tailwind/         # Tailwind engine files (import, preflight, viewport, base)
│   └── utility/          # Cross-cutting utilities (form, modal, swiper, mobile-menu)
├── js/
│   ├── main.js           # App entry — DOMContentLoaded boot sequence
│   ├── utils.js          # Shared helpers ($, $$, safeInit, throttle, debounce)
│   └── modules/          # Feature modules (nav, ui, swiper, scroll, home, etc.)
├── plugins/              # Third-party libraries (jQuery, GSAP, Swiper, lozad, etc.)
├── img/                  # Source images (copied to dist/img + img/)
└── fonts/                # Source fonts (copied to dist/fonts + fonts/)
```

## Folder Purposes

### `src/pages/`

- **Entry points** for HTML generation.
- Each `*.pug` file (except `_*.pug` partials) compiles to one `dist/{name}.html`.
- Pages are thin: they `extends _layout.pug`, set `title` / `bodyClass`, and `include` section modules.

### `src/modules/`

- **Page sections** — the main content area between header and footer.
- Convention: `src/modules/{page-slug}/{section-folder}/index.pug` + `index.sass`.
- Section root class: `{page}-{section}` (e.g. `.goisanpham-ct-hero`).
- **One `section.*` root per `index.pug`** — see `automation/reference/page-contract.json`.
- `mixin.pug` at `src/modules/mixin.pug` holds reusable Pug mixins included via `_layout.pug`.
- **Legacy:** `src/modules/home/index.pug` contains many sections in one file — edit only, do not use as template for new pages.

### `src/components/`

- **Site-wide reusable UI** included from `_layout.pug` or section modules.
- Differs from `modules/` in that components are shared across pages (header, footer, breadcrumb).
- Each component folder typically has `{name}.pug` + `{name}.sass` (or `index.pug` + `index.sass`).

### `src/core/`

- **Global style foundation** — never put page-specific styles here.
- Split into:
  - `design-system/` — buttons, grid, layout, typography Sass, radius, content patterns
  - `tailwind/` — `@tailwind` directives, preflight resets, viewport CSS variables
  - `utility/` — forms, modals, search, mobile menu, swiper helpers
  - `animation-lib/` — motion primitives
  - `mixin.sass` — Sass-level math and layout mixins

### `src/js/`

- **`main.js`** — single bundled entry; imports and initializes all modules via `safeInit()`.
- **`modules/`** — one file per feature domain (nav, ui, swiper, scroll, viewport, home, work, effect, misc, libs, animations).
- **`utils.js`** — shared DOM/timing/boot helpers; modules import from here, not from each other.

### `src/plugins/`

- Vendor libraries loaded **before** `main.min.js` via `config.json` → `core.min.js`.
- Includes jQuery, GSAP, ScrollTrigger, ScrollReveal, Swiper, lozad, counter, Fancybox (from node_modules), etc.
- Some plugins also have companion CSS listed in `config.json` → `core.min.css`.

### `src/img/` and `src/fonts/`

- **Source assets** copied verbatim (no image optimization in current pipeline).
- Images: `src/img/**/*.{svg,png,jpg,jpeg,gif,webp,mp4}` → `dist/img/` + `img/`.
- Fonts: `src/fonts/**` (from `config.json` glob) → `dist/fonts/` + `fonts/`.

## `dist/` — Build Output (not committed)

Generated by Gulp; BrowserSync serves from here.

```
dist/
├── index.html            # From src/pages/index.pug
├── {page}.html
├── css/
│   ├── core.min.css      # Vendor CSS bundle
│   ├── tailwind.min.css  # Tailwind + core styles
│   └── main.min.css      # Component + module Sass
├── js/
│   ├── core.min.js       # Vendor JS bundle
│   └── main.min.js       # App bundle from src/js/main.js
├── img/                  # Copied from src/img
└── fonts/                # Copied from src/fonts
```

## `json/` — Design Data

| File | Role |
|------|------|
| `system-design.json` | Global tokens: typography, colors, spacing (immutable at codegen time) |
| `typography-contract.json` | Canonical `ty` → cssClass + html tag for agent compiler and audits — see [Typography authority chain](./agent-pipeline.md#typography-authority-chain) |
| `typography-audit.json` | Auto-generated typography QA report (`npm run audit:typography`) |
| `module-structure-audit.json` | Auto-generated structure QA report (`npm run audit:modules`) |
| `home.json`, `gioithieu.json`, etc. | Per-page structural trees from Figma (includes `meta.moduleRegions` when extract splits regions) |
| One JSON per planned page slug | Referenced by automation agent |

## `figma/` — Raw Figma Exports

Input to `npm run extract`. Contains `figma-dictionary.json`, `figma-targets.json`, and legacy exports.

## `automation/` — Tooling

| Path | Purpose |
|------|---------|
| `scripts/extract.mjs` | Compresses Figma JSON → `json/`; strips layout chrome; SHARED_REF; `meta.moduleRegions` |
| `scripts/agent-compiler.js` | Builds `agent-coding-prompt.txt` from page JSON + design system |
| `scripts/module-regions.mjs` | C16 region detection + `expandSectionManifest()` (used by extract + agent-compiler) |
| `scripts/scaffold-modules.mjs` | Scaffolds page entry + module folders from `meta.moduleRegions` (`npm run scaffold:modules`) |
| `scripts/scaffold-all-pages.mjs` | Batch scaffold for all page JSONs missing page entries (`npm run scaffold:all`) |
| `scripts/page-json-skip.mjs` | Shared skip list for non-page JSON files (audits, agent, scaffold) |
| `scripts/module-structure-audit.mjs` | Validates manifest ↔ folders ↔ includes (`npm run audit:modules`) |
| `scripts/typography-audit.mjs` | Verifies JSON `ty` → Pug → CSS chain |
| `prompt/prompt.md` | Template with `{{PLACEHOLDERS}}` for agent prompts |
| `agent-rules/01-layout-agent.md` | Rulebook entry point — absolute rules, workflow, router to per-topic modules |
| `agent-rules/02-…-11-…md` | Per-topic modules: typography, colors/gradients, components, layout geometry, project structure, code templates, media/swiper, page reference, checklist, appendix |
| `reference/page-contract.json` | Machine-readable folder/manifest contract for agents |
| `reference/snippets/` | Canonical split-folder examples + gold-standard grid/tabs (injected as `{{REFERENCE_PUG}}`) — see [Reference snippets](./agent-pipeline.md#reference-snippets-reference_pug) |
| `shared-sections.json` | Shared section refs: `header`, `footer`, `top-banner`, `global-breadcrumb` |

`automation/reference/` is **outside** `src/` — Gulp and Tailwind do not compile it. See [Agent Pipeline](./agent-pipeline.md).

## Root Mirror Folders

| Folder | Contents |
|--------|----------|
| `styles/` | `core.min.css`, `tailwind.min.css`, `main.min.css` (+ `.map` sourcemaps) |
| `scripts/` | `core.min.js`, `main.min.js` (+ `.map`) |
| `img/` | Mirror of `dist/img/` |
| `fonts/` | Mirror of `dist/fonts/` |

## `_gulptasks/`

Gulp task implementations imported by `gulpfile.babel.js`:

| File | Task |
|------|------|
| `clean.js` | Delete `dist/` or `dist/img/` |
| `copy.js` | Copy images and fonts |
| `core-js.js` | Concat + terser vendor JS |
| `core-css.js` | Concat + postcss vendor CSS |
| `sass.js` | Tailwind + Sass compilation pipelines |
| `html.js` | Pug → HTML |
| `script.js` | esbuild `devJS` / `prodJS` for `main.js` |
| `watch-shared.js` | Shared BrowserSync + watch globs (`server.js`, `deploy.js`, `copy.js`) |
| `server.js` | BrowserSync + file watchers (dev) |
| `deploy.js` | BrowserSync + watchers + FTP on change |
| `ftp.js` | vinyl-ftp upload to remote theme path |

## Naming Conventions Summary

| Item | Pattern | Example |
|------|---------|---------|
| Page file | kebab-case | `cauchuyenkhachhang-ds.pug` |
| Module folder | `{page}/{section}/` | `modules/goisanpham-ct/hero/` |
| Legacy monolith | `{page}/index.pug` only | `modules/home/` (edit-only) |
| Section root class | `{page}-{section}` | `.home-hero`, `.home-about` |
| Body class | `page {slug}-page` | `page home-page` |
| Component folder | `{name}/` | `components/header/` |

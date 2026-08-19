# Developer Workflow

## Prerequisites

- Node.js (compatible with project dependencies — ES modules, Gulp 4)
- npm
- Optional: `.env` file for FTP deploy (`FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `FTP_REMOTE_PATH`)

## Initial Setup

```bash
cd /path/to/HTML-Automation
npm install
npm start
```

This runs the default Gulp task:

1. Cleans and rebuilds `dist/`
2. Starts BrowserSync at **http://localhost:8000** (`open: false` — open the URL manually)
3. Serves compiled pages from `dist/` (e.g. `dist/index.html`)

## Daily Development Loop

### Standard workflow

```
1. Edit source files in src/
2. Gulp watch auto-rebuilds affected artifacts
3. BrowserSync reloads browser (or injects CSS)
4. Verify at 1920px outer window width for pixel-perfect QA
```

### What triggers what

| You edit… | Rebuilds… | Browser |
|-----------|-----------|---------|
| `src/pages/*.pug` or any `src/**/*.pug` | HTML + both Sass bundles | Reload |
| `src/modules/**/*.sass` | `main.min.css` | CSS inject or reload |
| `src/core/**/*.sass` or `tailwind.config.js` | `tailwind.min.css` + `main.min.css` | CSS inject or reload |
| `src/components/**/*.sass` | `main.min.css` | CSS inject or reload |
| `src/js/**/*.js` | `main.min.js` | Reload |
| `config.json` or `src/plugins/**` | `core.min.js` + `core.min.css` | Reload |
| `src/img/**` | Image copy | Reload |

## Available Commands

| Command | When to use |
|---------|-------------|
| `npm start` | Local development with live reload |
| `npm run prod` | Production build (minified CSS, no server) |
| `npm run sync` | Dev + auto FTP upload on every change |
| `npm run extract` | Regenerate `json/` from `figma/` exports |
| `npm run extract:pretty` | Same with formatted JSON output |
| `npm run scaffold:modules <slug>` | Create `src/pages/{slug}.pug` + empty module folders from `meta.moduleRegions` |
| `npm run scaffold:all` | Scaffold all page JSONs missing a page entry (skips `home`, artifacts) |
| `npm run agent` | Generate `agent-coding-prompt.txt` for a page (exits if token audit fails) |
| `npm run audit:typography` | Verify typography chain: JSON `ty` → Pug class → CSS rule |
| `npm run audit:typography:page` | Same, single page (`--page slug`) |
| `npm run audit:modules` | Verify manifest ↔ module folders ↔ page includes |
| `npm run audit:modules:page` | Same, single page (`--page slug`) |
| `npm run ci:typography` | Production build + typography audit (CI gate) |
| `npm run ci:modules` | Production build + module structure audit |
| `gulp sass` | Rebuild CSS only (no HTML/JS/server) |

## Adding a New Page

### Manual approach

1. **Create page entry**

```pug
// src/pages/my-page.pug
extends _layout.pug

block var
  - var title = 'Page Title'
  - var bodyClass = 'page my-page-page'

block main
  include ../modules/my-page/hero/index.pug
  include ../modules/my-page/content/index.pug
```

2. **Create section modules**

```
src/modules/my-page/hero/index.pug
src/modules/my-page/hero/index.sass
src/modules/my-page/content/index.pug
src/modules/my-page/content/index.sass
```

3. **Section root classes:** `.my-page-hero`, `.my-page-content`

4. **Add JS only if needed**

```js
// src/js/modules/my-page.js
export function initMyPage() { ... }

// src/js/main.js
import { initMyPage } from "./modules/my-page";
safeInit(initMyPage, "my-page");
```

5. **Run dev server** — `dist/my-page.html` is generated automatically.

### Figma-driven approach

1. Place raw Figma JSON in `figma/`
2. Run `npm run extract` → outputs `json/{page}.json` + updates `json/system-design.json` (includes `meta.moduleRegions`)
3. *(Optional)* Run `npm run scaffold:modules <slug>` → creates page entry + empty module folder stubs
4. Run `npm run agent` → interactive prompt selects page → generates `agent-coding-prompt.txt` (see [token audit gate](./agent-pipeline.md#token-audit-gate) if it exits with BLOCKER)
5. Feed prompt to coding agent → agent writes `src/pages/` + `src/modules/{page}/{section}/` per [page contract](../automation/reference/page-contract.json)
6. Run `npm start` → verify build
7. Run `npm run audit:modules` → fix manifest / folder / include mismatches
8. Run `npm run audit:typography` → fix BLOCKER/HIGH issues

Full pipeline reference: [Agent Pipeline](./agent-pipeline.md).

## Figma Extract Pipeline

```
figma/figma-dictionary.json (or input dir)
        ↓
automation/scripts/extract.mjs
        ↓
json/system-design.json     ← global tokens (typography, colors, spacing)
json/home.json              ← per-page structural trees
json/gioithieu.json
...
```

Extract script (`extract.mjs`):

- Compresses raw Figma JSON into dense architectural maps
- Strips vector noise, collapses repeat nodes
- **Layout chrome:** removes header/footer INSTANCE subtrees from page JSON
- **SHARED_REF:** converts banner/breadcrumb INSTANCE → include refs
- Reorders section children (breadcrumb first)
- Maps shared sections via `automation/shared-sections.json`
- Creates synthetic `Local/t{size}-{weight}-{lh}-{font}` tokens for unlinked text styles (exact named-style match reuses existing `ty`)

**Rule:** Never hand-edit `json/system-design.json` during coding. Re-run extract if tokens are missing.

## Agent Coding Pipeline

```
npm run agent
        ↓
Select page from json/ directory
        ↓
Token audit (ty/fi/hex) — BLOCKER exits before prompt is written
        ↓
agent-compiler.js fills automation/prompt/prompt.md template
        ↓
Outputs agent-coding-prompt.txt with:
  - REFERENCE_PUG, COMPONENT_MANIFEST, PRE_FLIGHT_CHECKLIST
  - DESIGN_LOOKUP, TYPOGRAPHY_TABLE, SECTION_MANIFEST
  - PAGE_JSON, PAGE_TOKEN_AUDIT, AUDIT_FEEDBACK
  - PAGE_NAME, PAGE_SLUG, GENERATED_AT
        ↓
Coding agent produces Pug + Sass + optional JS
        ↓
npm run audit:modules + audit:typography
```

Agent rules: `automation/agent-rules/01-layout-agent.md`  
Structural contract: `automation/reference/page-contract.json`

**Do not copy `src/modules/home/index.pug` layout** — it is a legacy monolith. Use `automation/reference/snippets/` instead.

## Editing Shared Components

### Header / Footer

Files: `src/components/header/`, `src/components/footer/`

Included from `_layout.pug` — changes apply to all pages.

### Global mixins

File: `src/modules/mixin.pug`

Included via `_layout.pug` → available on every page.

### Design system tokens

1. Update Figma → re-export → `npm run extract`
2. Run `npm run tokens` — rebuilds DesignTokenIR and emits `generated/*`
3. Colors/typography land in `generated/design-tokens.js` + `generated/typography.js` (consumed by `tailwind.config.js`)
4. Rebuild: changes to `tailwind.config.js` trigger full Sass rebuild

## Styling Workflow

### New section

1. Add typography classes in Pug (from design system)
2. Add ≤ 6 layout utilities in Pug
3. Put everything else in `index.sass` under section root
4. Use `clamp:`, `rem:`, `ratio:` for fluid Figma dimensions
5. Test at 1920px, 1024px, and 768px breakpoints (`max-md` / `md` token)

### Debugging CSS

- Sourcemaps available: `styles/*.css.map`
- Tailwind JIT scans Pug + Sass — if class missing, check `tailwind.config.js` content paths
- `@apply` circular dependency → rename conflicting custom class

## JavaScript Workflow

### Add interaction to existing section

1. Check if `ui.js`, `swiper.js`, or `nav.js` already handles the pattern
2. If legacy tab/accordion: match existing DOM contract
3. If new: use `data-js-*` hooks + new module file
4. Register in `main.js` with `safeInit()`

### Debug JS

- Sourcemaps: `scripts/main.min.js.map`
- Set `CONFIG.debug = true` in `utils.js`
- Check `[INIT FAIL]: {name}` in console

## Production Build

```bash
npm run prod
```

Output in `dist/`:

- Minified CSS (cssnano + concentric-css sort)
- Unminified HTML (tab-prettified)
- Minified vendor JS (terser) + minified app JS (`prodJS` — esbuild `minify: true`)

Deploy `dist/` contents to static hosting or use FTP sync.

## FTP Deploy Workflow

`npm run sync` loads `_gulptasks/ftp.js` on first upload. **FTP credentials are required** — the task fails fast if `.env` is missing or incomplete.

1. Copy the template and fill in credentials:

```bash
cp .env.example .env
```

```
FTP_HOST=your-host
FTP_USER=your-user
FTP_PASSWORD=your-password
FTP_REMOTE_PATH=public_html/wp-content/themes/canhcamtheme
```

2. Run:

```bash
npm run sync
```

Uploads changed files from `dist/` after each rebuild. BrowserSync still runs locally.

> `npm start` and `npm run prod` do **not** need `.env` — only `sync` uses FTP.

## QA Checklist

Before considering a page complete:

- [ ] `npm run audit:modules` passes for the page slug
- [ ] Each module folder has exactly one `section.*` root in `index.pug`
- [ ] Page entry uses `include` only (no `section.*` in `src/pages/{slug}.pug`)
- [ ] Renders at `http://localhost:8000/{page}.html`
- [ ] Visual check at **1920px outer browser width**
- [ ] Spacing within ±2px of Figma JSON bounds
- [ ] All text uses design system typography classes
- [ ] No raw hex in markup
- [ ] ≤ 6 Tailwind utilities per element
- [ ] Images have meaningful `alt` and `loading='lazy'`
- [ ] `bodyClass` set correctly
- [ ] Mobile layout at **768px** (`max-md`) and tablet at 1024px
- [ ] Interactive elements work (menu, tabs, sliders if present)
- [ ] No console errors from `[INIT FAIL]`

## Project File Quick Reference

| I need to… | Edit this |
|------------|-----------|
| Change page title/body class | `src/pages/{page}.pug` block var |
| Change site header | `src/components/header/header.pug` + `.sass` |
| Change site footer | `src/components/footer/footer.pug` + `.sass` |
| Add page section | `src/modules/{page}/{section}/index.pug` + `.sass` |
| Add global button style | `src/core/design-system/buttons.sass` |
| Add Tailwind color/token | `tailwind.config.js` (+ extract for design system) |
| Add vendor library | `src/plugins/` + `config.json` js/css arrays |
| Change build steps | `_gulptasks/` + `gulpfile.babel.js` |
| Change breakpoints | `tailwind.config.js` → `theme.screens` |
| Add coding rule for agents | `automation/agent-rules/01-layout-agent.md` |
| Agent folder contract | `automation/reference/page-contract.json` |

## Troubleshooting

### Build fails on Sass

- Check `[sass] file:line:col` warnings in terminal
- `@apply` circular dependency → rename custom class conflicting with Tailwind utility
- Missing file in concat → check glob in `_gulptasks/sass.js`

### Tailwind class not generated

- Class must appear in content scan paths or safelist
- Rebuild after `tailwind.config.js` change (triggers full Sass)
- Pug class with special chars needs `class='...'` quoting

### BrowserSync not reloading

- Verify `dist/` files are updating (check timestamps)
- Watch ignores initial dist events — save source file again
- Port 8000 conflict → change port in `_gulptasks/server.js`

### FTP deploy fails

- Verify `.env` credentials
- Check `FTP_REMOTE_PATH` exists on server
- `vinyl-ftp` requires network access

### `npm run agent` exits before writing the prompt

The agent compiler runs a **token audit** before generating `agent-coding-prompt.txt`. It exits with code 1 when:

| Issue | Meaning | Fix |
|-------|---------|-----|
| `MISSING` typography or fill token | `ty` or `fi` in page JSON not in `generated/agent-lookup.json` / `tailwind.config.js` | Run `npm run extract` then `npm run tokens` |
| `NO_TOKEN` unlinked hex fill | Node has raw `c: "#hex"` with no matching design token | Prefer **no Figma change:** if the hex already exists in `tailwind.config.js`, re-run `npm run agent`. Otherwise add one line to [`automation/config/manual-fill-tokens.json`](../automation/config/manual-fill-tokens.json) (e.g. `"Grey/d9": "#d9d9d9"`), then re-run `npm run agent`. Optional: `extract` → `tokens` to persist on disk. Only if the color is truly new: add the paint style in Figma **or** add the hex to `tailwind.config.js` + `manual-fill-tokens.json`. Never render hex in Pug (`bg-[#…]` / `text-[#…]`) |

Full escape-hatch detail: [Agent Pipeline — Token audit gate](./agent-pipeline.md#token-audit-gate).

Terminal output includes the full `PAGE_TOKEN_AUDIT` block. Resolve all BLOCKER lines, then re-run `npm run agent`.

### Page JSON does not match existing Pug (e.g. `home`)

If `npm run audit:typography` reports hundreds of `TX_NOT_IN_PUG` on a page, the **page JSON and live Pug are from different designs**. Pick one source of truth:

1. **Regenerate from JSON** — `npm run agent` → rebuild page modules from `json/{page}.json`
2. **Replace JSON** — re-export the Figma design that matches current Pug → `npm run extract`

Do not patch typography class-by-class when the underlying content trees differ.

### Missing fonts/images

- Images must be in `src/img/` (not just `img/`)
- Fonts must be in `src/fonts/`
- Run full `npm start` (not just `gulp sass`)

## Team Conventions

- **Canh Cam** agency workflow — WordPress theme handoff via FTP
- **Client branding** in current templates: MBLAND
- **Coding rules** for agents live in `automation/agent-rules/` (not root `Coding-Rule.md`)
- **Design manifest** at `src/core/design-system/manifest.json`
- Do not bump dependencies without team approval

## Related Documentation

- [Agent Pipeline](./agent-pipeline.md)
- [Project Overview](./project-overview.md)
- [Folder Structure](./folder-structure.md)
- [Build Pipeline](./build-pipeline.md)
- [Component Architecture](./component-architecture.md)
- [Styling Guide](./styling-guide.md)
- [JavaScript Guide](./javascript-guide.md)
- [Coding Conventions](./coding-conventions.md)

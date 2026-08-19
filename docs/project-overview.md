# Project Overview

## What This Project Is

**HTML-Mk.3** (package name: `gulp-html`, v3.2.3) is a static front-end build system for translating Figma designs into production HTML/CSS/JS. It is maintained as a Gulp 4 pipeline that compiles:

- **Pug** → HTML
- **Sass** + **Tailwind CSS 3** → CSS (with PostCSS, Autoprefixer, optional minification)
- **ES modules (ES2020)** → bundled IIFE JavaScript via esbuild

The project targets pixel-perfect layouts against a **1920px Figma artboard**, with fluid sizing driven by viewport-aware CSS variables rather than raw `100vw`.

## Primary Use Cases

1. **Hand-coded or agent-generated static pages** — Pages live in `src/pages/`, composed from section modules in `src/modules/`.
2. **Figma-to-code automation** — Raw Figma JSON is extracted (`npm run extract`), then coding agents compile page JSON into Pug/Sass using rules in `automation/agent-rules/`.
3. **WordPress theme handoff** — The `gulp sync` task can FTP-deploy `dist/` to a remote WordPress theme path.

## Technology Stack

| Layer | Technology | Version (locked) |
|-------|-----------|------------------|
| Build runner | Gulp | 4.0.2 |
| Templates | Pug | 3.x |
| Styles | Dart Sass + Tailwind CSS | sass 1.99.0, tailwind 3.4.17 |
| JS bundler | esbuild (via gulp-esbuild) | 0.28.0 |
| JS transpile (vendor) | Babel + Terser | @babel/core 7.2.2 |
| Dev server | BrowserSync | 2.27.10 |
| Design tokens | `json/system-design.json` → DesignTokenIR (`npm run tokens`) → `generated/*` | — |

## Key Configuration Files

| File | Responsibility |
|------|----------------|
| `package.json` | Dependencies, npm scripts (`start`, `prod`, `sync`, `extract`, `agent`), Babel config |
| `gulpfile.babel.js` | Orchestrates all Gulp tasks; defines `default`, `prod`, `sync`, `sass` exports |
| `config.json` | Ordered lists of vendor JS/CSS files concatenated into `core.min.js` / `core.min.css` |
| `tailwind.config.js` | Tailwind theme (breakpoints, colors, fluid font sizes, custom plugins, `clamp:`/`rem:`/`ratio:` variants); consumes `generated/*` |
| `automation/config/layout-rules.json` | Layout constants (root font size, design viewport, scrollbar fallback) |
| `tokens/` + `generated/` | DesignTokenIR bundles + emitted theme/typography/agent-lookup artifacts |
| `automation/agent-rules/01-layout-agent.md` | Authoritative coding rules for Figma → Pug/Sass |
| `automation/reference/page-contract.json` | Structural folder/manifest contract for agents |
| `src/core/design-system/manifest.json` | Component mixin map, layout classes, radius utilities |

## NPM Scripts

```bash
npm start          # gulp default — clean, build, serve on :8000 with watch
npm run prod       # gulp prod — production build (minified CSS), no server
npm run sync       # gulp sync — build + FTP deploy + watch
npm run extract    # node automation/scripts/extract.mjs — Figma JSON → json/
npm run extract:pretty  # same with pretty-printed output
npm run agent      # node automation/scripts/agent-compiler.js — generates agent prompt
npm run scaffold:modules <slug>  # scaffold page entry + module folders from meta.moduleRegions
npm run scaffold:all               # scaffold all pages missing src/pages/{slug}.pug
npm run audit:typography       # verify page JSON ty → Pug → CSS typography classes
npm run audit:typography:page  # same, single page (--page slug)
npm run audit:modules          # manifest ↔ folder ↔ include structural compliance
npm run audit:modules:page     # same, single page (--page slug)
npm run tokens                 # DesignTokenIR build → resolve → emit generated/*
npm run tokens:check           # CI gate: fail if tokens/generated artifacts are stale
npm run ci:tokens              # alias for tokens:check
npm run ci:typography          # tokens:check && prod && audit:typography
npm run ci:modules             # npm run prod && npm run audit:modules
```

## Output Artifacts

Built files are written to **two parallel destinations** for convenience:

| Artifact | `dist/` (served) | Root mirror |
|----------|------------------|-------------|
| HTML | `dist/*.html` | — |
| CSS | `dist/css/*.css` | `styles/` |
| JS | `dist/js/*.js` | `scripts/` |
| Images | `dist/img/` | `img/` |
| Fonts | `dist/fonts/` | `fonts/` |

`dist/` is the BrowserSync document root. Root-level `styles/`, `scripts/`, `img/`, `fonts/` mirror build output (useful for IDE preview or external tooling).

## Design System Philosophy

- **Figma JSON is authoritative** for structure, typography tokens (`ty`), fill tokens (`fi`), and copy (`tx`).
- **No raw hex in markup** — colors resolve to Tailwind tokens (`text-primary-1`, `bg-grey-950`, etc.).
- **One typography class per text node** — `.heading-*`, `.heading-serif-*`, `.body-*` from `generated/typography.js`.
- **≤ 6 Tailwind utilities per element** in Pug; overflow goes to co-located `index.sass`.
- **Fluid sizing** via custom Tailwind variants: `clamp:`, `rem:`, `ratio:` and Sass helpers `r()`, `clampSize()`.

## Automation Pipeline (High Level)

```
Figma export (figma/*.json)
        ↓
npm run extract  →  json/system-design.json + json/{page}.json
                     (layout chrome stripped, SHARED_REF, meta.moduleRegions)
        ↓
npm run scaffold:modules <slug>  →  src/pages/{slug}.pug + empty module folders (optional)
        ↓
npm run agent    →  agent-coding-prompt.txt (blocked if token audit fails)
        ↓
Coding agent     →  src/pages/, src/modules/{page}/{section}/
        ↓
npm start        →  dist/*.html + CSS + JS
        ↓
npm run audit:modules + audit:typography  →  PASS / FAIL
```

See [Agent Pipeline](./agent-pipeline.md) for full detail.

## Repository Origin

Forked from [dreadfear/HTML-Mk.3](https://github.com/dreadfear/HTML-Mk.3) (MIT). Current project branding in templates references MBLAND / Canh Cam client work.

## What Is NOT in This Repo

- No Vite, Webpack, or PostCSS standalone config file (PostCSS runs inside Gulp Sass pipeline)
- No `tsconfig.json` / TypeScript — plain JavaScript ES modules only
- No `.editorconfig` or `.gitignore` in workspace (may exist locally but not committed)
- No committed `dist/` folder (generated on build)
- No `node_modules/` in file listing (install via `npm install`)
## Related Documentation

- [Documentation Index](./README.md)
- [Agent Pipeline](./agent-pipeline.md)
- [Developer Workflow](./developer-workflow.md)
- [Build Pipeline](./build-pipeline.md)

# Build Pipeline

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GULP BUILD PIPELINE                              │
└─────────────────────────────────────────────────────────────────────────┘

  src/pages/*.pug ──────────────────────────────► dist/*.html
        │                                              (gulp-pug, pretty tabs)

  src/core/**/*.sass  ──┐
  tailwind.config.js    ├──► PostCSS [tailwindcss, autoprefixer, (cssnano)]
                        │         │
  src/components/**/*.sass ─┤     ├──► dist/css/tailwind.min.css
  src/modules/**/*.sass  ───┘     │    dist/css/main.min.css
                                  │    styles/ (mirror)
                                  │
  config.json css[] ──► concat ───► dist/css/core.min.css

  config.json js[] ───► babel? + concat + terser ──► dist/js/core.min.js

  src/js/main.js ─────► esbuild (IIFE, ES2020) ───► dist/js/main.min.js

  src/img/** ─────────► copy ──────────────────────► dist/img/ + img/

  src/fonts/** ───────► copy ──────────────────────► dist/fonts/ + fonts/
```

## Gulp Entry Point

File: `gulpfile.babel.js` (uses `@babel/register` for ES module `import` syntax).

### Exported Tasks

| Export | Command | Description |
|--------|---------|-------------|
| `default` | `npm start` / `gulp` | Full dev build + BrowserSync server + watch |
| `prod` | `npm run prod` / `gulp prod` | Production build with minified CSS, no server |
| `sync` | `npm run sync` / `gulp sync` | Dev build + FTP deploy on every change |
| `sass` | `gulp sass` | Sass only (tailwind + main), no HTML/JS |

## Execution Order

### `gulp` (default / dev)

```
1. cleanDist          → delete dist/
2. parallel:
     copyImage        → src/img → dist/img + img/
     copyFonts        → src/fonts → dist/fonts + fonts/
3. parallel:
     jsCore           → vendor JS → dist/js/core.min.js + scripts/
     cssCore          → vendor CSS → dist/css/core.min.css + styles/
4. tailwindSass       → tailwind pipeline → tailwind.min.css
5. devSass            → component/module Sass → main.min.css
6. devJS              → esbuild main.js → main.min.js (readable bundle)
7. pugTask            → pages → dist/*.html
8. server             → BrowserSync :8000 + watchers
```

### `gulp prod`

Same as dev through step 7, but:
- `prodJS` replaces `devJS` — esbuild with `minify: true`
- `prodTailwindSass` outputs minified `tailwind.min.css` (same filename as dev)
- `prodSass` enables **cssnano** + **css-declaration-sorter** (concentric-css order)
- **No** `server` step

> `automation/reference/` is outside `src/` — not compiled by Gulp or scanned for production HTML.

### `gulp sync`

Same build as dev, then:
- `ftpDeploy` after each watched rebuild
- Uses `deploy.js` (server + FTP-aware watchers) instead of `server.js`

## Task Reference

### `cleanDist` (`_gulptasks/clean.js`)

- Uses `del` to remove entire `dist/` directory before each build.

### `cleanImage` (`_gulptasks/clean.js`)

- Deletes `dist/img/` before image re-copy (used in watch to avoid stale files).

### `copyImage` (`_gulptasks/copy.js`)

- Glob: `src/img/**/*.{svg,png,jpg,jpeg,gif,webp,mp4}` (case-insensitive variants included).
- **No image optimization** — `gulp-imagemin` is a dependency but not wired in current tasks.
- Dual output: `dist/img/` and `img/`.

### `copyFonts` (`_gulptasks/copy.js`)

- Reads glob from `config.json` → `"font": ["src/fonts/**"]`.
- `allowEmpty: true` — build succeeds even if fonts folder is empty.
- Dual output: `dist/fonts/` and `fonts/`.

### `jsCore` (`_gulptasks/core-js.js`)

Concatenates vendor scripts in **exact order** from `config.json`:

1. `src/plugins/jquery.js`
2. `node_modules/@fancyapps/ui/dist/fancybox.umd.js`
3. `src/plugins/mapping-listener.js`
4. `src/plugins/mapping.js`
5. `src/plugins/lozad.js`
6. `src/plugins/gsap.js`
7. `src/plugins/scrollTrigger.js`
8. `src/plugins/scrollreveal.js`
9. `src/plugins/counter.js`
10. `src/plugins/swiper.min.js`
11. `src/plugins/scrollFix.js`

Pipeline: `concat("core.min.js")` → `terser()` → `dist/js/` + `scripts/`.

### `cssCore` (`_gulptasks/core-css.js`)

Concatenates vendor CSS from `config.json`:

1. `src/plugins/font.css`
2. `node_modules/@fancyapps/ui/dist/fancybox.css`
3. `src/plugins/animation.css` *(referenced; may be absent — allowEmpty)*
4. `src/plugins/swiper.min.css`

Pipeline: `concat("core.min.css")` → PostCSS `[autoprefixer, cssnano, css-declaration-sorter]` → `dist/css/` + `styles/`.

### Sass Pipelines (`_gulptasks/sass.js`)

Two separate compilations run in parallel during dev watch:

#### Tailwind bundle (`tailwindSass` / `prodTailwindSass`)

**Sources** (concatenated in order):

```
src/core/mixin.sass
src/core/tailwind/import.sass      ← @tailwind base/components/utilities
src/core/tailwind/preflight.sass
src/core/tailwind/*.sass           ← base, viewport, utility
src/core/tailwind/elements/*.sass
src/core/design-system/*.sass
src/core/animation-lib/_keyframes.sass
src/core/animation-lib/_animation-classes.sass
src/core/animation-lib/_hamburger.sass
src/core/utility/*.sass
```

**Output:** `tailwind.min.css` (dev) or minified variant (prod).

#### Main bundle (`devSass` / `prodSass`)

**Sources:**

```
src/core/mixin.sass
src/components/**/*.sass
src/modules/**/*.sass
src/components/**/*.scss           ← optional SCSS support
src/modules/**/*.scss
```

**Output:** `main.min.css`.

#### Shared Sass pipeline steps

1. `gulp-sass` (Dart Sass) with custom warning logger
2. `gulp-concat` into single file
3. `gulp-postcss` processors:
   - **Always:** `tailwindcss("./tailwind.config.js")`, `autoprefixer()`
   - **Prod only:** `css-declaration-sorter({ order: "concentric-css" })`, `cssnano({ preset: ['default', { calc: false }] })`
4. Sourcemaps written to `.map` files alongside output
5. Dual dest: `dist/css/` and `styles/`

> **Important:** Gulp concatenates Sass files before compile — `@import` paths break in this pipeline. File order is explicit in `_gulptasks/sass.js`, not via `@import` chains.

### `pugTask` (`_gulptasks/html.js`)

- Input: `src/pages/*.pug`, excluding `src/pages/_*.pug` (layout partials).
- `gulp-pug` with `pretty: "\t"` (tab-indented HTML).
- Output: `dist/{pagename}.html`.

### App JS (`_gulptasks/script.js`)

- Entry: `src/js/main.js` only.
- Tasks: `devJS` (dev/sync) and `prodJS` (prod).
- `gulp-esbuild` options:
  - `bundle: true`
  - `format: "iife"` (immediately invoked function — no module loader needed in browser)
  - `target: "es2020"`
  - `sourcemap: true`
  - `minify: true` on `prodJS` only
- Output: `dist/js/main.min.js` + `scripts/main.min.js`.

> Note: The app bundle uses esbuild (`devJS` / `prodJS`). `@babel/register` transpiles the gulpfile only; vendor `core.min.js` uses terser on pre-built plugin files.

## Watch Task (`_gulptasks/server.js`, `_gulptasks/deploy.js`)

Shared watch settings live in `_gulptasks/watch-shared.js` (BrowserSync options, image glob, reload globs).

BrowserSync config:
- `baseDir: "dist"`
- `port: 8000`
- `injectChanges: true` (CSS injection without full reload when possible)
- `reloadDebounce: 300`
- `open: false`, `notify: false`

### Watch globs and triggered tasks

| Watched paths | Triggered task(s) | Reload |
|---------------|-------------------|--------|
| `src/js/**/*.js` | `devJS` | via dist watch |
| `src/plugins/**/*.{css,js}`, `config.json` | `jsCore`, `cssCore` (parallel) | via dist watch |
| `tailwind.config.js`, `src/core/**/*.sass` | `tailwindSass` + `devSass` (parallel) | via dist watch |
| `src/components/**/*.sass`, `src/modules/**/*.sass` | `devSass` | via dist watch |
| `src/**/*.pug` | `pugTask` + both Sass (parallel) | via dist watch |
| `src/img/**/*.{svg,png,...,SVG,PNG,...}` | `cleanImage` → `copyImage` | via dist watch |
| `dist/**/*.html`, `dist/css/**/*.css`, `dist/js/**/*.js` | `bs.reload()` | direct |

Watch options: `delay: 125`, `awaitWriteFinish` (stability 200ms) to handle editor temp files.

## Hot Reload / BrowserSync

- **CSS:** `injectChanges: true` enables style injection for CSS changes.
- **HTML/JS:** Full page reload when `dist/**/*.html` or `dist/js/**/*.js` change.
- **Not true HMR** — no module hot replacement; standard BrowserSync live reload.

## SVG Handling

- SVGs in `src/img/` are **copied as static files**, not inlined or optimized.
- Some Sass files embed SVG as data-URI strings (e.g. dashed line decorations in `mixin.sass`).
- No SVGO or sprite pipeline.

## Font Handling

- Source: `src/fonts/**` (may be empty).
- `src/plugins/font.css` loads external/icon fonts (Font Awesome, etc.) in the vendor CSS bundle.
- Google Fonts loaded via `<link>` in `_layout.pug` (Cormorant Garamond, Sarabun, Material Symbols).

## FTP Deploy (`_gulptasks/ftp.js`)

Requires `.env` with `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` (see `.env.example`).

- Remote path: `FTP_REMOTE_PATH` or default `public_html/wp-content/themes/canhcamtheme`
- Uploads: `dist/**/*.{html,css,js,svg,png,jpg,jpeg,gif,webp,mp4,woff,woff2,ttf,eot,otf}`
- Uses `vinyl-ftp` with `newer()` — only uploads changed files.

## CSS Load Order in Browser

From `_layout.pug`:

```html
<link rel="stylesheet" href="./css/core.min.css">      <!-- vendor -->
<link rel="stylesheet" href="./css/tailwind.min.css">  <!-- tailwind + core utilities -->
<link rel="stylesheet" href="./css/main.min.css">      <!-- components + modules -->
```

## JS Load Order in Browser

```html
<script src="https://unpkg.com/videojs-youtube/dist/Youtube.min.js"></script>  <!-- CDN -->
<script src="./js/core.min.js"></script>   <!-- vendor globals -->
<script src="./js/main.min.js"></script>   <!-- app IIFE -->
```

> `_layout.pug` currently includes the YouTube script tag twice — a known duplication in the layout file.

## Production vs Development Differences

| Aspect | Dev (`gulp`) | Prod (`gulp prod`) |
|--------|--------------|-------------------|
| CSS minification | No cssnano on Sass output | cssnano + declaration sorting |
| App JS minification | `devJS` — readable bundle | `prodJS` — esbuild `minify: true` |
| Sourcemaps | Yes | Yes |
| BrowserSync | Yes | No |
| FTP | No | No |
| HTML prettify | Tab-indented | Tab-indented (same) |

## Dependencies Not Used in Pipeline

These are in `package.json` but not actively wired in gulp tasks:

- `gulp-imagemin` — image optimization available but not configured
- `@material/web` — dependency present, not in config.json bundle

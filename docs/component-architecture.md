# Component Architecture

## Template Layers

The project uses a four-layer template hierarchy:

```
_layout.pug          ← HTML document shell
    ↓ extends
{page}.pug           ← Page metadata + section includes
    ↓ include
modules/{page}/{section}/index.pug   ← Section markup
    ↓ uses
mixin.pug + components/              ← Reusable primitives
```

## Layer 1: Layout (`src/pages/_layout.pug`)

The layout defines the HTML document structure shared by every page.

**Blocks:**

| Block | Purpose |
|-------|---------|
| `block var` | Page variables (`title`, `bodyClass`) |
| `block mixin` | Optional mixin overrides (default: includes `../modules/mixin.pug`) |
| `block header` | Default: `include ../components/header/header.pug` |
| `block main` | Page-specific content (required in each page) |
| `block footer` | Default: `include ../components/footer/footer.pug` |

**Head assets loaded:**

- `core.min.css`, `tailwind.min.css`, `main.min.css`
- Google Fonts (Cormorant Garamond, Sarabun, Material Symbols Outlined)

**Body structure:**

```pug
body(class=bodyClass)
  header (from components/header)
  main
    block main
  footer (from components/footer)
  scripts: core.min.js, main.min.js, videojs-youtube CDN
```

## Layer 2: Page Entry (`src/pages/{slug}.pug`)

Pages are intentionally thin. **Target pattern** (from `automation/reference/snippets/page-entry.pug`):

```pug
extends _layout.pug

block var
  - var title = 'Page Title'
  - var bodyClass = 'page example-page-page'

block main
  include ../modules/example-page/breadcrumb/index.pug
  include ../modules/example-page/hero/index.pug
  include ../modules/example-page/cta/index.pug
```

**Legacy homepage** (`src/pages/index.pug`) uses a single include of the monolith `home/index.pug` — do not copy that for new pages.

**Rules:**

- Set `title` and `bodyClass` in `block var`
- `bodyClass` format: `page {slug}-page`
- `block main` = **`include` lines only** — no `section.*` markup
- One Pug file → one HTML file in `dist/`

## Layer 3: Section Modules (`src/modules/`)

Sections are the primary unit of page composition.

**File pair per section:**

```
src/modules/{page}/{section}/index.pug   ← exactly ONE section.* root
src/modules/{page}/{section}/index.sass
```

**Forbidden:** multiple `section.{page}-*` roots in one `index.pug`. See `automation/reference/page-contract.json`.

### Example: split section module

From `automation/reference/snippets/modules/hero/index.pug`:

```pug
section.example-page-hero.bg-primary-1.text-white(class='clamp:py-[80-120]')
  .container-xxl
    .row.items-center
      .col.w-full(class='lg:w-1/2')
        .content
          h4.heading-1 Tiêu đề section
          div.body-2 Mô tả ngắn
          +btn1('Nhãn nút')
```

Co-located `index.sass` scopes rules under `.example-page-hero` only.

**Child class vocabulary** (generic names scoped under section root in Sass):

| Class | Use |
|-------|-----|
| `.wrap` | Outer content wrapper (not for gap/align-only throwaways) |
| `.box` | Sub-container / card shell |
| `.inner` | Inner padding group |
| `.content` | Text/copy column |
| `.list` | Collection of items |
| `.item` | Single list/card entry |
| `.card` | Card-shaped block |
| `.img` / `.media` | Image container (wrap) |
| `.img-ratio` | Ratio shell under `.img` — carries `ratio:pt-[H_W]` |
| `.panel` | Panel / layered block |

> Avoid `.grid`, `.flex`, `.block`, `.relative`, `.absolute` as custom class names — they collide with Tailwind `@apply`.

**Image wrap:** `.img` → `.img-ratio` → `+FooImg` / `img` / `picture`. See [`08-media-swiper.md`](../automation/agent-rules/08-media-swiper.md) and [Coding Conventions — Images](./coding-conventions.md#images).

**Layout nesting:** put width/`gap-*`/`items-*` on `.col` / `.list` / `.card` — do not invent throwaway `.wrap`/`.inner` wrappers. Gold standard: [`grid-example`](../automation/reference/snippets/modules/grid-example/).

## Layer 4: Shared Components

### Global mixins (`src/modules/mixin.pug`)

Included automatically via `_layout.pug`. Key mixins:

| Mixin | Purpose |
|-------|---------|
| `+FooImg(url, className)` | Lazy-load image with `lozad` class |
| `+btn1` … `+btn4`, `+btn6` | Button variants |
| `+newsItem()`, `+sideNews()`, `+productItem()` | Card patterns |
| `+toggleItem()` | Accordion item |
| `+formSample()` | Contact form shell (`.wrap-form > .wpcf7-form`) — adapt fields to Figma; do not blind-copy. Icons inside forms: `i.fa-*` in `.form-group` (see [`04-components.md`](../automation/agent-rules/04-components.md)) |
| `+SlideBtn()` … `+SlideGroup()` | Swiper navigation |
| `+social()` | Social link group |
| `+subscribeForm()` | Email subscribe |
| `+timeCat(time)` | Date display |

### Site components (`src/components/`)

| Component | Files | Included from |
|-----------|-------|---------------|
| Header | `header/header.pug`, `header.sass` | `_layout.pug` block header |
| Footer | `footer/footer.pug`, `footer.sass` | `_layout.pug` block footer |
| Banner | `banner/index.pug`, `index.sass` | Section modules (as needed) |
| Breadcrumb | `breadcrumb/index.pug`, `index.sass` | Inner pages |
| Pagination | `pagination/index.pug`, `index.sass` | List pages |
| News sidebar | `news/news-side.sass` | News layouts |

## How a Page Becomes HTML

### Example: Homepage (legacy monolith)

`src/pages/index.pug` includes one file with many sections:

```
include ../modules/home/index.pug  →  section.home-hero, .home-ticker, … (10+ roots)
```

CSS still compiles via `src/modules/home/index.sass`. This pattern is **edit-only** — new pages must use split folders per section.

### Parallel CSS compilation

While Pug compiles, Sass pipeline processes:

```
src/modules/home/index.sass  →  main.min.css  (.home-hero, .home-about, …)
src/components/header/header.sass  →  main.min.css
tailwind + core  →  tailwind.min.css  (.heading-*, .container, utilities)
```

### Parallel JS

`main.min.js` bundles initialization; no per-page JS split — all modules init on every page via `safeInit()` guards.

## Figma JSON → Module Mapping

From the automation workflow:

| Figma | Project path |
|-------|-------------|
| Page frame | `src/pages/{slug}.pug` |
| Top-level section | `src/modules/{page}/{section}/index.pug` + `index.sass` |
| Agent structural contract | `automation/reference/page-contract.json` + `automation/reference/snippets/` |
| Global component (header/footer) | `src/components/{name}/` or `include` only for `SHARED_REF` |
| Reusable instance | Mixin in `mixin.pug` or `components/` |

**SHARED_REF nodes** in page JSON (paths relative to `src/modules/{page}/{section}/index.pug`):

```pug
// header / footer → SKIP (_layout.pug owns them)
include ../../../components/banner/index.pug       // ref: top-banner
include ../../../components/breadcrumb/index.pug   // ref: global-breadcrumb
```

Configured shared sections: `automation/shared-sections.json`.

## Section Trace: split module (target)

| Step | File | What happens |
|------|------|--------------|
| 1 | `src/pages/goisanpham-ct.pug` | `include` per section folder (target; split pending) |
| 2 | `src/modules/{page}/hero/index.pug` | Single `section.{page}-hero` + grid scaffold |
| 3 | `src/modules/mixin.pug` | `+FooImg`, `+btn1` mixins |
| 4 | `src/modules/{page}/hero/index.sass` | Scoped `.goisanpham-ct-hero` rules |
| 5 | `_gulptasks/sass.js` | All `src/modules/**/*.sass` → `main.min.css` |
| 6 | `_gulptasks/html.js` | Pug → `dist/goisanpham-ct.html` |

## Section Trace: home (legacy)

| Step | File | What happens |
|------|------|--------------|
| 1 | `src/pages/index.pug` | Single `include ../modules/home/index.pug` |
| 2 | `src/modules/home/index.pug` | Many `section.home-*` roots in one file |
| 3 | `src/modules/home/index.sass` | All `.home-*` rules in one Sass file |

## Pug Features Used

| Feature | Usage |
|---------|-------|
| `extends` | Page → layout inheritance |
| `block` / `block var` | Variable and content slots |
| `include` | Pull in modules and components |
| `mixin` / `+mixin()` | Reusable parameterized fragments |
| `each` loops | Lists (stats, news, partners, projects) |
| `class='…'` | Quoted classes for `clamp:`, `ratio:`, breakpoints |
| `- var` | Unbuffered JS variables |

## HTML Output Conventions

- Tab-indented (`pretty: "\t"`)
- Relative asset paths: `./css/`, `./js/`, `./img/`
- Semantic tags from design system: `h1`–`h4`, `section`, `nav`, `button`
- `loading='lazy'` on content images
- Icon fonts: `<i class="fa-solid fa-*">`, `<i class="material-symbols-outlined">`

## When to Use `components/` vs `modules/`

| Use `components/` when… | Use `modules/` when… |
|-------------------------|----------------------|
| Shared across all/most pages | Specific to one page |
| Included from layout | Included from page `block main` |
| Site chrome (header, footer) | Page sections (hero, about, news) |
| Stable, rarely changes per page | One folder per Figma section frame |

## Adding a New Page (Checklist)

1. Create `src/pages/{slug}.pug` extending `_layout.pug` (includes only in `block main`)
2. Create **one folder per manifest line:** `src/modules/{slug}/{section}/index.pug` + `index.sass`
3. Each `index.pug` has exactly one `section.{slug}-{section}` root
4. Follow `automation/reference/snippets/` for structure (including gold-standard `grid-example` / `tabs-example` in the agent prompt); use `TYPOGRAPHY_TABLE` from the agent prompt for typography — not inference from `DESIGN_LOOKUP` alone
5. Add page-specific JS only if needed: `src/js/modules/{slug}.js` + register in `main.js`
6. Run `npm start` — `dist/{slug}.html` is generated automatically
7. Run `npm run audit:modules` then `npm run audit:typography` before considering the page complete

See [Agent Pipeline](./agent-pipeline.md).

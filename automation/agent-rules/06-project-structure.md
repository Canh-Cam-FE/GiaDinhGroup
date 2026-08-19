# Project structure, naming & grid

## Folder layout

```
src/
├── pages/_layout.pug, {page}.pug
├── modules/mixin.pug
├── modules/{page}/{section}/index.pug + index.sass
├── components/{name}/
├── core/design-system/     ← manifest.json, .desc, .rad-*, content.sass (typography via plugin → tailwind.min.css)
├── core/tailwind/          ← engine only; no page styles
└── js/main.js, modules/
```

| Item | Convention | Example |
| ---- | ---------- | ------- |
| Page file | kebab-case | `news-detail.pug` |
| Module folder | `{page}/{section}/` | `modules/home/about/` |
| Section root | `{page}-{section}` | `.home-about` |
| Child blocks | Generic nested structural blocks | `.home-about .wrap`, `.home-about .box`, `.home-about .card` |
| Body class | `page {page}-page` | `page home-page` |

## Child class vocabulary

Reuse generic structural names — `.wrap`, `.box`, `.inner`, `.card`, `.item`, `.list`, `.img`, `.content`, `.media`, `.panel` — scoped in Sass by nesting under the section root (e.g. `.services-list .wrap`).

> **Tailwind collision rule:** never use a Tailwind utility class name as a custom Sass child class — see the canonical banned list in `01-layout-agent.md` §A.

Grid containers (`.container`, `.container-xxl`, `.container-fluid`, `.row`, `.col`) are global layout classes (see Grid below) — not section-specific children. Do not invent `{section}-wrap` or numbered variants.

**Legacy note:** `.wrap` also appears in older mixins/components (footer, banner). Section Sass must scope styles under the section root so generic names do not leak globally. Some existing sections use semantic roots without a page prefix (e.g. `.primary-banner`) — preserve those when editing; use `{page}-{section}` for new modules.

## Grid (mandatory for columns)

```pug
section.home-about(class='clamp:py-[48-96]')
  .container
    .row
      .col.w-full(class='lg:w-1/2')
        // column A
      .col.w-full(class='lg:w-1/2')
        // column B
```

| Container | Use |
| --------- | --- |
| `.container` | Centered max-width (up to 1440px) |
| `.container-xxl` | Wide centered max-width (1760px) |
| `.container-fluid` | Full width + padding |
| `.container-fluid.no-pad` | Edge-to-edge |
| `.no-gutters` | Remove col gutters |

**Gutters:** mobile 10px/side; desktop (≥1024px) 20px/side.

**Shortcuts:** `.flex-center`, `.flex-between`, `.flex-start`, `.col-center`, `.absolute-center`, `.absolute-x`, `.absolute-y`, …

## Fluid variants

| Variant | Example |
| ------- | ------- |
| `clamp:` | `clamp:py-[40-80]`, `clamp:w-[200-400]` |
| `rem:` | `rem:w-[500px]`, `xl:rem:max-w-[640px]` |
| `ratio:` | `ratio:pt-[600_900]`, `ratio:pt-[16_9]` |

**Sass:** `r(640px)`, `+aspect-ratio(600, 900)`, `clampSize(16, 24)` in `src/core/mixin.sass`.

**Spacing scale:** 4px steps in `tailwind.config.js` (`1` = 4px … `25` = 100px, as rem).

## Pixel-perfect viewport (1920 Figma vs. browser scrollbar)

Figma frames are **1920px** wide with **no** scrollbar. A maximized **1920px** browser window often has **~1903px** content width (classic scrollbar ≈ **17px** on Windows). Do **not** scale with raw `100vw` — that overshoots by ~0.9% and breaks pixel-perfect QA.

| Layer | Role |
| ----- | ---- |
| `html { scrollbar-gutter: stable }` | Reserves gutter; reduces layout jump when scroll appears |
| `--scrollbar-width` | Measured in `src/js/modules/viewport.js` (`innerWidth − clientWidth`; **0** on macOS overlay scrollbars) |
| `--design-vw` | `calc(100vw - var(--scrollbar-width))` — effective width for fluid math |
| `tailwind.config.js` → `calcVP()` | All `clamp:` / font-size fluid uses `--design-vw`, denominator **1920** |
| `preflight.sass` | Root `font-size: calc(19.2 / 1920 * var(--design-vw))` at `xl` so `r()` / `100rem` track Figma |

**QA tip:** compare at **1920px outer window**; content should match Figma width, not 1920px inside `100vw` math. Do not hard-code `1903` in markup — use the variables above.

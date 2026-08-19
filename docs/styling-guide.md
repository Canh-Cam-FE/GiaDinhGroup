# Styling Guide

## Architecture Overview

Styles are split across **three CSS bundles** loaded in order:

| Bundle | Source | Contains |
|--------|--------|----------|
| `core.min.css` | `config.json` CSS list | Font Awesome, Fancybox, Swiper vendor CSS |
| `tailwind.min.css` | `src/core/tailwind/`, `src/core/design-system/`, `src/core/animation-lib/`, `src/core/utility/` | Tailwind utilities, typography components, grid, buttons, preflight, motion classes |
| `main.min.css` | `src/components/`, `src/modules/` | Page sections and shared component styles |

Both `tailwind.min.css` and `main.min.css` run through **Tailwind PostCSS** — `@apply` and `@tailwind` directives work in all Sass sources.

## Sass File Organization

### `src/core/mixin.sass`

Global Sass functions and mixins included at the top of both Sass pipelines.

**Functions:**

| Function | Purpose |
|----------|---------|
| `r($size)` | Fluid rem-like sizing: `(size / 1920) * 100rem` against design viewport |
| `clampSize($min, $max)` | `clamp(min, fluid-calc, max)` using `--design-vw` CSS variable |
| `_to-px($v)` | Internal unit normalizer |

**Mixins:**

| Mixin | Purpose |
|-------|---------|
| `+fz($min, $max)` | Responsive font-size via clampSize |
| `+line-clamp($min, $max, $line-height, $lines)` | Multi-line ellipsis with fluid font |
| `+line($lines)` | Simple line clamp |
| `+img-ratio($h, $w, $fit)` | Aspect ratio box for images |
| `+aspect-ratio($h, $w, $fit)` | Aspect ratio for img/picture/video |
| `+video-ratio($h, $w, $fit)` | Aspect ratio for video/iframe |
| `+res-nav` | Horizontal scroll nav pattern |
| `+line-vertical` / `+line-horizontal` | Decorative dashed SVG lines |

### `src/core/tailwind/`

| File | Role |
|------|------|
| `import.sass` | `@tailwind base; @tailwind components; @tailwind utilities` |
| `preflight.sass` | Base resets, root font-size scaling, scrollbar hiding, legacy col-* classes |
| `viewport.sass` | `:root` CSS vars: `--design-width`, `--scrollbar-width`, `--design-vw` |
| `base.sass` | Material Symbols Outlined normalization |
| `utility.sass` | Additional Tailwind-layer utilities |

### `src/core/design-system/`

| File | Role |
|------|------|
| `index.sass` | Entry comment only — files listed explicitly in gulp sass sources |
| `grid.sass` | `.container`, `.container-xxl`, `.container-fluid`, `.row`, `.col`, gutters |
| `buttons.sass` | `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-tertiary`, hover animations |
| `layout.sass` | Global layout helpers |
| `typography.sass` | Non-plugin typography overrides |
| `radius.sass` | Large decorative radii: `.rad-b-40`, `.rad-l-25`, etc. |
| `content.sass` | `.desc`, `.fullcontent` (CMS HTML) patterns |
| `manifest.json` | Token workflow documentation |

### `src/core/utility/`

Cross-cutting UI patterns: `form.sass`, `modal.sass`, `search.sass`, `mobile-menu.sass`, `swiper.sass`, `section.sass`, `language.sass`.

### `src/core/animation-lib/`

`_keyframes.sass`, `_hamburger.sass`, `_animation-classes.sass`, `index.sass` — motion primitives (`.fd-up`, `.fd-down`, hamburger menu).

## Tailwind Configuration

File: `tailwind.config.js`

### Content scanning paths

```js
"./src/dist/**/*.{html,js}",      // built HTML (for class detection)
"./src/pages/**/*.pug",
"./src/components/**/*.{sass,scss,pug}",
"./src/modules/**/*.{sass,scss,pug}",
"./src/core/design-system/**/*.sass",
```

### Design viewport math

- Base design width: **1920px**
- Root font size at xl: **19.2px** (so `100rem` = 1920px design width)
- `calcVP(size)` → `calc(size / 1920 * var(--design-vw))`
- `--design-vw` = `calc(100vw - var(--scrollbar-width))` — set by `viewport.js`

### Breakpoints

| Token | Min-width | Max variant |
|-------|-----------|-------------|
| `xs` | 320px | — |
| `sm` | 576.1px | `max-sm`: ≤576px |
| `md` | 768.1px | `max-md`: ≤768px |
| `lg` | 1024.1px | `max-lg`: ≤1024px |
| `xl` | 1200.1px | `max-xl`: ≤1200px |
| `2xl` | 1600px | `max-2xl`: ≤1600px |

Desktop layout breakpoint for grid gutters: **`lg:`** (1024px).

### Custom Tailwind Variants

| Variant | Example | Behavior |
|---------|---------|----------|
| `clamp:` | `clamp:py-[80-160]` | Fluid clamp between min-max px values |
| `rem:` | `rem:w-[500px]` | Force rem conversion |
| `ratio:` | `ratio:pt-[292_440]` | Padding-top aspect-ratio box — **H_W = height_width** from Figma `b.height` / `b.width` (not CSS `aspect-ratio` width/height order). Put on `.img-ratio`, not the bare `img` |
| `hover-fine:` | `hover-fine:opacity-80` | Only on hover-capable fine pointers |

### Custom Utilities (plugin)

Flex shortcuts: `.flex-center`, `.flex-between`, `.col-center`, `.absolute-center`, `.absolute-x`, `.absolute-y`.

Grid: `.grid-center`, `.grid-start`, `.grid-end`.

Transitions: `.transition`, `.transition-smooth`, `.transition-bounce`.

Text gradients: `.text-gradient-1`, `.text-gradient-2`.

Square sizing: `sq-{n}` match utility (responsive icon/image boxes).

Inset shadows: `.shadow-inset-1-{color}` for all theme colors.

### Disabled core plugins

```js
corePlugins: {
  container: false,    // custom .container in plugin
  aspectRatio: false,  // custom ratio: variant instead
}
```

## Design Tokens

### Source of truth chain

```
json/system-design.json
        ↓ (npm run extract)
tokens/normalized.json → tokens/resolved.base.json   (npm run tokens)
        ↓
generated/design-tokens.js + generated/typography.js
        ↓
tailwind.config.js
        ↓
Generated CSS              →  .heading-1, .body-2, text-primary-1, etc.
```

### Typography tokens

Applied as **component classes** from `generated/typography.js`:

```pug
h2.heading-1.text-grey-950 Title
div.body-2.text-primary-4  Body copy
h2.heading-serif-2.text-grey-main  Serif display
```

**Rules:**

- Exactly **one** typography class per text node
- **No** responsive text utilities (`md:text-lg` forbidden)
- **No** arbitrary sizes (`text-[18px]` forbidden)
- Semantic HTML tag from `generated/agent-lookup.json` (`ty[key].tag`)

### Color tokens

Solid fills from Figma map to Tailwind colors:

```pug
.bg-primary-1.text-white
.text-grey-950
.border-grey-200
```

**Gradient fills** (`Gradient/*` in JSON): implement in section `index.sass`, not Pug utilities.

### Spacing scale

Tailwind spacing `1`–`25` = multiples of 4px converted to rem via `calcSpacingRem()`.

## Where to Add New Styles

| What you're styling | Where to put it |
|---------------------|-----------------|
| New page section | `src/modules/{page}/{section}/index.sass` |
| Shared component update | `src/components/{name}/{name}.sass` |
| Global button change | `src/core/design-system/buttons.sass` |
| New grid/container tweak | `src/core/design-system/grid.sass` |
| New utility used everywhere | `src/core/utility/` or Tailwind plugin in `tailwind.config.js` |
| New typography token | Re-export Figma → `npm run extract` → `npm run tokens` |
| New color token | Same extract + tokens flow (emits `generated/design-tokens.js`) |

> **Never** put page-specific styles in `src/core/`.

## Module Sass Pattern

From `automation/reference/snippets/modules/hero/index.sass` (target) or `src/modules/home/index.sass` (legacy):

```sass
.home-hero
  @apply relative overflow-hidden min-h-screen flex items-end
  padding: clamp(8rem, 10vw, 12rem) 0 clamp(2.5rem, 4vw, 4rem)

  .bg
    @apply absolute inset-0 w-full h-full object-cover
    z-index: 0

  &::before
    content: ''
    @apply absolute inset-0
    background: linear-gradient(...)
    z-index: 1

@media (max-width: 1024px)
  .home-hero
    min-height: 46rem
```

**Principles:**

- Root selector = section class (`.home-hero`)
- Nest generic children (`.content`, `.tools`, `.wrap`) one level
- Use `@apply` for Tailwind utilities (≤ ~8 per rule)
- Raw CSS for gradients, complex calc, pseudo-elements
- Media queries at bottom of section block or file
- Solid colors in Sass: `@apply bg-primary-2`, `@apply text-primary-2-title-content` (same utility stems as Pug)
- `theme('colors.primary.2')` only when you need a raw CSS value (gradient stops, shadows) — use nested paths from `tailwind.config.js`, not hyphenated utility names (`colors.primary-2` is invalid)

## Tailwind in Pug vs Sass

| Use in Pug (≤ 6 utilities) | Use in Sass |
|----------------------------|-------------|
| Layout: flex, grid, gap, padding | Pseudo-elements (`::before`, `::after`) |
| Colors (solid tokens) | Gradient backgrounds |
| Typography component classes | Complex hover states |
| `clamp:`, `rem:`, `ratio:` variants | `r()`, `clampSize()` for precise control |
| Responsive breakpoints (`lg:w-1/2`) | Decorative layers, z-index stacking |

## Responsive Strategy

1. **Mobile-first** Tailwind breakpoints (`lg:`, `xl:` for desktop)
2. **Fluid sizing** default — `clamp:` variant and `calcVP()` for Figma-accurate scaling
3. **Section Sass media queries** for complex layout changes (grid column collapse)
4. **No responsive typography** — heading/body classes scale fluidly via plugin

### Container widths

| Class | Max-width behavior |
|-------|-------------------|
| `.container` | Up to `calcVP(1440)` at 2xl |
| `.container-xxl` | Up to `calcVP(1760)` at xl/2xl |
| `.container-fluid` | Full width with padding |
| `.container-fluid.no-pad` | Edge-to-edge |

### Grid gutters

- Mobile: 10px per side
- Desktop (≥1024px): 20px per side (`r(24px)` in grid.sass)

## Grid System

```pug
section.home-about(class='clamp:py-[48-96]')
  .container-xxl
    .row.items-center
      .col.w-full(class='lg:w-5/12')
        .content
          ...
      .col.w-full(class='lg:w-7/12')
        .gallery
          ...
```

- `.row` → flex wrap
- `.col` → flex column, horizontal padding
- Width fractions via Tailwind: `w-5/12`, `lg:w-1/2`
- `.no-gutters` removes column padding
- `.col-match-height` for equal-height columns

## Animation Classes

| Class | Effect |
|-------|--------|
| `.fd-up`, `.fd-down` | ScrollReveal fade on scroll |
| `.text-fd-up` | Text fade triggered by Swiper slide change |
| `.zoom-in` | Image hover scale |
| `.transition` | 0.4s ease-in-out all |

Optional `data-delay='200'` on animated elements (×200ms).

## Font Families

| Tailwind class | Font |
|----------------|------|
| `font-sans` | Manrope (theme default) |
| `font-serif` / `font-Cormorant-Garamond` | Cormorant Garamond |
| `font-icon` / `font-Awesome6` | Font Awesome 6 Pro |
| `font-icon2` | Font Awesome 6 Brands |
| `font-icon3` / `font-Material-Icon` | Material Symbols Outlined |

Body default in preflight: **Sarabun** (Google Fonts).

## Common Pitfalls

1. **Circular dependency** — never name a custom class `.grid` or `.flex` then `@apply grid` inside it
2. **@import in Sass** — broken by gulp concat; add files to `_gulptasks/sass.js` source list instead
3. **Raw hex in Pug** — use tokens (`text-primary-1`, not `text-[#2465b1]`)
4. **> 6 utilities in Pug** — move overflow to Sass
5. **BEM nesting** — use flat generic children, not `.home-about__title`
6. **`theme()` vs `@apply` for colors** — utility names (`bg-primary-2`) do not map 1:1 to `theme()` keys. Prefer `@apply bg-primary-2` in Sass; if you need a raw value, use `theme('colors.primary.2')` per `tailwind.config.js` (see `automation/agent-rules/03-colors-gradients.md`)

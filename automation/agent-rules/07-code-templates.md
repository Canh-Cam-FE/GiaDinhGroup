# Pug, Sass & JavaScript templates

## Page template (`src/pages/{slug}.pug`)

```pug
extends _layout.pug

block var
  - var title = 'Page Title'
  - var bodyClass = 'page home-page'

block main
  include ../modules/home/about/index.pug
```

Use `class='...'` when classes contain `:`, `[`, `/`, or breakpoints.

## Module template (`src/modules/{page}/{section}/index.pug`)

1. One **section root class** per module (e.g. `.services-list`).
2. Scaffold: `.container` (or `.container-xxl`) → `.row` → `.col`; generic inner wrappers `.wrap`, `.box`, `.inner`, `.card`, `.item`, `.list`, `.img`, `.content` (`06-project-structure.md`).
3. Typography: tag + `cssClass` from `TYPOGRAPHY_TABLE` (see `02-typography.md`); ≤ 6 Tailwind classes per element.
4. Quote utility classes containing `:`, `[`, `]`, `/`: `class='…'`.
5. Use `clamp:`, `rem:`, `ratio:` for fluid sizing from JSON bounds (`05-layout-geometry.md`).
6. Reuse mixins from `mixin.pug` when a Figma instance matches (`04-components.md`).
7. If you encounter `{"t": "SHARED_REF", "ref": "…"}`, do not generate markup — insert the matching `include` (`01-layout-agent.md` §C, Step 4).

## Sass template (`index.sass`)

Use clean standalone sub-classes in Pug (`.wrap`). In Sass, nest them cleanly one level deep inside the parent block — no BEM, no repeated section prefixes.

```sass
.home-about
  @apply relative

  .wrap
    @apply flex items-center

  .box
    @apply w-full lg:w-1/2

  .inner
    &::before
      content: ''
      @apply block absolute pointer-events-none
```

1. Co-locate with Pug; **single root class** scope; nest generic children as direct children of the root.
2. Use for: pseudo-elements (`:before`, `:after`), hovers, `Gradient/*` backgrounds (`03-colors-gradients.md`), decorative layers, `r()` — anything that doesn't fit in 6 Tailwind classes in Pug.
3. Max 3 nesting levels; `@apply` sparingly (≤ ~8 utilities per rule).

| Tailwind in Pug | Sass in `index.sass` |
| ---------------- | ---------------------- |
| Margin, padding, flex, colors (solid tokens) | Pseudo-elements, BG images, `Gradient/*` fills, complex hovers |
| `clamp:` / `rem:` / `ratio:` | `r()`, nested generic child blocks, `@apply bg-gradient-*` |

Solid colors in Sass: `@apply bg-primary-2` / `@apply text-gray-950` — not `theme('colors.primary-2')`. Use `theme('colors.primary.2')` only for raw values (gradients, shadows); see `03-colors-gradients.md` for the live token table.

## JavaScript

Write JS **only** for sliders, tabs, accordions, or other interactive states.

> For the canonical standard on structuring interactive Tabs without legacy markup, always refer to `automation/reference/snippets/modules/tabs-example/index.pug`.

**DOM hooks (mandatory for new code):**

| Attribute | Purpose | Example |
| --------- | ------- | ------- |
| `data-js-target` | Identifies the controlled element or region | `data-js-target='services-tabs'` |
| `data-js-action` | Identifies the user action / handler | `data-js-action='open-panel'` |

```pug
button(type='button' data-js-target='services-tabs' data-js-action='switch-tab' aria-label='Tab 1')
  span.heading-6 Tab label

.swiper(data-js-target='services-slider')
```

```js
export function initServices() {
	document
		.querySelectorAll("[data-js-target='services-tabs']")
		.forEach(/* … */);
}
// main.js: safeInit(initServices, "services");
```

- Never bind behavior to a presentational CSS class (`.tab-btn`, `.heading-2`, etc.).
- When registering a new module via `safeInit()`, you **MUST** `import` your new function at the top of `src/js/main.js` first. Failing to import the module before calling `safeInit()` will crash the ESBuild bundler.
- Register initializers via `safeInit()` in `src/js/main.js`.
- Prefer existing modules before writing a new one:

| Module | Handles |
| ------ | ------- |
| `swiper.js` | Carousels, `.init-swiper` (legacy) |
| `ui.js` | Tabs, accordions (legacy `data-type`) |
| `nav.js` | Menu, search |
| `scroll.js` | Header on scroll |
| `{page}.js` | Page-specific hooks |

**Legacy tab exception:** if you are extending an existing section whose markup already matches the repo's tab API (`.tab-nav a[data-type]` controlling sibling `.tab-item` panels inside the same `section`), keep that markup — `src/js/modules/ui.js` already initializes it. For any **net-new** tab/accordion interaction, use `data-js-*` hooks instead; do not introduce new `data-type` usages.

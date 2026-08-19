# Coding Conventions

This document consolidates conventions observed in the codebase and enforced by `automation/agent-rules/01-layout-agent.md` (the project's coding rulebook).

## File and Folder Naming

| Item | Convention | Example |
|------|------------|---------|
| Page Pug files | kebab-case | `cauchuyenkhachhang-ds.pug` |
| Layout partials | `_` prefix | `_layout.pug` (excluded from HTML compile) |
| Module folders | `{page}/{section}/` | `modules/goisanpham-ct/hero/` |
| Legacy monolith | `{page}/index.pug` only | `modules/home/` (do not copy for new pages) |
| Section files | Always `index.pug` + `index.sass` | — |
| Components | `{name}/{name}.pug` or `index.pug` | `header/header.pug` |
| JS modules | camelCase file, `init{Feature}` export | `nav.js` → `initNav()` |
| JSON page files | kebab-case matching page slug | `json/home.json` |

## CSS Class Naming

### Section roots

Format: `{page}-{section}`

```
.home-hero
.home-about
.home-news
.cauchuyenkhachhang-ds-07-1-cauchuyenkhachhang-ds
```

Legacy exception: `src/modules/home/index.pug` is a **monolith** (many section roots in one file). Preserve when editing home only; use split folders per `automation/reference/page-contract.json` for all new pages.

Some older sections also use semantic roots (`.primary-banner`) — preserve when editing, use `{page}-{section}` for new work.

### Child elements

Generic structural names nested under section root:

```
.wrap, .box, .inner, .content, .list, .item, .card, .img, .media, .panel, .head, .meta, .actions
```

Nesting is allowed when each layer has a real structural role from that vocabulary. Extra wrappers for spacing/alignment only = bloat — see [Forbidden throwaway wrappers](#forbidden-throwaway-wrappers).

**Forbidden as custom class names:** `.grid`, `.flex`, `.block`, `.hidden`, `.relative`, `.absolute` (Tailwind collision). Use `.list`, `.layer`, `.float`, `.stack`, etc. instead when you need a custom name.

**Avoid in new code:** `.txt`, `.headline`, `.btn-wrap`, `.subscribefrm` (legacy labels).

### No BEM

Do not use `__` or `--` suffixes. Do not repeat section name in children:

```sass
// ✓ Correct
.home-about
  .content
    ...

// ✗ Wrong
.home-about
  .home-about__content
    ...
```

### Body class

Every page sets: `page {slug}-page`

```pug
- var bodyClass = 'page home-page'
```

## Typography Conventions

### One class per text node

```pug
h2.heading-1.text-grey-950
div.body-2.text-primary-4
span.heading-7.text-primary-1
h2.heading-serif-2.text-grey-main
```

### Semantic HTML tags

Tag comes from `designSystem.typography[ty].html` — do not guess:

| Token group | Class | Typical tag |
|-------------|-------|-------------|
| `Heading/*` | `.heading-*` | `h1`–`h4` or `span` |
| `Heading chân/*` | `.heading-serif-*` | `h2`–`h4` or `span` |
| `Body/*` | `.body-*` | `div` |

### Forbidden typography patterns

- `md:text-lg`, `lg:text-xl` — no responsive text utilities
- `text-[18px]` — no arbitrary font sizes
- `.heading-*` on `<p>` elements
- `.body-*` on icon elements (`<i>`)

### Rich text

```pug
div.desc.body-1.text-grey-600
  | Multi-line copy directly on div — no nested <p>
```

## Color Conventions

### Solid fills

```pug
.text-primary-1.bg-white.border-grey-200
```

### Forbidden

- `text-[#2465b1]`, `bg-[#fff]` — no raw hex in markup
- `style="color: #..."` — no inline styles

### Gradients

Implement in section `index.sass`:

```sass
.home-sustainability
  .overlay
    background: linear-gradient(180deg, rgba(0,0,0,.2) 0%, rgba(0,0,0,.45) 100%)
```

Or use theme utilities: `@apply bg-gradient-2`

## Tailwind Utility Limits

**Maximum 6 Tailwind utility classes per element in Pug.**

Overflow goes to co-located Sass:

```pug
// ✓ 4 utilities
.col.w-full(class='lg:w-5/12')

// ✗ Too many — move to Sass
div(class='flex items-center justify-between gap-4 px-8 py-4 bg-white rounded-2 shadow-soft')
```

### Quoting classes

Use `class='…'` when classes contain special characters:

```pug
section(class='clamp:py-[80-160]')
a.img-ratio(class='ratio:pt-[292_440]')
```

## Layout Conventions

Authoritative detail: [`automation/agent-rules/05-layout-geometry.md`](../automation/agent-rules/05-layout-geometry.md). Gold-standard Pug: [`automation/reference/snippets/modules/grid-example/`](../automation/reference/snippets/modules/grid-example/).

### Grid scaffold

```pug
section.{page}-{section}
  .container-xxl        // or .container / .container-fluid
    .row
      .col.w-full(class='lg:w-1/2')
```

Apply width / `grid-cols-*` utilities **directly on `.col` or the grid container** — not on throwaway wrappers.

### Forbidden throwaway wrappers

**Forbidden:** redundant `.wrap` or `.inner` divs added only for spacing or alignment. If a child exists solely to carry `gap-*`, `items-*`, or column width classes with no semantic or decorative role, delete it and move those utilities to `.col`, `.list`, `.card`, or the content element itself.

### Auto-layout axis mapping (`al`)

| JSON field | Meaning | Tailwind |
| ---------- | ------- | -------- |
| `al.layoutMode` | `HORIZONTAL` / `VERTICAL` | `.row` (flex) vs stacked `.wrap` |
| `al.primaryAxisAlignItems` | Alignment **along** the layout direction (main axis) | `justify-start` / `justify-center` / `justify-between` / `justify-end` |
| `al.counterAxisAlignItems` | Alignment **across** the layout direction (cross axis) | `items-start` / `items-center` / `items-end` / `items-stretch` |

**Don't conflate axes:** when `layoutMode: HORIZONTAL`, primary → horizontal (`justify-*`) and counter → vertical (`items-*`); the two **swap** when `layoutMode: VERTICAL`. Verify against the rendered output, not JSON alone.

### Absolute / overlapping nodes (no `al`)

Decorative shapes, floating badges, and layered graphics often have **no** `al` — do not force them into `.row` / `.col`.

1. Parent section/wrap: `.relative`
2. Floating child: `.absolute`
3. Convert child `b.x` / `b.y` into offsets **relative to the parent's** `b.width` / `b.height` with `clamp:` (or `%`) — never raw fixed px, never the parent's absolute canvas coordinates

### Fluid sizing variants

| Variant | Example | Use |
|---------|---------|-----|
| `clamp:` | `clamp:py-[80-160]` | Fluid padding/margin between min-max px |
| `rem:` | `rem:w-[500px]` | Fixed rem conversion |
| `ratio:` | `ratio:pt-[600_900]` | Padding-top ratio box — **height_width** from Figma `b.height` / `b.width` (not CSS `aspect-ratio` w/h order) |

### Flex shortcuts (Tailwind plugin)

`.flex-center`, `.flex-between`, `.flex-start`, `.col-center`, `.absolute-center`, `.absolute-x`, `.absolute-y`

## Pug Conventions

### Indentation

Tabs (consistent with `pretty: "\t"` HTML output).

### Includes

```pug
// Page entry — one include per section folder
include ../modules/my-page/hero/index.pug
include ../modules/my-page/cta/index.pug

// From src/modules/{page}/{section}/index.pug — SHARED_REF only
include ../../../components/breadcrumb/index.pug
```

Paths relative to current file. **Do not** put multiple `section.*` roots in one module file.

### Mixins

```pug
+btn3('Label text')
+FooImg('./img/path.jpg', 'rounded-2')
each item in items
  .item
    div.body-2= item
```

### Links

- Prefer real URLs or `href='#'` over `javascript:;` in new code
- Use `<button type='button'>` for non-navigation actions
- Always `aria-label` on icon-only buttons

### Images

Canonical wrap (from [`08-media-swiper.md`](../automation/agent-rules/08-media-swiper.md)): **`.img` → `.img-ratio` → image**. Put `ratio:pt-[H_W]` on the ratio shell (height_width from frame `b`), not as a raw CSS `aspect-ratio` on the `img`.

```pug
.img.zoom-in.overflow-hidden
  a.img-ratio(class='ratio:pt-[292_440]')
    +FooImg('./img/…', 'rounded-2')

// Or explicit markup when alt text matters:
picture
  source(media='(max-width: 767px)' srcset='./img/section/mobile.jpg')
  source(media='(min-width: 768px)' srcset='./img/section/desktop.jpg')
  img(src='./img/section/desktop.jpg' alt='Descriptive text' loading='lazy')
```

`+FooImg()` currently outputs `alt=""` — prefer explicit `img()` / `picture` for content images that need meaningful alt. Use `picture` when mobile/desktop art differs.

## Sass Conventions

### Indentation

Tabs (`.sass` syntax, no braces).

### Nesting

- Max 3 levels deep
- Scope all rules under section root
- `@apply` sparingly (≤ ~8 utilities per rule)

### Media queries

```sass
@media (max-width: 1024px)
  .home-hero
    min-height: 46rem
```

Or Tailwind `@screen lg` / `@screen max-lg` inside rules.

### Color references in Sass

Prefer `@apply` with the same utility stems used in Pug:

```sass
.bg
  @apply bg-primary-2
.title
  @apply text-primary-2-title-content
```

Use `theme()` only when you need a raw CSS value (gradient stops, shadows). Match the nested path in `tailwind.config.js` — not the utility class name:

```sass
// bg-primary-2  →  colors.primary.2  (not colors.primary-2)
background: linear-gradient(135deg, theme('colors.primary.1') 0%, theme('colors.grey.950') 100%)
```

## JavaScript Conventions

### Module structure

```js
/**
 * Module description.
 * Put here: ...
 * Avoid here: ...
 */
import { $ } from "../utils";

export function initFeature() {
  // ...
}
```

### Registration

Always via `safeInit()` in `main.js`:

```js
safeInit(initFeature, "feature");
```

### DOM hooks (new code)

```pug
button(type='button' data-js-target='feature-name' data-js-action='toggle')
```

Never bind to presentational classes in new modules.

### Legacy hooks (read-only, do not extend)

- `data-type="tab-block-1"` for tabs
- `.toggle-item .title` for accordions
- `.site-menu-toggle` for mobile menu

## Import Order (JS)

1. Utils (`../utils`)
2. No cross-module imports between feature modules
3. Third-party globals accessed via `window` (not imported)

## Icon Conventions

| Font metadata | Markup |
|---------------|--------|
| `font: "icon"` or Font Awesome Solid | `i.fa-solid.fa-{glyph}` |
| `font: "icon2"` or Font Awesome Brand | `i.fa-brands.fa-{glyph}` |
| `font: "icon3"` | `i.material-symbols-outlined` or project mapping |
| Material Symbols in markup | `i.material-symbols-outlined` text content = glyph name |

Never wrap icons in typography classes.

## Swiper Markup

```pug
.swiper
  .swiper-wrapper
    .swiper-slide
      ...
  .swiper-pagination
+SlideBtn()
```

## Form Markup

Structure: `.wrap-form > .wpcf7-form > .form-group` (see [`04-components.md`](../automation/agent-rules/04-components.md)). The snippet below is a **structural shell only** — adapt fields/placeholders to the Figma JSON; do not blind-copy `+formSample()`.

```pug
.wrap-form
  .wpcf7-form
    .form-group
      label Field name
      input(type='text' placeholder='...')
    .form-group
      .custom-select
        select
          option Option
    .frm-btnwrap.flex-start
      button.btn.btn-primary
        span Submit
        em.fa-regular.fa-long-arrow-right
```

### Form + icon composition

When a form subtree also has icon TEXT nodes (`font: icon|icon2|icon3`, or `ty` containing Font Awesome):

1. Keep `.wrap-form > .wpcf7-form`; adapt fields to Figma — do not blind-copy `+formSample()`.
2. Field-level icons: `i.fa-solid.fa-*` / `i.fa-brands.fa-*` / `i.material-symbols-outlined` inside the relevant `.form-group` — never `div.body-*`.
3. Submit: prefer `+btn1`–`+btn6` when the INSTANCE matches; otherwise `button.btn` with `span` + `i.fa-*`.
4. Icon rules from typography override form field text styling — icons are never typography nodes.

## Indentation and Formatting

| File type | Indentation |
|-----------|-------------|
| Pug | Tabs |
| Sass | Tabs |
| JavaScript | Tabs |
| JSON | 2 spaces (extract output) |
| HTML output | Tabs (from gulp-pug pretty) |

## Git and Dependencies

- **Never** modify `package.json` versions without approval (agent rule)
- **Never** edit `json/system-design.json` during coding — run `npm run extract` upstream
- **Never** patch `tailwind.config.js` or `generated/*` from memory — sync via `npm run extract` then `npm run tokens`

## Animation Conventions

| Class | Trigger |
|-------|---------|
| `.fd-up`, `.fd-down` | ScrollReveal on scroll |
| `.text-fd-up` | Swiper slide change |
| `.zoom-in` | CSS hover on images |
| `.transition` | 0.4s ease-in-out |

Optional: `data-delay='200'` (×200ms increments).

## Responsive Conventions

- Mobile-first: base styles for mobile, `lg:` / `xl:` for desktop
- Primary desktop breakpoint: `lg:` (1024px)
- Grid gutters change at 1024px
- No responsive typography — fluid classes handle scaling
- Complex layout shifts in section Sass `@media` blocks

## Accessibility

- Meaningful `alt` on content images
- `aria-label` on icon-only interactive elements
- Semantic headings hierarchy (`h1` once per page)
- `button type='button'` for non-submit actions
- Form labels associated with inputs

## Reuse Priority

Before creating new markup, check in order:

1. `automation/reference/snippets/` — structural template for new pages
2. `src/modules/mixin.pug` — mixins
3. `src/components/` — shared components
4. Existing `src/modules/{page}/` sections
5. `src/core/design-system/manifest.json` — component map

## Anti-Patterns Summary

| Never | Instead |
|-------|---------|
| Hex in Pug | Tailwind color token / `manual-fill-tokens.json` |
| `md:text-*` on copy | `.heading-*` / `.body-*` |
| > 6 utilities in Pug | Section Sass |
| BEM `__` `--` | Generic nested children |
| Throwaway `.wrap`/`.inner` for gap/align only | Utilities on `.col` / `.list` / `.card` / content |
| Swapped `primaryAxis` / `counterAxis` | `justify-*` = primary, `items-*` = counter (swap with VERTICAL) |
| Force no-`al` float into `.row`/`.col` | `.relative` + `.absolute` + `clamp:` offsets |
| CSS class JS hooks (new) | `data-js-*` attributes |
| Page styles in `src/core/` | Module `index.sass` |
| `@import` in Sass | Add to gulp source list |
| Custom `.grid` class + `@apply grid` | Use `.list` or `.wrapper` |
| Duplicate mixins | Reuse `mixin.pug` |

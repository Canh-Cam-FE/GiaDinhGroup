# JavaScript Guide

## Load Architecture

JavaScript loads in two bundles plus one CDN script:

```
1. videojs-youtube (CDN, unpkg)     ← video player extension
2. core.min.js                    ← vendor globals (jQuery, GSAP, Swiper, etc.)
3. main.min.js                    ← app code (esbuild IIFE bundle)
```

Vendor scripts are defined in `config.json` and concatenated by `_gulptasks/core-js.js`.
App code is a single ES module tree rooted at `src/js/main.js`, bundled by esbuild.

## Entry Point: `src/js/main.js`

Boot sequence on `DOMContentLoaded`:

```js
safeInit(initViewport, "viewport");   // CSS var --scrollbar-width
safeInit(initNav, "nav");             // mobile menu, search
safeInit(initUI, "ui");               // legacy tabs, accordions, filters
safeInit(initEffects, "effects");     // ScrollReveal, animations
safeInit(initMisc, "misc");           // miscellaneous widgets
safeInit(swiperInit, "swiper");       // all Swiper instances
safeInit(initDataJsTabs, "data-js-tabs");  // data-js-action='switch-tab' (new tabs)
safeInit(initHome, "home");           // homepage hooks (currently empty)
safeInit(initWork, "work");           // work page hooks

initEvents({ onScroll: handleScroll });  // throttled scroll listener
```

**Design intent** (from file comments):

- `main.js` = boot sequence only
- Feature logic lives in `modules/`
- No large DOM selector blocks in main.js

## Utilities: `src/js/utils.js`

Shared helpers — modules import from `../utils`, never from each other's internals.

### Exports

| Export | Purpose |
|--------|---------|
| `CONFIG` | `{ breakpoint: 1200, scrollThreshold: 100, debug: false }` |
| `$` | `document.querySelector` shorthand |
| `$$` | `querySelectorAll` → Array |
| `throttle(fn, wait)` | Rate-limit function calls |
| `debounce(fn, wait)` | Delay function until pause |
| `safeInit(fn, name)` | try/catch wrapper with error logging |
| `initEvents({ onScroll, onResize })` | Register throttled scroll / debounced resize |

## Module Reference

### `viewport.js`

Sets `--scrollbar-width` on `:root` = `window.innerWidth - documentElement.clientWidth`.

Drives `--design-vw` for pixel-perfect fluid CSS. Runs on load, resize, and via `ResizeObserver`.

### `nav.js`

Header interactions:

- `.site-menu-toggle` → toggle `.mobile-nav-wrap.is-open`, hamburger `.is-active`, `body.overlay-bg`
- `.close-menu` → close mobile nav
- `.search-toggle` → toggle `.searchbox.is-open`
- Click-outside closes menu and search

Uses CSS class selectors (legacy pattern).

### `ui.js`

Generic UI widgets:

| Feature | Selectors | Behavior |
|---------|-----------|----------|
| Mobile filter | `.filter-toggle`, `.mobile-filter-wrap` | Open/close filter sheet |
| Accordion | `.toggle-item .title` | Toggle `.is-toggle` on parent |
| **Tabs (new)** | `button[data-js-action="switch-tab"]` → `[data-tab]` panels | `initDataJsTabs()` — show/hide panels, `aria-selected` / `aria-expanded`, `swiper.update()` on reveal |
| Tabs (legacy) | `.tab-nav a[data-type]` → `#tab-id` | `initUI()` — show/hide `.tab-item` panels per section |
| Read more | `.read-more-wrap`, `.btn-read-more` | Truncate/expand `.article` height |
| Dropdown | `.drop-menu .icon` | Toggle `.active` on dropdown |
| Side nav | `.side-nav-mobile .title-nav` | Toggle side nav visibility |
| Hover bg | `.section-hover .item-bg[data-src]` | CSS variable `--bg-hover` swap |

#### Tabs — required standard for new work (`initDataJsTabs`)

**All new tab UIs must use `data-js-action='switch-tab'`** — not `data-type`. Handler: `initDataJsTabs()` in `ui.js`, registered in `main.js` after `swiperInit`.

Gold-standard markup: `automation/reference/snippets/modules/tabs-example/index.pug`

```pug
button(
  type='button'
  role='tab'
  aria-selected='true'
  aria-controls='example-tab-panel-1'
  data-js-target='example-tabs'
  data-js-action='switch-tab'
  data-tab='example-tab-panel-1'
)
  span.heading-7 Tab one

.panel#example-tab-panel-1(
  role='tabpanel'
  data-js-target='example-tabs-panel'
  data-tab='example-tab-panel-1'
)
  div.body-2 Panel copy

.panel#example-tab-panel-2(role='tabpanel' hidden data-tab='example-tab-panel-2')
  div.body-2 Panel two
```

- `data-tab` on the trigger must match the panel's `data-tab` or `id`.
- `initDataJsTabs` toggles `hidden`, syncs `aria-selected` / `aria-expanded`, and calls `swiper.update()` on any `.swiper` inside the revealed panel.

#### Tabs — legacy (existing pages only; do not extend)

```pug
.tab-nav
  ul
    li
      a(href="javascript:;" data-type="tab-block-1")
.tab-item.active#tab-block-1
.tab-item#tab-block-2
```

`data-type` value must match panel `id`. Initialized per `section` scope inside `initUI()`. Preserve when editing legacy modules; never add new `data-type` tab markup.

### `scroll.js`

Exports `handleScroll()` (registered via `initEvents`):

- Toggles `body.minimize` when `scrollY > CONFIG.scrollThreshold` (100px)
- Shows `.back-to-top` when `scrollY > 300`
- Back-to-top click → smooth scroll to top

Also contains `initStickyElements()` with scrollToFixed for news detail social bar (uses jQuery).

### `swiper.js`

Large module (~600 lines). Initializes Swiper carousels across the site.

Key behaviors:

- GSAP ScrollTrigger registration
- Video.js player init for `.video-js` elements
- Lozad lazy-load trigger on slide change
- `window.triggerFadeUp(slide)` for `.text-fd-up` animations
- Auto `slidesPerGroup` calculation
- Multiple Swiper config presets for different section patterns

Depends on globals: `Swiper`, `gsap`, `ScrollTrigger`, `lozad`, `videojs`.

### `effect.js`

Third-party effect glue:

- **ScrollReveal** on `.fd-up`, `.fd-down` (once, 1000ms duration)
- Delegates to `animations.js` for GSAP-based effects
- Fancybox/lozad init may also run here or in `libs.js`

### `libs.js`

Thin wrappers (not currently registered in `main.js` — available for use):

- Fancybox bind on `[data-fancybox]` selectors
- Lozad observe on `.lozad` elements

> Note: `initLibs` exists but is **not** called from `main.js`. Lozad/Fancybox may be initialized elsewhere (`effect.js`, inline in swiper).

### `home.js` / `work.js`

Page-specific hooks. `initHome()` is currently an empty function — placeholder for homepage-only JS.

### `misc.js`

Catch-all for small site-wide behaviors not fitting other modules.

### `animations.js`

GSAP animation sequences imported by `effect.js`.

## Vendor Globals (`core.min.js`)

Available as window globals after `core.min.js` loads:

| Global | Source |
|--------|--------|
| `$` / `jQuery` | `src/plugins/jquery.js` |
| `Fancybox` | `@fancyapps/ui` |
| `lozad` | `src/plugins/lozad.js` |
| `gsap` | `src/plugins/gsap.js` |
| `ScrollTrigger` | `src/plugins/scrollTrigger.js` |
| `ScrollReveal` | `src/plugins/scrollreveal.js` |
| `Swiper` | `src/plugins/swiper.min.js` |
| `Counter` | `src/plugins/counter.js` |

Additional plugins in `src/plugins/` loaded on demand or referenced in modules:

- `SplitText`, `ScrollSmoother`, `ScrollToPlugin`, `ScrambleTextPlugin3` (GSAP plugins)
- `image-compare.js`, `youtube.js`, `videojs.js`, `mapping.js`

## Event System

### Boot events

```js
// main.js
document.addEventListener("DOMContentLoaded", () => { ... });
initEvents({ onScroll: handleScroll });
```

### Scroll

Throttled to 100ms via `utils.throttle`.

### Resize

Available via `initEvents({ onResize })` — debounced 300ms. Not used in current `main.js`.

### Click delegation

`ui.js` uses `document.addEventListener("click", ...)` for tabs and read-more — event delegation pattern.

## DOM Hook Conventions

### Required for new tabs (`data-js-action='switch-tab'`)

Fully wired via `initDataJsTabs()` in `ui.js`. This is the **only** tab pattern to use in new modules.

```pug
button(type='button' data-js-action='switch-tab' data-tab='panel-id' role='tab' aria-selected='false')
.panel(role='tabpanel' data-tab='panel-id' hidden)
```

See `automation/reference/snippets/modules/tabs-example/index.pug` and `automation/agent-rules/07-code-templates.md`.

### Other preferred hooks (new code)

```pug
button(type='button' data-js-target='services-tabs' data-js-action='open-panel')
.swiper(data-js-target='services-slider')
```

```js
document.querySelectorAll("[data-js-target='services-tabs']")
```

### Legacy (existing code — do not extend)

| Pattern | Used in |
|---------|---------|
| CSS classes (`.site-menu-toggle`, `.tab-nav a`) | `nav.js`, `ui.js` |
| `data-type="tab-block-1"` on `.tab-nav a` | Legacy `.tab-item` panels only — **replaced by `data-js-action='switch-tab'` for all new work** |
| `data-swiper` attributes | Swiper config |
| `data-fancybox` | Fancybox galleries |
| `data-src` on `.lozad` images | Lozad lazy load |

Footer back-to-top uses `data-js-action='back-to-top'` (newer pattern) but handler is in `scroll.js` via class `.back-to-top`.

## Adding New JavaScript

### 1. Create module

```js
// src/js/modules/services.js
import { $ } from "../utils";

export function initServices() {
  const tabs = document.querySelectorAll("[data-js-target='services-tabs']");
  // ...
}
```

### 2. Register in main.js

```js
import { initServices } from "./modules/services";
// inside DOMContentLoaded:
safeInit(initServices, "services");
```

### 3. Rebuild

Gulp watches `src/js/**/*.js` → rebuilds `main.min.js` → BrowserSync reload.

## Module Boundaries

| Module | Owns | Does NOT own |
|--------|------|--------------|
| `nav.js` | Header menu, search | Tabs, sliders |
| `ui.js` | Tabs, accordions, filters, read-more | Navigation |
| `swiper.js` | Carousel init, video players | Menu |
| `scroll.js` | Scroll-triggered UI states | Component widgets |
| `effect.js` | ScrollReveal, GSAP effects | Business logic |
| `viewport.js` | CSS custom properties only | DOM manipulation |

## jQuery Usage

jQuery is available globally. Used in:

- `ui.js` — `.section-hover` background swap
- `scroll.js` — `scrollToFixed` plugin
- `swiper.js` — some DOM queries

New modules should prefer vanilla JS via `$`/`$$` helpers from `utils.js`.

## Error Handling

`safeInit(fn, name)` wraps each module init:

```js
try {
  fn();
} catch (e) {
  console.error(`[INIT FAIL]: ${name}`, e);
}
```

One module failure does not block others.

## Build Details

| Aspect | Value |
|--------|-------|
| Bundler | esbuild via gulp-esbuild |
| Format | IIFE (no `import`/`export` in browser) |
| Target | ES2020 |
| Sourcemaps | Yes (`.map` alongside output) |
| Output | `dist/js/main.min.js`, `scripts/main.min.js` |
| Tree | All imports resolved from `main.js` transitively |

## Debugging

Set `CONFIG.debug = true` in `utils.js` to log `[INIT OK]: {name}` for each module.

Sourcemaps enable original file/line in browser DevTools.

## When to Write JS

Per project rules — JS only when layout requires interaction:

| Needs JS | Examples |
|----------|----------|
| Yes | Sliders, tabs, accordions, mobile menu, scroll effects |
| No | Static hero, text sections, simple grids |

If adding interaction to a new Figma section, prefer extending existing modules (`initDataJsTabs` / `ui.js`, `swiper.js`) before creating new files.

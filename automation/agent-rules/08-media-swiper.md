# Images & Swiper sliders

## Images

```pug
.img.zoom-in.overflow-hidden
  a.img-ratio(class='ratio:pt-[292_440]')
    +FooImg('./img/…', 'rounded-2')
```

**Repo reality:** the current `+FooImg()` mixin in `src/modules/mixin.pug` accepts `(url, className)` and currently outputs `alt=""`. Do not assume the second argument is alt text.

- If you need meaningful content-image alt text from Figma/JSON, prefer explicit `img(...)` / `picture` markup, or update the mixin intentionally as part of the task.
- Reuse `+FooImg()` only when its current API matches the requirement.

## webp

`+FooImg()` auto-wraps in `<picture>` with a `type="image/webp"` `<source>` whenever
`url` is a **local** `.png`/`.jpg`/`.jpeg` — it derives the webp path by swapping the
extension (`./img/section/hero.jpg` → `./img/section/hero.webp`). Remote URLs
(`http(s)://`), `.svg`, `.gif`, and a `.webp` passed directly are left as a plain
`<img>` — the mixin does not check that the sibling file exists.

**Export both files with the same basename.** `+FooImg('./img/section/hero.jpg')`
requires `./img/section/hero.webp` to actually exist alongside `hero.jpg` in
`src/img/` (`.webp` is already in the `copyImage` glob, so it ships to `dist/img`
and `img/` unchanged — no build step converts it). If you only have the original
format, either export a webp alongside it or accept the `<img>`-only fallback the
mixin gives you automatically for anything it can't pair.

**Hand-authored `picture` blocks** (art-direction / mobile vs. desktop) should list
the webp source first, one `<source>` per breakpoint, then the fallback `<img>`
last:

```pug
picture
  source(type='image/webp' media='(max-width: 767px)' srcset='./img/section/mobile.webp')
  source(media='(max-width: 767px)' srcset='./img/section/mobile.jpg')
  source(type='image/webp' media='(min-width: 768px)' srcset='./img/section/desktop.webp')
  source(media='(min-width: 768px)' srcset='./img/section/desktop.jpg')
  img(src='./img/section/desktop.jpg' alt='Description' loading='lazy')
```

Browsers evaluate `<source>` tags in order and pick the first one that matches
both `type` and `media` — webp sources must come before the same-breakpoint
fallback, not after.

## Swiper / slider

```pug
section.home-gallery
  .swiper
    .swiper-wrapper
      .swiper-slide
        // content
    .swiper-pagination
  +SlideBtn()
```

**Repo note:** existing legacy sections may or may not use helper classes like `.init-swiper`. The reliable pattern is the Swiper DOM structure plus whatever `swiper.js` expects in the current codebase. Do not re-init Swiper if `swiper.js` already covers the pattern.

## Swiper inside hidden panels

Swipers initialized while their panel is `hidden` (tabs, accordions) often measure **0 width** and render incorrectly.

- After a tab switch, `swiper.update()` **must** be called on any Swiper inside the revealed panel.
- Our `initDataJsTabs` in `src/js/modules/ui.js` handles this automatically for `data-js-action='switch-tab'` (gold standard: `automation/reference/snippets/modules/tabs-example/`).
- Legacy `.tab-nav a[data-type]` tabs: call `swiper.update()` in the tab click handler if you add new carousels inside `.tab-item` panels.
- Prefer Swiper `observer: true` and `observeParents: true` (already set on `.init-swiper` in `swiper.js`) as a safety net — still call `update()` on reveal for pixel-perfect layout.

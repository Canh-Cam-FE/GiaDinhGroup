# Output checklist (Pre-Flight Checklist)

> **Enforcement rule:** print this checklist as a completed markdown checklist (`- [x]` / `- [ ]`) in your response **before** outputting any Pug/Sass/JS code block. Verifying each item first — instead of writing code and hoping it complies — is what actually prevents the violations below; a mental note is not enough.
>
> You must begin your final response with the exact words: "### Pre-Flight Verification" followed immediately by the checklist.
>
> This file (`10-checklist.md`) **is** the Pre-Flight Checklist. `11-appendix.md` is a separate reference (JSON schema, breakpoints, transitions) — do not confuse the two, and do not substitute one for the other.

## Coding phase

- [ ] `json/{page}.json` walked; section list + `ty`/`fi`/`tx` mapping documented
- [ ] Module saved to the correct `manifest.json` canonical folder path (`src/modules/{page}/{section}/` per `automation/reference/page-contract.json` — manifest line count === folder count === page include count)
- [ ] `SHARED_REF` nodes (`header`, `footer`, `top-banner`, `global-breadcrumb`, etc.) explicitly skipped or mapped to the correct `include` — not rendered as duplicate markup
- [ ] Zero `UNRESOLVED_TEXT` nodes (every TEXT has a `ty` token or icon `font` — see `02-typography.md` resolution order step 5)

## Layout compilation

- [ ] Visual verification done: rendered at 1920px outer width, diffed against Figma export, spacing within ±2px
- [ ] Auto-layout alignment correct: `justify-*` mapped from `primaryAxisAlignItems`, `items-*` from `counterAxisAlignItems` — axes not swapped
- [ ] Absolute/overlapping nodes (no `al`) positioned with `.relative`/`.absolute` + `clamp:` offsets — not forced into `.row`/`.col`
- [ ] `REPEAT` nodes unrolled exactly `count` times from `sample`; `LINE` nodes rendered as `<hr>` — not skipped or flattened into static divs
- [ ] Figma component instances mapped to the correct mixins (`+btn1`–`+btn6`, `+formSample()` for form blocks, card/item mixins, etc.) per `04-components.md` — including mandatory form-wrapper detection
- [ ] `index.pug` + `index.sass` with matching root class (new work follows `06-project-structure.md` naming; legacy modules may retain their existing root if the task is edit-only)
- [ ] **New pages:** one `section.{page}-{section}` root per module file — see `automation/reference/page-contract.json`
- [ ] **New pages:** `src/pages/{slug}.pug` includes one module per manifest line — no `section.*` in the page entry
- [ ] Typography: `.heading-*` / `.heading-serif-*` on `h1`–`h4`/`span` only; `.body-*` on `div` or `div.desc` — never `p.heading-*` or `p.desc`; no `md:text-*` on copy
- [ ] Semantic HTML tags and CSS classes match `TYPOGRAPHY_TABLE` (from `generated/agent-lookup.json`) for each `ty` — no guessed or contradictory tags
- [ ] Icon TEXT nodes (no `ty`, `font: icon|icon2|icon3`) rendered as `i.fa-solid|fa-brands.fa-*` — not `div.body-*`
- [ ] Icon glyphs (`<i>`) have color utilities applied **directly on the `<i>` tag** — not via parent wrapper inheritance
- [ ] `.desc` / `.zone-desc` on `div` only for both single-line and multi-line copy — no `p.desc`, no `p.zone-desc`, no nested `p`
- [ ] Solid fills verified via `generated/agent-lookup.json` (`fi`) → utility present in `generated/design-tokens.js` / `DESIGN_LOOKUP` after `npm run tokens` — not from empty `system-design.json` FILL shells (see `03-colors-gradients.md`)
- [ ] Sass solid colors use `@apply bg-{token}` / `@apply text-{token}` — not `theme('colors.{token}')` (utility names ≠ theme paths; see `03-colors-gradients.md`)
- [ ] `Gradient/*` fills implemented in section Sass or theme `bg-gradient-*` — no arbitrary hex / fake color utilities in Pug
- [ ] `.row` / `.col` for multi-column layouts
- [ ] ≤ 6 Tailwind classes per element
- [ ] `clamp:` / `rem:` / `ratio:` for fluid layout sizing
- [ ] Reused mixins/components where instances match
- [ ] JS uses `data-js-target` / `data-js-action` (or `data-js-*`) — not CSS class selectors
- [ ] Generic nested child classes only (`.wrap`, `.box`, `.inner`, `.card`, `.item`, `.list`, `.img`, `.content`, `.media`, `.panel`) — no numbered suffixes, no BEM `__` / `--`, no section prefix on children
- [ ] `bodyClass`: `page {page}-page` (e.g. `page home-page`, `page services-page`)
- [ ] Images: `alt`, lazy load, `picture` when mobile art differs
- [ ] Local `.png`/`.jpg` images have a same-basename `.webp` sibling exported into `src/img/` so `+FooImg()`'s automatic `<picture>`/webp source actually resolves (see `08-media-swiper.md`)
- [ ] Semantic HTML (`section`, `nav`, `h1`–`h4`, `button`/`a.btn`)

# Playwright Testing — Plan

## Goal

Add browser-driven tests for **user-observable behavior** — things a human
clicking the built site would notice breaking: menus that don't close, tabs
that don't switch, forms that submit nothing, console errors, links that go
to the wrong domain. This is a different job from every audit that exists
today:

| Tool | Checks | Source of truth |
| --- | --- | --- |
| `audit:modules` | folders/includes exist | `meta.moduleRegions` |
| `audit:typography` | class/copy matches | page JSON `ty` |
| `audit:layout` | gap/padding/axis matches | page JSON `b`/`al` |
| **Playwright (this plan)** | **the page works when clicked** | the rendered `dist/*.html` + `src/js/**` |

None of the existing audits load a page into a browser or run any JavaScript.
This plan is the first thing in the pipeline that does.

## Non-goals

- Not a pixel/layout comparison — that's `audit:layout`
  ([`docs/layout-geometry-audit-plan.md`](./layout-geometry-audit-plan.md)).
  Playwright asserts DOM **state** (`class` toggled, element visible/hidden,
  `aria-*` attribute correct), not `getBoundingClientRect()` numbers.
- Not a replacement for `audit:typography` — Playwright does not read Figma
  JSON and never asserts what the copy *should* say.
- Not cross-browser matrix testing to start. One pinned Chromium, matching the
  "same rendering environment locally and in CI" principle already established
  for `docs/visual-layout-confirmation-plan.md`.

## Why now is an awkward time, and what that changes about the plan

Every module in every page is still the scaffold stub — confirmed by
`audit:layout` (`27× REGION_NOT_IMPLEMENTED` across all 6 pages) and by
`audit:typography` (all 6 pages `FAIL`). `dist/index.html` and `dist/about.html`
currently have **zero** `.swiper-wrapper` and **zero** `data-fancybox` elements
in the actual build output. A content-shaped test suite (assert the news
carousel has N slides, assert the gallery lightbox opens) would be testing
markup that doesn't exist yet and would report false blockers exactly like a
reference-image diff would.

So this plan is split the same way the layout audit was:

- **Phase 0** tests the site chrome and JS behaviors that are real *today* —
  header, mobile nav, search, the two tab systems, the accordion, read-more —
  because none of that content depends on a module being built.
- **Phase 1** adds one spec per content region as it stops being a scaffold,
  gated on the same anchor the layout audit uses (`REGION_NOT_IMPLEMENTED`
  clearing for that region).

## What research surfaced (write these as the first Phase 0 tests)

Loading the actual chrome in a browser and reading `src/js/modules/*.js`
against the current build turned up four concrete, real bugs — good evidence
this feature earns its keep immediately, not hypothetically:

1. **The language switcher links to the wrong site.**
   `src/components/header/header.pug` renders WPML markup pointing to
   `https://worldhotelslongbeach.com/` — a hotel site with no connection to
   this project. Leftover boilerplate, never localized.
2. **A remote script tag is duplicated.** `src/pages/_layout.pug` loads
   `https://unpkg.com/videojs-youtube/dist/Youtube.min.js` twice.
3. **A dead selector.** `nav.js` queries `.close-search` and wires a click
   handler to it; `header.pug` never renders an element with that class. No
   crash (`?.addEventListener` guards it), but the button doesn't exist, so
   the search overlay has no visible close control other than click-outside.
4. **Two independent tab systems coexist** — legacy `.tab-nav a[data-type]`
   and the "gold standard" `data-js-action="switch-tab"` — with different
   markup contracts. Both need coverage; a test suite that only knows one will
   silently miss regressions in the other.

None of this needed the site to be finished. It needed a browser.

## Dependency choice: `@playwright/test`, browsers outside the repo

This repo commits `node_modules` to git (20,906 of 21,373 tracked files), which
already ruled out `puppeteer`/`playwright` full packages for
`docs/layout-geometry-audit-plan.md`'s Phase 1 in favor of `puppeteer-core`
against a system browser. Playwright's browser binaries work differently and
don't reopen that problem: `@playwright/test`'s own npm package carries no
bundled browser; browsers are fetched by a separate `playwright install`
step into a **global cache outside the project**
(`~/Library/Caches/ms-playwright` on macOS, `~/.cache/ms-playwright` on Linux)
— never into `node_modules`, never committed. So:

- Add `@playwright/test` as a devDependency (small package, no binary payload).
- Run `npx playwright install chromium` once per machine/CI runner — not part
  of `npm install`, not part of the repo. Document it like the existing
  "First time" `README.md` step, not as a build script.
- Do **not** add plain `playwright` (pulls the same browsers automatically on
  `npm install`, which is a surprise network+disk cost inside a repo that
  otherwise avoids that) — use `@playwright/test`, which does not.

## Proposed files

```text
playwright.config.js              # CommonJS — matches tailwind.config.js / gulpfile convention
tests/
├── e2e/
│   ├── chrome.spec.js            # nav, search, click-outside, console/network hygiene
│   ├── tabs-legacy.spec.js       # .tab-nav a[data-type]
│   ├── tabs-datajs.spec.js       # data-js-action="switch-tab" + swiper.update() on reveal
│   ├── accordion.spec.js         # .toggle-item .title
│   └── read-more.spec.js         # .read-more-wrap, responsive height thresholds
└── fixtures/
    └── dist-server.js            # spins up a static file server on dist/, matches file:// vs http concerns below
```

Keep `tests/` out of `automation/` — this is not part of the Figma → JSON →
Pug pipeline; it runs against the built `dist/` output the same way a real
visitor would.

## Serving strategy

`dist/*.html` uses relative `./css/`, `./js/`, `./img/` paths, so
`docs/layout-geometry-audit-plan.md`'s Phase 1 could load it over bare
`file://`. Playwright cannot: `ResizeObserver`/`fetch`-based lazy-load code and
the remote font/script tags behave differently (some browsers restrict
`file://` fetches and CORS). Serve `dist/` on a fixed local port for the test
run only, and pick a port that cannot collide with `npm start`'s BrowserSync
server (`:8000`, per `_gulptasks/watch-shared.js`) — e.g. `:4173`. Start it in
`playwright.config.js`'s `webServer` option so `npx playwright test` is
self-contained and `npm start` is never running from that command.

## Network dependencies to handle deliberately

`src/pages/_layout.pug` loads two remote origins on every page:
`fonts.googleapis.com`/`fonts.gstatic.com` and `unpkg.com`. Left alone, tests
are flaky offline and slow online. Route and abort (or stub) both in a shared
fixture, and assert nothing else escapes to the real network — that assertion
is itself a useful regression test: it will catch the next accidentally-added
remote dependency the same way it caught the duplicate Youtube script.

## Determinism requirements

Reusing the principle from `docs/visual-layout-confirmation-plan.md` rather
than rediscovering it:

- Pin one Chromium version (`@playwright/test`'s bundled Chromium, installed
  once — do not test against "whatever Chrome happens to be on this machine").
- `src/js/modules/nav.js`/`ui.js` use `document.body` class toggles and
  `element.style.display` directly (not CSS transition end events), so
  Playwright's auto-waiting on visibility is sufficient — no manual `sleep`.
- `ui.js`'s legacy tab switch fades content in via a hand-rolled
  `requestAnimationFrame` opacity loop (`initUI()`, the `fade()` closure).
  Assert the **end state** (`el.classList.contains("active")`,
  `getComputedStyle(el).display`), not a mid-fade opacity value.
- `work.js` wires `ScrollReveal` (`sr.reveal(...)`) when the global exists.
  ScrollReveal is scroll-triggered and not part of Phase 0's scope (no page
  currently renders `.work-list`) — Phase 1 must decide whether to assert the
  revealed end-state only, never a mid-animation frame.
- `--scrollbar-width` (`viewport.js`) defaults to `0` in this repo's own
  config (`automation/config/layout-rules.json` → `scrollbarFallbackPx: 0`),
  so assert the CSS variable is **set to a number**, not a specific nonzero
  value — headless Chromium's scrollbar width is not guaranteed and 0 is
  already the documented fallback, not a failure.

## Phase 0 — Chrome & shared UI (buildable now)

| Spec | Asserts |
| --- | --- |
| `chrome.spec.js` | Page loads with zero console errors; zero requests to unexpected origins (allow-list fonts/unpkg via the routed fixture, fail on anything else); every internal `href` starting with `javascript:;` is logged as a known-placeholder, not silently ignored — see open question below on whether that becomes a hard failure |
| `chrome.spec.js` | `.site-menu-toggle` click → `.mobile-nav-wrap` gains `is-open`, `body` gains `overlay-bg`; clicking outside closes it |
| `chrome.spec.js` | `.search-toggle` click → `.searchbox` gains `is-open`; clicking outside closes it (documents the missing `.close-search` button as a known gap rather than a silent no-op) |
| `tabs-legacy.spec.js` | Clicking `.tab-nav a[data-type]` shows the matching `#id` panel, hides siblings, moves `.active` on the nav `<li>` |
| `tabs-datajs.spec.js` | Clicking `button[data-js-action="switch-tab"]` sets `aria-selected`/`aria-expanded` correctly, reveals the matching panel, and — when the panel contains a `.swiper` — calls `swiper.update()` (assert via `el.swiper.params` staying defined / a spy on the exposed instance, not a pixel check) |
| `accordion.spec.js` | Clicking `.toggle-item .title` adds `is-toggle` to that item and removes it from siblings (only one open at a time, per `ui.js`) |
| `read-more.spec.js` | Below the height threshold (300px mobile / 400px desktop per `ui.js`), `.btn-read-more` gets `.hide`; above it, clicking toggles `.is-expanded` and sets `article.style.height` |

## Phase 1 — Per-region content specs (gated on real modules)

Once a region's `REGION_NOT_IMPLEMENTED` clears in `audit:layout`, add its
spec. Do not write these earlier — a spec against scaffold markup is a false
signal, the same trap `docs/visual-layout-confirmation-plan.md`'s reference
images fell into.

| Region example | Once built, assert |
| --- | --- |
| `home/lien-he` (contact form) | Client-side validation blocks empty required fields; submit is intercepted/stubbed (there is no live CF7 endpoint) rather than making a real network call in CI |
| Any Swiper section | Next/prev nav moves `swiper.activeIndex`; pagination bullet count matches slide count |
| Any Fancybox gallery | `data-fancybox` click opens the overlay; `Escape` closes it |
| Mobile-art `<picture>` sections | The `<source media>` that matches the test viewport is the one actually requested (ties into the webp work already done in `+FooImg()`) |

## Edge cases

- **`javascript:;` placeholder links are everywhere in the current header/nav**
  (`header.pug`'s nav items, footer likely the same). Do not fail on them by
  default — that would fail on every page today — but do log them, so the
  count trends to zero as real routes land. Escalate to a hard failure only
  for a page-specific allow-list once a page's nav is real.
- **Remote fonts/scripts** — always routed/stubbed per the network section
  above; never rely on live `fonts.googleapis.com`/`unpkg.com` in CI.
- **ScrollReveal / GSAP ScrollTrigger animations** (`work.js`, `swiper.js`) —
  assert end-state after `waitForFunction`, never a timed `sleep`; skip
  ScrollReveal-gated assertions entirely while `.work-list` doesn't exist on
  any real page (it currently doesn't).
- **Two tab systems** — a spec must name which one it targets; do not write a
  single "tabs" spec that assumes only one markup contract exists.
- **`file://` vs served `dist/`** — always serve; some lazy-load/network
  behavior differs under `file://` and would pass locally, fail in CI, or vice
  versa.
- **Viewport width for fluid CSS** — default the test viewport to 1920×1080 to
  match `designBaseWidthPx` (`automation/config/layout-rules.json`) so
  `clamp()` values are at their deterministic max arm; add `md`/`lg` (768/1024,
  per `automation/agent-rules/11-appendix.md` Appendix B) as a second project
  only for specs that assert breakpoint-specific behavior (mobile nav open,
  `<picture>` `media` selection).
- **CI does not exist yet.** There is no `.github/workflows/` (or any CI YAML)
  in this repo — the existing `ci:tokens`/`ci:typography`/`ci:modules`/`ci:layout`
  npm scripts are already unwired to any pipeline. Adding a `ci:e2e` script
  here does not by itself make it run anywhere; that is a separate task.
- **`npm run prod` must run first.** Playwright tests the built `dist/`, not
  `src/`. A stale `dist/` (mismatched with current `src/`) will pass tests
  against markup that no longer matches the source — the same staleness class
  every other audit in this repo already guards against with `:check` variants.

## Proposed commands

```bash
npx playwright install chromium   # once per machine/CI runner, not part of npm install
npm run test:e2e                  # npm run prod && playwright test
npm run test:e2e:ui               # playwright test --ui, for authoring specs against a live dist/
npm run ci:e2e                    # prod → audit:modules → test:e2e (content specs are meaningless on a structurally broken page)
```

## Reviewer checklist

- [ ] No spec asserts against `src/` — only against `dist/*.html` served over
      HTTP, matching what a real browser/CI would see.
- [ ] Every remote origin (`fonts.googleapis.com`, `fonts.gstatic.com`,
      `unpkg.com`) is routed/stubbed; no spec depends on live network.
- [ ] No spec uses a bare timed wait; all waits are on a DOM condition
      (visibility, class, attribute).
- [ ] Phase 1 specs only exist for regions where `audit:layout` no longer
      reports `REGION_NOT_IMPLEMENTED`.
- [ ] Legacy tabs and `data-js-action` tabs each have their own spec — neither
      is assumed to cover the other.
- [ ] `@playwright/test` browsers are never committed; `node_modules` size is
      unaffected by this feature.
- [ ] The four bugs found during research (WPML domain, duplicate script tag,
      dead `.close-search` selector, and the js-action tab / legacy tab split)
      are each either a passing regression test or a tracked known-gap, not
      silently ignored.

## Acceptance criteria

1. `npx playwright install chromium && npm run test:e2e` runs green against
   the current `dist/` for every Phase 0 spec.
2. Toggling `.site-menu-toggle` in a real browser and asserting the opposite
   in the spec (comment out the click handler in `nav.js`) makes exactly that
   spec fail — proving it isn't a false-positive pass.
3. Introducing the WPML-domain bug on a clean checkout is caught by a
   dedicated assertion, not by accident.
4. Blocking `unpkg.com` and `fonts.googleapis.com` at the OS network level
   still passes the full suite (proves the network routing/stubbing is
   complete, not partial).
5. No Phase 1 spec exists yet for any region still reported as
   `REGION_NOT_IMPLEMENTED` by `audit:layout`.

## Decisions

1. **Placeholder links** — trend-only logging, never a hard failure, until a
   specific page's nav is real (per-page decision later, not a blanket rule).
2. **News page — planned, but currently blocked in Figma, not in this plan.**
   `06_Tintuc_01_Ds` / `06_Tintuc_02_Ct` do exist inside the current live
   canvas (`T TR - 22.07.2028 - ĐC 3 - Final`), which is why they first looked
   like a scoping toggle. Checking the actual export settles it: both
   artboards sit under a section literally named `CHUẨN CC - (…)`, which
   `tokenScope.excludeSectionPrefixes` in `automation/config/figma-pages.json`
   excludes on purpose, and their 163 TEXT nodes are still set in
   **Montserrat** — the retired font, not `Google Sans Flex` that every live
   page (`home`, `about`, `services-detail`, …) uses. So this isn't a config
   flip: the two artboards need to be redesigned in Figma against the current
   type system before `extract` can produce a usable `json/tintuc*.json`.
   That redesign is a Figma/design task, upstream of `figma-pages.json`
   scoping, upstream of scaffolding, upstream of this test plan. Once a
   current-system News JSON exists, it is an ordinary new page in this
   pipeline (`extract` → `tokens` → `scaffold:modules` → `agent` → the three
   audits) and its own Phase 1 Playwright specs — no special-casing needed
   here.

## Sequence

1. `@playwright/test` devDependency + `playwright.config.js` + `dist/` static
   server fixture + network stub fixture.
2. `chrome.spec.js` — write the 4 bugs found during research as the first
   real, immediately-failing tests; fix the bugs; watch them go green.
3. Remaining Phase 0 specs (tabs ×2, accordion, read-more).
4. `test:e2e` / `test:e2e:ui` / `ci:e2e` npm scripts; reviewer checklist pass.
5. Phase 1 specs, one per region, gated on that region leaving
   `REGION_NOT_IMPLEMENTED`.
6. CI wiring — new work, since no CI exists yet for any pipeline stage.

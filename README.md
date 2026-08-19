# HTML-Mk.3

Static front-end build: **Pug → HTML**, **Sass + Tailwind CSS 3 → CSS**, **ES modules → JS** (Gulp 4).

Design tokens are extracted from Figma, resolved through a DesignTokenIR pipeline, and emitted into `generated/*`, which `tailwind.config.js` and the agent compiler consume. Nothing under `json/`, `tokens/normalized.json`, `tokens/resolved.base.json` or `generated/` is hand-edited.

More detail: [`docs/README.md`](./docs/README.md).

---

## Run order

Do these in sequence. Skipping a step leaves `generated/*` or the site stale.

| Step | Command | When |
| --- | --- | --- |
| 1 | `npm install` | First clone / after dependency changes |
| 2 | Drop updated Figma JSON into `figma/` | After a Figma re-export |
| 3 | `npm run extract` | After step 2, or when `figma-pages.json` / artboards change |
| 4 | `npm run tokens` | After extract, or any contract / picks / overrides / manual-fill change |
| 5a | `npm start` | Local site at http://localhost:8000 (does **not** refresh tokens) |
| 5b | `npm run agent -- home.json` | Coding prompt → `agent-coding-prompt.txt` (after tokens are current) |
| 6 | Implement modules under `src/modules/{slug}/` | From the prompt |
| 7 | `npm run prod` → `audit:modules` / `audit:typography` / `audit:layout` → `agent` | After each implement pass; audits feed the next prompt |
| 8 | `npm run prod` | Ship / refresh `dist/` when the page is clean |

**Typical day-to-day**

```bash
# First time
npm install && npm run tokens && npm start

# After Figma re-export
npm run extract && npm run tokens && npm start

# Code a page from Figma
npm run tokens && npm run agent -- home.json
# → open agent-coding-prompt.txt, implement modules under src/modules/{slug}/

# After implementing (or re-prompting) a page
npm run tokens:check
npm run prod
npm run audit:modules:page -- --page home
npm run audit:typography:page -- --page home
npm run audit:layout:page -- --page home
npm run agent -- home.json   # re-injects all three audit reports into the prompt
```

**Gates (optional but useful before commit)**

```bash
npm run tokens:check
npm run audit:modules
npm run audit:typography
npm run audit:layout
```

---

## Quick start

```bash
npm install
npm run tokens   # first time / after extract — regenerates generated/*
npm start        # build + serve http://localhost:8000
```

---

## The pipeline

```
figma/figma-dictionary.json          style + component name lookup
figma/figma-targets.json             the shipped pages  ← token authority

  npm run extract
    ├── json/system-design.json      every style in scope, with a usage count
    ├── json/{slug}.json             one per page artboard, incl. meta.moduleRegions
    ├── json/global.json             shared component trees
    └── json/font-style-overrides.json   duplicate-name report + suggestions

  npm run tokens
    ├── ir:build      → tokens/normalized.json      identity, grouping, collisions
    ├── ir:resolve    → tokens/resolved.base.json   one value per token
    └── emit:*        → generated/design-tokens.js
                        generated/typography.js
                        generated/agent-lookup.json

  npm start / npm run prod   → dist/
  npm run agent [page]       → agent-coding-prompt.txt
  npm run audit:modules      → json/module-structure-audit.json
  npm run audit:typography   → json/typography-audit.json
  npm run audit:layout       → json/layout-geometry-audit.json
```

### Page coding loop

After `tokens` + `prod`, run the three audits for the page you are building, then re-run `agent` so the next prompt already lists what to fix:

| Audit | Authority | What it checks |
| --- | --- | --- |
| `audit:modules` | `meta.moduleRegions` | folders, page includes, one `section.*` root per module |
| `audit:typography` | page JSON `ty` + typography contract | Pug class + compiled CSS match |
| `audit:layout` | page JSON `b` / `al` | gap, padding, flex axis, alignment vs. declared utilities |

`agent-compiler.js` injects BLOCKER/HIGH issues from both typography and layout reports into `{{AUDIT_FEEDBACK}}`. Fix highest severity first; stop after about three unchanged failure sets instead of inventing CSS offsets. Layout never overrides tokens, typography, fills, or copy — JSON remains the authority.

### What decides a token's value

`figma-targets.json` is the authority, narrowed to the canvases listed in [`automation/config/figma-pages.json`](./automation/config/figma-pages.json) with retired sections pruned. A style that only appears on a draft canvas or a superseded page never enters the IR.

When one style name carries several different values, `resolve.mjs` picks in this order:

1. **Manual override** in `tokens/overrides.json` — always wins.
2. **Harmless** — the variants are identical, collapse them.
3. **Plurality** — one value is used on strictly more nodes than the rest. Accepted, logged as `COLLISION_PLURALITY`.
4. **Tie** — no strict winner. Strict mode **fails the build** and names the token; `--lenient` accepts a deterministic fallback for local iteration.

Usage counts come from `u` on each style record in `json/system-design.json`, which counts how many nodes bind that style inside the token scope. This is why `overrides.json` is currently empty — the data breaks every conflict on its own.

---

## How tokens reach `tailwind.config.js`

`tailwind.config.js` reads three generated/config files:

| Import | Feeds |
| --- | --- |
| `generated/design-tokens.js` | `theme.extend.colors`, `theme.extend.fontFamily` |
| `generated/typography.js` | `.heading-*` / `.body-*` component classes via `addComponents`, plus `safelist` |
| `automation/config/layout-rules.json` | `rootFontSizePx`, `designBaseWidthPx`, `scrollbarFallbackPx` for the fluid `clamp()` math |

### Precedence

```js
colors:     { ...generatedTokens.colors, /* chrome-only aliases */ }
fontFamily: { /* extras */, ...generatedTokens.fontFamily } // generated WINS
```

- **Fonts** — Figma owns every family it knows about (`sans` = Google Sans Flex).
- **Colors** — generated Figma tokens are the base. Chrome-only aliases (`grey-*` ladder, `dark`, `danger`, `secondary-1`, soft `black` `#111113`) sit on top for shared UI. Do **not** replace whole groups like `secondary` with a hand-written object — that wipes IR keys (`secondary-utility-*`). `secondary-2` / `secondary-3` / `secondary-bg` come from Figma.

### Typography classes

`emit:typography` turns each resolved token into an `@apply` line, e.g.

```
.heading-3 → @apply text-30 font-semibold font-Google-Sans-Flex leading-130
```

Every part must exist in the Tailwind theme or the Sass build fails with *"The `text-N` class does not exist"*:

- `text-{px}` → `theme.extend.fontSize` (manual scale)
- `font-{weight}` → Tailwind's stock 100–900 scale
- `font-{Family-Name}` → `generated/design-tokens.js`
- `leading-{pct}` → `theme.extend.lineHeight` (manual scale, mirrored by `LEADING_SCALE` in `automation/emit/typography.mjs`)

If Figma introduces a font size or line-height outside those scales, add it to `tailwind.config.js` — the emitter buckets line-heights to the nearest existing token but does **not** invent font sizes.

---

## What is manual

Seven files are hand-maintained. Everything else regenerates.

| File | You edit it when | Notes |
| --- | --- | --- |
| [`automation/config/figma-pages.json`](./automation/config/figma-pages.json) | Figma gains, renames or retires a page; a canvas becomes live or dead | Maps artboard name → route slug and declares the token scope. **Update this first after any Figma restructure** — an unlisted artboard produces no page JSON, and extract warns about a declared artboard it cannot find. |
| [`tailwind.config.js`](./tailwind.config.js) | A new `text-N` / `leading-N` is needed, or you retire a hardcoded color | Also owns `borderRadius`, `boxShadow`, `zIndex`, `letterSpacing`, `screens` and the custom-utility plugins. |
| [`automation/contract/typography-contract.json`](./automation/contract/typography-contract.json) | A style needs a specific CSS class name or HTML tag, or you want a class with no Figma style behind it | Hand-authored and locked. Pin `family` (a real family name), never a positional `sansN` alias — those renumber on every export. |
| [`tokens/overrides.json`](./tokens/overrides.json) | `ir:resolve` reports a `COLLISION_TIE` you must break | Currently empty, which is the healthy state. `resolve.mjs` warns `STALE_OVERRIDE` if an entry targets a token that is missing or not actually in conflict. |
| [`automation/config/font-style-picks.json`](./automation/config/font-style-picks.json) | You disagree with the plurality winner for a duplicated type style | Keys starting with `_` are ignored. Copy an entry out of `_suggested` to activate it. |
| [`automation/config/manual-fill-tokens.json`](./automation/config/manual-fill-tokens.json) | A colour is used in the design with no paint style attached | Maps an orphan hex to a Figma-style key so it can become a utility. |
| [`automation/config/layout-rules.json`](./automation/config/layout-rules.json) | The design base width or root font size changes | The `coding` block documents the agent contract; it is not read at build time. |

Also manual, but source code rather than config: `src/core/tailwind/preflight.sass` (base element styles) and `src/pages/_layout.pug` (webfont `<link>` tags — **adding a family in Figma does not load it**; the font still has to be requested here or self-hosted).

---

## Commands

### Site build

| Command | Description |
| --- | --- |
| `npm start` | Gulp default: clean, build Pug/Sass/Tailwind/JS, BrowserSync on `:8000`, watch. Does **not** regenerate tokens. |
| `npm run prod` | Production build (minified CSS), no server. Writes `dist/` (+ `styles/` / `scripts/` mirrors). |
| `npm run sync` | Same as build, then FTP-deploy `dist/` and watch (uses env FTP settings). |

### Figma extract

| Command | Description |
| --- | --- |
| `npm run extract` | Reads `figma/*.json` → writes `json/system-design.json`, `json/{slug}.json` (incl. `meta.moduleRegions`), `json/global.json` and the font-style conflict report. Does **not** run the token pipeline — follow with `npm run tokens`. |
| `npm run extract:pretty` | Same, pretty-printed JSON. |

### Design tokens (DesignTokenIR)

Run after `extract` or any change to the contract, picks or overrides.

| Command | Description |
| --- | --- |
| `npm run tokens` | Full pipeline: build IR → resolve collisions → emit all `generated/*`. |
| `npm run tokens:check` | CI gate: fail if any `tokens/*` or `generated/*` file is stale. |
| `npm run ir:build` | `json/system-design.json` + contract → `tokens/normalized.json`. |
| `npm run ir:check` | Assert `tokens/normalized.json` matches a fresh build. |
| `npm run ir:resolve` | Apply collision policy + overrides → `tokens/resolved.base.json`. Fails on a tie. |
| `npm run ir:resolve:lenient` | Same, but accepts ties. Local iteration only, never CI. |
| `npm run ir:resolve:check` | Assert `tokens/resolved.base.json` is up to date. |
| `npm run emit:tailwind` | Resolved colors/fonts → `generated/design-tokens.js`. |
| `npm run emit:typography` | Resolved type metrics → `generated/typography.js` (component classes + safelist). |
| `npm run emit:agent-lookup` | → `generated/agent-lookup.json` (`ty` / `fi` lookup for agent + audit). |

Each `emit:*` has a matching `emit:*:check`.

### Agent & scaffolding

| Command | Description |
| --- | --- |
| `npm run agent` | Interactive: pick a page JSON → write `agent-coding-prompt.txt`. |
| `npm run agent -- home.json` | Non-interactive, for one page file under `json/`. |
| `npm run scaffold:modules <slug>` | Create `src/pages/{slug}.pug` + empty `src/modules/{slug}/{region}/` folders from `meta.moduleRegions`. |
| `npm run scaffold:all` | Scaffold every page JSON missing a page entry. |

### Audits

| Command | Description |
| --- | --- |
| `npm run audit:modules` | Check manifest ↔ module folders ↔ page includes, all pages. |
| `npm run audit:modules:page -- --page <slug>` | Same, single page. |
| `npm run audit:typography` | Check page JSON `ty` → Pug class → compiled CSS, all pages. |
| `npm run audit:typography:page -- --page <slug>` | Same, single page. |
| `npm run audit:layout` | Check page JSON `b` / `al` → Pug/Sass layout utilities, all pages. Writes `json/layout-geometry-audit.json`. |
| `npm run audit:layout:page -- --page <slug>` | Same, single page (merges into the existing report). |

See [`docs/layout-geometry-audit-plan.md`](./docs/layout-geometry-audit-plan.md) for the geometry matching model and issue codes.

### CI

| Command | Description |
| --- | --- |
| `npm run ci:tokens` | Alias for `tokens:check`. |
| `npm run ci:modules` | `prod` → `audit:modules`. |
| `npm run ci:typography` | `tokens:check` → `prod` → `audit:typography`. |
| `npm run ci:layout` | `prod` → `audit:layout`. |

---

## Troubleshooting

**`ir:resolve` fails with `COLLISION_TIE`.** Two variants of one style are used equally often. Check `json/font-style-overrides.json` for the candidates, then either add a pick to `font-style-picks.json` or an override to `tokens/overrides.json`. Use `ir:resolve:lenient` to keep moving meanwhile.

**`ir:resolve` warns `STALE_OVERRIDE`.** An entry in `tokens/overrides.json` targets a token that no longer exists or is no longer ambiguous, so it is silently replacing a real Figma value. Delete it.

**`UNMAPPED_FONT` on a `type.*` token.** A contract entry references a font the export no longer has. Give it the current `family` string rather than a `sansN` alias.

**Sass build fails: "The `text-N` class does not exist".** Figma introduced a font size with no entry in `theme.extend.fontSize`. Add it. The same applies to `leading-N` and `theme.extend.lineHeight`.

**A page JSON did not appear.** Its artboard is not listed in `figma-pages.json`, or it sits under a section excluded by `tokenScope.excludeSectionPrefixes`. Extract prints a warning naming any declared artboard it could not find.

**A Figma color change had no effect.** Confirm the token is in `generated/design-tokens.js` after `npm run tokens`. Chrome-only names (`grey-*`, `danger`, soft `black`) are not driven by Figma. If you overrode a whole group (e.g. `secondary: {…}`) in `tailwind.config.js`, IR keys under that group may be wiped — merge with `...(generatedTokens.colors.secondary || {})` instead.

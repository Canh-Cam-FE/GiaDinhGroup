# Agent Pipeline — Figma JSON to Production Modules

End-to-end workflow for extract, prompt generation, and agent coding. This document is the **human-facing companion** to `automation/reference/page-contract.json` (machine contract).

## Overview

```
figma/*.json
    ↓  npm run extract
json/system-design.json + json/{page}.json  (+ meta.moduleRegions)
    ↓  npm run scaffold:modules <slug>  (optional)
src/pages/{slug}.pug + empty module folders
    ↓  npm run agent  (token audit gate — may exit on BLOCKER)
agent-coding-prompt.txt
    ↓  coding agent
src/pages/{slug}.pug + src/modules/{page}/{section}/
    ↓  npm run prod
dist/{slug}.html
    ↓  npm run audit:modules + audit:typography
PASS / FAIL report
```

## End-to-end workflow

| Step | Command | Output / gate |
|------|---------|---------------|
| 1. Export | Place Figma JSON in `figma/` | Raw design input |
| 2. Extract | `npm run extract` | `json/system-design.json`, `json/{slug}.json`, `meta.moduleRegions` per page |
| 3. Scaffold *(optional)* | `npm run scaffold:modules <slug>` | `src/pages/{slug}.pug` + stub `src/modules/{slug}/{region}/` folders (skips `shared-ref` regions) |
| 4. Compile prompt | `npm run agent` or `npm run agent json/{slug}.json` | `agent-coding-prompt.txt` — **blocked** if [token audit](#token-audit-gate) fails |
| 5. Code | Feed prompt to coding agent | Pug + Sass (+ optional JS) per [page contract](../automation/reference/page-contract.json) |
| 6. Build | `npm start` or `npm run prod` | `dist/{slug}.html` |
| 7. Structure QA | `npm run audit:modules` or `npm run audit:modules:page -- --page <slug>` | Report at `json/module-structure-audit.json` |
| 8. Typography QA | `npm run audit:typography` or `npm run audit:typography:page -- --page <slug>` | Report at `json/typography-audit.json` |

**Scaffold vs agent:** `scaffold:modules` creates folder stubs and a thin page entry from `meta.moduleRegions`. The agent still fills real markup from `PAGE_JSON`. Run scaffold before the agent when starting a new page from extract; skip it when editing existing modules.

**Re-run order after Figma changes:** `extract` → `agent` → agent codes → `prod` → `audit:modules` → `audit:typography`. Prior audit failures are injected into the next prompt as `{{AUDIT_FEEDBACK}}` (typography) automatically.

## Structural source of truth

| Artifact | Role |
|----------|------|
| [`automation/reference/page-contract.json`](../automation/reference/page-contract.json) | Folder rules, manifest law, build compatibility |
| [`automation/reference/snippets/`](../automation/reference/snippets/) | Canonical split-folder Pug/Sass examples |
| [`automation/agent-rules/01-layout-agent.md`](../automation/agent-rules/01-layout-agent.md) | Rulebook entry point — absolute rules, workflow, router to the modules below |
| [`automation/prompt/prompt.md`](../automation/prompt/prompt.md) | Agent prompt template (`{{PLACEHOLDERS}}`) |

`automation/agent-rules/` is split into one file per concern so an agent only loads what a task needs: `02-typography.md`, `03-colors-gradients.md`, `04-components.md`, `05-layout-geometry.md`, `06-project-structure.md`, `07-code-templates.md`, `08-media-swiper.md`, `09-page-reference.md`, `10-checklist.md`, `11-appendix.md`.

**Do not use `src/modules/home/index.pug` as a structural template.** It is a legacy monolith (many `section.*` roots in one file). Agents are instructed to copy `automation/reference/snippets/` instead.

## Page contract (summary)

### Page entry — `src/pages/{slug}.pug`

- `extends _layout.pug`
- Set `title` and `bodyClass = 'page {slug}-page'`
- `block main` contains **`include` lines only** — no `section.*` markup
- Header/footer never appear here (`_layout.pug` owns them)

### Module folder — `src/modules/{page}/{section}/`

- `index.pug` — **exactly one** `section.{page}-{section}` root
- `index.sass` — scoped under that same root selector
- Generic child names: `.wrap`, `.content`, `.list`, `.item`, `.card`, `.img`, `.img-ratio`, `.panel` — no throwaway wrappers for spacing only (see [`05-layout-geometry.md`](../automation/agent-rules/05-layout-geometry.md))

### Manifest law

`SECTION_MANIFEST` in `agent-coding-prompt.txt` defines required folders:

```
manifest lines === module folders === page include count
```

**Forbidden:** multiple `section.*` roots in a single `index.pug`.

## Extract pipeline (`npm run extract`)

Script: `automation/scripts/extract.mjs` (uses `automation/scripts/module-regions.mjs` for `meta.moduleRegions`)

| Step | What it does |
|------|----------------|
| Compress Figma JSON | Dense trees: `ty`, `fi`, `tx`, `b`, `al`, `ch` |
| Module regions | `buildPageModuleRegions()` — splits mega-sections into manifest lines (`breadcrumb`, `hero`, `content`, `shared-ref`) |
| Collapse repeats | Identical siblings → `REPEAT` nodes |
| Shared sections | `automation/shared-sections.json` — header, footer, banner, breadcrumb |
| Layout chrome | Strip header/footer INSTANCE subtrees from page JSON |
| SHARED_REF | Convert banner/breadcrumb INSTANCE → `{ t: "SHARED_REF", ref: "..." }` |
| Reorder children | Breadcrumb-first ordering in section trees |
| System tokens | Merge into `json/system-design.json` |
| Page output | `json/{page}.json` per slug |

**Rule:** Never hand-edit `json/system-design.json` during coding. Re-run extract if tokens are missing.

### SHARED_REF includes

Paths are relative to `src/modules/{page}/{section}/index.pug`:

| `ref` | Action |
|-------|--------|
| `header` | **SKIP** — `_layout.pug` already includes header |
| `footer` | **SKIP** — `_layout.pug` already includes footer |
| `top-banner` | `include ../../../components/banner/index.pug` |
| `global-breadcrumb` | `include ../../../components/breadcrumb/index.pug` |

## Agent compiler (`npm run agent`)

Script: `automation/scripts/agent-compiler.js`

Fills `automation/prompt/prompt.md` → writes `agent-coding-prompt.txt`.

**Pre-flight:** runs a token audit over the page tree. If any typography/fill token is `MISSING` or an unlinked hex fill is `NO_TOKEN`, the compiler **exits with code 1** and does **not** write the prompt. See [Token audit gate](#token-audit-gate).

| Placeholder | Content |
|-------------|---------|
| `{{PAGE_NAME}}` | Selected JSON filename (e.g. `banggia-ct.json`) |
| `{{PAGE_SLUG}}` | Page slug derived from filename (e.g. `banggia-ct`) |
| `{{GENERATED_AT}}` | ISO timestamp of prompt compilation |
| `{{PAGE_TOKEN_AUDIT}}` | Per-page token check: used `ty`/`fi` status, `NO_TOKEN` hex fills, BLOCKER notes |
| `{{AUDIT_FEEDBACK}}` | Prior BLOCKER/HIGH issues from `json/typography-audit.json` (empty if none) |
| `{{REFERENCE_PUG}}` | Snippets from `automation/reference/snippets/` (not `home/`) |
| `{{COMPONENT_MANIFEST}}` | Figma INSTANCE → Pug mixin map from `src/core/design-system/manifest.json` |
| `{{PRE_FLIGHT_CHECKLIST}}` | Contents of `automation/agent-rules/10-checklist.md` |
| `{{DESIGN_LOOKUP}}` | Compact `{ ty, fi }` JSON — typography + color stems (`typography-contract.json` overrides parser defaults) |
| `{{TYPOGRAPHY_TABLE}}` | Pre-resolved `ty` → cssClass + html tag for every TEXT token on the page |
| `{{SECTION_MANIFEST}}` | Required module folders (from `meta.moduleRegions` via `expandSectionManifest`, or legacy tree fallback) |
| `{{PAGE_JSON}}` | Pruned page tree (chrome stripped, INSTANCE refs kept, vectors removed) |

Skipped from page picker: `system-design.json`, `typography-audit.json`, `typography-contract.json`, `global.json`, `font-style-overrides.json`, `page-9.json`.

Page migration tracker: [Page Migration Status](./page-migration-status.md).

### Token audit gate

Before writing `agent-coding-prompt.txt`, `agent-compiler.js` validates every `ty` and `fi` token used in the page JSON against `generated/agent-lookup.json` and `tailwind.config.js`. It also flags **unlinked hex fills** (`node.c` present without `node.fi`).

| Audit result | Compiler behavior |
|--------------|-------------------|
| All tokens `OK` | Prompt written to `agent-coding-prompt.txt` |
| Any `ty`/`fi` **MISSING** | Exit 1 — message: run `npm run extract` then `npm run tokens` |
| Any hex **NO_TOKEN** | Exit 1 — message: add/sync token first; never use `text-[#...]` / `bg-[#...]` in Pug |

The audit block is still injected as `{{PAGE_TOKEN_AUDIT}}` in the prompt when the gate passes, so the agent sees a green checklist.

**Fix workflow:**

1. Prefer **no Figma change:** if the hex already lives in `tailwind.config.js`, re-run `npm run agent` (compile-time TW exact-match resolves it). Otherwise add one line to `automation/config/manual-fill-tokens.json` mapping a Figma-style name → hex (e.g. `"Grey/d9": "#d9d9d9"`), then re-run `npm run agent`.
2. Optional persistence: `npm run extract` → `npm run tokens` so page JSON / `system-design.json` / `generated/agent-lookup.json` carry the `fi` on disk.
3. Only if the color is truly new: add the paint style in Figma **or** add the hex to `tailwind.config.js` + `manual-fill-tokens.json`, then extract → tokens → agent.

### Compiler passes

Before placeholders are filled, `agent-compiler.js` runs these transforms on the selected page JSON (in order):

| Pass | What it does | Affects |
|------|--------------|---------|
| **Hex → `fi` (A4)** | Resolves orphan `#hex` fills to semantic `fi` when the hex exists in `json/system-design.json` | Token audit, `PAGE_JSON`, `TYPOGRAPHY_TABLE` |
| **Layout chrome** | Strips header/footer INSTANCE subtrees; converts banner/breadcrumb → `SHARED_REF` | `PAGE_JSON` |
| **Prune** | Removes vectors, dedupes `REPEAT`, drops canvas noise; keeps `al`, `ty`, `fi`, `ref` on INSTANCE | `PAGE_JSON` only |
| **Section manifest** | `expandSectionManifest(meta.moduleRegions)` or legacy tree fallback (both use `sharedRefIncludePath()` from `module-regions.mjs`) | `SECTION_MANIFEST` |
| **Typography table** | Walks tree; resolves each `ty` → cssClass + html tag | `TYPOGRAPHY_TABLE` |
| **Design lookup** | Loads compact `{ ty, fi }` from `generated/agent-lookup.json` | `DESIGN_LOOKUP` |
| **Token audit** | Validates all `ty`/`fi` used; flags unresolved hex as `NO_TOKEN` | Gate + `PAGE_TOKEN_AUDIT` |

#### Hex → `fi` resolution (Solution A4)

`extract.mjs` resolves unlinked solid fills at export time. The agent compiler **re-applies the same rule** at prompt time so stale page JSON and the token audit see semantic tokens when the hex already exists in the design system.

| Condition | Behavior |
|-----------|----------|
| Node has `fi` already | Unchanged — never overwritten |
| Node has `c: "#hex"` (solid hex only, not `gradient:*`) and hex matches a FILL in `system-design.json` | `fi` set to token name; `c` removed |
| Hex has no matching token | `c` kept in pruned `PAGE_JSON`; token audit flags **NO_TOKEN** and blocks prompt generation |

**Escape hatch (no Figma edit):** If the hex already exists in `tailwind.config.js` **or** in [`automation/config/manual-fill-tokens.json`](../automation/config/manual-fill-tokens.json), the compiler maps it to an `fi` at prompt time (same map is applied during `npm run extract`). Add a one-line entry to that JSON when you sync a new hardcoded TW color — do not invent `bg-[#…]` in Pug.

#### Typography authority chain

Typography class and HTML tag resolution follows this precedence (highest wins):

```
1. generated/agent-lookup.json       ← authoritative for cssClass + html tag (+ fi stems)
2. TYPOGRAPHY_TABLE in agent prompt  ← pre-resolved answers; agent copies verbatim
```

| Artifact | Role |
|----------|------|
| `generated/agent-lookup.json` | Canonical `ty` → `{ class, tag }` and `fi` → stem; emitted by DesignTokenIR; used for token audit `OK`/`MISSING` |
| `{{DESIGN_LOOKUP}}` | Compact `ty` + `fi` stems for the agent — **do not infer tags/classes from this alone** |
| `{{TYPOGRAPHY_TABLE}}` | Per-page pre-resolved table: copy class and tag exactly for each `ty` token |

**Agent rule:** For TEXT nodes with `ty`, use `TYPOGRAPHY_TABLE` — never guess `.heading-*` / `.body-*` or `h1`–`h4` from node name or Figma layer label.

#### Reference snippets (`{{REFERENCE_PUG}}`)

Injected from `automation/reference/snippets/` by `buildReferencePug()` — **not** from `src/modules/home/`.

| Snippet | Path | Purpose |
|---------|------|---------|
| Page entry | `snippets/page-entry.pug` | Thin `extends` + `include`-only `block main` |
| Breadcrumb module | `snippets/modules/breadcrumb/` | Split-folder `index.pug` + `index.sass` |
| Hero module | `snippets/modules/hero/` | Section root + grid scaffold |
| CTA module | `snippets/modules/cta/` | Call-to-action section pattern |
| Grid example | `snippets/modules/grid-example/index.pug` | Gold standard — layout grid patterns |
| Tabs example | `snippets/modules/tabs-example/index.pug` | Gold standard — interactive tab markup |

The prompt also includes a note pointing to `automation/reference/page-contract.json` and an explicit warning not to copy the legacy `home` monolith.

**Gold-standard block:** `grid-example` and `tabs-example` are concatenated under `### Gold standard reference (layout & interactive tabs)` for layout and tab patterns that are not covered by the basic breadcrumb/hero/cta trio.

## QA gates

| Command | Checks |
|---------|--------|
| `npm run prod` | Full production build |
| `npm run audit:modules` | `meta.moduleRegions` ↔ `src/modules/` folders ↔ page `include` lines |
| `npm run audit:modules:page` | Same, single slug (`--page`) |
| `npm run audit:typography` | JSON `ty` → Pug class → CSS rule |
| `npm run audit:typography:page` | Same, single slug (`--page`) |
| `npm run ci:typography` | `prod` + typography audit |
| `npm run ci:modules` | `prod` + module structure audit |
| `npm run scaffold:modules <slug>` | Scaffold page entry + module stubs from `meta.moduleRegions` (run after extract) |
| `npm run scaffold:all` | Scaffold every page JSON that has no `src/pages/{slug}.pug` yet |

## Page implementation status

**Living tracker:** [Page Migration Status](./page-migration-status.md) (refreshed by `npm run audit:modules`).

Do **not** rely on a static table in this doc — page maturity changes as modules are added. Use the audit reports as the source of truth:

```bash
npm run audit:modules          # all page JSONs → json/module-structure-audit.json
npm run audit:modules:page -- --page banggia-ct
```

| Audit `status` | Meaning |
|----------------|---------|
| `PASS` | `meta.moduleRegions` count matches module folders and page includes; one `section.*` root per `index.pug` |
| `FAIL` | Missing folders, extra includes, or multiple section roots — see `issues[]` in report |
| `SKIP` | No page JSON, or legacy exception (e.g. `home` monolith) |

**Quick checks (repo snapshot):**

| Check | Command |
|-------|---------|
| Page entries that exist | `ls src/pages/*.pug` (excludes `_layout.pug`) |
| Page JSON slugs | `ls json/*.json` (exclude `system-design`, `typography-*`, `global`, `module-structure-audit`, `font-style-overrides`) |
| Slug has split modules | `ls src/modules/{slug}/` — one folder per non-`shared-ref` manifest line |

**Known exceptions (not contract targets):**

| Slug | Path | Note |
|------|------|------|
| `home` | `src/modules/home/index.pug` | Legacy monolith — edit in place only; do not copy for new pages |
| `index` | `src/pages/index.pug` | Single include of legacy home module |
| JSON without Pug | `json/{slug}.json` only | Most slugs — run `scaffold:modules` + `agent` to create structure |
| Partial Pug | e.g. `banggia-ct`, `niengrang`, `niengrang-ct` | Page entry exists; run `audit:modules:page` for split-folder status |

## Legacy / unwired scripts

| Script | Status | Note |
|--------|--------|------|
| `automation/scripts/copy.mjs` | **Legacy — not in `package.json`** | Alternate Figma REST JSON reducer → `figma-for-coding-agent.json`. Superseded by `extract.mjs`. Run manually only if you need that artifact format. |

## Related docs

- [Developer Workflow](./developer-workflow.md) — daily commands and troubleshooting
- [Component Architecture](./component-architecture.md) — template layers
- [Folder Structure](./folder-structure.md) — repo tree
- [Typography Audit Brief](./typography-audit-resolver-brief.md) — fixing audit failures
- [Build Conflicts Plan](./build-conflicts-resolution-plan.md) — pipeline fix history

# Build Conflicts — Resolution Plan

Master plan for fixing doc ↔ pipeline conflicts (C1–C12). Each item includes solution, files touched, and QC command.

## C1 — Prod Tailwind output filename

| Field | Detail |
|-------|--------|
| Problem | `prodTailwindSass` wrote `tailwind.min.sass`; layout loads `tailwind.min.css` |
| Solution | Change prod output to `tailwind.min.css` in `_gulptasks/sass.js` |
| QC | `npm run prod && test -f dist/css/tailwind.min.css && ! test -f styles/tailwind.min.sass` |

## C2 — Prod skips app JS

| Field | Detail |
|-------|--------|
| Problem | `exports.prod` omitted `devJS` after `cleanDist` |
| Solution | Add `devJS` to `gulpfile.babel.js` prod series |
| QC | `npm run prod && test -f dist/js/main.min.js` |

## C3 — design-system Sass orphaned

| Field | Detail |
|-------|--------|
| Problem | `src/core/design-system/*.sass` documented but not in gulp sources |
| Solution | Add glob to `tailwindSources` in `_gulptasks/sass.js` |
| QC | `npm run prod && grep -q '\.btn-secondary' styles/tailwind.min.css` |

## C4 — animation-lib not wired

| Field | Detail |
|-------|--------|
| Problem | `animation-lib/` uses `@import`; index not concat-safe |
| Solution | List `_keyframes`, `_animation-classes`, `_hamburger` explicitly in `tailwindSources` |
| QC | `npm run prod && grep -q 'slide-in-left' styles/tailwind.min.css` |

## C5 — SHARED_REF include path

| Field | Detail |
|-------|--------|
| Problem | Agent emitted `../global/header/` — path does not exist |
| Solution | Map refs → `../../../components/{name}/` in agent-rules, prompt, agent-compiler (relative to `src/modules/{page}/{section}/index.pug`) |
| QC | `grep -r 'global/header' automation/ docs/` returns no matches |

## C6 — Token edit authority

| Field | Detail |
|-------|--------|
| Problem | Docs said both “never edit system-design.json” and “add token there” |
| Solution | Single path: Figma → `npm run extract` → rebuild; update styling-guide |
| QC | Manual doc review — one authoritative token workflow |

## C7 — BrowserSync auto-open

| Field | Detail |
|-------|--------|
| Problem | workflow said browser opens; `server.js` has `open: false` |
| Solution | Update developer-workflow to say open URL manually |
| QC | `grep 'Opens dist' docs/developer-workflow.md` returns nothing |

## C8 — scrollTrigger filename

| Field | Detail |
|-------|--------|
| Problem | `config.json` listed `scrolltrigger.js`; file is `scrollTrigger.js` |
| Solution | Fix `config.json` + build-pipeline.md |
| QC | `grep scrolltrigger config.json` returns nothing |

## C9 — Mobile QA 767 vs 768

| Field | Detail |
|-------|--------|
| Problem | QA checklist used 767px; Tailwind `md` is 768.1px |
| Solution | Align docs to 768px / `max-md` |
| QC | `grep 767 docs/developer-workflow.md` returns nothing |

## C10 — Typography font-family

| Field | Detail |
|-------|--------|
| Problem | JSON `font: "sans"` (Manrope) not applied; body defaults to Sarabun |
| Solution | Map font tokens → `font-*` utilities in `buildTypographyComponents()` |
| QC | `npm run prod && grep -q 'font-family.*Manrope' styles/tailwind.min.css` |

## C11 — home JSON/Pug mismatch

| Field | Detail |
|-------|--------|
| Problem | `json/home.json` ≠ `src/modules/home/` (different designs) |
| Solution | Document resolution in developer-workflow troubleshooting (not a gulp fix) |
| QC | Troubleshooting section exists; audit still fails until user picks one design |

## C12 — Audit scripts missing from overview

| Field | Detail |
|-------|--------|
| Problem | `audit:typography` / `ci:typography` not in overview/workflow |
| Solution | Add to `project-overview.md` and `developer-workflow.md` |
| QC | `grep audit:typography docs/project-overview.md docs/developer-workflow.md` |

## Full regression QC

```bash
npm run prod
npm run audit:modules   # may FAIL on pages not yet split per contract
npm run ci:typography   # may FAIL on home (C11) and goisanpham-ct until content/structure resolved
```

---

## C13 — Agent structural reference

| Field | Detail |
|-------|--------|
| Problem | Agents copied legacy `home/index.pug` monolith; conflicted with `01-layout-agent.md` §4 |
| Solution | Add `automation/reference/` (`page-contract.json` + split snippets); agent-compiler injects these instead of home |
| QC | `grep 'automation/reference' docs/agent-pipeline.md docs/folder-structure.md` |

## C14 — Prompt monolith carve-out removed

| Field | Detail |
|-------|--------|
| Problem | `prompt.md` allowed multiple `section.*` roots in one file when manifest had one line |
| Solution | Forbidden rule + one root per `index.pug` in pre-flight checklist |
| QC | `grep 'multiple section' automation/prompt/prompt.md` returns nothing |

## C15 — Module structure audit ✅ Done

| Field | Detail |
|-------|--------|
| Problem | No CI gate for manifest ↔ folder ↔ include compliance |
| Solution | `automation/scripts/module-structure-audit.mjs` + `npm run audit:modules` / `audit:modules:page` |
| QC | `npm run audit:modules` exits 0; report at `json/module-structure-audit.json` |

## C16 — Expand SECTION_MANIFEST regions ✅ Done

| Field | Detail |
|-------|--------|
| Problem | Mega-section pages emit one manifest line for 10+ visual regions |
| Solution | `buildPageModuleRegions()` in `extract.mjs` → `meta.moduleRegions`; `expandSectionManifest()` in `module-regions.mjs` used by `agent-compiler.js`; optional `npm run scaffold:modules` |
| QC | `node -e "const j=require('./json/goisanpham-ct.json'); console.log(j.meta?.moduleRegions?.length||0)"` prints >1 after extract; `npm run agent goisanpham-ct.json` SECTION_MANIFEST has multiple lines |

## C17 — SHARED_REF legacy manifest paths ✅ Done

| Field | Detail |
|-------|--------|
| Problem | `expandSectionManifest()` legacy fallback emitted `../../../components/top-banner/index.pug` (path does not exist) |
| Solution | Export `sharedRefIncludePath()` from `module-regions.mjs`; use for both `moduleRegions` and legacy tree branches; remove duplicate map from `agent-compiler.js` |
| QC | Legacy test prints `components/banner/index.pug`; `rg 'components/top-banner' automation/` returns no matches |

## C18 — Prod app JS minify + watch glob parity ✅ Done

| Field | Detail |
|-------|--------|
| Problem | `main.min.js` was bundled but not minified in prod; `server.js` image watch missed uppercase extensions |
| Solution | `prodJS` with esbuild `minify: true` in `gulp prod`; `_gulptasks/watch-shared.js` for shared image glob + BrowserSync settings |
| QC | `npm run prod && wc -c dist/js/main.min.js` smaller than dev build; `server.js` and `copy.js` share `imageWatchGlob` |

## C19 — Page structure scaffold + home legacy audit ✅ Done

| Field | Detail |
|-------|--------|
| Problem | 10 page JSONs had no Pug; `home` failed audit incorrectly; `font-style-overrides` / `page-9` treated as pages |
| Solution | `npm run scaffold:all`; legacy `home` audit via `index.pug`; skip non-page JSON; `docs/page-migration-status.md` |
| QC | `npm run audit:modules` → 13 pass, 1 fail (`home` only); `npm run prod` passes |

## C20 — Tooling polish ✅ Done

| Field | Detail |
|-------|--------|
| Problem | Duplicate page-JSON skip lists; missing `.env.example`; `gulp-babel` unused; no `ci:modules`; FTP assert at module load |
| Solution | `page-json-skip.mjs` shared module; `.env.example`; remove `gulp-babel`; `ci:modules` script; lazy FTP conn in `ftp.js` |
| QC | `rg 'gulp-babel' package.json` returns nothing; `npm run ci:modules` runs prod + audit |

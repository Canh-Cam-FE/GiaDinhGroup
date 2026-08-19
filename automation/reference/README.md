# Agent page contract (source of truth)

This folder is the **canonical structural reference** for coding agents. It lives **outside** `src/` so Gulp and Tailwind never compile it.

## Why not `src/modules/home/`?

| | `home/index.pug` (legacy) | `automation/reference/` (contract) |
|--|---------------------------|----------------------------------|
| Structure | 10+ `section.*` in **one file** | **One section per folder** |
| Matches `06-project-structure.md` naming | No | Yes |
| In Gulp / Tailwind pipeline | Yes (compiled) | **No** (agent-only) |
| Typography | Legacy `display-*`, `signature-*` | Token-safe `heading-*`, `body-*` |
| Safe for new pages | No — teaches monolith | Yes |

**Rule for agents:** Copy **folder layout** from here. Copy **tokens** from `DESIGN_LOOKUP` in the prompt — not from `home/`.

## File map

```
automation/reference/
├── page-contract.json          ← machine-readable contract (manifest, build rules, legacy flags)
├── README.md
└── snippets/
    ├── page-entry.pug          ← thin page: N includes, zero section roots
    └── modules/
        ├── breadcrumb/         ← one section root per folder
        ├── hero/
        └── cta/
```

## Contract (human summary)

1. **Page entry** — `src/pages/{slug}.pug`: `extends _layout.pug`; `block main` = `include` lines only.
2. **Module folder** — `src/modules/{page}/{section}/index.pug` + `index.sass`.
3. **One `section.{page}-{section}` root per `index.pug`** — never merge regions into one file.
4. **Manifest** — one folder per `SECTION_MANIFEST` line; include order matches manifest order.
5. **Layout chrome** — header/footer only in `_layout.pug`; skip in modules.

## Build pipeline compatibility

| Step | Behavior | Conflict with split folders? |
|------|----------|----------------------------|
| HTML | `src/pages/*.pug` → `dist/*.html` | **No** — page just adds more `include` lines |
| Sass | `src/modules/**/*.sass` → `main.min.css` | **No** — glob is recursive; depth unlimited |
| Tailwind JIT | Scans `src/modules/**/*.{pug,sass}` | **No** — each new folder is picked up automatically |
| JS | Single `main.min.js` + `safeInit()` | **No** — no per-page JS split required |

Putting the reference under `automation/` avoids polluting `main.min.css` with snippet styles.

## Alignment with `automation/agent-rules/`

| Agent rule | Reference implements |
|-------------------|----------------------|
| `01-layout-agent.md` §C Step 3 — scaffold per-section `index.pug`/`index.sass` | `snippets/modules/{section}/index.pug` + `index.sass` |
| `06-project-structure.md` — `modules/{page}/{section}/` | `modules/example-page/{section}/` in snippets |
| `06-project-structure.md` — grid scaffold | hero snippet uses `.container-xxl` → `.row` → `.col` |
| `10-checklist.md` — one section root per module | each snippet file has exactly one `section.*` |
| `09-page-reference.md` — home/banner table | **Target** pattern — not current `home/` monolith |

Legacy `home/index.pug` remains in production but is listed in `page-contract.json` → `legacyExceptions` with `doNotCopyStructure: true`.

## Agent prompt injection

`npm run agent` reads this folder via `agent-compiler.js` → `{{REFERENCE_PUG}}` in `agent-coding-prompt.txt` (replaces old `home/index.pug` excerpt).

Human-readable guide: [`docs/agent-pipeline.md`](../docs/agent-pipeline.md)

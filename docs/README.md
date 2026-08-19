# Documentation Index

> **Source of truth for the build / token pipeline:** the root [`README.md`](../README.md).
>
> After the 2026-07 token retarget (Gia Định Group / `figma-targets.json` + `figma-pages.json`), several docs below still describe the **retired** dental-clinic project (`banggia-*`, Manrope, Sarabun, `primary-2-title-content`). Prefer root README + `automation/agent-rules/` until those pages are rewritten.
>
> **Live pages:** `home` (via `src/pages/index.pug`), `about`, `services-detail`, `projects`, `projects-detail`, `sustainability`.

## Start here

| Doc | Audience | Contents | Freshness |
|-----|----------|----------|-----------|
| [../README.md](../README.md) | Everyone | Pipeline, token → Tailwind, manual files | **Current** |
| [Project Overview](./project-overview.md) | Everyone | Stack, npm scripts | May lag README |
| [Developer Workflow](./developer-workflow.md) | Developers | Daily loop, commands | May lag README |
| [Agent Pipeline](./agent-pipeline.md) | Agents + devs | Extract → agent → modules | Partially stale (old slugs) |

## Architecture

| Doc | Contents | Freshness |
|-----|----------|-----------|
| [Folder Structure](./folder-structure.md) | Repo tree, `src/` layout | Mostly OK |
| [Component Architecture](./component-architecture.md) | Pug layers, SHARED_REF | Mentions Sarabun — prefer rules |
| [Build Pipeline](./build-pipeline.md) | Gulp tasks, Sass | Mentions Sarabun fonts — prefer README |
| [Styling Guide](./styling-guide.md) | Tailwind / Sass | **Stale** (Manrope / Sarabun / old utilities) |
| [JavaScript Guide](./javascript-guide.md) | `main.js`, modules | OK for structure |
| [Coding Conventions](./coding-conventions.md) | Naming, anti-patterns | Partially stale color examples |

## Automation & QA

| Doc | Contents | Freshness |
|-----|----------|-----------|
| [Agent Pipeline](./agent-pipeline.md) | Figma → code workflow | Update slugs before trusting examples |
| [Layout Geometry Audit Plan](./layout-geometry-audit-plan.md) | Planned `audit:layout` — JSON `b`/`al` vs. built page | **Current** (plan) |
| [Visual Layout Confirmation](./visual-layout-confirmation-plan.md) | Reference-image pixel diff | Superseded by the plan above |
| [Playwright Testing Plan](./playwright-testing-plan.md) | Browser-driven behavior tests — nav, tabs, forms, console/network hygiene | **Current** (plan) |
| [Typography Audit Brief](./typography-audit-resolver-brief.md) | Fixing audit failures | Historical |
| [Typography Audit Report](./typography-audit-report.md) | Auto-generated | Historical (old pages) |
| [Page Migration Status](./page-migration-status.md) | Per-slug status | **Stale** — lists retired banggia pages |
| [Build Conflicts Plan](./build-conflicts-resolution-plan.md) | C1–C19 history | Archive — not current conflict policy |

## Agent source of truth (outside `docs/`)

| Path | Role |
|------|------|
| [`automation/config/figma-pages.json`](../automation/config/figma-pages.json) | Page map + token scope |
| [`automation/agent-rules/`](../automation/agent-rules/) | Coding rulebook (`01`–`11`) — **updated for live IR** |
| [`automation/reference/page-contract.json`](../automation/reference/page-contract.json) | Folder rules |
| [`generated/agent-lookup.json`](../generated/agent-lookup.json) | Live `ty` / `fi` tables |

**Home:** split folders under `src/modules/home/*/`, included from `src/pages/index.pug` — not a monolith.

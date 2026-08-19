# Page Migration Status

Living tracker for Phase 5 — bringing live Pug in line with `meta.moduleRegions` and the [page contract](../automation/reference/page-contract.json).

**Refresh audits:**

```bash
npm run audit:modules          # → json/module-structure-audit.json
npm run audit:typography       # → json/typography-audit.json
```

**Scaffold new pages from extract JSON:**

```bash
npm run scaffold:modules <slug>   # one page
npm run scaffold:all              # all JSON slugs missing a page entry
```

---

## Summary (2026-07-18)

| Gate | Result |
|------|--------|
| `audit:modules` | **13 PASS**, **1 FAIL** (`home` legacy) |
| `audit:typography` | **17 pages** — 12 FAIL, 1 WARN (stubs + home; expected until agent codes content) |
| `npm run prod` | **PASS** — all page entries compile |

---

## Structure audit (`audit:modules`)

| Slug | Status | Regions | Notes |
|------|--------|---------|-------|
| `banggia-ct` | PASS | 7 | Agent-coded — reference implementation |
| `banggia-ds` | PASS | 14 | Scaffold stubs — needs agent content |
| `cauchuyenkhachhang-ct` | PASS | 4 | Scaffold stubs |
| `cauchuyenkhachhang-ds` | PASS | 8 | Scaffold stubs |
| `dangnhap` | PASS | 6 | Scaffold stubs |
| `gioithieu` | PASS | 17 | Scaffold stubs |
| `goisanpham-ct` | PASS | 14 | Scaffold stubs |
| `goisanpham-ds` | PASS | 4 | Scaffold stubs |
| `lienhe` | PASS | 7 | Scaffold stubs |
| `niengrang` | PASS | 14 | Agent-coded |
| `niengrang-ct` | PASS | 16 | Agent-coded |
| `tintuc` | PASS | 4 | Scaffold stubs |
| `tintuc-ct` | PASS | 7 | Scaffold stubs |
| `home` | **FAIL** | 21 | Legacy — see [§home](#home-c11) below |

### Excluded from page audits

| JSON file | Reason |
|-----------|--------|
| `font-style-overrides.json` | Extract typography report — not a page |
| `page-9.json` | Figma homepage canvas duplicate — not a production slug |
| `system-design.json`, `typography-*.json`, `global.json` | System / audit artifacts |

---

## Typography audit (`audit:typography`)

Scaffold stubs use placeholder `.heading-1` and pass structural class checks, but **content** pages fail until real copy/classes match `json/{slug}.json`.

| Priority | Slug | Next step |
|----------|------|-----------|
| Done | `banggia-ct`, `niengrang`, `niengrang-ct` | Fix remaining BLOCKER/HIGH from `json/typography-audit.json` |
| Backlog | All scaffolded slugs | `npm run agent` → code from `PAGE_JSON` → `audit:typography:page -- <slug>` |
| Blocked | `home` | Resolve [§home](#home-c11) first |

---

## home (C11)

**Decision (2026-07-18):** Treat `json/home.json` as the design source of truth. The legacy monolith (`src/modules/home/index.pug`) is **missing** and `src/pages/index.pug` has an **empty** `block main`.

| Blocker | Detail |
|---------|--------|
| `LEGACY_INDEX_NO_INCLUDE` | `index.pug` does not include `../modules/home/index.pug` |
| `LEGACY_MONOLITH_MISSING` | `src/modules/home/index.pug` does not exist |

**Pick one path:**

1. **Regenerate from JSON (recommended)** — Split per contract:
   ```bash
   npm run scaffold:modules home   # creates src/pages/home.pug — OR keep index.pug and wire includes manually
   npm run agent home.json
   ```
   Then either migrate `index.pug` to include split modules or redirect homepage to new structure.

2. **Restore legacy monolith from git** — If an older commit has `src/modules/home/index.pug`:
   ```bash
   git checkout <commit> -- src/modules/home/
   ```
   Add `include ../modules/home/index.pug` back to `index.pug`. Accept `json/home.json` ≠ live Pug until re-export or regenerate.

Do **not** patch typography class-by-class while JSON and Pug trees differ ([developer workflow](./developer-workflow.md#page-json-does-not-match-existing-pug-eg-home)).

---

## Per-page workflow (backlog)

For each scaffolded slug:

```
1. npm run extract                    # if Figma changed
2. npm run agent <slug>.json          # generate agent-coding-prompt.txt
3. Agent codes Pug + Sass per manifest
4. npm run prod
5. npm run audit:modules:page -- <slug>
6. npm run audit:typography:page -- <slug>
```

---

## Implementation tiers

| Tier | Slugs | Meaning |
|------|-------|---------|
| **T1 — Coded** | `banggia-ct`, `niengrang`, `niengrang-ct` | Split folders + real content |
| **T2 — Scaffolded** | 10 listing/detail pages (see table above) | Structure PASS; placeholder copy |
| **T3 — Legacy** | `home` / `index` | Blocked on C11 decision |
| **T4 — Excluded** | `page-9`, `font-style-overrides` | Not production pages |

---

## Related docs

- [Agent Pipeline](./agent-pipeline.md)
- [Developer Workflow](./developer-workflow.md)
- [Build Conflicts Plan](./build-conflicts-resolution-plan.md) — C11, C15–C18

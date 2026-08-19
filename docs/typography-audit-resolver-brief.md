# Typography Audit — Resolver Brief

**Tool:** `npm run audit:typography`  
**Full report:** [`typography-audit-report.md`](./typography-audit-report.md) (auto-generated)  
**Machine-readable:** [`json/typography-audit.json`](../json/typography-audit.json)

---

## Mission

Close the loop: **page JSON `ty` → Pug `.cssClass` → rule in `styles/tailwind.min.css`**.

Exit criteria: no page with status `FAIL` (audit exits `0`).

---

## Run order

```bash
npm run extract          # if Figma / tokens stale
npm run prod             # refresh styles/tailwind.min.css
npm run audit:typography
```

Or: `npm run ci:typography` (prod + audit).

---

## Current system status (after pipeline fixes C1–C10)

| Metric | Value |
|--------|-------|
| Parser typography classes | 69 |
| Missing from built CSS | **0 / 69** ✅ |
| Typography baseKey collisions | 14 (parser first-wins) |
| Pages audited | 15 |
| Pages with Pug | 2 (`home`, `goisanpham-ct`) |
| Pages FAIL | 2 |
| Pages NO_PUG | 13 |

CSS class gap (formerly 57/69 missing) is **resolved**. Remaining failures are **content/structure**, not missing plugin output.

---

## Issue codes (fix in this order)

| Code | Severity | Action |
|------|----------|--------|
| `NO_PUG_SOURCES` | BLOCKER | Create `src/pages/{slug}.pug` + `src/modules/{page}/{section}/` per [agent pipeline](./agent-pipeline.md) |
| `CSS_CLASS_MISSING` | BLOCKER | Run `npm run tokens && npm run prod`; ensure `generated/typography.js` emits the class |
| `PUG_CLASS_MISMATCH` | BLOCKER | Replace `foundClasses` with single `.expectedClass` from `ty` |
| `TX_NOT_IN_PUG` | HIGH | Add JSON copy to Pug or regenerate page from `json/{page}.json` |
| `PUG_NO_TYPO_CLASS` | HIGH | Add `.expectedClass` on the element with that `tx` |
| `PUG_ORPHAN_TYPO_CLASS` | MEDIUM | Remove invented classes (`display-*`, `signature-*`) or align with JSON `ty` |
| `TY_UNMAPPED` | BLOCKER | Run `npm run extract` — token missing from system design |
| `TX_DYNAMIC_POSSIBLE` | INFO | Loop/`= var` copy — verify at runtime |

---

## Page-specific priorities

### `home` — FAIL (~580 issues)

| Root cause | Detail |
|------------|--------|
| Design mismatch | `json/home.json` = Nụ cười Việt; `src/modules/home/index.pug` = MBLAND placeholder content |
| Orphan classes | `display-*`, `signature-*`, `body-18-medium` not in design system |

**Fix:** Pick one source of truth — regenerate home from JSON via agent pipeline, **or** replace `json/home.json` with the MBLAND Figma export. Do not patch class-by-class across different designs.

**Note:** `home/index.pug` is a **legacy monolith** — not a structural template for new pages.

### `goisanpham-ct` — FAIL (~82 issues)

| Root cause | Detail |
|------------|--------|
| Monolith module | All sections in one `04-2-goisanpham-ct/index.pug` — should split per [page contract](../automation/reference/page-contract.json) |
| Skipped chrome | Footer/contact FRAME copy still in JSON but not rendered |
| Mixin / loop noise | `+btn*` and `each` loops trigger `PUG_NO_TYPO_CLASS` false positives |

**Fix:** Split into per-section folders; align copy with JSON; re-run audit.

### 13 pages — `NO_PUG`

`banggia-ct`, `banggia-ds`, `cauchuyenkhachhang-ct`, `cauchuyenkhachhang-ds`, `dangnhap`, `gioithieu`, `goisanpham-ds`, `lienhe`, `niengrang-ct`, `niengrang`, `page-9`, `tintuc-ct`, `tintuc`

Run `npm run agent -- {page}.json` and implement modules, or exclude from audit until Pug exists.

---

## System-level open items

### Parser collisions (14)

Same `baseKey`, different metrics — parser keeps first entry only. Long-term: disambiguate `cssClass` in extract or scope lookup by context.

### Font-family on body tokens

C10 mapped `font` tokens in typography plugin. Body text may still inherit Sarabun from preflight when only weight/size class is applied — verify per-component in built CSS.

---

## JSON issue schema

```json
{
  "severity": "BLOCKER | HIGH | MEDIUM | INFO",
  "code": "PUG_CLASS_MISMATCH",
  "ty": "Heading/Heading-6",
  "tx": "Giới thiệu",
  "expectedClass": "heading-6",
  "expectedTag": "h4",
  "foundClasses": ["display-60"],
  "pugFile": "src/modules/home/index.pug",
  "pugLine": 45,
  "fix": "Replace with .heading-6"
}
```

---

## Definition of done

- [ ] `npm run audit:typography` exits `0`
- [ ] `system.missingCssClasses` is `[]` after `npm run prod`
- [ ] Each implemented page follows [page contract](../automation/reference/page-contract.json) (one section root per module file)
- [ ] `home` JSON and Pug represent the same design
- [ ] New pages use split folders — not `home/` monolith pattern

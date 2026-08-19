# Typography Audit Report

Generated: 2026-08-03T08:46:31.978Z
CSS file: `styles/tailwind.min.css` (found)

## Executive summary

| Metric | Value |
|--------|-------|
| Pages audited | 1 |
| Pages with Pug | 1 |
| Pages PASS | 0 |
| Pages WARN | 1 |
| Pages FAIL | 0 |
| Pages NO_PUG | 0 |
| Typography baseKey collisions | 0 |
| Parser classes missing from CSS | 0 |

## For resolving agent — priority order

1. Fix **BLOCKER** `CSS_CLASS_MISSING` — run `npm run tokens && npm run prod` so `generated/typography.js` is emitted into CSS
2. Fix **BLOCKER** `PUG_CLASS_MISMATCH` — apply `expectedClass` from `ty` lookup
3. Fix **HIGH** `TX_NOT_IN_PUG` — page markup does not match page JSON copy
4. Fix **MEDIUM** `PUG_ORPHAN_TYPO_CLASS` — remove invented classes (`display-*`, `signature-*`, etc.)
5. Resolve **system collisions** — same `baseKey`, different metrics; parser keeps first only

Re-run: `node automation/scripts/typography-audit.mjs`

## Page: `home` — WARN

- Meta file: Gia Định Group COPY
- Pug: src/pages/home.pug, src/modules/home/banner/index.pug, src/modules/home/banner-2/index.pug, src/modules/home/du-an-noi-bat/index.pug, src/modules/home/frame-1000003374/index.pug, src/modules/home/gia-inh-group/index.pug, src/modules/home/lien-he/index.pug, src/modules/home/linh-vuc-hoat-ong/index.pug, src/modules/home/oi-tac/index.pug, src/modules/home/tin-tuc/index.pug, src/modules/home/ve-gia-inh-group/index.pug
- TEXT nodes: 82 (65 unique ty+tx checks)
- Pass: 66 | Issues: 12

### PUG_NO_TYPO_CLASS (6)

- **[HIGH]** Pug line has copy but no typography component class
  - ty: `Body/Body-1` → expected `.body-1`, tag `<div>`
  - tx: "Khám phá thêm"
  - pug: `src/modules/home/ve-gia-inh-group/index.pug:44`
  - fix: Add .body-1 to element (one class per text node)
- **[HIGH]** Pug line has copy but no typography component class
  - ty: `Body/Body-1` → expected `.body-1`, tag `<div>`
  - tx: "Khám phá thêm"
  - pug: `src/modules/home/ve-gia-inh-group/index.pug:51`
  - fix: Add .body-1 to element (one class per text node)
- **[HIGH]** Pug line has copy but no typography component class
  - ty: `Body/Body-2` → expected `.body-2`, tag `<div>`
  - tx: "Tìm hiểu thêm"
  - pug: `src/modules/home/linh-vuc-hoat-ong/index.pug:13`
  - fix: Add .body-2 to element (one class per text node)
- **[HIGH]** Pug line has copy but no typography component class
  - ty: `Body/Body-1` → expected `.body-1`, tag `<div>`
  - tx: "Xem tất cả dự án"
  - pug: `src/modules/home/du-an-noi-bat/index.pug:38`
  - fix: Add .body-1 to element (one class per text node)
- **[HIGH]** Pug line has copy but no typography component class
  - ty: `Body/Body-1` → expected `.body-1`, tag `<div>`
  - tx: "Xem tất cả"
  - pug: `src/modules/home/du-an-noi-bat/index.pug:38`
  - fix: Add .body-1 to element (one class per text node)
- **[HIGH]** Pug line has copy but no typography component class
  - ty: `Body/Body-1` → expected `.body-1`, tag `<div>`
  - tx: "Xem tất cả"
  - pug: `src/modules/home/tin-tuc/index.pug:147`
  - fix: Add .body-1 to element (one class per text node)

### TX_DYNAMIC_POSSIBLE (1)

- **[INFO]** Class .body-4 found in Pug but copy not as literal — likely dynamic (each / = var). Verify manually.
  - ty: `Body/Body-4` → expected `.body-4`
  - tx: "|"
  - fix: Confirm the loop body or data source produces the correct copy at runtime

### PUG_ORPHAN_TYPO_CLASS (5)

- **[MEDIUM]** Class .banner-2 in Pug but no page JSON TEXT node maps to it
  - pug: `src/pages/home.pug:8`
  - fix: Remove invented class or align page JSON ty; if Local/* token, use parser cssClass from DESIGN_LOOKUP
- **[MEDIUM]** Class .heading-banner in Pug but no page JSON TEXT node maps to it
  - pug: `src/modules/home/banner/index.pug:16`
  - fix: Remove invented class or align page JSON ty; if Local/* token, use parser cssClass from DESIGN_LOOKUP
- **[MEDIUM]** Class .heading-banner in Pug but no page JSON TEXT node maps to it
  - pug: `src/modules/home/banner/index.pug:31`
  - fix: Remove invented class or align page JSON ty; if Local/* token, use parser cssClass from DESIGN_LOOKUP
- **[MEDIUM]** Class .heading-banner in Pug but no page JSON TEXT node maps to it
  - pug: `src/modules/home/banner/index.pug:44`
  - fix: Remove invented class or align page JSON ty; if Local/* token, use parser cssClass from DESIGN_LOOKUP
- **[MEDIUM]** Class .banner-2 in Pug but no page JSON TEXT node maps to it
  - pug: `src/modules/home/banner-2/index.pug:1`
  - fix: Remove invented class or align page JSON ty; if Local/* token, use parser cssClass from DESIGN_LOOKUP

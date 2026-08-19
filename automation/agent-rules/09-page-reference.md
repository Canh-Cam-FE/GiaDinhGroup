# Homepage / multi-section page reference

> **Legacy reality:** production home is a single file `src/modules/home/index.pug` (many `section.home-*` roots). **Do not copy that layout for new pages.**
> **Canonical target for agents:** `automation/reference/snippets/` — one folder per section per `automation/reference/page-contract.json`.

| Figma section | Target module (new work) | Root class |
| --------------- | -------------------------- | ----------- |
| Hero / banner | `modules/{page}/hero/` | `.{page}-hero` |
| About | `modules/{page}/about/` | `.{page}-about` |
| Stats | `modules/{page}/stats/` | `.{page}-stats` |
| Sectors (tabs) | `modules/{page}/sectors/` | `.{page}-sectors` |
| Services grid | `modules/{page}/services/` | `.{page}-services` |
| Full-width image | `modules/{page}/showcase/` | `.{page}-showcase` |
| Stock | `modules/{page}/stock/` | `.{page}-stock` |
| News (tabs) | `modules/{page}/news/` | `.{page}-news` |
| Newsletter | `modules/{page}/newsletter/` | `.{page}-newsletter` |
| Header / Footer | `components/header`, `components/footer` | — (layout only) |

Inner pages follow the same pattern under `modules/{page}/`.

## Legacy homepage file map (edit-only — not a template for new pages)

| Figma section | Current path (legacy) | Root class |
| --------------- | ----------------------- | ----------- |
| All home blocks | `modules/home/index.pug` (monolith) | `.home-hero`, `.home-about`, … |

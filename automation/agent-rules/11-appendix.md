# Appendix A — JSON structure

**System design** (`json/system-design.json`) — Figma export dictionary. After extract, run `npm run tokens` so `generated/*` stays current:

```
meta.role          → "system"
meta.sources[]     → page JSON files aggregated into this export
tokens.styles      → TEXT / FILL definitions
                     • TEXT: "Heading/*", "Heading chân/*", "Body/*"
                     • FILL hex: "Primary/1", "Utility/white", …
                     • FILL gradient: "Gradient/*" → "gradient:linear:N" (not hex)
tokens.fontFamilies → sans, serif (Cormorant Garamond), icon, icon2, icon3, …
tokens.spacing     → pad, gap, radius
```

**Page export** (`json/{page}.json`) — use after `extract` + `tokens`:

```
meta.page          → slug (e.g. "services")
meta.system        → "system-design.json"
tree[]             → sections (n = name, ch = children)
  → geometry: b { width, height, x, y }
  → auto-layout: al { layoutMode, padding, itemSpacing, … }
  → copy nodes: ty (TEXT style), fi (FILL style), tx (copy)
  → icon nodes: no ty, font: "icon"|"icon2"|"icon3", tx|n = glyph name
  → serif nodes: ty: "Heading chân/Heading-2", …
```

Style keys in page JSON (`ty`, `fi`) resolve via **`generated/agent-lookup.json`** (injected as `DESIGN_LOOKUP` / `TYPOGRAPHY_TABLE`). Use `json/system-design.json` only when debugging extract. Many FILL names there have **no hex** — never invent a utility from an empty shell. Strip `#…` node-id suffixes when matching keys (e.g. `Heading/Heading-1#9:113` → `Heading/Heading-1`).

**`TYPOGRAPHY_TABLE` (agent prompt):** from `generated/agent-lookup.json`; deduplicated by `ty::cssClass` — token-level lookup, not one row per TEXT node. The sample "Node name" column is illustrative only.

**Legacy exports** (`figma/*.json`): same node fields; prefer `json/` paths when both exist.

---

# Appendix B — Breakpoints

| Token | Min-width |
| ----- | --------- |
| `xs` | 320px |
| `sm` | 576.1px |
| `md` | 768.1px |
| `lg` | 1024.1px |
| `xl` | 1200.1px |
| `2xl` | 1600px |
| `max-lg` | ≤ 1024px |

Use `lg:` for desktop layout (matches grid gutter break).

---

# Appendix C — Transitions

| Utility | Value |
| -------- | ----- |
| `.transition` | `.4s all ease-in-out` |
| `.transition-smooth` | `0.3s cubic-bezier(0.4, 0, 0.2, 1)` |
| `.transition-bounce` | `0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)` |
| `.zoom-in` | Image hover scale |

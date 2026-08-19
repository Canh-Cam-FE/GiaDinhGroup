# Color & fill styles (solid FILL + gradients)

> This is the **single canonical rule** for fills. Every other file that mentions colors or gradients links back here instead of restating the rule.
>
> **Authority after token upgrade:** resolve solid fills through `generated/agent-lookup.json` (`fi`) → Tailwind utility → hex in `generated/design-tokens.js`. Do **not** invent utilities from memory or from empty entries in `json/system-design.json`.

## Solid hex fills (live IR)

Strip any `#…` node-id suffix from `fi` before lookup. Only styles listed in `agent-lookup.json` → `fi` are usable as solid utilities.

| Figma style | Tailwind token | Hex (IR) |
| ----------- | -------------- | -------- |
| `Primary/1` | `primary-1` | `#254b9d` |
| `Primary/2` | `primary-2` | `#eb2228` |
| `Primary/3` | `primary-3` | `#808285` |
| `Primary/4` | `primary-4` | `#ffffff` |
| `Primary/bg` | `primary-bg` | `#f2ede4` |
| `Primary/Table Surface` | `primary-table-surface` | `#d3e4f0` |
| `Primary/Table Accent A` | `primary-table-accent-a` | `#b9d5e6` |
| `Primary/Table Accent B` | `primary-table-accent-b` | `#a7c9de` |
| `Secondary/2` | `secondary-2` | `#a4adb8` |
| `Secondary/3` | `secondary-3` | `#545554` |
| `Secondary/BG` | `secondary-bg` | `#cee3ff` |
| `Secondary/Utility-Black-20` | `secondary-utility-black-20` | `#000000` |
| `Secondary/Utility - White-50` | `secondary-utility-white-50` | `#ffffff` |
| `Secondary/White-80` | `secondary-white-80` | `#ffffff` |
| `Utility/gray-50` | `gray-50` | `#f6f6f6` |
| `Utility/gray-100` | `gray-100` | `#efefef` |
| `Utility/gray-200` | `gray-200` | `#dcdcdc` |
| `Utility/gray-300` | `gray-300` | `#bdbdbd` |
| `Utility/gray-500` | `gray-500` | `#818181` |
| `Utility/gray-800` | `gray-800` | `#464646` |
| `Utility/gray-950` | `gray-950` | `#292929` |
| `Utility/black` | `black` | `#000000` |
| `Utility/white` / `Neutral/White` | `white` | `#ffffff` |
| `Grey/d9` | `grey-d9` | `#d9d9d9` |

**Naming note:** Figma `Utility/gray-*` maps to Tailwind `gray-*` (American spelling). The separate `grey-*` ladder in `tailwind.config.js` is a **non-Figma chrome layer** for shared header/footer/form UI — do not use it as a substitute when the page JSON carries a `Utility/gray-*` `fi`.

### Styles that exist in Figma but have no solid hex

These appear as empty FILL shells in `system-design.json` (no `color`). They are **not** in `agent-lookup` and must not be used as solid utilities until extract/tokens produce a hex:

`Primary/5`, `Primary/6`, `Grey/Grey-500`, `Grey/Grey-900`, `Utility/gray-400`, `Utility/gray-600`, `Utility/gray-700`, `Utility/gray-900`, `Utility/gray-950-maintext`, `Black`, `Green/Green-500`, `Utility/Error-*`, `Utility/Correct-*`, `Secondary/1`, and all `Gradient/*` keys (gradients — see below).

## Resolution rules

- **Mandatory color source for page coding:** `fi` → `generated/agent-lookup.json` → utility name → confirm hex in `generated/design-tokens.js` (after `npm run extract` → `npm run tokens`).
- `json/system-design.json` is extract input / debug only. Many FILL names there have **no hex** — never invent a utility from a name alone.
- Use `text-{token}`, `bg-{token}`, `border-{token}` — no `#hex` in markup (see `01-layout-agent.md` §A).
- If `fi` is missing from `agent-lookup`, **report it** and stop — ask for `npm run extract` → `npm run tokens`. Never invent a hex utility or patch `tailwind.config.js` / `generated/*` inline.
- Opacity: `text-white/80`, `bg-black/30`. Prefer `black` over the chrome alias `dark` when the Figma key is `Utility/black`.

## Fill precedence (single node)

1. `fi: "Gradient/*"` wins over solid `bg-{token}` — implement gradient in Sass or `bg-gradient-*`; never add a solid `bg-{token}` on the same element.
2. `fi: "{solid token}"` without gradient → `bg-{token}` / `text-{token}` / `border-{token}` via the table above.
3. Raw `c: "#…"` without `fi` is a **BLOCKER** — tokenize first (`manual-fill-tokens.json` + re-extract); never render hex in markup.
4. Never combine a solid color utility and a gradient utility on the **same** element.

## Sass solid fills

When applying colors in section `index.sass`:

- **Prefer `@apply`** with the same utility stem used in Pug: `@apply bg-primary-2`, `@apply text-gray-950`, `@apply border-gray-200`.
- **Do not** use `theme('colors.primary-2')` — utility class names (`primary-2`) are **not** always top-level theme keys.
- **Only use `theme()`** when you need a raw CSS value (gradient stop, `box-shadow`, custom property). Then use the **nested path** from `tailwind.config.js` → `theme.extend.colors`:

| Utility class | Valid `theme()` path |
| ------------- | -------------------- |
| `bg-primary-2` | `theme('colors.primary.2')` |
| `text-gray-950` | `theme('colors.gray.950')` |
| `border-grey-200` | `theme('colors.grey.200')` (chrome layer only) |

- Never infer `theme()` paths from utility names alone — read the real object shape in `tailwind.config.js`.

```sass
// Correct — solid fill in Sass
.home-hero
  .bg
    @apply absolute inset-0 bg-primary-1

// Wrong — utility name used as theme key
.home-hero
  .bg
    background-color: theme('colors.primary-1')
```

## Gradient fills (`Gradient/*`)

`tokens.styles` may define type-only values such as `"color": "gradient:linear:2"` for keys like `Gradient/2`, `Gradient/bg`, `Gradient/Footer`. **Stop data is not yet extracted** — treat gradients as Sass work, not as solid color utilities.

Unnamed fill keys that are clearly gradients (`linear 2`, `radial 1`, bare `gradient…`) are the same: **Sass only**. The agent token audit marks them OK and must not demand a solid Tailwind utility.

| Figma fill key | JSON value example | Code target |
| --------------- | -------------------- | ------------ |
| `Gradient/1` … `Gradient/4` | `gradient:linear:N` / `gradient:radial:N` | Theme macro `bg-gradient-*` if present, else section Sass |
| `Gradient/bg`, `Gradient/Footer` | type hint only | Section Sass |
| `linear 2`, `radial N` | unnamed gradient fill | Section Sass (visual match) |

When a node has `fi: "Gradient/*"`:

- **Do not** extract a raw hex string or invent `bg-[#…]`.
- **Do not** add gradient keys to `theme.extend.colors` as hex swatches.
- **Do** implement the visual in the co-located `index.sass` (or a shared theme gradient) by matching Figma visually until stop extraction lands.
- Prefer Sass for gradients so Pug stays under the 6-utility limit.

```pug
// Pug — structural hook only; gradient applied in Sass
section.home-banner
  .overlay
  .container
    h1.heading-1.text-white Title
```

```sass
.home-banner
  // Resolve stops from Figma visually until extract emits them
  background: linear-gradient(/* … */)
  .overlay
    @apply absolute inset-0
```

### Section roots with gradient backgrounds

Keep Pug to structure + typography; put `background` / `@apply bg-gradient-*` on the section block in Sass. Count gradient-related classes toward the 6-utility limit only when applied in Pug.

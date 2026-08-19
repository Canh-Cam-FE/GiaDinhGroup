# Layout from Figma bounds (`b`, `al`)

Parse geometry from page JSON node fields:

| JSON field | Meaning | Code |
| ---------- | ------- | ---- |
| `b.width`, `b.height` | Frame size | `clamp:w-[…]`, `ratio:pt-[H_W]`, column widths |
| `b.x`, `b.y` | Position (reference) | Spacing sanity-check only — prefer flex grid in Pug |
| `al.layoutMode` | `HORIZONTAL` / `VERTICAL` | `.row` (flex) vs. stacked `.wrap` |
| `al.padding`, `al.itemSpacing` | Gutter / gap | `clamp:py-[…]`, `gap-*`, col padding via grid |
| `al.primaryAxisAlignItems` | Alignment **along** the layout direction (main axis) | `justify-start` / `justify-center` / `justify-between` / `justify-end` |
| `al.counterAxisAlignItems` | Alignment **across** the layout direction (cross axis) | `items-start` / `items-center` / `items-end` / `items-stretch` |

**Don't conflate axes:** when `al.layoutMode: HORIZONTAL`, `primaryAxisAlignItems` is the horizontal axis (`justify-*`) and `counterAxisAlignItems` is vertical (`items-*`) — and the two swap when `layoutMode: VERTICAL`. Mapping the wrong JSON field to the wrong utility class is a common, hard-to-spot pixel-alignment bug; verify against the rendered output during visual verification, not just by reading the JSON.

| Measurement | Code |
| ----------- | ---- |
| Full-width section | `section` > `.container` (or `.container-xxl`) / `.container-fluid` |
| ~50/50 columns | `.row` > `.col.w-full(class='lg:w-1/2')` |
| 5/12 + 7/12 | `lg:w-5/12` + `lg:w-7/12` |
| Max content width | `class='xl:rem:max-w-[640px]'` |
| Fluid width | `class='clamp:w-[200-400]'` |
| Image ratio H×W | `class='ratio:pt-[H_W]'` from `b` |
| Fluid spacing | `clamp:py-[40-80]` |
| Large corner radius | `.rad-b-40`, `.rad-l-25`, … |
| Icon box | `.sq-12` |

## Grid layout

Use the global scaffold (`.container` / `.container-xxl` → `.row` → `.col` for flex columns, or `.list` + Tailwind `grid` / `grid-cols-*` for CSS Grid). Apply Tailwind V3 width utilities (`w-full`, `lg:w-1/2`, `lg:w-5/12`, …) and grid-template-column utilities (`grid-cols-1`, `md:grid-cols-2`, `lg:grid-cols-3`, …) **directly on `.col` or the grid container** — not on throwaway wrappers.

**Forbidden:** redundant `.wrap` or `.inner` divs added only for spacing or alignment. If a child exists solely to carry `gap-*`, `items-*`, or column width classes with no semantic or decorative role, delete it and move those utilities to `.col`, `.list`, `.card`, or the content element itself.

> For the canonical standard on clean layout nesting without bloat, always refer to `automation/reference/snippets/modules/grid-example/index.pug`.

## Absolute / overlapping nodes (no `al`)

Decorative shapes, floating badges, and layered hero graphics often have **no** `al` — they're not part of an auto-layout chain and rely on raw `b.x` / `b.y` to float over a sibling. Flex/grid cannot reproduce this; do not force these nodes into `.row` / `.col`.

For these nodes:

1. Make the **parent** section/wrap `.relative`.
2. Make the floating child `.absolute`.
3. Convert the child's `b.x` / `b.y` into an offset **relative to the parent's `b.width` / `b.height`** using `clamp:` (or `%`) — never a raw fixed px value, and never the parent's absolute design-canvas coordinates.
4. Treat these as a priority check during visual verification — free-floating overlap is the most common source of pixel drift, since there's no auto-layout math to lean on.

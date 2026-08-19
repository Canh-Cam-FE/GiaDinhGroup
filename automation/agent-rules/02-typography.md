# Typography (TEXT styles)

> Applies to every TEXT node in page JSON (`json/{page}.json`) after tokens are synced (`npm run extract` → `npm run tokens`). See `01-layout-agent.md` §A for the absolute NEVER rules (no `p.heading-*`, no `md:text-*`, no icon glyphs in `.body-*`, etc.) — they are not repeated here.
>
> **Authority:** class + HTML tag come only from `TYPOGRAPHY_TABLE` in `generated/agent-lookup.json`. Do not use classes that are not in that table (there is no `.body-5` or `.heading-7` in the current export).

## Resolution order

1. Strip any `#…` node-id suffix from `ty` before lookup.
2. Apply **exactly one** typography class per text node — never `md:text-lg` alongside it.
3. Resolve the semantic HTML tag and CSS class from the injected **`TYPOGRAPHY_TABLE`** — **never guess a tag from context.**
4. A node with no `ty` but `"font": "icon"|"icon2"|"icon3"`, or a `ty` containing `Font Awesome`, is a glyph icon, not body copy (see Icon exception below).
5. **TEXT with no `ty` and no icon `font`:** STOP — do not render. Report in Pre-Flight: `UNRESOLVED_TEXT: {node.tx snippet} — re-run extract or add token`. Never infer class/tag from raw `fontSize` on the JSON node.

## Single source of truth (`TYPOGRAPHY_TABLE`)

All typography node resolutions (HTML semantic tags and CSS classes) **MUST** be read directly from the injected `TYPOGRAPHY_TABLE` (emitted from DesignTokenIR → `generated/agent-lookup.json`). Never guess a tag. Never use a tag that contradicts the table.

For each TEXT node with a `ty` token, the table provides the exact `cssClass` and `html` tag to use in Pug. Do not infer tags from visual hierarchy, surrounding copy, or prior pages. Do not substitute `.heading-*` for `.heading-serif-*` (or vice versa) — the table's class is authoritative.

Whether a `Body/*` token renders as `div.body-*` or `div.desc.body-*` is a **content-shape** decision (see "Element rules" below), not a tag guess.

## Live class map (current export)

After `npm run tokens`, these are the only named contract classes. Local one-off styles may also appear as `.t*` classes in `generated/typography.js` — use those only when `ty` resolves to them.

| Figma key | Class | Tag |
| --------- | ----- | --- |
| `Body/Body-1` | `.body-1` | `div` |
| `Body/Body-2` | `.body-2` | `div` |
| `Body/Body-3` | `.body-3` | `div` |
| `Body/Body-4` | `.body-4` | `div` |
| `Heading/Heading-1` … `Heading/Heading-6` | `.heading-1` … `.heading-6` | `h2` / `h3` / `h4` (per table) |
| `Heading chân/Heading-1` … `Heading-7` | `.heading-serif-1` … `.heading-serif-7` | `h2`–`h4` / `span` |
| `Font Awesome/Brand` | `.brand` | `div` (icon exception usually applies) |
| `Font Awesome/Regular` | `.regular` | `div` (icon exception usually applies) |

There is **no** `Body/Body-5`, **no** `Heading/Heading-7`, and **no** `.heading-7` in the live table. Eyebrows use `.heading-5` / `.heading-6` or `.heading-serif-7` when the table says so.

Ensure `npm run tokens` has regenerated `generated/typography.js` before coding. Do not hard-code px — metrics come from the resolved bundle via that emit.

## Icon text node exception

In page JSON, menu bars and social links often appear as TEXT nodes meant to be icon-font glyphs, not copy text:

```json
{ "t": "TEXT", "n": "bars", "tx": "bars", "font": "icon", "fontSize": 20 }
{ "t": "TEXT", "n": "facebook-f", "tx": "facebook-f", "ty": "Font Awesome/Brand#...", "font": "icon2" }
```

A TEXT node is an icon when either:

1. `font` is `icon`, `icon2`, or `icon3`, with or without `ty`; or
2. `ty` contains `Font Awesome`.

Use the glyph name from `tx` or `n`:

- `font: "icon"` or `ty` containing `Font Awesome/Solid` → `i.fa-solid.fa-{glyph}`
- `font: "icon2"` or `ty` containing `Font Awesome/Brand` → `i.fa-brands.fa-{glyph}`
- `font: "icon3"` → `i.material-symbols-outlined` with text content = glyph name when that is the project mapping; otherwise report it.

```pug
// Menu toggle — color from node's fi via 03-colors-gradients.md
button(type='button' aria-label='Menu')
  i.fa-solid.fa-bars.text-gray-950

// Social
a(href='#' aria-label='Facebook')
  i.fa-brands.fa-facebook-f.text-primary-1
```

### Icon color rule (mandatory)

- Apply the Tailwind text-color utility **directly on the `<i>` element itself** — never rely on inherited color from a parent wrapper.
- Resolve the color from the node's `fi` via `03-colors-gradients.md` (live `gray-*` / `primary-*` tokens). Prefer Figma `gray-*` over the chrome-only `grey-*` ladder when `fi` is `Utility/gray-*`.
- Never wrap an icon glyph in a typography class (`.heading-*`, `.body-*`, `.heading-serif-*`) to control its color or size.
- Never add an extra wrapping `span`/`div` solely to carry a color utility that belongs on the `<i>` itself.

## Element rules (mandatory)

- **Headings:** `.heading-*` / `.heading-serif-*` on `h1`–`h4` or `span` only (tag from table).
- **Rich text:** `.desc` / `.zone-desc` on a `div` only — never `p.desc`, never nested `p` inside them.
- **Single body line:** one paragraph → `div.body-*`.
- **Multi-line / CMS-style block:** `div.desc.body-*` with plain text or list markup inside — not `p` children.
- **CMS content:** `article.fullcontent` is the one exception where inner nodes are not hand-styled.

```pug
h2.heading-1.text-primary-1
div.body-1.text-gray-800 Single paragraph copy.

// Multi-line / rich block — div only, no inner p
div.desc.body-1.text-gray-800
  | Gia Định Group cam kết phát triển bền vững cùng đối tác và cộng đồng.

// Eyebrow — use a class that exists in TYPOGRAPHY_TABLE (e.g. heading-6 / heading-serif-7)
span.heading-6.text-primary-2 Về chúng tôi

// Serif display heading — tag + class from TYPOGRAPHY_TABLE
h2.heading-serif-2.text-gray-950 Display title
```

## Extras

- `uppercase` in Figma → add the `.uppercase` utility on that element.
- Motion: `.fd-up`, `.fd-down`, `.text-fd-up`, optional `data-delay='200'` (×200ms).
- Families are emitted on typography classes (`font-Google-Sans-Flex`, `font-Cormorant-Garamond`, etc.). Do not override with `font-sans` unless matching the table's family.

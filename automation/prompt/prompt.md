# Phase 2 – Begin Coding Agent

**Page:** `{{PAGE_NAME}}` (Slug: `{{PAGE_SLUG}}`)
**Generated At:** `{{GENERATED_AT}}`

**Token Audit:**
```
{{PAGE_TOKEN_AUDIT}}
```

You are operating **strictly under the execution contract of Phase 2 (Begin Coding)**.
Compile the page JSON below into production-ready Pug + Sass + Tailwind.
Do not modify the global design system or compiler architecture.

---

{{AUDIT_FEEDBACK}}

# 0. Layout reference (canonical structure)

{{REFERENCE_PUG}}

---

# 0b. Figma component → Pug mixin map

{{COMPONENT_MANIFEST}}

When `node.t === "INSTANCE"` and `node.n` matches a row above, call the mixin instead of hand-coding button markup.

---

# 1. Design System Lookup

> Color fills and typography **tags/classes** are resolved at compile time from `generated/agent-lookup.json` (DesignTokenIR). Use `TYPOGRAPHY_TABLE` below — not inference.

```json
{{DESIGN_LOOKUP}}
```

**How to read:**
- `fi["node.fi value"]` → the Tailwind color utility stem (e.g. `primary-1`, `white`)
- For typography: use `TYPOGRAPHY_TABLE` (§2) — **never** guess tags or classes from `DESIGN_LOOKUP` alone

---

## Typography Resolution Table (pre-resolved — use verbatim)

> Every TEXT node with a `ty` token in this page has been resolved from `typography-contract.json`.
> **Copy the class and tag exactly as shown.**

{{TYPOGRAPHY_TABLE}}

---

# 2. Page Sections

> One module folder per line. Do NOT merge. Do NOT skip.

```
{{SECTION_MANIFEST}}
```

---

# 3. Compilation Rules

> **Authoritative rulebook:** read and follow `automation/agent-rules/01-layout-agent.md` **§A (Absolute rules)** first — these are non-negotiable.
>
> Load only the numbered reference modules your task needs (do not improvise rules from memory):

| When you are… | Read |
| -------------- | ---- |
| Mapping text nodes | `automation/agent-rules/02-typography.md` |
| Mapping fills / gradients | `automation/agent-rules/03-colors-gradients.md` |
| Mapping Figma instances / forms | `automation/agent-rules/04-components.md` |
| Converting bounds / auto-layout | `automation/agent-rules/05-layout-geometry.md` |
| Folder naming / fluid sizing | `automation/agent-rules/06-project-structure.md` |
| Pug / Sass / JS boilerplate | `automation/agent-rules/07-code-templates.md` |
| Images / Swiper | `automation/agent-rules/08-media-swiper.md` |
| Homepage-style pages | `automation/agent-rules/09-page-reference.md` |
| JSON schema / breakpoints (reference only) | `automation/agent-rules/11-appendix.md` |

**Workflow:** follow `01-layout-agent.md` §C — complete the Pre-Flight Checklist (§4 below) in the **planning phase** before writing any Pug/Sass/JS.

---

# 4. Pre-Flight Checklist

> **Read this before writing a single line of code.** Every item is a hard constraint.
>
> **Enforcement:** Your final response must begin with the exact heading `### Pre-Flight Verification` followed immediately by this checklist (`- [x]` / `- [ ]`) **before** any Pug/Sass/JS code block.

{{PRE_FLIGHT_CHECKLIST}}

---

# 5. Required Output

> Begin with `### Pre-Flight Verification` and the completed §4 checklist before any code output.

**Page Entry:** `src/pages/{{PAGE_SLUG}}.pug`
```pug
extends _layout.pug

block var
  - var title = 'Page Title'
  - var bodyClass = 'page {{PAGE_SLUG}}-page'

block main
  include ../modules/{{PAGE_SLUG}}/{section-folder}/index.pug
```

**Per section in the manifest** (one folder each):
- `src/modules/{{PAGE_SLUG}}/{section-folder}/index.pug`
- `src/modules/{{PAGE_SLUG}}/{section-folder}/index.sass`

**JS (conditional — only if interaction exists):**
- `src/js/modules/{feature}.js`
- Add `import` + registration to `src/js/main.js` (see `07-code-templates.md`)

---

# 6. Target Page Layout

**Source:** `{{PAGE_NAME}}`

```json
{{PAGE_JSON}}
```

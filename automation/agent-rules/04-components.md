# Figma components → mixins

| Figma component | Use |
| ---------------- | --- |
| `Button 1` / primary CTA | `+btn1('Label')` |
| Secondary outline | `+btn2('Label')` |
| Tertiary / link | `+btn3('Label')` |
| Default / dropdown | `+btn4('Label')` |
| Arrow only | `+btn6` |
| Image | `+FooImg(url, className)` |
| News card | `+newsItem()` |
| Side news / Small news | `+sideNews()` |
| Doctor card / item | `+doctorItem(data)` |
| Customer card / item | `+customerItem(data)` |
| Product card / item | `+productItem()` |
| Form / Input blocks | `+formSample()` (convert static Figma inputs into an interactive `.wrap-form > .wpcf7-form`) |
| Toggle / Accordion / FAQ | `+toggleItem()` |
| Social links / group | `+social()` |
| Swiper nav | `+SlideBtn()` … `+SlideGroup()` |
| Header / Footer | `components/header`, `components/footer` |
| Hero slider | `section.primary-banner` or equivalent Swiper section structure in `modules/home/banner/` |

Full list: `src/modules/mixin.pug` and `manifest.json` → `components`.

## Mandatory form detection

When you detect Figma elements that look like a form (named `Form`, `Input`, `Field`, `Textarea`, or containing input-placeholder text and a submit button), **do not** extract them as static divs and text. Generate an interactive semantic HTML form using this exact structure (`.wrap-form > .wpcf7-form > .form-group`):

> **Warning:** The provided `.wpcf7-form` snippet below is a *structural shell* only. You **MUST NOT** blindly copy-paste the example fields (Name, Select, Textarea). Adapt the generated inputs to match the exact text layers, fields, and placeholders found in the specific Figma JSON for this section.

```pug
.wrap-form
  .wpcf7-form
    .form-group
      label Tên field
      input(type="text" placeholder="Placeholder từ Figma")
    .form-group
      label Select field
      .custom-select
        select
          option Option 1
    .form-group
      label Nội dung
      textarea(placeholder="Placeholder")
    .frm-btnwrap.flex-start
      button.btn.btn-primary
        span Gửi thông tin
```

## Form + icon composition

When a form subtree (detected per mandatory form detection above) also contains icon TEXT nodes (`font: icon|icon2|icon3`, or `ty` containing `Font Awesome`):

1. **Section-level:** still use `.wrap-form > .wpcf7-form` — adapt fields to match the Figma JSON; do not blind-copy `+formSample()` without field changes.
2. **Field-level icons:** render each icon as `i.fa-solid.fa-*` / `i.fa-brands.fa-*` / `i.material-symbols-outlined` inside the relevant `.form-group` (label prefix, input suffix, or submit button) — never as `div.body-*`.
3. **Submit buttons:** prefer `+btn1`–`+btn6` when the INSTANCE matches; otherwise `button.btn` with `span` label + `i.fa-*` for arrow/glyph children.
4. **Precedence:** icon rules from `02-typography.md` override form field text styling — icons are never typography nodes.

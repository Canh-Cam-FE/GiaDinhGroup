# Visual Layout Confirmation — Review Brief

> **Superseded by [Layout Geometry Audit](./layout-geometry-audit-plan.md).**
> Reviewed 2026-08: the per-page reference PNG this brief depends on does not
> exist and no pipeline step produces it, the pages load fonts from a remote CDN
> so rendering is not reproducible, and the page JSON carries relative box/gap
> data rather than the absolute positions a pixel diff tests. Kept for the
> edge-case inventory below.

## Goal

Add deterministic visual confirmation after the Figma JSON → Pug/Sass coding phase.

The reference image basename matches its page JSON:

```text
json/home.json  <-> images/home.png
json/about.json <-> images/about.png
```

Optional responsive references use `images/{slug}@{width}.png`, for example
`images/home@768.png`.

Reference images confirm composition and spacing only. They must never override
JSON `ty`, `fi`, `tx`, component mappings, or design tokens.

## Recommended architecture

Use a hybrid audit rather than a strict pixel-only comparison:

1. Validate reference-to-page filename mapping.
2. Build the production site.
3. Serve `dist/` on an isolated local port.
4. Capture the page with pinned Chromium at the reference width and DPR 1.
5. Wait for fonts, images, lazy loading, and network stability.
6. Freeze animations, sliders, videos, transitions, and carets.
7. Compare normalized reference and actual images.
8. Produce raw mismatch and a layout result with 2px positional tolerance.
9. Attribute mismatch percentages to rendered `section.*` roots.
10. Save machine-readable feedback for the next agent run.

A raw pixel diff cannot independently prove ±2px layout accuracy because font
antialiasing, image compression, and color profiles create harmless pixel
changes. The 2px tolerance-aware result should be the layout gate; raw mismatch
remains diagnostic.

## Proposed files

```text
automation/
├── config/visual-audit.json
├── scripts/visual-reference-check.mjs
├── scripts/visual-audit.mjs
└── scripts/lib/
    ├── visual-browser.mjs
    ├── visual-diff.mjs
    └── visual-report.mjs

.artifacts/visual-audit/{slug}/
├── actual.png
├── diff.png
├── overlay.png
└── report.json
```

Keep generated reports outside `json/`; otherwise the current page scanner may
mistake an audit report for a page. Gitignore `.artifacts/visual-audit/`.

## Proposed commands

```bash
npm run visual:check -- home.json
npm run audit:visual -- home.json
npm run audit:visual:all
```

Expected page pipeline:

```bash
npm run tokens:check
npm run prod
npm run audit:modules:page -- --page home
npm run audit:typography:page -- --page home
npm run audit:visual -- home.json
```

Route resolution should special-case `home` as `/index.html`; other pages use
`/{slug}.html`.

## Report requirements

Each report should include:

- Reference and actual dimensions.
- Page-height difference.
- Raw pixel mismatch percentage.
- 2px tolerance-aware mismatch percentage.
- Pass, fail, skip, or blocker status.
- Worst section mismatches.
- Largest mismatch bounding boxes.
- Missing fonts and failed image URLs.
- Paths to actual, diff, and overlay images.

Suggested artifacts:

```text
.artifacts/visual-audit/home/actual.png
.artifacts/visual-audit/home/diff.png
.artifacts/visual-audit/home/overlay.png
.artifacts/visual-audit/home/report.json
```

## Agent feedback integration

`agent-compiler.js` should read the latest report for the selected page and
inject a compact visual-feedback section into `agent-coding-prompt.txt`:

- Reference path and dimensions.
- Required viewport.
- Previous audit status.
- Height difference.
- Worst sections and mismatch rectangles.
- Artifact paths.

The coding-agent loop is:

1. Map JSON structure, typography, fills, text, and components.
2. Implement page modules.
3. Run module and typography audits.
4. Run the visual audit.
5. Inspect the highest-impact diff region.
6. Correct layout and rerun.
7. Stop after about three unchanged failures and report the blocker instead of
   adding arbitrary CSS offsets.

## Required deterministic capture behavior

- Use pinned Chromium and `deviceScaleFactor: 1`.
- Use the reference image width as the CSS viewport width.
- Use a configurable viewport height, defaulting to 1080px.
- Await `document.fonts.ready`.
- Decode all images and perform controlled scrolling for lazy-loaded assets.
- Disable CSS animation, transitions, and blinking carets.
- Stop carousel timers and select a deterministic slide.
- Pause video and use a deterministic poster/frame.
- Normalize color space, alpha, and background before comparison.
- Tile very tall screenshots when browser or image-library limits are reached.

## Edge cases

- **Missing reference:** `SKIP` locally; fail only with `--require-reference`.
- **Multiple matching extensions:** fail as ambiguous.
- **Case mismatch:** fail and show the exact expected filename.
- **JPEG reference:** allow with a warning and higher color threshold; keep the
  2px layout tolerance unchanged.
- **Retina export:** never silently resize a 2x image; require explicit config.
- **Different heights:** pad the comparison canvas and report the exact delta.
- **Remote font failure:** blocker; do not compare fallback-font rendering.
- **Broken/pending images:** blocker listing failed URLs.
- **Sticky/fixed tools:** apply an explicit freeze or hide policy.
- **Dynamic/API content:** freeze or stub known values; exclude only configured
  dynamic regions.
- **Browser chrome in reference:** reject by default; permit only configured
  cropping.
- **Transparent reference:** flatten against the configured page background.
- **Responsive references:** audit every `@width` independently.
- **CI rendering differences:** use the same pinned Chromium and fonts locally
  and in CI.
- **Non-page JSON:** continue using `page-json-skip.mjs` so system and audit JSON
  files are never treated as pages.

## Implementation sequence

1. Reference discovery and validation.
2. Deterministic browser capture.
3. Image normalization, diff, overlay, and JSON report.
4. Section attribution and 2px positional tolerance.
5. npm commands, configuration, gitignore, and documentation.
6. Agent prompt feedback integration.
7. Pre-flight checklist integration.
8. Threshold calibration on all current pages.
9. CI gating after local results are stable.

## Reviewer checklist

- [ ] `images/{slug}` mapping cannot include non-page JSON.
- [ ] Reference images are never used as token, typography, fill, or copy
      authority.
- [ ] Audit starts and stops its own server without conflicting with `npm start`.
- [ ] Browser, DPR, viewport, fonts, images, animations, sliders, and videos are
      deterministic.
- [ ] Report is written outside `json/`.
- [ ] Both raw and 2px tolerance-aware mismatch metrics are present.
- [ ] Height differences and image-size mismatches are explicit.
- [ ] Section-level diagnostics identify where corrections are needed.
- [ ] Missing fonts/assets produce blockers rather than misleading diffs.
- [ ] The compiler injects concise previous-audit feedback, not image data.
- [ ] Retry behavior is bounded and does not encourage arbitrary CSS fixes.
- [ ] CI uses the same rendering environment as local auditing.

## Acceptance criteria

The solution is ready when:

1. `npm run audit:visual -- home.json` discovers `images/home.png`.
2. It builds and captures `/index.html` at the correct width.
3. It produces actual, diff, overlay, and JSON report artifacts.
4. A deliberate layout shift greater than 2px fails and identifies its section.
5. A shift within the configured tolerance does not fail solely from
   antialiasing noise.
6. Missing fonts or images return a blocker.
7. The next generated coding prompt contains useful visual-audit feedback.
8. All current page references can run through `audit:visual:all`.

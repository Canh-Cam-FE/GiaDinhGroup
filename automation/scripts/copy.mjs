#!/usr/bin/env node
/**
 * LEGACY — not wired in package.json. Superseded by extract.mjs.
 *
 * Reduces raw Figma REST/file JSON into a compact artifact for coding agents:
 * design tokens, layout map, component manifest, repeated-block hints,
 * accessibility notes, and responsive strategy signals.
 *
 * Usage (manual only):
 *   node automation/scripts/copy.mjs --input figma.json --output figma-for-coding-agent.json
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--input" && argv[i + 1]) args.input = argv[++i];
  else if (argv[i] === "--output" && argv[i + 1]) args.output = argv[++i];
}

const INPUT = path.resolve(args.input ?? path.join(process.cwd(), "figma.json"));
const OUTPUT = path.resolve(
  args.output ?? path.join(process.cwd(), "figma-for-coding-agent.json"),
);

function roundColor(c) {
  if (!c || typeof c !== "object") return null;
  const r = Math.round((c.r ?? 0) * 1000) / 1000;
  const g = Math.round((c.g ?? 0) * 1000) / 1000;
  const b = Math.round((c.b ?? 0) * 1000) / 1000;
  const a = c.a === undefined ? 1 : Math.round(c.a * 1000) / 1000;
  return { r, g, b, a };
}

function colorKey(c) {
  const x = roundColor(c);
  if (!x) return null;
  return `rgba(${x.r},${x.g},${x.b},${x.a})`;
}

function luminance(c) {
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const R = lin(c.r);
  const G = lin(c.g);
  const B = lin(c.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(fg, bg) {
  const L1 = luminance(fg);
  const L2 = luminance(bg);
  const light = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return (light + 0.05) / (dark + 0.05);
}

function firstSolidFillColor(node) {
  const fills = node.fills;
  if (!Array.isArray(fills)) return null;
  for (const f of fills) {
    if (f?.visible === false) continue;
    if (f?.type === "SOLID" && f.color) return roundColor(f.color);
  }
  return null;
}

function buildMaps(root) {
  const idToNode = new Map();
  const idToParent = new Map();

  function walk(n, parentId) {
    idToNode.set(n.id, n);
    idToParent.set(n.id, parentId);
    if (n.children) for (const c of n.children) walk(c, n.id);
  }
  walk(root, null);
  return { idToNode, idToParent };
}

function ancestorFrameBackground(id, idToNode, idToParent) {
  let cur = idToParent.get(id);
  while (cur) {
    const n = idToNode.get(cur);
    if (!n) break;
    if (n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE") {
      const bg = firstSolidFillColor(n);
      if (bg) return bg;
    }
    cur = idToParent.get(cur);
  }
  return { r: 1, g: 1, b: 1, a: 1 };
}

const CATEGORY_RULES = [
  ["button", /\b(btn|button|cta|chip|fab)\b/i],
  ["card", /\b(card|tile|panel)\b/i],
  ["navbar", /\b(nav|navbar|app\s*bar|top\s*bar|header)\b/i],
  ["slider", /\b(slider|carousel|swipe|pager)\b/i],
  ["testimonial", /\b(testimonial|quote|review)\b/i],
  ["form", /\b(form|input|field|dropdown|select)\b/i],
  ["modal", /\b(modal|dialog|sheet|drawer)\b/i],
  ["tooltip", /\b(tooltip|hint)\b/i],
];

function categorizeName(name) {
  if (!name) return [];
  const tags = [];
  for (const [tag, re] of CATEGORY_RULES) {
    if (re.test(name)) tags.push(tag);
  }
  return tags;
}

function summarizeAutoLayout(n) {
  if (n.layoutMode && n.layoutMode !== "NONE") {
    return {
      mode: n.layoutMode,
      primaryAxisSizingMode: n.primaryAxisSizingMode,
      counterAxisSizingMode: n.counterAxisSizingMode,
      primaryAxisAlignItems: n.primaryAxisAlignItems,
      counterAxisAlignItems: n.counterAxisAlignItems,
      padding: {
        top: n.paddingTop,
        right: n.paddingRight,
        bottom: n.paddingBottom,
        left: n.paddingLeft,
      },
      itemSpacing: n.itemSpacing,
      layoutWrap: n.layoutWrap,
    };
  }
  return null;
}

function bbox(n) {
  return n.absoluteBoundingBox
    ? {
        x: n.absoluteBoundingBox.x,
        y: n.absoluteBoundingBox.y,
        width: n.absoluteBoundingBox.width,
        height: n.absoluteBoundingBox.height,
      }
    : null;
}

function childTypeSignature(children) {
  if (!children?.length) return "";
  return children.map((c) => c.type).join(">");
}

function bucketDim(w) {
  if (w == null || Number.isNaN(w)) return "?";
  return String(Math.round(w / 8) * 8);
}

function typographyTraits(st) {
  if (!st) return null;
  return {
    fontFamily: st.fontFamily,
    fontPostScriptName: st.fontPostScriptName,
    fontStyle: st.fontStyle,
    fontWeight: st.fontWeight,
    fontSize: st.fontSize,
    lineHeightPx: st.lineHeightPx,
    lineHeightPercent: st.lineHeightPercent,
    lineHeightUnit: st.lineHeightUnit,
    letterSpacing: st.letterSpacing,
    textAlignHorizontal: st.textAlignHorizontal,
    textAlignVertical: st.textAlignVertical,
    textCase: st.textCase,
  };
}

function traitsFingerprint(traits) {
  if (!traits) return "";
  return [
    traits.fontFamily,
    traits.fontWeight,
    traits.fontSize,
    traits.lineHeightPx ?? traits.lineHeightPercent ?? "",
    traits.letterSpacing ?? 0,
    traits.textCase ?? "",
  ].join("|");
}

function traitsEqual(a, b) {
  if (!a || !b) return false;
  return traitsFingerprint(a) === traitsFingerprint(b);
}

function fillValueFromNode(n) {
  const fills = n.fills;
  if (!Array.isArray(fills)) return null;
  for (const f of fills) {
    if (f?.visible === false) continue;
    if (f.type === "SOLID" && f.color) {
      return { kind: "solid", color: roundColor(f.color) };
    }
    if (f.type === "GRADIENT_LINEAR" || f.type === "GRADIENT_RADIAL") {
      return {
        kind: "gradient",
        type: f.type,
        stopCount: f.gradientStops?.length ?? 0,
      };
    }
  }
  return null;
}

function summarizeEffects(effects) {
  if (!Array.isArray(effects)) return null;
  const visible = effects.filter((e) => e.visible !== false);
  if (!visible.length) return null;
  return visible.map((e) => ({
    type: e.type,
    radius: e.radius,
    offset: e.offset,
    spread: e.spread,
    color: e.color ? roundColor(e.color) : undefined,
  }));
}

function initStyleRegistry(rawStyles) {
  const byId = new Map();
  const nameToIds = new Map();

  for (const [id, meta] of Object.entries(rawStyles)) {
    byId.set(id, {
      id,
      name: meta.name,
      styleType: meta.styleType,
      description: meta.description || undefined,
      usageCount: 0,
    });
    const ids = nameToIds.get(meta.name) ?? [];
    ids.push(id);
    nameToIds.set(meta.name, ids);
  }
  return { byId, nameToIds };
}

/** Shared key for figmaStyles + resolved traits (disambiguate duplicate names). */
function styleLookupKey(name, id, nameToIds) {
  if ((nameToIds.get(name)?.length ?? 0) <= 1) return name;
  return `${name}#${id}`;
}

function mergeFillValue(entry, next) {
  if (!next) return;
  if (!entry.fill) {
    entry.fill = next;
    return;
  }
  if (entry.fill.kind === "solid" && next.kind === "solid") {
    const a = colorKey(entry.fill.color);
    const b = colorKey(next.color);
    if (a !== b) entry.fillConflict = true;
  } else if (JSON.stringify(entry.fill) !== JSON.stringify(next)) {
    entry.fillConflict = true;
  }
}

function recordStyleUsage(byId, styleId, rawStyles, apply) {
  let entry = byId.get(styleId);
  if (!entry) {
    const meta = rawStyles[styleId];
    if (!meta) return;
    entry = {
      id: styleId,
      name: meta.name,
      styleType: meta.styleType,
      description: meta.description || undefined,
      usageCount: 0,
    };
    byId.set(styleId, entry);
  }
  entry.usageCount++;
  apply(entry);
}

function buildNamedStylesExport(byId, nameToIds) {
  const named = {};
  for (const [id, entry] of byId) {
    const key = styleLookupKey(entry.name, id, nameToIds);
    const out = { ...entry, key };
    if (out.traits) {
      Object.assign(out, out.traits);
      delete out.traits;
    }
    named[key] = out;
  }
  return named;
}

function extract(raw) {
  const doc = raw.document;
  const { idToNode, idToParent } = buildMaps(doc);
  const rawStyles = raw.styles ?? {};
  const { byId: stylesById, nameToIds } = initStyleRegistry(rawStyles);

  const colors = new Map();
  const localTypography = new Map();
  const paddings = new Set();
  const gaps = new Set();
  const radii = new Set();
  const grids = [];
  const layoutCanvases = [];
  const instanceByComponent = new Map();
  const fingerprintHits = new Map();
  const heuristicCategories = Object.fromEntries(CATEGORY_RULES.map(([t]) => [t, new Set()]));

  let nodeCount = 0;
  const sizingH = {};
  const sizingV = {};
  const axisPrimary = {};
  const axisCounter = {};
  let wrapCount = 0;
  let autoLayoutFrames = 0;

  const contrastSamples = [];
  const contrastRisks = [];
  const emptyTextNodes = [];

  function noteContrastRisk(ratio, n, fg, bg) {
    const severity = ratio < 3 ? "critical" : ratio < 4.5 ? "aa_fail" : "ok";
    if (severity === "ok") return;
    contrastRisks.push({
      severity,
      contrastRatio: Math.round(ratio * 100) / 100,
      nodeId: n.id,
      name: n.name,
      textPreview: n.characters.slice(0, 120),
      fg,
      bg,
    });
  }

  function walkNode(n) {
    nodeCount++;

    if (Array.isArray(n.fills)) {
      for (const f of n.fills) {
        if (f?.visible === false) continue;
        if (f.type === "SOLID" && f.color) {
          const k = colorKey(f.color);
          if (k && !colors.has(k)) colors.set(k, roundColor(f.color));
        }
      }
    }

    if (n.styles?.fill) {
      recordStyleUsage(stylesById, n.styles.fill, rawStyles, (entry) => {
        mergeFillValue(entry, fillValueFromNode(n));
      });
    }

    if (n.styles?.effect) {
      recordStyleUsage(stylesById, n.styles.effect, rawStyles, (entry) => {
        const fx = summarizeEffects(n.effects);
        if (fx) {
          if (!entry.effects) entry.effects = fx;
          else if (JSON.stringify(entry.effects) !== JSON.stringify(fx)) {
            entry.effectConflict = true;
          }
        }
      });
    }

    if (n.type === "TEXT") {
      const st = n.style;
      const traits = typographyTraits(st);

      if (n.styles?.text) {
        recordStyleUsage(stylesById, n.styles.text, rawStyles, (entry) => {
          if (traits) {
            if (!entry.traits) entry.traits = traits;
            else if (!traitsEqual(entry.traits, traits)) entry.traitConflict = true;
          }
          const fillStyleId = n.styles.fill;
          if (fillStyleId) {
            const fillMeta = rawStyles[fillStyleId];
            if (fillMeta) entry.fillStyleKey = styleLookupKey(fillMeta.name, fillStyleId, nameToIds);
          }
        });
      } else if (traits) {
        const fp = traitsFingerprint(traits);
        const local = localTypography.get(fp) ?? { ...traits, usageCount: 0, local: true };
        local.usageCount++;
        localTypography.set(fp, local);
      }

      const fg = firstSolidFillColor(n);
      if (fg && n.characters?.trim()) {
        const bg = ancestorFrameBackground(n.id, idToNode, idToParent);
        const ratio = contrastRatio(fg, bg);
        if (contrastSamples.length < 80) {
          contrastSamples.push({
            textPreview: n.characters.slice(0, 80),
            nodeId: n.id,
            name: n.name,
            contrastRatio: Math.round(ratio * 100) / 100,
            fg,
            bg,
          });
        }
        noteContrastRisk(ratio, n, fg, bg);
      }
      if (!n.characters?.trim()) {
        if (emptyTextNodes.length < 40) {
          emptyTextNodes.push({ nodeId: n.id, name: n.name });
        }
      }
    }

    if (n.paddingTop != null) {
      paddings.add(n.paddingTop);
      paddings.add(n.paddingRight);
      paddings.add(n.paddingBottom);
      paddings.add(n.paddingLeft);
    }
    if (n.itemSpacing != null) gaps.add(n.itemSpacing);

    if (n.cornerRadius != null && n.cornerRadius > 0) radii.add(n.cornerRadius);
    if (Array.isArray(n.rectangleCornerRadii)) {
      for (const r of n.rectangleCornerRadii) if (r > 0) radii.add(r);
    }

    if (n.layoutGrids?.length) {
      grids.push({
        nodeId: n.id,
        name: n.name,
        type: n.type,
        layoutGrids: n.layoutGrids.map((g) => ({
          pattern: g.pattern,
          sectionSize: g.sectionSize,
          gutterSize: g.gutterSize,
          count: g.count,
          alignment: g.alignment,
          visible: g.visible,
        })),
      });
    }

    if (n.layoutMode && n.layoutMode !== "NONE") {
      autoLayoutFrames++;
      const lh = n.layoutSizingHorizontal ?? "IMPLICIT";
      const lv = n.layoutSizingVertical ?? "IMPLICIT";
      sizingH[lh] = (sizingH[lh] ?? 0) + 1;
      sizingV[lv] = (sizingV[lv] ?? 0) + 1;
      if (n.primaryAxisSizingMode) {
        axisPrimary[n.primaryAxisSizingMode] = (axisPrimary[n.primaryAxisSizingMode] ?? 0) + 1;
      }
      if (n.counterAxisSizingMode) {
        axisCounter[n.counterAxisSizingMode] = (axisCounter[n.counterAxisSizingMode] ?? 0) + 1;
      }
      if (n.layoutWrap && n.layoutWrap !== "NO_WRAP") wrapCount++;
    }

    if (n.type === "INSTANCE" && n.componentId) {
      instanceByComponent.set(
        n.componentId,
        (instanceByComponent.get(n.componentId) ?? 0) + 1,
      );
    }

    const tags = categorizeName(n.name);
    for (const t of tags) heuristicCategories[t].add(`${n.type}:${n.name}`);

    const sigTypes = ["FRAME", "GROUP", "COMPONENT", "INSTANCE"];
    if (sigTypes.includes(n.type) && n.children?.length >= 2) {
      const box = n.absoluteBoundingBox;
      const fp = [
        n.type,
        childTypeSignature(n.children),
        bucketDim(box?.width),
        bucketDim(box?.height),
      ].join("||");
      const entry = fingerprintHits.get(fp) ?? { count: 0, examples: [] };
      entry.count++;
      if (entry.examples.length < 5) {
        entry.examples.push({ id: n.id, name: n.name, type: n.type });
      }
      fingerprintHits.set(fp, entry);
    }

    if (n.children) for (const c of n.children) walkNode(c);
  }

  walkNode(doc);

  for (const canvas of doc.children ?? []) {
    if (canvas.type !== "CANVAS") continue;
    const sections = [];
    const topFrames = [];
    for (const ch of canvas.children ?? []) {
      if (ch.type === "SECTION") {
        sections.push({
          id: ch.id,
          name: ch.name,
          bbox: bbox(ch),
          childCount: ch.children?.length ?? 0,
          childNames: (ch.children ?? []).slice(0, 12).map((c) => c.name),
        });
      } else if (ch.type === "FRAME") {
        topFrames.push({
          id: ch.id,
          name: ch.name,
          bbox: bbox(ch),
          autoLayout: summarizeAutoLayout(ch),
          childCount: ch.children?.length ?? 0,
        });
      }
    }
    layoutCanvases.push({
      id: canvas.id,
      name: canvas.name,
      sections,
      topLevelFrames: topFrames,
    });
  }

  const componentSets = raw.componentSets ?? {};
  const components = raw.components ?? {};
  const setIdToVariants = new Map();
  for (const [cid, meta] of Object.entries(components)) {
    const sid = meta.componentSetId;
    if (sid) {
      if (!setIdToVariants.has(sid)) setIdToVariants.set(sid, []);
      setIdToVariants.get(sid).push(cid);
    }
  }

  const manifestSets = Object.entries(componentSets).map(([id, meta]) => ({
    id,
    name: meta.name,
    description: meta.description || undefined,
    variantCount: setIdToVariants.get(id)?.length ?? 0,
  }));

  const topInstances = [...instanceByComponent.entries()]
    .map(([componentId, count]) => {
      const meta = components[componentId];
      return {
        componentId,
        instanceCount: count,
        name: meta?.name ?? "(unknown)",
        componentSetId: meta?.componentSetId,
        setName: meta?.componentSetId ? componentSets[meta.componentSetId]?.name : undefined,
      };
    })
    .sort((a, b) => b.instanceCount - a.instanceCount)
    .slice(0, 60);

  const repeatedBlocks = [...fingerprintHits.entries()]
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 40)
    .map(([fingerprint, v]) => ({
      fingerprint,
      occurrenceCount: v.count,
      examples: v.examples,
    }));

  const heuristicSummary = Object.fromEntries(
    Object.entries(heuristicCategories).map(([k, set]) => [k, [...set].slice(0, 30)]),
  );

  const namedStyles = buildNamedStylesExport(stylesById, nameToIds);

  const failedContrast = contrastSamples.filter((c) => c.contrastRatio < 4.5).length;
  contrastRisks.sort((a, b) => a.contrastRatio - b.contrastRatio);
  const contrastFindings = contrastRisks.slice(0, 60);

  return {
    meta: {
      sourceFile: path.basename(INPUT),
      extractedAt: new Date().toISOString(),
      figmaSchemaVersion: raw.schemaVersion,
      fileName: raw.name,
      lastModified: raw.lastModified,
      nodeCount,
      stats: {
        componentsDefined: Object.keys(components).length,
        componentSets: Object.keys(componentSets).length,
        styles: Object.keys(rawStyles).length,
        autoLayoutFrames,
      },
    },
    designTokens: {
      /** Semantic paths (e.g. Heading/Heading-1) map to resolved values + style id. */
      namedStyles,
      /** TEXT without styles.text — detached / overridden type. */
      localTypography: [...localTypography.values()]
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 80),
      /** Raw fills not tied to a Figma paint style (gradients, one-offs). */
      orphanColors: [...colors.entries()].slice(0, 250).map(([token, value]) => ({ token, ...value })),
      spacing: {
        paddingValues: [...paddings].sort((a, b) => a - b).slice(0, 80),
        gapValues: [...gaps].sort((a, b) => a - b).slice(0, 80),
        cornerRadii: [...radii].sort((a, b) => a - b).slice(0, 60),
      },
    },
    layoutMap: {
      canvases: layoutCanvases,
      grids: grids.slice(0, 120),
    },
    componentManifest: {
      sets: manifestSets,
      topInstances,
    },
    detectedPatterns: {
      repeatedStructures: repeatedBlocks,
      heuristicCategories: heuristicSummary,
    },
    accessibilityReport: {
      summary: {
        textNodesSampledForContrast: contrastSamples.length,
        samplesBelow_4_5: failedContrast,
        contrastRisksTotal: contrastRisks.length,
        emptyTextNodeExamples: emptyTextNodes.length,
      },
      contrastSamples,
      contrastFindings,
      emptyTextNodes,
      notes: [
        "Contrast uses parent FRAME/COMPONENT solid fills only; gradients, images, and variables may differ in production.",
        "VECTOR and BOOLEAN_OPERATION nodes often lack accessible names; map to meaningful labels or aria-hidden in code.",
      ],
    },
    responsiveStrategy: {
      layoutSizingHorizontal: sizingH,
      layoutSizingVertical: sizingV,
      primaryAxisSizingMode: axisPrimary,
      counterAxisSizingMode: axisCounter,
      autoLayoutFramesWithWrap: wrapCount,
      recommendations: buildResponsiveRecommendations({
        sizingH,
        sizingV,
        axisPrimary,
        axisCounter,
        wrapCount,
        autoLayoutFrames,
      }),
    },
  };
}

function buildResponsiveRecommendations({
  sizingH,
  sizingV,
  axisPrimary,
  axisCounter,
  wrapCount,
  autoLayoutFrames,
}) {
  const rec = [];
  const fixedH = sizingH.FIXED ?? 0;
  const fillH = sizingH.FILL ?? 0;
  const hugH = sizingH.HUG ?? 0;
  if (autoLayoutFrames > 0) {
    rec.push(
      `Auto-layout present on ${autoLayoutFrames} nodes: prefer CSS flex/grid with gap mirroring itemSpacing.`,
    );
  }
  if (fillH > fixedH + hugH) {
    rec.push("Many horizontal FILL sizing modes: use width:100% / flex:1 patterns for major columns.");
  }
  if ((axisPrimary.FIXED ?? 0) > (axisPrimary.AUTO ?? 0) + (axisPrimary.FILL ?? 0)) {
    rec.push("Primary axis often FIXED: confirm breakpoints; consider min-width and overflow handling.");
  }
  if (wrapCount > 0) {
    rec.push(`layoutWrap used ${wrapCount} times: enable flex-wrap in CSS for those stacks.`);
  }
  if ((sizingV.FILL ?? 0) > (sizingV.FIXED ?? 0)) {
    rec.push("Vertical FILL is common: use flex column + flex-grow or grid row stretch.");
  }
  return rec;
}

function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`Input not found: ${INPUT}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const out = extract(raw);
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote ${OUTPUT} (${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KiB)`);
}

main();

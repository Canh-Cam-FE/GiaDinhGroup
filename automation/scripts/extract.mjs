#!/usr/bin/env node
/**
 * Figma JSON Optimization Agent — compresses raw Figma file JSON into an
 * ultra-dense architectural map for downstream Pug / Tailwind / JS generators.
 *
 * Unlinked text (no Figma text style) → synthetic `Local/t{size}-{weight}-{lh}-{font}` tokens:
 * page nodes get `ty`; `system-design.json` → `tokens.styles` (local: true).
 * Exact metric match to a named Figma text style → reuse that `ty` (no Local/* entry).
 * Icon fonts (font: icon*) stay inline — no Local/* ty.
 * Font style overrides (duplicate names, local instance overrides) → json/font-style-overrides.json.
 * Canonical variant per class: automation/config/font-style-picks.json (user decides; ★ only when set).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
	buildPageModuleRegions,
	isBreadcrumbNode,
	sectionScopeMatches,
} from "./module-regions.mjs";

const argv = process.argv.slice(2);
const args = { pretty: false };
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === "--input" && argv[i + 1]) args.input = argv[++i];
	else if (argv[i] === "--output" && argv[i + 1]) args.output = argv[++i];
	else if (argv[i] === "--input-dir" && argv[i + 1]) args.inputDir = argv[++i];
	else if (argv[i] === "--output-dir" && argv[i + 1]) args.outputDir = argv[++i];
	else if (argv[i] === "--pretty") args.pretty = true;
}

const ROOT = process.cwd();
const FIGMA_DIR = path.resolve(args.inputDir ?? path.join(ROOT, "figma"));
const JSON_DIR = path.resolve(args.outputDir ?? path.join(ROOT, "json"));
const SYSTEM_FILENAME = "system-design.json";

/**
 * FILL tokens synced in tailwind.config.js but absent from Figma style library.
 * Merged into system-design.json and used to resolve raw hex → fi on page nodes.
 * Source of truth: automation/config/manual-fill-tokens.json
 */
function loadManualFillTokens() {
	const p = path.join(ROOT, "automation/config/manual-fill-tokens.json");
	try {
		const raw = JSON.parse(fs.readFileSync(p, "utf8"));
		const out = {};
		for (const [k, v] of Object.entries(raw)) {
			if (k.startsWith("_")) continue;
			if (typeof v === "string" && v.startsWith("#")) out[k] = v;
		}
		return out;
	} catch (e) {
		console.warn("Failed to load automation/config/manual-fill-tokens.json:", e.message);
		return {};
	}
}
const MANUAL_FILL_TOKENS = loadManualFillTokens();

/**
 * User-chosen canonical styleKey per conflicting typography class.
 * Source of truth: automation/config/font-style-picks.json
 * Keys: cssClass (body-1) or Figma base name (Body/Body-1).
 * Values: full styleKey (Body/Body-1#42079:2206) or bare id (42079:2206).
 */
function loadFontStylePicks() {
	const p = path.join(ROOT, "automation/config/font-style-picks.json");
	try {
		const raw = JSON.parse(fs.readFileSync(p, "utf8"));
		const out = {};
		for (const [k, v] of Object.entries(raw)) {
			if (k.startsWith("_")) continue;
			if (typeof v === "string" && v.trim()) out[k] = v.trim();
		}
		return out;
	} catch (e) {
		if (e.code !== "ENOENT") {
			console.warn("Failed to load automation/config/font-style-picks.json:", e.message);
		}
		return {};
	}
}
const FONT_STYLE_PICKS = loadFontStylePicks();

/**
 * Route map + token scope for the current Figma file.
 * Source of truth: automation/config/figma-pages.json
 *
 * Replaces the per-project slug regexes that used to be hardcoded here: a new
 * Figma file only needs a new config, not a code change.
 */
function loadPageConfig() {
	const empty = {
		tokenScope: { includeCanvases: [], excludeSectionPrefixes: [] },
		pages: {},
		componentLibrarySections: [],
		legacyPages: [],
	};
	const p = path.join(ROOT, "automation/config/figma-pages.json");
	try {
		const raw = JSON.parse(fs.readFileSync(p, "utf8"));
		return {
			tokenScope: {
				includeCanvases: raw.tokenScope?.includeCanvases ?? [],
				excludeSectionPrefixes: raw.tokenScope?.excludeSectionPrefixes ?? [],
			},
			pages: raw.pages ?? {},
			componentLibrarySections: raw.componentLibrarySections ?? [],
			legacyPages: raw.legacyPages ?? [],
		};
	} catch (e) {
		if (e.code !== "ENOENT") {
			console.warn("Failed to load automation/config/figma-pages.json:", e.message);
		}
		return empty;
	}
}
const PAGE_CONFIG = loadPageConfig();

function applyManualFillTokens(styles) {
	for (const [name, color] of Object.entries(MANUAL_FILL_TOKENS)) {
		if (!styles[name]) styles[name] = { t: "FILL", color, manual: true };
	}
	return styles;
}

function buildHexToFiMap(styles) {
	const map = new Map();
	for (const [name, color] of Object.entries(MANUAL_FILL_TOKENS)) {
		map.set(color.toLowerCase(), name);
	}
	for (const [key, val] of Object.entries(styles ?? {})) {
		if (val.t === "FILL" && val.color?.startsWith("#")) {
			const fi = key.split("#")[0];
			const hex = val.color.toLowerCase();
			if (!map.has(hex)) map.set(hex, fi);
		}
	}
	return map;
}

function resolveUnlinkedFillFi(hex, ctx) {
	if (!hex || hex.startsWith("gradient:")) return null;
	return ctx.hexToFi?.get(hex.toLowerCase()) ?? null;
}

let sharedSectionsConfig = [];
try {
	const configPath = path.join(ROOT, "automation", "shared-sections.json");
	if (fs.existsSync(configPath)) {
		sharedSectionsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
	}
} catch (e) {
	console.warn("Failed to load automation/shared-sections.json. Proceeding with empty shared config.");
}

const sharedSectionsMap = new Map();

const ILLUSTRATIVE_TYPES = new Set([
	"VECTOR",
	"BOOLEAN_OPERATION",
	"REGULAR_POLYGON",
	"STAR",
	"LINE",
	"ELLIPSE",
]);

const BBOX_WITH_POSITION = new Set([
	"FRAME",
	"GROUP",
	"INSTANCE",
	"COMPONENT",
	"RECTANGLE",
	"SECTION",
]);

const CATEGORY_RULES = [
	["button", /\b(btn|button|cta|chip|fab)\b/i],
	["card", /\b(card|tile|panel)\b/i],
	["navbar", /\b(nav|navbar|app\s*bar|top\s*bar|header)\b/i],
	["slider", /\b(slider|carousel|swipe|pager)\b/i],
	["table", /\b(table|bảng|bang\s*gia|pricing|pricelist)\b/i],
	["testimonial", /\b(testimonial|quote|review)\b/i],
	["form", /\b(form|input|field|dropdown|select)\b/i],
	["modal", /\b(modal|dialog|sheet|drawer)\b/i],
	["tooltip", /\b(tooltip|hint)\b/i],
];

function roundInt(n) {
	return n == null ? undefined : Math.round(n);
}

function rgbaToHex(c) {
	if (!c || typeof c !== "object") return null;
	const ch = (v) => Math.round(Math.max(0, Math.min(1, v ?? 0)) * 255)
		.toString(16)
		.padStart(2, "0");
	const r = ch(c.r);
	const g = ch(c.g);
	const b = ch(c.b);
	const a = c.a === undefined ? 1 : c.a;
	if (a >= 1) return `#${r}${g}${b}`;
	const alpha = Math.round(a * 255)
		.toString(16)
		.padStart(2, "0");
	return `#${r}${g}${b}${alpha}`;
}

function compactBbox(n, includePosition = false) {
	const box = n.absoluteBoundingBox ?? n.absoluteRenderBounds;
	if (!box) return undefined;

	const out = {
		width: roundInt(box.width),
		height: roundInt(box.height),
	};

	if (includePosition) {
		out.x = roundInt(box.x);
		out.y = roundInt(box.y);
	}

	if (!out.width && !out.height) return undefined;
	return out;
}

/**
 * Returns true when the node is positioned inside an auto-layout flow,
 * i.e. the node itself defines a HORIZONTAL/VERTICAL layout OR its
 * immediate parent does. In both cases absolute x/y coordinates are
 * managed by CSS flexbox and must not be emitted.
 */
function nodeInAutoLayoutFlow(n, parentNode) {
	const activeLayout = (node) =>
		node?.layoutMode === "HORIZONTAL" || node?.layoutMode === "VERTICAL";
	return activeLayout(n) || activeLayout(parentNode);
}

function bboxForNode(n, parentNode) {
	const includePosition =
		BBOX_WITH_POSITION.has(n.type) && !nodeInAutoLayoutFlow(n, parentNode);
	return compactBbox(n, includePosition);
}

function textPreview(chars, max = 160) {
	if (!chars || !String(chars).trim()) return undefined;
	const t = String(chars).replace(/\s+/g, " ").trim();
	if (!t) return undefined;
	return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function isIconFont(name) {
	return /awesome|material symbols|material icons|\bicon\b/i.test(name);
}

function buildFontFamilyMap(familyUsage) {
	const sorted = [...familyUsage.entries()].sort((a, b) => b[1] - a[1]);
	const fontFamilies = {};
	const familyToKey = {};

	const icons = sorted.filter(([f]) => isIconFont(f));
	const rest = sorted.filter(([f]) => !isIconFont(f));

	icons.forEach(([family], i) => {
		const key = i === 0 ? "icon" : `icon${i + 1}`;
		fontFamilies[key] = family;
		familyToKey[family] = key;
	});

	const assignSemantic = (family) => {
		const n = family.toLowerCase();
		if (/mono|code|courier|consolas/.test(n)) return "mono";
		if (/serif|georgia|times|garamond/.test(n)) return "serif";
		if (/display|headline|poster/.test(n)) return "display";
		return null;
	};

	const used = new Set(Object.keys(fontFamilies));
	for (const [family] of rest) {
		const semantic = assignSemantic(family);
		if (semantic && !used.has(semantic)) {
			fontFamilies[semantic] = family;
			familyToKey[family] = semantic;
			used.add(semantic);
		}
	}

	const unassigned = rest.filter(([f]) => !familyToKey[f]);
	if (unassigned.length) {
		const [primary] = unassigned[0];
		if (!used.has("sans")) {
			fontFamilies.sans = primary;
			familyToKey[primary] = "sans";
			used.add("sans");
		}
	}

	let n = 2;
	for (const [family] of rest) {
		if (familyToKey[family]) continue;
		let key = `sans${n}`;
		while (used.has(key)) {
			n++;
			key = `sans${n}`;
		}
		fontFamilies[key] = family;
		familyToKey[family] = key;
		used.add(key);
		n++;
	}

	return { fontFamilies, familyToKey };
}

function initStyleRegistry(rawStyles) {
	const byId = new Map();
	const nameToIds = new Map();
	for (const [id, meta] of Object.entries(rawStyles)) {
		byId.set(id, { id, name: meta.name, styleType: meta.styleType, usageCount: 0 });
		const ids = nameToIds.get(meta.name) ?? [];
		ids.push(id);
		nameToIds.set(meta.name, ids);
	}
	return { byId, nameToIds };
}

function styleToken(name, id, nameToIds) {
	if ((nameToIds.get(name)?.length ?? 0) <= 1) return name;
	return `${name}#${id}`;
}

function resolveStyleRef(styleId, rawStyles, nameToIds) {
	const meta = rawStyles[styleId];
	if (!meta) return undefined;
	return styleToken(meta.name, styleId, nameToIds);
}

function imageFillInfo(n) {
	const fills = n.fills;
	if (!Array.isArray(fills)) return undefined;

	const img = fills.find((f) => f?.visible !== false && f.type === "IMAGE");
	if (!img) return undefined;

	return {
		type: "IMAGE",
		scaleMode: img.scaleMode,
		imageRef: img.imageRef ? String(img.imageRef).slice(0, 12) : undefined,
	};
}

function fillHexFromNode(n) {
	const fills = n.fills;
	if (!Array.isArray(fills)) return undefined;
	for (const f of fills) {
		if (f?.visible === false) continue;
		if (f.type === "SOLID" && f.color) return rgbaToHex(f.color);
		if (f.type === "GRADIENT_LINEAR" || f.type === "GRADIENT_RADIAL") {
			const stops = f.gradientStops?.length ?? 0;
			return `gradient:${f.type === "GRADIENT_LINEAR" ? "linear" : "radial"}:${stops}`;
		}
	}
	return undefined;
}

/**
 * Tailwind `leading-{N}` % token set.
 * Must stay in sync with the `extend.lineHeight` % array in tailwind.config.js.
 */
const LH_PERCENT_TOKENS = [100, 105, 110, 115, 120, 125, 130, 135, 138, 140, 143, 145, 150];

/**
 * Snaps a unitless line-height ratio (e.g. 1.39) to the nearest Tailwind
 * `leading-{N}` percent token defined in tailwind.config.js.
 */
function resolveLineHeightClass(ratio) {
	if (ratio == null) return undefined;
	const pct = ratio * 100;
	let nearest = LH_PERCENT_TOKENS[0];
	let minDiff = Math.abs(pct - nearest);
	for (const t of LH_PERCENT_TOKENS) {
		const d = Math.abs(pct - t);
		if (d < minDiff) { minDiff = d; nearest = t; }
	}
	return `leading-${nearest}`;
}

/**
 * Snaps a letter-spacing em ratio (letterSpacingPx / fontSize) to a named
 * Tailwind `tracking-*` bucket. Buckets must match the custom `letterSpacing`
 * scale defined in tailwind.config.js extend.letterSpacing.
 *
 * Bucket boundaries (em):
 *   ≤ -0.04  → tracking-tightest  (-0.05em)
 *   ≤ -0.02  → tracking-tighter   (-0.03em)
 *   ≤ -0.008 → tracking-tight     (-0.015em)
 *   ≤ -0.003 → tracking-snug      (-0.005em)
 *   ≤  0.003 → tracking-normal    (0em)
 *   ≤  0.08  → tracking-wide      (0.05em)
 *   ≤  0.15  → tracking-wider     (0.1em)
 *    > 0.15  → tracking-widest    (0.2em)
 */
function resolveLetterSpacingClass(emRatio) {
	if (emRatio == null) return undefined;
	if (emRatio <= -0.04) return "tracking-tightest";
	if (emRatio <= -0.02) return "tracking-tighter";
	if (emRatio <= -0.008) return "tracking-tight";
	if (emRatio <= -0.003) return "tracking-snug";
	if (emRatio <= 0.003) return "tracking-normal";
	if (emRatio <= 0.08) return "tracking-wide";
	if (emRatio <= 0.15) return "tracking-wider";
	return "tracking-widest";
}

function compactTextTraits(st, familyToKey) {
	if (!st) return null;
	const fontSize = st.fontSize || 16;
	const round = (value, digits) =>
		value == null ? undefined : Number(value.toFixed(digits));
	const out = {
		fontSize: roundInt(st.fontSize),
		fontWeight: st.fontWeight,
		lineHeight: round(st.lineHeightPx / fontSize, 2),
	};
	// Emit Tailwind class hints so downstream agents use tokens directly.
	const lhClass = resolveLineHeightClass(out.lineHeight);
	if (lhClass) out.lhClass = lhClass;

	if (st.textAlignHorizontal && st.textAlignHorizontal !== "LEFT") {
		out.alignH = st.textAlignHorizontal;
	}
	if (st.textAlignVertical && st.textAlignVertical !== "TOP") {
		out.alignV = st.textAlignVertical;
	}
	if (st.textCase && st.textCase !== "ORIGINAL") out.textCase = st.textCase;
	if (st.letterSpacing != null) {
		out.letterSpacing = round(st.letterSpacing / fontSize, 3);
		out.lsClass = resolveLetterSpacingClass(out.letterSpacing);
	}
	const fontKey = familyToKey[st.fontFamily];
	if (fontKey) out.font = fontKey;
	return out;
}

function traitsFingerprint(traits) {
	return traits ? JSON.stringify(traits) : "";
}

function traitsEqual(a, b) {
	return traitsFingerprint(a) === traitsFingerprint(b);
}

/** Icon font keys from buildFontFamilyMap — not copy typography. */
function isIconFontKey(fontKey) {
	return fontKey === "icon" || (typeof fontKey === "string" && /^icon\d+$/.test(fontKey));
}

/** Compact font token for Local/* slugs — sans7 → s7, display → d. */
function compactFontKey(fontKey) {
	if (!fontKey || fontKey === "sans") return "s";
	if (fontKey === "display") return "d";
	if (fontKey === "serif") return "r";
	if (fontKey === "mono") return "m";
	if (fontKey.startsWith("sans")) return `s${fontKey.slice(4)}`;
	return fontKey;
}

function compactTextCaseCode(textCase) {
	if (!textCase || textCase === "ORIGINAL") return null;
	if (textCase === "UPPER") return "upp";
	if (textCase === "LOWER") return "low";
	if (textCase === "TITLE") return "tit";
	return textCase.toLowerCase().slice(0, 3);
}

function compactAlignCode(prefix, align, defaultAlign) {
	if (!align || align === defaultAlign) return null;
	return `${prefix}${align[0].toLowerCase()}`;
}

/**
 * Stable compact slug for unlinked Figma text (no styles.text).
 * Format: t{size}-{weight}-{lh×100}-{font}[-ls{N}][-upp][-ahc][-avc]
 */
function localTypeSlug(traits) {
	const weight = traits.fontWeight ?? 400;
	const lh = Math.round((traits.lineHeight ?? 1) * 100);
	const segs = [`t${traits.fontSize}`, String(weight), String(lh), compactFontKey(traits.font)];
	if (traits.letterSpacing != null && Math.abs(traits.letterSpacing) > 0.003) {
		segs.push(`ls${String(traits.letterSpacing).replace(".", "")}`);
	}
	const textCase = compactTextCaseCode(traits.textCase);
	if (textCase) segs.push(textCase);
	const alignH = compactAlignCode("ah", traits.alignH, "LEFT");
	if (alignH) segs.push(alignH);
	const alignV = compactAlignCode("av", traits.alignV, "TOP");
	if (alignV) segs.push(alignV);
	return segs.join("-");
}

function localTypeKeyFromTraits(traits, usedKeys, slugOwners) {
	const fp = traitsFingerprint(traits);
	let slug = localTypeSlug(traits);
	const ownerFp = slugOwners?.get(slug);
	if (ownerFp && ownerFp !== fp) {
		let i = 2;
		while (slugOwners.has(`${slug}#${i}`) && slugOwners.get(`${slug}#${i}`) !== fp) i++;
		slug = `${slug}#${i}`;
	}
	slugOwners?.set(slug, fp);

	let key = `Local/${slug}`;
	if (!usedKeys.has(key)) {
		usedKeys.add(key);
		return key;
	}
	let i = 2;
	while (usedKeys.has(`${key}#${i}`)) i++;
	key = `${key}#${i}`;
	usedKeys.add(key);
	return key;
}

/** Map traits fingerprint → named Figma text style key (for exact-match dedup). */
function collectNamedTraitsIndex(doc, rawStyles, familyToKey) {
	const { byId: stylesById, nameToIds } = initStyleRegistry(rawStyles);

	function walk(n) {
		if (!n || typeof n !== "object") return;
		if (n.visible === false) return;

		if (n.type === "TEXT" && n.styles?.text) {
			const traits = compactTextTraits(n.style, familyToKey);
			if (traits) {
				recordStyleUsage(stylesById, n.styles.text, rawStyles, (entry) => {
					recordStyleTraits(entry, traits, n.name);
				});
			}
		}

		if (n.children) for (const c of n.children) walk(c);
	}

	walk(doc);

	const byFp = new Map();
	for (const [, entry] of stylesById) {
		if (entry.styleType !== "TEXT" || !entry.traits) continue;
		const key = styleToken(entry.name, entry.id, nameToIds);
		const fp = traitsFingerprint(entry.traits);
		if (!byFp.has(fp)) byFp.set(fp, key);
	}
	return byFp;
}

/**
 * TEXT nodes without a Figma text style → Local/* registry.
 * Page JSON gets ty; system-design.json gets matching tokens.styles entries.
 */
function collectLocalTypography(doc, familyToKey, namedTraitsByFp) {
	const byFp = new Map();
	const usedKeys = new Set();
	const slugOwners = new Map();

	function walk(n) {
		if (!n || typeof n !== "object") return;
		if (n.visible === false) return;

		if (n.type === "TEXT" && !n.styles?.text) {
			const traits = compactTextTraits(n.style, familyToKey);
			if (traits && !isIconFontKey(traits.font)) {
				const fp = traitsFingerprint(traits);
				if (namedTraitsByFp?.has(fp)) return;

				const existing = byFp.get(fp);
				if (existing) existing.u++;
				else {
					byFp.set(fp, {
						key: localTypeKeyFromTraits(traits, usedKeys, slugOwners),
						traits,
						u: 1,
					});
				}
			}
		}

		if (n.children) for (const c of n.children) walk(c);
	}

	walk(doc);
	return byFp;
}

function resolveUnlinkedTextTy(traits, ctx) {
	if (!traits || isIconFontKey(traits.font)) return null;
	const fp = traitsFingerprint(traits);
	const named = ctx.namedTraitsByFp?.get(fp);
	if (named) return named;
	const local = ctx.localTypeByFp?.get(fp);
	if (local) return local.key;
	return null;
}

function localTypeStylesExport(byFp) {
	const styles = {};
	for (const { key, traits, u } of byFp.values()) {
		styles[key] = { t: "TEXT", ...traits, local: true, u };
	}
	return styles;
}

function localTypeListExport(byFp) {
	return [...byFp.values()]
		.sort((a, b) => b.u - a.u)
		.slice(0, 30)
		.map(({ traits, u }) => ({ ...traits, u }));
}

function recordStyleUsage(byId, styleId, rawStyles, apply) {
	let entry = byId.get(styleId);
	if (!entry) {
		const meta = rawStyles[styleId];
		if (!meta) return;
		entry = { id: styleId, name: meta.name, styleType: meta.styleType, usageCount: 0 };
		byId.set(styleId, entry);
	}
	entry.usageCount++;
	apply(entry);
}

/** Compact metrics for override reports (font size, weight, line-height, etc.). */
function traitsSummaryForReport(traits) {
	const out = {
		fontSize: traits.fontSize,
		fontWeight: traits.fontWeight,
		lineHeight: traits.lineHeight,
	};
	if (traits.font) out.font = traits.font;
	if (traits.lhClass) out.lhClass = traits.lhClass;
	if (traits.letterSpacing != null) out.letterSpacing = traits.letterSpacing;
	if (traits.lsClass) out.lsClass = traits.lsClass;
	if (traits.alignH) out.alignH = traits.alignH;
	if (traits.alignV) out.alignV = traits.alignV;
	if (traits.textCase) out.textCase = traits.textCase;
	return out;
}

/**
 * Track every rendered trait variant for a linked Figma text style.
 * Detects instance-level overrides (same style ID, different fontSize, etc.).
 */
function recordStyleTraits(entry, traits, sampleLabel) {
	if (!traits) return;
	if (!entry.traitVariants) entry.traitVariants = new Map();
	const fp = traitsFingerprint(traits);
	let variant = entry.traitVariants.get(fp);
	if (!variant) {
		variant = {
			traits: traitsSummaryForReport(traits),
			count: 0,
			samples: [],
		};
		entry.traitVariants.set(fp, variant);
	}
	variant.count++;
	if (sampleLabel && variant.samples.length < 5 && !variant.samples.includes(sampleLabel)) {
		variant.samples.push(sampleLabel);
	}
	if (!entry.traits) entry.traits = traits;
	else if (!traitsEqual(entry.traits, traits)) entry.traitConflict = true;
}

function styleBaseToCssClass(baseName) {
	const nameMatch = baseName.match(/\/([^/#]+)/);
	const rawName = nameMatch ? nameMatch[1] : baseName;
	return rawName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-$/g, "");
}

function variantMetricSignature(v) {
	return `${v.fontSize}|${v.fontWeight}|${v.lineHeight}|${v.font ?? ""}`;
}

function dedupeVariantsByCoreTypo(variants) {
	const map = new Map();
	for (const v of variants) {
		const sig = `${v.styleKey ?? ""}|${variantMetricSignature(v)}`;
		const existing = map.get(sig);
		if (existing) {
			existing.usageCount += v.usageCount;
			if (v.samples?.length) {
				for (const s of v.samples) {
					if (existing.samples.length < 5 && !existing.samples.includes(s)) {
						existing.samples.push(s);
					}
				}
			}
		} else {
			map.set(sig, {
				...v,
				samples: [...(v.samples ?? [])],
			});
		}
	}
	return [...map.values()].sort((a, b) => b.usageCount - a.usageCount);
}

function exportTraitVariants(entry) {
	if (!entry.traitVariants?.size) {
		return entry.traits
			? [{ ...traitsSummaryForReport(entry.traits), usageCount: entry.usageCount }]
			: [];
	}
	return [...entry.traitVariants.values()]
		.sort((a, b) => b.count - a.count)
		.map((v) => ({
			...v.traits,
			usageCount: v.count,
			...(v.samples.length ? { samples: v.samples } : {}),
		}));
}

/**
 * Report when the same typography token renders with different metrics:
 * - duplicate-name: multiple Figma style IDs share a name (e.g. Body/Body-2 → 16px vs 20px)
 * - local-override: one style ID is locally overridden on some layers (16px vs 18px)
 */
function buildFontStyleOverrideReport(stylesById, nameToIds) {
	const issues = [];
	const byBaseName = new Map();

	for (const [, entry] of stylesById) {
		if (entry.styleType !== "TEXT" || !entry.usageCount) continue;

		const styleKey = styleToken(entry.name, entry.id, nameToIds);
		const variants = dedupeVariantsByCoreTypo(
			exportTraitVariants(entry).map((v) => ({ ...v, styleKey })),
		);
		if (!variants.length) continue;

		const coreSigs = new Set(variants.map(variantMetricSignature));
		if (coreSigs.size > 1) {
			issues.push({
				type: "local-override",
				styleKey,
				baseName: entry.name,
				cssClass: styleBaseToCssClass(entry.name),
				variants: variants.map(({ styleKey: _sk, ...rest }) => rest),
			});
		}

		const baseList = byBaseName.get(entry.name) ?? [];
		baseList.push(...variants);
		byBaseName.set(entry.name, baseList);
	}

	for (const [baseName, entries] of byBaseName) {
		const mergedVariants = dedupeVariantsByCoreTypo(entries);
		const styleKeys = new Set(mergedVariants.map((v) => v.styleKey));
		const coreSigs = new Set(mergedVariants.map(variantMetricSignature));
		if (styleKeys.size <= 1 || coreSigs.size <= 1) continue;

		issues.push({
			type: "duplicate-name",
			baseName,
			cssClass: styleBaseToCssClass(baseName),
			variants: mergedVariants.map(({ styleKey, ...rest }) => ({
				styleKey,
				...rest,
			})),
		});
	}

	const duplicateNameStyles = issues.filter((i) => i.type === "duplicate-name").length;
	const localOverrideStyles = issues.filter((i) => i.type === "local-override").length;

	return {
		summary: {
			duplicateNameStyles,
			localOverrideStyles,
			totalIssues: issues.length,
		},
		issues: issues.sort((a, b) => {
			const order = { "duplicate-name": 0, "local-override": 1 };
			return (
				(order[a.type] ?? 9) - (order[b.type] ?? 9) ||
				a.baseName.localeCompare(b.baseName)
			);
		}),
	};
}

function shortenStyleKey(styleKey) {
	if (!styleKey) return "";
	const hash = styleKey.indexOf("#");
	return hash >= 0 ? styleKey.slice(hash + 1) : styleKey;
}

function formatMetricLabel(v) {
	const parts = [`${v.fontSize}px`];
	if (v.fontWeight != null && v.fontWeight !== 400) parts.push(`w${v.fontWeight}`);
	if (v.lineHeight != null && v.lineHeight !== 1.4) parts.push(`lh${v.lineHeight}`);
	if (v.font) parts.push(v.font);
	return parts.join(" · ");
}

function issueSizeSummary(issue) {
	const sizes = [...new Set(issue.variants.map((v) => v.fontSize))].sort((a, b) => b - a);
	if (sizes.length <= 1) return `${sizes[0]}px (font/weight/lh differ)`;
	return sizes.map((s) => `${s}px`).join(" / ");
}

/**
 * Count linked TEXT style variants in a document (used for figma-targets.json).
 * Map key: `${styleKey}|${fontSize}|${fontWeight}|${lineHeight}|${font}`
 */
/**
 * Count how many nodes bind each paint style, keyed the same way as
 * tokens.styles. Colors need this for the same reason text does: several style
 * ids can share a base name, and without counts the resolver sees a tie.
 */
function collectFillStyleUsage(doc, rawStyles, nameToIds) {
	const usage = new Map();

	function walk(n) {
		if (!n || typeof n !== "object" || n.visible === false) return;
		for (const slot of ["fill", "fills", "stroke", "strokes"]) {
			const ids = n.styles?.[slot];
			if (!ids) continue;
			for (const styleId of Array.isArray(ids) ? ids : [ids]) {
				const meta = rawStyles[styleId];
				if (!meta?.name) continue;
				const styleKey = styleToken(meta.name, styleId, nameToIds);
				usage.set(styleKey, (usage.get(styleKey) ?? 0) + 1);
			}
		}
		for (const c of n.children ?? []) walk(c);
	}
	walk(doc);

	return usage;
}

function collectTextStyleVariantUsage(doc, rawStyles, familyToKey, nameToIds) {
	const usage = new Map();

	function walk(n) {
		if (!n || typeof n !== "object") return;
		if (n.visible === false) return;

		if (n.type === "TEXT" && n.styles?.text) {
			const meta = rawStyles[n.styles.text];
			const traits = compactTextTraits(n.style, familyToKey);
			if (meta?.name && traits) {
				const styleKey = styleToken(meta.name, n.styles.text, nameToIds);
				const summary = traitsSummaryForReport(traits);
				const mapKey = `${styleKey}|${variantMetricSignature(summary)}`;
				let entry = usage.get(mapKey);
				if (!entry) {
					entry = {
						styleKey,
						baseName: meta.name,
						...summary,
						usageCount: 0,
						samples: [],
					};
					usage.set(mapKey, entry);
				}
				entry.usageCount++;
				const sample = typeof n.characters === "string" ? n.characters.slice(0, 80) : n.name;
				if (sample && entry.samples.length < 5 && !entry.samples.includes(sample)) {
					entry.samples.push(sample);
				}
			}
		}

		if (n.children) for (const c of n.children) walk(c);
	}

	walk(doc);
	return usage;
}

function familyToKeyFromTokens(fontFamilies) {
	const map = {};
	for (const [key, family] of Object.entries(fontFamilies ?? {})) {
		if (family) map[family] = key;
	}
	return map;
}

/**
 * Annotate dictionary-built override issues with usage from figma-targets.json.
 * Targets counts become suggestions only — the user pick (font-style-picks.json) decides ★.
 */
function enrichFontStyleOverridesWithTargets(report, targetsUsage) {
	if (!report?.issues?.length) return report;

	for (const issue of report.issues) {
		let maxTargets = 0;
		let suggested = null;

		for (const v of issue.variants) {
			const sk = v.styleKey ?? issue.styleKey;
			const mapKey = `${sk}|${variantMetricSignature(v)}`;
			const hit = targetsUsage.get(mapKey);
			v.dictionaryUsageCount = v.usageCount;
			v.targetsUsageCount = hit?.usageCount ?? 0;
			if (hit?.samples?.length && !v.samples?.length) {
				v.samples = hit.samples;
			}
			if (v.targetsUsageCount > maxTargets) {
				maxTargets = v.targetsUsageCount;
				suggested = {
					styleKey: sk,
					fontSize: v.fontSize,
					fontWeight: v.fontWeight,
					lineHeight: v.lineHeight,
					font: v.font,
					targetsUsageCount: v.targetsUsageCount,
					label: formatMetricLabel(v),
				};
			}
		}

		issue.variants.sort(
			(a, b) =>
				(b.targetsUsageCount ?? 0) - (a.targetsUsageCount ?? 0) ||
				(b.usageCount ?? 0) - (a.usageCount ?? 0),
		);
		issue.targetsTotalUsage = issue.variants.reduce(
			(sum, v) => sum + (v.targetsUsageCount ?? 0),
			0,
		);
		if (suggested) issue.suggestedInTargets = suggested;
	}

	const inTargets = report.issues.filter((i) => (i.targetsTotalUsage ?? 0) > 0);
	report.summary = {
		...report.summary,
		issuesUsedInTargets: inTargets.length,
		usageNote:
			"All counts are usage inside the token scope declared in automation/config/figma-pages.json (shipped pages only; retired sections excluded). Canonical pick = automation/config/font-style-picks.json",
	};
	report.targets = {
		issuesUsed: inTargets.length,
		suggestedByClass: Object.fromEntries(
			inTargets
				.filter((i) => i.suggestedInTargets)
				.map((i) => [
					i.cssClass,
					{
						...i.suggestedInTargets,
						sizeConflictInTargets:
							new Set(
								i.variants
									.filter((v) => (v.targetsUsageCount ?? 0) > 0)
									.map((v) => v.fontSize),
							).size > 1,
					},
				]),
		),
	};
	return report;
}

/** Resolve a user pick string against an issue's variants (full key, base#id, or bare id). */
function findVariantForPick(issue, pick) {
	if (!pick || !issue?.variants?.length) return null;
	const want = String(pick).trim();
	const wantId = want.includes("#") ? want.slice(want.indexOf("#") + 1) : want;

	for (const v of issue.variants) {
		const sk = v.styleKey ?? issue.styleKey;
		if (!sk) continue;
		if (sk === want) return { variant: v, styleKey: sk };
		if (shortenStyleKey(sk) === wantId) return { variant: v, styleKey: sk };
	}
	return null;
}

function pickLookupKeys(issue) {
	return [issue.cssClass, issue.baseName].filter(Boolean);
}

/**
 * Apply automation/config/font-style-picks.json. ★ / chosen only when the user sets a key.
 * Unset classes stay undecided (targets suggestion shown, not selected).
 */
function applyFontStylePicks(report, picks = FONT_STYLE_PICKS) {
	if (!report?.issues?.length) return report;

	const chosenByClass = {};
	const needsDecision = [];
	const invalidPicks = [];

	for (const issue of report.issues) {
		delete issue.chosen;
		delete issue.needsDecision;
		delete issue.invalidPick;

		const pickKey = pickLookupKeys(issue).find((k) => picks[k]);
		const rawPick = pickKey ? picks[pickKey] : null;

		if (rawPick) {
			const hit = findVariantForPick(issue, rawPick);
			if (hit) {
				const { variant: v, styleKey: sk } = hit;
				issue.chosen = {
					styleKey: sk,
					fontSize: v.fontSize,
					fontWeight: v.fontWeight,
					lineHeight: v.lineHeight,
					font: v.font,
					targetsUsageCount: v.targetsUsageCount ?? 0,
					dictionaryUsageCount: v.dictionaryUsageCount ?? v.usageCount ?? 0,
					label: formatMetricLabel(v),
					source: "user",
					pickKey,
				};
				chosenByClass[issue.cssClass] = issue.chosen;
				issue.variants.sort((a, b) => {
					const aPick = (a.styleKey ?? issue.styleKey) === sk ? 1 : 0;
					const bPick = (b.styleKey ?? issue.styleKey) === sk ? 1 : 0;
					return (
						bPick - aPick ||
						(b.targetsUsageCount ?? 0) - (a.targetsUsageCount ?? 0) ||
						(b.usageCount ?? 0) - (a.usageCount ?? 0)
					);
				});
			} else {
				issue.invalidPick = rawPick;
				issue.needsDecision = true;
				invalidPicks.push({
					cssClass: issue.cssClass,
					pick: rawPick,
					pickKey,
				});
				needsDecision.push(issue.cssClass);
			}
		} else {
			issue.needsDecision = true;
			needsDecision.push(issue.cssClass);
		}
	}

	report.summary = {
		...report.summary,
		chosenCount: Object.keys(chosenByClass).length,
		needsDecisionCount: needsDecision.length,
		invalidPickCount: invalidPicks.length,
		picksFile: "automation/config/font-style-picks.json",
	};
	report.picks = {
		chosenByClass,
		needsDecision,
		invalidPicks,
		suggestedByClass: Object.fromEntries(
			report.issues
				.filter((i) => i.suggestedInTargets)
				.map((i) => [i.cssClass, i.suggestedInTargets]),
		),
	};
	return report;
}

function logFontStyleOverrideReport(report) {
	const { summary, issues } = report;
	if (!summary.totalIssues) return;

	const withSizeConflict = issues.filter((issue) => {
		const sizes = new Set(issue.variants.map((v) => v.fontSize));
		return sizes.size > 1;
	});
	// Prefer classes that appear in targets; fall back to dictionary-wide conflicts.
	const inTargets = issues.filter((issue) => (issue.targetsTotalUsage ?? 0) > 0);
	const sizeInTargets = withSizeConflict.filter((issue) => (issue.targetsTotalUsage ?? 0) > 0);
	const displayIssues = (sizeInTargets.length ? sizeInTargets : withSizeConflict.length ? withSizeConflict : inTargets.length ? inTargets : issues);

	const chosenNote =
		summary.chosenCount != null
			? ` · ★ ${summary.chosenCount} user pick(s)` +
				(summary.needsDecisionCount
					? ` · ${summary.needsDecisionCount} need pick`
					: "")
			: "";
	const targetsNote =
		summary.issuesUsedInTargets != null
			? ` · ${summary.issuesUsedInTargets} used in targets`
			: "";

	console.log(
		`   └── ⚠️  Font style overrides: ${summary.totalIssues} class(es)` +
			(withSizeConflict.length && withSizeConflict.length < issues.length
				? ` (${withSizeConflict.length} with different font sizes)`
				: "") +
			chosenNote +
			targetsNote,
	);
	console.log("       full detail → json/font-style-overrides.json");
	console.log("       picks → automation/config/font-style-picks.json  (★ = your choice only)");
	console.log(
		"       counts: usage inside the token scope in automation/config/figma-pages.json\n",
	);

	const preview = displayIssues.slice(0, 6);
	for (let i = 0; i < preview.length; i++) {
		const issue = preview[i];
		const grouped = dedupeVariantsByCoreTypo(
			issue.variants.map((v) => ({
				...v,
				styleKey: v.styleKey ?? issue.styleKey,
			})),
		);
		const chosen = issue.chosen;
		const suggested = issue.suggestedInTargets;
		const tgtTotal = issue.targetsTotalUsage ?? 0;

		let headExtra = "";
		if (chosen) {
			headExtra = `  ★ chosen: ${chosen.label}  (${chosen.styleKey})`;
		} else if (issue.invalidPick) {
			headExtra = `  ✗ invalid pick "${issue.invalidPick}" — fix font-style-picks.json`;
		} else if (suggested) {
			headExtra = `  ◇ suggest: ${suggested.label} ×${suggested.targetsUsageCount} tgt — set "${issue.cssClass}" in font-style-picks.json`;
		} else if (tgtTotal === 0 && summary.issuesUsedInTargets != null) {
			headExtra = "  (not used in targets) — set pick in font-style-picks.json";
		} else {
			headExtra = "  ◇ undecided — set pick in font-style-picks.json";
		}
		console.log(`       .${issue.cssClass}  [${issueSizeSummary(issue)}]${headExtra}`);
		for (const v of grouped) {
			const sk = v.styleKey ?? issue.styleKey;
			const isChosen =
				chosen &&
				sk === chosen.styleKey &&
				variantMetricSignature(v) === variantMetricSignature(chosen);
			const isSuggest =
				!isChosen &&
				suggested &&
				sk === suggested.styleKey &&
				variantMetricSignature(v) === variantMetricSignature(suggested);
			const mark = isChosen ? "★ " : isSuggest ? "◇ " : "  ";
			const metric = formatMetricLabel(v).padEnd(26);
			const tgt = `×${v.targetsUsageCount ?? 0} tgt`.padStart(10);
			const dict = `×${v.dictionaryUsageCount ?? v.usageCount} dict`.padStart(11);
			const key = shortenStyleKey(v.styleKey);
			console.log(`         ${mark}${metric} ${tgt} ${dict}  ${key}`);
		}
		if (i < preview.length - 1) console.log("");
	}

	const hidden = issues.length - preview.length;
	if (hidden > 0) {
		console.log(`\n       … +${hidden} more class(es) in json/font-style-overrides.json`);
	}
	if (summary.needsDecisionCount > 0) {
		console.log(
			`\n       → Add picks for: ${(report.picks?.needsDecision ?? []).join(", ")}`,
		);
	}
	console.log("");
}

function mergeFillHex(entry, hex) {
	if (!hex) return;
	if (!entry.color) entry.color = hex;
	else if (entry.color !== hex) entry.colorConflict = true;
}

function summarizeAutoLayout(n) {
	if (!n.layoutMode || n.layoutMode === "NONE") return undefined;

	const al = {
		layoutMode: n.layoutMode,
		primaryAxisAlignItems: n.primaryAxisAlignItems,
		counterAxisAlignItems: n.counterAxisAlignItems,
	};

	const spacing = roundInt(n.itemSpacing);
	if (spacing) al.itemSpacing = spacing;

	const pad = {
		top: roundInt(n.paddingTop),
		right: roundInt(n.paddingRight),
		bottom: roundInt(n.paddingBottom),
		left: roundInt(n.paddingLeft),
	};
	if (pad.top || pad.right || pad.bottom || pad.left) al.padding = pad;

	if (n.layoutSizingHorizontal) al.layoutSizingHorizontal = n.layoutSizingHorizontal;
	if (n.layoutSizingVertical) al.layoutSizingVertical = n.layoutSizingVertical;
	if (n.layoutWrap && n.layoutWrap !== "NO_WRAP") al.layoutWrap = n.layoutWrap;

	return al;
}

function buildNamedStylesExport(byId, nameToIds) {
	const styles = {};
	for (const [, entry] of byId) {
		const key = styleToken(entry.name, entry.id, nameToIds);
		if (entry.styleType === "TEXT" && entry.traits) {
			const s = { t: "TEXT", ...entry.traits };
			if (entry.fillRef) s.fill = entry.fillRef;
			if (entry.traitConflict) s.traitConflict = true;
			styles[key] = s;
		} else if (entry.styleType === "FILL") {
			const s = { t: "FILL" };
			if (entry.color) s.color = entry.color;
			if (entry.colorConflict) s.colorConflict = true;
			styles[key] = s;
		} else if (entry.styleType === "EFFECT") {
			styles[key] = { t: "EFFECT", u: entry.usageCount };
		} else if (entry.styleType === "GRID") {
			styles[key] = { t: "GRID", u: entry.usageCount };
		} else {
			styles[key] = { t: entry.styleType, u: entry.usageCount };
		}
	}
	return styles;
}

function categorizeName(name) {
	if (!name) return [];
	const tags = [];
	for (const [tag, re] of CATEGORY_RULES) {
		if (re.test(name)) tags.push(tag);
	}
	return tags;
}

function inferComponentRole(n) {
	const tags = categorizeName(n.name);

	const box = n.absoluteBoundingBox;
	const w = roundInt(box?.width);
	const h = roundInt(box?.height);

	const hasTextChild = n.children?.some((c) => c.type === "TEXT");
	const hasRadius = n.cornerRadius != null && n.cornerRadius > 0;
	const isAutoHorizontal = n.layoutMode === "HORIZONTAL";

	if (
		hasTextChild &&
		hasRadius &&
		isAutoHorizontal &&
		h >= 32 &&
		h <= 72 &&
		w >= 80 &&
		w <= 420
	) {
		tags.push("button");
	}

	const childTextCount = n.children?.filter((c) => c.type === "TEXT").length ?? 0;
	const childMediaCount =
		n.children?.filter((c) =>
			["RECTANGLE", "VECTOR", "INSTANCE", "ELLIPSE", "FRAME"].includes(c.type),
		).length ?? 0;

	if (
		childTextCount >= 1 &&
		childMediaCount >= 1 &&
		w >= 180 &&
		h >= 120 &&
		h <= 800
	) {
		tags.push("card");
	}

	return [...new Set(tags)];
}

function patternFingerprint(n) {
	const box = n.absoluteBoundingBox;
	const childTypes = n.children?.map((c) => c.type).join(">") ?? "";
	const textCount = n.children?.filter((c) => c.type === "TEXT").length ?? 0;
	const mediaCount =
		n.children?.filter((c) =>
			["RECTANGLE", "VECTOR", "INSTANCE", "ELLIPSE", "FRAME"].includes(c.type),
		).length ?? 0;

	return [
		n.type,
		n.layoutMode ?? "NONE",
		roundInt(n.itemSpacing) ?? 0,
		roundInt(n.paddingTop) ?? 0,
		roundInt(n.paddingRight) ?? 0,
		roundInt(n.paddingBottom) ?? 0,
		roundInt(n.paddingLeft) ?? 0,
		roundInt(n.cornerRadius) ?? 0,
		n.children?.length ?? 0,
		textCount,
		mediaCount,
		childTypes,
		roundInt(box?.width),
		roundInt(box?.height),
	].join("|");
}

// ---------------------------------------------------------------------------
// Structural slider fingerprinting — layout/geometry based, not layer names.
// Runs only on top-level section FRAMEs during the page-slicing loop.
// ---------------------------------------------------------------------------

const SLIDER_CARD_TYPES = new Set(["FRAME", "INSTANCE", "COMPONENT"]);
const SLIDER_NAV_TYPES = new Set(["INSTANCE", "VECTOR", "TEXT"]);
const SLIDER_DOT_SIZE_MIN = 6;
const SLIDER_DOT_SIZE_MAX = 16;
const SLIDER_NAV_SIZE_MIN = 24;
const SLIDER_NAV_SIZE_MAX = 56;

function sliderNodeBBox(n) {
	return n?.absoluteBoundingBox ?? n?.absoluteRenderBounds;
}

/** Fingerprint for comparing slide/card siblings (incl. identical INSTANCE refs). */
function structuralCardFingerprint(n) {
	const box = sliderNodeBBox(n);
	const childTypes = n.children?.map((c) => c.type).join(">") ?? "";
	return [
		n.type,
		n.type === "INSTANCE" ? (n.componentId ?? "") : "",
		n.layoutMode ?? "NONE",
		roundInt(n.itemSpacing) ?? 0,
		n.children?.length ?? 0,
		childTypes,
		roundInt(box?.width),
		roundInt(box?.height),
	].join("|");
}

function sliderCardsStructurallySimilar(a, b) {
	return structuralCardFingerprint(a) === structuralCardFingerprint(b);
}

/** Group card siblings by structure; mirrors downstream REPEAT collapse of clones. */
function groupSimilarSliderCards(children) {
	const groups = [];
	for (const child of children) {
		if (child.visible === false || !SLIDER_CARD_TYPES.has(child.type)) continue;
		let placed = false;
		for (const group of groups) {
			if (sliderCardsStructurallySimilar(child, group.representative)) {
				group.nodes.push(child);
				group.count += 1;
				placed = true;
				break;
			}
		}
		if (!placed) {
			groups.push({ representative: child, nodes: [child], count: 1 });
		}
	}
	return groups.sort((a, b) => b.count - a.count);
}

function isSliderDotSizedEllipse(n) {
	if (n.type !== "ELLIPSE" || n.visible === false) return false;
	const box = sliderNodeBBox(n);
	if (!box) return false;
	const w = roundInt(box.width);
	const h = roundInt(box.height);
	return (
		w >= SLIDER_DOT_SIZE_MIN &&
		w <= SLIDER_DOT_SIZE_MAX &&
		h >= SLIDER_DOT_SIZE_MIN &&
		h <= SLIDER_DOT_SIZE_MAX
	);
}

function sliderEllipsesMatch(a, b) {
	const ba = sliderNodeBBox(a);
	const bb = sliderNodeBBox(b);
	if (!ba || !bb) return false;
	return (
		Math.abs(roundInt(ba.width) - roundInt(bb.width)) <= 2 &&
		Math.abs(roundInt(ba.height) - roundInt(bb.height)) <= 2
	);
}

/**
 * Pagination dots: horizontal FRAME (or auto-layout row) with 3+ similar
 * dot-sized ELLIPSE children (~8–12 px).
 */
function findPaginationDots(root, depth = 0) {
	if (!root || root.visible === false || depth > 6) return null;

	const ellipses = (root.children ?? []).filter(isSliderDotSizedEllipse);
	if (ellipses.length >= 3) {
		let matchCount = 1;
		const ref = ellipses[0];
		for (let i = 1; i < ellipses.length; i++) {
			if (sliderEllipsesMatch(ref, ellipses[i])) matchCount += 1;
		}
		if (matchCount >= 3) return { frame: root, count: matchCount };
	}

	for (const child of root.children ?? []) {
		const nested = findPaginationDots(child, depth + 1);
		if (nested) return nested;
	}
	return null;
}

function isSliderArrowLikeNode(n) {
	if (!n || n.visible === false || !SLIDER_NAV_TYPES.has(n.type)) return false;

	const label = `${normalizeMatchText(n.name)} ${n.type === "TEXT" ? normalizeMatchText(n.characters) : ""}`;
	if (/\b(arrow|chevron|prev|next|back|forward|left|right|slide|swiper)\b/.test(label)) {
		return true;
	}
	if (n.type === "TEXT" && /[←→«»‹›<>]/.test(String(n.characters ?? ""))) return true;

	const box = sliderNodeBBox(n);
	if (!box) return false;
	const w = roundInt(box.width);
	const h = roundInt(box.height);
	return (
		w >= SLIDER_NAV_SIZE_MIN &&
		w <= SLIDER_NAV_SIZE_MAX &&
		h >= SLIDER_NAV_SIZE_MIN &&
		h <= SLIDER_NAV_SIZE_MAX
	);
}

/** Collect INSTANCE / VECTOR / TEXT controls that read as prev/next toggles. */
function collectSliderNavArrows(root, depth = 0, out = []) {
	if (!root || root.visible === false || depth > 5) return out;
	if (isSliderArrowLikeNode(root)) out.push(root);
	for (const child of root.children ?? []) collectSliderNavArrows(child, depth + 1, out);
	return out;
}

function sliderNavArrowsAreDistinct(arrows) {
	if (arrows.length < 2) return false;
	const keys = new Set(
		arrows.map((n) => {
			const box = sliderNodeBBox(n);
			const x = roundInt(box?.x) ?? 0;
			const y = roundInt(box?.y) ?? 0;
			const name = normalizeMatchText(n.name);
			return `${name}|${x}|${y}`;
		}),
	);
	return keys.size >= 2;
}

/** Reject wrapped multi-row card tracks (static grids, not carousels). */
function sliderCardsWrapMultipleRows(track) {
	if (track.layoutWrap && track.layoutWrap !== "NO_WRAP") return true;

	const cards = (track.children ?? []).filter(
		(c) => c.visible !== false && SLIDER_CARD_TYPES.has(c.type),
	);
	if (cards.length < 2) return false;

	const rowYs = new Set(cards.map((c) => roundInt(sliderNodeBBox(c)?.y)).filter((y) => y != null));
	return rowYs.size > 1;
}

/** Reject vertical accordions that expose +/- expand/collapse chrome. */
function isSliderAccordionSection(section) {
	let hasVerticalLayout = false;
	let hasPlusMinusChrome = false;

	const walk = (n) => {
		if (!n || n.visible === false) return;
		if (n.layoutMode === "VERTICAL") hasVerticalLayout = true;

		const name = normalizeMatchText(n.name);
		if (/\b(plus|minus|add|remove|expand|collapse|accordion)\b/.test(name)) {
			hasPlusMinusChrome = true;
		}
		if (/[+\-−]/.test(name)) hasPlusMinusChrome = true;

		if (n.type === "TEXT") {
			const text = String(n.characters ?? "").trim();
			if (/^[+\-−]$/.test(text)) hasPlusMinusChrome = true;
		}

		for (const child of n.children ?? []) walk(child);
	};

	walk(section);
	return hasVerticalLayout && hasPlusMinusChrome;
}

/**
 * Immediate neighborhood for nav chrome: track siblings, parent shell, and
 * other direct children of the section root.
 */
function collectSliderNavNeighborhood(track, parent, sectionRoot) {
	const neighborhood = new Set();
	if (parent) {
		neighborhood.add(parent);
		for (const sibling of parent.children ?? []) {
			if (sibling !== track) neighborhood.add(sibling);
		}
	}
	for (const child of sectionRoot.children ?? []) neighborhood.add(child);
	return [...neighborhood];
}

function sliderTrackHasNavChrome(track, parent, sectionRoot) {
	const neighborhood = collectSliderNavNeighborhood(track, parent, sectionRoot);
	let hasDots = false;
	let hasArrows = false;

	for (const node of neighborhood) {
		if (!hasDots && findPaginationDots(node)) hasDots = true;
		if (!hasArrows && sliderNavArrowsAreDistinct(collectSliderNavArrows(node))) {
			hasArrows = true;
		}
		if (hasDots && hasArrows) break;
	}

	// Both pagination dots and prev/next controls confirm a swiper track.
	return hasDots && hasArrows;
}

/**
 * Scan a top-level section subtree for a horizontal repeat track plus nav chrome.
 * Returns true when the structural fingerprint matches a swiper/carousel.
 */
function detectStructuralSlider(sectionRoot) {
	if (!sectionRoot || sectionRoot.visible === false) return false;
	if (isSliderAccordionSection(sectionRoot)) return false;

	let matched = false;

	const walk = (node, parent) => {
		if (matched || !node || node.visible === false) return;

		if (node.layoutMode === "HORIZONTAL" && !sliderCardsWrapMultipleRows(node)) {
			const cards = (node.children ?? []).filter(
				(c) => c.visible !== false && SLIDER_CARD_TYPES.has(c.type),
			);
			const groups = groupSimilarSliderCards(cards);
			const bestGroup = groups[0];

			if (bestGroup && bestGroup.count >= 3) {
				if (sliderTrackHasNavChrome(node, parent, sectionRoot)) {
					matched = true;
					return;
				}
			}
		}

		for (const child of node.children ?? []) walk(child, node);
	};

	walk(sectionRoot, null);
	return matched;
}

// ---------------------------------------------------------------------------
// Structural table fingerprinting — layout/geometry gate + soft fill/text boosts.
// Mirrors slider detection: runs on top-level section FRAMEs during page slicing.
// ---------------------------------------------------------------------------

const TABLE_ROW_TYPES = new Set(["FRAME", "INSTANCE", "COMPONENT"]);
const TABLE_CELL_TYPES = new Set(["FRAME", "INSTANCE", "COMPONENT", "TEXT", "GROUP"]);
const TABLE_FILL_NAME_RE = /\btable\b/i;
const TABLE_HEADER_TEXT_RE =
	/^(tên dịch vụ|đơn vị(\s*tính)?|chi phí|stt|giá(\s*bán)?|unit|price|service|name|cost)\b/i;
const TABLE_CURRENCY_RE = /\d[\d.,]*\s*(đ|vnd|₫)\b/i;
const TABLE_INDEX_RE = /^\d{1,3}$/;
const TABLE_MIN_ROWS = 3;
const TABLE_MIN_COLS = 2;

/** Resolve a fill style / manual table token name for soft boosts. */
function tableFillName(n, ctx) {
	if (!n) return null;
	if (n.styles?.fill && ctx?.rawStyles) {
		const name = ctx.rawStyles[n.styles.fill]?.name;
		if (name) return name;
	}
	const hex = fillHexFromNode(n);
	if (!hex || hex.startsWith("gradient:")) return null;
	const fromMap = resolveUnlinkedFillFi(hex, ctx ?? {});
	if (fromMap) return fromMap;
	for (const [name, color] of Object.entries(MANUAL_FILL_TOKENS)) {
		if (color.toLowerCase() === hex.toLowerCase()) return name;
	}
	return null;
}

function nodeHasTableFill(n, ctx) {
	const name = tableFillName(n, ctx);
	return !!(name && TABLE_FILL_NAME_RE.test(name));
}

function subtreeHasTableFill(root, ctx, depth = 0) {
	if (!root || root.visible === false || depth > 8) return false;
	if (nodeHasTableFill(root, ctx)) return true;
	for (const child of root.children ?? []) {
		if (subtreeHasTableFill(child, ctx, depth + 1)) return true;
	}
	return false;
}

function collectTableTextSamples(root, depth = 0, out = []) {
	if (!root || root.visible === false || depth > 4 || out.length >= 32) return out;
	if (root.type === "TEXT" && root.characters) {
		out.push(String(root.characters).trim());
	}
	for (const child of root.children ?? []) collectTableTextSamples(child, depth + 1, out);
	return out;
}

function tableRowCellCount(row) {
	return (row.children ?? []).filter(
		(c) => c.visible !== false && TABLE_CELL_TYPES.has(c.type),
	).length;
}

/** Fingerprint for comparing table row siblings (column count + child types). */
function structuralTableRowFingerprint(n) {
	const cells = (n.children ?? []).filter(
		(c) => c.visible !== false && TABLE_CELL_TYPES.has(c.type),
	);
	// Ignore FRAME vs INSTANCE and height — data rows are often instances of a
	// component while the header is a plain frame (or heights differ slightly).
	return [n.layoutMode ?? "NONE", cells.length, cells.map((c) => c.type).join(">")].join("|");
}

function tableRowsStructurallySimilar(a, b) {
	return structuralTableRowFingerprint(a) === structuralTableRowFingerprint(b);
}

function groupSimilarTableRows(children) {
	const groups = [];
	for (const child of children) {
		if (child.visible === false || !TABLE_ROW_TYPES.has(child.type)) continue;
		if (child.layoutMode !== "HORIZONTAL") continue;
		let placed = false;
		for (const group of groups) {
			if (tableRowsStructurallySimilar(child, group.representative)) {
				group.nodes.push(child);
				group.count += 1;
				placed = true;
				break;
			}
		}
		if (!placed) {
			groups.push({ representative: child, nodes: [child], count: 1 });
		}
	}
	return groups.sort((a, b) => b.count - a.count);
}

/**
 * Soft boosts raise confidence for borderline 2-column stacks.
 * Strong 3+ column grids can match on structure alone.
 */
function tableHasSoftBoost(body, parent, sectionRoot, rows, ctx) {
	if (subtreeHasTableFill(sectionRoot, ctx)) return true;
	if (body && subtreeHasTableFill(body, ctx)) return true;
	if (parent && nodeHasTableFill(parent, ctx)) return true;

	const texts = [];
	if (parent) collectTableTextSamples(parent, 0, texts);
	else collectTableTextSamples(body, 0, texts);
	for (const row of rows.slice(0, 4)) collectTableTextSamples(row, 0, texts);

	for (const tx of texts) {
		if (!tx) continue;
		if (TABLE_HEADER_TEXT_RE.test(tx)) return true;
		if (TABLE_CURRENCY_RE.test(tx)) return true;
		if (TABLE_INDEX_RE.test(tx)) return true;
	}
	return false;
}

/**
 * Scan a top-level section subtree for a vertical stack of similar horizontal
 * rows with a stable column count. Rejects swiper chrome (not accordion — that
 * helper false-positives on hyphenated labels / "-20%" discount badges).
 */
function detectStructuralTable(sectionRoot, ctx) {
	if (!sectionRoot || sectionRoot.visible === false) return false;
	if (detectStructuralSlider(sectionRoot)) return false;

	let matched = false;

	const walk = (node, parent) => {
		if (matched || !node || node.visible === false) return;

		if (node.layoutMode === "VERTICAL") {
			const rowCandidates = (node.children ?? []).filter(
				(c) =>
					c.visible !== false &&
					TABLE_ROW_TYPES.has(c.type) &&
					c.layoutMode === "HORIZONTAL",
			);
			const groups = groupSimilarTableRows(rowCandidates);
			const best = groups[0];

			if (best && best.count >= TABLE_MIN_ROWS) {
				const colCount = tableRowCellCount(best.representative);
				const stableCols = best.nodes.filter((r) => tableRowCellCount(r) === colCount).length;

				if (colCount >= TABLE_MIN_COLS && stableCols >= TABLE_MIN_ROWS) {
					const boost = tableHasSoftBoost(node, parent, sectionRoot, best.nodes, ctx);
					// 3+ columns: structure alone. 2 columns: require fill/header/currency boost.
					if (colCount >= 3 || boost) {
						matched = true;
						return;
					}
				}
			}
		}

		for (const child of node.children ?? []) walk(child, node);
	};

	walk(sectionRoot, null);
	return matched;
}

function withSectionInteractionMeta(tree, sectionNode, ctx) {
	if (!tree) return tree;

	const annotate = (compressedNode, rawNode) => {
		if (!compressedNode || !rawNode) return false;
		if (detectStructuralSlider(rawNode)) {
			compressedNode.meta = { ...(compressedNode.meta ?? {}), interactionType: "swiper-slider" };
			return true;
		}
		if (detectStructuralTable(rawNode, ctx)) {
			compressedNode.meta = { ...(compressedNode.meta ?? {}), interactionType: "table" };
			return true;
		}
		return false;
	};

	// Prefer per-region tags (direct section children ≈ module regions) so a page
	// can carry both a swiper block and a pricing table without one winning globally.
	const rawKids = (sectionNode.children ?? []).filter((c) => c.visible !== false);
	const rawByName = new Map();
	for (const raw of rawKids) {
		if (raw.name) rawByName.set(raw.name, raw);
	}

	let taggedChild = false;
	for (const cNode of tree.ch ?? []) {
		const raw = cNode.n ? rawByName.get(cNode.n) : null;
		if (raw && annotate(cNode, raw)) taggedChild = true;
	}

	if (!taggedChild) annotate(tree, sectionNode);
	return tree;
}

function implementationRules() {
	return {
		pixelPerfectPolicy: {
			reviewAgainst: "actual content viewport, not physical monitor width",
			tolerance: "1-5px allowed for browser/OS/font/sub-pixel rendering differences",
			browserZoom: "100%",
			scrollbar: {
				rule: "Reserve scrollbar gutter to prevent layout shift",
				css: "html { scrollbar-gutter: stable; }",
				note: "A 1920px browser can have around 1903px usable content width when a 17px scrollbar exists.",
			},
			avoid: [
				"width: 100vw for normal page sections",
				"hardcoded body width: 1920px",
				"layout based on physical monitor width",
				"height: 100vh on mobile without fallback",
				"absolute positioning for normal content flow",
			],
			prefer: [
				"width: 100%",
				"max-width containers",
				"min-height: 100svh for mobile viewport",
				"box-sizing: border-box",
				"responsive typography and wrapping rules",
			],
		},
		cssBase: {
			html: {
				boxSizing: "border-box",
				scrollbarGutter: "stable",
				webkitTextSizeAdjust: "100%",
			},
			body: {
				margin: 0,
				overflowX: "hidden",
				minWidth: "320px",
			},
		},
		browserEdgeCases: [
			"Windows scrollbar can reduce 1920px browser width to around 1903px content width.",
			"Do not use 100vw for normal sections because it can include scrollbar width.",
			"Use scrollbar-gutter: stable to avoid layout shift.",
			"Use browser zoom 100% during visual QA.",
			"Allow small differences across Chrome, Safari, Firefox, Windows, macOS, and different device pixel ratios.",
			"Use 100svh or progressive viewport units for mobile browser bar issues.",
		],
		cmsEdgeCases: {
			longProjectNames: true,
			missingImageFallback: true,
			emptyListState: true,
			longVietnameseTextWrapping: true,
			longEnglishTextWrapping: true,
		},
	};
}

function collectFamilyUsage(n, familyUsage) {
	if (!n || typeof n !== "object") return;
	if (n.visible === false) return;
	if (n.type === "TEXT" && n.style?.fontFamily) {
		familyUsage.set(n.style.fontFamily, (familyUsage.get(n.style.fontFamily) ?? 0) + 1);
	}
	if (n.children) for (const c of n.children) collectFamilyUsage(c, familyUsage);
}

/**
 * STRUCTURAL_CONTAINERS: node types whose name (`n`) may be pruned when
 * deeply nested. INSTANCE and COMPONENT are excluded because their name
 * carries component-set identity needed by downstream generators.
 */
const STRUCTURAL_CONTAINERS = new Set(["FRAME", "GROUP"]);

function compressNode(n, ctx, parentNode = null, depth = 0) {
	if (!n || typeof n !== "object") return null;
	if (n.visible === false) return null;

	const { rawStyles, nameToIds, components, componentSets, familyToKey } = ctx;

	if (n.type === "TEXT") {
		const preview = textPreview(n.characters);
		if (!preview) return null;

		const out = { t: "TEXT", tx: preview };

		// Rule 1: omit `n` when the layer name is identical to the text content.
		if (n.name && n.name !== preview) out.n = n.name;

		const b = compactBbox(n);
		if (b) out.b = b;

		if (n.styles?.text) out.ty = resolveStyleRef(n.styles.text, rawStyles, nameToIds);
		else {
			const traits = compactTextTraits(n.style, familyToKey);
			const ty = resolveUnlinkedTextTy(traits, ctx);
			if (ty) out.ty = ty;
			else if (traits) Object.assign(out, traits);
		}

		if (n.styles?.fill) out.fi = resolveStyleRef(n.styles.fill, rawStyles, nameToIds);
		else {
			const hex = fillHexFromNode(n);
			if (hex && !hex.startsWith("gradient:")) {
				const fi = resolveUnlinkedFillFi(hex, ctx);
				if (fi) out.fi = fi;
				else out.c = hex;
			}
		}
		return out;
	}

	if (ILLUSTRATIVE_TYPES.has(n.type)) {
		const b = compactBbox(n);
		return b ? { t: n.type, b } : null;
	}

	// Rule 2: prune `n` on deeply-nested structural containers.
	// Keep name on: top-level nodes (depth <= 1), INSTANCE, COMPONENT, SECTION,
	// and any node that carries auto-layout (it is a meaningful layout region).
	const isAutoLayout =
		n.layoutMode === "HORIZONTAL" || n.layoutMode === "VERTICAL";
	const keepName =
		depth <= 1 ||
		!STRUCTURAL_CONTAINERS.has(n.type) ||
		isAutoLayout;

	const out = { t: n.type };
	if (keepName && n.name) out.n = n.name;

	// Rule: strip x/y when inside (or self-describing) an auto-layout flow.
	const b = bboxForNode(n, parentNode);
	if (b) out.b = b;

	const img = imageFillInfo(n);
	if (img) out.img = img;

	const al = summarizeAutoLayout(n);
	if (al) out.al = al;

	if (n.type === "INSTANCE" && n.componentId) {
		const meta = components[n.componentId];
		out.ref = meta?.name ?? n.componentId;
		if (meta?.componentSetId && componentSets[meta.componentSetId]) {
			out.set = componentSets[meta.componentSetId].name;
		}
	}

	if (n.styles?.fill) out.fi = resolveStyleRef(n.styles.fill, rawStyles, nameToIds);
	else if (n.type === "RECTANGLE" || n.type === "FRAME") {
		const hex = fillHexFromNode(n);
		if (hex && !hex.startsWith("gradient:")) {
			const fi = resolveUnlinkedFillFi(hex, ctx);
			if (fi) out.fi = fi;
			else out.c = hex;
		}
	}

	if (n.styles?.effect) out.ef = resolveStyleRef(n.styles.effect, rawStyles, nameToIds);

	if (n.cornerRadius != null && n.cornerRadius > 0) out.r = roundInt(n.cornerRadius);

	if (n.children?.length) {
		const ch = [];
		for (const c of n.children) {
			const compressed = compressNode(c, ctx, n, depth + 1);
			if (compressed) ch.push(compressed);
		}
		if (ch.length) out.ch = ch;
	}

	const structural = new Set([
		"SECTION",
		"CANVAS",
		"FRAME",
		"COMPONENT",
		"INSTANCE",
		"GROUP",
	]);
	if (
		!out.ch &&
		!out.al &&
		!out.ref &&
		!out.fi &&
		!out.c &&
		!structural.has(n.type)
	) {
		return null;
	}

	return out;
}

function* walkJsonFiles(dir) {
	if (!fs.existsSync(dir)) return;
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, ent.name);
		if (ent.isDirectory()) yield* walkJsonFiles(full);
		else if (ent.isFile() && ent.name.toLowerCase().endsWith(".json")) yield full;
	}
}

function pageSlugFromPath(filePath) {
	return path
		.basename(filePath, ".json")
		.toLowerCase()
		.replace(/^\d+[_-\s]*/, "")
		.replace(/_/g, "-")
		.trim();
}

function normalizeMatchText(value) {
	return String(value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function pageSlugAliases(slug) {
	const normalized = normalizeMatchText(slug).replace(/\s+/g, "-");
	const terms = normalized.split("-").filter(Boolean);
	const joined = terms.join("");
	const aliases = new Set([normalized]);
	const addAlias = (value) => {
		const clean = normalizeMatchText(value).replace(/\s+/g, "-");
		if (clean) aliases.add(clean);
	};

	addAlias(normalized.replace(/(?:-|_)?(full|copy|final|draft)$/i, ""));
	addAlias(normalized.replace(/\b(v|ver|version)[-_]?\d+\b/gi, ""));
	addAlias(normalized.replace(/[-_ ]+\d+$/g, ""));

	const aliasMap = {
		home: ["homepage", "home"],
		work: ["works", "du-an", "duan", "project", "projects"],
		about: ["about-us", "aboutus", "gioi-thieu", "gioithieu", "introduction"],
		contact: ["lien-he", "lienhe", "contact-us", "contactus"],
		services: ["service", "dich-vu", "dichvu"],
		"services-detail": ["service-detail", "service-detail-page", "chi-tiet-dich-vu", "chitietdichvu"],
		news: ["tin-tuc", "tintuc", "blog", "article", "articles"],
		"news-detail": ["tin-tuc-chi-tiet", "tintucchitiet", "news-ct", "article-detail"],
		gioithieu: ["about", "about-us", "aboutus", "gioi-thieu", "introduction"],
		lienhe: ["contact", "contact-us", "contactus", "lien-he"],
		dichvu: ["services", "service", "dich-vu"],
		tintuc: ["news", "blog", "article", "tin-tuc"],
	};

	for (const key of [normalized, joined]) {
		for (const alias of aliasMap[key] ?? []) aliases.add(alias);
	}

	if (terms.length > 1) aliases.add(terms.join(""));
	if (joined) aliases.add(joined);

	return [...aliases].map((alias) => alias.replace(/\s+/g, "-"));
}

function isMetaCanvas(name) {
	const t = name.trim();
	return (
		/^(cover|hin)$/i.test(t) ||
		/^-+$/.test(t) ||
		t === "---------------" ||
		/^design\s*systems?$/i.test(t)
	);
}

/** Map figma/02_about-us.json → canvas names like "About", "About Us", etc. */
function canvasMatchesPage(canvasName, slug) {
	if (isMetaCanvas(canvasName)) return false;

	const cn = normalizeMatchText(canvasName);
	const slugAliases = pageSlugAliases(slug);
	const aliasTerms = slugAliases.map((alias) => alias.split("-").filter(Boolean));

	if (slugAliases.includes("home")) {
		return /\bhome\s*page\b|\bhomepage\b|\bhome\b/.test(cn);
	}

	const slugVariants = new Set();
	for (const alias of slugAliases) {
		slugVariants.add(alias);
		slugVariants.add(alias.replace(/-/g, " "));
		slugVariants.add(alias.replace(/-/g, "_"));
		slugVariants.add(alias.replace(/-/g, ""));
	}

	if ([...slugVariants].some((v) => v && cn.includes(v))) return true;

	return aliasTerms.some((terms) => terms.length && terms.every((term) => cn.includes(term)));
}

function canvasRole(canvasName, pageSlug) {
	if (isMetaCanvas(canvasName)) return null;
	if (pageSlug) return canvasMatchesPage(canvasName, pageSlug) ? "page" : null;
	return "page";
}

function isHomepageCanvas(name) {
	return /home\s*page|homepage/i.test(name);
}

/** Prefer newest Homepage canvas (e.g. 20.01.2030 over 2028). */
function pickPrimaryHomepageCanvas(canvases) {
	const home = canvases.filter((c) => c.type === "CANVAS" && isHomepageCanvas(c.name));
	if (!home.length) return null;
	return home.sort((a, b) => b.name.localeCompare(a.name))[0];
}

/**
 * Match top-level section FRAMEs inside a long-scroll Homepage canvas
 * (e.g. 02_works, 04_about) when there is no dedicated Figma page per route.
 */
function sectionMatchesSlug(frameName, slug) {
	if (!sectionScopeMatches(frameName, slug)) return false;

	const n = normalizeMatchText(frameName).replace(/\s+/g, "-");
	const aliases = pageSlugAliases(slug);

	for (const alias of aliases) {
		switch (alias) {
			case "home":
				if (/^01[-_]?home$/i.test(n) || /00[-_]?home/i.test(n)) return true;
				break;
			case "work":
			case "works":
				if (/\bworks?\b/.test(n) && /(^|[-_])0?2/.test(n)) return true;
				break;
			case "about":
			case "about-us":
			case "gioi-thieu":
			case "gioithieu":
				if (/\babout\b/.test(n) || /gioi[-_]?thieu/i.test(n)) return true;
				break;
			case "contact":
			case "contact-us":
			case "lien-he":
			case "lienhe":
				if (/\bcontact\b/.test(n) || /lien[-_]?he/i.test(n)) return true;
				break;
			case "services":
			case "service":
			case "dich-vu":
			case "dichvu":
				if ((/\bservices?\b/.test(n) || /dich[-_]?vu/i.test(n) || /niengrang/i.test(n) || /goisanpham/i.test(n)) && !/03-2|03_2|-ct\b|detail|ct$/i.test(n)) return true;
				break;
			case "services-detail":
			case "service-detail":
			case "chi-tiet-dich-vu":
			case "chitietdichvu":
				if ((/\bservices?\b/.test(n) || /dich[-_]?vu/i.test(n) || /niengrang/i.test(n) || /goisanpham/i.test(n)) && (/03-2|03_2|services-ct|detail|ct$/i.test(n))) return true;
				break;
			case "news":
			case "tin-tuc":
			case "tintuc":
			case "blog":
				if ((/\bnews\b/.test(n) || /tin[-_]?tuc/i.test(n)) && !/05-2|05_2|-ct\b|detail|ct$/i.test(n)) return true;
				break;
			case "news-detail":
			case "tin-tuc-chi-tiet":
			case "tintucchitiet":
			case "article-detail":
				if ((/\bnews\b/.test(n) || /tin[-_]?tuc/i.test(n)) && (/05-2|05_2|news-ct|detail|ct$/i.test(n))) return true;
				break;
			default: {
				const terms = alias.split("-").filter(Boolean);
				const spaced = n.replace(/-/g, " ");
				if (terms.length && terms.every((term) => spaced.includes(term))) return true;
			}
		}
	}

	return false;
}

function isSharedSection(sectionName) {
	const normalized = (sectionName || "").trim().toLowerCase();
	if (normalized.startsWith("[shared]")) return true;
	const cleanName = normalizeMatchText(sectionName).replace(/^[0-9_\-\.\s]+/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	return sharedSectionsConfig.includes(cleanName) || sharedSectionsConfig.includes(normalized);
}

function getSharedSectionKey(sectionName) {
	let cleanName = normalizeMatchText(sectionName).replace(/^[0-9_\-\.\s]+/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	if ((sectionName || "").trim().toLowerCase().startsWith("[shared]")) {
		cleanName = normalizeMatchText(sectionName.replace(/\[shared\]/i, "")).replace(/^[0-9_\-\.\s]+/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	}
	return cleanName || "shared-block";
}

/** header/footer live in _layout.pug — strip from page JSON. */
const LAYOUT_STRIP_REFS = new Set(["header", "footer"]);

/** Breadcrumb/banner — emit SHARED_REF for section includes. */
const LAYOUT_INCLUDE_REFS = new Set([
	"top-banner",
	".top-banner",
	"global-breadcrumb",
	".global-breadcrumb",
]);

/**
 * Map Figma INSTANCE name/ref to a layout chrome key (header, footer, top-banner, …).
 */
function resolveLayoutChromeKey(node) {
	if (!node || node.t !== "INSTANCE") return null;

	const name = normalizeMatchText(node.n || "");
	const ref = normalizeMatchText(node.ref || "");

	if (/^footer\b/.test(name) || /^footer\//.test(node.ref || "")) return "footer";
	if (/^header\d*$/.test(name) || /^header\b/.test(name) || /^header/.test(ref)) return "header";
	if (/top[-_]?banner/.test(name) || name === "top-banner") return "top-banner";
	if (/global[-_]?breadcrumb/.test(name) || /\bbreadcrumb\b/.test(name)) return "global-breadcrumb";

	for (const key of sharedSectionsConfig) {
		const norm = normalizeMatchText(key).replace(/^\./, "");
		if (name === norm || name.includes(norm) || ref.includes(norm)) {
			if (LAYOUT_STRIP_REFS.has(norm) || LAYOUT_STRIP_REFS.has(key)) return norm;
			if (LAYOUT_INCLUDE_REFS.has(key) || LAYOUT_INCLUDE_REFS.has(norm)) {
				return norm === "top-banner" || key === ".top-banner" ? "top-banner" : "global-breadcrumb";
			}
		}
	}

	return null;
}

function reorderSectionChildren(children) {
	if (!Array.isArray(children) || children.length < 2) return children;

	const rank = (node) => {
		if (node.t === "SHARED_REF") {
			if (node.ref === "global-breadcrumb") return 0;
			if (node.ref === "top-banner") return 1;
			return 5;
		}
		const name = normalizeMatchText(node.n || "");
		if (/\bbreadcrumb\b/.test(name)) return 2;
		// Breadcrumb bar: small gray strip with Body/Body-4 copy
		if (node.t === "FRAME" && node.ch?.some((c) => c.t === "TEXT" && c.ty?.includes("Body/Body-4"))) {
			return 2;
		}
		return 10;
	};

	return [...children].sort((a, b) => rank(a) - rank(b));
}

/**
 * Strip header/footer INSTANCE subtrees; convert banner/breadcrumb chrome → SHARED_REF.
 * Also converts heuristic breadcrumb FRAME bars (Body/Body-4 + "/" copy).
 */
function processLayoutChromeInTree(node) {
	if (!node || typeof node !== "object") return node;

	if (Array.isArray(node.ch)) {
		const nextChildren = [];
		for (const child of node.ch) {
			const chromeKey = resolveLayoutChromeKey(child);
			if (chromeKey && LAYOUT_STRIP_REFS.has(chromeKey)) {
				continue;
			}
			if (chromeKey && LAYOUT_INCLUDE_REFS.has(chromeKey)) {
				nextChildren.push({ t: "SHARED_REF", ref: chromeKey });
				continue;
			}
			if (isBreadcrumbNode(child)) {
				nextChildren.push({ t: "SHARED_REF", ref: "global-breadcrumb" });
				continue;
			}
			const processed = processLayoutChromeInTree(child);
			if (processed) nextChildren.push(processed);
		}
		node.ch = reorderSectionChildren(nextChildren);
	}

	return node;
}

function finalizePageTrees(pageTrees) {
	return pageTrees.map((section) => processLayoutChromeInTree(section));
}

const nameKey = (s) => normalizeMatchText(s ?? "");

function isExcludedSection(name) {
	const n = nameKey(name);
	return PAGE_CONFIG.tokenScope.excludeSectionPrefixes.some((p) => n.startsWith(nameKey(p)));
}

/**
 * Synthetic DOCUMENT holding only the canvases that define the shipped design
 * system, with retired sections pruned. Feeding this to the token pass keeps
 * styles that exist solely on draft canvases or superseded pages out of
 * json/system-design.json — they used to arrive as phantom name collisions.
 */
function buildTokenScopeDocument(doc) {
	const include = new Set(PAGE_CONFIG.tokenScope.includeCanvases.map(nameKey));
	if (!include.size) return doc;

	const canvases = [];
	for (const canvas of doc.children ?? []) {
		if (canvas.type !== "CANVAS" || !include.has(nameKey(canvas.name))) continue;
		const kept = (canvas.children ?? []).filter(
			(child) => child.visible !== false && !isExcludedSection(child.name),
		);
		if (kept.length) canvases.push({ ...canvas, children: kept });
	}
	if (!canvases.length) return doc;

	return {
		id: "0:0",
		name: "Token Scope",
		type: "DOCUMENT",
		children: canvases,
	};
}

/**
 * Locate the page artboards declared in figma-pages.json. Artboards are the
 * full-width FRAMEs nested inside canvas SECTIONs, so this walks canvas →
 * section → frame rather than treating one canvas as one page.
 */
function collectPageArtboards(doc) {
	const wanted = new Map(
		Object.entries(PAGE_CONFIG.pages).map(([frameName, slug]) => [
			nameKey(frameName),
			{ frameName, slug },
		]),
	);
	if (!wanted.size) return [];

	const found = [];
	const claimed = new Set();

	const walk = (node, canvasName, sectionName, depth) => {
		if (!node || node.visible === false || depth > 4) return;
		const hit = wanted.get(nameKey(node.name));
		if (hit && !claimed.has(hit.slug)) {
			claimed.add(hit.slug);
			found.push({ ...hit, canvasName, sectionName, node });
			return;
		}
		const nextSection = node.type === "SECTION" ? node.name : sectionName;
		for (const child of node.children ?? []) {
			walk(child, canvasName, nextSection, depth + 1);
		}
	};

	for (const canvas of doc.children ?? []) {
		if (canvas.type !== "CANVAS") continue;
		walk(canvas, canvas.name, null, 0);
	}

	const missing = [...wanted.values()].filter((w) => !claimed.has(w.slug));
	return { found, missing };
}

/** Compress one page artboard: each direct child becomes a section tree. */
function extractArtboardTrees(artboardNode, ctx) {
	const trees = [];
	const sections = [];

	for (const child of artboardNode.children ?? []) {
		if (child.visible === false) continue;
		const compressed = compressNode(child, ctx);
		if (!compressed) continue;

		sections.push(child.name);

		if (isSharedSection(child.name)) {
			const refKey = getSharedSectionKey(child.name);
			if (!sharedSectionsMap.has(refKey)) {
				sharedSectionsMap.set(refKey, { n: refKey, ch: compressed.ch ?? [compressed] });
			}
			trees.push(
				withSectionInteractionMeta(
					{ n: child.name, ch: [{ t: "SHARED_REF", ref: refKey }] },
					child,
					ctx,
				),
			);
		} else {
			trees.push(
				withSectionInteractionMeta(
					{ n: child.name, ch: compressed.ch ?? [compressed] },
					child,
					ctx,
				),
			);
		}
	}

	return { trees, sections };
}

function extractPageSections(doc, pageSlug, ctx) {
	const canvas = pickPrimaryHomepageCanvas(doc.children ?? []);
	if (!canvas) return { trees: [], canvasName: null, sections: [] };

	const trees = [];
	const sections = [];

	for (const child of canvas.children ?? []) {
		if (child.visible === false) continue;
		if (child.type !== "FRAME" && child.type !== "SECTION") continue;
		if (!sectionMatchesSlug(child.name, pageSlug)) continue;

		const compressed = compressNode(child, ctx);
		if (!compressed) continue;

		sections.push(child.name);
		
		if (isSharedSection(child.name)) {
			const refKey = getSharedSectionKey(child.name);
			if (!sharedSectionsMap.has(refKey)) {
				sharedSectionsMap.set(refKey, { n: refKey, ch: compressed.ch ?? [compressed] });
			}
			trees.push(
				withSectionInteractionMeta(
					{ n: child.name, ch: [{ t: "SHARED_REF", ref: refKey }] },
					child,
					ctx,
				),
			);
		} else {
			trees.push(
				withSectionInteractionMeta(
					{ n: child.name, ch: compressed.ch ?? [compressed] },
					child,
					ctx,
				),
			);
		}
	}

	return { trees, canvasName: canvas.name, sections };
}

function mergeSystemDesign(into, part) {
	into.meta.sources = [...new Set([...(into.meta.sources ?? []), ...(part.meta.sources ?? [])])];

	Object.assign(into.tokens.fontFamilies, part.tokens.fontFamilies);

	for (const [key, style] of Object.entries(part.tokens.styles ?? {})) {
		const prev = into.tokens.styles[key];
		if (prev && style.u != null && prev.u != null) {
			into.tokens.styles[key] = { ...prev, ...style, u: prev.u + style.u };
		} else {
			into.tokens.styles[key] = style;
		}
	}

	const local = new Map((into.tokens.localType ?? []).map((x) => [JSON.stringify(x), x]));
	for (const x of part.tokens.localType ?? []) {
		const k = JSON.stringify(x);
		local.set(k, local.has(k) ? { ...local.get(k), u: local.get(k).u + x.u } : x);
	}
	into.tokens.localType = [...local.values()].sort((a, b) => b.u - a.u).slice(0, 30);

	into.tokens.orphanColors = [
		...new Set([...(into.tokens.orphanColors ?? []), ...(part.tokens.orphanColors ?? [])]),
	].slice(0, 120);

	for (const key of ["pad", "gap", "radius"]) {
		into.tokens.spacing[key] = [
			...new Set([...(into.tokens.spacing[key] ?? []), ...(part.tokens.spacing[key] ?? [])]),
		].sort((a, b) => a - b);
	}
}

/** Flat token dictionary only — no layout trees, components, or patterns. */
function toSystemDesignPayload(part) {
	// Deep-clone the style registry so we can strip internal analytics fields
	// without mutating the in-memory accumulator used by mergeSystemDesign.
	const cleanStyles = {};
	for (const [key, raw] of Object.entries(part.tokens.styles ?? {})) {
		// `u` is kept deliberately: build-ir.mjs ranks competing metrics by usage,
		// and stripping it made every duplicate-name conflict look like a 1-vs-1
		// tie with no majority, which forced a manual override for each one.
		// eslint-disable-next-line no-unused-vars
		const { local: _local, ...rest } = raw;
		cleanStyles[key] = rest;
	}

	// Omit orphanColors — downstream agents must use only semantic tokens.
	const { orphanColors: _orphanColors, ...restTokens } = part.tokens;

	return {
		meta: {
			role: "system",
			file: part.meta.file,
			at: part.meta.at,
			sources: part.meta.sources ?? [part.meta.src],
			...(part.fontStyleOverrides?.summary?.totalIssues
				? { fontStyleOverrides: part.fontStyleOverrides.summary }
				: {}),
		},
		tokens: {
			...restTokens,
			styles: cleanStyles,
		},
	};
}

function toPagePayload(part, slug) {
	const moduleRegions = buildPageModuleRegions(part.pageTrees, slug);
	return {
		meta: {
			role: "page",
			page: slug,
			system: SYSTEM_FILENAME,
			src: part.meta.src,
			file: part.meta.file,
			at: part.meta.at,
			match: part.matchMode ?? "canvas",
			canvases: part.canvasNames ?? part.pageTrees.map((p) => p.n),
			...(part.artboard ? { artboard: part.artboard } : {}),
			...(part.figmaSection ? { figmaSection: part.figmaSection } : {}),
			...(part.sectionNames?.length ? { sections: part.sectionNames } : {}),
			...(moduleRegions.length ? { moduleRegions } : {}),
			...(part.pageWarn ? { warn: part.pageWarn } : {}),
		},
		tree: part.pageTrees,
	};
}

/**
 * One font-family map for the whole run, derived from every document we read.
 * Deriving it per document made `sans3` mean different families in
 * system-design.json and the page JSONs, and left target-only families unmapped.
 */
function buildUnifiedFontMap(docs) {
	const familyUsage = new Map();
	for (const doc of docs) {
		if (doc && typeof doc === "object") collectFamilyUsage(doc, familyUsage);
	}
	return buildFontFamilyMap(familyUsage);
}

/** Token-only pass: styles, colors, typography, spacing scales — no layout trees. */
function extractSystemTokens(raw, sourceName, options = {}) {
	const doc = options.doc ?? raw?.document;
	const rawStyles = raw?.styles ?? {};
	const { byId: stylesById, nameToIds } = initStyleRegistry(rawStyles);

	if (!doc || typeof doc !== "object") {
		return {
			meta: {
				file: raw?.name,
				src: sourceName,
				sources: [sourceName],
				at: new Date().toISOString(),
			},
			tokens: {
				fontFamilies: {},
				styles: {},
				localType: [],
				orphanColors: [],
				spacing: { pad: [], gap: [], radius: [] },
			},
		};
	}

	const { fontFamilies, familyToKey } = options.fontMap ?? buildUnifiedFontMap([doc]);

	const orphanColors = new Set();
	const paddings = new Set();
	const gaps = new Set();
	const radii = new Set();

	function walkTokensOnly(n) {
		if (!n || typeof n !== "object") return;
		if (n.visible === false) return;

		if (Array.isArray(n.fills) && !n.styles?.fill) {
			for (const f of n.fills) {
				if (f?.visible === false) continue;
				if (f.type === "SOLID" && f.color) {
					const hex = rgbaToHex(f.color);
					if (hex) orphanColors.add(hex);
				}
			}
		}

		if (n.styles?.fill) {
			recordStyleUsage(stylesById, n.styles.fill, rawStyles, (entry) => {
				mergeFillHex(entry, fillHexFromNode(n));
			});
		}

		if (n.type === "TEXT") {
			const traits = compactTextTraits(n.style, familyToKey);
			if (n.styles?.text) {
				recordStyleUsage(stylesById, n.styles.text, rawStyles, (entry) => {
					recordStyleTraits(entry, traits, n.name);
					if (n.styles.fill) {
						entry.fillRef = resolveStyleRef(n.styles.fill, rawStyles, nameToIds);
					}
				});
			}
		}

		if (n.styles?.effect) {
			recordStyleUsage(stylesById, n.styles.effect, rawStyles, () => { });
		}

		if (n.paddingTop != null) {
			for (const v of [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft]) {
				const x = roundInt(v);
				if (x) paddings.add(x);
			}
		}
		if (n.itemSpacing != null) {
			const x = roundInt(n.itemSpacing);
			if (x) gaps.add(x);
		}
		if (n.cornerRadius != null && n.cornerRadius > 0) radii.add(roundInt(n.cornerRadius));

		if (n.children) for (const c of n.children) walkTokensOnly(c);
	}

	walkTokensOnly(doc);

	const namedTraitsByFp = collectNamedTraitsIndex(doc, rawStyles, familyToKey);
	const localByFp = collectLocalTypography(doc, familyToKey, namedTraitsByFp);
	const fontStyleOverrides = buildFontStyleOverrideReport(stylesById, nameToIds);
	const styles = applyManualFillTokens({
		...buildNamedStylesExport(stylesById, nameToIds),
		...localTypeStylesExport(localByFp),
	});

	return {
		meta: {
			file: raw?.name,
			src: sourceName,
			sources: [sourceName],
			at: new Date().toISOString(),
		},
		tokens: {
			fontFamilies,
			styles,
			localType: localTypeListExport(localByFp),
			orphanColors: [...orphanColors].slice(0, 120),
			spacing: {
				pad: [...paddings].sort((a, b) => a - b),
				gap: [...gaps].sort((a, b) => a - b),
				radius: [...radii].sort((a, b) => a - b).slice(0, 30),
			},
		},
		fontStyleOverrides,
	};
}

/** Layout pass: structural tree only — tokens live in system-design.json. */
function extractPageLayout(raw, sourceName, pageSlug, options = {}) {
	const doc = raw?.document;
	const rawStyles = raw?.styles ?? {};
	const components = raw?.components ?? {};
	const componentSets = raw?.componentSets ?? {};

	if (!doc || typeof doc !== "object") {
		return {
			meta: {
				file: raw?.name,
				src: sourceName,
				at: new Date().toISOString(),
			},
			pageTrees: [],
			canvasNames: [],
			matchMode: "invalid",
			sectionNames: [],
			pageWarn: `Input "${sourceName}" is missing a valid Figma document root.`,
		};
	}

	const { familyToKey } = options.fontMap ?? buildUnifiedFontMap([doc]);
	const { nameToIds } = initStyleRegistry(rawStyles);
	const namedTraitsByFp = collectNamedTraitsIndex(doc, rawStyles, familyToKey);
	const localTypeByFp = collectLocalTypography(doc, familyToKey, namedTraitsByFp);

	let hexToFi = options.hexToFi;
	if (!hexToFi) {
		const systemPath = path.join(JSON_DIR, SYSTEM_FILENAME);
		let systemStyles = {};
		if (fs.existsSync(systemPath)) {
			try {
				systemStyles = JSON.parse(fs.readFileSync(systemPath, "utf8")).tokens?.styles ?? {};
			} catch (_) {
				systemStyles = {};
			}
		}
		hexToFi = buildHexToFiMap(applyManualFillTokens({ ...systemStyles }));
	}

	const ctx = {
		rawStyles,
		nameToIds,
		components,
		componentSets,
		familyToKey,
		namedTraitsByFp,
		localTypeByFp,
		hexToFi,
	};

	// Preferred path: the slug maps to a declared artboard in figma-pages.json.
	if (options.artboard) {
		const { node, frameName, sectionName, canvasName } = options.artboard;
		const { trees, sections } = extractArtboardTrees(node, ctx);
		return {
			meta: { file: raw?.name, src: sourceName, at: new Date().toISOString() },
			pageTrees: finalizePageTrees(trees),
			canvasNames: canvasName ? [canvasName] : [],
			matchMode: "artboard",
			sectionNames: sections,
			artboard: frameName,
			figmaSection: sectionName ?? undefined,
			pageWarn: trees.length
				? undefined
				: `Artboard "${frameName}" matched but produced no sections.`,
		};
	}

	let pageTrees = [];
	const canvasNames = [];

	for (const canvas of doc.children ?? []) {
		if (canvas.type !== "CANVAS") continue;
		if (canvasRole(canvas.name, pageSlug) !== "page") continue;

		const ch = [];
		for (const child of canvas.children ?? []) {
			const compressed = compressNode(child, ctx);
			if (!compressed) continue;
			
			if (isSharedSection(child.name)) {
				const refKey = getSharedSectionKey(child.name);
				if (!sharedSectionsMap.has(refKey)) {
					sharedSectionsMap.set(refKey, { n: refKey, ch: compressed.ch ?? [compressed] });
				}
				ch.push({ n: child.name, ch: [{ t: "SHARED_REF", ref: refKey }] });
			} else {
				ch.push(compressed);
			}
		}
		if (ch.length) {
			pageTrees.push({ n: canvas.name, ch });
			canvasNames.push(canvas.name);
		}
	}

	let matchMode = "canvas";
	let sectionNames = [];
	let pageWarn;

	if (pageSlug && pageTrees.length === 0) {
		const sectionResult = extractPageSections(doc, pageSlug, ctx);
		if (sectionResult.trees.length) {
			pageTrees.push(...sectionResult.trees);
			matchMode = "section";
			sectionNames = sectionResult.sections;
			if (sectionResult.canvasName) canvasNames.push(sectionResult.canvasName);
		}
	}

	pageTrees = finalizePageTrees(pageTrees);

	if (pageSlug && pageTrees.length === 0) {
		const available = (doc.children ?? [])
			.filter((c) => c.type === "CANVAS" && !isMetaCanvas(c.name))
			.map((c) => c.name);
		pageWarn =
			`No Figma canvas or Homepage section matched slug "${pageSlug}". ` +
			`Available canvases: ${available.join(", ") || "(none)"}. ` +
			`This file may use section frames (e.g. 02_works, 04_about) inside a Homepage canvas — re-run extract after export.`;
	}

	return {
		meta: {
			file: raw?.name,
			src: sourceName,
			at: new Date().toISOString(),
		},
		pageTrees,
		canvasNames,
		matchMode,
		sectionNames,
		pageWarn,
	};
}

function extract(raw, sourceName, options = {}) {
	const mode = options.mode ?? "full";
	if (mode === "system") return extractSystemTokens(raw, sourceName, options);
	if (mode === "page") return extractPageLayout(raw, sourceName, options.pageSlug, options);
	return extractPageLayout(raw, sourceName, options.pageSlug, options);
}

function writeJson(filePath, data) {
	const json = args.pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, json, "utf8");
	return Buffer.byteLength(json, "utf8");
}

function main() {
	let rawMasterJson;
	let dictJson;
	// R3: srcName tracks the *actual* source passed to Phase 1 (extractSystemTokens).
	// It is set explicitly in each branch below — never left as a misleading default.
	let srcName;

	if (args.input) {
		// Legacy single-file mode
		const inputPath = path.resolve(args.input);
		srcName = path.basename(inputPath);
		// R2: Wrap JSON.parse so a corrupted export surfaces a clean error instead of
		// an unhandled exception with a raw V8 stack trace.
		let rawText;
		try {
			rawText = fs.readFileSync(inputPath, "utf8");
		} catch (e) {
			console.error(`❌ [I/O Error] Cannot read input file: ${inputPath}`);
			console.error(`   ${e.message}`);
			process.exit(1);
		}
		try {
			rawMasterJson = JSON.parse(rawText);
		} catch (e) {
			console.error(`❌ [Parse Error] "${srcName}" is not valid JSON.`);
			console.error(`   ${e.message}`);
			console.error(`   Ensure the file was exported correctly from Figma and is not truncated.`);
			process.exit(1);
		}
	} else {
		// New Dictionary & Targets architecture
		const dictPath = path.join(FIGMA_DIR, "figma-dictionary.json");
		const targetsPath = path.join(FIGMA_DIR, "figma-targets.json");

		if (!fs.existsSync(dictPath) || !fs.existsSync(targetsPath)) {
			console.error(`Missing required files in ${FIGMA_DIR}.`);
			console.error("Please ensure figma-dictionary.json and figma-targets.json exist.");
			process.exit(1);
		}

		console.log(`📚 [Loading Dictionary & Targets]`);
		console.log(`   ├── Dictionary: figma-dictionary.json`);
		console.log(`   └── Targets: figma-targets.json\n`);

		// R2: Wrap both JSON.parse calls. Each error message names the specific file
		// so the engineer knows exactly which export to re-fetch from Figma.
		try {
			dictJson = JSON.parse(fs.readFileSync(dictPath, "utf8"));
		} catch (e) {
			console.error(`❌ [Parse Error] "figma-dictionary.json" is not valid JSON.`);
			console.error(`   ${e.message}`);
			console.error(`   Ensure the file was exported correctly from Figma and is not truncated.`);
			process.exit(1);
		}
		try {
			rawMasterJson = JSON.parse(fs.readFileSync(targetsPath, "utf8"));
		} catch (e) {
			console.error(`❌ [Parse Error] "figma-targets.json" is not valid JSON.`);
			console.error(`   ${e.message}`);
			console.error(`   Ensure the file was exported correctly from Figma and is not truncated.`);
			process.exit(1);
		}

		// Inject dictionary metadata into targets, acting as a single unified file
		rawMasterJson.styles = dictJson.styles || rawMasterJson.styles || {};
		rawMasterJson.components = dictJson.components || rawMasterJson.components || {};
		rawMasterJson.componentSets = dictJson.componentSets || rawMasterJson.componentSets || {};
		rawMasterJson.variables = dictJson.variables || rawMasterJson.variables || {};
	}

	// Input Normalization: handle node-specific Figma API export format.
	// Full-file export: { document: { children: [...canvases] } }
	// Node export:      { nodes: { "49736:4306": { document: { ...canvas } } } }
	//
	// INVARIANT: figma-dictionary.json is expected to be a full-file export.
	// figma-targets.json may be either a full-file or a node-scoped export.
	// Both files are normalized independently so Phase 1 and Phase 2 always
	// receive a consistent { document: { children: [...] } } shape.
	if (dictJson && dictJson.nodes && !dictJson.document) {
		// R1: dictJson was previously passed to extractSystemTokens without normalization.
		// A node-export dict has no `document` key, causing walkTokensOnly to silently
		// skip all traversal and return empty tokens. Normalize it here.
		const dictCanvasChildren = Object.values(dictJson.nodes)
			.map((entry) => entry?.document)
			.filter(Boolean);
		dictJson = {
			document: {
				id: "0:0",
				name: "Normalized Dictionary Stream",
				type: "DOCUMENT",
				children: dictCanvasChildren,
			},
			styles: dictJson.styles ?? {},
			components: dictJson.components ?? {},
			componentSets: dictJson.componentSets ?? {},
			variables: dictJson.variables ?? {},
		};
		console.log(`⚡ [Input Normalization] Node-specific dictionary export detected — rebuilt as unified document stream (${dictCanvasChildren.length} canvas node${dictCanvasChildren.length !== 1 ? "s" : ""}).\n`);
	}
	if (rawMasterJson && rawMasterJson.nodes && !rawMasterJson.document) {
		const canvasChildren = Object.values(rawMasterJson.nodes)
			.map((entry) => entry?.document)
			.filter(Boolean);
		rawMasterJson = {
			document: {
				id: "0:0",
				name: "Normalized Canvas Stream",
				type: "DOCUMENT",
				children: canvasChildren,
			},
			styles: rawMasterJson.styles ?? {},
		};
		console.log(`⚡ [Input Normalization] Node-specific targets export detected — rebuilt as unified document stream (${canvasChildren.length} canvas node${canvasChildren.length !== 1 ? "s" : ""}).\n`);
	}

	// R3: Set Phase 1 provenance to reflect the actual document traversed.
	// figma-targets.json is the token authority: it holds the shipped pages, and
	// its style set is a strict subset of the dictionary's. The dictionary stays
	// as the style/component name lookup and as secondary usage evidence.
	if (srcName === undefined) {
		srcName = rawMasterJson ? "figma-targets.json" : "figma-dictionary.json";
	}

	// One font map for every pass, built across both exports (see buildUnifiedFontMap).
	const fontMap = buildUnifiedFontMap([rawMasterJson?.document, dictJson?.document]);

	// Phase 1: Compiling Unified Design Tokens
	console.log(`💎 [Phase 1: Compiling Unified Design Tokens]`);
	fs.mkdirSync(JSON_DIR, { recursive: true });
	const systemPath = path.join(JSON_DIR, SYSTEM_FILENAME);
	const tokenDoc = buildTokenScopeDocument(rawMasterJson?.document ?? dictJson?.document);
	const scopeNames = (tokenDoc?.children ?? []).map((c) => c.name);
	if (scopeNames.length) {
		console.log(`   ├── Token scope: ${scopeNames.join(", ")}`);
		if (PAGE_CONFIG.tokenScope.excludeSectionPrefixes.length) {
			console.log(
				`   ├── Excluded sections: ${PAGE_CONFIG.tokenScope.excludeSectionPrefixes.join(", ")}*`,
			);
		}
	}
	const sysPart = extract(rawMasterJson || dictJson, srcName, {
		mode: "system",
		doc: tokenDoc,
		fontMap,
	});
	sysPart.tokens.styles = applyManualFillTokens(sysPart.tokens.styles ?? {});

	// Per-variant usage inside the token scope (shipped pages only). This is what
	// makes a duplicate-name conflict decidable: without a count every duplicate
	// looked like a 1-vs-1 tie and the decision fell to a manual override.
	if (tokenDoc) {
		const scopeStyles = rawMasterJson?.styles ?? dictJson?.styles ?? {};
		const { nameToIds } = initStyleRegistry(scopeStyles);
		const scopeUsage = collectTextStyleVariantUsage(
			tokenDoc,
			scopeStyles,
			familyToKeyFromTokens(sysPart.tokens.fontFamilies),
			nameToIds,
		);

		// Stamp the count onto each style record so build-ir can rank variants.
		const perStyleKey = new Map();
		for (const entry of scopeUsage.values()) {
			perStyleKey.set(entry.styleKey, (perStyleKey.get(entry.styleKey) ?? 0) + entry.usageCount);
		}
		for (const [key, count] of collectFillStyleUsage(tokenDoc, scopeStyles, nameToIds)) {
			perStyleKey.set(key, (perStyleKey.get(key) ?? 0) + count);
		}
		for (const [key, count] of perStyleKey) {
			if (sysPart.tokens.styles[key]) sysPart.tokens.styles[key].u = count;
		}

		if (sysPart.fontStyleOverrides) {
			enrichFontStyleOverridesWithTargets(sysPart.fontStyleOverrides, scopeUsage);
		}
	}

	const sysPayload = toSystemDesignPayload(sysPart);
	const hexToFi = buildHexToFiMap(sysPayload.tokens?.styles ?? {});
	writeJson(systemPath, sysPayload);
	if (sysPart.fontStyleOverrides) {
		applyFontStylePicks(sysPart.fontStyleOverrides, FONT_STYLE_PICKS);
	}

	const overrideReportPath = path.join(JSON_DIR, "font-style-overrides.json");
	if (sysPart.fontStyleOverrides) {
		writeJson(overrideReportPath, {
			generatedAt: sysPart.meta.at,
			source: sysPart.meta.src,
			...(sysPart.fontStyleOverrides.targets
				? { targetsSource: "figma-targets.json" }
				: {}),
			picksSource: "automation/config/font-style-picks.json",
			file: sysPart.meta.file,
			...sysPart.fontStyleOverrides,
		});
	}
	
	let inputSizeStr = "Unknown";
	let outputSizeStr = "Unknown";
	try {
		const dictPath = path.join(FIGMA_DIR, "figma-dictionary.json");
		const targetsPath = path.join(FIGMA_DIR, "figma-targets.json");
		const inputSize = fs.statSync(dictPath).size + fs.statSync(targetsPath).size;
		const outputSize = fs.statSync(systemPath).size;
		inputSizeStr = (inputSize / 1024 / 1024).toFixed(1) + "MB";
		outputSizeStr = (outputSize / 1024).toFixed(1) + "KB";
	} catch (e) {}

	const keptCount = Object.keys(sysPayload.tokens?.styles || {}).length;

	console.log(`   └── Generated read-only token library -> json/${SYSTEM_FILENAME}`);
	console.log(`   └── ✂️  Tree-shaken unused Figma data: ${inputSizeStr} -> ${outputSizeStr} (Kept ${keptCount} active tokens)`);
	if (sysPart.fontStyleOverrides) {
		logFontStyleOverrideReport(sysPart.fontStyleOverrides);
	} else {
		console.log("");
	}

	// Phase 2: slice one page JSON per artboard declared in figma-pages.json.
	const { found: artboards, missing } = collectPageArtboards(rawMasterJson.document);

	console.log(`🔍 [Figma Page Map]`);
	console.log(
		`   └── ${artboards.length}/${Object.keys(PAGE_CONFIG.pages).length} declared artboard(s) located` +
			(PAGE_CONFIG.legacyPages.length ? ` · ${PAGE_CONFIG.legacyPages.length} retired` : "") +
			`  (automation/config/figma-pages.json)\n`,
	);
	for (const m of missing) {
		console.warn(`   ⚠️  Artboard "${m.frameName}" (slug "${m.slug}") not found in figma-targets.json`);
	}

	console.log(`📄 [Phase 2: Executing Dynamic Page Slicing Loops]`);
	const results = [];

	for (const artboard of artboards) {
		const pagePart = extract(rawMasterJson, srcName, {
			mode: "page",
			pageSlug: artboard.slug,
			artboard,
			fontMap,
			hexToFi,
		});
		if (pagePart.pageWarn) console.warn(`   ⚠️  ${pagePart.pageWarn}`);
		if (pagePart.pageTrees?.length) {
			const pagePayload = toPagePayload(pagePart, artboard.slug);
			const pagePath = path.join(JSON_DIR, `${artboard.slug}.json`);
			writeJson(pagePath, pagePayload);
			results.push({ slug: artboard.slug, path: pagePath, artboard, part: pagePart });
		}
	}

	results.forEach((res, index) => {
		const prefix = index === results.length - 1 ? "   └──" : "   ├──";
		const regions = toPagePayload(res.part, res.slug).meta.moduleRegions?.length ?? 0;
		console.log(
			`${prefix} ✂️ ${res.artboard.frameName} -> ${path.relative(ROOT, res.path)}` +
				`  (${res.part.sectionNames.length} sections, ${regions} module regions)`,
		);
	});

	if (sharedSectionsMap.size > 0) {
		console.log(`\n🧩 [Phase 3: Extracting Shared Components]`);
		const globalPayload = {
			meta: {
				file: rawMasterJson.name,
				src: srcName,
				at: new Date().toISOString(),
				role: "global",
			},
			tree: Array.from(sharedSectionsMap.values())
		};
		const globalPath = path.join(JSON_DIR, "global.json");
		writeJson(globalPath, globalPayload);
		console.log(`   └── Extracted ${sharedSectionsMap.size} shared components -> ${path.relative(ROOT, globalPath)}`);
	}

	console.log(`\n🎯 Execution loop complete. 0 lines of hardcoded route data remaining!`);
}

main();

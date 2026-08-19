#!/usr/bin/env node
/**
 * build-ir.mjs — DesignTokenIR ingest (Week 3 keystone).
 *
 * Lifts the current legacy sources into a single canonical NormalizedTokenSet:
 *   json/system-design.json                     → colors, gradients, fonts, typography,
 *                                                  spacing, radii, effects
 *   automation/contract/typography-contract.json→ contract entries (owner: human, locked):
 *                                                  html tag + cssClass semantics + serif metrics.
 *                                                  This is the sole hand-authored contract source;
 *                                                  the legacy json/typography-contract.json (written
 *                                                  at require-time by tailwind-design-system.js) has
 *                                                  been retired — it was a strict subset of this file.
 *
 *   automation/config/font-style-picks.json      → user-chosen metrics when duplicate
 *                                                  Figma style IDs share a name (Body/Body-1#…)
 *
 * Design rules enforced here (see automation/ir/schema/designtoken-ir.v1.schema.json):
 *   - Identity is a stable semantic TokenId; Figma node ids move into provenance.
 *   - Only design FACTS are stored; Tailwind naming (lhClass/lsClass/cssClass) is dropped.
 *   - html/cssClass semantics live in a separate Contract overlay, never on the token.
 *   - References (typography→color, typography→font) are typed, symbolic Refs.
 *   - Output is deterministic: per-entity timestamps are excluded; a content fingerprint
 *     over the payload (minus meta.fingerprint) gates CI.
 *
 * Usage:
 *   node automation/scripts/build-ir.mjs            # build → tokens/normalized.json
 *   node automation/scripts/build-ir.mjs --check    # verify committed file is up to date (CI)
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { readJson, seg, stableStringify, fingerprintOf, validateSchema } from "../ir/lib/ir-utils.mjs";

const ROOT = process.cwd();
const SYSTEM_PATH = path.join(ROOT, "json/system-design.json");
const CONTRACT_CURATED = path.join(ROOT, "automation/contract/typography-contract.json");
const FONT_STYLE_PICKS_PATH = path.join(ROOT, "automation/config/font-style-picks.json");
const SCHEMA_PATH = path.join(ROOT, "automation/ir/schema/designtoken-ir.v1.schema.json");
const OUT_PATH = path.join(ROOT, "tokens/normalized.json");

const argv = process.argv.slice(2);
const CHECK_ONLY = argv.includes("--check");

const BUNDLE_VERSION = "1.0.0";

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

/** Strip Figma node-id suffix: "Primary/1#12006:1619" → "Primary/1". */
const baseOf = (key) => String(key).split("#")[0];
/** Extract Figma style/node id if present: "...#12006:1619" → "12006:1619". */
const styleIdOf = (key) => (String(key).includes("#") ? String(key).split("#")[1] : undefined);

/** Body/Body-1 → body-1 (matches extract.mjs / font-style-picks keys). */
function styleBaseToCssClass(baseName) {
	const nameMatch = String(baseName).match(/\/([^/#]+)/);
	const rawName = nameMatch ? nameMatch[1] : baseName;
	return String(rawName)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-$/g, "");
}

/**
 * User-chosen canonical styleKey per conflicting typography class.
 * Same file as extract.mjs: automation/config/font-style-picks.json
 */
function loadFontStylePicks() {
	try {
		const raw = JSON.parse(fs.readFileSync(FONT_STYLE_PICKS_PATH, "utf8"));
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

/** Match a pick (full key, base#id, or bare id) to a style entry in system-design. */
function resolvePickedStyle(baseKey, keys, styles, picks) {
	const cssClass = styleBaseToCssClass(baseKey);
	const raw = picks[baseKey] ?? picks[cssClass];
	if (!raw) return null;

	const want = String(raw).trim();
	const wantId = want.includes("#") ? want.slice(want.indexOf("#") + 1) : want;

	let matchedKey = null;
	if (styles[want] && baseOf(want) === baseKey) matchedKey = want;
	else {
		for (const k of keys) {
			if (k === want || styleIdOf(k) === wantId) {
				matchedKey = k;
				break;
			}
		}
	}
	if (!matchedKey || !styles[matchedKey]) {
		return { error: `pick '${want}' not found among keys for '${baseKey}'` };
	}
	return { key: matchedKey, val: styles[matchedKey] };
}

/** Build a TokenId from a prefix + Figma path key. */
function idFrom(prefix, baseKey) {
	const parts = String(baseKey).split("/");
	const group = seg(parts[0]) || "unknown";
	const rest = seg(parts.slice(1).join("-"));
	return rest ? `${prefix}.${group}.${rest}` : `${prefix}.${group}`;
}
const colorId = (baseKey) => idFrom("color", baseKey);
const typographyId = (baseKey) => idFrom("type", baseKey);

const groupOf = (baseKey) => seg(String(baseKey).split("/")[0]) || "unknown";
const scaleOf = (baseKey) => seg(String(baseKey).split("/").slice(1).join("-")) || undefined;

const ref = (kind, id) => ({ $ref: id, kind, resolved: false });

/* ----------------------------------------------------------------------------
 * Font role inference
 * ------------------------------------------------------------------------- */
function fontRole(fontToken, family) {
	if (/^icon/i.test(fontToken)) return "icon";
	if (/^display/i.test(fontToken)) return "display";
	if (/^serif/i.test(fontToken)) return "serif";
	if (/^mono/i.test(fontToken)) return "mono";
	if (/(script|signature|pinyon)/i.test(family || "")) return "cursive";
	return "sans";
}

/* Handwritten families used by the project but absent from the Figma font map.
 * Seeded so contract-only refs (e.g. serif headings) resolve; mirror of the
 * fontFamily block in tailwind.config.js. */
const MANUAL_FONTS = {
	serif: { family: "Cormorant Garamond", fallbacks: ["Georgia", "serif"], role: "serif" },
};

/* Semantic roles that legacy code hardcoded across tailwind-design-system.js /
 * tailwind.config.js. Declared once here as aliases into concrete colors. */
const SEMANTIC_SEEDS = [
	{ role: "danger", figma: "Utility/Error-1" },
	{ role: "success", figma: "Utility/Correct-1" },
	{ role: "text-main", figma: "Utility/gray-950-maintext" },
	{ role: "surface", figma: "Utility/white" },
	{ role: "ink", figma: "Black" },
];

/* ----------------------------------------------------------------------------
 * Build
 * ------------------------------------------------------------------------- */
function build() {
	const system = readJson(SYSTEM_PATH);
	const curated = readJson(CONTRACT_CURATED, true);
	const fontStylePicks = loadFontStylePicks();

	const source = `figma:${system?.meta?.file ?? "unknown"}`;
	const extractedAt = system?.meta?.at ?? "unknown";
	const styles = system?.tokens?.styles ?? {};
	const fontFamilies = system?.tokens?.fontFamilies ?? {};
	const spacingArrays = system?.tokens?.spacing ?? {};

	const diagnostics = [];
	const diag = (code, severity, detail, extra = {}) =>
		diagnostics.push({ code, severity, detail, ...extra });

	const colors = {};
	const gradients = {};
	const fonts = {};
	const typography = {};
	const semantics = {};
	const spacing = {};
	const radii = {};
	const effects = {};
	const components = {};

	/* --- Fonts (from the clean Figma family map) --------------------------- */
	for (const [token, family] of Object.entries(fontFamilies)) {
		const id = `font.${seg(token)}`;
		fonts[id] = {
			id,
			kind: "font-family",
			family,
			fallbacks: fontRole(token, family) === "sans" ? ["sans-serif"] : [],
			role: fontRole(token, family),
			provenance: { source },
		};
	}
	for (const [token, def] of Object.entries(MANUAL_FONTS)) {
		const id = `font.${seg(token)}`;
		if (fonts[id]) continue;
		fonts[id] = {
			id,
			kind: "font-family",
			family: def.family,
			fallbacks: def.fallbacks,
			role: def.role,
			provenance: { source: "manual:seed", manual: true },
		};
	}

	/* --- First pass: group FILL + TEXT by stable identity ------------------ */
	const fillGroups = new Map(); // baseKey → { hexes: Map<hex,count>, keys:[], manual, gradientSpecs:Set, emptyCount }
	const textGroups = new Map(); // baseKey → { variants: Map<sig,{val,count}>, keys:[], emptyCount }

	for (const [key, val] of Object.entries(styles)) {
		const t = val?.t;
		const bk = baseOf(key);
		if (t === "FILL") {
			const g =
				fillGroups.get(bk) ??
				{ hexes: new Map(), keys: [], manual: false, gradientSpecs: new Set(), empty: 0 };
			g.keys.push(key);
			if (val.manual) g.manual = true;
			if (typeof val.color === "string" && val.color.startsWith("#")) {
				// See the TEXT branch below: weight by node usage, not style-id count.
				g.hexes.set(val.color, (g.hexes.get(val.color) ?? 0) + (val.u ?? 1));
			} else if (typeof val.color === "string" && val.color.startsWith("gradient:")) {
				g.gradientSpecs.add(val.color);
			} else {
				g.empty += 1;
			}
			fillGroups.set(bk, g);
		} else if (t === "TEXT") {
			const g = textGroups.get(bk) ?? { variants: new Map(), keys: [], empty: 0 };
			g.keys.push(key);
			if (val.fontSize == null) {
				g.empty += 1;
			} else {
				const sig = `${val.fontSize}|${val.fontWeight}|${val.lineHeight}|${val.letterSpacing ?? 0}|${val.font}|${val.fill ?? ""}`;
				const rec = g.variants.get(sig) ?? { val, count: 0 };
				// Weight by real node usage (`u` from extract), not by how many style
				// ids happen to carry the name — counting keys made every duplicate
				// name a 1-vs-1 tie and pushed the decision onto a manual override.
				rec.count += val.u ?? 1;
				g.variants.set(sig, rec);
			}
			textGroups.set(bk, g);
		} else if (t === "EFFECT") {
			const id = `effect.${seg(bk)}`;
			if (!effects[id]) {
				const name = bk.toLowerCase();
				let type = "unknown";
				if (name.includes("background blur") || name.includes("layer blur")) type = "background-blur";
				else if (name.includes("blur")) type = "background-blur";
				else if (name.includes("shadow")) type = "drop-shadow";
				effects[id] = { id, kind: "effect", type, provenance: { source, figmaKey: bk } };
				if (val.color == null && val.value == null) {
					effects[id].diagnostics = [
						{ code: "UNRESOLVED_EFFECT", severity: "info", detail: "Figma export carries no effect value", subject: id },
					];
				}
			}
		}
	}

	/* --- Colors + gradients from grouped FILLs ----------------------------- */
	for (const [bk, g] of fillGroups) {
		// Gradients (explicit gradient:linear:N specs)
		for (const spec of g.gradientSpecs) {
			const parts = spec.split(":"); // ["gradient","linear","2"]
			const type = parts[1] ?? "unknown";
			const idx = parts[2] ?? seg(bk);
			const id = `gradient.${seg(type)}.${seg(idx)}`;
			if (!gradients[id]) {
				gradients[id] = {
					id,
					kind: "gradient",
					type: ["linear", "radial"].includes(type) ? type : "unknown",
					stops: [],
					provenance: { source, figmaKey: g.keys[0] },
					diagnostics: [
						{ code: "UNRESOLVED_GRADIENT", severity: "info", detail: `Figma exposes only the identifier '${spec}', no stop data`, subject: id },
					],
				};
			}
		}

		if (g.hexes.size === 0) {
			// No usable hex. Gradient-group with no spec, or a truly empty FILL.
			if (g.gradientSpecs.size === 0) {
				if (groupOf(bk) === "gradient") {
					const id = `gradient.${seg(bk).replace(/^gradient-?/, "") || "x"}`;
					if (!gradients[id]) {
						gradients[id] = {
							id,
							kind: "gradient",
							type: "unknown",
							stops: [],
							provenance: { source, figmaKey: g.keys[0] },
							diagnostics: [{ code: "UNRESOLVED_GRADIENT", severity: "info", detail: "Gradient FILL with no color data", subject: id }],
						};
					}
				} else {
					diag("EMPTY_TOKEN", "info", `FILL '${bk}' has no color value; skipped`, { subject: bk });
				}
			}
			continue;
		}

		// Pick winner hex deterministically (count desc, then hex asc).
		const ranked = [...g.hexes.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
		const winner = ranked[0][0];
		const id = colorId(bk);
		const instances = g.keys.length;
		const token = {
			id,
			kind: "color",
			value: winner,
			group: groupOf(bk),
			provenance: { source, figmaKey: g.keys[0], instances },
		};
		const sc = scaleOf(bk);
		if (sc) token.scale = sc;
		if (g.manual) token.provenance.manual = true;
		const sid = styleIdOf(g.keys[0]);
		if (sid) token.provenance.figmaStyleId = sid;
		if (ranked.length > 1) {
			token.diagnostics = [
				{
					code: "NAME_COLLISION",
					severity: "warn",
					detail: `identity '${bk}' exports ${ranked.length} distinct hex values; kept most frequent ${winner}`,
					subject: id,
					competingIds: ranked.map(([hex, c]) => `${hex}×${c}`),
				},
			];
		}
		if (colors[id]) {
			diag("NAME_COLLISION", "warn", `two Figma keys map to id '${id}'`, { subject: id });
		}
		colors[id] = token;
	}

	/* --- Cross-identity duplicate-hex report (info) ------------------------ */
	const byHex = new Map();
	for (const c of Object.values(colors)) {
		const arr = byHex.get(c.value) ?? [];
		arr.push(c.id);
		byHex.set(c.value, arr);
	}
	for (const [hex, ids] of byHex) {
		if (ids.length > 2) {
			diag("DUPLICATE_HEX", "info", `${ids.length} color tokens share ${hex}`, { competingIds: ids.sort() });
		}
	}

	/* --- Typography from grouped TEXTs ------------------------------------ */
	for (const [bk, g] of textGroups) {
		if (g.variants.size === 0) {
			diag("EMPTY_TOKEN", "info", `TEXT '${bk}' has no metrics; skipped`, { subject: bk });
			continue;
		}
		// User pick (font-style-picks.json) wins; else most-frequent metrics.
		const variants = [...g.variants.values()].sort((a, b) => b.count - a.count);
		const picked = resolvePickedStyle(bk, g.keys, styles, fontStylePicks);
		let val = variants[0].val;
		let figmaKey = g.keys[0];
		let userPick = false;
		if (picked?.error) {
			diag("INVALID_FONT_STYLE_PICK", "warn", picked.error, { subject: typographyId(bk) });
		} else if (picked?.val) {
			val = picked.val;
			figmaKey = picked.key;
			userPick = true;
		}
		const id = typographyId(bk);
		const fontRefId = `font.${seg(val.font ?? "sans")}`;
		const token = {
			id,
			kind: "typography",
			metrics: {
				fontSize: val.fontSize,
				fontWeight: val.fontWeight ?? 400,
				lineHeight: val.lineHeight ?? 1.4,
				letterSpacing: val.letterSpacing ?? 0,
			},
			fontFamily: ref("font-family", fontRefId),
			provenance: {
				source,
				figmaKey,
				instances: g.keys.length,
				...(userPick ? { userPick: true } : {}),
			},
		};
		if (bk.startsWith("Local/")) token.synthetic = true;
		const tdiags = [];
		if (!fonts[fontRefId]) {
			tdiags.push({ code: "UNMAPPED_FONT", severity: "warn", detail: `font '${val.font}' not in family map`, subject: id });
		}
		if (val.fill) {
			const fillBase = baseOf(val.fill);
			const cid = colorId(fillBase);
			token.defaultColor = ref("color", cid);
			if (!colors[cid]) {
				tdiags.push({ code: "ORPHAN_ALIAS", severity: "info", detail: `defaultColor → '${cid}' not resolvable as a color token`, subject: id });
			}
		}
		if (val.traitConflict) {
			tdiags.push({ code: "TRAIT_CONFLICT", severity: "info", detail: "Figma marked this style with conflicting traits across instances", subject: id });
		}
		if (userPick && variants.length > 1) {
			tdiags.push({
				code: "USER_PICK_APPLIED",
				severity: "info",
				detail: `identity '${bk}' uses font-style-picks → ${figmaKey}`,
				subject: id,
				competingIds: variants.map((v) => `${v.val.fontSize}/${v.val.fontWeight}/${v.val.lineHeight}/${v.val.font}×${v.count}`),
			});
		} else if (variants.length > 1) {
			tdiags.push({
				code: "NAME_COLLISION",
				severity: "warn",
				detail: `identity '${bk}' has ${variants.length} metric variants; kept most frequent (set automation/config/font-style-picks.json to choose)`,
				subject: id,
				competingIds: variants.map((v) => `${v.val.fontSize}/${v.val.fontWeight}/${v.val.lineHeight}/${v.val.font}×${v.count}`),
			});
		}
		if (tdiags.length) token.diagnostics = tdiags;
		typography[id] = token;
	}

	/* --- Spacing + radii -------------------------------------------------- */
	const addScale = (bucket, kind, role, values) => {
		for (const v of values ?? []) {
			const segVal = v < 0 ? `n${Math.abs(v)}` : String(v);
			const id = `${kind === "radius" ? "radius" : "spacing"}.${role}.${seg(segVal)}`;
			if (bucket[id]) continue;
			bucket[id] = { id, kind, role, value: v, provenance: { source } };
		}
	};
	addScale(spacing, "spacing", "pad", spacingArrays.pad);
	addScale(spacing, "spacing", "gap", spacingArrays.gap);
	addScale(radii, "radius", "radius", spacingArrays.radius);

	/* --- Semantic colors (declared aliases) ------------------------------- */
	for (const s of SEMANTIC_SEEDS) {
		const cid = colorId(s.figma);
		const id = `semantic.${seg(s.role)}`;
		if (!colors[cid]) {
			diag("ORPHAN_ALIAS", "warn", `semantic '${s.role}' → '${cid}' has no backing color`, { subject: id });
			continue;
		}
		semantics[id] = {
			id,
			kind: "semantic",
			role: s.role,
			references: ref("color", cid),
			provenance: { source: "manual:seed", manual: true },
		};
	}

	/* --- Contract overlay (curated wins over generated) ------------------- */
	const contractEntries = {};
	// `sansN` aliases are positions in a usage-ranked family list, so they shift
	// whenever the Figma export changes. Contract entries therefore pin `family`
	// (a stable string) and we look the current alias up from that.
	const familyToFontId = new Map(
		Object.entries(fonts).map(([id, f]) => [String(f.family).toLowerCase(), id]),
	);
	const contractFontId = (entry) => {
		const byFamily = entry.family && familyToFontId.get(String(entry.family).toLowerCase());
		if (byFamily) return byFamily;
		return `font.${seg(entry.font ?? "serif")}`;
	};

	const ingestContract = (contract, owner) => {
		if (!contract?.typography) return;
		for (const [key, entry] of Object.entries(contract.typography)) {
			if (!entry?.cssClass || !entry?.html) continue;
			const tid = typographyId(key);
			contractEntries[key] = {
				typography: ref("typography", tid),
				cssClass: entry.cssClass,
				html: entry.html,
				owner,
				...(owner === "human" ? { locked: true } : {}),
			};
			// Synthesize a typography token for curated, contract-only styles that
			// carry metrics but never appeared as a Figma TEXT style (e.g. serif headings).
			if (owner === "human" && !typography[tid] && entry.fontSize != null) {
				const fontRefId = contractFontId(entry);
				typography[tid] = {
					id: tid,
					kind: "typography",
					metrics: {
						fontSize: entry.fontSize,
						fontWeight: entry.fontWeight ?? 400,
						lineHeight: entry.lineHeight ?? 1.4,
						letterSpacing: 0,
					},
					fontFamily: ref("font-family", fontRefId),
					provenance: { source: "contract:curated" },
					...(fonts[fontRefId] ? {} : { diagnostics: [{ code: "UNMAPPED_FONT", severity: "warn", detail: `font '${entry.font}' not in family map`, subject: tid }] }),
				};
			}
		}
	};
	// Curated contract is the sole hand-authored source (owner human, locked).
	ingestContract(curated, "human");

	// Flag contract entries whose typography token is still missing.
	for (const [key, ce] of Object.entries(contractEntries)) {
		if (!typography[ce.typography.$ref]) {
			diag("ORPHAN_ALIAS", "info", `contract '${key}' → '${ce.typography.$ref}' has no typography token`, { subject: ce.typography.$ref });
		}
	}

	const contractVersion = curated?.version ?? "1.0.0";

	/* --- Assemble --------------------------------------------------------- */
	const set = {
		$schema: "designtoken-ir/v1",
		meta: {
			source,
			extractedAt,
			schemaVersion: "v1",
			bundleVersion: BUNDLE_VERSION,
			contractVersion: String(contractVersion),
		},
		colors,
		gradients,
		fonts,
		typography,
		semantics,
		spacing,
		radii,
		effects,
		components,
		contract: { id: "contract", version: String(contractVersion), entries: contractEntries },
		diagnostics,
	};

	// Deterministic fingerprint over payload minus meta.fingerprint.
	set.meta.fingerprint = fingerprintOf(set);

	return set;
}

/* ----------------------------------------------------------------------------
 * Main
 * ------------------------------------------------------------------------- */
function summarize(set) {
	const counts = {
		colors: Object.keys(set.colors).length,
		gradients: Object.keys(set.gradients).length,
		fonts: Object.keys(set.fonts).length,
		typography: Object.keys(set.typography).length,
		semantics: Object.keys(set.semantics).length,
		spacing: Object.keys(set.spacing).length,
		radii: Object.keys(set.radii).length,
		effects: Object.keys(set.effects).length,
		contract: Object.keys(set.contract.entries).length,
	};
	const bySeverity = set.diagnostics.reduce((m, d) => ((m[d.severity] = (m[d.severity] ?? 0) + 1), m), {});
	return { counts, bySeverity };
}

function main() {
	const set = build();
	const schema = readJson(SCHEMA_PATH);
	const errors = validateSchema(set, schema);

	const { counts, bySeverity } = summarize(set);
	console.log("🎨 DesignTokenIR build");
	console.log(`   source        ${set.meta.source} @ ${set.meta.extractedAt}`);
	console.log(`   entities      ` + Object.entries(counts).map(([k, v]) => `${k}:${v}`).join("  "));
	console.log(`   diagnostics   ` + (Object.entries(bySeverity).map(([k, v]) => `${k}:${v}`).join("  ") || "none"));
	console.log(`   fingerprint   ${set.meta.fingerprint}`);

	if (errors.length) {
		console.error(`\n❌ Schema validation failed (${errors.length}):`);
		for (const e of errors.slice(0, 40)) console.error(`   - ${e}`);
		if (errors.length > 40) console.error(`   … ${errors.length - 40} more`);
		process.exit(1);
	}
	console.log("   ✅ valid against designtoken-ir/v1");

	const nextText = stableStringify(set) + "\n";

	if (CHECK_ONLY) {
		const prev = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, "utf8") : "";
		if (prev !== nextText) {
			console.error(`\n❌ ${path.relative(ROOT, OUT_PATH)} is stale. Run: npm run ir:build`);
			process.exit(1);
		}
		console.log(`   ✅ ${path.relative(ROOT, OUT_PATH)} up to date`);
		return;
	}

	fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
	fs.writeFileSync(OUT_PATH, nextText, "utf8");
	console.log(`   └── wrote ${path.relative(ROOT, OUT_PATH)}`);
}

main();

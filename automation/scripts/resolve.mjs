#!/usr/bin/env node
/**
 * resolve.mjs — DesignTokenIR resolver.
 *
 * Pure transformation:  tokens/normalized.json  →  tokens/resolved.<theme>.json
 *
 *   - Flattens every symbolic Ref<T> to a concrete value
 *       typography.fontFamily → { family, stack, role }
 *       typography.defaultColor → hex
 *       semantic.references → hex
 *   - Merges the human-authored Contract overlay (html + cssClass + owner) onto
 *     the matching TypographyToken metrics.
 *   - Applies the Resolution Policy to dirty Figma data (see below).
 *   - Deterministic: no timestamps beyond the inherited extractedAt, output keys
 *     sorted, content fingerprint embedded. No side effects on source files.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RESOLUTION POLICY (tiered — severity depends on how ambiguous the data is)
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Manual override (tokens/overrides.json) — ALWAYS wins. Clears the
 *      collision, logged as OVERRIDE_APPLIED (info). This is the sanctioned way
 *      to resolve dirty data without editing Figma or guessing.
 *   2. Harmless collision — competing variants collapse to ONE real value
 *      (e.g. duplicates that differ only by a non-token field like `fill`).
 *      → COLLISION_HARMLESS (info). Accept.
 *   3. Plurality collision — one value is strictly more frequent than the rest
 *      (e.g. gray-950-maintext #151515×4 vs ×1 ×1). Deterministic first-wins by
 *      frequency. → COLLISION_PLURALITY (warn). Accept.
 *   4. Tie collision — the top value has no strict majority (e.g. primary.1 with
 *      four ×1 hexes). Picking one would be an arbitrary guess.
 *        · strict  (default): → COLLISION_TIE (blocker). Build FAILS with an
 *          actionable list of ids that need an override.
 *        · lenient (--lenient): → COLLISION_TIE (warn). Accept the deterministic
 *          fallback (already chosen upstream) so local iteration isn't blocked.
 *   5. Unresolved reference (font/color/typography ref with no target) or a
 *      contract entry with no metrics:
 *        · strict → UNRESOLVED_REF / UNMAPPED_FONT (blocker)
 *        · lenient → (warn) with a safe fallback.
 *   6. TRAIT_CONFLICT — informational only; traits (align/case) are node-usage,
 *      not token facts, so they never block. → TRAIT_CONFLICT (info).
 *
 * Usage:
 *   node automation/scripts/resolve.mjs                 # strict (CI default)
 *   node automation/scripts/resolve.mjs --lenient       # downgrade blockers → warn
 *   node automation/scripts/resolve.mjs --theme base    # theme name (default base)
 *   node automation/scripts/resolve.mjs --check         # verify committed bundle fresh
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { readJson, stableStringify, fingerprintOf, validateSchema } from "../ir/lib/ir-utils.mjs";

const ROOT = process.cwd();
const NORMALIZED_PATH = path.join(ROOT, "tokens/normalized.json");
const OVERRIDES_PATH = path.join(ROOT, "tokens/overrides.json");
const SCHEMA_PATH = path.join(ROOT, "automation/ir/schema/resolved-bundle.v1.schema.json");

const argv = process.argv.slice(2);
const LENIENT = argv.includes("--lenient");
const CHECK_ONLY = argv.includes("--check");
const THEME = (() => {
	const i = argv.indexOf("--theme");
	return i !== -1 && argv[i + 1] ? argv[i + 1] : "base";
})();
const POLICY = LENIENT ? "lenient" : "strict";
const OUT_PATH = path.join(ROOT, `tokens/resolved.${THEME}.json`);

/* ----------------------------------------------------------------------------
 * Collision classification
 * ------------------------------------------------------------------------- */

/** Parse ["#hex×3", "18/400/1.4/sans×1"] → Map<signature, totalCount>. */
function tallyCompeting(ids) {
	const groups = new Map();
	for (const raw of ids ?? []) {
		const s = String(raw);
		const at = s.lastIndexOf("\u00d7"); // '×'
		const sig = at === -1 ? s : s.slice(0, at);
		const n = at === -1 ? 1 : parseInt(s.slice(at + 1), 10) || 1;
		groups.set(sig, (groups.get(sig) ?? 0) + n);
	}
	return groups;
}

/** Classify a NAME_COLLISION diagnostic → { kind, candidates }. */
function classifyCollision(diag) {
	const groups = tallyCompeting(diag?.competingIds);
	if (groups.size <= 1) return { kind: "harmless", candidates: [...groups.keys()] };
	const max = Math.max(...groups.values());
	const top = [...groups.entries()].filter(([, c]) => c === max);
	if (top.length === 1) return { kind: "plurality", winner: top[0][0], candidates: [...groups.keys()] };
	return { kind: "tie", candidates: [...groups.keys()] };
}

/** Find the first NAME_COLLISION diagnostic on a token, if any. */
const collisionOf = (tok) => (tok.diagnostics ?? []).find((d) => d.code === "NAME_COLLISION");
const hasTrait = (tok) => (tok.diagnostics ?? []).some((d) => d.code === "TRAIT_CONFLICT");

/* ----------------------------------------------------------------------------
 * Resolver
 * ------------------------------------------------------------------------- */
function resolve(normalized, overrides) {
	const diagnostics = [];
	const blockers = [];
	const log = (code, severity, subject, detail, extra = {}) => {
		const d = { code, severity, subject, detail, ...extra };
		if (severity === "blocker") blockers.push(d);
		diagnostics.push(d);
	};

	const ovColors = overrides?.colors ?? {};
	const ovType = overrides?.typography ?? {};

	/* --- Colors ---------------------------------------------------------- */
	const colors = {};
	for (const [id, tok] of Object.entries(normalized.colors)) {
		let value = tok.value;
		let src = "figma";

		if (id in ovColors) {
			value = ovColors[id];
			src = "override";
			log("OVERRIDE_APPLIED", "info", id, `color overridden to ${value}`, { chosen: value });
			const col = collisionOf(tok);
			if (!col || classifyCollision(col).kind !== "tie") {
				log("STALE_OVERRIDE", "warn", id, `override ${value} replaces an unambiguous Figma value ${tok.value}`, { chosen: value });
			}
		} else {
			const col = collisionOf(tok);
			if (col) {
				const c = classifyCollision(col);
				if (c.kind === "harmless") {
					log("COLLISION_HARMLESS", "info", id, "duplicate values collapse to one; accepted", { chosen: value });
				} else if (c.kind === "plurality") {
					log("COLLISION_PLURALITY", "warn", id, `kept frequency winner ${value}`, { chosen: value, candidates: c.candidates });
				} else {
					const sev = LENIENT ? "warn" : "blocker";
					log("COLLISION_TIE", sev, id, `ambiguous: ${c.candidates.length} tied values, no majority`, { chosen: value, candidates: c.candidates });
				}
			}
		}

		const out = { id, value, group: tok.group, source: src };
		if (tok.scale) out.scale = tok.scale;
		colors[id] = out;
	}

	/* --- Fonts ----------------------------------------------------------- */
	const fonts = {};
	for (const [id, tok] of Object.entries(normalized.fonts)) {
		const stack = [tok.family, ...(tok.fallbacks ?? [])].join(", ");
		fonts[id] = { id, family: tok.family, fallbacks: tok.fallbacks ?? [], stack, role: tok.role };
	}

	/* --- Semantics (references → hex) ------------------------------------ */
	const semantics = {};
	for (const [id, tok] of Object.entries(normalized.semantics)) {
		const refId = tok.references?.$ref;
		const target = colors[refId];
		if (!target) {
			const sev = LENIENT ? "warn" : "blocker";
			log("UNRESOLVED_REF", sev, id, `semantic → '${refId}' not resolvable`, { chosen: refId });
			continue;
		}
		semantics[id] = { id, role: tok.role, references: refId, value: target.value };
	}

	/* --- Gradients ------------------------------------------------------- */
	const gradients = {};
	for (const [id, tok] of Object.entries(normalized.gradients)) {
		const out = { id, type: tok.type, stops: tok.stops ?? [] };
		if (tok.angle != null) out.angle = tok.angle;
		if ((tok.stops ?? []).length === 0) {
			out.unresolved = true;
			log("UNRESOLVED_GRADIENT", "info", id, "no stop data; emitter must supply a fallback");
		}
		gradients[id] = out;
	}

	/* --- Effects --------------------------------------------------------- */
	const effects = [];
	for (const [id, tok] of Object.entries(normalized.effects)) {
		const out = { id, type: tok.type };
		if (tok.value) out.value = tok.value;
		else { out.unresolved = true; log("UNRESOLVED_EFFECT", "info", id, "no effect value in export"); }
		effects.push(out);
	}
	effects.sort((a, b) => (a.id < b.id ? -1 : 1));

	/* --- Scales ---------------------------------------------------------- */
	const toScaleArray = (bucket) =>
		Object.values(bucket)
			.map((t) => ({ id: t.id, role: t.role, value: t.value }))
			.sort((a, b) => (a.id < b.id ? -1 : 1));
	const spacing = toScaleArray(normalized.spacing);
	const radii = toScaleArray(normalized.radii);

	/* --- Overrides pointing at tokens that no longer exist ---------------- */
	for (const id of Object.keys(ovColors)) {
		if (!(id in normalized.colors)) {
			log("STALE_OVERRIDE", "warn", id, "color override targets a token absent from the export");
		}
	}
	for (const id of Object.keys(ovType)) {
		if (!(id in normalized.typography)) {
			log("STALE_OVERRIDE", "warn", id, "typography override targets a token absent from the export");
		}
	}

	/* --- Contract index (typography id → entry) -------------------------- */
	const contractByTid = new Map();
	for (const [key, entry] of Object.entries(normalized.contract?.entries ?? {})) {
		const tid = entry.typography?.$ref;
		if (!tid) continue;
		// curated (human/locked) wins over generated (default) on the same tid
		const prev = contractByTid.get(tid);
		if (!prev || (entry.owner === "human" && prev.owner !== "human")) {
			contractByTid.set(tid, { ...entry, sourceKey: key });
		}
	}

	/** Default css class from a typography id: strip the 'type.<group>.' prefix. */
	const defaultCssClass = (id) => id.replace(/^type\.[^.]+\./, "").replace(/\./g, "-");
	const defaultHtml = (id) => (/\bheading\b|\.heading/.test(id) || id.includes(".heading") ? "h4" : "div");

	/* --- Typography (metrics + refs + contract merge) -------------------- */
	const typography = [];
	for (const [id, tok] of Object.entries(normalized.typography)) {
		// Metric collision policy
		const col = collisionOf(tok);
		if (id in ovType) {
			log("OVERRIDE_APPLIED", "info", id, "typography metrics overridden");
			if (!col || classifyCollision(col).kind !== "tie") {
				const m = tok.metrics;
				log("STALE_OVERRIDE", "warn", id, `override replaces unambiguous Figma metrics ${m.fontSize}/${m.fontWeight}/${m.lineHeight}`);
			}
		} else if (col) {
			const c = classifyCollision(col);
			if (c.kind === "harmless") log("COLLISION_HARMLESS", "info", id, "metric variants identical; accepted");
			else if (c.kind === "plurality") log("COLLISION_PLURALITY", "warn", id, "kept frequency-winning metrics", { candidates: c.candidates });
			else {
				const sev = LENIENT ? "warn" : "blocker";
				log("COLLISION_TIE", sev, id, `ambiguous metrics: ${c.candidates.length} tied variants`, { candidates: c.candidates });
			}
		}
		if (hasTrait(tok)) log("TRAIT_CONFLICT", "info", id, "conflicting node traits ignored (not token facts)");

		// Metrics (override wins)
		const ov = ovType[id] ?? {};
		const metrics = {
			fontSize: ov.fontSize ?? tok.metrics.fontSize,
			fontWeight: ov.fontWeight ?? tok.metrics.fontWeight,
			lineHeight: ov.lineHeight ?? tok.metrics.lineHeight,
			letterSpacing: ov.letterSpacing ?? tok.metrics.letterSpacing,
		};

		// Font ref → concrete
		const fontId = ov.font ? `font.${ov.font}` : tok.fontFamily?.$ref;
		let font = fonts[fontId];
		if (!font) {
			const sev = LENIENT ? "warn" : "blocker";
			log("UNMAPPED_FONT", sev, id, `font '${fontId}' not resolvable`, { chosen: fontId });
			font = { id: fontId ?? "font.sans", family: "sans-serif", stack: "sans-serif", role: "sans" };
		}

		// Contract merge
		const ce = contractByTid.get(id);
		let cssClass, html, owner;
		if (ce) {
			cssClass = ce.cssClass;
			html = ce.html;
			owner = ce.owner;
		} else {
			cssClass = defaultCssClass(id);
			html = defaultHtml(id);
			owner = "default";
			log("MISSING_CONTRACT", "info", id, `no contract entry; defaulted to <${html}> .${cssClass}`);
		}

		const entry = {
			id,
			cssClass,
			html,
			owner,
			metrics,
			fontFamily: { id: font.id, family: font.family, stack: font.stack, role: font.role },
		};
		if (tok.synthetic) entry.synthetic = true;

		// defaultColor ref → hex (non-fatal if missing; typography can render without a baked color)
		const colorRef = tok.defaultColor?.$ref;
		if (colorRef) {
			const c = colors[colorRef];
			if (c) entry.color = c.value;
			else log("ORPHAN_ALIAS", "warn", id, `defaultColor → '${colorRef}' unresolved; omitted`, { chosen: colorRef });
		}

		typography.push(entry);
	}
	typography.sort((a, b) => (a.id < b.id ? -1 : 1));

	/* --- Components (resolve slot refs) ---------------------------------- */
	const components = {};
	for (const [id, tok] of Object.entries(normalized.components ?? {})) {
		const slots = {};
		for (const [slot, r] of Object.entries(tok.slots ?? {})) {
			const refId = r.$ref;
			const target = colors[refId] || semantics[refId];
			slots[slot] = target ? { ref: refId, value: target.value } : { ref: refId };
			if (!target) log("UNRESOLVED_REF", LENIENT ? "warn" : "blocker", id, `component slot '${slot}' → '${refId}' unresolved`);
		}
		components[id] = { id, slots };
	}

	/* --- Assemble -------------------------------------------------------- */
	diagnostics.sort((a, b) => (a.subject + a.code < b.subject + b.code ? -1 : 1));
	const bundle = {
		$schema: "resolved-bundle/v1",
		meta: {
			source: normalized.meta.source,
			extractedAt: normalized.meta.extractedAt,
			schemaVersion: "v1",
			bundleVersion: normalized.meta.bundleVersion,
			contractVersion: normalized.meta.contractVersion,
			theme: THEME,
			policy: POLICY,
			sourceFingerprint: normalized.meta.fingerprint ?? "unknown",
		},
		theme: THEME,
		colors,
		gradients,
		fonts,
		semantics,
		spacing,
		radii,
		effects,
		typography,
		components,
		diagnostics,
	};
	bundle.meta.fingerprint = fingerprintOf(bundle);

	return { bundle, blockers };
}

/* ----------------------------------------------------------------------------
 * Main
 * ------------------------------------------------------------------------- */
function main() {
	const normalized = readJson(NORMALIZED_PATH);
	const overrides = readJson(OVERRIDES_PATH, true);
	const { bundle, blockers } = resolve(normalized, overrides);

	const bySeverity = bundle.diagnostics.reduce((m, d) => ((m[d.severity] = (m[d.severity] ?? 0) + 1), m), {});
	console.log("🧩 DesignTokenIR resolve");
	console.log(`   theme         ${bundle.theme}   policy: ${POLICY}${overrides ? "   overrides: tokens/overrides.json" : ""}`);
	console.log(
		`   resolved      colors:${Object.keys(bundle.colors).length}  fonts:${Object.keys(bundle.fonts).length}  ` +
			`semantics:${Object.keys(bundle.semantics).length}  typography:${bundle.typography.length}  ` +
			`gradients:${Object.keys(bundle.gradients).length}  spacing:${bundle.spacing.length}  radii:${bundle.radii.length}`
	);
	console.log(`   diagnostics   ` + (Object.entries(bySeverity).map(([k, v]) => `${k}:${v}`).join("  ") || "none"));

	// Schema compliance
	const schema = readJson(SCHEMA_PATH);
	const errors = validateSchema(bundle, schema);
	if (errors.length) {
		console.error(`\n❌ ResolvedTokenBundle failed schema (${errors.length}):`);
		for (const e of errors.slice(0, 40)) console.error(`   - ${e}`);
		process.exit(1);
	}
	console.log("   ✅ valid against resolved-bundle/v1");

	// Policy gate
	if (blockers.length) {
		console.error(`\n⛔ POLICY: ${blockers.length} blocking issue(s) under '${POLICY}' mode.`);
		console.error(`   Resolve each by adding an entry to tokens/overrides.json, then re-run.\n`);
		for (const b of blockers) {
			console.error(`   [${b.code}] ${b.subject}`);
			console.error(`       ${b.detail}`);
			if (b.candidates) console.error(`       candidates: ${b.candidates.join("  ")}`);
		}
		console.error(`\n   Override format:`);
		console.error(`     { "colors": { "color.primary.1": "#3d77b0" },`);
		console.error(`       "typography": { "type.body.body-2": { "fontSize": 20, "fontWeight": 500, "lineHeight": 1.4, "letterSpacing": 0, "font": "sans" } } }`);
		console.error(`\n   (or re-run with --lenient to accept deterministic fallbacks locally)`);
		process.exit(1);
	}

	const nextText = stableStringify(bundle) + "\n";
	if (CHECK_ONLY) {
		const prev = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, "utf8") : "";
		if (prev !== nextText) {
			console.error(`\n❌ ${path.relative(ROOT, OUT_PATH)} is stale. Run: npm run ir:resolve`);
			process.exit(1);
		}
		console.log(`   ✅ ${path.relative(ROOT, OUT_PATH)} up to date`);
		return;
	}

	fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
	fs.writeFileSync(OUT_PATH, nextText, "utf8");
	console.log(`   fingerprint   ${bundle.meta.fingerprint}`);
	console.log(`   └── wrote ${path.relative(ROOT, OUT_PATH)}`);
}

main();

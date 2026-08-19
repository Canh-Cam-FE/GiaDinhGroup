#!/usr/bin/env node
/**
 * emit/typography.mjs — typography emitter for the DesignTokenIR pipeline.
 *
 * Pure transform:  tokens/resolved.<theme>.json  →  generated/typography.js
 *
 * Emits Tailwind plugin DATA (an @apply component map) consumed by
 * tailwind.config.js. This retires the runtime typography parsing/plugin logic
 * in tailwind-design-system.js. Logic (the tailwindcss `plugin()` wrapper) stays
 * handwritten in the config; only the data is generated.
 *
 * Output module exports:
 *   - components   { ".heading-1": { "@apply transition":{}, "@apply text-48 font-bold leading-125":{} },
 *                    ".heading-1 *": { "@apply transition":{} }, ... }
 *   - cssClasses   sorted unique component class list (for Tailwind `safelist`)
 *   - meta         provenance + fingerprints
 *
 * Font sizes use theme tokens `text-{N}` (e.g. text-48) so they resolve through
 * calcFzVP in tailwind.config.js → fluid clamp(...). Not fixed text-[Npx].
 *
 * Fix (flaw F6): line-height is bucketed to the ACTUAL Tailwind leading scale
 * below, guaranteeing every emitted `leading-N` utility exists (no silent
 * @apply failures for orphan buckets like 105/138/143).
 *
 * Usage:
 *   node automation/emit/typography.mjs                 # → generated/typography.js
 *   node automation/emit/typography.mjs --theme base
 *   node automation/emit/typography.mjs --check         # CI: fail if stale
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { readJson, stableStringify } from "../ir/lib/ir-utils.mjs";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const CHECK_ONLY = argv.includes("--check");
const THEME = (() => {
	const i = argv.indexOf("--theme");
	return i !== -1 && argv[i + 1] ? argv[i + 1] : "base";
})();
const BUNDLE_PATH = path.join(ROOT, `tokens/resolved.${THEME}.json`);
const OUT_PATH = path.join(ROOT, "generated/typography.js");

/**
 * The `leading-N` percent tokens that actually exist in tailwind.config.js
 * (theme.extend.lineHeight). MUST stay in sync with that scale. Line-height
 * ratios are bucketed to the nearest of these so @apply never references a
 * missing utility.
 */
const LEADING_SCALE = [100, 110, 115, 120, 125, 130, 135, 140, 145, 150];

/** Ratio (1.25) → nearest existing leading token (125). */
function leadingToken(ratio) {
	const pct = ratio * 100;
	let best = LEADING_SCALE[0];
	let bestDiff = Infinity;
	for (const t of LEADING_SCALE) {
		const d = Math.abs(t - pct);
		if (d < bestDiff) { bestDiff = d; best = t; }
	}
	return best;
}

/**
 * Weight → utility, covering Tailwind's full stock scale.
 *
 * This used to fall back to `font-sans` for anything outside 400/500/700 —
 * a font-FAMILY utility where a weight was meant. Classes like heading-3 (600)
 * and t128-900-125-s-ahc (900) silently lost their weight and picked up the
 * default family instead.
 */
const WEIGHT_UTILITIES = {
	100: "font-thin",
	200: "font-extralight",
	300: "font-light",
	400: "font-normal",
	500: "font-medium",
	600: "font-semibold",
	700: "font-bold",
	800: "font-extrabold",
	900: "font-black",
};

function weightUtility(w) {
	if (WEIGHT_UTILITIES[w]) return WEIGHT_UTILITIES[w];
	// Round to the nearest hundred rather than dropping the weight entirely.
	const nearest = Math.min(900, Math.max(100, Math.round(w / 100) * 100));
	return WEIGHT_UTILITIES[nearest];
}

/**
 * Family → `font-{key}`, matching the keys tailwind-theme.mjs emits into
 * generated/design-tokens.js. Without this every class inherited whatever
 * family html/body happened to set, so serif and icon classes rendered in the
 * body font.
 */
function familyUtility(fontFamily) {
	const family = fontFamily?.family;
	if (!family) return "";
	return `font-${family.trim().replace(/\s+/g, "-")}`;
}

/**
 * Size → theme token `text-{N}` so font-size resolves through calcFzVP
 * (clamp / design-vw) in tailwind.config.js — not fixed `text-[Npx]`.
 */
function sizeUtility(fontSize) {
	return `text-${fontSize}`;
}

function baseUtilities(metrics, fontFamily) {
	return [
		sizeUtility(metrics.fontSize),
		weightUtility(metrics.fontWeight),
		familyUtility(fontFamily),
		`leading-${leadingToken(metrics.lineHeight)}`,
	]
		.filter(Boolean)
		.join(" ");
}

const applyKey = (utils) => `@apply ${utils.trim().replace(/\s+/g, " ")}`;

function buildComponents(bundle) {
	const components = {};
	const seen = new Set();
	// Deterministic: iterate typography sorted by cssClass, first-wins per class.
	const entries = [...bundle.typography].sort((a, b) => (a.cssClass < b.cssClass ? -1 : 1));
	for (const t of entries) {
		if (seen.has(t.cssClass)) continue;
		seen.add(t.cssClass);
		const selector = `.${t.cssClass}`;
		components[selector] = {
			[applyKey("transition")]: {},
			[applyKey(baseUtilities(t.metrics, t.fontFamily))]: {},
		};
		components[`${selector} *`] = { [applyKey("transition")]: {} };
	}
	return components;
}

function render(bundle) {
	const components = buildComponents(bundle);
	const cssClasses = [...new Set(bundle.typography.map((t) => t.cssClass))].sort();
	const payload = {
		components,
		cssClasses,
		meta: {
			theme: bundle.theme,
			source: bundle.meta.source,
			bundleVersion: bundle.meta.bundleVersion,
			resolvedFingerprint: bundle.meta.fingerprint,
			leadingScale: LEADING_SCALE,
		},
	};
	const banner =
		"// AUTO-GENERATED by automation/emit/typography.mjs — DO NOT EDIT.\n" +
		`// Source: tokens/resolved.${THEME}.json (${bundle.meta.fingerprint})\n` +
		"// Regenerate: npm run emit:typography\n";
	return `${banner}module.exports = ${stableStringify(payload)};\n`;
}

function main() {
	if (!fs.existsSync(BUNDLE_PATH)) {
		console.error(`❌ Missing ${path.relative(ROOT, BUNDLE_PATH)} — run: npm run ir:resolve`);
		process.exit(1);
	}
	const bundle = readJson(BUNDLE_PATH);
	const text = render(bundle);
	const cssClasses = [...new Set(bundle.typography.map((t) => t.cssClass))];

	console.log("🔤 emit typography");
	console.log(`   theme         ${bundle.theme}`);
	console.log(`   classes       ${cssClasses.length}`);
	console.log(`   serif classes ${cssClasses.filter((c) => c.startsWith("heading-serif")).length} (recovered from curated contract)`);

	if (CHECK_ONLY) {
		const prev = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, "utf8") : "";
		if (prev !== text) {
			console.error(`\n❌ ${path.relative(ROOT, OUT_PATH)} is stale. Run: npm run emit:typography`);
			process.exit(1);
		}
		console.log(`   ✅ ${path.relative(ROOT, OUT_PATH)} up to date`);
		return;
	}

	fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
	fs.writeFileSync(OUT_PATH, text, "utf8");
	console.log(`   └── wrote ${path.relative(ROOT, OUT_PATH)}`);
}

main();

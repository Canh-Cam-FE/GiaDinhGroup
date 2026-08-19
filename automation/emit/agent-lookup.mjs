#!/usr/bin/env node
/**
 * emit/agent-lookup.mjs — agent/audit lookup emitter for the DesignTokenIR pipeline.
 *
 * Pure transform:
 *   tokens/resolved.base.json (+ normalized for Figma keys) → generated/agent-lookup.json
 *
 * Produces the single { ty, fi } lookup the agent compiler and typography audit
 * consume, keyed by Figma base key (the form that appears in page JSON as `ty`/`fi`):
 *   ty[<Figma key>] = { class, tag }
 *   fi[<Figma key>] = <tailwind stem>
 *
 * Typography includes every resolved entry with a cssClass (contract + Local/*),
 * not only the curated contract subset — otherwise page JSON Local/t* styles
 * fail the agent token audit as MISSING.
 *
 * Usage:
 *   node automation/emit/agent-lookup.mjs            # → generated/agent-lookup.json
 *   node automation/emit/agent-lookup.mjs --check    # CI: fail if stale
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { readJson, stableStringify, tailwindColorName, baseFigmaKey } from "../ir/lib/ir-utils.mjs";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const CHECK_ONLY = argv.includes("--check");
const RESOLVED_PATH = path.join(ROOT, "tokens/resolved.base.json");
const NORMALIZED_PATH = path.join(ROOT, "tokens/normalized.json");
const OUT_PATH = path.join(ROOT, "generated/agent-lookup.json");

function typographyList(resolved) {
	const raw = resolved.typography;
	if (Array.isArray(raw)) return raw;
	return Object.values(raw ?? {});
}

function figmaKeyForTypography(tok, normalizedById) {
	const fromNorm = normalizedById.get(tok.id)?.provenance?.figmaKey;
	if (fromNorm) return baseFigmaKey(fromNorm);

	// Local synthetics: id type.local.t128-… → Figma Local/t128-…
	if (tok.id?.startsWith("type.local.") && tok.cssClass) {
		return `Local/${tok.cssClass}`;
	}

	// Contract-only serif ladder (no Figma TEXT style in export)
	if (tok.id?.startsWith("type.heading-chan.") && tok.cssClass) {
		const n = tok.cssClass.replace(/^heading-serif-/, "");
		return `Heading chân/Heading-${n}`;
	}

	return null;
}

function build(resolved, normalized) {
	const normalizedById = new Map(
		Object.entries(normalized.typography ?? {}).map(([id, tok]) => [id, tok]),
	);

	const ty = {};

	// Contract entries first — authoritative html tags for curated styles.
	for (const [figmaKey, entry] of Object.entries(normalized.contract?.entries ?? {})) {
		if (!entry?.cssClass || !entry?.html) continue;
		ty[baseFigmaKey(figmaKey)] = { class: entry.cssClass, tag: entry.html };
	}

	// All resolved typography with a cssClass (includes Local/* and body/heading).
	for (const tok of typographyList(resolved)) {
		if (!tok?.cssClass) continue;
		const figmaKey = figmaKeyForTypography(tok, normalizedById);
		if (!figmaKey) continue;
		// Contract wins on tag when both exist; still fill gaps / locals.
		if (!(figmaKey in ty)) {
			ty[figmaKey] = {
				class: tok.cssClass,
				tag: tok.html || "div",
			};
		} else if (!ty[figmaKey].class) {
			ty[figmaKey].class = tok.cssClass;
		}
	}

	// fi — prefer resolved colors (post-collision); fall back to normalized.
	const fi = {};
	const colorSource = resolved.colors ?? normalized.colors ?? {};
	const colorList = Array.isArray(colorSource) ? colorSource : Object.values(colorSource);
	for (const tok of colorList) {
		const key = tok.provenance?.figmaKey
			? baseFigmaKey(tok.provenance.figmaKey)
			: tok.figmaKey
				? baseFigmaKey(tok.figmaKey)
				: null;
		if (!key || key in fi) continue;
		const stem =
			tok.tailwindStem ||
			(tok.group != null ? tailwindColorName(tok.group, tok.scale) : null);
		if (stem) fi[key] = stem;
	}

	// Normalized colors keep provenance.figmaKey more reliably.
	for (const tok of Object.values(normalized.colors ?? {})) {
		const key = tok.provenance?.figmaKey ? baseFigmaKey(tok.provenance.figmaKey) : null;
		if (!key || key in fi) continue;
		fi[key] = tailwindColorName(tok.group, tok.scale);
	}

	return {
		ty,
		fi,
		meta: {
			source: resolved.meta?.source ?? normalized.meta?.source,
			bundleVersion: resolved.meta?.bundleVersion ?? normalized.meta?.bundleVersion,
			contractVersion: normalized.meta?.contractVersion,
			resolvedFingerprint: resolved.meta?.fingerprint,
			sourceFingerprint: normalized.meta?.fingerprint,
		},
	};
}

function main() {
	if (!fs.existsSync(RESOLVED_PATH)) {
		console.error(`❌ Missing ${path.relative(ROOT, RESOLVED_PATH)} — run: npm run ir:resolve`);
		process.exit(1);
	}
	if (!fs.existsSync(NORMALIZED_PATH)) {
		console.error(`❌ Missing ${path.relative(ROOT, NORMALIZED_PATH)} — run: npm run ir:build`);
		process.exit(1);
	}

	const resolved = readJson(RESOLVED_PATH);
	const normalized = readJson(NORMALIZED_PATH);
	const lookup = build(resolved, normalized);
	const text = stableStringify(lookup) + "\n";

	console.log("🤖 emit agent-lookup");
	console.log(`   ty keys       ${Object.keys(lookup.ty).length}`);
	console.log(`   fi keys       ${Object.keys(lookup.fi).length}`);

	if (CHECK_ONLY) {
		const prev = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, "utf8") : "";
		if (prev !== text) {
			console.error(`\n❌ ${path.relative(ROOT, OUT_PATH)} is stale. Run: npm run emit:agent-lookup`);
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

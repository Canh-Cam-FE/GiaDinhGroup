/**
 * ir-utils.mjs — shared helpers for the DesignTokenIR pipeline.
 * Pure functions only. No side effects at import time.
 * Consumed by build-ir.mjs (ingest) and resolve.mjs (flatten).
 */
import fs from "node:fs";
import crypto from "node:crypto";

/** Read + parse JSON. Throws unless `optional`, in which case returns null. */
export function readJson(p, optional = false) {
	if (!fs.existsSync(p)) {
		if (optional) return null;
		throw new Error(`Required input not found: ${p}`);
	}
	return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** Slug one path segment → ascii-safe token-id segment (handles diacritics). */
export function seg(s) {
	return String(s)
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Reproduce the legacy Tailwind utility stem from a color's group + scale.
 * Mirrors the transform in tailwind-design-system.js so `fi` stems and
 * theme.extend.colors keys stay byte-compatible with pre-migration output:
 *   - utility/neutral groups collapse to the scale only  (Utility/white → white)
 *   - otherwise "group-scale"                            (Primary/1 → primary-1)
 *   - no scale → group                                   (Black → black)
 */
export function tailwindColorName(group, scale) {
	if (!scale) return group;
	if (group === "utility" || group === "neutral") return scale;
	return `${group}-${scale}`;
}

/** Strip a Figma node-id suffix: "Primary/1#12006:1619" → "Primary/1". */
export function baseFigmaKey(key) {
	return String(key).split("#")[0];
}

/** Deterministic stringify with recursively sorted object keys (arrays keep order). */
export function stableStringify(value, indent = 2) {
	const sortKeys = (v) => {
		if (Array.isArray(v)) return v.map(sortKeys);
		if (v && typeof v === "object") {
			const out = {};
			for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
			return out;
		}
		return v;
	};
	return JSON.stringify(sortKeys(value), null, indent);
}

/** Content fingerprint over a value, excluding a given top-level meta key. */
export function fingerprintOf(value, excludeMetaKey = "fingerprint") {
	const clone = JSON.parse(JSON.stringify(value));
	if (clone.meta && excludeMetaKey in clone.meta) delete clone.meta[excludeMetaKey];
	return "sha256:" + crypto.createHash("sha256").update(stableStringify(clone)).digest("hex");
}

/**
 * Minimal JSON-Schema validator (subset: type, const, enum, pattern, properties,
 * required, additionalProperties, items, oneOf, minimum/maximum/exclusiveMinimum,
 * $ref into local #/$defs). Sufficient for the IR schemas; avoids an ajv dependency.
 * Returns an array of human-readable error strings ([] === valid).
 */
export function validateSchema(instance, schema) {
	const errors = [];
	const root = schema;
	const resolve = (s) => {
		if (s && s.$ref) {
			const p = s.$ref.replace(/^#\//, "").split("/");
			let cur = root;
			for (const k of p) cur = cur?.[k];
			return cur;
		}
		return s;
	};
	const typeOf = (v) => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);
	const check = (val, sch, pth) => {
		sch = resolve(sch);
		if (!sch) return;
		if (sch.const !== undefined && val !== sch.const) errors.push(`${pth}: expected const ${JSON.stringify(sch.const)}`);
		if (sch.enum && !sch.enum.includes(val)) errors.push(`${pth}: '${val}' not in enum`);
		if (sch.type) {
			const jt = typeOf(val);
			const ok = sch.type === "integer" ? jt === "number" && Number.isInteger(val) : jt === sch.type;
			if (!ok) { errors.push(`${pth}: expected ${sch.type}, got ${jt}`); return; }
		}
		if (typeof val === "number") {
			if (sch.minimum !== undefined && val < sch.minimum) errors.push(`${pth}: < minimum ${sch.minimum}`);
			if (sch.maximum !== undefined && val > sch.maximum) errors.push(`${pth}: > maximum ${sch.maximum}`);
			if (sch.exclusiveMinimum !== undefined && val <= sch.exclusiveMinimum) errors.push(`${pth}: <= exclusiveMinimum ${sch.exclusiveMinimum}`);
		}
		if (typeof val === "string" && sch.pattern && !new RegExp(sch.pattern).test(val)) {
			errors.push(`${pth}: '${val}' fails pattern ${sch.pattern}`);
		}
		if (sch.oneOf) {
			const before = errors.length;
			const passes = sch.oneOf.filter((sub) => {
				const mark = errors.length;
				check(val, sub, pth);
				const ok = errors.length === mark;
				if (!ok) errors.length = mark;
				return ok;
			});
			errors.length = before;
			if (passes.length !== 1) errors.push(`${pth}: matched ${passes.length} of oneOf (expected 1)`);
		}
		if (sch.type === "object" || sch.properties || sch.required) {
			if (val && typeof val === "object" && !Array.isArray(val)) {
				for (const req of sch.required ?? []) if (!(req in val)) errors.push(`${pth}: missing required '${req}'`);
				for (const [k, v] of Object.entries(val)) {
					if (sch.properties && k in sch.properties) check(v, sch.properties[k], `${pth}.${k}`);
					else if (sch.additionalProperties === false) errors.push(`${pth}: additional property '${k}'`);
					else if (sch.additionalProperties && typeof sch.additionalProperties === "object") check(v, sch.additionalProperties, `${pth}.${k}`);
				}
			}
		}
		if (sch.type === "array" && Array.isArray(val) && sch.items) {
			val.forEach((item, i) => check(item, sch.items, `${pth}[${i}]`));
		}
	};
	check(instance, root, "$");
	return errors;
}

#!/usr/bin/env node
/**
 * Layout geometry audit — Phase 0 (static, no browser)
 *
 * Compares Figma geometry in json/{slug}.json (`b`, `al`) against the layout
 * utilities declared in src/modules/{slug}/*\/index.{pug,sass}.
 *
 * Matching is anchor-based, never 1:1 — automation/agent-rules/05-layout-geometry.md
 * forbids redundant wrappers, so a correct page has fewer elements than the
 * JSON has nodes. See docs/layout-geometry-audit-plan.md.
 *
 * Usage:
 *   node automation/scripts/layout-geometry-audit.mjs
 *   node automation/scripts/layout-geometry-audit.mjs --page home
 *   node automation/scripts/layout-geometry-audit.mjs --json-out json/layout-geometry-audit.json
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { isPageJsonFile } from "./page-json-skip.mjs";

const ROOT = process.cwd();
const JSON_DIR = path.join(ROOT, "json");
const SRC_MODULES = path.join(ROOT, "src", "modules");
const LAYOUT_RULES = JSON.parse(
	fs.readFileSync(path.join(ROOT, "automation", "config", "layout-rules.json"), "utf8"),
);
const REPORT_JSON = path.join(JSON_DIR, "layout-geometry-audit.json");

const BASE_WIDTH = LAYOUT_RULES.designBaseWidthPx;
const ROOT_FONT = LAYOUT_RULES.rootFontSizePx;

/** Full-bleed frames get horizontal padding from .container* — only check block padding. */
const FULL_BLEED_MIN_WIDTH = 1500;
/** Below this, a gap/padding delta is utility rounding rather than a real error. */
const LENGTH_TOLERANCE_PX = 1;
/** A module with no more elements than the scaffold emits has not been built yet. */
const SCAFFOLD_MAX_ELEMENTS = 6;

const argv = process.argv.slice(2);

/** `npm run audit:layout:page -- --page home` passes `--page` twice. */
function parseFlag(name) {
	const index = argv.lastIndexOf(name);
	if (index === -1) return null;
	const value = argv[index + 1];
	return !value || value.startsWith("--") ? null : value;
}

const pageFilter = parseFlag("--page");
const jsonOut = parseFlag("--json-out") ?? REPORT_JSON;

// ─── Utility resolution ───────────────────────────────────────────────────────
// At the design base width every fluid utility resolves to its max arm, and
// 1rem = rootFontSizePx, so Figma px maps 1:1 to CSS px. Everything below
// assumes that mapping; assertBaseWidthMapping() guards it.

/** Min-width screens ordered by specificity at BASE_WIDTH. `max-*` never applies. */
const SCREEN_WEIGHT = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5, "2xl": 6 };
/** Variants that transform the value instead of gating it. */
const TRANSFORM_VARIANTS = new Set(["clamp", "rem"]);

function assertBaseWidthMapping() {
	if (BASE_WIDTH !== 1920 || ROOT_FONT !== 19.2) {
		console.warn(
			`[audit] layout-rules changed (${BASE_WIDTH}px / ${ROOT_FONT}px root) — px mapping re-derived from config.`,
		);
	}
}

/** `lg:clamp:gap-[24-32]` → { variants: ["lg","clamp"], utility: "gap-[24-32]" }. */
function splitVariants(token) {
	const parts = [];
	let depth = 0;
	let current = "";
	for (const ch of token) {
		if (ch === "[") depth++;
		if (ch === "]") depth--;
		if (ch === ":" && depth === 0) {
			parts.push(current);
			current = "";
			continue;
		}
		current += ch;
	}
	parts.push(current);
	return { variants: parts.slice(0, -1), utility: parts[parts.length - 1] };
}

/**
 * Weight of a token at BASE_WIDTH, or null when it does not apply there
 * (max-width screens, state variants such as hover/group-hover).
 */
function variantWeight(variants) {
	let weight = 0;
	for (const v of variants) {
		if (TRANSFORM_VARIANTS.has(v)) continue;
		if (v in SCREEN_WEIGHT) {
			weight = Math.max(weight, SCREEN_WEIGHT[v]);
			continue;
		}
		return null;
	}
	return weight;
}

/** Spacing scale: key n → n * 4px (calcSpacingRem(n*4) at the config root size). */
function scaleToPx(key) {
	if (key === "0") return 0;
	if (key === "px") return 1;
	if (/^\d+$/.test(key)) return Number(key) * 4;
	return null;
}

/** Arbitrary value `[…]` → px at BASE_WIDTH, honouring the clamp/rem variants. */
function arbitraryToPx(raw, variants) {
	const inner = raw.slice(1, -1).trim();
	const range = inner.match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/);
	if (range) return Number(range[2]);
	const rem = inner.match(/^(-?\d+(?:\.\d+)?)rem$/);
	if (rem) return Number(rem[1]) * ROOT_FONT;
	const px = inner.match(/^(-?\d+(?:\.\d+)?)px$/);
	if (px) return Number(px[1]);
	if (/^-?\d+(?:\.\d+)?$/.test(inner)) return Number(inner);
	void variants;
	return null;
}

function lengthToPx(value, variants) {
	if (!value) return null;
	if (value.startsWith("[")) return arbitraryToPx(value, variants);
	return scaleToPx(value);
}

const PADDING_SIDES = {
	p: ["top", "right", "bottom", "left"],
	px: ["left", "right"],
	py: ["top", "bottom"],
	pt: ["top"],
	pr: ["right"],
	pb: ["bottom"],
	pl: ["left"],
};

const WIDTH_PREFIXES = ["w-", "max-w-", "min-w-", "basis-", "grid-cols-", "col-span-"];
const OFFSET_PREFIXES = ["top-", "right-", "bottom-", "left-", "inset-"];

function emptyStyle() {
	return {
		display: null,
		direction: null,
		gapRow: null,
		gapCol: null,
		padding: { top: null, right: null, bottom: null, left: null },
		justify: null,
		items: null,
		position: null,
		hasWidthConstraint: false,
		rawOffsets: [],
		tokens: [],
	};
}

/** Later breakpoints win; base declarations never override a breakpoint. */
function setProp(style, weights, prop, value, weight) {
	if (value === null || value === undefined) return;
	if (weights[prop] !== undefined && weights[prop] > weight) return;
	weights[prop] = weight;
	if (prop.startsWith("padding.")) style.padding[prop.slice(8)] = value;
	else style[prop] = value;
}

function applyToken(style, weights, token) {
	const { variants, utility } = splitVariants(token);
	const weight = variantWeight(variants);
	if (weight === null) return;
	style.tokens.push(token);

	if (utility === "flex" || utility === "inline-flex") {
		setProp(style, weights, "display", "flex", weight);
		return;
	}
	if (utility === "grid" || utility === "inline-grid") {
		setProp(style, weights, "display", "grid", weight);
		return;
	}
	if (utility === "flex-col" || utility === "flex-col-reverse") {
		setProp(style, weights, "direction", "VERTICAL", weight);
		return;
	}
	if (utility === "flex-row" || utility === "flex-row-reverse") {
		setProp(style, weights, "direction", "HORIZONTAL", weight);
		return;
	}
	if (["absolute", "relative", "fixed", "sticky", "static"].includes(utility)) {
		setProp(style, weights, "position", utility, weight);
		return;
	}

	const justify = utility.match(/^justify-(start|end|center|between|around|evenly)$/);
	if (justify) {
		setProp(style, weights, "justify", justify[1], weight);
		return;
	}
	const items = utility.match(/^items-(start|end|center|baseline|stretch)$/);
	if (items) {
		setProp(style, weights, "items", items[1], weight);
		return;
	}

	const gap = utility.match(/^gap(-x|-y)?-(.+)$/);
	if (gap) {
		const px = lengthToPx(gap[2], variants);
		if (gap[1] === "-x") setProp(style, weights, "gapCol", px, weight);
		else if (gap[1] === "-y") setProp(style, weights, "gapRow", px, weight);
		else {
			setProp(style, weights, "gapRow", px, weight);
			setProp(style, weights, "gapCol", px, weight);
		}
		return;
	}

	const pad = utility.match(/^(p|px|py|pt|pr|pb|pl)-(.+)$/);
	if (pad && PADDING_SIDES[pad[1]]) {
		const px = lengthToPx(pad[2], variants);
		for (const side of PADDING_SIDES[pad[1]]) {
			setProp(style, weights, `padding.${side}`, px, weight);
		}
		return;
	}

	if (WIDTH_PREFIXES.some((p) => utility.startsWith(p))) {
		style.hasWidthConstraint = true;
		return;
	}

	const offset = OFFSET_PREFIXES.find((p) => utility.startsWith(p));
	if (offset && utility.includes("[") && !variants.includes("clamp")) {
		const px = arbitraryToPx(utility.slice(offset.length), variants);
		if (px !== null && Math.abs(px) > 4) style.rawOffsets.push(token);
	}
}

/** Sass `gap: 32px` / `padding-top: 40px` written without @apply. */
function applyDeclaration(style, weights, prop, value) {
	const px = /^(-?\d+(?:\.\d+)?)px$/.test(value)
		? Number(value.replace("px", ""))
		: /^(-?\d+(?:\.\d+)?)rem$/.test(value)
			? Number(value.replace("rem", "")) * ROOT_FONT
			: null;
	if (prop === "gap") {
		setProp(style, weights, "gapRow", px, 0);
		setProp(style, weights, "gapCol", px, 0);
	} else if (prop === "display") {
		setProp(style, weights, "display", value, 0);
	} else if (prop === "flex-direction") {
		setProp(style, weights, "direction", value.startsWith("column") ? "VERTICAL" : "HORIZONTAL", 0);
	} else if (prop.startsWith("padding")) {
		const side = prop.split("-")[1];
		if (side) setProp(style, weights, `padding.${side}`, px, 0);
		else for (const s of PADDING_SIDES.p) setProp(style, weights, `padding.${s}`, px, 0);
	}
}

function resolveStyle(tokens, declarations) {
	const style = emptyStyle();
	const weights = {};
	for (const token of tokens) applyToken(style, weights, token);
	for (const [prop, value] of declarations || []) applyDeclaration(style, weights, prop, value);
	return style;
}

// ─── Pug parsing ──────────────────────────────────────────────────────────────

function indentOf(line) {
	const match = line.match(/^[\t ]*/)[0];
	return match.includes("\t") ? match.length : Math.floor(match.length / 2);
}

const PUG_KEYWORDS = /^(include|extends|block|mixin|append|prepend|doctype|each|if|else|unless|case|when|while|-|\/\/)/;

/** `h2.heading-1(class='a b') Text` → element node. */
function parseElementLine(raw, lineNo) {
	const text = raw.trim();
	if (!text || PUG_KEYWORDS.test(text) || text.startsWith("|") || text.startsWith("+")) return null;

	const head = text.match(/^([a-zA-Z][\w-]*)?((?:[.#][\w\-/:[\]%.]+)*)/);
	if (!head || (!head[1] && !head[2])) return null;

	const tag = head[1] || "div";
	const classes = [];
	for (const chunk of (head[2] || "").split(".")) {
		if (!chunk || chunk.startsWith("#")) continue;
		classes.push(chunk);
	}

	let rest = text.slice(head[0].length);
	if (rest.startsWith("(")) {
		let depth = 0;
		let end = 0;
		for (let i = 0; i < rest.length; i++) {
			if (rest[i] === "(") depth++;
			if (rest[i] === ")") {
				depth--;
				if (depth === 0) {
					end = i;
					break;
				}
			}
		}
		const attrs = rest.slice(1, end);
		rest = rest.slice(end + 1);
		for (const m of attrs.matchAll(/class\s*=\s*['"]([^'"]+)['"]/g)) {
			classes.push(...m[1].split(/\s+/).filter(Boolean));
		}
	}

	const body = rest.trim();
	const dynamic = body.startsWith("=") || body.includes("#{");
	return {
		tag,
		classes,
		text: dynamic ? "" : body.replace(/^\|\s*/, ""),
		dynamic,
		line: lineNo,
		children: [],
		parent: null,
	};
}

function parsePug(file) {
	const content = fs.readFileSync(file, "utf8");
	const root = { tag: "#root", classes: [], text: "", children: [], parent: null, line: 0 };
	const stack = [{ indent: -1, node: root }];
	let count = 0;

	content.split("\n").forEach((raw, i) => {
		if (!raw.trim()) return;
		const indent = indentOf(raw);
		const node = parseElementLine(raw, i + 1);
		while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();

		if (!node) {
			// Continuation text (`| more copy`) belongs to the open element.
			const owner = stack[stack.length - 1].node;
			const piped = raw.trim().match(/^\|\s*(.+)$/);
			if (piped && owner !== root && !piped[1].includes("#{")) {
				owner.text = `${owner.text} ${piped[1]}`.trim();
			}
			return;
		}

		const parent = stack[stack.length - 1].node;
		node.parent = parent;
		parent.children.push(node);
		stack.push({ indent, node });
		count++;
	});

	return { root, elementCount: count };
}

function findByClass(node, className) {
	if (node.classes.includes(className)) return node;
	for (const child of node.children) {
		const hit = findByClass(child, className);
		if (hit) return hit;
	}
	return null;
}

function flatten(node, out = []) {
	for (const child of node.children) {
		out.push(child);
		flatten(child, out);
	}
	return out;
}

function ancestorsOf(node) {
	const chain = [];
	let current = node.parent;
	while (current) {
		chain.push(current);
		current = current.parent;
	}
	return chain;
}

function nearestCommonAncestor(nodes) {
	if (nodes.length === 0) return null;
	let common = [nodes[0], ...ancestorsOf(nodes[0])];
	for (const node of nodes.slice(1)) {
		const chain = new Set([node, ...ancestorsOf(node)]);
		common = common.filter((c) => chain.has(c));
	}
	return common[0] || null;
}

// ─── Sass parsing ─────────────────────────────────────────────────────────────

/** innermost class → { tokens, declarations } from @apply and plain declarations. */
function parseSass(file) {
	if (!fs.existsSync(file)) return new Map();
	const byClass = new Map();
	const stack = [];

	for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
		if (!raw.trim() || raw.trim().startsWith("//")) continue;
		const indent = indentOf(raw);
		const text = raw.trim();

		if (text.startsWith("@apply ") || /^[a-z-]+\s*:/.test(text)) {
			while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
			const owner = stack[stack.length - 1];
			if (!owner?.className) continue;
			const entry = byClass.get(owner.className) || { tokens: [], declarations: [] };
			if (text.startsWith("@apply ")) {
				entry.tokens.push(...text.slice(7).split(/\s+/).filter(Boolean));
			} else {
				const [prop, ...value] = text.split(":");
				entry.declarations.push([prop.trim(), value.join(":").trim()]);
			}
			byClass.set(owner.className, entry);
			continue;
		}

		while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
		// Pseudo-selectors and combinators carry state, not base layout.
		const className = /[&:]/.test(text) ? null : (text.match(/\.([\w-]+)\s*$/) || [])[1] || null;
		stack.push({ indent, className });
	}

	return byClass;
}

function styleOf(element, sassByClass) {
	const tokens = [...element.classes];
	const declarations = [];
	for (const className of element.classes) {
		const entry = sassByClass.get(className);
		if (!entry) continue;
		tokens.push(...entry.tokens);
		declarations.push(...entry.declarations);
	}
	return resolveStyle(tokens, declarations);
}

// ─── Figma model ──────────────────────────────────────────────────────────────

function normalizeText(value) {
	return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function nodeWidth(node) {
	return node?.b?.width ?? 0;
}

/**
 * Component instances become mixins (rule 04), so their internal layout is not
 * authored in the module. Their text stays visible for anchor matching — the
 * agent may still have written the card inline — but their frames are not
 * checked and they do not count towards coverage.
 */
function isOpaqueComponent(node) {
	return node.t === "INSTANCE" || node.t === "SHARED_REF";
}

function textDescendants(node, out = []) {
	if (node.t === "TEXT" && node.tx) out.push(normalizeText(node.tx));
	for (const child of node.ch || []) textDescendants(child, out);
	return out;
}

/** Text the module itself is expected to author, excluding mixin internals. */
function authoredTextDescendants(node, out = []) {
	if (node.t === "TEXT" && node.tx) out.push(normalizeText(node.tx));
	if (isOpaqueComponent(node)) return out;
	for (const child of node.ch || []) authoredTextDescendants(child, out);
	return out;
}

/** Children that participate in the auto-layout flow (decorative lines excluded). */
function layoutChildren(node) {
	return (node.ch || []).filter((c) => c.t !== "LINE" && c.t !== "VECTOR");
}

function countComponents(node) {
	if (isOpaqueComponent(node)) return 1;
	return (node.ch || []).reduce((n, child) => n + countComponents(child), 0);
}

function collectContainers(node, out = [], depth = 0) {
	if (isOpaqueComponent(node)) return out;
	if (node.al?.layoutMode) out.push({ node, depth });
	for (const child of node.ch || []) collectContainers(child, out, depth + 1);
	return out;
}

/** Overlay nodes: positioned inside the parent box with no auto-layout to lean on. */
function collectOverlays(node, out = [], parent = null) {
	const b = node.b;
	if (
		parent &&
		!node.al &&
		b &&
		b.x !== undefined &&
		b.y !== undefined &&
		parent.b &&
		b.x >= 0 &&
		b.y >= 0 &&
		b.x <= parent.b.width &&
		b.y <= parent.b.height &&
		!parent.al
	) {
		out.push({ node, parent });
	}
	for (const child of node.ch || []) collectOverlays(child, out, node);
	return out;
}

const FIGMA_ALIGN = {
	MIN: "start",
	CENTER: "center",
	MAX: "end",
	SPACE_BETWEEN: "between",
	BASELINE: "baseline",
};

function expectedAlignment(al) {
	return {
		justify: FIGMA_ALIGN[al.primaryAxisAlignItems] ?? null,
		items: FIGMA_ALIGN[al.counterAxisAlignItems] ?? null,
	};
}

// ─── Checks ───────────────────────────────────────────────────────────────────

function closeEnough(a, b) {
	return Math.abs(a - b) <= LENGTH_TOLERANCE_PX;
}

function checkContainer({ figma, element, style, region, issues, pugRel }) {
	const al = figma.al;
	const children = layoutChildren(figma);
	const where = {
		region: region.folder,
		node: figma.n || figma.t || "frame",
		pugFile: pugRel,
		pugLine: element.line,
	};

	if (al.layoutMode && style.display !== "grid") {
		const declared = style.direction ?? (style.display === "flex" ? "HORIZONTAL" : null);
		if (declared === null) {
			issues.push({
				severity: "BLOCKER",
				code: "AXIS_MISMATCH",
				...where,
				expected: { layoutMode: al.layoutMode },
				found: { display: style.display, direction: null },
				message: `Figma frame is ${al.layoutMode} auto-layout but the matched element declares no flex/grid layout`,
				fix: al.layoutMode === "VERTICAL" ? "Add flex flex-col" : "Add flex (or .row) on the matched element",
			});
		} else if (declared !== al.layoutMode) {
			issues.push({
				severity: "BLOCKER",
				code: "AXIS_MISMATCH",
				...where,
				expected: { layoutMode: al.layoutMode },
				found: { direction: declared },
				message: `Figma frame is ${al.layoutMode} but the element lays out ${declared}`,
				fix: al.layoutMode === "VERTICAL" ? "Use flex-col" : "Use flex-row",
			});
		}
	}

	if (al.itemSpacing > 0 && children.length >= 2) {
		const gap = al.layoutMode === "VERTICAL" ? style.gapRow : style.gapCol;
		if (gap === null) {
			issues.push({
				severity: "HIGH",
				code: "GAP_MISSING",
				...where,
				expected: { itemSpacing: al.itemSpacing },
				found: { gap: null },
				message: `Figma itemSpacing ${al.itemSpacing}px has no gap on the matched element`,
				fix: `Add clamp:gap-[${al.itemSpacing}] (or gap-${al.itemSpacing / 4} if it should not scale)`,
			});
		} else if (!closeEnough(gap, al.itemSpacing)) {
			issues.push({
				severity: "HIGH",
				code: "GAP_MISMATCH",
				...where,
				expected: { itemSpacing: al.itemSpacing },
				found: { gap, from: style.tokens.filter((t) => t.includes("gap")) },
				message: `gap resolves to ${gap}px, Figma itemSpacing is ${al.itemSpacing}px`,
				fix: `Replace with clamp:gap-[${al.itemSpacing}]`,
			});
		}
	}

	if (al.padding) {
		// Full-bleed frames get their horizontal padding from .container*, which
		// lives outside the module — only the block axis is the module's to set.
		const fullBleed = nodeWidth(figma) >= FULL_BLEED_MIN_WIDTH;
		const sides = fullBleed ? ["top", "bottom"] : ["top", "right", "bottom", "left"];
		const wrong = sides
			.filter((side) => al.padding[side])
			.filter((side) => {
				const found = style.padding[side];
				return found === null || !closeEnough(found, al.padding[side]);
			});

		if (wrong.length) {
			const expected = Object.fromEntries(wrong.map((s) => [s, al.padding[s]]));
			const found = Object.fromEntries(wrong.map((s) => [s, style.padding[s]]));
			issues.push({
				severity: "HIGH",
				code: "PADDING_MISMATCH",
				...where,
				sides: wrong,
				expected,
				found,
				message: `padding ${wrong.map((s) => `${s}: ${found[s] === null ? "none" : `${found[s]}px`} (Figma ${expected[s]}px)`).join(", ")}`,
				fix: wrong.map((s) => `clamp:p${s[0]}-[${Math.round(expected[s] / 2)}-${expected[s]}]`).join(" "),
			});
		}
	}

	// Alignment only has an effect on an axis with free space; a HUG axis is sized
	// by its content, so Figma's value there says nothing about the CSS.
	const align = expectedAlignment(al);
	const mainSizing = al.layoutMode === "VERTICAL" ? al.layoutSizingVertical : al.layoutSizingHorizontal;
	const crossSizing = al.layoutMode === "VERTICAL" ? al.layoutSizingHorizontal : al.layoutSizingVertical;
	const checkJustify = align.justify && mainSizing && mainSizing !== "HUG";
	const checkItems = align.items && crossSizing && crossSizing !== "HUG";

	const crossed =
		checkJustify &&
		checkItems &&
		align.justify !== align.items &&
		style.justify === align.items &&
		style.items === align.justify;
	const justifyOnWrongAxis =
		checkJustify && style.justify === null && style.items === align.justify;
	const itemsOnWrongAxis = checkItems && style.items === null && style.justify === align.items;

	if (crossed || justifyOnWrongAxis || itemsOnWrongAxis) {
		issues.push({
			severity: "BLOCKER",
			code: "ALIGN_AXIS_SWAP",
			...where,
			expected: { justify: align.justify, items: align.items, layoutMode: al.layoutMode },
			found: { justify: style.justify, items: style.items },
			message: `${al.layoutMode} auto-layout: Figma's ${crossed || justifyOnWrongAxis ? "primaryAxisAlignItems" : "counterAxisAlignItems"} landed on the wrong CSS axis`,
			fix: `Use ${align.justify ? `justify-${align.justify}` : "no justify-*"} and ${align.items ? `items-${align.items}` : "no items-*"}`,
		});
	} else {
		for (const [prop, expected, enabled] of [
			["justify", align.justify, checkJustify],
			["items", align.items, checkItems],
		]) {
			if (!enabled || style[prop] === null || style[prop] === expected) continue;
			issues.push({
				severity: "HIGH",
				code: "ALIGN_MISMATCH",
				...where,
				expected: { [prop]: expected },
				found: { [prop]: style[prop] },
				message: `${prop}-${style[prop]} declared, Figma ${al.layoutMode} layout expects ${prop}-${expected}`,
				fix: `Use ${prop}-${expected}`,
			});
		}
	}

	if (
		al.layoutSizingHorizontal === "FIXED" &&
		nodeWidth(figma) > 0 &&
		nodeWidth(figma) < BASE_WIDTH &&
		!style.hasWidthConstraint &&
		!element.classes.some((c) => c.startsWith("container") || c === "col")
	) {
		issues.push({
			severity: "INFO",
			code: "WIDTH_UNCONSTRAINED",
			...where,
			expected: { width: nodeWidth(figma) },
			found: { width: null },
			message: `Figma frame is FIXED at ${nodeWidth(figma)}px but the element declares no width constraint`,
			fix: `Add xl:rem:max-w-[${nodeWidth(figma)}px] or a column fraction on .col`,
		});
	}
}

function checkOverlays(overlays, sectionRoot, region, issues, pugRel) {
	if (overlays.length === 0) return;
	const elements = flatten(sectionRoot);
	const hasAbsolute = elements.some((e) => e.classes.includes("absolute"));
	const hasRelative = elements.some((e) => e.classes.includes("relative"));
	if (hasAbsolute && hasRelative) return;
	issues.push({
		severity: "HIGH",
		code: "ABSOLUTE_NODE_UNHANDLED",
		region: region.folder,
		node: overlays[0].node.n || overlays[0].node.t,
		pugFile: pugRel,
		pugLine: sectionRoot.line,
		expected: { overlayNodes: overlays.length },
		found: { absolute: hasAbsolute, relative: hasRelative },
		message: `${overlays.length} Figma node(s) float over a parent with no auto-layout, but the module declares no relative/absolute pairing`,
		fix: "Make the parent .relative and the floating child .absolute with clamp:/% offsets (rule 05)",
	});
}

function checkRawOffsets(sectionRoot, region, issues, pugRel, sassByClass) {
	for (const element of flatten(sectionRoot)) {
		const style = styleOf(element, sassByClass);
		if (style.position !== "absolute" || style.rawOffsets.length === 0) continue;
		issues.push({
			severity: "HIGH",
			code: "FIXED_PX_OFFSET",
			region: region.folder,
			node: element.classes.join(".") || element.tag,
			pugFile: pugRel,
			pugLine: element.line,
			found: { offsets: style.rawOffsets },
			message: `Absolute child uses raw px offsets (${style.rawOffsets.join(", ")}) instead of clamp:/%`,
			fix: "Convert the offset to clamp: or % of the parent box (rule 05)",
		});
	}
}

// ─── Region audit ─────────────────────────────────────────────────────────────

function regionSubtree(pageJson, region) {
	const section = (pageJson.tree || []).find((s) => s.n === region.parentSection);
	if (!section) return null;
	const picked = (region.sourceIndices || []).map((i) => (section.ch || [])[i]).filter(Boolean);
	if (picked.length === 0) return null;
	return picked.length === 1 ? picked[0] : { t: "FRAME", n: region.id, ch: picked, b: section.b };
}

function auditRegion(slug, pageJson, region, counters) {
	const issues = [];
	const skipped = [];
	const moduleDir = path.join(SRC_MODULES, slug, region.folder);
	const pugPath = path.join(moduleDir, "index.pug");
	const pugRel = path.relative(ROOT, pugPath);

	const subtree = regionSubtree(pageJson, region);
	if (!subtree) {
		skipped.push({ region: region.folder, reason: "No JSON subtree for sourceIndices" });
		return { issues, skipped };
	}
	if (!fs.existsSync(pugPath)) {
		// module-structure-audit owns missing-folder failures; do not double-report.
		skipped.push({ region: region.folder, reason: "Module Pug missing" });
		return { issues, skipped };
	}

	const { root, elementCount } = parsePug(pugPath);
	const sassByClass = parseSass(path.join(moduleDir, "index.sass"));
	const sectionRoot = findByClass(root, region.sectionClass);
	if (!sectionRoot) {
		skipped.push({ region: region.folder, reason: `No section.${region.sectionClass} root` });
		return { issues, skipped };
	}

	const expectedTexts = [...new Set(authoredTextDescendants(subtree).filter(Boolean))];
	const elements = flatten(sectionRoot);
	const elementsByText = new Map();
	for (const element of elements) {
		const key = normalizeText(element.text);
		if (!key) continue;
		if (!elementsByText.has(key)) elementsByText.set(key, element);
	}

	const matchText = (needle) => {
		if (elementsByText.has(needle)) return elementsByText.get(needle);
		for (const [key, element] of elementsByText) {
			if (key.includes(needle) || needle.includes(key)) return element;
		}
		return null;
	};

	const matched = expectedTexts.filter((t) => matchText(t));
	counters.anchorsMatched += matched.length;
	counters.anchorsUnmatched += expectedTexts.length - matched.length;

	// A scaffold stub reports once, not once per missing anchor. Content-heavy
	// regions can carry almost no authored text (cards live in mixins), so
	// containers and component instances also count as "there is work here".
	const figmaContainers = collectContainers(subtree).length;
	const figmaComponents = countComponents(subtree);
	const hasSubstance = expectedTexts.length >= 3 || figmaContainers >= 3 || figmaComponents >= 2;
	if (hasSubstance && matched.length <= 1 && elementCount <= SCAFFOLD_MAX_ELEMENTS) {
		issues.push({
			severity: "HIGH",
			code: "REGION_NOT_IMPLEMENTED",
			region: region.folder,
			pugFile: pugRel,
			pugLine: sectionRoot.line,
			expected: {
				textNodes: expectedTexts.length,
				containers: figmaContainers,
				components: figmaComponents,
			},
			found: { elements: elementCount, matchedAnchors: matched.length },
			message: `Module is still a scaffold: Figma has ${figmaContainers} auto-layout frame(s), ${figmaComponents} component instance(s) and ${expectedTexts.length} authored text node(s); the Pug has ${elementCount} element(s)`,
			fix: `Build src/modules/${slug}/${region.folder}/ from the region JSON before geometry can be checked`,
		});
		return { issues, skipped };
	}

	// Rule 05 collapses redundant wrappers, so a Figma frame whose only job is to
	// nest another frame has no element of its own — its anchors resolve one level
	// too deep, and it takes the parent element instead. Any other collision means
	// the Pug is missing a level the Figma tree needs: report that once and stop,
	// because every frame above it would otherwise be attributed to the wrong
	// element and bury the real defect under a cascade.
	const taken = new Map();
	const candidates = collectContainers(subtree)
		.map(({ node, depth }) => ({
			figma: node,
			depth,
			anchors: [...new Set(textDescendants(node).map(matchText).filter(Boolean))],
		}))
		.filter((c) => c.anchors.length >= 2)
		.sort((a, b) => b.depth - a.depth);

	for (const [index, candidate] of candidates.entries()) {
		let element = nearestCommonAncestor(candidate.anchors);
		while (
			element &&
			taken.has(element) &&
			layoutChildren(candidate.figma).length === 1 &&
			element.parent &&
			element !== sectionRoot
		) {
			element = element.parent;
		}

		if (!element || taken.has(element)) {
			const collapsed = taken.get(element);
			issues.push({
				severity: "HIGH",
				code: "STRUCTURE_COLLAPSED",
				region: region.folder,
				node: candidate.figma.n || candidate.figma.t,
				pugFile: pugRel,
				pugLine: element?.line ?? sectionRoot.line,
				expected: {
					frame: candidate.figma.n || candidate.figma.t,
					layoutChildren: layoutChildren(candidate.figma).length,
					itemSpacing: candidate.figma.al?.itemSpacing ?? null,
				},
				found: { sharedWith: collapsed?.n || collapsed?.t || null },
				message: `Figma nests "${candidate.figma.n || candidate.figma.t}" around "${collapsed?.n || "the matched element"}", but both resolve to the same Pug element — the module is missing a nesting level`,
				fix: `Wrap the inner content in its own element so each frame's gap/padding can apply (${candidate.figma.al?.itemSpacing ?? 0}px vs ${collapsed?.al?.itemSpacing ?? 0}px)`,
			});
			for (const remaining of candidates.slice(index + 1)) {
				skipped.push({
					region: region.folder,
					node: remaining.figma.n || remaining.figma.t,
					reason: "Not checked — an inner frame collapsed, so outer attribution is unreliable",
				});
			}
			break;
		}

		taken.set(element, candidate.figma);
	}

	for (const [element, figma] of taken) {
		checkContainer({
			figma,
			element,
			style: styleOf(element, sassByClass),
			region,
			issues,
			pugRel,
		});
	}

	if (taken.size === 0) {
		skipped.push({
			region: region.folder,
			reason: "No auto-layout frame had 2+ matched text anchors — geometry unverified",
		});
	}

	checkOverlays(collectOverlays(subtree), sectionRoot, region, issues, pugRel);
	checkRawOffsets(sectionRoot, region, issues, pugRel, sassByClass);

	return { issues, skipped };
}

function auditPage(slug) {
	const jsonPath = path.join(JSON_DIR, `${slug}.json`);
	if (!fs.existsSync(jsonPath)) {
		return { pageSlug: slug, status: "SKIP", regions: 0, issues: [], skipped: [{ reason: "Page JSON missing" }] };
	}

	const pageJson = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
	const regions = (pageJson.meta?.moduleRegions || []).filter((r) => r.regionType !== "shared-ref");
	const counters = { anchorsMatched: 0, anchorsUnmatched: 0 };
	const issues = [];
	const skipped = [];

	for (const region of regions) {
		const result = auditRegion(slug, pageJson, region, counters);
		issues.push(...result.issues);
		skipped.push(...result.skipped);
	}

	const blockers = issues.filter((i) => i.severity === "BLOCKER").length;
	const status = blockers ? "FAIL" : issues.length ? "WARN" : regions.length ? "PASS" : "SKIP";

	return {
		pageSlug: slug,
		status,
		regions: regions.length,
		anchorsMatched: counters.anchorsMatched,
		anchorsUnmatched: counters.anchorsUnmatched,
		issueCount: issues.length,
		issues,
		skipped,
	};
}

function readPageSlugs() {
	return fs
		.readdirSync(JSON_DIR)
		.filter(isPageJsonFile)
		.map((f) => f.replace(/\.json$/i, ""));
}

/**
 * A `--page` run must not wipe the other pages from the report — agent-compiler
 * reads it per page, so stale-but-present beats absent.
 */
function mergeWithPrevious(pages) {
	if (!pageFilter || !fs.existsSync(jsonOut)) return pages;
	try {
		const previous = JSON.parse(fs.readFileSync(jsonOut, "utf8")).pages || [];
		const fresh = new Set(pages.map((p) => p.pageSlug));
		return [...pages, ...previous.filter((p) => !fresh.has(p.pageSlug))].sort((a, b) =>
			a.pageSlug.localeCompare(b.pageSlug),
		);
	} catch {
		return pages;
	}
}

function main() {
	assertBaseWidthMapping();
	const slugs = pageFilter ? [pageFilter] : readPageSlugs();
	const audited = slugs.map(auditPage);
	const pages = mergeWithPrevious(audited);

	const report = {
		generatedAt: new Date().toISOString(),
		designBaseWidthPx: BASE_WIDTH,
		rootFontSizePx: ROOT_FONT,
		summary: {
			pages: pages.length,
			pass: pages.filter((p) => p.status === "PASS").length,
			warn: pages.filter((p) => p.status === "WARN").length,
			fail: pages.filter((p) => p.status === "FAIL").length,
			skip: pages.filter((p) => p.status === "SKIP").length,
			issues: pages.reduce((n, p) => n + (p.issueCount ?? 0), 0),
		},
		pages,
	};

	fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));

	const s = report.summary;
	console.log(`Layout geometry audit: ${s.pass} pass, ${s.warn} warn, ${s.fail} fail (${s.issues} issues)`);
	for (const page of audited) {
		if (page.status === "PASS" || page.status === "SKIP") continue;
		const counts = {};
		for (const issue of page.issues) counts[issue.code] = (counts[issue.code] || 0) + 1;
		const detail = Object.entries(counts)
			.map(([code, n]) => `${code}×${n}`)
			.join(", ");
		console.log(
			`  ${page.pageSlug}: ${page.status} — ${page.anchorsMatched}/${page.anchorsMatched + page.anchorsUnmatched} anchors matched — ${detail}`,
		);
	}

	if (audited.some((p) => p.status === "FAIL")) process.exit(1);
}

main();

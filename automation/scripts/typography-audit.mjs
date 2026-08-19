#!/usr/bin/env node
/**
 * Typography audit: page JSON ty → Pug class → compiled CSS rule
 *
 * Usage:
 *   node automation/scripts/typography-audit.mjs
 *   node automation/scripts/typography-audit.mjs --page home
 *   node automation/scripts/typography-audit.mjs --json-out json/typography-audit.json
 *
 * Reads automation/contract/typography-contract.json (the hand-authored contract,
 * now the sole source of html tag + cssClass semantics) as the single source of
 * truth. Falls back to parser re-simulation if the contract is absent.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { isPageJsonFile } from "./page-json-skip.mjs";

const ROOT = process.cwd();
const JSON_DIR = path.join(ROOT, "json");
const SRC_DIR = path.join(ROOT, "src");
const CSS_PATH = path.join(ROOT, "styles", "tailwind.min.css");
const SYSTEM_PATH = path.join(JSON_DIR, "system-design.json");
const CONTRACT_PATH = path.join(ROOT, "automation", "contract", "typography-contract.json");
const REPORT_MD = path.join(ROOT, "docs", "typography-audit-report.md");
const REPORT_JSON = path.join(ROOT, "json", "typography-audit.json");

const argv = process.argv.slice(2);
const pageFilter = argv.includes("--page") ? argv[argv.indexOf("--page") + 1] : null;
const jsonOut = argv.includes("--json-out")
	? argv[argv.indexOf("--json-out") + 1]
	: REPORT_JSON;

/**
 * Load the hand-authored typography contract
 * (automation/contract/typography-contract.json) — the single source of html
 * tag + cssClass semantics, consumed identically by the DesignTokenIR build.
 *
 * Falls back to buildTypographyMapFallback() if the contract file is missing.
 */
function loadTypographyContract() {
	if (!fs.existsSync(CONTRACT_PATH)) {
		console.warn(
			"[audit] automation/contract/typography-contract.json not found — falling back to parser simulation."
		);
		const systemJson = JSON.parse(fs.readFileSync(SYSTEM_PATH, "utf8"));
		return buildTypographyMapFallback(systemJson);
	}

	const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf8"));
	const byBase = {};

	for (const [baseKey, entry] of Object.entries(contract.typography || {})) {
		byBase[baseKey] = {
			baseKey,
			jsonKey: entry.sourceKey ?? baseKey,
			cssClass: entry.cssClass,
			html: entry.html,
			fontSize: entry.fontSize,
			fontWeight: entry.fontWeight,
			lineHeight: entry.lineHeight,
			lhClass: null,
			font: entry.font,
			fontFamily: null,
			hasMetrics: entry.fontSize !== null,
		};
	}

	return { byBase, collisions: contract.collisions ?? [], tyToEntry: byBase };
}

/**
 * Fallback: re-simulates the pre-IR Figma TEXT parser.
 * Only used when the hand-authored typography contract is absent.
 */
function buildTypographyMapFallback(systemJson) {
	const styles = systemJson.tokens?.styles || {};
	const fontFamilies = systemJson.tokens?.fontFamilies || {};
	const byBase = {};
	const collisions = [];

	for (const key of Object.keys(styles)) {
		const val = styles[key];
		if (val.t !== "TEXT") continue;

		const baseKey = key.split("#")[0];
		const fontNameMatch = baseKey.match(/([^/]+)\//);
		const group = fontNameMatch ? fontNameMatch[1].toLowerCase() : "heading";
		const nameMatch = baseKey.match(/\/([^/#]+)/);
		const rawName = nameMatch ? nameMatch[1] : baseKey;
		const cssClass = rawName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");

		const entry = {
			baseKey,
			jsonKey: key,
			cssClass,
			html: group === "heading" ? "h4" : "div",
			fontSize: val.fontSize ?? null,
			fontWeight: val.fontWeight ?? null,
			lineHeight: val.lineHeight ?? null,
			lhClass: val.lhClass ?? null,
			font: val.font ?? null,
			fontFamily: val.font ? fontFamilies[val.font] ?? null : null,
			hasMetrics: typeof val.fontSize === "number",
		};

		if (!byBase[baseKey]) {
			byBase[baseKey] = entry;
		} else if (entry.hasMetrics) {
			const prev = byBase[baseKey];
			const sig = (e) =>
				`${e.fontSize}|${e.fontWeight}|${e.lineHeight}|${e.font}`;
			if (sig(prev) !== sig(entry)) {
				collisions.push({
					baseKey,
					winner: prev.jsonKey,
					loser: key,
					winnerMetrics: {
						fontSize: prev.fontSize,
						fontWeight: prev.fontWeight,
						lineHeight: prev.lineHeight,
						font: prev.font,
					},
					loserMetrics: {
						fontSize: entry.fontSize,
						fontWeight: entry.fontWeight,
						lineHeight: entry.lineHeight,
						font: entry.font,
					},
				});
			}
		}
	}

	return { byBase, collisions, tyToEntry: byBase };
}

function cssHasClass(css, className) {
	if (!className) return false;
	const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`\\.${escaped}\\s*\\{`).test(css);
}

function cssClassRules(css, className) {
	if (!className || !cssHasClass(css, className)) return null;
	const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = css.match(
		new RegExp(`\\.${escaped}\\s*\\{([^}]+)\\}`, "s")
	);
	if (!match) return null;
	const block = match[1];
	const pick = (prop) => {
		const m = block.match(new RegExp(`${prop}\\s*:\\s*([^;]+);`));
		return m ? m[1].trim() : null;
	};
	return {
		fontSize: pick("font-size"),
		fontWeight: pick("font-weight"),
		lineHeight: pick("line-height"),
		fontFamily: pick("font-family"),
		color: pick("color"),
	};
}

function normalizeText(s) {
	return (s || "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

const TYPO_CLASS_RE =
	/\b(heading(?:-serif)?-\d+|heading-banner|body-\d+|body-18-medium|display-\d+(?:-upper)?|signature-\d+|subheader-\d+|fs[0-9a-z-]+|banner-\d+|\d+-regular|\d+-semibold|48-semi-bold|t\d+-[0-9a-z-]+)\b/g;

function extractTypographyClassesFromLine(line) {
	const found = line.match(TYPO_CLASS_RE);
	return found ? [...new Set(found)] : [];
}

function collectPugSources(pageSlug) {
	const sources = [];
	const pagePug = path.join(SRC_DIR, "pages", `${pageSlug}.pug`);
	if (fs.existsSync(pagePug)) {
		sources.push({ file: pagePug, rel: path.relative(ROOT, pagePug) });
	}

	const modulesDir = path.join(SRC_DIR, "modules", pageSlug);
	if (fs.existsSync(modulesDir)) {
		for (const dir of walkDirs(modulesDir)) {
			for (const name of ["index.pug", `${pageSlug}.pug`]) {
				const f = path.join(dir, name);
				if (fs.existsSync(f)) {
					sources.push({ file: f, rel: path.relative(ROOT, f) });
				}
			}
		}
		// home is special: index.pug lives directly in modules/home/
		const homeIndex = path.join(modulesDir, "index.pug");
		if (fs.existsSync(homeIndex) && !sources.some((s) => s.file === homeIndex)) {
			sources.push({ file: homeIndex, rel: path.relative(ROOT, homeIndex) });
		}
	}

	// Dedupe
	const seen = new Set();
	return sources.filter((s) => {
		if (seen.has(s.file)) return false;
		seen.add(s.file);
		return true;
	});
}

function walkDirs(root) {
	const out = [root];
	for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
		if (ent.isDirectory()) out.push(...walkDirs(path.join(root, ent.name)));
	}
	return out;
}

function loadPugCorpus(sources) {
	const lines = [];
	for (const src of sources) {
		const content = fs.readFileSync(src.file, "utf8");
		content.split("\n").forEach((line, i) => {
			lines.push({
				file: src.rel,
				line: i + 1,
				text: line,
				normalized: normalizeText(line),
			});
		});
	}
	return lines;
}

function findPugMatches(pugLines, tx) {
	const needle = normalizeText(tx);
	if (!needle || needle.length < 2) return [];
	return pugLines.filter((l) => l.normalized.includes(needle));
}

function walkPageTextNodes(tree) {
	const nodes = [];
	function walk(n) {
		if (!n || typeof n !== "object") return;
		if (n.t === "TEXT" && n.ty && n.tx !== undefined) {
			const ty = n.ty.split("#")[0];
			nodes.push({
				ty,
				tx: String(n.tx).trim(),
				n: n.n || null,
				font: n.font || null,
			});
		}
		if (Array.isArray(n.ch)) n.ch.forEach(walk);
	}
	if (Array.isArray(tree)) tree.forEach(walk);
	else walk(tree);
	return nodes;
}

function pageSlugFromFile(filename) {
	return filename.replace(/\.json$/, "");
}

function resolveTyEntry(ty, tyMap) {
	return tyMap[ty] || null;
}

function auditPage(pageSlug, pageJson, tyMap, css, pugLines) {
	const issues = [];
	const passes = [];
	const skipped = [];

	const textNodes = walkPageTextNodes(pageJson.tree || []);
	const pugSources = collectPugSources(pageSlug);

	if (pugSources.length === 0) {
		return {
			pageSlug,
			meta: pageJson.meta || {},
			pugSources: [],
			textNodeCount: textNodes.length,
			status: "NO_PUG",
			issues: [
				{
					severity: "BLOCKER",
					code: "NO_PUG_SOURCES",
					message: `No Pug sources found for page slug "${pageSlug}"`,
					fix: `Create src/pages/${pageSlug}.pug and src/modules/${pageSlug}/**/index.pug`,
				},
			],
			passes: [],
			skipped,
		};
	}

	// Dedupe text nodes by ty+tx for audit (report count of unique checks)
	const seen = new Set();
	const uniqueNodes = textNodes.filter((n) => {
		const k = `${n.ty}::${normalizeText(n.tx)}`;
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});

	for (const node of uniqueNodes) {
		const entry = resolveTyEntry(node.ty, tyMap);

		if (!entry) {
			issues.push({
				severity: "BLOCKER",
				code: "TY_UNMAPPED",
				ty: node.ty,
				tx: node.tx.slice(0, 120),
				message: `ty "${node.ty}" not found in typography map`,
				fix: 'Run npm run extract; verify token exists in json/system-design.json tokens.styles',
			});
			continue;
		}

		// Icon-font TEXT nodes are glyphs, not typography component classes (automation/agent-rules/02-typography.md)
		if (
			node.ty.includes("Font Awesome") ||
			node.font === "icon" ||
			node.font === "icon2" ||
			node.font === "icon3"
		) {
			skipped.push({
				ty: node.ty,
				tx: node.tx.slice(0, 80),
				reason: "Icon font node — use i.fa-solid / i.fa-brands, not .heading-* / .body-*",
			});
			continue;
		}

		if (!entry.hasMetrics) {
			skipped.push({
				ty: node.ty,
				tx: node.tx.slice(0, 80),
				reason: "TEXT token has no fontSize in system-design.json",
			});
			continue;
		}

		const expectedClass = entry.cssClass;
		const cssPresent = cssHasClass(css, expectedClass);
		const cssRules = cssClassRules(css, expectedClass);

		const pugMatches = findPugMatches(pugLines, node.tx);

		if (pugMatches.length === 0) {
			// Before reporting a hard HIGH, check whether the expected class already
			// appears in Pug — this happens when copy is rendered via `each` loops or
			// `= variable` expressions (dynamic content). Text is not a literal string
			// on the same line as the class, so substring search finds nothing.
			const classAppearsInPug = pugLines.some(
				(l) => extractTypographyClassesFromLine(l.text).includes(expectedClass)
			);

			if (classAppearsInPug) {
				// Class is present; we just cannot verify the exact copy statically.
				// Downgrade to INFO — human or headless-browser check needed.
				issues.push({
					severity: "INFO",
					code: "TX_DYNAMIC_POSSIBLE",
					ty: node.ty,
					tx: node.tx.slice(0, 120),
					expectedClass,
					css: { present: cssPresent, rules: cssRules },
					message: `Class .${expectedClass} found in Pug but copy not as literal — likely dynamic (each / = var). Verify manually.`,
					fix: `Confirm the loop body or data source produces the correct copy at runtime`,
				});
			} else {
				issues.push({
					severity: "HIGH",
					code: "TX_NOT_IN_PUG",
					ty: node.ty,
					tx: node.tx.slice(0, 120),
					expectedClass,
					expectedTag: entry.html,
					expectedMetrics: {
						fontSize: entry.fontSize,
						fontWeight: entry.fontWeight,
						lineHeight: entry.lineHeight,
						font: entry.font,
						fontFamily: entry.fontFamily,
					},
					css: { present: cssPresent, rules: cssRules },
					message: `Copy not found in Pug sources for page "${pageSlug}"`,
					fix: `Add node with ty=${node.ty} and exact tx, class .${expectedClass}`,
				});
			}
			continue;
		}

		const classified = pugMatches.map((match) => {
			const foundClasses = extractTypographyClassesFromLine(match.text);
			return {
				match,
				foundClasses,
				classOk: foundClasses.includes(expectedClass),
				hasWrongClass: foundClasses.length > 0 && !foundClasses.includes(expectedClass),
				hasNoClass: foundClasses.length === 0,
			};
		});
		const hasCorrectMatch = classified.some((c) => c.classOk);
		// Prefer exact class matches; substring collisions (short labels inside longer
		// copy) should not BLOCK when the authored node is already correctly classed.
		const matchesToCheck = hasCorrectMatch
			? classified.filter((c) => c.classOk)
			: classified;

		for (const { match, foundClasses, classOk, hasWrongClass, hasNoClass } of matchesToCheck) {
			if (!cssPresent) {
				issues.push({
					severity: "BLOCKER",
					code: "CSS_CLASS_MISSING",
					ty: node.ty,
					tx: node.tx.slice(0, 120),
					expectedClass,
					pugFile: match.file,
					pugLine: match.line,
					pugSnippet: match.text.trim().slice(0, 200),
					foundClasses,
					css: { present: false, rules: null },
					message: `Expected .${expectedClass} not in styles/tailwind.min.css`,
					fix: `Rebuild CSS (npm run tokens && npm run prod); ensure emit:typography emits .${expectedClass}`,
				});
			}

			if (hasNoClass) {
				issues.push({
					severity: "HIGH",
					code: "PUG_NO_TYPO_CLASS",
					ty: node.ty,
					tx: node.tx.slice(0, 120),
					expectedClass,
					expectedTag: entry.html,
					pugFile: match.file,
					pugLine: match.line,
					pugSnippet: match.text.trim().slice(0, 200),
					foundClasses: [],
					css: { present: cssPresent, rules: cssRules },
					message: `Pug line has copy but no typography component class`,
					fix: `Add .${expectedClass} to element (one class per text node)`,
				});
			} else if (hasWrongClass) {
				issues.push({
					severity: "BLOCKER",
					code: "PUG_CLASS_MISMATCH",
					ty: node.ty,
					tx: node.tx.slice(0, 120),
					expectedClass,
					expectedTag: entry.html,
					expectedMetrics: {
						fontSize: entry.fontSize,
						fontWeight: entry.fontWeight,
						lineHeight: entry.lineHeight,
						font: entry.font,
					},
					pugFile: match.file,
					pugLine: match.line,
					pugSnippet: match.text.trim().slice(0, 200),
					foundClasses,
					css: { present: cssPresent, rules: cssRules },
					message: `Pug uses .${foundClasses.join(", .")} but JSON ty requires .${expectedClass}`,
					fix: `Replace with .${expectedClass}; tag should be <${entry.html}> per typography contract / generated/agent-lookup.json`,
				});
			} else if (cssPresent) {
				passes.push({
					ty: node.ty,
					tx: node.tx.slice(0, 80),
					expectedClass,
					pugFile: match.file,
					pugLine: match.line,
					cssRules,
				});
			}
		}
	}

	// Reverse check: typography classes in Pug not justified by any JSON ty on this page
	const pageTySet = new Set(textNodes.map((n) => n.ty.split("#")[0]));
	const expectedClasses = new Set(
		[...pageTySet]
			.map((ty) => resolveTyEntry(ty, tyMap)?.cssClass)
			.filter(Boolean)
	);

	for (const line of pugLines) {
		const classes = extractTypographyClassesFromLine(line.text);
		for (const cls of classes) {
			if (!expectedClasses.has(cls)) {
				issues.push({
					severity: "MEDIUM",
					code: "PUG_ORPHAN_TYPO_CLASS",
					foundClass: cls,
					pugFile: line.file,
					pugLine: line.line,
					pugSnippet: line.text.trim().slice(0, 200),
					message: `Class .${cls} in Pug but no page JSON TEXT node maps to it`,
					fix: `Remove invented class or align page JSON ty; if Local/* token, use parser cssClass from DESIGN_LOOKUP`,
				});
			}
		}
	}

	const blockers = issues.filter((i) => i.severity === "BLOCKER").length;
	const status =
		blockers > 0 ? "FAIL" : issues.length > 0 ? "WARN" : "PASS";

	return {
		pageSlug,
		meta: pageJson.meta || {},
		pugSources: pugSources.map((s) => s.rel),
		textNodeCount: textNodes.length,
		uniqueChecks: uniqueNodes.length,
		passCount: passes.length,
		issueCount: issues.length,
		status,
		issues,
		passes,
		skipped,
	};
}

function listPageJsonFiles() {
	return fs
		.readdirSync(JSON_DIR)
		.filter(isPageJsonFile)
		.map((f) => pageSlugFromFile(f));
}

function buildMarkdownReport(report) {
	const lines = [];
	lines.push("# Typography Audit Report");
	lines.push("");
	lines.push(`Generated: ${report.generatedAt}`);
	lines.push(`CSS file: \`${report.cssFile}\` (${report.cssExists ? "found" : "MISSING"})`);
	lines.push("");
	lines.push("## Executive summary");
	lines.push("");
	lines.push(`| Metric | Value |`);
	lines.push(`|--------|-------|`);
	lines.push(`| Pages audited | ${report.pages.length} |`);
	lines.push(`| Pages with Pug | ${report.pages.filter((p) => p.pugSources.length).length} |`);
	lines.push(`| Pages PASS | ${report.pages.filter((p) => p.status === "PASS").length} |`);
	lines.push(`| Pages WARN | ${report.pages.filter((p) => p.status === "WARN").length} |`);
	lines.push(`| Pages FAIL | ${report.pages.filter((p) => p.status === "FAIL").length} |`);
	lines.push(`| Pages NO_PUG | ${report.pages.filter((p) => p.status === "NO_PUG").length} |`);
	lines.push(`| Typography baseKey collisions | ${report.system.collisions.length} |`);
	lines.push(`| Parser classes missing from CSS | ${report.system.missingCssClasses.length} |`);
	lines.push("");
	lines.push("## For resolving agent — priority order");
	lines.push("");
	lines.push("1. Fix **BLOCKER** `CSS_CLASS_MISSING` — run `npm run tokens && npm run prod` so `generated/typography.js` is emitted into CSS");
	lines.push("2. Fix **BLOCKER** `PUG_CLASS_MISMATCH` — apply `expectedClass` from `ty` lookup");
	lines.push("3. Fix **HIGH** `TX_NOT_IN_PUG` — page markup does not match page JSON copy");
	lines.push("4. Fix **MEDIUM** `PUG_ORPHAN_TYPO_CLASS` — remove invented classes (`display-*`, `signature-*`, etc.)");
	lines.push("5. Resolve **system collisions** — same `baseKey`, different metrics; parser keeps first only");
	lines.push("");
	lines.push("Re-run: `node automation/scripts/typography-audit.mjs`");
	lines.push("");

	if (report.system.collisions.length) {
		lines.push("## System: ty baseKey collisions (parser first-wins)");
		lines.push("");
		for (const c of report.system.collisions) {
			lines.push(`- **${c.baseKey}** — winner \`${c.winner}\` (${JSON.stringify(c.winnerMetrics)}) loses \`${c.loser}\` (${JSON.stringify(c.loserMetrics)})`);
		}
		lines.push("");
	}

	if (report.system.missingCssClasses.length) {
		lines.push("## System: typography classes not in compiled CSS");
		lines.push("");
		lines.push(`${report.system.missingCssClasses.length} parser classes absent from \`${report.cssFile}\`:`
		);
		lines.push("");
		lines.push(report.system.missingCssClasses.map((c) => `\`${c}\``).join(", "));
		lines.push("");
	}

	for (const page of report.pages) {
		lines.push(`## Page: \`${page.pageSlug}\` — ${page.status}`);
		lines.push("");
		lines.push(`- Meta file: ${page.meta.file ?? "UNKNOWN"}`);
		lines.push(`- Pug: ${page.pugSources.length ? page.pugSources.join(", ") : "NONE"}`);
		lines.push(`- TEXT nodes: ${page.textNodeCount} (${page.uniqueChecks ?? 0} unique ty+tx checks)`);
		lines.push(`- Pass: ${page.passCount ?? 0} | Issues: ${page.issueCount ?? 0}`);
		lines.push("");

		if (page.issues?.length) {
			const byCode = {};
			for (const i of page.issues) {
				byCode[i.code] = byCode[i.code] || [];
				byCode[i.code].push(i);
			}
			for (const [code, items] of Object.entries(byCode)) {
				lines.push(`### ${code} (${items.length})`);
				lines.push("");
				for (const item of items.slice(0, 25)) {
					lines.push(`- **[${item.severity}]** ${item.message}`);
					if (item.ty) lines.push(`  - ty: \`${item.ty}\` → expected \`.${item.expectedClass}\`${item.expectedTag ? `, tag \`<${item.expectedTag}>\`` : ""}`);
					if (item.tx) lines.push(`  - tx: "${item.tx}"`);
					if (item.foundClasses?.length) lines.push(`  - found: \`.${item.foundClasses.join("`, `.")}\``);
					if (item.pugFile) lines.push(`  - pug: \`${item.pugFile}:${item.pugLine}\``);
					if (item.fix) lines.push(`  - fix: ${item.fix}`);
				}
				if (items.length > 25) {
					lines.push(`- … and ${items.length - 25} more (see JSON report)`);
				}
				lines.push("");
			}
		}
	}

	const orphanJson = report.orphanJsonPages || [];
	if (orphanJson.length) {
		lines.push("## JSON without Pug entry");
		lines.push("");
		for (const slug of orphanJson) {
			lines.push(`- \`json/${slug}.json\` — no \`src/pages/${slug}.pug\``);
		}
		lines.push("");
	}

	return lines.join("\n");
}

function main() {
	const { byBase, collisions } = loadTypographyContract();
	const tyMap = byBase;

	const cssExists = fs.existsSync(CSS_PATH);
	const css = cssExists ? fs.readFileSync(CSS_PATH, "utf8") : "";

	const allParserClasses = [
		...new Set(
			Object.values(tyMap)
				.filter((e) => e.hasMetrics)
				.map((e) => e.cssClass)
		),
	];
	const missingCssClasses = allParserClasses.filter(
		(c) => !cssHasClass(css, c)
	);

	let pageSlugs = listPageJsonFiles();
	if (pageFilter) {
		pageSlugs = pageSlugs.filter((s) => s === pageFilter);
		if (!pageSlugs.length) {
			console.error(`No json/${pageFilter}.json found`);
			process.exit(1);
		}
	}

	const pages = [];
	const builtSlugs = new Set(
		fs
			.readdirSync(path.join(SRC_DIR, "pages"))
			.filter((f) => f.endsWith(".pug") && !f.startsWith("_"))
			.map((f) => f.replace(/\.pug$/, ""))
	);

	for (const slug of pageSlugs) {
		const pagePath = path.join(JSON_DIR, `${slug}.json`);
		const pageJson = JSON.parse(fs.readFileSync(pagePath, "utf8"));
		const pugSources = collectPugSources(slug);
		const pugLines = loadPugCorpus(pugSources);
		pages.push(auditPage(slug, pageJson, tyMap, css, pugLines));
	}

	const orphanJsonPages = pageSlugs.filter((s) => !builtSlugs.has(s));

	const report = {
		generatedAt: new Date().toISOString(),
		cssFile: path.relative(ROOT, CSS_PATH),
		cssExists,
		system: {
			typographyBaseKeys: Object.keys(tyMap).length,
			parserClassesWithMetrics: allParserClasses.length,
			collisions,
			missingCssClasses,
		},
		orphanJsonPages,
		pages,
	};

	fs.mkdirSync(path.dirname(REPORT_MD), { recursive: true });
	fs.writeFileSync(REPORT_MD, buildMarkdownReport(report), "utf8");
	fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), "utf8");

	console.log(`\nTypography audit complete`);
	console.log(`  Markdown: ${path.relative(ROOT, REPORT_MD)}`);
	console.log(`  JSON:     ${path.relative(ROOT, jsonOut)}`);
	console.log(`  Pages:    ${pages.length} | FAIL: ${pages.filter((p) => p.status === "FAIL").length} | WARN: ${pages.filter((p) => p.status === "WARN").length}`);
	console.log(`  Missing CSS classes: ${missingCssClasses.length}/${allParserClasses.length}`);
	process.exit(pages.some((p) => p.status === "FAIL") ? 1 : 0);
}

main();

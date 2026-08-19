import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { expandSectionManifest, isBreadcrumbNode } from './module-regions.mjs';
import { isPageJsonFile } from './page-json-skip.mjs';

// ─── Configuration paths ───────────────────────────────────────────────────────
const JSON_DIR            = './json';
const SYSTEM_DESIGN_PATH  = './json/system-design.json';
const TAILWIND_CONFIG_PATH = './tailwind.config.js';
const TEMPLATE_PATH       = './automation/prompt/prompt.md';
const OUTPUT_PROMPT_PATH  = './agent-coding-prompt.txt';
const CHECKLIST_PATH      = './automation/agent-rules/10-checklist.md';
const MANIFEST_PATH       = './src/core/design-system/manifest.json';
const PAGE_CONTRACT_PATH  = './automation/reference/page-contract.json';
const REFERENCE_DIR       = './automation/reference/snippets';
const REFERENCE_PAGE_PUG  = './automation/reference/snippets/page-entry.pug';

const LAYOUT_STRIP_REFS = new Set(['header', 'footer']);

function resolveLayoutChromeKey(node) {
	if (!node || node.t !== 'INSTANCE') return null;
	const name = (node.n || '').toLowerCase();
	const ref = (node.ref || '').toLowerCase();
	if (/^footer\b/.test(name) || /^footer\//.test(ref)) return 'footer';
	if (/^header\d*$/.test(name) || /^header\b/.test(name) || /^header/.test(ref)) return 'header';
	if (/top[-_]?banner/.test(name)) return 'top-banner';
	if (/global[-_]?breadcrumb/.test(name) || /\bbreadcrumb\b/.test(name)) return 'global-breadcrumb';
	return null;
}

function processLayoutChromeInTree(node) {
	if (!node || typeof node !== 'object') return node;
	if (Array.isArray(node.ch)) {
		const next = [];
		for (const child of node.ch) {
			const chrome = resolveLayoutChromeKey(child);
			if (chrome && LAYOUT_STRIP_REFS.has(chrome)) continue;
			if (chrome === 'top-banner' || chrome === 'global-breadcrumb') {
				next.push({ t: 'SHARED_REF', ref: chrome });
				continue;
			}
			if (isBreadcrumbNode(child)) {
				next.push({ t: 'SHARED_REF', ref: 'global-breadcrumb' });
				continue;
			}
			const processed = processLayoutChromeInTree(child);
			if (processed) next.push(processed);
		}
		node.ch = next;
	}
	return node;
}

function buildReferencePug() {
	try {
		const contractNote = fs.existsSync(PAGE_CONTRACT_PATH)
			? '> Structural contract: `automation/reference/page-contract.json` — **authoritative for folder layout**.\n'
			: '';
		const legacyNote = [
			'> **Do not copy** `src/modules/home/index.pug` structure (legacy monolith).',
			'> Typography in snippets uses token classes — apply `ty` from DESIGN_LOOKUP for real pages.',
			'',
		].join('\n');

		const parts = [contractNote + legacyNote];

		if (fs.existsSync(REFERENCE_PAGE_PUG)) {
			parts.push('### Page entry (thin — includes only)\n', '```pug');
			parts.push(fs.readFileSync(REFERENCE_PAGE_PUG, 'utf8').trimEnd());
			parts.push('```', '');
		}

		const moduleDirs = ['hero', 'cta'];
		for (const section of moduleDirs) {
			const pugPath = path.join(REFERENCE_DIR, 'modules', section, 'index.pug');
			const sassPath = path.join(REFERENCE_DIR, 'modules', section, 'index.sass');
			if (!fs.existsSync(pugPath)) continue;
			parts.push(`### Module: \`{page}/${section}/\` (one section root per file)\n`);
			parts.push('```pug');
			parts.push(fs.readFileSync(pugPath, 'utf8').trimEnd());
			parts.push('```');
			if (fs.existsSync(sassPath)) {
				parts.push('', '```sass');
				parts.push(fs.readFileSync(sassPath, 'utf8').trimEnd());
				parts.push('```');
			}
			parts.push('');
		}

		parts.push(
			'### Shared chrome (do not scaffold a page module)\n',
			'> Breadcrumb / top-banner arrive as `SHARED_REF` — include the shared component from the **page entry**, never generate `src/modules/{page}/breadcrumb/`.\n',
			'```pug',
			"include ../components/breadcrumb/index.pug  //- SHARED_REF ref=\"global-breadcrumb\"",
			"include ../components/banner/index.pug      //- SHARED_REF ref=\"top-banner\" (when present)",
			'```',
			'',
		);

		const goldStandardDirs = ['grid-example', 'tabs-example'];
		const goldPugChunks = [];
		for (const section of goldStandardDirs) {
			const pugPath = path.join(REFERENCE_DIR, 'modules', section, 'index.pug');
			if (!fs.existsSync(pugPath)) continue;
			goldPugChunks.push(fs.readFileSync(pugPath, 'utf8').trimEnd());
		}
		if (goldPugChunks.length > 0) {
			parts.push('### Gold standard reference (layout & interactive tabs)\n');
			parts.push('```pug');
			parts.push('//- GOLD STANDARD REFERENCE');
			parts.push(goldPugChunks.join('\n\n'));
			parts.push('```', '');
		}

		if (parts.length <= 2) {
			return '(reference snippets not found: automation/reference/snippets/)';
		}
		return parts.join('\n');
	} catch (_) {
		return '(could not read automation/reference snippets)';
	}
}

function buildComponentManifest() {
	try {
		if (!fs.existsSync(MANIFEST_PATH)) return '(manifest not found)';
		const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
		const rows = Object.entries(manifest.components || {}).map(
			([figmaName, val]) => `| ${figmaName} | +${val.mixin} | ${val.cssRoot || ''} |`
		);
		if (!rows.length) return '(no component mixins defined)';
		return [
			'| Figma INSTANCE name | Pug mixin | CSS root |',
			'|---------------------|-----------|----------|',
			...rows,
		].join('\n');
	} catch (_) {
		return '(could not read manifest)';
	}
}

// ─── OPT-1: Design system lookup (DesignTokenIR) ──────────────────────────────
// generated/agent-lookup.json is the single source for ty/fi, derived from
// tokens/normalized.json (npm run emit:agent-lookup). Carries cssClass + html
// tag (incl. recovered serif headings) and fi → Tailwind stems.
const AGENT_LOOKUP_PATH = './generated/agent-lookup.json';

function loadAgentLookup() {
	try {
		return JSON.parse(fs.readFileSync(AGENT_LOOKUP_PATH, 'utf8'));
	} catch (_) {
		return null;
	}
}

// Adapt generated lookup { ty: { key: {class, tag} } } into the
// contractTypography shape { key: { cssClass, html } } the existing builders use.
function contractFromLookup(lookup) {
	const out = {};
	for (const [key, v] of Object.entries(lookup?.ty ?? {})) {
		out[key] = { cssClass: v.class, html: v.tag };
	}
	return out;
}

// ─── Solution A4: hex → fi reverse lookup (compile-time safety net) ───────────
// extract.mjs resolves unlinked solid fills at export time; this pass re-applies
// the same rule when assembling the agent prompt so stale page JSON and the
// token audit see semantic `fi` when the hex exists in:
//   1) json/system-design.json FILL styles
//   2) automation/config/manual-fill-tokens.json (no Figma paint style required)
//   3) exact hex match in tailwind.config.js theme colors (already shippable)
//
// Safety: only runs when `!node.fi && node.c` and `c` is a solid `#hex` (not
// `gradient:*`). Never overwrites an existing `fi`. Gradients use `fi: Gradient/*`
// from Figma styles — they never arrive as `c` from extract.

const MANUAL_FILL_TOKENS_PATH = './automation/config/manual-fill-tokens.json';

function loadManualFillTokens() {
	try {
		if (!fs.existsSync(MANUAL_FILL_TOKENS_PATH)) return {};
		const raw = JSON.parse(fs.readFileSync(MANUAL_FILL_TOKENS_PATH, 'utf8'));
		const out = {};
		for (const [k, v] of Object.entries(raw)) {
			if (k.startsWith('_')) continue;
			if (typeof v === 'string' && v.startsWith('#')) out[k] = v;
		}
		return out;
	} catch (_) {
		return {};
	}
}

/** Grey/d9 → grey-d9 (matches agent-lookup / TW utility stems for non-utility groups). */
function fiKeyToStem(fiKey) {
	return String(fiKey)
		.split('#')[0]
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Walk nested theme.colors → Map<#hex, { fi, stem }> (first wins). */
function buildTwHexToFiMap(colors, parts = [], map = new Map()) {
	for (const [key, val] of Object.entries(colors ?? {})) {
		const next = [...parts, key];
		if (typeof val === 'string' && val.startsWith('#')) {
			const hex = val.toLowerCase();
			if (map.has(hex)) continue;
			const stem = next.join('-');
			const head = next[0];
			const fi =
				next.length === 1
					? head.charAt(0).toUpperCase() + head.slice(1)
					: `${head.charAt(0).toUpperCase() + head.slice(1)}/${next.slice(1).join('/')}`;
			map.set(hex, { fi, stem });
		} else if (val && typeof val === 'object' && !Array.isArray(val)) {
			buildTwHexToFiMap(val, next, map);
		}
	}
	return map;
}

function buildHexToFiMap(styles, manualFills = {}) {
	const map = new Map();
	for (const [name, color] of Object.entries(manualFills)) {
		map.set(color.toLowerCase(), name);
	}
	for (const [key, val] of Object.entries(styles ?? {})) {
		if (val?.t === 'FILL' && typeof val.color === 'string' && val.color.startsWith('#')) {
			const hex = val.color.toLowerCase();
			if (!map.has(hex)) map.set(hex, key.split('#')[0]);
		}
	}
	return map;
}

function resolveHexFillsInTree(node, hexToFi, twHexToFi) {
	if (!node || typeof node !== 'object') return node;

	if (
		!node.fi &&
		typeof node.c === 'string' &&
		node.c.startsWith('#')
	) {
		const hex = node.c.toLowerCase();
		const fromStyles = hexToFi.get(hex);
		if (fromStyles) {
			node.fi = fromStyles;
			delete node.c;
		} else {
			const fromTw = twHexToFi?.get(hex);
			if (fromTw) {
				node.fi = fromTw.fi;
				delete node.c;
			}
		}
	}

	if (node.t === 'REPEAT' && node.sample) {
		node.sample = resolveHexFillsInTree(node.sample, hexToFi, twHexToFi);
	}

	if (Array.isArray(node.ch)) {
		node.ch = node.ch.map((child) => resolveHexFillsInTree(child, hexToFi, twHexToFi));
	}

	return node;
}

function loadHexToFiMap(manualFills) {
	try {
		const styles = fs.existsSync(SYSTEM_DESIGN_PATH)
			? JSON.parse(fs.readFileSync(SYSTEM_DESIGN_PATH, 'utf8')).tokens?.styles ?? {}
			: {};
		return buildHexToFiMap(styles, manualFills);
	} catch (_) {
		return buildHexToFiMap({}, manualFills);
	}
}

function applyHexToFiResolution(tree, hexToFi, twHexToFi) {
	return tree.map((n) =>
		resolveHexFillsInTree(JSON.parse(JSON.stringify(n)), hexToFi, twHexToFi)
	);
}

/** Ensure DESIGN_LOOKUP / audit can resolve manually or TW-matched fi keys. */
function injectFiStems(fiMap, manualFills, twHexToFi) {
	for (const name of Object.keys(manualFills)) {
		if (!fiMap[name]) fiMap[name] = fiKeyToStem(name);
	}
	for (const { fi, stem } of twHexToFi.values()) {
		if (!fiMap[fi]) fiMap[fi] = stem;
	}
}

// ─── OPT-2: PAGE_JSON pruner ──────────────────────────────────────────────────
// Strips canvas noise that the agent cannot act on:
//   • VECTOR / BOOLEAN_OPERATION  → entirely removed (SVG paths, no codegen value)
//   • LINE                        → kept as a minimal {t:"LINE"} sentinel → <hr>
//   • b.x / b.y                   → dropped (canvas-absolute; layout uses `al`)
//   • ef (effects)                → dropped (never referenced in any codegen rule)
//   • ref / set on INSTANCE       → dropped (Figma variant keys, not used)
//   • lhClass, lsClass, textCase, alignH, alignV,
//     lineHeight, letterSpacing, fontWeight on TEXT → dropped (ty class handles all)
//   • Auto-generated Frame names  → dropped (signal-to-noise ratio near zero)
//   • c (unlinked raw hex fill)   → KEPT only when `fi` is absent (see below) —
//     this is the one exception to "never surface hex": the agent must see it
//     to comply with 01-layout-agent.md §A ("never guess a color") and
//     03-colors-gradients.md ("no exact token → add one first, don't guess").
//     PAGE_TOKEN_AUDIT also flags these as NO_TOKEN so they aren't missed.
//
// SHARED_REF nodes keep their `ref` field — that is the Pug include path key.
// REPEAT deduplication collapses consecutive same-name INSTANCE siblings into
// {t:"REPEAT", count:N, sample:{...}} so the agent unrolls them N times.

const STRIP_TYPES    = new Set(['VECTOR', 'BOOLEAN_OPERATION']);
const AUTO_FRAME_RE  = /^Frame \d+$/;

function pruneBounds(b) {
	if (!b) return undefined;
	const out = { w: b.width, h: b.height }; // drop x, y
	// Omit zero-dimension bounds (e.g. LINE nodes already handled separately)
	if (out.w === undefined && out.h === undefined) return undefined;
	return out;
}

function pruneNode(node) {
	if (!node || typeof node !== 'object') return null;

	// Hard-remove types with no codegen value
	if (STRIP_TYPES.has(node.t)) return null;

	// LINE → minimal sentinel; agent renders <hr>
	if (node.t === 'LINE') return { t: 'LINE' };

	const out = { t: node.t };

	// Name: skip auto-generated "Frame XXXXXXXX" labels (pure noise)
	if (node.n && !AUTO_FRAME_RE.test(node.n)) out.n = node.n;

	// Bounds: width + height only (strip canvas x/y)
	const b = pruneBounds(node.b);
	if (b) out.b = b;

	// Auto-layout: keep ALL sub-fields intact — agent needs every one of them
	// to derive flex direction, gap, padding, and sizing behaviour.
	// DO NOT rename these fields; prompt rules reference them by name.
	if (node.al) out.al = node.al;

	// Fill token: strip Figma node-id suffix (e.g. "Primary/1#12006:1619" → "Primary/1")
	if (node.fi) out.fi = node.fi.split('#')[0];

	// Unlinked raw hex fill — no design-system style attached in Figma.
	// Only surfaced when there is no `fi` to resolve instead (icons frequently
	// hit this: e.g. {"tx":"check","font":"icon","c":"#6dbc77"}).
	// Never render this hex directly — sync/add a token first (03-colors-gradients.md).
	if (!node.fi && node.c) out.c = node.c;

	// Typography token: same suffix strip
	if (node.ty) out.ty = node.ty.split('#')[0];

	// Text content
	if (node.tx !== undefined) out.tx = node.tx;

	// Border radius
	if (node.r !== undefined) out.r = node.r;

	// Icon font marker (icon / icon2 / icon3)
	if (node.font) out.font = node.font;

	// INSTANCE component ref (footer/Default, header11, Button 1) — used for layout chrome + mixins
	if (node.t === 'INSTANCE' && node.ref) out.ref = node.ref;

	// SHARED_REF: preserve ref — Pug include path key
	if (node.t === 'SHARED_REF' && node.ref) out.ref = node.ref;
	//   lhClass, lsClass       → redundant with ty class
	//   textCase, alignH, alignV → Figma-only presentation metadata
	//   lineHeight, letterSpacing, fontWeight → ty class handles all
	//   fontSize               → ty class or icon; not used in codegen rules

	// Recurse children with REPEAT deduplication
	if (Array.isArray(node.ch) && node.ch.length > 0) {
		const prunedChildren = node.ch.map(pruneNode).filter(Boolean);
		const deduped = deduplicateInstances(prunedChildren);
		if (deduped.length > 0) out.ch = deduped;
	}

	return out;
}

// Collapse consecutive sibling INSTANCE nodes that share the same name into a
// REPEAT sentinel so the agent doesn't receive 12 identical subtrees.
// The agent rule: REPEAT → render sample.ch exactly count times.
function deduplicateInstances(children) {
	const result = [];
	let i = 0;
	while (i < children.length) {
		const cur = children[i];
		// Only deduplicate named INSTANCE siblings
		if (cur.t === 'INSTANCE' && cur.n) {
			let count = 1;
			while (
				i + count < children.length &&
				children[i + count].t === 'INSTANCE' &&
				children[i + count].n === cur.n
			) {
				count++;
			}
			if (count > 1) {
				result.push({ t: 'REPEAT', name: cur.n, count, sample: cur });
				i += count;
				continue;
			}
		}
		result.push(cur);
		i++;
	}
	return result;
}

// ─── OPT-4: Per-node typography resolution table ──────────────────────────────
// Walks the pruned tree and pre-resolves every TEXT node's ty token into the
// exact cssClass + html tag the agent must use — no inference required.
// The agent receives answers, not a lookup rule to apply under cognitive load.
//
// Format injected into the prompt as {{TYPOGRAPHY_TABLE}}:
//   | Node name           | ty token              | class        | tag |
//   |---------------------|-----------------------|--------------|-----|
//   | "Heading Chính"     | Heading/Heading-1     | heading-1    | h2  |
function buildTypographyTable(tree, contractTypography) {
	const rows = [];

	function walkForText(node) {
		if (!node || typeof node !== 'object') return;
		if (node.t === 'TEXT' && node.ty) {
			const cleanTy = node.ty.split('#')[0];
			if (cleanTy.includes('Font Awesome') || node.font === 'icon' || node.font === 'icon2' || node.font === 'icon3') return;
			const contract = contractTypography[cleanTy];
			const cssClass = contract?.cssClass ?? 'UNKNOWN — run npm run extract';
			const tag = contract?.html ?? '?';
			const nodeName  = (node.n || '(unnamed)').slice(0, 40);
			rows.push({ nodeName, ty: cleanTy, cssClass, tag });
		}
		if (node.t === 'REPEAT' && node.sample) {
			walkForText(node.sample);
			return;
		}
		if (Array.isArray(node.ch)) node.ch.forEach(walkForText);
	}

	if (Array.isArray(tree)) tree.forEach(walkForText);

	if (rows.length === 0) return '(no TEXT nodes with ty tokens found in this page)';

	// Deduplicate by `ty::cssClass` — the injected table is **token-level**, not node-level.
	// Multiple TEXT nodes sharing the same `ty` collapse to one row; the "Node name" column
	// shows whichever node was walked first, not an exhaustive per-node audit list.
	const seen = new Set();
	const unique = rows.filter(r => {
		const k = `${r.ty}::${r.cssClass}`;
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});

	const header = '| Node name | ty token | class | tag |\n|-----------|----------|-------|-----|';
	const body = unique.map(r =>
		`| ${r.nodeName} | \`${r.ty}\` | \`.${r.cssClass}\` | \`<${r.tag}>\` |`
	).join('\n');
	return `${header}\n${body}`;
}

// ─── OPT-3: Section manifest (C16 — uses meta.moduleRegions when present) ───────
function buildSectionManifest(tree, pageSlug, moduleRegions) {
	return expandSectionManifest(moduleRegions, pageSlug, tree);
}

// ─── Audit feedback reader ────────────────────────────────────────────────────
// Reads the audit reports written by previous `npm run audit:*` runs and
// extracts BLOCKER + HIGH issues for the current page. Injected as
// {{AUDIT_FEEDBACK}} so the agent self-corrects on its next run.
const AUDIT_REPORTS = [
	{ path: './json/typography-audit.json', command: 'npm run audit:typography' },
	{ path: './json/layout-geometry-audit.json', command: 'npm run audit:layout' },
];

/** Total issues quoted in the prompt, across all reports. */
const AUDIT_FEEDBACK_LIMIT = 30;

function readCriticalIssues(reportPath, pageSlug) {
	if (!fs.existsSync(reportPath)) return [];
	const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
	const page = (report.pages || []).find(p => p.pageSlug === pageSlug);
	return (page?.issues || []).filter(i => i.severity === 'BLOCKER' || i.severity === 'HIGH');
}

function formatAuditIssue(issue) {
	const lines = [`- [${issue.severity}] \`${issue.code}\`: ${issue.message}`];
	if (issue.ty)                   lines.push(`  - ty: \`${issue.ty}\` → expected \`.${issue.expectedClass}\``);
	if (issue.foundClasses?.length) lines.push(`  - found in Pug: \`.${issue.foundClasses.join('`, `.')}\``);
	if (issue.region)               lines.push(`  - region: \`${issue.region}\`${issue.node ? ` → Figma \`${issue.node}\`` : ''}`);
	if (issue.pugFile)              lines.push(`  - at: \`${issue.pugFile}:${issue.pugLine}\``);
	if (issue.fix)                  lines.push(`  - fix: ${issue.fix}`);
	return lines;
}

function buildAuditFeedback(pageSlug) {
	try {
		const groups = AUDIT_REPORTS
			.map(report => ({ ...report, issues: readCriticalIssues(report.path, pageSlug) }))
			.filter(group => group.issues.length > 0);
		if (groups.length === 0) return '';

		const total = groups.reduce((n, g) => n + g.issues.length, 0);
		const budget = Math.max(1, Math.floor(AUDIT_FEEDBACK_LIMIT / groups.length));

		const lines = [
			'# 0. Previous Audit Issues — Fix These First\n',
			`> These issues were found by ${groups.map(g => `\`${g.command}\``).join(' and ')} on a previous agent run.`,
			'> **Resolve every BLOCKER and HIGH item before writing new code.**\n',
			`**${total} BLOCKER/HIGH issue(s):**\n`,
		];

		for (const group of groups) {
			lines.push(`\n**\`${group.command}\` — ${group.issues.length} issue(s):**\n`);
			for (const issue of group.issues.slice(0, budget)) lines.push(...formatAuditIssue(issue));
			if (group.issues.length > budget) {
				lines.push(`\n- … and ${group.issues.length - budget} more (see ${group.path.replace('./', '')})`);
			}
		}

		lines.push('\n---\n');
		return lines.join('\n');
	} catch (_) {
		return '';
	}
}

// ─── Token replacement utility ────────────────────────────────────────────────
function replaceTokens(template, values) {
	let output = template;
	for (const [key, value] of Object.entries(values)) {
		output = output.replaceAll(`{{${key}}}`, String(value ?? ''));
	}
	return output;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
	try {
		// 1. Verify and read the prompt template
		if (!fs.existsSync(TEMPLATE_PATH)) {
			console.error(`❌ Error: Template not found at "${TEMPLATE_PATH}".`);
			process.exit(1);
		}
		const promptTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');

		// 2. Scan the JSON directory
		if (!fs.existsSync(JSON_DIR)) {
			console.error(`❌ Error: Directory "${JSON_DIR}" not found.`);
			process.exit(1);
		}
		const pageJsonFiles = fs.readdirSync(JSON_DIR).filter(isPageJsonFile);
		if (pageJsonFiles.length === 0) {
			console.log('⚠️  No page-specific JSON files found.');
			process.exit(0);
		}

		// 3. Select target page
		let selectedPage = process.argv[2];
		if (!selectedPage) {
			const answers = await inquirer.prompt([
				{
					type: 'select',
					name: 'selectedPage',
					message: 'Select the page JSON file you want the agent to code:',
					choices: pageJsonFiles
				}
			]);
			selectedPage = answers.selectedPage;
		}

		const targetJsonPath = path.join(JSON_DIR, selectedPage);
		const pageSlug       = selectedPage.replace(/\.json$/i, '');
		console.log(`\n📦 Assembling task bundle for: ${selectedPage}...`);

		// 4. Load tailwind colors for the token audit
		const { createRequire } = await import('module');
		const require      = createRequire(import.meta.url);
		const twConfigObj  = require(path.resolve(TAILWIND_CONFIG_PATH));
		const twColors     = twConfigObj.theme.extend.colors || {};
		const manualFills  = loadManualFillTokens();
		const twHexToFi    = buildTwHexToFiMap(twColors);

		// OPT-1: Design lookup from the DesignTokenIR artifact (single source of truth).
		// generated/agent-lookup.json carries { ty:{class,tag}, fi:<stem> } keyed by
		// Figma base key — the exact shape the prompt + audit consume. Regenerate with
		// `npm run emit:agent-lookup` (part of `npm run tokens`).
		console.log('  🔍 Resolving design system lookup...');
		const agentLookup = loadAgentLookup();
		if (!agentLookup) {
			console.error('❌ Missing generated/agent-lookup.json — run: npm run emit:agent-lookup');
			process.exit(1);
		}
		injectFiStems(agentLookup.fi, manualFills, twHexToFi);
		const contractTypography = contractFromLookup(agentLookup);
		const fiStem = (cleanFi) => agentLookup.fi?.[cleanFi];
		/** Named Gradient/* or unnamed linear/radial fills — implement in Sass, not as solid TW tokens. */
		const isSassOnlyFill = (cleanFi) => {
			const n = String(cleanFi || '').trim();
			if (/^Gradient\//i.test(n)) return true;
			if (/^linear(\s+\d+)?$/i.test(n)) return true;
			if (/^radial(\s+\d+)?$/i.test(n)) return true;
			if (/^gradient\b/i.test(n)) return true;
			return false;
		};
		const designLookup = JSON.stringify({ ty: agentLookup.ty, fi: agentLookup.fi });

		// 5. Load and parse raw page JSON (needed for token audit over original tree)
		const rawPageJsonData = fs.readFileSync(targetJsonPath, 'utf8');
		let pageJson;
		try {
			pageJson = JSON.parse(rawPageJsonData);
		} catch (e) {
			console.error('❌ Failed to parse page JSON:', e.message);
			process.exit(1);
		}

		// Solution A4: resolve known orphan hex fills → semantic fi before audit/prune
		const hexToFi = loadHexToFiMap(manualFills);
		const rawTree = Array.isArray(pageJson.tree) ? pageJson.tree : [];
		const resolvedTree = applyHexToFiResolution(rawTree, hexToFi, twHexToFi);

		// OPT-2: Prune page JSON before injection
		console.log('  ✂️  Pruning page JSON...');
		const chromeTree = resolvedTree.map((n) => processLayoutChromeInTree(JSON.parse(JSON.stringify(n))));
		const prunedTree = chromeTree.map(pruneNode).filter(Boolean);
		const prunedPageJson = JSON.stringify({
			meta: {
				page:     pageJson.meta?.page,
				sections: pageJson.meta?.sections
			},
			tree: prunedTree
		});

		// OPT-3: Section manifest
		const sectionManifest = buildSectionManifest(
			resolvedTree,
			pageSlug,
			pageJson.meta?.moduleRegions
		);

		// OPT-4: Per-node typography resolution table
		// Pre-resolves every TEXT node's ty → cssClass + html so the agent receives
		// answers, not a lookup rule to apply independently per node.
		console.log('  📐 Building per-node typography table...');
		const typographyTable = buildTypographyTable(resolvedTree, contractTypography);

		// Audit feedback: inject issues from a previous audit run so the agent
		// self-corrects without needing a human to read the report first.
		const auditFeedback = buildAuditFeedback(pageSlug);
		if (auditFeedback) {
			console.log(`  ⚠️  Audit feedback injected for "${pageSlug}"`);
		}

		// 6. Token audit (runs over the original unpruned tree for accuracy)
		let pageTokenAudit = '';
		let tokenAuditBlocked = false;
		try {
			const usedTy = new Set();
			const usedFi = new Set();
			const unlinkedHex = new Set(); // node.c present, no node.fi — no design token to resolve against

			function extractTokens(node) {
				if (node.ty) {
					usedTy.add(node.ty.split('#')[0]);
				} else if (
					node.t === 'TEXT' &&
					node.font &&
					(node.font === 'icon' || node.font === 'icon2' || node.font === 'icon3')
				) {
					usedTy.add(`_ICON_FONT:${node.font}`);
				}
				if (node.fi) {
					usedFi.add(node.fi.split('#')[0]);
				} else if (node.c) {
					unlinkedHex.add(`${node.n || node.tx || node.t}::${node.c}`);
				}
				if (node.ch) node.ch.forEach(extractTokens);
			}
			resolvedTree.forEach(extractTokens);

			function checkTwColorExists(twColor) {
				if (twColors[twColor]) return true;
				const dash = twColor.indexOf('-');
				if (dash !== -1) {
					const grp  = twColor.substring(0, dash);
					const rest = twColor.substring(dash + 1);
					if (twColors[grp] && twColors[grp][rest]) return true;
				}
				return false;
			}

			const tyLines = [];
			let hasMissingTokens = false;

			for (const cleanTy of usedTy) {
				if (cleanTy.startsWith('_ICON_FONT:')) {
					tyLines.push(`- font: ${cleanTy.split(':')[1]}: ICON`);
				} else if (cleanTy.includes('Font Awesome')) {
					tyLines.push(`- ${cleanTy}: ICON`);
				} else if (contractTypography[cleanTy]) {
					tyLines.push(`- ${cleanTy}: OK`);
				} else {
					tyLines.push(`- ${cleanTy}: MISSING`);
					hasMissingTokens = true;
				}
			}

			const fiLines = [];
			for (const cleanFi of usedFi) {
				// Gradients (named Gradient/* or unnamed linear/radial fills) are
				// Sass-only — not solid utilities. Do not fail the solid-token audit.
				if (isSassOnlyFill(cleanFi)) {
					fiLines.push(`- ${cleanFi}: OK (Sass gradient — not a solid utility)`);
				} else {
					const twColor = fiStem(cleanFi);
					if (twColor && checkTwColorExists(twColor)) {
						fiLines.push(`- ${cleanFi}: OK`);
					} else {
						fiLines.push(`- ${cleanFi}: MISSING`);
						hasMissingTokens = true;
					}
				}
			}

			pageTokenAudit =
				`Used Typography:\n${tyLines.join('\n')}\n\nUsed Fills:\n${fiLines.join('\n')}`;

			if (unlinkedHex.size > 0) {
				tokenAuditBlocked = true;
				const hexLines = [...unlinkedHex].map(entry => {
					const [label, hex] = entry.split('::');
					return `- "${label}": ${hex} — NO_TOKEN`;
				});
				pageTokenAudit += `\n\nUnlinked hex fills (no Figma style attached):\n${hexLines.join('\n')}`;
				pageTokenAudit +=
					'\n\nBLOCKER: Do not render these hex values directly (no text-[#...] / bg-[#...]). ' +
					'Add/sync a matching token in tailwind.config.js first (see 03-colors-gradients.md), then use that token.';
			}

			if (hasMissingTokens) {
				tokenAuditBlocked = true;
				pageTokenAudit +=
					'\n\nBLOCKER: Missing tokens found. Please run "npm run extract" to sync tokens before coding layout.';
			}
		} catch (e) {
			pageTokenAudit = 'Error parsing page JSON for token audit.';
		}

		if (tokenAuditBlocked) {
			console.error('\n❌ STOP: Token audit failed — agent-coding-prompt.txt was NOT generated.\n');
			console.error('PAGE_TOKEN_AUDIT:\n');
			console.error(pageTokenAudit);
			console.error(
				'\nResolve all BLOCKER and NO_TOKEN issues (npm run extract, sync tailwind.config.js), then re-run npm run agent.\n'
			);
			process.exit(1);
		}

		const preFlightChecklist = fs.existsSync(CHECKLIST_PATH)
			? fs.readFileSync(CHECKLIST_PATH, 'utf8')
			: '(10-checklist.md not found — read automation/agent-rules/10-checklist.md)';

		// 7. Compile prompt
		const compiledPrompt = replaceTokens(promptTemplate, {
			DESIGN_LOOKUP:       designLookup,
			SECTION_MANIFEST:    sectionManifest,
			TYPOGRAPHY_TABLE:    typographyTable,
			PRE_FLIGHT_CHECKLIST: preFlightChecklist,
			AUDIT_FEEDBACK:      auditFeedback,
			REFERENCE_PUG:       buildReferencePug(),
			COMPONENT_MANIFEST:  buildComponentManifest(),
			PAGE_NAME:           selectedPage,
			PAGE_SLUG:           pageSlug,
			PAGE_JSON:           prunedPageJson,
			PAGE_TOKEN_AUDIT:    pageTokenAudit,
			GENERATED_AT:        new Date().toISOString()
		});

		if (/\{\{[A-Z0-9_]+\}\}/.test(compiledPrompt)) {
			console.error('❌ Error: Unresolved placeholders remain in the prompt.');
			process.exit(1);
		}

		// 8. Write output
		fs.writeFileSync(OUTPUT_PROMPT_PATH, compiledPrompt, 'utf8');
		console.log(`\n🚀 Success! Compiled prompt → ${OUTPUT_PROMPT_PATH}`);

		// 9. Print size delta summary
		const rawBytes    = Buffer.byteLength(rawPageJsonData, 'utf8');
		const prunedBytes = Buffer.byteLength(prunedPageJson, 'utf8');
		const savedPct    = (((rawBytes - prunedBytes) / rawBytes) * 100).toFixed(1);
		console.log(`   PAGE_JSON:   ${rawBytes.toLocaleString()} B → ${prunedBytes.toLocaleString()} B  (−${savedPct}% pruned)`);
		console.log(`   DESIGN_LOOKUP: ${Buffer.byteLength(designLookup, 'utf8').toLocaleString()} B  (was ~7000 B raw source)`);

	} catch (error) {
		console.error('❌ An error occurred during processing:', error);
	}
}

run();
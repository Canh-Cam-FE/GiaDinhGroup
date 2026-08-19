#!/usr/bin/env node
/**
 * C15 — Module structure audit
 * Validates meta.moduleRegions ↔ src/modules folders ↔ page includes.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { isPageJsonFile } from "./page-json-skip.mjs";

const ROOT = process.cwd();
const JSON_DIR = path.join(ROOT, "json");
const SRC_PAGES = path.join(ROOT, "src", "pages");
const SRC_MODULES = path.join(ROOT, "src", "modules");
const REPORT_JSON = path.join(JSON_DIR, "module-structure-audit.json");

/** Slug → page entry file when not `{slug}.pug`. */
const LEGACY_PAGE_ENTRY = {
	home: "index.pug",
};

const argv = process.argv.slice(2);

function parsePageFilter(args) {
	const idx = args.lastIndexOf("--page");
	if (idx === -1) return null;
	const slug = args[idx + 1];
	if (!slug || slug.startsWith("--")) return null;
	return slug;
}

const pageFilter = parsePageFilter(argv);

function readPageJsonFiles() {
	return fs
		.readdirSync(JSON_DIR)
		.filter(isPageJsonFile)
		.map((f) => f.replace(/\.json$/i, ""));
}

function parseIncludes(pagePugPath) {
	if (!fs.existsSync(pagePugPath)) return [];
	const content = fs.readFileSync(pagePugPath, "utf8");
	const includes = [];
	const moduleRe = /include\s+\.\.\/modules\/([^/\s]+)\/([^/\s]+)\/index\.pug/g;
	let m;
	while ((m = moduleRe.exec(content))) {
		includes.push({ kind: "module", page: m[1], folder: m[2] });
	}
	const chromeRe = /include\s+\.\.\/components\/(breadcrumb|banner|header|footer)\/[^\s]+/g;
	while ((m = chromeRe.exec(content))) {
		includes.push({ kind: "chrome", name: m[1] });
	}
	return includes;
}

function countSectionRoots(pugPath) {
	if (!fs.existsSync(pugPath)) return 0;
	const content = fs.readFileSync(pugPath, "utf8");
	const matches = content.match(/^section\.[^\s]+/gm);
	return matches?.length ?? 0;
}

function resolvePagePugPath(slug) {
	const fileName = LEGACY_PAGE_ENTRY[slug] || `${slug}.pug`;
	return path.join(SRC_PAGES, fileName);
}

function isSharedRefRegion(r) {
	return r?.regionType === "shared-ref";
}

function sharedRefChromeName(id) {
	const n = String(id || "").replace(/^\./, "");
	if (n === "global-breadcrumb") return "breadcrumb";
	if (n === "top-banner") return "banner";
	return n;
}

function auditLegacyHome(pageJson) {
	const issues = [];
	const indexPath = path.join(SRC_PAGES, "index.pug");

	if (!fs.existsSync(indexPath)) {
		issues.push({
			severity: "BLOCKER",
			code: "LEGACY_INDEX_MISSING",
			message: "Missing src/pages/index.pug (home entry)",
		});
		return { slug: "home", status: "FAIL", regions: 0, pattern: "legacy-monolith", issues };
	}

	const content = fs.readFileSync(indexPath, "utf8");
	const splitIncludes = [...content.matchAll(/include\s+\.\.\/modules\/home\/([^/\s]+)\/index\.pug/g)].map(
		(m) => m[1],
	);

	// Split-folder home (current project): validate like any other page.
	if (splitIncludes.length > 0) {
		return auditSplitPage("home", pageJson, indexPath);
	}

	const homeModulePug = path.join(SRC_MODULES, "home", "index.pug");
	if (!/include\s+\.\.\/modules\/home\//.test(content)) {
		issues.push({
			severity: "BLOCKER",
			code: "LEGACY_INDEX_NO_INCLUDE",
			message:
				"src/pages/index.pug must include home modules (split folders or legacy monolith)",
		});
	}

	if (!fs.existsSync(homeModulePug)) {
		issues.push({
			severity: "BLOCKER",
			code: "LEGACY_MONOLITH_MISSING",
			message:
				"src/modules/home/index.pug missing — restore from git or regenerate from json/home.json (C11)",
		});
	} else {
		const roots = countSectionRoots(homeModulePug);
		if (roots > 1) {
			issues.push({
				severity: "INFO",
				code: "LEGACY_MONOLITH",
				message: `Legacy monolith: ${roots} section roots in one file (edit-only, do not copy for new pages)`,
			});
		}
	}

	const blockers = issues.filter((i) => i.severity === "BLOCKER");
	return {
		slug: "home",
		status: blockers.length ? "FAIL" : "SKIP",
		regions: pageJson.meta?.moduleRegions?.length ?? 0,
		pattern: "legacy-monolith",
		issues,
	};
}

function auditSplitPage(slug, pageJson, pagePugPath) {
	const issues = [];
	const regions = pageJson.meta?.moduleRegions || [];
	const includes = parseIncludes(pagePugPath);
	const moduleRegions = regions.filter((r) => !isSharedRefRegion(r));
	const sharedRegions = regions.filter(isSharedRefRegion);

	const expectedFolders = moduleRegions.map((r) => r.folder);
	const includedFolders = includes
		.filter((i) => i.kind === "module" && i.page === slug)
		.map((i) => i.folder);
	const chromeIncludes = new Set(includes.filter((i) => i.kind === "chrome").map((i) => i.name));

	for (const folder of expectedFolders) {
		const moduleDir = path.join(SRC_MODULES, slug, folder);
		const pugPath = path.join(moduleDir, "index.pug");
		const sassPath = path.join(moduleDir, "index.sass");

		if (!fs.existsSync(moduleDir)) {
			issues.push({
				severity: "BLOCKER",
				code: "MODULE_FOLDER_MISSING",
				message: `Missing folder src/modules/${slug}/${folder}/`,
				folder,
			});
			continue;
		}
		if (!fs.existsSync(pugPath)) {
			issues.push({
				severity: "BLOCKER",
				code: "MODULE_PUG_MISSING",
				message: `Missing ${pugPath}`,
				folder,
			});
		}
		if (!fs.existsSync(sassPath)) {
			issues.push({
				severity: "HIGH",
				code: "MODULE_SASS_MISSING",
				message: `Missing ${sassPath}`,
				folder,
			});
		}
		const roots = countSectionRoots(pugPath);
		if (roots === 0 && fs.existsSync(pugPath)) {
			issues.push({
				severity: "BLOCKER",
				code: "NO_SECTION_ROOT",
				message: `No section.* root in ${pugPath}`,
				folder,
			});
		} else if (roots > 1) {
			issues.push({
				severity: "BLOCKER",
				code: "MULTIPLE_SECTION_ROOTS",
				message: `${roots} section roots in ${pugPath} (max 1)`,
				folder,
			});
		}
	}

	for (const folder of includedFolders) {
		if (!expectedFolders.includes(folder)) {
			issues.push({
				severity: "HIGH",
				code: "ORPHAN_INCLUDE",
				message: `Page includes ${folder} but it is not in meta.moduleRegions`,
				folder,
			});
		}
	}

	for (const folder of expectedFolders) {
		if (!includedFolders.includes(folder)) {
			issues.push({
				severity: "BLOCKER",
				code: "MISSING_INCLUDE",
				message: `moduleRegions expects include for ${folder}`,
				folder,
			});
		}
	}

	for (const r of sharedRegions) {
		const chrome = sharedRefChromeName(r.id);
		if (chrome === "header" || chrome === "footer") {
			// Owned by _layout.pug — must not appear after extract filter; warn if present.
			issues.push({
				severity: "HIGH",
				code: "LAYOUT_CHROME_IN_REGIONS",
				message: `shared-ref "${r.id}" belongs in _layout.pug — re-run extract to drop it from moduleRegions`,
			});
			continue;
		}
		if (!chromeIncludes.has(chrome)) {
			issues.push({
				severity: "BLOCKER",
				code: "MISSING_CHROME_INCLUDE",
				message: `shared-ref "${r.id}" expects include ../components/${chrome}/… in the page entry`,
			});
		}
	}

	if (moduleRegions.length && includedFolders.length !== moduleRegions.length) {
		issues.push({
			severity: "BLOCKER",
			code: "MANIFEST_INCLUDE_MISMATCH",
			message: `contentRegions=${moduleRegions.length} moduleIncludes=${includedFolders.length}`,
		});
	}

	const blockers = issues.filter((i) => i.severity === "BLOCKER");
	const status = blockers.length ? "FAIL" : issues.length ? "WARN" : "PASS";

	return {
		slug,
		status,
		regions: regions.length,
		contentRegions: moduleRegions.length,
		includes: includedFolders.length,
		pattern: "split-folders",
		issues,
	};
}

function auditPage(slug) {
	const issues = [];
	const jsonPath = path.join(JSON_DIR, `${slug}.json`);
	const pagePugPath = resolvePagePugPath(slug);

	if (!fs.existsSync(jsonPath)) {
		return { slug, status: "SKIP", issues: [{ severity: "INFO", code: "NO_JSON", message: "Page JSON missing" }] };
	}

	const pageJson = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

	if (slug === "home") {
		return auditLegacyHome(pageJson);
	}

	if (!pageJson.meta?.moduleRegions?.length) {
		issues.push({
			severity: "HIGH",
			code: "NO_MODULE_REGIONS",
			message: "meta.moduleRegions missing — run npm run extract",
		});
	}

	if (!fs.existsSync(pagePugPath)) {
		issues.push({
			severity: "BLOCKER",
			code: "NO_PUG_PAGE",
			message: `Missing ${path.relative(ROOT, pagePugPath)} — run npm run scaffold:modules ${slug}`,
		});
		return { slug, status: "FAIL", regions: pageJson.meta?.moduleRegions?.length ?? 0, issues };
	}

	return auditSplitPage(slug, pageJson, pagePugPath);
}

function main() {
	const slugs = pageFilter ? [pageFilter] : readPageJsonFiles();
	const pages = slugs.map(auditPage);
	const summary = {
		at: new Date().toISOString(),
		pages: pages.length,
		pass: pages.filter((p) => p.status === "PASS").length,
		warn: pages.filter((p) => p.status === "WARN").length,
		fail: pages.filter((p) => p.status === "FAIL").length,
		skip: pages.filter((p) => p.status === "SKIP").length,
	};

	const report = { summary, pages };
	fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));

	console.log(`Module structure audit: ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`);
	for (const page of pages) {
		if (page.status === "PASS") continue;
		const blockers = page.issues?.filter((i) => i.severity === "BLOCKER").length ?? 0;
		const highs = page.issues?.filter((i) => i.severity === "HIGH").length ?? 0;
		console.log(`  ${page.slug}: ${page.status} (${page.regions ?? 0} regions, ${blockers} blockers, ${highs} high)`);
	}

	const exitCode = summary.fail > 0 ? 1 : 0;
	if (pageFilter && pages[0]?.status === "FAIL") process.exit(1);
	if (!pageFilter && exitCode) process.exit(exitCode);
}

main();

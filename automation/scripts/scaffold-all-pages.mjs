#!/usr/bin/env node
/**
 * Scaffold src/pages + src/modules for every page JSON that has no page entry yet.
 * Skips legacy home (index.pug) and non-page JSON artifacts.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { isPageJsonFile } from "./page-json-skip.mjs";

const ROOT = process.cwd();
const JSON_DIR = path.join(ROOT, "json");
const PAGES_DIR = path.join(ROOT, "src", "pages");

const LEGACY_PAGE_ENTRY = {
	home: "index.pug",
};

function pageEntryExists(slug) {
	const fileName = LEGACY_PAGE_ENTRY[slug] || `${slug}.pug`;
	return fs.existsSync(path.join(PAGES_DIR, fileName));
}

const slugs = fs
	.readdirSync(JSON_DIR)
	.filter(isPageJsonFile)
	.map((f) => f.replace(/\.json$/i, ""))
	.filter((slug) => !pageEntryExists(slug));

if (!slugs.length) {
	console.log("No pages to scaffold — all slugs have page entries.");
	process.exit(0);
}

console.log(`Scaffolding ${slugs.length} page(s): ${slugs.join(", ")}\n`);

for (const slug of slugs) {
	const jsonPath = path.join(JSON_DIR, `${slug}.json`);
	const pageJson = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
	if (!pageJson.meta?.moduleRegions?.length) {
		console.warn(`  SKIP ${slug}: no meta.moduleRegions (run npm run extract)`);
		continue;
	}
	console.log(`  → ${slug} (${pageJson.meta.moduleRegions.length} regions)`);
	execSync(`node automation/scripts/scaffold-modules.mjs ${slug}`, {
		cwd: ROOT,
		stdio: "inherit",
	});
}

console.log("\nDone. Run npm run audit:modules to verify structure.");

#!/usr/bin/env node
/**
 * Scaffold src/modules/{page}/{region}/ from meta.moduleRegions in page JSON.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { sharedRefPageIncludePath } from "./module-regions.mjs";

const ROOT = process.cwd();
const JSON_DIR = path.join(ROOT, "json");
const slug = process.argv[2];

if (!slug) {
	console.error("Usage: node automation/scripts/scaffold-modules.mjs <page-slug>");
	process.exit(1);
}

const jsonPath = path.join(JSON_DIR, `${slug}.json`);
const pageJson = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const regions = pageJson.meta?.moduleRegions || [];

if (!regions.length) {
	console.error(`No meta.moduleRegions in ${jsonPath}. Run npm run extract first.`);
	process.exit(1);
}

const pagePugPath = path.join(ROOT, "src", "pages", `${slug}.pug`);
const includes = regions
	.map((r) => {
		if (r.regionType === "shared-ref") {
			if (r.id === "header" || r.id === "footer") return null;
			return `\tinclude ${sharedRefPageIncludePath(r.id)}`;
		}
		return `\tinclude ../modules/${slug}/${r.folder}/index.pug`;
	})
	.filter(Boolean)
	.join("\n");

const pageTitle = slug
	.split("-")
	.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
	.join(" ");

const pagePug = `extends _layout.pug

block var
\t- var title = '${pageTitle}'
\t- var bodyClass = 'page ${slug}-page'

block main
${includes}
`;

fs.writeFileSync(pagePugPath, pagePug);

let moduleCount = 0;
for (const region of regions) {
	if (region.regionType === "shared-ref") continue;

	const dir = path.join(ROOT, "src", "modules", slug, region.folder);
	fs.mkdirSync(dir, { recursive: true });
	moduleCount++;

	const sectionClass = region.sectionClass || `${slug}-${region.folder}`;
	const title = region.title || region.id;

	const pugPath = path.join(dir, "index.pug");
	if (!fs.existsSync(pugPath)) {
		fs.writeFileSync(
			pugPath,
			`section.${sectionClass}(class='clamp:py-[48-96]')
\t.container-xxl
\t\t.wrap
\t\t\th2.heading-1 ${title}
`
		);
	}

	const sassPath = path.join(dir, "index.sass");
	if (!fs.existsSync(sassPath)) {
		fs.writeFileSync(
			sassPath,
			`.${sectionClass}
\t.wrap
\t\t@apply flex flex-col gap-5
`
		);
	}
}

console.log(`Scaffolded ${moduleCount} modules (+ shared-ref includes) for "${slug}"`);
console.log(`  Page: src/pages/${slug}.pug`);
console.log(`  Modules: src/modules/${slug}/*/`);
